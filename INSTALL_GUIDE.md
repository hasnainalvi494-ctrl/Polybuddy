# PolyBuddy Installation Guide (Windows)

This guide will help you install and run PolyBuddy on Windows.

## Prerequisites Installation

### 1. Install Node.js (>= 20.0.0)

1. Download Node.js installer from: https://nodejs.org/
2. Download the **LTS version** (v20.11.0 or later)
   - Direct link for Windows x64: https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi
3. Run the installer
4. Accept the license agreement
5. Use default installation settings
6. Click "Install" and wait for completion
7. Restart your terminal/PowerShell after installation

**Verify installation:**
```powershell
node --version
# Should show v20.x.x or higher
```

### 2. Install Docker Desktop

1. Download Docker Desktop from: https://docker.com/get-started
   - Direct link: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
2. Run the installer
3. Follow the installation wizard
4. **IMPORTANT:** After installation, start Docker Desktop from the Start Menu
5. Wait for Docker to fully start (whale icon in system tray should be steady)

**Verify installation:**
```powershell
docker --version
# Should show Docker version x.x.x

docker ps
# Should show empty list or running containers (no error)
```

### 3. Install pnpm (9.x)

After installing Node.js, run these commands in PowerShell:

```powershell
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

**Verify installation:**
```powershell
pnpm --version
# Should show 9.15.0
```

---

## Automated Setup (Recommended)

Once all prerequisites are installed, run the automated setup script:

```powershell
.\setup.ps1
```

This script will:
1. ✓ Verify all prerequisites are installed
2. ✓ Install Node.js dependencies
3. ✓ Create .env file with database configuration
4. ✓ Start PostgreSQL database container
5. ✓ Initialize database schema

---

## Quick Start

After running setup, start the application:

```powershell
.\start.ps1
```

This will start both the API server and web frontend.

**Or manually in separate terminals:**

**Terminal 1 - API Server:**
```powershell
$env:DATABASE_URL="postgresql://polybuddy:polybuddy@localhost:5432/polybuddy"
pnpm dev:api
```

**Terminal 2 - Web Frontend:**
```powershell
pnpm dev:web
```

---

## Access the Application

Once running, open your browser:

| Service | URL | Description |
|---------|-----|-------------|
| **Web UI** | http://localhost:3000 | Main application interface |
| **API Health** | http://localhost:3001/health | API health check |
| **API Docs** | http://localhost:3001/docs | Swagger API documentation |

---

## Manual Setup (Alternative)

If you prefer to set up manually:

### Step 1: Install Dependencies
```powershell
pnpm install
```

### Step 2: Create .env File
Create a file named `.env` in the project root with:
```env
DATABASE_URL=postgresql://polybuddy:polybuddy@localhost:5432/polybuddy
```

### Step 3: Start Database
```powershell
pnpm docker:up
```

Wait 5 seconds, then push the schema:
```powershell
$env:DATABASE_URL="postgresql://polybuddy:polybuddy@localhost:5432/polybuddy"
pnpm db:push
```

### Step 4: Start Development Servers

**Terminal 1:**
```powershell
$env:DATABASE_URL="postgresql://polybuddy:polybuddy@localhost:5432/polybuddy"
pnpm dev:api
```

**Terminal 2:**
```powershell
pnpm dev:web
```

---

## Optional: Load Market Data

To populate the database with Polymarket data, run in a third terminal:

```powershell
$env:DATABASE_URL="postgresql://polybuddy:polybuddy@localhost:5432/polybuddy"
pnpm ingestion:start
```

---

## Troubleshooting

### "Docker is not running"
- Open Docker Desktop from the Start Menu
- Wait for the whale icon in the system tray to become steady (not animated)

### "Port already in use"
Check what's using the port:
```powershell
netstat -ano | findstr :3000
netstat -ano | findstr :3001
```

Kill the process:
```powershell
taskkill /PID <PID> /F
```

### "DATABASE_URL environment variable is required"
Make sure to set the environment variable:
```powershell
$env:DATABASE_URL="postgresql://polybuddy:polybuddy@localhost:5432/polybuddy"
```

### Database Connection Issues
Ensure Docker is running and PostgreSQL container is up:
```powershell
docker ps
```

You should see `polybuddy-postgres` in the list.

### Fresh Start (Reset Everything)
```powershell
# Stop containers
pnpm docker:down

# Remove volumes (WARNING: This deletes all data)
docker volume rm polybuddy_postgres_data

# Clean dependencies
pnpm clean
Remove-Item -Recurse -Force node_modules
pnpm install

# Restart setup
.\setup.ps1
```

---

## Next Steps

Once the application is running:

1. Open http://localhost:3000 in your browser
2. Explore the market listings
3. Check out the API documentation at http://localhost:3001/docs
4. Optionally run the data ingestion to populate markets

For development details, see [HANDOFF.md](./HANDOFF.md)






