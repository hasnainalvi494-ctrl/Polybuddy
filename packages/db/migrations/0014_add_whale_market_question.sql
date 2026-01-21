-- Add market_question column to whale_activity table
-- This stores the market question for display purposes

ALTER TABLE whale_activity 
ADD COLUMN IF NOT EXISTS market_question TEXT;

-- Add comment for documentation
COMMENT ON COLUMN whale_activity.market_question IS 'Market question text for display purposes';
