-- SAFE Database Cleanup for PolyBuddy
-- Copy and paste this into Railway PostgreSQL Query tab

-- Step 1: Check what's taking space
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.' || tablename) DESC
LIMIT 20;
