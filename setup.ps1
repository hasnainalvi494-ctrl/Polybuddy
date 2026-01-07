# PolyBuddy Setup Script for Windows
# This script checks prerequisites and sets up the project

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "PolyBuddy Setup Script" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
if (Test-Command node) {
    $nodeVersion = node --version
    Write-Host "Success: Node.js found: $nodeVersion" -ForegroundColor Green
    
    # Check if version is >= 20
    $versionNumber = $nodeVersion -replace 'v', ''
    $majorVersion = [int]($versionNumber.Split('.')[0])
    if ($majorVersion -lt 20) {
        Write-Host "Error: Node.js version must be >= 20.0.0" -ForegroundColor Red
        Write-Host "Please upgrade Node.js" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Error: Node.js not found" -ForegroundColor Red
    Write-Host "Please install Node.js >= 20.0.0" -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
if (Test-Command docker) {
    $dockerVersion = docker --version
    Write-Host "Success: Docker found: $dockerVersion" -ForegroundColor Green
    
    # Check if Docker is running
    $dockerTest = docker ps 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Success: Docker is running" -ForegroundColor Green
    } else {
        Write-Host "Error: Docker is not running" -ForegroundColor Red
        Write-Host "Please start Docker Desktop" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Error: Docker not found" -ForegroundColor Red
    Write-Host "Please install Docker Desktop" -ForegroundColor Red
    Write-Host "Download from: https://docker.com/get-started" -ForegroundColor Yellow
    exit 1
}

# Check pnpm
Write-Host "Checking pnpm..." -ForegroundColor Yellow
if (Test-Command pnpm) {
    $pnpmVersion = pnpm --version
    Write-Host "Success: pnpm found: $pnpmVersion" -ForegroundColor Green
} else {
    Write-Host "Error: pnpm not found" -ForegroundColor Red
    Write-Host "Installing pnpm..." -ForegroundColor Yellow
    
    try {
        corepack enable
        corepack prepare pnpm@9.15.0 --activate
        Write-Host "Success: pnpm installed" -ForegroundColor Green
    } catch {
        Write-Host "Error: Failed to install pnpm" -ForegroundColor Red
        Write-Host "Please run manually:" -ForegroundColor Red
        Write-Host "  corepack enable" -ForegroundColor Yellow
        Write-Host "  corepack prepare pnpm@9.15.0 --activate" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Installing Dependencies" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Install dependencies
Write-Host "Running pnpm install..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "Success: Dependencies installed" -ForegroundColor Green

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Setting Up Environment" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Create .env file if it doesn't exist
if (-not (Test-Path .env)) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    $envContent = "DATABASE_URL=postgresql://polybuddy:polybuddy@localhost:5432/polybuddy"
    Set-Content -Path .env -Value $envContent
    Write-Host "Success: .env file created" -ForegroundColor Green
} else {
    Write-Host "Success: .env file already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Starting Database" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Start Docker containers
Write-Host "Starting PostgreSQL container..." -ForegroundColor Yellow
pnpm docker:up
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to start database" -ForegroundColor Red
    exit 1
}
Write-Host "Success: PostgreSQL container started" -ForegroundColor Green

# Wait for database to be ready
Write-Host "Waiting for database to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Push database schema
Write-Host "Pushing database schema..." -ForegroundColor Yellow
$env:DATABASE_URL = "postgresql://polybuddy:polybuddy@localhost:5432/polybuddy"
pnpm db:push
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to push database schema" -ForegroundColor Red
    exit 1
}
Write-Host "Success: Database schema created" -ForegroundColor Green

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the application:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option 1 - Quick start (recommended):" -ForegroundColor Cyan
Write-Host "  .\start.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Option 2 - Manual (two terminals):" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Terminal 1 - API Server:" -ForegroundColor Cyan
Write-Host '  $env:DATABASE_URL="postgresql://polybuddy:polybuddy@localhost:5432/polybuddy"; pnpm dev:api' -ForegroundColor White
Write-Host ""
Write-Host "  Terminal 2 - Web Frontend:" -ForegroundColor Cyan
Write-Host "  pnpm dev:web" -ForegroundColor White
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Yellow
Write-Host "  Web UI:  http://localhost:3000" -ForegroundColor Green
Write-Host "  API:     http://localhost:3001/health" -ForegroundColor Green
Write-Host "  Docs:    http://localhost:3001/docs" -ForegroundColor Green
Write-Host ""
