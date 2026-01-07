# PolyBuddy

> **This is a frozen snapshot (v0).** To continue development, fork or copy this project to a new location. See [HANDOFF.md](./HANDOFF.md) for details.

A prediction market analytics platform that provides retail traders with actionable signals, market insights, and portfolio tracking for Polymarket.

---

## Fresh Laptop Setup (Do This In Order)

### Prerequisites

| Requirement | Version | Check Command | Install |
|-------------|---------|---------------|---------|
| Node.js | >= 20.0.0 | `node --version` | https://nodejs.org/ |
| pnpm | 9.x | `pnpm --version` | See below |
| Docker | Latest | `docker --version` | https://docker.com/get-started |
| Docker Compose | v2+ | `docker compose version` | Included with Docker Desktop |

**Install pnpm (if not installed):**
```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

### Step 1: Install Dependencies

```bash
cd polybuddy
pnpm install
```

### Step 2: Environment Setup

```bash
cp .env.example .env
```

Edit `.env` and add this line:
```
DATABASE_URL=postgresql://polybuddy:polybuddy@localhost:5432/polybuddy
```

### Step 3: Start Database

```bash
pnpm docker:up
```

Wait 5 seconds for PostgreSQL to initialize, then push the schema:

```bash
DATABASE_URL="postgresql://polybuddy:polybuddy@localhost:5432/polybuddy" pnpm db:push
```

### Step 4: Start Development Servers

**IMPORTANT:** Due to a known issue, you must run services in separate terminals with the DATABASE_URL prefix.

**Terminal 1 - API Server:**
```bash
DATABASE_URL="postgresql://polybuddy:polybuddy@localhost:5432/polybuddy" pnpm dev:api
```

**Terminal 2 - Web Frontend:**
```bash
pnpm dev:web
```

### Step 5: Open in Browser

| URL | What You'll See |
|-----|-----------------|
| http://localhost:3000 | PolyBuddy web interface |
| http://localhost:3001/health | API health check (JSON) |
| http://localhost:3001/docs | Swagger API documentation |

### Optional: Load Market Data

In a third terminal:
```bash
DATABASE_URL="postgresql://polybuddy:polybuddy@localhost:5432/polybuddy" pnpm ingestion:start
```

---

## Cursor Setup

### Opening the Project

1. Launch **Cursor IDE**
2. Press `Cmd+O` (Mac) or `Ctrl+O` (Windows/Linux)
3. Navigate to your `polybuddy` folder and click **Open**

### Trust the Workspace

When prompted "Do you trust the authors of the files in this folder?", click **Yes, I trust the authors**.

### Wait for Indexing

Watch the bottom status bar. Cursor will index the codebase for AI features. This takes 1-2 minutes on first open.

### Open Integrated Terminal

Press `` Ctrl+` `` (backtick) or `Cmd+J` to open the terminal panel.

### Run Commands

In the integrated terminal, run the setup commands from above:
```bash
pnpm install
cp .env.example .env
# Edit .env with your editor
pnpm docker:up
DATABASE_URL="postgresql://polybuddy:polybuddy@localhost:5432/polybuddy" pnpm db:push
```

Then open two terminal tabs (click the + icon in terminal panel):
- Tab 1: `DATABASE_URL="postgresql://polybuddy:polybuddy@localhost:5432/polybuddy" pnpm dev:api`
- Tab 2: `pnpm dev:web`

### AI Chat Tips

- Reference files with `@filename.ts`
- Ask "Explain this code" on unfamiliar patterns
- Use `@codebase` to search across all files

---

## Local Development Endpoints

| Service | URL | Description |
|---------|-----|-------------|
| Web Frontend | http://localhost:3000 | Next.js React application |
| API Server | http://localhost:3001 | Fastify REST API |
| API Documentation | http://localhost:3001/docs | Swagger/OpenAPI UI |
| Health Check | http://localhost:3001/health | API health endpoint |
| PostgreSQL | localhost:5432 | Database (via Docker) |

### Changing Ports

**API Port:** Set the `PORT` environment variable:
```bash
PORT=4001 DATABASE_URL="..." pnpm dev:api
```

**Web Port:** Use the `-p` flag:
```bash
pnpm dev:web -- -p 3002
```

**PostgreSQL Port:** Edit `.env`:
```env
POSTGRES_PORT=5433
DATABASE_URL=postgresql://polybuddy:polybuddy@localhost:5433/polybuddy
```
Then restart Docker: `pnpm docker:down && pnpm docker:up`

---

## Project Structure

```
polybuddy/
├── apps/
│   ├── api/              # Fastify API server (port 3001)
│   └── web/              # Next.js 14 frontend (port 3000)
├── packages/
│   ├── analytics/        # Signal computation library
│   ├── db/               # Drizzle ORM + PostgreSQL schema
│   └── ingestion/        # Market data ingestion worker
├── docker-compose.yml    # PostgreSQL container
├── turbo.json            # Turborepo configuration
├── pnpm-workspace.yaml   # pnpm workspace config
└── pnpm-lock.yaml        # Lock file (DO NOT DELETE)
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm dev:api` | Start API server only |
| `pnpm dev:web` | Start web frontend only |
| `pnpm dev:ingestion` | Start ingestion worker only |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm lint` | ESLint all packages |
| `pnpm clean` | Remove all build artifacts and node_modules |
| `pnpm docker:up` | Start PostgreSQL |
| `pnpm docker:down` | Stop PostgreSQL |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Drizzle Studio (database browser) |
| `pnpm ingestion:start` | Run data ingestion (one-time) |

---

## Database Commands

All database commands require the DATABASE_URL prefix:

```bash
# Start PostgreSQL container
pnpm docker:up

# Stop PostgreSQL container
pnpm docker:down

# Push schema changes to database
DATABASE_URL="postgresql://polybuddy:polybuddy@localhost:5432/polybuddy" pnpm db:push

# Open Drizzle Studio (database browser)
DATABASE_URL="postgresql://polybuddy:polybuddy@localhost:5432/polybuddy" pnpm db:studio
```

---

## API Reference

Base URL: `http://localhost:3001/api`

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/markets` | List markets with filtering/sorting |
| GET | `/markets/:id` | Get market details |
| GET | `/markets/:id/participation` | Get participation structure |
| GET | `/signals` | List all signals |
| GET | `/retail-signals/*` | Retail signal endpoints |
| GET | `/watchlists` | List watchlists |
| GET | `/portfolio` | Portfolio summary |

Query parameters for `/markets`:
- `limit` (default: 20, max: 100)
- `offset` (default: 0)
- `sortBy` - `volume`, `quality`, `endDate`, `createdAt`
- `sortOrder` - `asc` or `desc`
- `category` - Filter by category
- `search` - Text search in question

---

## Features

### Market Analytics
- **Market Listings** - Browse and search prediction markets with real-time data
- **Behavior Clustering** - Markets categorized by 5 behavioral dimensions into 6 cluster types
- **Participation Structure** - "Who's In This Market" analysis showing trader composition

### Trading Signals
- **Retail Signals** - 5 specialized signal types for retail traders
- **Flow Guard** - Warns about pro-dominant or historically noisy markets

### Portfolio & Tracking
- **Watchlists** - Create and manage market watchlists
- **Portfolio Tracking** - Track positions and performance
- **Price Alerts** - Set alerts for price movements

---

## Tech Stack

- **Frontend**: Next.js 14, React 18, TailwindCSS, React Query
- **Backend**: Fastify, TypeScript, Zod validation
- **Database**: PostgreSQL 16 with Drizzle ORM
- **Build**: Turborepo, pnpm workspaces
- **Testing**: Vitest (configured, no tests written yet)

---

## Troubleshooting

### "DATABASE_URL environment variable is required"

This error means the DATABASE_URL wasn't passed to the subprocess. Always use the prefix:
```bash
DATABASE_URL="postgresql://polybuddy:polybuddy@localhost:5432/polybuddy" pnpm dev:api
```

### Port Already in Use

Check what's using the port:
```bash
lsof -i:3000
lsof -i:3001
```

Kill the process with `kill -9 <PID>` or use a different port.

### Docker PostgreSQL Won't Start

```bash
# Check container status
docker ps -a

# View logs
docker logs polybuddy-postgres

# Nuclear option: remove and recreate
pnpm docker:down
docker volume rm polybuddy_postgres_data
pnpm docker:up
```

### pnpm Not Found

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

### Fresh Start (Reset Everything)

```bash
pnpm clean
rm -rf node_modules
pnpm install
```

---

## Additional Documentation

- **HANDOFF.md** - Project context, known issues, transfer instructions
- **.env.example** - All environment variables with documentation

---

## License

Private - All rights reserved
