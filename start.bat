@echo off
REM PolyBuddy Start Script

echo ====================================
echo Starting PolyBuddy
echo ====================================
echo.

REM Check if database is running
docker ps | findstr polybuddy-postgres >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting database...
    call pnpm docker:up
    echo Waiting for database...
    timeout /t 5 /nobreak >nul
)

echo [OK] Database is running
echo.
echo Starting services...
echo   API Server: http://localhost:3001
echo   Web Frontend: http://localhost:3000
echo.
echo Press Ctrl+C to stop all services
echo.

REM Set environment variable
set DATABASE_URL=postgresql://polybuddy:polybuddy@localhost:5432/polybuddy

REM Start both services in separate windows
start "PolyBuddy API" cmd /k "set DATABASE_URL=postgresql://polybuddy:polybuddy@localhost:5432/polybuddy && pnpm dev:api"
timeout /t 2 /nobreak >nul
start "PolyBuddy Web" cmd /k "pnpm dev:web"

echo.
echo Services started in separate windows!
echo.
echo Access the application at: http://localhost:3000
echo.





