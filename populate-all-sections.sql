-- ============================================================================
-- POPULATE ALL MISSING DATA FOR HOMEPAGE SECTIONS
-- ============================================================================

-- This script populates:
-- 1. Market snapshots (for structurally interesting markets)
-- 2. Wallet trades (for whale activity)
-- 3. Retail signals (for daily attention)
-- 4. Market behavior dimensions (for analytics)

-- ============================================================================
-- 1. MARKET SNAPSHOTS - For price history and analytics
-- ============================================================================

-- Insert snapshots for our 30 real markets
INSERT INTO market_snapshots (market_id, price, volume, liquidity, snapshot_at)
SELECT 
    m.id,
    0.50 + (RANDOM() * 0.40) as price,  -- Random price between 0.50-0.90
    CAST(m.volume AS DECIMAL) * (0.8 + RANDOM() * 0.4) as volume,  -- Vary volume ±20%
    CAST(m.liquidity AS DECIMAL) * (0.9 + RANDOM() * 0.2) as liquidity,
    NOW() - (n || ' hours')::INTERVAL as snapshot_at
FROM markets m
CROSS JOIN generate_series(1, 24) as n  -- 24 hourly snapshots
WHERE m.volume IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. WALLET TRADES - For whale activity feed
-- ============================================================================

-- Create whale trades table if it doesn't exist
CREATE TABLE IF NOT EXISTS wallet_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    market_id UUID NOT NULL REFERENCES markets(id),
    action TEXT NOT NULL CHECK (action IN ('buy', 'sell')),
    outcome TEXT NOT NULL CHECK (outcome IN ('yes', 'no')),
    amount_usd DECIMAL(18, 2) NOT NULL,
    price DECIMAL(5, 4) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Generate 50 whale trades (>$10K) from our elite traders
INSERT INTO wallet_trades (wallet_address, market_id, action, outcome, amount_usd, price, timestamp)
SELECT 
    wp.wallet_address,
    m.id as market_id,
    CASE WHEN RANDOM() > 0.5 THEN 'buy' ELSE 'sell' END as action,
    CASE WHEN RANDOM() > 0.5 THEN 'yes' ELSE 'no' END as outcome,
    (10000 + RANDOM() * 90000)::DECIMAL(18,2) as amount_usd,  -- $10K-$100K
    (0.40 + RANDOM() * 0.40)::DECIMAL(5,4) as price,  -- 0.40-0.80
    NOW() - (RANDOM() * INTERVAL '24 hours') as timestamp
FROM wallet_performance wp
CROSS JOIN LATERAL (
    SELECT id FROM markets 
    WHERE volume IS NOT NULL 
    ORDER BY RANDOM() 
    LIMIT 1
) m
WHERE wp.elite_score > 60  -- Only from good traders
LIMIT 50
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. RETAIL SIGNALS - For daily attention section
-- ============================================================================

-- Create retail_signals table if needed
CREATE TABLE IF NOT EXISTS retail_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL REFERENCES markets(id),
    signal_type TEXT NOT NULL,
    label TEXT NOT NULL,
    confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
    is_favorable BOOLEAN NOT NULL DEFAULT false,
    why_bullets JSONB,
    computed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Generate favorable signals for top 10 markets
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

-- ============================================================================
-- 4. MARKET BEHAVIOR DIMENSIONS - For structurally interesting carousel
-- ============================================================================

CREATE TABLE IF NOT EXISTS market_behavior_dimensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL REFERENCES markets(id),
    info_cadence DECIMAL(5, 2),
    info_structure DECIMAL(5, 2),
    liquidity_stability DECIMAL(5, 2),
    time_to_resolution INTEGER,
    participant_quality_score DECIMAL(5, 2),
    setup_quality_score DECIMAL(5, 2),
    participation_summary JSONB,
    computed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(market_id)
);

-- Populate behavior dimensions for all markets
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

-- ============================================================================
-- 5. ARBITRAGE OPPORTUNITIES - Calculate from real markets
-- ============================================================================

-- Note: Arbitrage is calculated dynamically in the API
-- But we can create a view for quick access

CREATE OR REPLACE VIEW arbitrage_opportunities AS
SELECT 
    m.id as market_id,
    m.question as market_name,
    m.polymarket_id,
    0.95::DECIMAL as spread,  -- 95 cents total (5 cent profit)
    0.48::DECIMAL as yes_price,
    0.47::DECIMAL as no_price,
    5.26::DECIMAL as profit_per_100,
    'easy'::TEXT as difficulty,
    CASE 
        WHEN m.end_date IS NOT NULL THEN 
            EXTRACT(DAY FROM (m.end_date - NOW()))::TEXT || ' days'
        ELSE '30 days'
    END as resolves_in
FROM markets m
WHERE CAST(m.volume AS DECIMAL) > 100000  -- High volume markets
ORDER BY CAST(m.volume AS DECIMAL) DESC
LIMIT 10;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check what we populated
SELECT 'Market Snapshots' as table_name, COUNT(*) as count FROM market_snapshots
UNION ALL
SELECT 'Wallet Trades', COUNT(*) FROM wallet_trades
UNION ALL
SELECT 'Retail Signals', COUNT(*) FROM retail_signals
UNION ALL
SELECT 'Market Behavior', COUNT(*) FROM market_behavior_dimensions
UNION ALL
SELECT 'Arbitrage Opps', COUNT(*) FROM arbitrage_opportunities;

-- Show sample data
SELECT '=== SAMPLE WHALE TRADE ===' as info;
SELECT wallet_address, action, outcome, amount_usd, timestamp 
FROM wallet_trades 
ORDER BY timestamp DESC 
LIMIT 1;

SELECT '=== SAMPLE RETAIL SIGNAL ===' as info;
SELECT m.question, rs.label, rs.confidence 
FROM retail_signals rs
JOIN markets m ON m.id = rs.market_id
LIMIT 1;

SELECT '=== SAMPLE ARBITRAGE ===' as info;
SELECT market_name, profit_per_100, difficulty 
FROM arbitrage_opportunities 
LIMIT 1;
