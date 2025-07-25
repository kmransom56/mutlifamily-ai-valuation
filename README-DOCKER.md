# 🐳 Docker Installation Guide

This guide provides one-click installation for the Multifamily AI Valuation application using Docker.

## 🚀 Quick Start (One-Click Installation)

### Prerequisites
- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop/))
- Git installed
- 4GB+ RAM available

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kmransom56/mutlifamily-ai-valuation.git
   cd mutlifamily-ai-valuation
   ```

2. **Run the one-click installer:**
   ```bash
   ./install.sh
   ```

3. **Open your browser:**
   - Visit: http://localhost:3000
   - The application will be ready to use!

## 🛠️ Manual Installation

If you prefer manual setup or need to customize the installation:

### 1. Environment Setup
```bash
# Copy environment template
cp .env.docker .env.local

# Edit with your configuration
nano .env.local
```

### 2. Start Services
```bash
# Production mode
docker-compose up -d

# Development mode (with hot reload)
docker-compose -f docker-compose.dev.yml up -d
```

## 📋 Configuration

### Required Environment Variables

Update `.env.local` with your settings:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secure-32-character-secret-key

# Google OAuth (for Drive integration)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Optional Environment Variables

```env
# Database (for production)
DATABASE_URL=postgresql://user:password@postgres:5432/multifamily_db

# Email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# AI Features
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

## 🏗️ Architecture

The Docker setup includes:

### Core Services
- **App Container**: Next.js application (Port 3000)
- **Redis**: WebSocket sessions and caching (Port 6379)
- **PostgreSQL**: Production database (Port 5432)
- **Nginx**: Reverse proxy and load balancer (Port 80/443)

### File Structure
```
📁 Project Root
├── 🐳 docker-compose.yml         # Production setup
├── 🐳 docker-compose.dev.yml     # Development setup
├── 🐳 Dockerfile                 # Production image
├── 🐳 Dockerfile.dev             # Development image
├── ⚙️ .env.docker                # Environment template
├── 🚀 install.sh                 # One-click installer
├── 📁 uploads/                   # Document uploads
├── 📁 outputs/                   # Analysis results
├── 📁 storage/                   # Export files
└── 📁 init-db/                   # Database initialization
```

## 🔧 Management Commands

### Basic Operations
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart app

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d
```

### Development Mode
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View development logs
docker-compose -f docker-compose.dev.yml logs -f app
```

### Database Management
```bash
# Access PostgreSQL
docker-compose exec postgres psql -U multifamily_user -d multifamily_db

# Backup database
docker-compose exec postgres pg_dump -U multifamily_user multifamily_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U multifamily_user multifamily_db < backup.sql
```

### File Management
```bash
# Access app container
docker-compose exec app sh

# View uploaded files
docker-compose exec app ls -la uploads/

# Clear cache
docker-compose exec redis redis-cli FLUSHALL
```

## 🚀 Production Deployment

### 1. Cloud Deployment (AWS/GCP/Azure)

```bash
# Set production environment
export NODE_ENV=production

# Update environment variables
nano .env.local

# Deploy with production profile
docker-compose --profile production up -d
```

### 2. Domain Setup

Update `nginx.conf` for your domain:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    # ... rest of configuration
}
```

### 3. SSL Certificate

```bash
# Generate SSL certificate (Let's Encrypt)
docker run --rm -v $(pwd)/ssl:/etc/letsencrypt certbot/certbot \
  certonly --standalone -d your-domain.com

# Update nginx configuration for HTTPS
# Restart nginx
docker-compose restart nginx
```

## 📊 Monitoring

### Health Checks
```bash
# Check service status
docker-compose ps

# Health check endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/status
```

### Performance Monitoring
```bash
# Resource usage
docker stats

# Container logs
docker-compose logs --tail=100 app
```

## 🔒 Security

### Production Security Checklist
- [ ] Update all default passwords
- [ ] Use strong NEXTAUTH_SECRET (32+ characters)
- [ ] Configure firewall rules
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Set up backup strategy
- [ ] Configure log rotation
- [ ] Enable Docker security scanning

### Environment Variables Security
```bash
# Never commit .env.local to version control
echo ".env.local" >> .gitignore

# Use Docker secrets for production
docker secret create nextauth_secret your_secret_file
```

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Check what's using port 3000
lsof -i :3000

# Use different port
docker-compose up -d --scale app=1 -p 3001:3000
```

**Database connection failed:**
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d
```

**Build failures:**
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

**Permission errors:**
```bash
# Fix file permissions
sudo chown -R $(id -u):$(id -g) uploads outputs storage
```

### Logs and Debugging
```bash
# Application logs
docker-compose logs -f app

# Database logs
docker-compose logs -f postgres

# All services logs
docker-compose logs -f

# Debug mode
docker-compose exec app npm run dev
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Next.js Docker Guide](https://nextjs.org/docs/deployment#docker-image)
- [PostgreSQL Docker Guide](https://hub.docker.com/_/postgres)

## 🆘 Support

If you encounter issues:

1. Check the [troubleshooting section](#-troubleshooting)
2. Review logs: `docker-compose logs`
3. Open an issue on GitHub
4. Join our Discord community

---

**Happy containerizing! 🐳🏢**