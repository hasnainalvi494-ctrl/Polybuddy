-- Enhanced Best Bets Model Migration
-- Adds fields for whale tracking, momentum analysis, and AI integration

-- Signal Source - what triggered this signal
ALTER TABLE best_bet_signals ADD COLUMN IF NOT EXISTS signal_source TEXT;

-- Whale/Smart Money Analysis
ALTER TABLE best_bet_signals ADD COLUMN IF NOT EXISTS whale_consensus TEXT;
ALTER TABLE best_bet_signals ADD COLUMN IF NOT EXISTS whale_volume_24h DECIMAL(18, 2);
ALTER TABLE best_bet_signals ADD COLUMN IF NOT EXISTS whale_count INTEGER;
ALTER TABLE best_bet_signals ADD COLUMN IF NOT EXISTS avg_whale_elite_score DECIMAL(5, 2);

-- Momentum/Trend Analysis
ALTER TABLE best_bet_signals ADD COLUMN IF NOT EXISTS momentum_score DECIMAL(5, 2);
ALTER TABLE best_bet_signals ADD COLUMN IF NOT EXISTS price_change_24h DECIMAL(10, 4);
ALTER TABLE best_bet_signals ADD COLUMN IF NOT EXISTS price_change_7d DECIMAL(10, 4);
ALTER TABLE best_bet_signals ADD COLUMN IF NOT EXISTS volume_trend TEXT;

-- AI Analysis (Claude-generated)
ALTER TABLE best_bet_signals ADD COLUMN IF NOT EXISTS ai_analysis JSONB;
ALTER TABLE best_bet_signals ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(5, 2);

-- Composite Scores
ALTER TABLE best_bet_signals ADD COLUMN IF NOT EXISTS smart_money_score DECIMAL(5, 2);
ALTER TABLE best_bet_signals ADD COLUMN IF NOT EXISTS technical_score DECIMAL(5, 2);
ALTER TABLE best_bet_signals ADD COLUMN IF NOT EXISTS fundamental_score DECIMAL(5, 2);

-- Performance Tracking Enhancements
ALTER TABLE best_bet_signals ADD COLUMN IF NOT EXISTS was_correct BOOLEAN;
ALTER TABLE best_bet_signals ADD COLUMN IF NOT EXISTS price_at_resolution DECIMAL(10, 4);
ALTER TABLE best_bet_signals ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_best_bets_signal_source ON best_bet_signals(signal_source);
CREATE INDEX IF NOT EXISTS idx_best_bets_whale_consensus ON best_bet_signals(whale_consensus);
CREATE INDEX IF NOT EXISTS idx_best_bets_was_correct ON best_bet_signals(was_correct);
CREATE INDEX IF NOT EXISTS idx_best_bets_status_created ON best_bet_signals(status, created_at DESC);

-- Add comments
COMMENT ON COLUMN best_bet_signals.signal_source IS 'What triggered this signal: whale, momentum, ai, or combined';
COMMENT ON COLUMN best_bet_signals.whale_consensus IS 'Aggregated whale direction: strong_yes, lean_yes, neutral, lean_no, strong_no';
COMMENT ON COLUMN best_bet_signals.momentum_score IS 'Price momentum indicator from -100 (bearish) to +100 (bullish)';
COMMENT ON COLUMN best_bet_signals.smart_money_score IS 'Combined score from whale activity and elite trader signals';
COMMENT ON COLUMN best_bet_signals.was_correct IS 'Whether the signal correctly predicted the outcome';
