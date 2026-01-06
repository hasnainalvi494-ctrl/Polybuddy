# PolyBuddy

A prediction market analytics platform that provides retail traders with actionable signals, market insights, and portfolio tracking.

## Features

### Market Analytics
- **Market Listings** - Browse and search prediction markets with real-time data
- **Behavior Clustering** - Markets categorized by 5 behavioral dimensions into 6 cluster types
- **Public Flow Context** - On-chain activity, large wallet movements, volume analysis

### Trading Signals
- **Retail Signals** - 5 specialized signal types for retail traders:
  - Favorable Structure - Markets with beneficial odds structure
  - Structural Mispricing - Detectable pricing inefficiencies
  - Crowd Chasing - Momentum-driven opportunities
  - Event Window - Time-sensitive market events
  - Retail Friendliness - Markets suited for retail participation
- **Original Signals** - 5 additional core signal types

### Portfolio & Tracking
- **Watchlists** - Create and manage market watchlists
- **Portfolio Tracking** - Track positions and performance
- **Price Alerts** - Set alerts for price movements with notifications

### Reports & Insights
- **Weekly Coaching Reports** - Automated performance analysis
- **Market Activity** - Volume spikes, whale movements, participation trends

## Architecture

```
polybuddy/
├── apps/
│   ├── api/          # Fastify API server (port 3001)
│   └── web/          # Next.js 14 frontend (port 3000)
├── packages/
│   ├── analytics/    # Signal computation library
│   ├── db/           # Drizzle ORM + PostgreSQL
│   └── ingestion/    # Market data ingestion service
```

## Tech Stack

- **Frontend**: Next.js 14, React 18, TailwindCSS, React Query
- **Backend**: Fastify, TypeScript, Zod validation
- **Database**: PostgreSQL with Drizzle ORM
- **Testing**: Vitest
- **Build**: Turborepo, pnpm workspaces

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm 9.x
- Docker (for PostgreSQL)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd polybuddy

# Install dependencies
pnpm install

# Start PostgreSQL
pnpm docker:up

# Push database schema
DATABASE_URL="postgresql://polybuddy:polybuddy@localhost:5432/polybuddy" pnpm db:push

# Run data ingestion (optional)
DATABASE_URL="postgresql://polybuddy:polybuddy@localhost:5432/polybuddy" pnpm ingestion:start
```

### Development

```bash
# Start all services
pnpm dev

# Or run individually:
# API server (port 3001)
DATABASE_URL="postgresql://polybuddy:polybuddy@localhost:5432/polybuddy" pnpm --filter @polybuddy/api dev

# Web frontend (port 3000)
pnpm --filter @polybuddy/web dev
```

### Environment Variables

Create a `.env` file in the root:

```env
DATABASE_URL=postgresql://polybuddy:polybuddy@localhost:5432/polybuddy
```

## API Reference

Base URL: `http://localhost:3001/api`

### Markets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/markets` | List markets with filtering/sorting |
| GET | `/markets/:id` | Get market details with behavior cluster |
| POST | `/markets/:id/compute-cluster` | Compute behavior dimensions |
| GET | `/markets/:id/context` | Get public flow context |

Query parameters for `/markets`:
- `limit` - Results per page (default: 20)
- `offset` - Pagination offset
- `sortBy` - Sort field: `created`, `end_date`, `volume`, `liquidity`
- `sortOrder` - `asc` or `desc`
- `category` - Filter by category
- `search` - Text search

### Signals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/signals` | List all signals |
| GET | `/signals/:type` | Get signals by type |
| GET | `/retail-signals/favorable-structure` | Favorable structure signals |
| GET | `/retail-signals/structural-mispricing` | Mispricing signals |
| GET | `/retail-signals/crowd-chasing` | Momentum signals |
| GET | `/retail-signals/event-window` | Event window signals |
| GET | `/retail-signals/retail-friendliness` | Retail-friendly signals |

### Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/alerts` | List user alerts |
| POST | `/alerts` | Create new alert |
| DELETE | `/alerts/:id` | Delete alert |
| GET | `/alerts/notifications` | Get alert notifications |

### Watchlists

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/watchlists` | List user watchlists |
| POST | `/watchlists` | Create watchlist |
| PUT | `/watchlists/:id` | Update watchlist |
| DELETE | `/watchlists/:id` | Delete watchlist |
| POST | `/watchlists/:id/markets` | Add market to watchlist |

### Portfolio

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/portfolio` | Get portfolio summary |
| GET | `/portfolio/positions` | List positions |
| POST | `/portfolio/positions` | Add position |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports` | List weekly reports |
| GET | `/reports/:id` | Get report details |

## Market Behavior Clustering

Markets are analyzed across 5 dimensions:

1. **Info Cadence** - Frequency of information updates
2. **Info Structure** - How information flows (discrete events vs continuous)
3. **Liquidity Stability** - Consistency of market liquidity
4. **Time to Resolution** - Duration until market resolves
5. **Participant Concentration** - Distribution of market participants

These map to 6 cluster types:
- `scheduled_event` - Sports, elections with known dates
- `continuous_info` - Markets with ongoing information flow
- `binary_catalyst` - Single event determines outcome
- `high_volatility` - Volatile price action
- `long_duration` - Extended time horizons
- `sports_scheduled` - Sports with scheduled game times

## Scripts

```bash
pnpm build          # Build all packages
pnpm dev            # Start development servers
pnpm test           # Run tests
pnpm typecheck      # TypeScript checks
pnpm lint           # Lint all packages
pnpm clean          # Clean build artifacts

# Database
pnpm db:push        # Push schema changes
pnpm db:studio      # Open Drizzle Studio

# Docker
pnpm docker:up      # Start PostgreSQL
pnpm docker:down    # Stop PostgreSQL

# Ingestion
pnpm ingestion:start  # Run data ingestion
```

## License

Private - All rights reserved
