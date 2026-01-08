# PolyBuddy Quick Start Script
# This script starts both the API and Web servers

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Starting PolyBuddy" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if database is running
Write-Host "Checking database..." -ForegroundColor Yellow
$containers = docker ps --filter "name=polybuddy-postgres" --format "{{.Names}}"
if ($containers -notcontains "polybuddy-postgres") {
    Write-Host "Database not running. Starting..." -ForegroundColor Yellow
    pnpm docker:up
    Start-Sleep -Seconds 5
}
Write-Host "✓ Database is running" -ForegroundColor Green

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Yellow
Write-Host "  - API Server will run on http://localhost:3001" -ForegroundColor Cyan
Write-Host "  - Web Frontend will run on http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Set environment variable for the session
$env:DATABASE_URL = "postgresql://polybuddy:polybuddy@localhost:5432/polybuddy"

# Start both services using PowerShell jobs
$apiJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    $env:DATABASE_URL = "postgresql://polybuddy:polybuddy@localhost:5432/polybuddy"
    pnpm dev:api
}

$webJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    pnpm dev:web
}

Write-Host "Services started!" -ForegroundColor Green
Write-Host ""
Write-Host "API Server Job ID: $($apiJob.Id)" -ForegroundColor Gray
Write-Host "Web Server Job ID: $($webJob.Id)" -ForegroundColor Gray
Write-Host ""

# Monitor the jobs
try {
    while ($true) {
        # Show output from both jobs
        Receive-Job -Job $apiJob
        Receive-Job -Job $webJob
        
        # Check if jobs are still running
        if (($apiJob.State -ne "Running") -or ($webJob.State -ne "Running")) {
            Write-Host "One or more services stopped unexpectedly" -ForegroundColor Red
            break
        }
        
        Start-Sleep -Seconds 1
    }
} finally {
    # Clean up jobs on exit
    Write-Host ""
    Write-Host "Stopping services..." -ForegroundColor Yellow
    Stop-Job -Job $apiJob, $webJob
    Remove-Job -Job $apiJob, $webJob
    Write-Host "✓ Services stopped" -ForegroundColor Green
}





