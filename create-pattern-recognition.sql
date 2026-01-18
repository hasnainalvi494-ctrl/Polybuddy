-- ============================================================================
-- AI-POWERED PATTERN RECOGNITION SYSTEM
-- ============================================================================

-- 1. Trading Patterns Table
CREATE TABLE IF NOT EXISTS trading_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_type TEXT NOT NULL CHECK (pattern_type IN (
        'entry_timing', 'position_size', 'holding_period', 'exit_strategy',
        'market_condition', 'trader_behavior', 'sentiment', 'order_book'
    )),
    
    -- Pattern identification
    pattern_name TEXT NOT NULL,
    pattern_signature JSONB NOT NULL,
    confidence_score DECIMAL(5, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    
    -- Pattern characteristics
    entry_price_range JSONB, -- {min, max, optimal}
    position_size_range JSONB, -- {min, max, avg}
    holding_period_hours JSONB, -- {min, max, avg}
    exit_conditions JSONB,
    
    -- Historical performance
    occurrences INTEGER DEFAULT 0,
    successful_outcomes INTEGER DEFAULT 0,
    failed_outcomes INTEGER DEFAULT 0,
    win_rate DECIMAL(5, 2) DEFAULT 0,
    avg_roi DECIMAL(10, 2) DEFAULT 0,
    sharpe_ratio DECIMAL(10, 4) DEFAULT 0,
    
    -- Market conditions
    market_category TEXT,
    volatility_range JSONB, -- {low, high}
    volume_range JSONB,
    
    -- Temporal analysis
    time_of_day_pattern JSONB, -- Hour distribution
    day_of_week_pattern JSONB,
    market_phase TEXT, -- 'early', 'mid', 'late'
    
    -- Associated traders
    elite_traders_using JSONB[], -- Array of trader addresses
    avg_trader_elite_score DECIMAL(5, 2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_occurrence_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trading_patterns_type ON trading_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_trading_patterns_win_rate ON trading_patterns(win_rate DESC);
CREATE INDEX IF NOT EXISTS idx_trading_patterns_category ON trading_patterns(market_category);
CREATE INDEX IF NOT EXISTS idx_trading_patterns_confidence ON trading_patterns(confidence_score DESC);

-- 2. Pattern Matches Table (linking trades to patterns)
CREATE TABLE IF NOT EXISTS pattern_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id UUID REFERENCES trading_patterns(id),
    
    -- Trade reference
    trade_id UUID, -- Could be wallet_trade or copied_position
    market_id UUID REFERENCES markets(id),
    trader_address TEXT,
    
    -- Match details
    match_confidence DECIMAL(5, 2) NOT NULL,
    match_features JSONB NOT NULL, -- Which features matched
    
    -- Prediction vs Reality
    predicted_outcome TEXT, -- 'win', 'loss'
    predicted_roi DECIMAL(10, 2),
    actual_outcome TEXT,
    actual_roi DECIMAL(10, 2),
    prediction_accurate BOOLEAN,
    
    -- Timing
    matched_at TIMESTAMP DEFAULT NOW(),
    outcome_recorded_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pattern_matches_pattern ON pattern_matches(pattern_id);
CREATE INDEX IF NOT EXISTS idx_pattern_matches_market ON pattern_matches(market_id);
CREATE INDEX IF NOT EXISTS idx_pattern_matches_trader ON pattern_matches(trader_address);
CREATE INDEX IF NOT EXISTS idx_pattern_matches_confidence ON pattern_matches(match_confidence DESC);

-- 3. Market Correlations Table
CREATE TABLE IF NOT EXISTS market_correlations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_a_id UUID REFERENCES markets(id),
    market_b_id UUID REFERENCES markets(id),
    
    -- Correlation metrics
    correlation_coefficient DECIMAL(10, 8), -- -1 to 1
    correlation_strength TEXT, -- 'strong_positive', 'moderate_positive', 'weak', 'moderate_negative', 'strong_negative'
    
    -- Time lag analysis
    optimal_lag_hours INTEGER, -- If market A leads market B
    lag_correlation DECIMAL(10, 8),
    
    -- Statistical significance
    sample_size INTEGER,
    p_value DECIMAL(10, 8),
    is_significant BOOLEAN,
    
    -- Analysis period
    analysis_start TIMESTAMP,
    analysis_end TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_corr_a ON market_correlations(market_a_id);
CREATE INDEX IF NOT EXISTS idx_market_corr_b ON market_correlations(market_b_id);
CREATE INDEX IF NOT EXISTS idx_market_corr_strength ON market_correlations(correlation_coefficient DESC);

-- 4. Sentiment Analysis Table
CREATE TABLE IF NOT EXISTS market_sentiment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID REFERENCES markets(id),
    
    -- Sentiment metrics
    sentiment_score DECIMAL(5, 2), -- -100 to 100
    sentiment_label TEXT, -- 'very_bullish', 'bullish', 'neutral', 'bearish', 'very_bearish'
    
    -- Sources
    social_sentiment DECIMAL(5, 2),
    news_sentiment DECIMAL(5, 2),
    trader_sentiment DECIMAL(5, 2), -- Based on elite trader activity
    
    -- Sentiment change
    sentiment_change_24h DECIMAL(5, 2),
    sentiment_momentum TEXT, -- 'increasing', 'stable', 'decreasing'
    
    -- Volume indicators
    sentiment_volume INTEGER, -- Number of signals/mentions
    
    -- Timestamp
    measured_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentiment_market ON market_sentiment(market_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_score ON market_sentiment(sentiment_score DESC);
CREATE INDEX IF NOT EXISTS idx_sentiment_measured ON market_sentiment(measured_at DESC);

-- 5. Order Book Analysis Table
CREATE TABLE IF NOT EXISTS order_book_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID REFERENCES markets(id),
    
    -- Order book metrics
    bid_ask_spread DECIMAL(10, 6),
    market_depth DECIMAL(18, 2),
    bid_volume DECIMAL(18, 2),
    ask_volume DECIMAL(18, 2),
    
    -- Imbalance metrics
    order_imbalance DECIMAL(5, 2), -- (bid - ask) / (bid + ask) * 100
    imbalance_direction TEXT, -- 'buy_pressure', 'sell_pressure', 'balanced'
    
    -- Liquidity metrics
    liquidity_score DECIMAL(5, 2),
    slippage_estimate DECIMAL(5, 4),
    
    -- Large orders detection
    large_bid_count INTEGER,
    large_ask_count INTEGER,
    whale_activity BOOLEAN DEFAULT false,
    
    -- HFT detection
    rapid_price_changes INTEGER, -- Changes per minute
    order_cancel_rate DECIMAL(5, 2),
    hft_score DECIMAL(5, 2), -- 0-100, higher = more HFT activity
    
    -- Snapshot time
    snapshot_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orderbook_market ON order_book_analysis(market_id);
CREATE INDEX IF NOT EXISTS idx_orderbook_snapshot ON order_book_analysis(snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_orderbook_whale ON order_book_analysis(whale_activity) WHERE whale_activity = true;

-- 6. Trader Behavior Clusters Table
CREATE TABLE IF NOT EXISTS trader_behavior_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_name TEXT NOT NULL,
    cluster_type TEXT, -- 'aggressive', 'conservative', 'scalper', 'swing', 'position'
    
    -- Cluster characteristics
    avg_position_size DECIMAL(18, 2),
    avg_holding_hours DECIMAL(10, 2),
    avg_win_rate DECIMAL(5, 2),
    avg_roi DECIMAL(10, 2),
    
    -- Behavioral patterns
    entry_pattern JSONB, -- Early/mid/late preferences
    exit_pattern JSONB,
    risk_profile JSONB,
    
    -- Cluster members
    trader_count INTEGER DEFAULT 0,
    elite_trader_percentage DECIMAL(5, 2),
    
    -- Performance
    cluster_win_rate DECIMAL(5, 2),
    cluster_avg_roi DECIMAL(10, 2),
    cluster_sharpe_ratio DECIMAL(10, 4),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trader_clusters_type ON trader_behavior_clusters(cluster_type);
CREATE INDEX IF NOT EXISTS idx_trader_clusters_performance ON trader_behavior_clusters(cluster_win_rate DESC);

-- 7. Trader Cluster Assignments Table
CREATE TABLE IF NOT EXISTS trader_cluster_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trader_address TEXT NOT NULL,
    cluster_id UUID REFERENCES trader_behavior_clusters(id),
    
    -- Assignment confidence
    assignment_confidence DECIMAL(5, 2),
    
    -- Trader metrics at assignment
    elite_score DECIMAL(5, 2),
    win_rate DECIMAL(5, 2),
    total_trades INTEGER,
    
    assigned_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cluster_assign_trader ON trader_cluster_assignments(trader_address);
CREATE INDEX IF NOT EXISTS idx_cluster_assign_cluster ON trader_cluster_assignments(cluster_id);

-- ============================================================================
-- VIEWS FOR PATTERN ANALYSIS
-- ============================================================================

-- 8. High Win Rate Patterns View
CREATE OR REPLACE VIEW high_win_rate_patterns AS
SELECT 
    tp.id,
    tp.pattern_type,
    tp.pattern_name,
    tp.confidence_score,
    tp.win_rate,
    tp.avg_roi,
    tp.sharpe_ratio,
    tp.occurrences,
    tp.market_category,
    tp.market_phase,
    tp.avg_trader_elite_score,
    -- Recent performance
    COUNT(pm.id) FILTER (WHERE pm.matched_at > NOW() - INTERVAL '30 days') as matches_last_30d,
    AVG(pm.actual_roi) FILTER (WHERE pm.matched_at > NOW() - INTERVAL '30 days') as avg_roi_last_30d
FROM trading_patterns tp
LEFT JOIN pattern_matches pm ON tp.id = pm.pattern_id
WHERE tp.win_rate >= 75
    AND tp.occurrences >= 10
GROUP BY tp.id, tp.pattern_type, tp.pattern_name, tp.confidence_score, tp.win_rate, 
         tp.avg_roi, tp.sharpe_ratio, tp.occurrences, tp.market_category, 
         tp.market_phase, tp.avg_trader_elite_score
ORDER BY tp.win_rate DESC, tp.confidence_score DESC;

-- 9. Pattern Success Prediction View
CREATE OR REPLACE VIEW pattern_predictions AS
SELECT 
    pm.id,
    pm.pattern_id,
    tp.pattern_name,
    tp.pattern_type,
    pm.market_id,
    m.question as market_question,
    pm.match_confidence,
    pm.predicted_outcome,
    pm.predicted_roi,
    pm.actual_outcome,
    pm.actual_roi,
    pm.prediction_accurate,
    tp.win_rate as pattern_historical_win_rate,
    pm.matched_at
FROM pattern_matches pm
JOIN trading_patterns tp ON pm.pattern_id = tp.id
LEFT JOIN markets m ON pm.market_id = m.id
WHERE pm.outcome_recorded_at IS NOT NULL
ORDER BY pm.matched_at DESC;

-- 10. Market Correlation Network View
CREATE OR REPLACE VIEW market_correlation_network AS
SELECT 
    mc.id,
    ma.question as market_a_question,
    ma.category as market_a_category,
    mb.question as market_b_question,
    mb.category as market_b_category,
    mc.correlation_coefficient,
    mc.correlation_strength,
    mc.optimal_lag_hours,
    mc.is_significant,
    mc.p_value
FROM market_correlations mc
JOIN markets ma ON mc.market_a_id = ma.id
JOIN markets mb ON mc.market_b_id = mb.id
WHERE mc.is_significant = true
    AND ABS(mc.correlation_coefficient) >= 0.5
ORDER BY ABS(mc.correlation_coefficient) DESC;

-- ============================================================================
-- FUNCTIONS FOR PATTERN ANALYSIS
-- ============================================================================

-- 11. Function to Calculate Pattern Match Score
CREATE OR REPLACE FUNCTION calculate_pattern_match_score(
    trade_entry_price DECIMAL,
    trade_position_size DECIMAL,
    pattern_entry_range JSONB,
    pattern_size_range JSONB
) RETURNS DECIMAL AS $$
DECLARE
    entry_score DECIMAL := 0;
    size_score DECIMAL := 0;
    total_score DECIMAL;
BEGIN
    -- Score entry price match
    IF trade_entry_price >= (pattern_entry_range->>'min')::DECIMAL 
       AND trade_entry_price <= (pattern_entry_range->>'max')::DECIMAL THEN
        entry_score := 50;
        -- Bonus if close to optimal
        IF ABS(trade_entry_price - (pattern_entry_range->>'optimal')::DECIMAL) < 0.05 THEN
            entry_score := 75;
        END IF;
    END IF;
    
    -- Score position size match
    IF trade_position_size >= (pattern_size_range->>'min')::DECIMAL 
       AND trade_position_size <= (pattern_size_range->>'max')::DECIMAL THEN
        size_score := 50;
    END IF;
    
    total_score := (entry_score + size_score) / 2;
    
    RETURN total_score;
END;
$$ LANGUAGE plpgsql;

-- 12. Function to Update Pattern Statistics
CREATE OR REPLACE FUNCTION update_pattern_statistics() RETURNS void AS $$
BEGIN
    UPDATE trading_patterns tp
    SET 
        occurrences = (
            SELECT COUNT(*) FROM pattern_matches 
            WHERE pattern_id = tp.id
        ),
        successful_outcomes = (
            SELECT COUNT(*) FROM pattern_matches 
            WHERE pattern_id = tp.id AND actual_outcome = 'win'
        ),
        failed_outcomes = (
            SELECT COUNT(*) FROM pattern_matches 
            WHERE pattern_id = tp.id AND actual_outcome = 'loss'
        ),
        win_rate = (
            SELECT 
                CASE 
                    WHEN COUNT(*) > 0 THEN 
                        (COUNT(*) FILTER (WHERE actual_outcome = 'win')::DECIMAL / COUNT(*) * 100)
                    ELSE 0
                END
            FROM pattern_matches 
            WHERE pattern_id = tp.id AND actual_outcome IS NOT NULL
        ),
        avg_roi = (
            SELECT COALESCE(AVG(actual_roi), 0)
            FROM pattern_matches 
            WHERE pattern_id = tp.id AND actual_roi IS NOT NULL
        ),
        last_occurrence_at = (
            SELECT MAX(matched_at)
            FROM pattern_matches 
            WHERE pattern_id = tp.id
        ),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert sample trading patterns
INSERT INTO trading_patterns (
    pattern_type,
    pattern_name,
    pattern_signature,
    confidence_score,
    entry_price_range,
    position_size_range,
    holding_period_hours,
    win_rate,
    avg_roi,
    market_phase,
    occurrences
) VALUES 
(
    'entry_timing',
    'Early Market Entry - Elite Consensus',
    '{"type": "early_entry", "elite_traders": 5, "consensus": "high"}',
    92.5,
    '{"min": 0.40, "max": 0.55, "optimal": 0.47}',
    '{"min": 3000, "max": 10000, "avg": 5500}',
    '{"min": 24, "max": 120, "avg": 72}',
    85.2,
    22.5,
    'early',
    45
),
(
    'position_size',
    'Large Position - High Conviction',
    '{"type": "large_position", "conviction": "high", "min_size": 10000}',
    88.3,
    '{"min": 0.35, "max": 0.65, "optimal": 0.50}',
    '{"min": 10000, "max": 50000, "avg": 25000}',
    '{"min": 48, "max": 240, "avg": 120}',
    78.5,
    31.2,
    'mid',
    32
),
(
    'holding_period',
    'Quick Scalp - 24-48h',
    '{"type": "scalp", "target_hours": 36, "quick_exit": true}',
    81.7,
    '{"min": 0.45, "max": 0.75, "optimal": 0.60}',
    '{"min": 2000, "max": 8000, "avg": 4000}',
    '{"min": 12, "max": 48, "avg": 30}',
    72.8,
    15.5,
    'mid',
    67
);

SELECT '✅ AI Pattern Recognition System Created!' as status;

-- Show sample patterns
SELECT '📊 Sample Trading Patterns:' as info;
SELECT 
    pattern_name,
    pattern_type,
    ROUND(confidence_score, 1) || '%' as confidence,
    ROUND(win_rate, 1) || '%' as win_rate,
    occurrences
FROM trading_patterns
ORDER BY win_rate DESC;
