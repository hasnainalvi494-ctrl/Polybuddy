-- ============================================================================
-- FINAL CORRECT DATA POPULATION
-- ============================================================================

-- 1. MARKET SNAPSHOTS (using correct columns)
INSERT INTO market_snapshots (market_id, price, spread, depth, volume_24h, liquidity, snapshot_at)
SELECT 
    m.id,
    (0.50 + RANDOM() * 0.40)::DECIMAL(10,4) as price,
    (0.02 + RANDOM() * 0.03)::DECIMAL(10,4) as spread,
    (5000 + RANDOM() * 15000)::DECIMAL(18,2) as depth,
    CAST(m.volume AS DECIMAL) * (0.8 + RANDOM() * 0.4) as volume_24h,
    CAST(m.liquidity AS DECIMAL) * (0.9 + RANDOM() * 0.2) as liquidity,
    NOW() - (n || ' hours')::INTERVAL as snapshot_at
FROM markets m
CROSS JOIN generate_series(1, 24) as n
WHERE m.volume IS NOT NULL AND m.volume != ''
LIMIT 500
ON CONFLICT DO NOTHING;

-- 2. RETAIL SIGNALS (using correct columns)
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
    'high' as confidence,
    true as is_favorable,
    jsonb_build_array(
        jsonb_build_object('text', 'High Volume', 'value', 2.5, 'unit', 'M'),
        jsonb_build_object('text', 'Good Liquidity', 'value', 500, 'unit', 'K'),
        jsonb_build_object('text', 'Active Trading', 'value', 85, 'unit', '%')
    ) as why_bullets,
    NOW() as computed_at
FROM markets m
WHERE m.volume IS NOT NULL AND m.volume != ''
LIMIT 10
ON CONFLICT DO NOTHING;

-- 3. MARKET BEHAVIOR DIMENSIONS (using correct columns)
INSERT INTO market_behavior_dimensions (
    market_id, 
    info_cadence, 
    info_structure, 
    liquidity_stability, 
    time_to_resolution,
    participant_concentration,
    behavior_cluster,
    cluster_confidence,
    retail_friendliness,
    computed_at
)
SELECT 
    m.id,
    (60 + RANDOM() * 30)::INT as info_cadence,
    (70 + RANDOM() * 20)::INT as info_structure,
    (75 + RANDOM() * 15)::INT as liquidity_stability,
    (7 + RANDOM() * 30)::INT as time_to_resolution,
    (40 + RANDOM() * 40)::INT as participant_concentration,
    'momentum'::behavior_cluster_type as behavior_cluster,
    (70 + RANDOM() * 20)::INT as cluster_confidence,
    'moderate'::retail_friendliness_type as retail_friendliness,
    NOW() as computed_at
FROM markets m
WHERE m.volume IS NOT NULL AND m.volume != ''
ON CONFLICT (market_id) DO UPDATE SET
    info_cadence = EXCLUDED.info_cadence,
    updated_at = NOW();

-- VERIFICATION
SELECT '✅ Data Population Complete!' as status;
SELECT 
    'Market Snapshots' as table_name, 
    COUNT(*) as count,
    MAX(snapshot_at) as latest
FROM market_snapshots
UNION ALL
SELECT 
    'Wallet Trades', 
    COUNT(*), 
    MAX(timestamp)
FROM wallet_trades
UNION ALL
SELECT 
    'Retail Signals', 
    COUNT(*), 
    MAX(computed_at)
FROM retail_signals
UNION ALL
SELECT 
    'Market Behavior', 
    COUNT(*), 
    MAX(computed_at)
FROM market_behavior_dimensions;

-- Show sample whale trade
SELECT '🐋 Sample Whale Trade:' as info;
SELECT 
    wallet_address, 
    side, 
    outcome, 
    size::DECIMAL(18,2) as amount_usd,
    timestamp 
FROM wallet_trades 
ORDER BY timestamp DESC 
LIMIT 3;
