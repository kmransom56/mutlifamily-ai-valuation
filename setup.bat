@echo off
setlocal enabledelayedexpansion

REM Multifamily AI Valuation Application - Automated Setup Script (Windows)
REM This script automates the complete setup process for development

echo.
echo ============================================
echo  Multifamily AI Valuation - Automated Setup
echo ============================================
echo.

echo [INFO] Starting automated setup process...

REM Step 1: Prerequisites Check
echo.
echo ============================================
echo  Step 1: Prerequisites Check
echo ============================================
echo.

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed
    echo [INFO] Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [SUCCESS] Node.js !NODE_VERSION! is installed ✓
)

REM Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo [SUCCESS] npm !NPM_VERSION! is installed ✓
)

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed
    echo [INFO] Please install Python 3.8+ from https://python.org/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
    echo [SUCCESS] !PYTHON_VERSION! is installed ✓
)

REM Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] package.json not found. Please run this script from the project root directory.
    pause
    exit /b 1
)

REM Step 2: Install Dependencies
echo.
echo ============================================
echo  Step 2: Installing Dependencies
echo ============================================
echo.

echo [INFO] Installing Node.js dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Node.js dependencies
    pause
    exit /b 1
) else (
    echo [SUCCESS] Node.js dependencies installed ✓
)

echo [INFO] Setting up Python AI processing environment...

cd ai_processing

REM Create virtual environment
if not exist "venv" (
    echo [INFO] Creating Python virtual environment...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create Python virtual environment
        pause
        exit /b 1
    ) else (
        echo [SUCCESS] Python virtual environment created ✓
    )
) else (
    echo [SUCCESS] Python virtual environment already exists ✓
)

REM Activate virtual environment and install dependencies
echo [INFO] Installing Python dependencies...

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install Python dependencies
        pause
        exit /b 1
    ) else (
        echo [SUCCESS] Python dependencies installed ✓
    )
) else (
    echo [ERROR] Cannot find virtual environment activation script
    pause
    exit /b 1
)

REM Test Python installation
echo [INFO] Testing Python AI system...
python src\main.py --help >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Python AI system test failed, but continuing...
) else (
    echo [SUCCESS] Python AI system is working ✓
)

cd ..

REM Step 3: Environment Configuration
echo.
echo ============================================
echo  Step 3: Environment Configuration
echo ============================================
echo.

if not exist ".env.local" (
    echo [INFO] Creating environment configuration...
    
    REM Copy template if it exists, otherwise create from scratch
    if exist ".env.docker" (
        copy .env.docker .env.local >nul
        echo [SUCCESS] Copied .env.docker to .env.local ✓
    ) else (
        echo [INFO] Creating new .env.local file...
        (
            echo # NextAuth Configuration
            echo NEXTAUTH_URL=http://localhost:11100
            echo NEXTAUTH_SECRET=your-secure-32-character-secret-key
            echo.
            echo # Google OAuth ^(optional for basic functionality^)
            echo GOOGLE_CLIENT_ID=
            echo GOOGLE_CLIENT_SECRET=
            echo.
            echo # AI Processing ^(optional but recommended^)
            echo OPENAI_API_KEY=
            echo.
            echo # Application Settings
            echo NODE_ENV=development
        ) > .env.local
        echo [SUCCESS] Created .env.local with default values ✓
    )
) else (
    echo [SUCCESS] .env.local already exists ✓
)

REM Step 4: Create directories
echo.
echo ============================================
echo  Step 4: Creating Directories
echo ============================================
echo.

if not exist "uploads" mkdir uploads
if not exist "outputs" mkdir outputs
echo [SUCCESS] Created uploads and outputs directories ✓

REM Step 5: Final verification
echo.
echo ============================================
echo  Step 5: Final Verification
echo ============================================
echo.

echo [INFO] Verifying installation...

REM Check if Node.js dependencies are installed
if exist "node_modules" (
    echo [SUCCESS] Node.js dependencies verified ✓
) else (
    echo [WARNING] Node.js dependencies may not be properly installed
)

REM Check if Python virtual environment is working
if exist "ai_processing\venv\Scripts\python.exe" (
    echo [SUCCESS] Python virtual environment verified ✓
) else (
    echo [WARNING] Python virtual environment may not be properly installed
)

REM Check environment file
if exist ".env.local" (
    echo [SUCCESS] Environment configuration verified ✓
) else (
    echo [WARNING] Environment configuration file not found
)

echo.
echo ============================================
echo  Setup Complete!
echo ============================================
echo.

echo Your Multifamily AI Valuation application is ready!
echo.

echo Next Steps:
echo 1. Optional: Edit .env.local to add your API keys:
echo    - OPENAI_API_KEY for enhanced AI features
echo    - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for Google Drive integration
echo.
echo 2. Start the application:
echo    set PORT=11100 ^&^& npm run dev
echo.
echo 3. Access the application:
echo    http://localhost:11100 or http://127.0.0.1:11100
echo.

echo Useful Commands:
echo   npm run dev          # Start development server
echo   npm run build        # Build for production
echo   npm run lint         # Run linting
echo   npm run type-check   # Run type checking
echo.

echo [SUCCESS] Setup completed successfully! 🚀

pause