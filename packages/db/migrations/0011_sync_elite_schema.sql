-- Migration: Sync Elite Trader and Best Bets Schema
-- This migration ensures all required columns and tables exist for the elite trader
-- and best bets functionality.

-- ============================================================================
-- 1. Add missing columns to wallet_performance table
-- ============================================================================

-- Elite Score and Tier columns
ALTER TABLE wallet_performance
ADD COLUMN IF NOT EXISTS elite_score NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS trader_tier TEXT,
ADD COLUMN IF NOT EXISTS risk_profile TEXT;

-- Advanced Performance Metrics
ALTER TABLE wallet_performance
ADD COLUMN IF NOT EXISTS profit_factor NUMERIC(10, 4),
ADD COLUMN IF NOT EXISTS sharpe_ratio NUMERIC(10, 4),
ADD COLUMN IF NOT EXISTS max_drawdown NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS gross_profit NUMERIC(18, 2),
ADD COLUMN IF NOT EXISTS gross_loss NUMERIC(18, 2);

-- Consistency Metrics
ALTER TABLE wallet_performance
ADD COLUMN IF NOT EXISTS consecutive_wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS consecutive_losses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_win_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_loss_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_holding_time_hours NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS market_timing_score NUMERIC(5, 2);

-- Specialization
ALTER TABLE wallet_performance
ADD COLUMN IF NOT EXISTS secondary_category TEXT,
ADD COLUMN IF NOT EXISTS category_specialization JSONB;

-- Elite Ranking
ALTER TABLE wallet_performance
ADD COLUMN IF NOT EXISTS elite_rank INTEGER,
ADD COLUMN IF NOT EXISTS scored_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_performance_elite_score ON wallet_performance(elite_score DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_performance_trader_tier ON wallet_performance(trader_tier);
CREATE INDEX IF NOT EXISTS idx_wallet_performance_risk_profile ON wallet_performance(risk_profile);
CREATE INDEX IF NOT EXISTS idx_wallet_performance_elite_rank ON wallet_performance(elite_rank);

-- ============================================================================
-- 2. Create best_bet_signals table if not exists
-- ============================================================================

CREATE TABLE IF NOT EXISTS best_bet_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL REFERENCES markets(id),
    trader_address TEXT NOT NULL,
    
    -- Signal Metadata
    confidence NUMERIC(5, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    signal_strength TEXT NOT NULL CHECK (signal_strength IN ('elite', 'strong', 'moderate', 'weak')),
    
    -- Trading Parameters
    entry_price NUMERIC(10, 4) NOT NULL,
    target_price NUMERIC(10, 4),
    stop_loss NUMERIC(10, 4),
    position_size NUMERIC(18, 2),
    
    -- Risk Management
    risk_reward_ratio NUMERIC(10, 2),
    kelly_criterion NUMERIC(5, 4),
    max_position_size NUMERIC(18, 2),
    
    -- Trader Metrics (snapshot at signal time)
    trader_win_rate NUMERIC(5, 2),
    trader_profit_history NUMERIC(18, 2),
    trader_elite_score NUMERIC(5, 2),
    trader_sharpe_ratio NUMERIC(10, 4),
    
    -- Signal Details
    reasoning JSONB,
    time_horizon TEXT,
    outcome TEXT CHECK (outcome IN ('yes', 'no')),
    
    -- Metadata
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'executed', 'expired', 'cancelled')),
    
    -- Performance Tracking
    actual_outcome TEXT,
    actual_profit NUMERIC(18, 2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for best_bet_signals
CREATE INDEX IF NOT EXISTS idx_best_bet_signals_market ON best_bet_signals(market_id);
CREATE INDEX IF NOT EXISTS idx_best_bet_signals_trader ON best_bet_signals(trader_address);
CREATE INDEX IF NOT EXISTS idx_best_bet_signals_strength ON best_bet_signals(signal_strength);
CREATE INDEX IF NOT EXISTS idx_best_bet_signals_status ON best_bet_signals(status);
CREATE INDEX IF NOT EXISTS idx_best_bet_signals_generated ON best_bet_signals(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_best_bet_signals_active ON best_bet_signals(market_id, status) WHERE status = 'active';

-- ============================================================================
-- 3. Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN wallet_performance.elite_score IS 'Composite score 0-100 based on performance, consistency, experience, and risk';
COMMENT ON COLUMN wallet_performance.trader_tier IS 'Classification: elite(80-100), strong(60-79), moderate(40-59), developing(20-39), limited(0-19)';
COMMENT ON COLUMN wallet_performance.profit_factor IS 'Gross Profit ÷ Gross Loss - Elite threshold: >2.5';
COMMENT ON COLUMN wallet_performance.sharpe_ratio IS 'Risk-adjusted returns - Elite threshold: >2.0';
COMMENT ON COLUMN wallet_performance.max_drawdown IS 'Maximum loss from peak (%) - Elite threshold: <15%';
COMMENT ON COLUMN wallet_performance.category_specialization IS 'JSON object with category distribution percentages';
COMMENT ON COLUMN wallet_performance.elite_rank IS 'Ranking among elite traders only';

COMMENT ON TABLE best_bet_signals IS 'AI-generated trading signals from elite traders with position sizing';
COMMENT ON COLUMN best_bet_signals.signal_strength IS 'Elite (90-100): Copy immediately, Strong (75-89): Consider copying, Moderate (50-74): Watch closely, Weak (25-49): Monitor only';
COMMENT ON COLUMN best_bet_signals.kelly_criterion IS 'Optimal position size based on Kelly criterion (capped at 25%)';

-- ============================================================================
-- 4. Verification
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'wallet_performance elite columns: Added/Verified';
    RAISE NOTICE 'best_bet_signals table: Created/Verified';
END $$;
`