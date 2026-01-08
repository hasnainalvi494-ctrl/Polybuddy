@echo off
REM PolyBuddy Setup Script (Batch version)
echo ====================================
echo PolyBuddy Setup
echo ====================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js found
node --version

REM Check if Docker is installed
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker not found
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)

echo [OK] Docker found
docker --version

REM Check if Docker is running
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running
    echo Please start Docker Desktop and try again
    echo.
    pause
    exit /b 1
)

echo [OK] Docker is running

REM Install pnpm if not present
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing pnpm...
    call corepack enable
    call corepack prepare pnpm@9.15.0 --activate
)

echo [OK] pnpm found
pnpm --version

echo.
echo ====================================
echo Installing Dependencies
echo ====================================
echo.

call pnpm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo [OK] Dependencies installed

echo.
echo ====================================
echo Setting Up Environment
echo ====================================
echo.

if not exist .env (
    echo DATABASE_URL=postgresql://polybuddy:polybuddy@localhost:5432/polybuddy > .env
    echo [OK] .env file created
) else (
    echo [OK] .env file already exists
)

echo.
echo ====================================
echo Starting Database
echo ====================================
echo.

call pnpm docker:up
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start database
    pause
    exit /b 1
)

echo [OK] PostgreSQL container started
echo Waiting for database to initialize...
timeout /t 5 /nobreak >nul

echo Pushing database schema...
set DATABASE_URL=postgresql://polybuddy:polybuddy@localhost:5432/polybuddy
call pnpm db:push
if %errorlevel% neq 0 (
    echo [ERROR] Failed to push database schema
    pause
    exit /b 1
)

echo [OK] Database schema created

echo.
echo ====================================
echo Setup Complete!
echo ====================================
echo.
echo To start the application, run: start.bat
echo.
echo Or manually in two terminals:
echo   Terminal 1: set DATABASE_URL=postgresql://polybuddy:polybuddy@localhost:5432/polybuddy ^&^& pnpm dev:api
echo   Terminal 2: pnpm dev:web
echo.
echo Access URLs:
echo   Web UI:  http://localhost:3000
echo   API:     http://localhost:3001/health
echo   Docs:    http://localhost:3001/docs
echo.
pause



