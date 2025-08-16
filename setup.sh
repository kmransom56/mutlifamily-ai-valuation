#!/bin/bash

# Multifamily AI Valuation Application - Automated Setup Script
# This script automates the complete setup process for development

set -e  # Exit on any error

# Color codes for output
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

print_header() {
    echo -e "\n${BLUE}============================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}============================================${NC}\n"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check version
check_version() {
    local cmd=$1
    local min_version=$2
    local current_version=$($cmd --version 2>/dev/null | head -n1 | grep -oE '[0-9]+\.[0-9]+' | head -n1)
    
    if [ -z "$current_version" ]; then
        return 1
    fi
    
    # Simple version comparison (works for most cases)
    if [ "$(printf '%s\n' "$min_version" "$current_version" | sort -V | head -n1)" = "$min_version" ]; then
        return 0
    else
        return 1
    fi
}

# Generate secure random string
generate_secret() {
    if command_exists openssl; then
        openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
    else
        # Fallback for systems without openssl
        cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1
    fi
}

print_header "🏢 Multifamily AI Valuation - Automated Setup"

print_status "Starting automated setup process..."

# Step 1: Prerequisites Check
print_header "📋 Step 1: Prerequisites Check"

# Check Node.js
if command_exists node; then
    if check_version "node" "18.0"; then
        NODE_VERSION=$(node --version)
        print_success "Node.js $NODE_VERSION is installed ✓"
    else
        print_error "Node.js 18+ required. Current version: $(node --version)"
        print_status "Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
else
    print_error "Node.js is not installed"
    print_status "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_success "npm $NPM_VERSION is installed ✓"
else
    print_error "npm is not installed"
    exit 1
fi

# Check Python
if command_exists python3; then
    if check_version "python3" "3.8"; then
        PYTHON_VERSION=$(python3 --version)
        print_success "$PYTHON_VERSION is installed ✓"
    else
        print_error "Python 3.8+ required. Current version: $(python3 --version)"
        exit 1
    fi
else
    print_error "Python 3 is not installed"
    print_status "Please install Python 3.8+ from https://python.org/"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Step 2: Install Dependencies
print_header "📦 Step 2: Installing Dependencies"

print_status "Installing Node.js dependencies..."
if npm install; then
    print_success "Node.js dependencies installed ✓"
else
    print_error "Failed to install Node.js dependencies"
    exit 1
fi

print_status "Setting up Python AI processing environment..."

cd ai_processing

# Create virtual environment
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    if python3 -m venv venv; then
        print_success "Python virtual environment created ✓"
    else
        print_error "Failed to create Python virtual environment"
        exit 1
    fi
else
    print_success "Python virtual environment already exists ✓"
fi

# Activate virtual environment and install dependencies
print_status "Installing Python dependencies..."

if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
elif [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
else
    print_error "Cannot find virtual environment activation script"
    exit 1
fi

if pip install -r requirements.txt; then
    print_success "Python dependencies installed ✓"
else
    print_error "Failed to install Python dependencies"
    exit 1
fi

# Test Python installation
print_status "Testing Python AI system..."
if python3 src/main.py --help > /dev/null 2>&1; then
    print_success "Python AI system is working ✓"
else
    print_warning "Python AI system test failed, but continuing..."
fi

cd ..

# Step 3: Environment Configuration
print_header "⚙️ Step 3: Environment Configuration"

if [ ! -f ".env.local" ]; then
    print_status "Creating environment configuration..."
    
    # Copy template if it exists, otherwise create from scratch
    if [ -f ".env.docker" ]; then
        cp .env.docker .env.local
        print_success "Copied .env.docker to .env.local ✓"
    else
        print_status "Creating new .env.local file..."
        cat > .env.local << EOF
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:11100
NEXTAUTH_SECRET=$(generate_secret)

# Google OAuth (optional for basic functionality)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AI Processing (optional but recommended)
OPENAI_API_KEY=

# Application Settings
NODE_ENV=development
EOF
        print_success "Created .env.local with default values ✓"
    fi
    
    # Generate secure secret
    SECRET=$(generate_secret)
    if command_exists sed; then
        sed -i.bak "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=$SECRET/" .env.local
        rm -f .env.local.bak
        print_success "Generated secure NEXTAUTH_SECRET ✓"
    fi
    
else
    print_success ".env.local already exists ✓"
fi

# Step 4: Create directories
print_header "📁 Step 4: Creating Directories"

mkdir -p uploads outputs
print_success "Created uploads and outputs directories ✓"

# Step 5: Final verification
print_header "✅ Step 5: Final Verification"

print_status "Verifying installation..."

# Check if Node.js dependencies are installed
if [ -d "node_modules" ]; then
    print_success "Node.js dependencies verified ✓"
else
    print_warning "Node.js dependencies may not be properly installed"
fi

# Check if Python virtual environment is working
if [ -f "ai_processing/venv/bin/python3" ] || [ -f "ai_processing/venv/Scripts/python.exe" ]; then
    print_success "Python virtual environment verified ✓"
else
    print_warning "Python virtual environment may not be properly installed"
fi

# Check environment file
if [ -f ".env.local" ]; then
    print_success "Environment configuration verified ✓"
else
    print_warning "Environment configuration file not found"
fi

print_header "🎉 Setup Complete!"

echo -e "${GREEN}Your Multifamily AI Valuation application is ready!${NC}\n"

echo -e "${BLUE}Next Steps:${NC}"
echo -e "1. ${YELLOW}Optional:${NC} Edit .env.local to add your API keys:"
echo -e "   - OPENAI_API_KEY for enhanced AI features"
echo -e "   - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for Google Drive integration"
echo ""
echo -e "2. ${YELLOW}Start the application:${NC}"
echo -e "   ${GREEN}PORT=11100 npm run dev${NC}"
echo ""
echo -e "3. ${YELLOW}Access the application:${NC}"
echo -e "   ${GREEN}http://localhost:11100${NC} or ${GREEN}http://127.0.0.1:11100${NC}"
echo ""

echo -e "${BLUE}Useful Commands:${NC}"
echo -e "  ${GREEN}npm run dev${NC}          # Start development server"
echo -e "  ${GREEN}npm run build${NC}        # Build for production"
echo -e "  ${GREEN}npm run lint${NC}         # Run linting"
echo -e "  ${GREEN}npm run type-check${NC}   # Run type checking"
echo ""

print_success "Setup completed successfully! 🚀"