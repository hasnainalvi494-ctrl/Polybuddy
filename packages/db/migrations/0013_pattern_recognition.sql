-- Migration: Add AI Pattern Recognition Tables
-- This migration creates tables required for the pattern recognition feature

-- Create pattern type enum
DO $$ BEGIN
  CREATE TYPE pattern_type AS ENUM (
    'momentum',
    'reversal',
    'breakout',
    'consolidation',
    'accumulation',
    'distribution',
    'elite_follow',
    'whale_accumulation'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Trading patterns table
CREATE TABLE IF NOT EXISTS trading_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type pattern_type NOT NULL,
  pattern_name VARCHAR(200) NOT NULL,
  pattern_signature JSONB,
  confidence_score DECIMAL(5,2) NOT NULL,
  
  -- Entry/Exit conditions
  entry_price_range JSONB,
  position_size_range JSONB,
  holding_period_hours JSONB,
  exit_conditions JSONB,
  
  -- Performance metrics
  occurrences INTEGER DEFAULT 0,
  successful_outcomes INTEGER DEFAULT 0,
  failed_outcomes INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2) DEFAULT 0,
  avg_roi DECIMAL(10,2) DEFAULT 0,
  sharpe_ratio DECIMAL(10,4) DEFAULT 0,
  
  -- Market context
  market_category VARCHAR(100),
  market_phase VARCHAR(50),
  volatility_range JSONB,
  
  -- Elite trader association
  elite_traders_using INTEGER DEFAULT 0,
  avg_trader_elite_score DECIMAL(5,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_occurrence_at TIMESTAMPTZ
);

-- Pattern matches table
CREATE TABLE IF NOT EXISTS pattern_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL REFERENCES trading_patterns(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES markets(id),
  trader_address VARCHAR(42),
  
  -- Match details
  match_score DECIMAL(5,2) NOT NULL,
  matched_features JSONB,
  
  -- Trade details
  entry_price DECIMAL(10,4),
  exit_price DECIMAL(10,4),
  position_size DECIMAL(18,2),
  
  -- Outcome tracking
  actual_outcome VARCHAR(10),
  actual_roi DECIMAL(10,2),
  
  -- Timestamps
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Trader behavior clusters table
CREATE TABLE IF NOT EXISTS trader_behavior_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_name VARCHAR(200) NOT NULL,
  cluster_type VARCHAR(100) NOT NULL,
  
  -- Behavior characteristics
  avg_position_size DECIMAL(18,2),
  avg_holding_hours DECIMAL(10,2),
  avg_win_rate DECIMAL(5,2),
  avg_roi DECIMAL(10,2),
  
  -- Trading style
  entry_pattern JSONB,
  exit_pattern JSONB,
  risk_profile VARCHAR(50),
  
  -- Cluster stats
  trader_count INTEGER DEFAULT 0,
  elite_trader_percentage DECIMAL(5,2),
  
  -- Performance
  cluster_win_rate DECIMAL(5,2),
  cluster_avg_roi DECIMAL(10,2),
  cluster_sharpe_ratio DECIMAL(10,4),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trader cluster assignments table
CREATE TABLE IF NOT EXISTS trader_cluster_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES trader_behavior_clusters(id) ON DELETE CASCADE,
  trader_address VARCHAR(42) NOT NULL,
  
  -- Assignment details
  assignment_score DECIMAL(5,2),
  elite_score DECIMAL(5,2),
  
  -- Timestamps
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Market sentiment table
CREATE TABLE IF NOT EXISTS market_sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id),
  
  -- Sentiment metrics
  sentiment_score DECIMAL(5,2) NOT NULL,
  sentiment_label VARCHAR(50) NOT NULL,
  sentiment_momentum VARCHAR(50),
  
  -- Volume-weighted sentiment
  volume_weighted_score DECIMAL(5,2),
  
  -- Timestamps
  measured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order book analysis table
CREATE TABLE IF NOT EXISTS order_book_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id),
  
  -- Imbalance metrics
  order_imbalance DECIMAL(10,2) NOT NULL,
  imbalance_direction VARCHAR(10) NOT NULL,
  
  -- Whale detection
  whale_activity BOOLEAN DEFAULT FALSE,
  large_order_count INTEGER DEFAULT 0,
  large_order_volume DECIMAL(18,2),
  
  -- Liquidity metrics
  liquidity_score DECIMAL(5,2),
  spread_bps DECIMAL(10,2),
  
  -- HFT detection
  hft_score DECIMAL(5,2),
  
  -- Timestamps
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

-- Market correlations table
CREATE TABLE IF NOT EXISTS market_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_a_id UUID NOT NULL REFERENCES markets(id),
  market_b_id UUID NOT NULL REFERENCES markets(id),
  
  -- Correlation metrics
  correlation_coefficient DECIMAL(5,4) NOT NULL,
  correlation_strength VARCHAR(50),
  
  -- Lag analysis
  optimal_lag_hours INTEGER,
  lag_correlation DECIMAL(5,4),
  
  -- Statistical significance
  sample_size INTEGER,
  p_value DECIMAL(10,6),
  is_significant BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trading_patterns_category ON trading_patterns(market_category);
CREATE INDEX IF NOT EXISTS idx_trading_patterns_win_rate ON trading_patterns(win_rate DESC);
CREATE INDEX IF NOT EXISTS idx_pattern_matches_pattern ON pattern_matches(pattern_id);
CREATE INDEX IF NOT EXISTS idx_pattern_matches_market ON pattern_matches(market_id);
CREATE INDEX IF NOT EXISTS idx_pattern_matches_matched_at ON pattern_matches(matched_at DESC);
CREATE INDEX IF NOT EXISTS idx_trader_cluster_assignments_cluster ON trader_cluster_assignments(cluster_id);
CREATE INDEX IF NOT EXISTS idx_trader_cluster_assignments_trader ON trader_cluster_assignments(trader_address);
CREATE INDEX IF NOT EXISTS idx_market_sentiment_market ON market_sentiment(market_id);
CREATE INDEX IF NOT EXISTS idx_market_sentiment_measured ON market_sentiment(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_book_analysis_market ON order_book_analysis(market_id);
CREATE INDEX IF NOT EXISTS idx_order_book_analysis_snapshot ON order_book_analysis(snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_correlations_market_a ON market_correlations(market_a_id);
CREATE INDEX IF NOT EXISTS idx_market_correlations_market_b ON market_correlations(market_b_id);
CREATE INDEX IF NOT EXISTS idx_market_correlations_significant ON market_correlations(is_significant) WHERE is_significant = TRUE;

-- Insert sample trader behavior clusters for demo
INSERT INTO trader_behavior_clusters (cluster_name, cluster_type, avg_position_size, avg_holding_hours, avg_win_rate, avg_roi, risk_profile, trader_count, elite_trader_percentage, cluster_win_rate, cluster_avg_roi, cluster_sharpe_ratio)
VALUES 
  ('Momentum Chasers', 'aggressive', 15000.00, 12.5, 58.00, 8.50, 'high', 45, 22.00, 56.00, 7.80, 1.25),
  ('Value Contrarians', 'conservative', 8500.00, 72.0, 65.00, 12.30, 'low', 32, 38.00, 67.00, 14.50, 1.85),
  ('Event Traders', 'opportunistic', 12000.00, 6.0, 52.00, 15.80, 'medium', 28, 15.00, 48.00, 18.20, 0.95),
  ('Elite Followers', 'moderate', 5000.00, 48.0, 62.00, 9.20, 'medium', 156, 8.00, 58.00, 8.50, 1.45),
  ('Whale Watchers', 'reactive', 3500.00, 24.0, 55.00, 6.80, 'medium', 89, 5.00, 52.00, 5.90, 1.10)
ON CONFLICT DO NOTHING;

-- Insert sample trading patterns
INSERT INTO trading_patterns (pattern_type, pattern_name, confidence_score, entry_price_range, position_size_range, holding_period_hours, win_rate, avg_roi, sharpe_ratio, market_category, market_phase, occurrences, successful_outcomes, failed_outcomes, elite_traders_using)
VALUES 
  ('momentum', 'Early Momentum Surge', 85.00, '{"min": 0.15, "max": 0.35, "optimal": 0.25}'::jsonb, '{"min": 1000, "max": 10000, "avg": 5000}'::jsonb, '{"min": 6, "max": 48, "avg": 24}'::jsonb, 72.50, 18.30, 1.65, 'politics', 'early', 234, 170, 64, 12),
  ('reversal', 'Oversold Bounce', 78.00, '{"min": 0.05, "max": 0.20, "optimal": 0.12}'::jsonb, '{"min": 2000, "max": 15000, "avg": 7500}'::jsonb, '{"min": 12, "max": 96, "avg": 48}'::jsonb, 68.20, 22.10, 1.42, NULL, 'late', 156, 107, 49, 8),
  ('breakout', 'Volume Breakout', 82.00, '{"min": 0.40, "max": 0.60, "optimal": 0.50}'::jsonb, '{"min": 3000, "max": 20000, "avg": 10000}'::jsonb, '{"min": 4, "max": 24, "avg": 12}'::jsonb, 65.80, 15.60, 1.35, 'crypto', 'mid', 189, 124, 65, 15),
  ('accumulation', 'Smart Money Accumulation', 88.00, '{"min": 0.20, "max": 0.40, "optimal": 0.30}'::jsonb, '{"min": 5000, "max": 50000, "avg": 20000}'::jsonb, '{"min": 24, "max": 168, "avg": 72}'::jsonb, 75.30, 25.80, 1.92, 'politics', 'early', 98, 74, 24, 22),
  ('elite_follow', 'Elite Trader Follow', 90.00, '{"min": 0.25, "max": 0.45, "optimal": 0.35}'::jsonb, '{"min": 2000, "max": 12000, "avg": 6000}'::jsonb, '{"min": 12, "max": 72, "avg": 36}'::jsonb, 78.60, 19.40, 1.78, NULL, NULL, 312, 245, 67, 35)
ON CONFLICT DO NOTHING;
