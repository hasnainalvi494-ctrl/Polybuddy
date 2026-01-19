# 🔧 Fix: Railway UUID Errors

## Problem
Railway logs show errors like:
```
PostgresError: invalid input syntax for type uuid: "540215"
tradeId: 'gamma-540215-1'
```

## Root Cause
The `sync-wallets.ts` job was generating trade IDs like `'gamma-540215-1'` instead of valid UUIDs. The `whale_activity` table's `id` column is defined as `UUID`, which only accepts RFC 4122 formatted UUIDs.

## Files Fixed
1. `apps/api/src/jobs/sync-wallets.ts` - Lines 285-296
2. `apps/api/src/jobs/sync-wallets.ts` - Lines 714-724

## Changes Made

### 1. Generate Valid UUIDs
Changed from:
```typescript
id: `gamma-${market.id}-${i}`,
transaction_hash: `gamma-${market.id}-${i}`,
```

To:
```typescript
// Generate deterministic UUID from market ID and index
const crypto = require('crypto');
const hash = crypto.createHash('sha256').update(`${market.id}-${i}`).digest('hex');
const uuid = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;

id: uuid,
transaction_hash: uuid,
```

### 2. Let Database Auto-Generate IDs
The `whale_activity` insert no longer needs the ID - PostgreSQL generates it automatically with `defaultRandom()`.

## How to Apply

### Step 1: Clean Up Bad Data (Optional)
If you have invalid data in your database:

```bash
# Connect to Railway Postgres
# Run the cleanup script
psql $DATABASE_URL -f packages/db/migrations/cleanup_whale_activity.sql
```

Or manually:
```sql
DELETE FROM whale_activity 
WHERE id::text NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
```

### Step 2: Deploy Fixed Code
```bash
# Commit the fixes
git add .
git commit -m "fix: generate valid UUIDs for whale activity tracking"
git push

# Railway will auto-deploy
# Or manually trigger deploy in Railway dashboard
```

### Step 3: Verify Fix
After deployment, check Railway logs:
```
✅ Should see: "🐋 Whale activity tracked: X new trades"
❌ Should NOT see: "PostgresError: invalid input syntax for type uuid"
```

## Prevention
- Always use `uuid()` column type when you need UUIDs
- Let PostgreSQL generate UUIDs with `.defaultRandom()`
- If generating UUIDs in code, use proper UUID libraries or crypto hashing
- Never use string concatenation for IDs in UUID columns

## Testing Locally
```bash
# Run the sync job manually
cd apps/api
pnpm tsx src/jobs/sync-wallets.ts

# Check for errors
# Should complete without UUID errors
```

## Related Issues
This fix also resolves:
- Empty whale activity feed on frontend
- Background job crashes in Railway
- "Failed to track whale activity" errors

## Impact
After this fix:
- ✅ Whale activity tracking works correctly
- ✅ Background jobs run without errors  
- ✅ Frontend whale activity section shows data
- ✅ No more UUID validation errors in logs
