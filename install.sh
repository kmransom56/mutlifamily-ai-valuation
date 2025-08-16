#!/bin/bash

# Multifamily AI Valuation - One-Click Docker Installation
# This script sets up the complete application with Docker

set -e  # Exit on any error

echo "🏢 Multifamily AI Valuation - Docker Installation"
echo "================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    print_status "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first:"
        echo "  - macOS: https://docs.docker.com/desktop/mac/install/"
        echo "  - Windows: https://docs.docker.com/desktop/windows/install/"
        echo "  - Linux: https://docs.docker.com/engine/install/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first:"
        echo "  https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if Docker daemon is running
check_docker_daemon() {
    print_status "Checking Docker daemon..."
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    print_success "Docker daemon is running"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    mkdir -p uploads outputs storage/exports storage/temp init-db ssl
    print_success "Directories created"
}

# Setup environment file
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f .env.local ]; then
        cp .env.docker .env.local
        if [ -f package-lock.json ]; then
            cp package-lock.json ./
            print_success "package-lock.json copied to Docker context"
        else
            print_warning "package-lock.json not found. Please run 'npm install' first."
        fi
        print_warning "Created .env.local from template"
        print_warning "Please update .env.local with your actual configuration values"
        echo ""
        echo "Required configurations:"
        echo "  - NEXTAUTH_SECRET: Generate a secure random string (32+ characters)"
        echo "  - GOOGLE_CLIENT_ID: From Google Cloud Console"
        echo "  - GOOGLE_CLIENT_SECRET: From Google Cloud Console"
        echo ""
        echo "Optional configurations:"
        echo "  - OPENAI_API_KEY: For enhanced AI features"
        echo "  - SMTP settings: For email notifications"
        echo ""
    else
        print_success "Environment file already exists"
    fi
}

# Create nginx configuration
create_nginx_config() {
    print_status "Creating nginx configuration..."
    
    cat > nginx.conf << 'EOF'
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
EOF
    
    print_success "Nginx configuration created"
}

# Create database initialization script
create_db_init() {
    print_status "Creating database initialization script..."
    
    cat > init-db/01-init.sql << 'EOF'
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
EOF
    
    print_success "Database initialization script created"
}

# Build and start the application
start_application() {
    print_status "Building and starting the application..."
    
    # Pull the latest images
    docker-compose pull
    
    # Build the application
    docker-compose build --no-cache
    
    # Start the services
    docker-compose up -d
    
    print_success "Application is starting..."
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        print_success "Services are running!"
    else
        print_error "Some services failed to start. Check logs with: docker-compose logs"
        exit 1
    fi
}

# Display final information
show_completion_info() {
    echo ""
    echo "🎉 Installation Complete!"
    echo "========================"
    echo ""
    echo "Your Multifamily AI Valuation application is now running:"
    echo ""
    echo "📱 Application URL: http://localhost:3000"
    echo "🗄️  Redis Cache: localhost:6379"
    echo "🐘 PostgreSQL DB: localhost:5432"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Open http://localhost:3000 in your browser"
    echo "2. Update .env.local with your Google OAuth credentials"
    echo "3. Restart the application: docker-compose restart app"
    echo ""
    echo "🛠️  Useful Commands:"
    echo "• View logs: docker-compose logs -f"
    echo "• Stop application: docker-compose down"
    echo "• Restart application: docker-compose restart"
    echo "• Update application: git pull && docker-compose build --no-cache && docker-compose up -d"
    echo ""
    echo "📖 For configuration help, see README.md"
    echo ""
    print_success "Happy analyzing! 🏢💰"
}

# Main installation flow
main() {
    echo "Starting installation process..."
    echo ""
    
    check_docker
    check_docker_daemon
    create_directories
    setup_environment
    create_nginx_config
    create_db_init
    start_application
    show_completion_info
}

# Handle script interruption
trap 'print_error "Installation interrupted"; exit 1' INT TERM

# Run main function
main