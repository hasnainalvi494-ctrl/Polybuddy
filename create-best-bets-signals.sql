-- ============================================================================
-- BEST BETS SIGNAL GENERATION SYSTEM
-- ============================================================================

-- 1. Create best_bet_signals table
CREATE TABLE IF NOT EXISTS best_bet_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL REFERENCES markets(id),
    trader_address TEXT NOT NULL,
    
    -- Signal Metadata
    confidence DECIMAL(5, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    signal_strength TEXT NOT NULL CHECK (signal_strength IN ('elite', 'strong', 'moderate', 'weak')),
    
    -- Trading Parameters
    entry_price DECIMAL(10, 4) NOT NULL,
    target_price DECIMAL(10, 4),
    stop_loss DECIMAL(10, 4),
    position_size DECIMAL(18, 2),
    
    -- Risk Management
    risk_reward_ratio DECIMAL(10, 2),
    kelly_criterion DECIMAL(5, 4),
    max_position_size DECIMAL(18, 2),
    
    -- Trader Metrics (snapshot at signal time)
    trader_win_rate DECIMAL(5, 2),
    trader_profit_history DECIMAL(18, 2),
    trader_elite_score DECIMAL(5, 2),
    trader_sharpe_ratio DECIMAL(10, 4),
    
    -- Signal Details
    reasoning JSONB,
    time_horizon TEXT,
    outcome TEXT CHECK (outcome IN ('yes', 'no')),
    
    -- Metadata
    generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'executed', 'expired', 'cancelled')),
    
    -- Performance Tracking
    actual_outcome TEXT,
    actual_profit DECIMAL(18, 2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_best_bet_signals_market ON best_bet_signals(market_id);
CREATE INDEX IF NOT EXISTS idx_best_bet_signals_trader ON best_bet_signals(trader_address);
CREATE INDEX IF NOT EXISTS idx_best_bet_signals_strength ON best_bet_signals(signal_strength);
CREATE INDEX IF NOT EXISTS idx_best_bet_signals_status ON best_bet_signals(status);
CREATE INDEX IF NOT EXISTS idx_best_bet_signals_generated ON best_bet_signals(generated_at DESC);

-- ============================================================================
-- 2. Generate Best Bet Signals from Elite Traders
-- ============================================================================

-- Function to calculate Kelly Criterion
CREATE OR REPLACE FUNCTION calculate_kelly_criterion(
    win_rate DECIMAL,
    profit_factor DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    -- Kelly = (Win% * Profit Factor - Loss%) / Profit Factor
    -- Cap at 25% for safety
    RETURN LEAST(
        ((win_rate / 100) * profit_factor - (1 - win_rate / 100)) / profit_factor,
        0.25
    );
END;
$$ LANGUAGE plpgsql;

-- Function to determine signal strength
CREATE OR REPLACE FUNCTION get_signal_strength(
    elite_score DECIMAL,
    win_rate DECIMAL,
    confidence DECIMAL
) RETURNS TEXT AS $$
BEGIN
    IF elite_score >= 85 AND win_rate >= 85 AND confidence >= 90 THEN
        RETURN 'elite';
    ELSIF elite_score >= 75 AND win_rate >= 75 AND confidence >= 75 THEN
        RETURN 'strong';
    ELSIF elite_score >= 60 AND win_rate >= 65 AND confidence >= 60 THEN
        RETURN 'moderate';
    ELSE
        RETURN 'weak';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. Generate Signals from Recent Whale Trades
-- ============================================================================

INSERT INTO best_bet_signals (
    market_id,
    trader_address,
    confidence,
    signal_strength,
    entry_price,
    target_price,
    stop_loss,
    position_size,
    risk_reward_ratio,
    kelly_criterion,
    trader_win_rate,
    trader_profit_history,
    trader_elite_score,
    trader_sharpe_ratio,
    reasoning,
    time_horizon,
    outcome,
    generated_at,
    expires_at
)
SELECT 
    m.id as market_id,
    wt.wallet_address as trader_address,
    
    -- Calculate confidence based on trader metrics
    LEAST(
        wp.elite_score * 0.4 +
        wp.win_rate * 0.3 +
        LEAST(wp.sharpe_ratio * 10, 30) +
        5,
        100
    )::DECIMAL(5,2) as confidence,
    
    -- Determine signal strength
    get_signal_strength(
        wp.elite_score::DECIMAL,
        wp.win_rate::DECIMAL,
        LEAST(wp.elite_score * 0.4 + wp.win_rate * 0.3 + LEAST(wp.sharpe_ratio * 10, 30) + 5, 100)
    ) as signal_strength,
    
    -- Trading parameters
    wt.entry_price as entry_price,
    CASE 
        WHEN wt.outcome = 'yes' THEN LEAST(wt.entry_price * 1.20, 0.95)
        ELSE GREATEST(wt.entry_price * 0.80, 0.05)
    END::DECIMAL(10,4) as target_price,
    CASE 
        WHEN wt.outcome = 'yes' THEN GREATEST(wt.entry_price * 0.90, 0.05)
        ELSE LEAST(wt.entry_price * 1.10, 0.95)
    END::DECIMAL(10,4) as stop_loss,
    wt.size as position_size,
    
    -- Risk management
    CASE 
        WHEN wt.outcome = 'yes' THEN 
            (LEAST(wt.entry_price * 1.20, 0.95) - wt.entry_price) / 
            (wt.entry_price - GREATEST(wt.entry_price * 0.90, 0.05))
        ELSE 
            (wt.entry_price - GREATEST(wt.entry_price * 0.80, 0.05)) / 
            (LEAST(wt.entry_price * 1.10, 0.95) - wt.entry_price)
    END::DECIMAL(10,2) as risk_reward_ratio,
    
    calculate_kelly_criterion(
        wp.win_rate::DECIMAL,
        wp.profit_factor::DECIMAL
    ) as kelly_criterion,
    
    -- Trader metrics
    wp.win_rate::DECIMAL(5,2) as trader_win_rate,
    wp.total_profit::DECIMAL(18,2) as trader_profit_history,
    wp.elite_score::DECIMAL(5,2) as trader_elite_score,
    wp.sharpe_ratio::DECIMAL(10,4) as trader_sharpe_ratio,
    
    -- Reasoning
    jsonb_build_array(
        CASE 
            WHEN wp.elite_score >= 85 THEN 'Elite trader (score: ' || ROUND(wp.elite_score, 1) || ')'
            WHEN wp.elite_score >= 75 THEN 'Strong trader (score: ' || ROUND(wp.elite_score, 1) || ')'
            ELSE 'Experienced trader (score: ' || ROUND(wp.elite_score, 1) || ')'
        END,
        'Win rate: ' || ROUND(wp.win_rate, 1) || '%',
        'Profit factor: ' || ROUND(wp.profit_factor::DECIMAL, 2),
        'Sharpe ratio: ' || ROUND(wp.sharpe_ratio::DECIMAL, 2),
        'Total profit: $' || ROUND(wp.total_profit::DECIMAL, 0),
        CASE 
            WHEN wt.size > 50000 THEN 'Large position ($' || ROUND(wt.size, 0) || ')'
            WHEN wt.size > 20000 THEN 'Medium position ($' || ROUND(wt.size, 0) || ')'
            ELSE 'Standard position ($' || ROUND(wt.size, 0) || ')'
        END
    ) as reasoning,
    
    -- Time horizon based on market end date
    CASE 
        WHEN m.end_date IS NULL THEN '30 days'
        WHEN m.end_date < NOW() + INTERVAL '7 days' THEN 'Short-term (< 7 days)'
        WHEN m.end_date < NOW() + INTERVAL '30 days' THEN 'Medium-term (< 30 days)'
        ELSE 'Long-term (30+ days)'
    END as time_horizon,
    
    wt.outcome as outcome,
    wt.timestamp as generated_at,
    COALESCE(m.end_date, NOW() + INTERVAL '30 days') as expires_at

FROM wallet_trades wt
JOIN wallet_performance wp ON wp.wallet_address = wt.wallet_address
JOIN markets m ON m.polymarket_id = wt.market_id
WHERE 
    wp.elite_score >= 60  -- Only from good traders
    AND wt.size >= 10000  -- Only whale trades
    AND wt.timestamp > NOW() - INTERVAL '24 hours'  -- Recent trades only
    AND NOT EXISTS (
        SELECT 1 FROM best_bet_signals bbs 
        WHERE bbs.trader_address = wt.wallet_address 
        AND bbs.market_id = m.id 
        AND bbs.generated_at > NOW() - INTERVAL '24 hours'
    )
ORDER BY wp.elite_score DESC, wt.size DESC
LIMIT 20
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. Create View for Active Best Bets
-- ============================================================================

CREATE OR REPLACE VIEW active_best_bets AS
SELECT 
    bbs.id,
    bbs.market_id,
    m.question as market_question,
    m.category as market_category,
    bbs.trader_address,
    bbs.confidence,
    bbs.signal_strength,
    bbs.entry_price,
    bbs.target_price,
    bbs.stop_loss,
    bbs.position_size,
    bbs.risk_reward_ratio,
    bbs.kelly_criterion,
    bbs.trader_win_rate,
    bbs.trader_profit_history,
    bbs.trader_elite_score,
    bbs.reasoning,
    bbs.time_horizon,
    bbs.outcome,
    bbs.generated_at,
    bbs.expires_at,
    -- Calculate potential profit
    CASE 
        WHEN bbs.outcome = 'yes' THEN 
            (bbs.target_price - bbs.entry_price) * bbs.position_size * bbs.kelly_criterion
        ELSE 
            (bbs.entry_price - bbs.target_price) * bbs.position_size * bbs.kelly_criterion
    END as potential_profit,
    -- Time until expiry
    EXTRACT(EPOCH FROM (bbs.expires_at - NOW())) / 3600 as hours_until_expiry
FROM best_bet_signals bbs
JOIN markets m ON m.id = bbs.market_id
WHERE 
    bbs.status = 'active'
    AND bbs.expires_at > NOW()
ORDER BY 
    bbs.signal_strength DESC,
    bbs.confidence DESC,
    bbs.generated_at DESC;

-- ============================================================================
-- 5. Verification
-- ============================================================================

SELECT '✅ Best Bet Signals System Created!' as status;

SELECT 
    signal_strength,
    COUNT(*) as count,
    ROUND(AVG(confidence), 1) as avg_confidence,
    ROUND(AVG(trader_win_rate), 1) as avg_trader_win_rate,
    ROUND(AVG(risk_reward_ratio), 2) as avg_risk_reward
FROM best_bet_signals
WHERE status = 'active'
GROUP BY signal_strength
ORDER BY 
    CASE signal_strength
        WHEN 'elite' THEN 1
        WHEN 'strong' THEN 2
        WHEN 'moderate' THEN 3
        WHEN 'weak' THEN 4
    END;

-- Show top 5 signals
SELECT '🎯 Top 5 Best Bet Signals:' as info;
SELECT 
    signal_strength,
    ROUND(confidence, 1) as conf,
    ROUND(trader_win_rate, 1) as win_rate,
    outcome,
    LEFT(market_question, 50) || '...' as market
FROM active_best_bets
LIMIT 5;
