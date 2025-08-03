@echo off

REM Multifamily AI Valuation - Development Server Startup (Windows)
REM Quick script to start the development server

echo.
echo 🏢 Multifamily AI Valuation - Development Server
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] package.json not found. Please run this script from the project root directory.
    pause
    exit /b 1
)

REM Check if setup has been run
if not exist "node_modules" (
    echo [WARNING] Node modules not found. Running setup first...
    call setup.bat
)

if not exist "ai_processing\venv" (
    echo [WARNING] Python virtual environment not found. Running setup first...
    call setup.bat
)

if not exist ".env.local" (
    echo [WARNING] Environment configuration not found. Running setup first...
    call setup.bat
)

echo [INFO] Starting development server...

REM Use port 11100 by default to avoid conflicts
set PORT=11100

REM Start the development server
echo [SUCCESS] 🚀 Starting Next.js development server on port %PORT%
echo [INFO] Access the application at: http://localhost:%PORT% or http://127.0.0.1:%PORT%

npm run dev