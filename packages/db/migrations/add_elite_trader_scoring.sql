-- Migration: Add Elite Trader Scoring Columns
-- Description: Adds columns for comprehensive trader scoring and classification

-- Add new enum types
DO $$ BEGIN
  CREATE TYPE trader_tier AS ENUM ('elite', 'strong', 'moderate', 'developing', 'limited');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE risk_profile AS ENUM ('conservative', 'moderate', 'aggressive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add elite trader metrics columns to wallet_performance table
ALTER TABLE wallet_performance
ADD COLUMN IF NOT EXISTS profit_factor NUMERIC(10, 4),
ADD COLUMN IF NOT EXISTS sharpe_ratio NUMERIC(10, 4),
ADD COLUMN IF NOT EXISTS max_drawdown NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS gross_profit NUMERIC(18, 2),
ADD COLUMN IF NOT EXISTS gross_loss NUMERIC(18, 2),

-- Consistency metrics
ADD COLUMN IF NOT EXISTS consecutive_wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS consecutive_losses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_win_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_loss_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_holding_time_hours NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS market_timing_score NUMERIC(5, 2),

-- Comprehensive scoring
ADD COLUMN IF NOT EXISTS elite_score NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS trader_tier trader_tier,

-- Specialization
ADD COLUMN IF NOT EXISTS secondary_category TEXT,
ADD COLUMN IF NOT EXISTS risk_profile risk_profile,
ADD COLUMN IF NOT EXISTS category_specialization JSONB,

-- Ranking
ADD COLUMN IF NOT EXISTS elite_rank INTEGER,

-- Timestamps
ADD COLUMN IF NOT EXISTS scored_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_performance_elite_score ON wallet_performance(elite_score DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_performance_trader_tier ON wallet_performance(trader_tier);
CREATE INDEX IF NOT EXISTS idx_wallet_performance_risk_profile ON wallet_performance(risk_profile);
CREATE INDEX IF NOT EXISTS idx_wallet_performance_elite_rank ON wallet_performance(elite_rank);

-- Add comments for documentation
COMMENT ON COLUMN wallet_performance.profit_factor IS 'Gross Profit ÷ Gross Loss - Elite threshold: >2.5';
COMMENT ON COLUMN wallet_performance.sharpe_ratio IS 'Risk-adjusted returns - Elite threshold: >2.0';
COMMENT ON COLUMN wallet_performance.max_drawdown IS 'Maximum loss from peak (%) - Elite threshold: <15%';
COMMENT ON COLUMN wallet_performance.elite_score IS 'Composite score 0-100 based on performance, consistency, experience, and risk';
COMMENT ON COLUMN wallet_performance.trader_tier IS 'Classification: elite(80-100), strong(60-79), moderate(40-59), developing(20-39), limited(0-19)';
COMMENT ON COLUMN wallet_performance.category_specialization IS 'JSON object with category distribution percentages';
COMMENT ON COLUMN wallet_performance.elite_rank IS 'Ranking among elite traders only';
