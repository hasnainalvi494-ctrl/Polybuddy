-- ============================================================================
-- POPULATE DATA FOR ALL HOMEPAGE SECTIONS (CORRECTED)
-- ============================================================================

-- 1. MARKET SNAPSHOTS
INSERT INTO market_snapshots (market_id, price, volume, liquidity, snapshot_at)
SELECT 
    m.id,
    0.50 + (RANDOM() * 0.40) as price,
    CAST(m.volume AS DECIMAL) * (0.8 + RANDOM() * 0.4) as volume,
    CAST(m.liquidity AS DECIMAL) * (0.9 + RANDOM() * 0.2) as liquidity,
    NOW() - (n || ' hours')::INTERVAL as snapshot_at
FROM markets m
CROSS JOIN generate_series(1, 24) as n
WHERE m.volume IS NOT NULL
LIMIT 500
ON CONFLICT DO NOTHING;

-- 2. WALLET TRADES (for whale activity)
INSERT INTO wallet_trades (wallet_address, market_id, side, outcome, entry_price, size, profit, timestamp)
SELECT 
    wp.wallet_address,
    m.polymarket_id as market_id,
    CASE WHEN RANDOM() > 0.5 THEN 'buy' ELSE 'sell' END as side,
    CASE WHEN RANDOM() > 0.5 THEN 'yes' ELSE 'no' END as outcome,
    (0.40 + RANDOM() * 0.40)::DECIMAL(10,4) as entry_price,
    (10000 + RANDOM() * 90000)::DECIMAL(18,8) as size,
    (1000 + RANDOM() * 5000)::DECIMAL(18,2) as profit,
    NOW() - (RANDOM() * INTERVAL '24 hours') as timestamp
FROM wallet_performance wp
CROSS JOIN LATERAL (
    SELECT id, polymarket_id FROM markets 
    WHERE volume IS NOT NULL 
    ORDER BY RANDOM() 
    LIMIT 1
) m
WHERE wp.elite_score > 60
LIMIT 50
ON CONFLICT DO NOTHING;

-- 3. RETAIL SIGNALS
INSERT INTO retail_signals (market_id, signal_type, label, confidence, is_favorable, why_bullets, computed_at)
SELECT 
    m.id,
    CASE (ROW_NUMBER() OVER ())::INT % 4
        WHEN 0 THEN 'favorable_structure'
        WHEN 1 THEN 'structural_mispricing'
        WHEN 2 THEN 'event_window'
        ELSE 'retail_friendliness'
    END as signal_type,
    CASE (ROW_NUMBER() OVER ())::INT % 4
        WHEN 0 THEN 'Clean Setup'
        WHEN 1 THEN 'Value Play'
        WHEN 2 THEN 'Event Catalyst'
        ELSE 'Retail Edge'
    END as label,
    CASE 
        WHEN CAST(m.volume AS DECIMAL) > 1000000 THEN 'high'
        WHEN CAST(m.volume AS DECIMAL) > 500000 THEN 'medium'
        ELSE 'low'
    END as confidence,
    true as is_favorable,
    jsonb_build_array(
        jsonb_build_object('text', 'High Volume', 'value', CAST(m.volume AS DECIMAL) / 1000000, 'unit', 'M'),
        jsonb_build_object('text', 'Good Liquidity', 'value', CAST(m.liquidity AS DECIMAL) / 1000, 'unit', 'K'),
        jsonb_build_object('text', 'Active Trading', 'value', 85, 'unit', '%')
    ) as why_bullets,
    NOW() as computed_at
FROM markets m
WHERE m.volume IS NOT NULL
ORDER BY CAST(m.volume AS DECIMAL) DESC
LIMIT 10
ON CONFLICT DO NOTHING;

-- 4. MARKET BEHAVIOR DIMENSIONS
INSERT INTO market_behavior_dimensions (
    market_id, 
    info_cadence, 
    info_structure, 
    liquidity_stability, 
    time_to_resolution,
    participant_quality_score,
    setup_quality_score,
    participation_summary,
    computed_at
)
SELECT 
    m.id,
    (60 + RANDOM() * 30)::DECIMAL(5,2) as info_cadence,
    (70 + RANDOM() * 20)::DECIMAL(5,2) as info_structure,
    (75 + RANDOM() * 15)::DECIMAL(5,2) as liquidity_stability,
    (7 + RANDOM() * 30)::INT as time_to_resolution,
    (65 + RANDOM() * 25)::DECIMAL(5,2) as participant_quality_score,
    (70 + RANDOM() * 20)::DECIMAL(5,2) as setup_quality_score,
    jsonb_build_object(
        'totalParticipants', (50 + RANDOM() * 200)::INT,
        'eliteCount', (5 + RANDOM() * 15)::INT,
        'avgTradeSize', (500 + RANDOM() * 2000)::INT
    ) as participation_summary,
    NOW() as computed_at
FROM markets m
WHERE m.volume IS NOT NULL
ON CONFLICT (market_id) DO UPDATE SET
    participant_quality_score = EXCLUDED.participant_quality_score,
    setup_quality_score = EXCLUDED.setup_quality_score,
    updated_at = NOW();

-- VERIFICATION
SELECT 'Data Population Complete!' as status;
SELECT 'Market Snapshots' as table_name, COUNT(*) as count FROM market_snapshots
UNION ALL
SELECT 'Wallet Trades', COUNT(*) FROM wallet_trades
UNION ALL
SELECT 'Retail Signals', COUNT(*) FROM retail_signals
UNION ALL
SELECT 'Market Behavior', COUNT(*) FROM market_behavior_dimensions;
