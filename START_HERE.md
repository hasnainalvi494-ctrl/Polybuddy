# 🚀 START HERE - PolyBuddy Quick Setup

## Current Status: Prerequisites Required

Your system is missing the required software to run PolyBuddy. Follow the steps below to get everything installed.

---

## ⚠️ What You Need to Install (in order)

### 1. Node.js (REQUIRED)
**Status:** ❌ Not Installed  
**What it is:** JavaScript runtime needed to run the application  
**Installation:**
1. Go to: https://nodejs.org/
2. Click **"Download Node.js (LTS)"** - get version 20.x or later
3. Run the downloaded installer (`node-v20.x.x-x64.msi`)
4. Follow the installation wizard (use all default settings)
5. **Restart your terminal/PowerShell** after installation

**Verify it worked:**
```powershell
node --version
# Should show: v20.x.x or higher
```

### 2. Docker Desktop (REQUIRED)
**Status:** ❌ Not Installed  
**What it is:** Container platform needed for the PostgreSQL database  
**Installation:**
1. Go to: https://www.docker.com/products/docker-desktop/
2. Click **"Download for Windows"**
3. Run the downloaded installer
4. Follow the installation wizard
5. **Start Docker Desktop** from the Start Menu after installation
6. Wait for Docker to fully start (whale icon in system tray should be steady, not animated)

**Verify it worked:**
```powershell
docker --version
# Should show: Docker version x.x.x

docker ps
# Should show an empty list (no error)
```

### 3. pnpm (Will auto-install)
**Status:** Will be installed automatically by setup script  
**What it is:** Fast package manager for Node.js  

---

## 🎯 After Installing Node.js and Docker

Once you have Node.js and Docker installed:

### 1. Run the Automated Setup

Open PowerShell in this folder and run:

```powershell
.\setup.ps1
```

This script will:
- ✅ Verify Node.js and Docker are installed
- ✅ Install pnpm automatically
- ✅ Install all project dependencies
- ✅ Create configuration files
- ✅ Start the PostgreSQL database
- ✅ Initialize the database schema

### 2. Start the Application

After setup completes successfully, run:

```powershell
.\start.ps1
```

This will start both the API server and web frontend.

### 3. Open Your Browser

Go to: **http://localhost:3000**

You should see the PolyBuddy web interface!

---

## 📋 Alternative: Manual Setup

If you prefer to run commands manually:

```powershell
# 1. Install pnpm
corepack enable
corepack prepare pnpm@9.15.0 --activate

# 2. Install dependencies
pnpm install

# 3. Create .env file
"DATABASE_URL=postgresql://polybuddy:polybuddy@localhost:5432/polybuddy" | Out-File -FilePath .env -Encoding utf8

# 4. Start database
pnpm docker:up
Start-Sleep -Seconds 5

# 5. Initialize database
$env:DATABASE_URL="postgresql://polybuddy:polybuddy@localhost:5432/polybuddy"
pnpm db:push

# 6. Start API (in one terminal)
$env:DATABASE_URL="postgresql://polybuddy:polybuddy@localhost:5432/polybuddy"
pnpm dev:api

# 7. Start Web (in another terminal)
pnpm dev:web
```

---

## 🆘 Troubleshooting

### "Node.js not found"
- Make sure you installed Node.js from https://nodejs.org/
- Restart your PowerShell/terminal after installation
- Try opening a NEW PowerShell window

### "Docker not found"
- Install Docker Desktop from https://www.docker.com/products/docker-desktop/
- Make sure Docker Desktop is running (check system tray for whale icon)
- Restart PowerShell after installation

### "Docker is not running"
- Open Docker Desktop from the Start Menu
- Wait for it to fully start (whale icon should be steady, not animated)
- Run the setup script again

### PowerShell Execution Policy Error
If you get an error about execution policy, run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Still Having Issues?
See the detailed troubleshooting guide in [INSTALL_GUIDE.md](./INSTALL_GUIDE.md)

---

## 🎓 What is PolyBuddy?

PolyBuddy is a **prediction market analytics platform** for Polymarket that provides:

- 📊 Market analytics and discovery
- 🎯 5 types of retail trading signals
- 👥 Market participation analysis ("Who's in this market")
- 📱 Portfolio tracking and alerts
- 🔔 Price and volume notifications

It's designed to help retail traders compete against more sophisticated participants.

---

## 📚 Additional Resources

- **[INSTALL_GUIDE.md](./INSTALL_GUIDE.md)** - Detailed installation instructions
- **[README.md](./README.md)** - Complete project documentation
- **[HANDOFF.md](./HANDOFF.md)** - Technical details and current status

---

## ✅ Checklist

- [ ] Install Node.js (>= 20.0.0) from https://nodejs.org/
- [ ] Install Docker Desktop from https://www.docker.com/products/docker-desktop/
- [ ] Start Docker Desktop
- [ ] Restart PowerShell
- [ ] Run `.\setup.ps1`
- [ ] Run `.\start.ps1`
- [ ] Open http://localhost:3000 in browser

---

**Ready to get started? Install Node.js and Docker, then run `.\setup.ps1`**


