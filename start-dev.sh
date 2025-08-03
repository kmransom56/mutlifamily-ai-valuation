#!/bin/bash

# Multifamily AI Valuation - Development Server Startup
# Quick script to start the development server

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo -e "\n${BLUE}🏢 Multifamily AI Valuation - Development Server${NC}\n"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}[ERROR]${NC} package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Check if setup has been run
if [ ! -d "node_modules" ]; then
    print_warning "Node modules not found. Running setup first..."
    ./setup.sh
fi

if [ ! -d "ai_processing/venv" ]; then
    print_warning "Python virtual environment not found. Running setup first..."
    ./setup.sh
fi

if [ ! -f ".env.local" ]; then
    print_warning "Environment configuration not found. Running setup first..."
    ./setup.sh
fi

print_status "Starting development server..."

# Use port 11100 by default to avoid conflicts
export PORT=11100

# Start the development server
print_success "🚀 Starting Next.js development server on port $PORT"
print_status "Access the application at: http://localhost:$PORT or http://127.0.0.1:$PORT"

npm run dev