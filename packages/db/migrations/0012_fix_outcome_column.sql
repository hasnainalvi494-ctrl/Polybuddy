-- Fix schema mismatch: rename 'outcomes' to 'outcome' in markets table
-- This aligns the database with the TypeScript schema definition

-- Check if 'outcomes' column exists (plural) and rename it to 'outcome' (singular)
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

-- Ensure the outcome column exists (in case it's completely missing)
ALTER TABLE markets 
ADD COLUMN IF NOT EXISTS outcome VARCHAR(50);

COMMENT ON COLUMN markets.outcome IS 'Final outcome of the market (for resolved markets)';
