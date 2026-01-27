-- ============================================================================
-- EMERGENCY DATABASE CLEANUP - FREE UP DISK SPACE
-- ============================================================================
-- Run this SQL directly in Railway PostgreSQL database

-- Step 1: Check current database size
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- Step 2: Check market_snapshots count
SELECT COUNT(*) as total_snapshots FROM market_snapshots;

-- Step 3: Keep only last 7 days of snapshots (DELETE OLD DATA)
-- WARNING: This will permanently delete old snapshot history
-- Keep only 1 week of data to free up space
DELETE FROM market_snapshots 
WHERE snapshot_at < NOW() - INTERVAL '7 days';

-- Step 4: Keep only latest snapshot per market per day (for older data)
-- This keeps historical trends but reduces storage significantly
DELETE FROM market_snapshots ms1
WHERE snapshot_at < NOW() - INTERVAL '7 days'
AND EXISTS (
  SELECT 1 FROM market_snapshots ms2
  WHERE ms2.market_id = ms1.market_id
  AND DATE(ms2.snapshot_at) = DATE(ms1.snapshot_at)
  AND ms2.snapshot_at > ms1.snapshot_at
);

-- Step 5: Vacuum to reclaim disk space
VACUUM FULL market_snapshots;
ANALYZE market_snapshots;

-- Step 6: Verify cleanup
SELECT COUNT(*) as remaining_snapshots FROM market_snapshots;
SELECT pg_size_pretty(pg_total_relation_size('market_snapshots')) AS table_size;
