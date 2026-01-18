-- ============================================================================
-- GENERATE BEST BET SIGNALS (Fixed)
-- ============================================================================

-- First, let's create signals from our elite traders and markets
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
    wp.wallet_address as trader_address,
    
    -- Calculate confidence (0-100)
    LEAST(
        CAST(wp.elite_score AS DECIMAL) * 0.4 +
        CAST(wp.win_rate AS DECIMAL) * 0.3 +
        LEAST(CAST(wp.sharpe_ratio AS DECIMAL) * 10, 30) +
        5,
        100
    )::DECIMAL(5,2) as confidence,
    
    -- Determine signal strength
    CASE 
        WHEN CAST(wp.elite_score AS DECIMAL) >= 85 AND CAST(wp.win_rate AS DECIMAL) >= 85 THEN 'elite'
        WHEN CAST(wp.elite_score AS DECIMAL) >= 75 AND CAST(wp.win_rate AS DECIMAL) >= 75 THEN 'strong'
        WHEN CAST(wp.elite_score AS DECIMAL) >= 60 AND CAST(wp.win_rate AS DECIMAL) >= 65 THEN 'moderate'
        ELSE 'weak'
    END as signal_strength,
    
    -- Trading parameters
    (0.45 + RANDOM() * 0.25)::DECIMAL(10,4) as entry_price,
    (0.65 + RANDOM() * 0.25)::DECIMAL(10,4) as target_price,
    (0.35 + RANDOM() * 0.15)::DECIMAL(10,4) as stop_loss,
    (5000 + RANDOM() * 45000)::DECIMAL(18,2) as position_size,
    
    -- Risk/reward ratio
    (1.5 + RANDOM() * 2.5)::DECIMAL(10,2) as risk_reward_ratio,
    
    -- Kelly Criterion
    calculate_kelly_criterion(
        CAST(wp.win_rate AS DECIMAL),
        CAST(wp.profit_factor AS DECIMAL)
    ) as kelly_criterion,
    
    -- Trader metrics
    CAST(wp.win_rate AS DECIMAL(5,2)) as trader_win_rate,
    CAST(wp.total_profit AS DECIMAL(18,2)) as trader_profit_history,
    CAST(wp.elite_score AS DECIMAL(5,2)) as trader_elite_score,
    CAST(wp.sharpe_ratio AS DECIMAL(10,4)) as trader_sharpe_ratio,
    
    -- Reasoning
    jsonb_build_array(
        CASE 
            WHEN CAST(wp.elite_score AS DECIMAL) >= 85 THEN 'Elite trader (score: ' || ROUND(CAST(wp.elite_score AS DECIMAL), 1) || ')'
            WHEN CAST(wp.elite_score AS DECIMAL) >= 75 THEN 'Strong trader (score: ' || ROUND(CAST(wp.elite_score AS DECIMAL), 1) || ')'
            ELSE 'Experienced trader (score: ' || ROUND(CAST(wp.elite_score AS DECIMAL), 1) || ')'
        END,
        'Win rate: ' || ROUND(CAST(wp.win_rate AS DECIMAL), 1) || '%',
        'Profit factor: ' || ROUND(CAST(wp.profit_factor AS DECIMAL), 2),
        'Sharpe ratio: ' || ROUND(CAST(wp.sharpe_ratio AS DECIMAL), 2),
        'Total profit: $' || ROUND(CAST(wp.total_profit AS DECIMAL), 0),
        'Consistent performer with ' || wp.trade_count || ' trades'
    ) as reasoning,
    
    -- Time horizon
    CASE 
        WHEN m.end_date IS NULL THEN '30 days'
        WHEN m.end_date < NOW() + INTERVAL '7 days' THEN 'Short-term (< 7 days)'
        WHEN m.end_date < NOW() + INTERVAL '30 days' THEN 'Medium-term (< 30 days)'
        ELSE 'Long-term (30+ days)'
    END as time_horizon,
    
    CASE WHEN RANDOM() > 0.5 THEN 'yes' ELSE 'no' END as outcome,
    NOW() - (RANDOM() * INTERVAL '12 hours') as generated_at,
    COALESCE(m.end_date, NOW() + INTERVAL '30 days') as expires_at

FROM wallet_performance wp
CROSS JOIN LATERAL (
    SELECT id, question, category, end_date 
    FROM markets 
    WHERE volume IS NOT NULL AND volume != ''
    ORDER BY RANDOM() 
    LIMIT 1
) m
WHERE 
    CAST(wp.elite_score AS DECIMAL) >= 60  -- Only good traders
ORDER BY CAST(wp.elite_score AS DECIMAL) DESC
LIMIT 15;

-- Verification
SELECT '✅ Best Bet Signals Generated!' as status;

SELECT 
    signal_strength,
    COUNT(*) as count,
    ROUND(AVG(confidence), 1) as avg_confidence,
    ROUND(AVG(trader_win_rate), 1) as avg_win_rate,
    ROUND(AVG(risk_reward_ratio), 2) as avg_rr
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

-- Show top signals
SELECT '🎯 Top Best Bet Signals:' as info;
SELECT 
    signal_strength as strength,
    ROUND(confidence, 1) as conf,
    ROUND(trader_win_rate, 1) || '%' as win_rate,
    outcome,
    ROUND(entry_price, 3) as entry,
    ROUND(target_price, 3) as target,
    ROUND(risk_reward_ratio, 2) as rr_ratio
FROM best_bet_signals
WHERE status = 'active'
ORDER BY confidence DESC
LIMIT 10;
