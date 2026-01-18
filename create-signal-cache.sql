-- ============================================================================
-- SIGNAL CACHING & REAL-TIME UPDATES SYSTEM
-- ============================================================================

-- 1. Create signal cache table for fast lookups
CREATE TABLE IF NOT EXISTS signal_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL REFERENCES markets(id),
    
    -- Cached signal data
    signal_id UUID REFERENCES best_bet_signals(id),
    confidence DECIMAL(5, 2) NOT NULL,
    signal_strength TEXT NOT NULL,
    
    -- Quick access fields
    entry_price DECIMAL(10, 4) NOT NULL,
    current_price DECIMAL(10, 4),
    price_change_percent DECIMAL(5, 2),
    
    -- Trading metrics
    kelly_percentage DECIMAL(5, 4),
    risk_reward_ratio DECIMAL(10, 2),
    expected_value DECIMAL(18, 2),
    
    -- Trader snapshot
    trader_address TEXT NOT NULL,
    trader_win_rate DECIMAL(5, 2),
    trader_elite_score DECIMAL(5, 2),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_updated TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    
    -- Metadata
    views_count INTEGER DEFAULT 0,
    copy_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signal_cache_market ON signal_cache(market_id);
CREATE INDEX IF NOT EXISTS idx_signal_cache_active ON signal_cache(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_signal_cache_strength ON signal_cache(signal_strength);
CREATE INDEX IF NOT EXISTS idx_signal_cache_updated ON signal_cache(last_updated DESC);

-- 2. Create materialized view for top signals
CREATE MATERIALIZED VIEW IF NOT EXISTS top_signals_mv AS
SELECT 
    sc.id,
    sc.market_id,
    m.question as market_question,
    m.category as market_category,
    sc.confidence,
    sc.signal_strength,
    sc.entry_price,
    sc.current_price,
    sc.price_change_percent,
    sc.kelly_percentage,
    sc.risk_reward_ratio,
    sc.expected_value,
    sc.trader_address,
    sc.trader_win_rate,
    sc.trader_elite_score,
    sc.copy_count,
    sc.last_updated,
    sc.expires_at,
    -- Calculate urgency score
    CASE 
        WHEN sc.signal_strength = 'elite' THEN 100
        WHEN sc.signal_strength = 'strong' THEN 75
        WHEN sc.signal_strength = 'moderate' THEN 50
        ELSE 25
    END + 
    (sc.confidence * 0.3) + 
    (sc.trader_elite_score * 0.2) +
    (CASE 
        WHEN sc.expires_at < NOW() + INTERVAL '6 hours' THEN 20
        WHEN sc.expires_at < NOW() + INTERVAL '24 hours' THEN 10
        ELSE 0
    END) as urgency_score
FROM signal_cache sc
JOIN markets m ON m.id = sc.market_id
WHERE sc.is_active = true
    AND sc.expires_at > NOW()
ORDER BY urgency_score DESC
LIMIT 100;

CREATE UNIQUE INDEX IF NOT EXISTS idx_top_signals_mv_id ON top_signals_mv(id);

-- 3. Function to refresh signal cache
CREATE OR REPLACE FUNCTION refresh_signal_cache() RETURNS void AS $$
BEGIN
    -- Deactivate expired signals
    UPDATE signal_cache 
    SET is_active = false 
    WHERE expires_at <= NOW() AND is_active = true;
    
    -- Update existing signals
    UPDATE signal_cache sc
    SET 
        confidence = bbs.confidence,
        signal_strength = bbs.signal_strength,
        current_price = bbs.entry_price, -- Would come from live market data
        price_change_percent = ((bbs.entry_price - sc.entry_price) / sc.entry_price * 100),
        kelly_percentage = bbs.kelly_criterion,
        risk_reward_ratio = bbs.risk_reward_ratio,
        expected_value = bbs.position_size * 0.2, -- Simplified calculation
        trader_win_rate = bbs.trader_win_rate,
        trader_elite_score = bbs.trader_elite_score,
        last_updated = NOW()
    FROM best_bet_signals bbs
    WHERE sc.signal_id = bbs.id
        AND bbs.status = 'active'
        AND bbs.expires_at > NOW();
    
    -- Insert new signals
    INSERT INTO signal_cache (
        market_id,
        signal_id,
        confidence,
        signal_strength,
        entry_price,
        current_price,
        kelly_percentage,
        risk_reward_ratio,
        trader_address,
        trader_win_rate,
        trader_elite_score,
        expires_at
    )
    SELECT 
        bbs.market_id,
        bbs.id,
        bbs.confidence,
        bbs.signal_strength,
        bbs.entry_price,
        bbs.entry_price, -- Would come from live market data
        bbs.kelly_criterion,
        bbs.risk_reward_ratio,
        bbs.trader_address,
        bbs.trader_win_rate,
        bbs.trader_elite_score,
        bbs.expires_at
    FROM best_bet_signals bbs
    WHERE bbs.status = 'active'
        AND bbs.expires_at > NOW()
        AND NOT EXISTS (
            SELECT 1 FROM signal_cache sc 
            WHERE sc.signal_id = bbs.id
        )
    ON CONFLICT DO NOTHING;
    
    -- Refresh materialized view
    REFRESH MATERIALIZED VIEW CONCURRENTLY top_signals_mv;
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to track signal view
CREATE OR REPLACE FUNCTION track_signal_view(signal_cache_id UUID) 
RETURNS void AS $$
BEGIN
    UPDATE signal_cache 
    SET views_count = views_count + 1,
        last_updated = NOW()
    WHERE id = signal_cache_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to track copy trade
CREATE OR REPLACE FUNCTION track_copy_trade(
    signal_cache_id UUID,
    user_address TEXT,
    position_amount DECIMAL
) RETURNS UUID AS $$
DECLARE
    trade_id UUID;
BEGIN
    -- Update signal cache
    UPDATE signal_cache 
    SET copy_count = copy_count + 1,
        last_updated = NOW()
    WHERE id = signal_cache_id;
    
    -- Create copy trade record
    INSERT INTO copy_trades (
        signal_cache_id,
        user_address,
        position_amount,
        executed_at
    ) VALUES (
        signal_cache_id,
        user_address,
        position_amount,
        NOW()
    ) RETURNING id INTO trade_id;
    
    RETURN trade_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Create copy trades tracking table
CREATE TABLE IF NOT EXISTS copy_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_cache_id UUID NOT NULL REFERENCES signal_cache(id),
    user_address TEXT NOT NULL,
    
    -- Trade details
    position_amount DECIMAL(18, 2) NOT NULL,
    position_shares DECIMAL(18, 6),
    entry_price DECIMAL(10, 4),
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'filled', 'cancelled', 'expired')),
    
    -- Execution
    executed_at TIMESTAMP NOT NULL,
    filled_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    -- Results (for closed trades)
    exit_price DECIMAL(10, 4),
    profit_loss DECIMAL(18, 2),
    roi_percent DECIMAL(10, 2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copy_trades_signal ON copy_trades(signal_cache_id);
CREATE INDEX IF NOT EXISTS idx_copy_trades_user ON copy_trades(user_address);
CREATE INDEX IF NOT EXISTS idx_copy_trades_status ON copy_trades(status);
CREATE INDEX IF NOT EXISTS idx_copy_trades_executed ON copy_trades(executed_at DESC);

-- 7. Create real-time signal updates view
CREATE OR REPLACE VIEW real_time_signals AS
SELECT 
    sc.id,
    sc.market_id,
    m.question as market_question,
    m.category as market_category,
    sc.confidence,
    sc.signal_strength,
    sc.entry_price,
    sc.current_price,
    sc.price_change_percent,
    sc.kelly_percentage,
    sc.risk_reward_ratio,
    sc.expected_value,
    sc.trader_address,
    sc.trader_win_rate,
    sc.trader_elite_score,
    sc.views_count,
    sc.copy_count,
    sc.last_updated,
    sc.expires_at,
    -- Time until expiry
    EXTRACT(EPOCH FROM (sc.expires_at - NOW())) / 3600 as hours_until_expiry,
    -- Activity score (recent views + copies)
    sc.views_count + (sc.copy_count * 10) as activity_score,
    -- Price momentum
    CASE 
        WHEN sc.price_change_percent > 5 THEN 'strong_up'
        WHEN sc.price_change_percent > 2 THEN 'up'
        WHEN sc.price_change_percent < -5 THEN 'strong_down'
        WHEN sc.price_change_percent < -2 THEN 'down'
        ELSE 'stable'
    END as price_momentum
FROM signal_cache sc
JOIN markets m ON m.id = sc.market_id
WHERE sc.is_active = true
    AND sc.expires_at > NOW()
ORDER BY 
    CASE sc.signal_strength
        WHEN 'elite' THEN 4
        WHEN 'strong' THEN 3
        WHEN 'moderate' THEN 2
        ELSE 1
    END DESC,
    sc.confidence DESC,
    sc.last_updated DESC;

-- 8. Populate initial cache from existing signals
INSERT INTO signal_cache (
    market_id,
    signal_id,
    confidence,
    signal_strength,
    entry_price,
    current_price,
    kelly_percentage,
    risk_reward_ratio,
    trader_address,
    trader_win_rate,
    trader_elite_score,
    expires_at
)
SELECT 
    bbs.market_id,
    bbs.id,
    bbs.confidence,
    bbs.signal_strength,
    bbs.entry_price,
    bbs.entry_price,
    bbs.kelly_criterion,
    bbs.risk_reward_ratio,
    bbs.trader_address,
    bbs.trader_win_rate,
    bbs.trader_elite_score,
    bbs.expires_at
FROM best_bet_signals bbs
WHERE bbs.status = 'active'
    AND bbs.expires_at > NOW()
ON CONFLICT DO NOTHING;

-- 9. Create periodic refresh job (would be called by cron/scheduler)
-- Example: SELECT refresh_signal_cache(); -- Run every 5 minutes

-- Refresh materialized view
REFRESH MATERIALIZED VIEW top_signals_mv;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '✅ Signal Caching System Created!' as status;

SELECT 
    'signal_cache' as table_name,
    COUNT(*) as cached_signals,
    COUNT(*) FILTER (WHERE is_active = true) as active_signals,
    COUNT(*) FILTER (WHERE signal_strength = 'elite') as elite_signals
FROM signal_cache;

SELECT 
    'top_signals_mv' as view_name,
    COUNT(*) as top_signals
FROM top_signals_mv;

-- Show sample cached signals
SELECT '📊 Top 5 Cached Signals:' as info;
SELECT 
    signal_strength,
    ROUND(confidence, 0) || '%' as conf,
    ROUND(trader_win_rate, 1) || '%' as wr,
    copy_count,
    views_count
FROM signal_cache
WHERE is_active = true
ORDER BY 
    CASE signal_strength
        WHEN 'elite' THEN 4
        WHEN 'strong' THEN 3
        WHEN 'moderate' THEN 2
        ELSE 1
    END DESC,
    confidence DESC
LIMIT 5;
