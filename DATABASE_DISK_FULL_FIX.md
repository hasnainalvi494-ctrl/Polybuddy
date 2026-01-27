# 🚨 CRITICAL: DATABASE DISK FULL - IMMEDIATE ACTION REQUIRED

## The Problem

Your Railway PostgreSQL database has **run out of disk space**. This is causing:
- ✗ API crashes on every request
- ✗ Database unable to write temporary files
- ✗ All queries failing with "No space left on device"
- ✗ Frontend shows no data

## Root Cause

**`market_snapshots` table has grown too large**

Your sync jobs create new snapshots every 5 minutes, but **nothing deletes old data**. After weeks of running, you now have hundreds of thousands (or millions) of snapshots filling your disk.

## IMMEDIATE FIX (Do This NOW!)

### Step 1: Access Railway PostgreSQL

1. Go to Railway dashboard: https://railway.app/
2. Click on **polybuddy-db** (your database service)
3. Click on **Data** tab OR **Query** tab
4. You'll see a SQL query interface

### Step 2: Run Emergency Cleanup

Copy and paste this SQL into Railway's query interface:

```sql
-- Delete all snapshots older than 7 days
DELETE FROM market_snapshots 
WHERE snapshot_at < NOW() - INTERVAL '7 days';

-- Keep only 1 snapshot per market per hour (for recent data)
DELETE FROM market_snapshots ms1
WHERE snapshot_at < NOW() - INTERVAL '1 day'
AND EXISTS (
  SELECT 1 FROM market_snapshots ms2
  WHERE ms2.market_id = ms1.market_id
  AND DATE_TRUNC('hour', ms2.snapshot_at) = DATE_TRUNC('hour', ms1.snapshot_at)
  AND ms2.snapshot_at > ms1.snapshot_at
);

-- Reclaim disk space
VACUUM FULL market_snapshots;
```

**WARNING**: This will delete old historical data, but it's necessary to get your app running again.

### Step 3: Verify Space Freed

Run this to check results:

```sql
-- Check table size
SELECT pg_size_pretty(pg_total_relation_size('market_snapshots')) AS size;

-- Check row count
SELECT COUNT(*) FROM market_snapshots;
```

### Step 4: Restart Railway API

1. Go to **polybuddy-api** service in Railway
2. Click **Redeploy** (or it may auto-restart)
3. Wait 2-3 minutes for deployment

### Step 5: Test API

```bash
# Should now respond successfully
curl https://polybuddy-api-production.up.railway.app/health
```

## Long-Term Fix (Already Coded!)

I've added an **automatic cleanup job** that will:
- ✅ Run daily
- ✅ Delete snapshots older than 7 days
- ✅ Keep only 1 snapshot per hour for older data
- ✅ Prevent disk space issues in the future

**The fix is in these files:**
- `apps/api/src/jobs/cleanup-snapshots.ts` - Cleanup job
- `apps/api/src/index.ts` - Scheduled to run daily

**Push these changes after fixing the immediate crisis!**

## Why This Happened

Your `market_snapshots` table was capturing data like this:
- 100 markets × 12 snapshots/hour × 24 hours × 30 days = **864,000 snapshots/month**
- Each snapshot stores price, volume, liquidity data
- No cleanup = infinite growth = disk full

## Railway Storage Limits

**Free/Hobby Plan**: 1-5 GB disk space
**Your snapshots**: Likely exceeded this limit

## Alternative: Upgrade Railway Storage

If you need more historical data:
1. Go to Railway settings
2. Upgrade to a paid plan with more storage
3. Or keep current cleanup schedule (7 days is plenty for a trading app)

## What to Expect After Fix

✅ API will start responding
✅ Frontend will load data
✅ Claude AI will work (if key is set)
✅ Daily cleanup prevents future issues
✅ Only 7 days of snapshot history (sufficient for price charts)

---

## DO THIS NOW:

1. ✅ Run the SQL cleanup in Railway database
2. ✅ Wait for API to restart
3. ✅ Test API endpoint
4. ✅ Push cleanup job code (already committed locally)
5. ✅ Monitor disk space weekly

**Time to fix**: 5-10 minutes
**Urgency**: CRITICAL - Your app is completely down
