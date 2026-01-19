-- PolyBuddy Database Cleanup Script
-- Run this in Railway PostgreSQL Query tab to reduce storage usage

-- ============================================
-- 1. DELETE EXPIRED/OLD SIGNALS (biggest space saver)
-- ============================================

-- Delete expired best bet signals (older than 7 days)
DELETE FROM best_bet_signals 
WHERE expires_at < NOW() - INTERVAL '7 days'
   OR created_at < NOW() - INTERVAL '30 days';

-- Keep only the latest 500 signals
DELETE FROM best_bet_signals 
WHERE id NOT IN (
    SELECT id FROM best_bet_signals 
    ORDER BY created_at DESC 
    LIMIT 500
);

-- ============================================
-- 2. CLEAN UP WHALE ACTIVITY (if table exists)
-- ============================================

-- Delete old whale activity (keep only last 7 days)
DELETE FROM whale_activity 
WHERE timestamp < NOW() - INTERVAL '7 days'
   OR created_at < NOW() - INTERVAL '7 days';

-- Keep only latest 1000 whale activities
DELETE FROM whale_activity 
WHERE id NOT IN (
    SELECT id FROM whale_activity 
    ORDER BY timestamp DESC 
    LIMIT 1000
);

-- ============================================
-- 3. CLEAN UP WALLET TRADES (if table exists)  
-- ============================================

-- Delete old wallet trades (keep only last 30 days)
DELETE FROM wallet_trades 
WHERE created_at < NOW() - INTERVAL '30 days';

-- Keep only latest 5000 trades
DELETE FROM wallet_trades 
WHERE id NOT IN (
    SELECT id FROM wallet_trades 
    ORDER BY created_at DESC 
    LIMIT 5000
);

-- ============================================
-- 4. CLEAN UP MARKET SNAPSHOTS
-- ============================================

-- Delete old market snapshots (keep only last 7 days)
DELETE FROM market_snapshots 
WHERE snapshot_at < NOW() - INTERVAL '7 days';

-- ============================================
-- 5. CLEAN UP OLD NOTIFICATIONS
-- ============================================

-- Delete old notifications (keep only last 30 days)
DELETE FROM notifications 
WHERE created_at < NOW() - INTERVAL '30 days';

-- Delete read notifications older than 7 days
DELETE FROM notifications 
WHERE read = true AND created_at < NOW() - INTERVAL '7 days';

-- ============================================
-- 6. CLEAN UP OLD ALERTS HISTORY
-- ============================================

DELETE FROM alert_history 
WHERE created_at < NOW() - INTERVAL '30 days';

-- ============================================
-- 7. TRUNCATE UNUSED/EMPTY TABLES
-- ============================================

-- These tables might be empty but taking space
-- Uncomment if you want to completely clear them:

-- TRUNCATE TABLE wallet_trades;
-- TRUNCATE TABLE whale_activity;
-- TRUNCATE TABLE alert_history;

-- ============================================
-- 8. RECLAIM DISK SPACE
-- ============================================

-- This is VERY important - actually frees up the space
VACUUM FULL;

-- ============================================
-- 9. CHECK CURRENT TABLE SIZES
-- ============================================

SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) AS table_size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
