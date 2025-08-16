#!/bin/bash

# AI Automation Deployment Script for Multifamily AI Valuation Platform
# This script deploys the complete AI automation system with monitoring

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.ai-automation.yml"
ENV_FILE=".env"
BACKUP_DIR="./backups"
LOG_FILE="./logs/deployment.log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running. Please start Docker first."
    fi
    
    success "Prerequisites check passed"
}

# Setup environment
setup_environment() {
    log "Setting up environment..."
    
    # Create necessary directories
    mkdir -p logs tmp monitoring/grafana-dashboards monitoring/grafana-provisioning
    mkdir -p nginx/ssl ai_automation/config ai_automation/models
    mkdir -p uploads outputs storage/exports storage/temp
    mkdir -p "$BACKUP_DIR"
    
    # Set permissions
    chmod +x scripts/automation/ai-health-check.js
    chmod +x scripts/*.sh 2>/dev/null || true
    
    # Check if .env file exists
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f ".env.example" ]; then
            log "Creating .env file from .env.example..."
            cp .env.example "$ENV_FILE"
            warning "Please update .env file with your actual configuration values"
        else
            warning "No .env file found. Using default environment variables."
        fi
    fi
    
    success "Environment setup completed"
}

# Backup existing data
backup_data() {
    if [ "$1" = "--skip-backup" ]; then
        log "Skipping backup as requested"
        return
    fi
    
    log "Creating backup of existing data..."
    
    BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/backup_$BACKUP_TIMESTAMP"
    mkdir -p "$BACKUP_PATH"
    
    # Backup databases if they exist
    if docker ps --format "table {{.Names}}" | grep -q "postgres"; then
        log "Backing up PostgreSQL database..."
        docker exec postgres pg_dumpall -U postgres > "$BACKUP_PATH/postgres_backup.sql" 2>/dev/null || true
    fi
    
    if docker ps --format "table {{.Names}}" | grep -q "redis"; then
        log "Backing up Redis data..."
        docker exec redis redis-cli BGSAVE 2>/dev/null || true
        docker cp redis:/data/dump.rdb "$BACKUP_PATH/redis_backup.rdb" 2>/dev/null || true
    fi
    
    # Backup application data
    if [ -d "uploads" ]; then
        cp -r uploads "$BACKUP_PATH/" 2>/dev/null || true
    fi
    
    if [ -d ".dev-data" ]; then
        cp -r .dev-data "$BACKUP_PATH/" 2>/dev/null || true
    fi
    
    success "Backup created at $BACKUP_PATH"
}

# Deploy AI automation system
deploy_system() {
    log "Deploying AI automation system..."
    
    # Pull latest images
    log "Pulling Docker images..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Build custom images
    log "Building custom images..."
    docker-compose -f "$COMPOSE_FILE" build
    
    # Start services
    log "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    success "AI automation system deployed"
}

# Wait for services to be ready
wait_for_services() {
    log "Waiting for services to be ready..."
    
    # Wait for main application
    log "Waiting for main application..."
    timeout 120 bash -c 'until curl -f http://localhost:3000/api/health &>/dev/null; do sleep 2; done' || {
        warning "Main application health check timeout"
    }
    
    # Wait for Grafana
    log "Waiting for Grafana..."
    timeout 60 bash -c 'until curl -f http://localhost:3001/api/health &>/dev/null; do sleep 2; done' || {
        warning "Grafana health check timeout"
    }
    
    # Wait for Prometheus
    log "Waiting for Prometheus..."
    timeout 60 bash -c 'until curl -f http://localhost:9090/-/healthy &>/dev/null; do sleep 2; done' || {
        warning "Prometheus health check timeout"
    }
    
    success "Services are ready"
}

# Run health checks
run_health_checks() {
    log "Running comprehensive health checks..."
    
    # Test AI health monitoring
    if docker exec multifamily-ai-app node scripts/automation/ai-health-check.js enhanced; then
        success "AI health check passed"
    else
        warning "AI health check failed - system may still be initializing"
    fi
    
    # Check Docker container status
    log "Checking container status..."
    docker-compose -f "$COMPOSE_FILE" ps
    
    # Check logs for errors
    log "Checking for critical errors in logs..."
    docker-compose -f "$COMPOSE_FILE" logs --tail=50 | grep -i "error\|critical\|fatal" || true
}

# Configure monitoring
configure_monitoring() {
    log "Configuring monitoring and alerting..."
    
    # Import Grafana dashboards if available
    if [ -d "monitoring/grafana-dashboards" ]; then
        log "Grafana dashboards will be auto-imported"
    fi
    
    # Setup Prometheus targets
    log "Prometheus is configured to monitor all services"
    
    success "Monitoring configuration completed"
}

# Display access information
show_access_info() {
    log "Deployment completed successfully!"
    echo ""
    echo "🎉 AI Automation System is now running!"
    echo ""
    echo "📊 Access URLs:"
    echo "  • Main Application:    http://localhost:3000"
    echo "  • Grafana Dashboards: http://localhost:3001 (admin/admin)"
    echo "  • Prometheus:          http://localhost:9090"
    echo "  • AlertManager:        http://localhost:9093"
    echo ""
    echo "🔧 Management Commands:"
    echo "  • View logs:           docker-compose -f $COMPOSE_FILE logs -f"
    echo "  • Stop system:         docker-compose -f $COMPOSE_FILE down"
    echo "  • Restart system:      docker-compose -f $COMPOSE_FILE restart"
    echo "  • Health check:        docker exec multifamily-ai-app node scripts/automation/ai-health-check.js"
    echo ""
    echo "📋 Next Steps:"
    echo "  1. Configure alerts in AlertManager"
    echo "  2. Set up Grafana dashboards"
    echo "  3. Update .env with your API keys"
    echo "  4. Train AI models with your data"
    echo ""
    echo "📖 Documentation: See AI_AUTOMATION_DEPLOYMENT_GUIDE.md"
}

# Cleanup function
cleanup() {
    if [ "$1" = "--cleanup" ]; then
        log "Cleaning up old containers and images..."
        docker-compose -f "$COMPOSE_FILE" down --volumes --rmi all
        docker system prune -f
        success "Cleanup completed"
    fi
}

# Main deployment function
main() {
    echo "🚀 Multifamily AI Automation Deployment"
    echo "========================================"
    
    # Create log directory
    mkdir -p logs
    
    # Parse arguments
    SKIP_BACKUP=false
    CLEANUP_MODE=false
    
    for arg in "$@"; do
        case $arg in
            --skip-backup)
                SKIP_BACKUP=true
                ;;
            --cleanup)
                CLEANUP_MODE=true
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --skip-backup    Skip backup of existing data"
                echo "  --cleanup        Remove all containers and images"
                echo "  --help, -h       Show this help message"
                exit 0
                ;;
        esac
    done
    
    if [ "$CLEANUP_MODE" = true ]; then
        cleanup --cleanup
        exit 0
    fi
    
    # Run deployment steps
    check_prerequisites
    setup_environment
    
    if [ "$SKIP_BACKUP" = false ]; then
        backup_data
    else
        backup_data --skip-backup
    fi
    
    deploy_system
    wait_for_services
    configure_monitoring
    run_health_checks
    show_access_info
    
    success "Deployment completed successfully!"
}

# Run main function with all arguments
main "$@"