<<<<<<< HEAD
# Multifamily AI Valuation - One-Click Docker Installation (PowerShell)
# This script sets up the complete application with Docker

$ErrorActionPreference = 'Stop'

Write-Host "🏢 Multifamily AI Valuation - Docker Installation" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Colors for output
function Print-Status($msg) { Write-Host "[INFO] $msg" -ForegroundColor Blue }
function Print-Success($msg) { Write-Host "[SUCCESS] $msg" -ForegroundColor Green }
function Print-Warning($msg) { Write-Host "[WARNING] $msg" -ForegroundColor Yellow }
function Print-Error($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red }

# Check if Docker is installed
function Check-Docker {
    Print-Status "Checking Docker installation..."
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Print-Error "Docker is not installed. Please install Docker first:"
        Write-Host "  - Windows: https://docs.docker.com/desktop/windows/install/"
        exit 1
    }
    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Print-Error "Docker Compose is not installed. Please install Docker Compose first:"
        Write-Host "  https://docs.docker.com/compose/install/"
        exit 1
    }
    Print-Success "Docker and Docker Compose are installed"
}

# Check if Docker daemon is running
function Check-Docker-Daemon {
    Print-Status "Checking Docker daemon..."
    try {
        docker info | Out-Null
        Print-Success "Docker daemon is running"
    } catch {
        Print-Error "Docker daemon is not running. Please start Docker first."
        exit 1
    }
}

# Create necessary directories
function Create-Directories {
    Print-Status "Creating necessary directories..."
    $dirs = @('uploads', 'outputs', 'storage/exports', 'storage/temp', 'init-db', 'ssl')
    foreach ($dir in $dirs) {
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    }
    Print-Success "Directories created"
}

# Setup environment file
function Setup-Environment {
    Print-Status "Setting up environment configuration..."
    if (-not (Test-Path ".env.local")) {
        Copy-Item ".env.docker" ".env.local"
        if (Test-Path "package-lock.json") {
            Copy-Item "package-lock.json" "." -Force
            Print-Success "package-lock.json copied to Docker context"
        } else {
            Print-Warning "package-lock.json not found. Please run 'npm install' first."
        }
        Print-Warning "Created .env.local from template"
        Print-Warning "Please update .env.local with your actual configuration values"
        Write-Host ""
        Write-Host "Required configurations:"
        Write-Host "  - NEXTAUTH_SECRET: Generate a secure random string (32+ characters)"
        Write-Host "  - GOOGLE_CLIENT_ID: From Google Cloud Console"
        Write-Host "  - GOOGLE_CLIENT_SECRET: From Google Cloud Console"
        Write-Host ""
        Write-Host "Optional configurations:"
        Write-Host "  - OPENAI_API_KEY: For enhanced AI features"
        Write-Host "  - SMTP settings: For email notifications"
        Write-Host ""
    } else {
        Print-Success "Environment file already exists"
    }
}

# Create nginx configuration
function Create-Nginx-Config {
    Print-Status "Creating nginx configuration..."
    $nginxConf = @'
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name localhost;

        client_max_body_size 100M;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # WebSocket support for real-time updates
        location /api/websocket {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
'@
    Set-Content -Path "nginx.conf" -Value $nginxConf
    Print-Success "Nginx configuration created"
}

# Create database initialization script
function Create-Db-Init {
    Print-Status "Creating database initialization script..."
    $dbInit = @'
-- Multifamily AI Valuation Database Schema
-- This script initializes the PostgreSQL database

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends NextAuth users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    image TEXT,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    property_type VARCHAR(100),
    units INTEGER,
    purchase_price DECIMAL(12,2),
    market_value DECIMAL(12,2),
    annual_income DECIMAL(12,2),
    annual_expenses DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Processing jobs table
CREATE TABLE IF NOT EXISTS processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    results JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Investor notifications table
CREATE TABLE IF NOT EXISTS investor_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES processing_jobs(id) ON DELETE SET NULL,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    type VARCHAR(100) NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    recipients JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_user_id ON processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON investor_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON investor_notifications(status);

-- Insert sample data (optional)
-- This will be skipped if data already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
        INSERT INTO users (id, email, name, role) VALUES
        ('123e4567-e89b-12d3-a456-426614174000', 'demo@example.com', 'Demo User', 'admin');
        
        INSERT INTO properties (id, user_id, name, address, units, purchase_price) VALUES
        ('123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174000', 'Sample Multifamily Property', '123 Main St, City, State', 24, 2500000.00);
    END IF;
END $$;
'@
    Set-Content -Path "init-db/01-init.sql" -Value $dbInit
    Print-Success "Database initialization script created"
}

# Build and start the application
function Start-Application {
    Print-Status "Building and starting the application..."
    docker-compose pull
    docker-compose build --no-cache
    docker-compose up -d
    Print-Success "Application is starting..."
    Print-Status "Waiting for services to be ready..."
    Start-Sleep -Seconds 10
    $services = docker-compose ps | Select-String "Up"
    if ($services) {
        Print-Success "Services are running!"
    } else {
        Print-Error "Some services failed to start. Check logs with: docker-compose logs"
        exit 1
    }
}

# Display final information
function Show-Completion-Info {
    Write-Host ""; Write-Host "🎉 Installation Complete!" -ForegroundColor Cyan
    Write-Host "========================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Your Multifamily AI Valuation application is now running:"
    Write-Host ""
    Write-Host "📱 Application URL: http://localhost:3000"
    Write-Host "🗄️  Redis Cache: localhost:6379"
    Write-Host "🐘 PostgreSQL DB: localhost:5432"
    Write-Host ""
    Write-Host "📋 Next Steps:"
    Write-Host "1. Open http://localhost:3000 in your browser"
    Write-Host "2. Update .env.local with your Google OAuth credentials"
    Write-Host "3. Restart the application: docker-compose restart app"
    Write-Host ""
    Write-Host "🛠️  Useful Commands:"
    Write-Host "• View logs: docker-compose logs -f"
    Write-Host "• Stop application: docker-compose down"
    Write-Host "• Restart application: docker-compose restart"
    Write-Host "• Update application: git pull && docker-compose build --no-cache && docker-compose up -d"
    Write-Host ""
    Write-Host "📖 For configuration help, see README.md"
    Write-Host ""
    Print-Success "Happy analyzing! 🏢💰"
}

# Main installation flow
function Main {
    Write-Host "Starting installation process..."
    Write-Host ""
    Check-Docker
    Check-Docker-Daemon
    Create-Directories
    Setup-Environment
    Create-Nginx-Config
    Create-Db-Init
    Start-Application
    Show-Completion-Info
}

# Handle script interruption
trap {
    Print-Error "Installation interrupted"
    exit 1
}

# Run main function
Main
=======
# Multifamily AI Valuation - One-Click Docker Installation (PowerShell)
# This script sets up the complete application with Docker

$ErrorActionPreference = 'Stop'

Write-Host "🏢 Multifamily AI Valuation - Docker Installation" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Colors for output
function Print-Status($msg) { Write-Host "[INFO] $msg" -ForegroundColor Blue }
function Print-Success($msg) { Write-Host "[SUCCESS] $msg" -ForegroundColor Green }
function Print-Warning($msg) { Write-Host "[WARNING] $msg" -ForegroundColor Yellow }
function Print-Error($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red }

# Check if Docker is installed
function Check-Docker {
    Print-Status "Checking Docker installation..."
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Print-Error "Docker is not installed. Please install Docker first:"
        Write-Host "  - Windows: https://docs.docker.com/desktop/windows/install/"
        exit 1
    }
    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Print-Error "Docker Compose is not installed. Please install Docker Compose first:"
        Write-Host "  https://docs.docker.com/compose/install/"
        exit 1
    }
    Print-Success "Docker and Docker Compose are installed"
}

# Check if Docker daemon is running
function Check-Docker-Daemon {
    Print-Status "Checking Docker daemon..."
    try {
        docker info | Out-Null
        Print-Success "Docker daemon is running"
    } catch {
        Print-Error "Docker daemon is not running. Please start Docker first."
        exit 1
    }
}

# Create necessary directories
function Create-Directories {
    Print-Status "Creating necessary directories..."
    $dirs = @('uploads', 'outputs', 'storage/exports', 'storage/temp', 'init-db', 'ssl')
    foreach ($dir in $dirs) {
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    }
    Print-Success "Directories created"
}

# Setup environment file
function Setup-Environment {
    Print-Status "Setting up environment configuration..."
    if (-not (Test-Path ".env.local")) {
        Copy-Item ".env.docker" ".env.local"
        if (Test-Path "package-lock.json") {
            Copy-Item "package-lock.json" "." -Force
            Print-Success "package-lock.json copied to Docker context"
        } else {
            Print-Warning "package-lock.json not found. Please run 'npm install' first."
        }
        Print-Warning "Created .env.local from template"
        Print-Warning "Please update .env.local with your actual configuration values"
        Write-Host ""
        Write-Host "Required configurations:"
        Write-Host "  - NEXTAUTH_SECRET: Generate a secure random string (32+ characters)"
        Write-Host "  - GOOGLE_CLIENT_ID: From Google Cloud Console"
        Write-Host "  - GOOGLE_CLIENT_SECRET: From Google Cloud Console"
        Write-Host ""
        Write-Host "Optional configurations:"
        Write-Host "  - OPENAI_API_KEY: For enhanced AI features"
        Write-Host "  - SMTP settings: For email notifications"
        Write-Host ""
    } else {
        Print-Success "Environment file already exists"
    }
}

# Create nginx configuration
function Create-Nginx-Config {
    Print-Status "Creating nginx configuration..."
    $nginxConf = @'
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name localhost;

        client_max_body_size 100M;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # WebSocket support for real-time updates
        location /api/websocket {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
'@
    Set-Content -Path "nginx.conf" -Value $nginxConf
    Print-Success "Nginx configuration created"
}

# Create database initialization script
function Create-Db-Init {
    Print-Status "Creating database initialization script..."
    $dbInit = @'
-- Multifamily AI Valuation Database Schema
-- This script initializes the PostgreSQL database

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends NextAuth users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    image TEXT,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    property_type VARCHAR(100),
    units INTEGER,
    purchase_price DECIMAL(12,2),
    market_value DECIMAL(12,2),
    annual_income DECIMAL(12,2),
    annual_expenses DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Processing jobs table
CREATE TABLE IF NOT EXISTS processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    results JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Investor notifications table
CREATE TABLE IF NOT EXISTS investor_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES processing_jobs(id) ON DELETE SET NULL,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    type VARCHAR(100) NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    recipients JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_user_id ON processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON investor_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON investor_notifications(status);

-- Insert sample data (optional)
-- This will be skipped if data already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
        INSERT INTO users (id, email, name, role) VALUES
        ('123e4567-e89b-12d3-a456-426614174000', 'demo@example.com', 'Demo User', 'admin');
        
        INSERT INTO properties (id, user_id, name, address, units, purchase_price) VALUES
        ('123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174000', 'Sample Multifamily Property', '123 Main St, City, State', 24, 2500000.00);
    END IF;
END $$;
'@
    Set-Content -Path "init-db/01-init.sql" -Value $dbInit
    Print-Success "Database initialization script created"
}

# Build and start the application
function Start-Application {
    Print-Status "Building and starting the application..."
    docker-compose pull
    docker-compose build --no-cache
    docker-compose up -d
    Print-Success "Application is starting..."
    Print-Status "Waiting for services to be ready..."
    Start-Sleep -Seconds 10
    $services = docker-compose ps | Select-String "Up"
    if ($services) {
        Print-Success "Services are running!"
    } else {
        Print-Error "Some services failed to start. Check logs with: docker-compose logs"
        exit 1
    }
}

# Display final information
function Show-Completion-Info {
    Write-Host ""; Write-Host "🎉 Installation Complete!" -ForegroundColor Cyan
    Write-Host "========================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Your Multifamily AI Valuation application is now running:"
    Write-Host ""
    Write-Host "📱 Application URL: http://localhost:3000"
    Write-Host "🗄️  Redis Cache: localhost:6379"
    Write-Host "🐘 PostgreSQL DB: localhost:5432"
    Write-Host ""
    Write-Host "📋 Next Steps:"
    Write-Host "1. Open http://localhost:3000 in your browser"
    Write-Host "2. Update .env.local with your Google OAuth credentials"
    Write-Host "3. Restart the application: docker-compose restart app"
    Write-Host ""
    Write-Host "🛠️  Useful Commands:"
    Write-Host "• View logs: docker-compose logs -f"
    Write-Host "• Stop application: docker-compose down"
    Write-Host "• Restart application: docker-compose restart"
    Write-Host "• Update application: git pull && docker-compose build --no-cache && docker-compose up -d"
    Write-Host ""
    Write-Host "📖 For configuration help, see README.md"
    Write-Host ""
    Print-Success "Happy analyzing! 🏢💰"
}

# Main installation flow
function Main {
    Write-Host "Starting installation process..."
    Write-Host ""
    Check-Docker
    Check-Docker-Daemon
    Create-Directories
    Setup-Environment
    Create-Nginx-Config
    Create-Db-Init
    Start-Application
    Show-Completion-Info
}

# Handle script interruption
trap {
    Print-Error "Installation interrupted"
    exit 1
}

# Run main function
Main
>>>>>>> 7729ef7fd006f35818317aff5db096f8429d4db3
