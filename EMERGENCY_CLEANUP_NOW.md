# 🚨 EMERGENCY DATABASE CLEANUP - DO THIS NOW

## Current Status: API DOWN ❌

Your Railway API is **completely down** because the database disk is full.

## Step 1: Clean Database (2 minutes)

### Open Railway Dashboard:
1. Go to https://railway.app/
2. Login to your account
3. Find your **PolyBuddy** project
4. Click on **polybuddy-db** service

### Run Cleanup SQL:
1. Click the **"Query"** tab (or **"Data"** tab)
2. Copy and paste this SQL:

```sql
-- Delete old snapshots (frees up 90% of space)
DELETE FROM market_snapshots 
WHERE snapshot_at < NOW() - INTERVAL '7 days';

-- Verify cleanup worked
SELECT COUNT(*) as remaining_snapshots FROM market_snapshots;
SELECT pg_size_pretty(pg_total_relation_size('market_snapshots')) AS table_size;
```

3. Click **"Run"** or **"Execute"**
4. Wait 1-2 minutes for the query to complete

### Expected Results:
- Before: 500K+ snapshots, 3-5 GB
- After: ~50K snapshots, 200-500 MB
- ✅ Disk space freed up!

---

## Step 2: Restart API (Automatic)

Railway will automatically restart your API once the database query completes.

**Wait 2-3 minutes**, then continue to Step 3.

---

## Step 3: Test API (I'll do this)

Once you've run the SQL cleanup, tell me and I'll test the API to verify it's working.

---

## What Happens Next?

Once the API is back online:
- ✅ Frontend will load data
- ✅ All endpoints will respond
- ✅ Automated cleanup job prevents this from happening again

The cleanup job I coded earlier will run daily and keep only 7 days of snapshots, so this won't happen again.

---

## 🆘 If Query Fails or Takes Too Long

If the DELETE query times out or fails:

### Plan B - More Aggressive Cleanup:
```sql
-- Keep only last 3 days
DELETE FROM market_snapshots 
WHERE snapshot_at < NOW() - INTERVAL '3 days';
```

### Plan C - Nuclear Option (if desperate):
```sql
-- Keep only last 24 hours
DELETE FROM market_snapshots 
WHERE snapshot_at < NOW() - INTERVAL '1 day';
```

This removes all historical data but gets you running ASAP.

---

## After It's Working

We'll then move on to:
- Adding Claude API key (for real AI analysis)
- Optimizing sync jobs (prevent future issues)
- Adding monitoring (catch problems early)

But first, **run that SQL query in Railway now!**

Let me know once you've done it and I'll test the API.
