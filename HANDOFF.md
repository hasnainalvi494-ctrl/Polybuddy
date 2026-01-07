# PolyBuddy Handoff Document

> **FROZEN SNAPSHOT (v0)** — January 2026
>
> This repo is a frozen snapshot. **Do not modify it; fork/copy to continue.**
>
> PRODUCT_SPEC_future.md is aspirational and non-authoritative; HANDOFF.md + code are ground truth.

---

## Using This Project With ChatGPT / Cursor

When working with an AI assistant on this project, use this prompt:

> I am setting up a forked continuation of a frozen Polymarket bot project.
>
> I have:
> - A zipped reference repository
> - A file called HANDOFF.md (authoritative snapshot)
> - A file called PRODUCT_SPEC_future.md (non-authoritative product vision)
>
> I am working in Cursor.
>
> Please:
> 1. Read HANDOFF.md first and treat it as ground truth
> 2. Use PRODUCT_SPEC_future.md only for future planning
> 3. Help me verify local setup
> 4. Help me safely extend the project in a new fork without modifying the original snapshot

---

## Local Setup & Verification

### Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | >= 20.0.0 | `node --version` |
| pnpm | 9.x | `pnpm --version` |
| Docker | Latest | `docker --version` |

### Option A: Edit .env file (recommended)

```bash
pnpm install
cp .env.example .env
# Edit .env and set:
# DATABASE_URL=postgresql://polybuddy:polybuddy@localhost:5432/polybuddy
pnpm docker:up
pnpm db:push
pnpm dev:api   # Terminal 1
pnpm dev:web   # Terminal 2
```

### Option B: Inline DATABASE_URL override

```bash
pnpm install
pnpm docker:up
DATABASE_URL="postgresql://polybuddy:polybuddy@localhost:5432/polybuddy" pnpm db:push
DATABASE_URL="postgresql://polybuddy:polybuddy@localhost:5432/polybuddy" pnpm dev:api
pnpm dev:web
```

### Verify

| URL | Expected |
|-----|----------|
| http://localhost:3000 | Web UI |
| http://localhost:3001/health | `{"status":"ok",...}` |
| http://localhost:3001/docs | Swagger UI |

---

## Zip Recommendation

Remove `node_modules` before zipping to reduce size (~500MB savings).

**Exclude from zip:** `.env`, `.git`, `.next`, `.turbo`, `node_modules`, `.DS_Store`

```bash
rm -rf node_modules
zip -r polybuddy-v0.zip polybuddy \
  -x "*.DS_Store" \
  -x "polybuddy/.env" \
  -x "polybuddy/.git/*" \
  -x "polybuddy/.next/*" \
  -x "polybuddy/.turbo/*" \
  -x "polybuddy/node_modules/*"
```

---

## Create New GitHub Repo (Recipient)

```bash
unzip polybuddy-v0.zip -d polybuddy-new
cd polybuddy-new/polybuddy
rm -rf .git
git init
git add .
git commit -m "Initial commit (forked from polybuddy v0 snapshot)"
git branch -M main
# Create an empty repo on GitHub, then:
git remote add origin <url>
git push -u origin main
```

---

## Project Structure

```
polybuddy/
├── apps/
│   ├── api/          # Fastify REST API (port 3001)
│   └── web/          # Next.js frontend (port 3000)
├── packages/
│   ├── analytics/    # Signal computation
│   ├── db/           # Drizzle ORM + PostgreSQL
│   └── ingestion/    # Market data sync
├── docker-compose.yml
├── pnpm-lock.yaml
└── .env.example
```

---

## Current State (v0)

| Feature | Status |
|---------|--------|
| Market Listings | Working |
| Market Detail | Working |
| Participation Structure | Working (heuristic) |
| Retail Signals | Working (5 types) |
| Watchlists | Working |
| Alerts | Working |
| Portfolio | Partial |
| Auth | Stubbed |
| Tests | None written |

---

## Key Limitations

1. **Participation Structure** — Uses volume heuristics, not wallet data
2. **No tests** — Vitest configured but zero coverage
3. **Auth stubbed** — No real user sessions
4. **Reports** — Routes exist but return mock data

---

## Environment Variables

See `.env.example`. Required:

| Variable | Description |
|----------|-------------|
| DATABASE_URL | PostgreSQL connection string |

---

*HANDOFF.md = authoritative. PRODUCT_SPEC_future.md = aspirational.*
