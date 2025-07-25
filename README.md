# Multifamily Property Valuation Application

A comprehensive, AI-powered platform for analyzing and valuing multifamily real estate investments. This application provides sophisticated financial modeling, document processing, and investor communication tools.

## 🏢 Features

### Phase 1: Core Functionality
- **Property Analysis**: Upload and process rent rolls, T12 statements, and offering memorandums
- **Financial Modeling**: Advanced investment calculations and projections
- **Document Processing**: AI-powered extraction from property documents
- **User Interface**: Modern, responsive React/Next.js application

### Phase 2: Enhanced Features
- **User Authentication**: Secure login with NextAuth.js
- **Property Management**: Save and manage property portfolios
- **Google Drive Integration**: Seamless document storage and retrieval
- **Advanced Calculators**: IRR, NPV, and cash flow analysis tools
- **Dashboard**: Comprehensive property overview and analytics

### Phase 3: Advanced Analytics & Automation
- **Real-time Processing**: WebSocket-based live status updates
- **Advanced Document Preview**: Interactive document viewing with AI annotations
- **Multi-format Exports**: Excel, PDF, PowerPoint, JSON, and CSV exports
- **Investor Notifications**: Automated email alerts and deal notifications
- **MCP Integration**: Enhanced AI processing capabilities
- **Pitch Deck Generation**: Professional investment presentations

## 🚀 Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Shadcn/ui**: Modern component library
- **Lucide React**: Icon library

### Backend
- **Next.js API Routes**: Server-side functionality
- **NextAuth.js**: Authentication framework
- **Google APIs**: Drive integration and OAuth
- **WebSockets**: Real-time communication
- **File System**: Document storage and processing

### AI & Processing
- **Python Integration**: Advanced analysis engine
- **MCP (Model Context Protocol)**: AI processing capabilities
- **Document AI**: Text extraction and analysis
- **Financial Modeling**: Investment calculations

## 📦 Installation

### 🐳 Quick Start (Docker - Recommended)

**One-click installation with Docker:**

```bash
git clone https://github.com/kmransom56/mutlifamily-ai-valuation.git
cd mutlifamily-ai-valuation
./install.sh
```

Then open: http://localhost:3000

**What you get:**
- ✅ Complete application with all services
- ✅ Redis for real-time WebSocket sessions
- ✅ PostgreSQL database with schemas
- ✅ Nginx reverse proxy (production)
- ✅ Automated environment setup
- ✅ Volume persistence for data

**Prerequisites for Docker:**
- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop/))
- 4GB+ RAM available

**Management commands:**
```bash
npm run docker:dev    # Development with hot reload
npm run docker:prod   # Production mode
npm run docker:logs   # View logs
npm run docker:down   # Stop all services
```

📖 **Detailed Docker guide:** [README-DOCKER.md](README-DOCKER.md)

---

### 🛠️ Manual Installation (Advanced)

**Prerequisites:**
- Node.js 18+ and npm
- Python 3.8+ (for backend processing)
- Google Cloud Project (for Drive integration)

**Setup:**

1. **Clone the repository**
   ```bash
   git clone https://github.com/kmransom56/mutlifamily-ai-valuation.git
   cd mutlifamily-ai-valuation
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment configuration**
   ```bash
   cp .env.docker .env.local
   ```
   
   Configure the following variables:
   ```env
   # NextAuth Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secure-32-character-secret-key
   
   # Google OAuth & Drive API
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   
   # Application Settings
   NODE_ENV=development
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## 🔧 Configuration

### Google Drive Integration
1. Create a Google Cloud Project
2. Enable Google Drive API and Google Sheets API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

### Authentication Setup
1. Configure NextAuth.js providers in `src/lib/auth.ts`
2. Set up user roles and permissions
3. Configure session management

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── properties/    # Property management
│   │   ├── process/       # Document processing
│   │   ├── export/        # Multi-format exports
│   │   ├── websocket/     # Real-time updates
│   │   └── mcp/          # AI processing
│   ├── dashboard/         # Dashboard pages
│   ├── properties/        # Property management
│   └── calculator/        # Financial calculators
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── AIAnalysisPanel.tsx
│   ├── DocumentPreview.tsx
│   ├── ExportPanel.tsx
│   ├── InvestorNotifications.tsx
│   ├── ProcessingStatusPanel.tsx
│   └── Phase3Dashboard.tsx
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
├── types/                 # TypeScript definitions
└── styles/               # Global styles
```

## 🏗️ Architecture

### Component Architecture
- **Modular Design**: Reusable, composable components
- **Type Safety**: Comprehensive TypeScript coverage
- **State Management**: React hooks and context
- **Real-time Updates**: WebSocket integration

### API Design
- **RESTful Endpoints**: Standard HTTP methods
- **Authentication**: JWT-based session management
- **File Handling**: Secure upload and download
- **Error Handling**: Comprehensive error responses

### Data Flow
1. **Document Upload** → Processing Engine → Analysis Results
2. **Real-time Updates** → WebSocket → UI Components
3. **Export Generation** → Multiple Formats → Download Links
4. **Investor Notifications** → Email Templates → Delivery

## 🔐 Security

- **Authentication**: NextAuth.js with OAuth providers
- **Authorization**: Role-based access control
- **File Security**: Path validation and user ownership
- **API Security**: Session verification on all endpoints
- **Data Protection**: Secure file storage and transmission

## 📊 Usage Examples

### Basic Property Analysis
```javascript
// Upload documents and start analysis
const response = await fetch('/api/process', {
  method: 'POST',
  body: formData // Contains rent roll, T12, offering memo
});

const { jobId, statusUrl } = await response.json();
```

### Real-time Status Updates
```javascript
// Connect to WebSocket for live updates
const { connected, jobStatus } = useJobStatusWebSocket(jobId);

// Status updates automatically received
useEffect(() => {
  if (jobStatus?.status === 'completed') {
    // Handle completion
  }
}, [jobStatus]);
```

### Export Generation
```javascript
// Generate Excel export
const exportResponse = await fetch('/api/export', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jobId,
    type: 'analysis',
    options: {
      format: 'excel',
      includeCharts: true,
      includeRawData: false
    }
  })
});
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## 🚀 Deployment

### 🐳 Docker Deployment (Recommended)

**Production deployment:**
```bash
# One-click production setup
./install.sh

# Or manual production start
docker-compose up -d

# With custom domain and SSL
docker-compose --profile production up -d
```

**Cloud deployment (AWS/GCP/Azure):**
```bash
# Update environment for production
cp .env.docker .env.local
# Configure your production values

# Deploy with production profile
docker-compose --profile production up -d
```

**Services included:**
- **Application**: Runs on port 3000
- **PostgreSQL**: Production database on port 5432
- **Redis**: Session storage on port 6379
- **Nginx**: Reverse proxy on ports 80/443

### Vercel Deployment (Alternative)
1. Connect GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main branch

### Environment Variables for Production
```env
# Required
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-secure-32-character-production-secret
GOOGLE_CLIENT_ID=production-client-id
GOOGLE_CLIENT_SECRET=production-client-secret

# Database (Docker automatic)
DATABASE_URL=postgresql://user:password@postgres:5432/multifamily_db
REDIS_URL=redis://redis:6379

# Optional
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**🔧 Production setup guide:** [README-DOCKER.md](README-DOCKER.md)

## 📈 Performance

- **Optimized Bundle**: Code splitting and lazy loading
- **Caching**: Static assets and API responses
- **Real-time**: Efficient WebSocket connections
- **File Processing**: Streaming uploads and downloads

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Use conventional commit messages
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/kmransom56/mutlifamily-ai-valuation/issues)
- **Documentation**: [README-DOCKER.md](README-DOCKER.md) for Docker setup
- **Repository**: [GitHub Repository](https://github.com/kmransom56/mutlifamily-ai-valuation)

## 🚧 Roadmap

### Upcoming Features
- [ ] Advanced AI market analysis with ML predictions
- [ ] Integration with MLS and real estate data sources
- [ ] Mobile application (React Native)
- [ ] Advanced reporting and analytics dashboard
- [ ] Multi-language support
- [ ] REST API for third-party integrations
- [ ] Kubernetes deployment support
- [ ] Advanced security features (2FA, SSO)
- [ ] Performance monitoring and alerting
- [ ] Automated testing and CI/CD

## 📸 Key Features Overview

### 🏢 Property Analysis Dashboard
- Real-time financial modeling and projections
- Interactive charts and visualizations
- Portfolio management and tracking

### 📄 Advanced Document Processing
- AI-powered text extraction and analysis
- Interactive document preview with annotations
- Support for PDF, Excel, Word, and image files

### 📊 Multi-format Export System
- Professional pitch deck generation (PowerPoint)
- Detailed financial reports (Excel, PDF)
- Custom export templates and branding

### 🔔 Investor Communication
- Automated email notifications
- Professional templates for different scenarios
- Investor database and segmentation

### ⚡ Real-time Processing
- WebSocket-based live status updates
- Progress tracking for long-running analyses
- Instant notification system

---

**Built with ❤️ for real estate professionals and investors**