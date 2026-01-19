# 🚨 Critical Fix: Schema Mismatch Errors

## Problem
Railway logs showing:
```
PostgresError: column "outcome" does not exist
hint: 'Perhaps you meant to reference the column "markets.outcomes".'
```

## Root Cause
**Schema drift** between code and database:
- **Database has**: `markets.outcomes` (plural)
- **Code expects**: `markets.outcome` (singular)

This happens when the database was created with an older migration or schema.

## Fix

### Step 1: Run Migration to Fix Column Name

Connect to your Railway Postgres and run:

```bash
# Option A: Using Railway CLI
railway run psql -f packages/db/migrations/0012_fix_outcome_column.sql

# Option B: Using psql directly
psql $DATABASE_URL -f packages/db/migrations/0012_fix_outcome_column.sql

# Option C: Copy-paste the SQL manually in Railway dashboard SQL console
```

Or manually run this SQL:

```sql
-- Fix schema mismatch: rename 'outcomes' to 'outcome'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'markets' 
        AND column_name = 'outcomes'
    ) THEN
        ALTER TABLE markets RENAME COLUMN outcomes TO outcome;
        RAISE NOTICE 'Renamed markets.outcomes to markets.outcome';
    ELSE
        RAISE NOTICE 'Column markets.outcomes does not exist, skipping rename';
    END IF;
END $$;

-- Ensure the outcome column exists
ALTER TABLE markets 
ADD COLUMN IF NOT EXISTS outcome VARCHAR(50);
```

### Step 2: Verify Fix

After running the migration, check:

```sql
-- Should show 'outcome' not 'outcomes'
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'markets' 
AND column_name LIKE 'outcome%';
```

### Step 3: Redeploy

Once the column is renamed, Railway will auto-redeploy and the errors should stop.

## Prevention

To prevent schema drift:

1. **Always use migrations** - Don't manually modify database schema
2. **Run `pnpm db:push`** before deploying - Ensures schema is in sync
3. **Use `pnpm db:generate`** - Generates migrations from schema changes
4. **Test locally first** - Run migrations locally before production

## Quick Commands

```bash
# Generate migration from schema changes
cd packages/db
pnpm drizzle-kit generate:pg

# Push schema to database
pnpm drizzle-kit push:pg

# Check current schema
pnpm drizzle-kit introspect:pg
```

## Impact

After this fix:
- ✅ Market sync will work
- ✅ No more "column does not exist" errors
- ✅ Background jobs will complete successfully
- ✅ Frontend will receive market data

## Other Potential Schema Issues

If you see similar errors for other columns, you may need to:

1. Check if your production database schema matches `packages/db/src/schema/index.ts`
2. Run all pending migrations in order
3. Consider doing a fresh schema push: `pnpm db:push --force`

⚠️ **Warning**: `--force` will drop and recreate tables, losing data. Only use in development or with backups!
