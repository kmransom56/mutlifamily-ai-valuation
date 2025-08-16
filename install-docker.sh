#!/bin/bash

# Docker Installation Script for Multifamily Valuation App
# This script sets up the complete Docker environment

set -e

echo "🚀 Setting up Docker environment for Multifamily Valuation App..."

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
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

print_success "Docker and Docker Compose are installed"

# Create environment file if it doesn't exist
if [[ ! -f .env.docker.local ]]; then
    print_status "Creating .env.docker.local from template..."
    cp .env.docker .env.docker.local
    print_warning "Please edit .env.docker.local with your actual API keys and credentials"
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p uploads outputs storage/exports storage/temp nginx/ssl logs
chmod 755 uploads outputs storage nginx/ssl logs

# Generate self-signed SSL certificate for development (optional)
if [[ ! -f nginx/ssl/cert.pem ]]; then
    print_status "Generating self-signed SSL certificate for development..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" \
        2>/dev/null || print_warning "OpenSSL not found. SSL certificate not created."
fi

# Set proper permissions
print_status "Setting proper permissions..."
sudo chown -R $USER:$USER uploads outputs storage logs 2>/dev/null || true

# Pull required images
print_status "Pulling Docker images..."
docker-compose pull

# Build application image
print_status "Building application Docker image..."
docker-compose build

# Start services
print_status "Starting Docker services..."
docker-compose up -d

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 30

# Check service status
print_status "Checking service status..."
docker-compose ps

# Display useful information
echo ""
print_success "🎉 Docker setup completed successfully!"
echo ""
echo "🌐 Application URLs:"
echo "   - Main App:      http://localhost:3000"
echo "   - Database:      localhost:5432 (postgres/secure_password_2024)"
echo "   - Redis:         localhost:6379"
echo ""
echo "🔧 Useful Commands:"
echo "   - View logs:     npm run docker:logs"
echo "   - Stop services: npm run docker:down"
echo "   - Restart:       npm run docker:restart"
echo "   - Status:        npm run docker:status"
echo ""
echo "📁 Docker Configuration Files:"
echo "   - Production:    docker-compose.yml"
echo "   - Development:   docker-compose.dev.yml"
echo "   - Environment:   .env.docker.local"
echo ""
echo "⚙️  Next Steps:"
echo "   1. Edit .env.docker.local with your API keys"
echo "   2. For development: npm run docker:dev"
echo "   3. For production:  npm run docker:prod"
echo "   4. With nginx:      npm run docker:nginx"
echo ""
print_warning "Remember to configure your API keys in .env.docker.local for full functionality!"