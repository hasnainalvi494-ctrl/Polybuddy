-- Clean up invalid UUID entries in whale_activity table
-- These were created with non-UUID strings like 'gamma-540215-1'

-- Delete invalid whale activity entries (those that can't be cast to UUID)
DELETE FROM whale_activity 
WHERE id::text NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

-- Note: This will only delete entries with malformed UUIDs
-- Valid UUIDs will be preserved
