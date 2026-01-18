-- Add trader_score_cache table for real-time scoring
CREATE TABLE IF NOT EXISTS trader_score_cache (
  wallet_address TEXT PRIMARY KEY,
  
  -- Core Elite Metrics (already in wallet_performance, but cached for speed)
  elite_score NUMERIC(5, 2) NOT NULL,
  trader_tier TEXT NOT NULL CHECK (trader_tier IN ('elite', 'strong', 'moderate', 'developing', 'limited')),
  
  -- Performance snapshot
  win_rate NUMERIC(5, 2),
  profit_factor NUMERIC(10, 4),
  sharpe_ratio NUMERIC(10, 4),
  max_drawdown NUMERIC(5, 2),
  total_profit NUMERIC(18, 2),
  
  -- Real-time tracking
  last_trade_timestamp TIMESTAMP WITH TIME ZONE,
  recent_performance JSONB, -- Last 10 trades performance
  active_positions JSONB, -- Current open positions
  
  -- Signal generation
  signal_strength NUMERIC(5, 2), -- 0-100 real-time signal quality
  is_active BOOLEAN DEFAULT true, -- Currently active/trading
  trade_frequency TEXT, -- 'high', 'medium', 'low'
  
  -- Cache management
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cache_version INTEGER DEFAULT 1
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_trader_score_cache_elite_score ON trader_score_cache(elite_score DESC);
CREATE INDEX IF NOT EXISTS idx_trader_score_cache_trader_tier ON trader_score_cache(trader_tier);
CREATE INDEX IF NOT EXISTS idx_trader_score_cache_active ON trader_score_cache(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_trader_score_cache_signal_strength ON trader_score_cache(signal_strength DESC);

-- Best Bets signals table
CREATE TABLE IF NOT EXISTS best_bets_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Market information
  market_id UUID NOT NULL,
  market_question TEXT NOT NULL,
  market_category TEXT,
  
  -- Signal details
  signal_type TEXT NOT NULL CHECK (signal_type IN ('elite', 'strong', 'moderate', 'weak')),
  confidence_score NUMERIC(5, 2) NOT NULL, -- 0-100
  recommended_side TEXT NOT NULL CHECK (recommended_side IN ('yes', 'no')),
  
  -- Elite trader consensus
  elite_trader_count INTEGER NOT NULL,
  elite_consensus_strength NUMERIC(5, 2), -- % agreement among elites
  avg_elite_score NUMERIC(5, 2),
  
  -- Position details
  recommended_entry_price NUMERIC(10, 4),
  current_market_price NUMERIC(10, 4),
  potential_return NUMERIC(10, 2), -- Expected return %
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  
  -- Top traders on this signal
  top_traders JSONB, -- Array of elite traders backing this bet
  
  -- Timing
  signal_generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  signal_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  
  -- Tracking
  views INTEGER DEFAULT 0,
  follows INTEGER DEFAULT 0,
  
  -- Performance (after resolution)
  actual_outcome TEXT CHECK (actual_outcome IN ('yes', 'no', 'pending')),
  actual_return NUMERIC(10, 2),
  signal_accuracy NUMERIC(5, 2)
);

-- Indexes for signal queries
CREATE INDEX IF NOT EXISTS idx_best_bets_signals_active ON best_bets_signals(is_active, signal_generated_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_best_bets_signals_type ON best_bets_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_best_bets_signals_confidence ON best_bets_signals(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_best_bets_signals_market ON best_bets_signals(market_id);
CREATE INDEX IF NOT EXISTS idx_best_bets_signals_category ON best_bets_signals(market_category);

-- Elite trader activity log for signal generation
CREATE TABLE IF NOT EXISTS elite_trader_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  wallet_address TEXT NOT NULL,
  market_id UUID NOT NULL,
  
  action TEXT NOT NULL CHECK (action IN ('entry', 'exit', 'increase', 'decrease')),
  position_side TEXT NOT NULL CHECK (position_side IN ('yes', 'no')),
  
  -- Trade details
  entry_price NUMERIC(10, 4),
  position_size NUMERIC(18, 2),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Trader context at time of trade
  trader_score NUMERIC(5, 2),
  trader_tier TEXT,
  
  -- Signal generation flag
  generated_signal BOOLEAN DEFAULT false,
  signal_id UUID REFERENCES best_bets_signals(id)
);

CREATE INDEX IF NOT EXISTS idx_elite_activity_wallet ON elite_trader_activity(wallet_address);
CREATE INDEX IF NOT EXISTS idx_elite_activity_market ON elite_trader_activity(market_id);
CREATE INDEX IF NOT EXISTS idx_elite_activity_timestamp ON elite_trader_activity(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_elite_activity_signal_gen ON elite_trader_activity(generated_signal) WHERE generated_signal = false;

-- Function to update cache
CREATE OR REPLACE FUNCTION update_trader_score_cache()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO trader_score_cache (
    wallet_address,
    elite_score,
    trader_tier,
    win_rate,
    profit_factor,
    sharpe_ratio,
    max_drawdown,
    total_profit,
    last_trade_timestamp,
    is_active,
    last_updated
  )
  VALUES (
    NEW.wallet_address,
    NEW.elite_score,
    NEW.trader_tier,
    NEW.win_rate,
    NEW.profit_factor,
    NEW.sharpe_ratio,
    NEW.max_drawdown,
    NEW.total_profit,
    NEW.last_trade_at,
    (NEW.last_trade_at > NOW() - INTERVAL '7 days'),
    NOW()
  )
  ON CONFLICT (wallet_address) DO UPDATE SET
    elite_score = EXCLUDED.elite_score,
    trader_tier = EXCLUDED.trader_tier,
    win_rate = EXCLUDED.win_rate,
    profit_factor = EXCLUDED.profit_factor,
    sharpe_ratio = EXCLUDED.sharpe_ratio,
    max_drawdown = EXCLUDED.max_drawdown,
    total_profit = EXCLUDED.total_profit,
    last_trade_timestamp = EXCLUDED.last_trade_timestamp,
    is_active = EXCLUDED.is_active,
    last_updated = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update cache
DROP TRIGGER IF EXISTS trigger_update_trader_cache ON wallet_performance;
CREATE TRIGGER trigger_update_trader_cache
AFTER INSERT OR UPDATE ON wallet_performance
FOR EACH ROW
WHEN (NEW.elite_score IS NOT NULL)
EXECUTE FUNCTION update_trader_score_cache();

-- Comments for documentation
COMMENT ON TABLE trader_score_cache IS 'Real-time cache of elite trader scores for fast signal generation';
COMMENT ON TABLE best_bets_signals IS 'Generated Best Bets signals with confidence levels and elite consensus';
COMMENT ON TABLE elite_trader_activity IS 'Activity log of elite traders for signal generation and tracking';

COMMENT ON COLUMN best_bets_signals.signal_type IS 'Elite (90-100): Copy immediately, Strong (75-89): Consider copying, Moderate (50-74): Watch closely, Weak (25-49): Monitor only';
COMMENT ON COLUMN best_bets_signals.confidence_score IS 'Overall confidence score 0-100 based on elite consensus, timing, and market conditions';
