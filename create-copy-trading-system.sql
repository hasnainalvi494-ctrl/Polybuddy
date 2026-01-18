-- ============================================================================
-- COPY TRADING SYSTEM - DATABASE SCHEMA
-- ============================================================================

-- 1. Trader Following Table
CREATE TABLE IF NOT EXISTS trader_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address TEXT NOT NULL,
    trader_address TEXT NOT NULL,
    
    -- Following settings
    is_active BOOLEAN DEFAULT true,
    copy_percentage DECIMAL(5, 2) NOT NULL DEFAULT 100.00 CHECK (copy_percentage >= 10 AND copy_percentage <= 100),
    auto_copy_enabled BOOLEAN DEFAULT true,
    
    -- Risk limits
    max_position_size DECIMAL(18, 2),
    max_daily_loss DECIMAL(18, 2),
    max_open_positions INTEGER DEFAULT 10,
    
    -- Copy settings
    copy_stop_loss BOOLEAN DEFAULT true,
    copy_take_profit BOOLEAN DEFAULT true,
    sync_exits BOOLEAN DEFAULT true,
    
    -- Performance tracking
    total_copied_trades INTEGER DEFAULT 0,
    profitable_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    total_profit_loss DECIMAL(18, 2) DEFAULT 0,
    roi_percentage DECIMAL(10, 2) DEFAULT 0,
    
    -- Metadata
    followed_at TIMESTAMP DEFAULT NOW(),
    last_copy_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_address, trader_address)
);

CREATE INDEX IF NOT EXISTS idx_trader_follows_user ON trader_follows(user_address);
CREATE INDEX IF NOT EXISTS idx_trader_follows_trader ON trader_follows(trader_address);
CREATE INDEX IF NOT EXISTS idx_trader_follows_active ON trader_follows(is_active) WHERE is_active = true;

-- 2. Copied Positions Table
CREATE TABLE IF NOT EXISTS copied_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address TEXT NOT NULL,
    trader_address TEXT NOT NULL,
    follow_id UUID REFERENCES trader_follows(id),
    
    -- Original trade info
    original_trade_id TEXT,
    market_id UUID REFERENCES markets(id),
    signal_id UUID REFERENCES best_bet_signals(id),
    
    -- Position details
    outcome TEXT NOT NULL CHECK (outcome IN ('yes', 'no')),
    entry_price DECIMAL(10, 4) NOT NULL,
    position_size DECIMAL(18, 2) NOT NULL,
    shares DECIMAL(18, 6) NOT NULL,
    
    -- Risk management
    stop_loss DECIMAL(10, 4),
    take_profit DECIMAL(10, 4),
    
    -- Execution
    copy_percentage DECIMAL(5, 2) NOT NULL,
    executed_at TIMESTAMP NOT NULL,
    
    -- Current status
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'stopped_out', 'target_hit', 'cancelled')),
    current_price DECIMAL(10, 4),
    unrealized_pnl DECIMAL(18, 2),
    
    -- Close details
    exit_price DECIMAL(10, 4),
    exit_reason TEXT,
    closed_at TIMESTAMP,
    realized_pnl DECIMAL(18, 2),
    roi_percentage DECIMAL(10, 2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copied_positions_user ON copied_positions(user_address);
CREATE INDEX IF NOT EXISTS idx_copied_positions_trader ON copied_positions(trader_address);
CREATE INDEX IF NOT EXISTS idx_copied_positions_status ON copied_positions(status);
CREATE INDEX IF NOT EXISTS idx_copied_positions_market ON copied_positions(market_id);
CREATE INDEX IF NOT EXISTS idx_copied_positions_follow ON copied_positions(follow_id);

-- 3. Copy Trade Execution Log
CREATE TABLE IF NOT EXISTS copy_trade_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address TEXT NOT NULL,
    trader_address TEXT NOT NULL,
    follow_id UUID REFERENCES trader_follows(id),
    
    -- Execution details
    action TEXT NOT NULL CHECK (action IN ('copy_open', 'copy_close', 'stop_loss_hit', 'take_profit_hit', 'sync_exit', 'manual_close')),
    original_trade_id TEXT,
    market_id UUID,
    
    -- Position info
    position_size DECIMAL(18, 2),
    price DECIMAL(10, 4),
    outcome TEXT,
    
    -- Result
    success BOOLEAN NOT NULL,
    error_message TEXT,
    
    -- Performance
    pnl DECIMAL(18, 2),
    
    executed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copy_trade_log_user ON copy_trade_log(user_address);
CREATE INDEX IF NOT EXISTS idx_copy_trade_log_trader ON copy_trade_log(trader_address);
CREATE INDEX IF NOT EXISTS idx_copy_trade_log_executed ON copy_trade_log(executed_at DESC);

-- 4. Copy Trading Settings
CREATE TABLE IF NOT EXISTS copy_trading_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address TEXT NOT NULL UNIQUE,
    
    -- Global settings
    total_copy_bankroll DECIMAL(18, 2) NOT NULL,
    max_risk_per_trade DECIMAL(5, 2) DEFAULT 5.00,
    max_total_exposure DECIMAL(5, 2) DEFAULT 50.00,
    
    -- Auto-copy rules
    auto_copy_enabled BOOLEAN DEFAULT true,
    min_trader_elite_score DECIMAL(5, 2) DEFAULT 75.00,
    min_signal_confidence DECIMAL(5, 2) DEFAULT 80.00,
    
    -- Risk controls
    stop_copy_on_drawdown DECIMAL(5, 2) DEFAULT 20.00,
    daily_loss_limit DECIMAL(18, 2),
    max_concurrent_positions INTEGER DEFAULT 20,
    
    -- Notifications
    notify_on_copy BOOLEAN DEFAULT true,
    notify_on_close BOOLEAN DEFAULT true,
    notify_on_stop_loss BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copy_settings_user ON copy_trading_settings(user_address);

-- 5. Real-time Position Monitoring View
CREATE OR REPLACE VIEW active_copied_positions AS
SELECT 
    cp.id,
    cp.user_address,
    cp.trader_address,
    tf.copy_percentage,
    m.question as market_question,
    m.category as market_category,
    cp.outcome,
    cp.entry_price,
    cp.current_price,
    cp.position_size,
    cp.shares,
    cp.stop_loss,
    cp.take_profit,
    cp.unrealized_pnl,
    cp.executed_at,
    -- Calculate current P&L percentage
    CASE 
        WHEN cp.outcome = 'yes' THEN 
            ((cp.current_price - cp.entry_price) / cp.entry_price * 100)
        ELSE 
            ((cp.entry_price - cp.current_price) / cp.entry_price * 100)
    END as pnl_percentage,
    -- Check if stop loss should trigger
    CASE 
        WHEN cp.outcome = 'yes' AND cp.current_price <= cp.stop_loss THEN true
        WHEN cp.outcome = 'no' AND cp.current_price >= cp.stop_loss THEN true
        ELSE false
    END as should_stop_out,
    -- Check if take profit should trigger
    CASE 
        WHEN cp.outcome = 'yes' AND cp.current_price >= cp.take_profit THEN true
        WHEN cp.outcome = 'no' AND cp.current_price <= cp.take_profit THEN true
        ELSE false
    END as should_take_profit,
    -- Days open
    EXTRACT(EPOCH FROM (NOW() - cp.executed_at)) / 86400 as days_open
FROM copied_positions cp
JOIN trader_follows tf ON cp.follow_id = tf.id
LEFT JOIN markets m ON cp.market_id = m.id
WHERE cp.status = 'open';

-- 6. Trader Following Performance View
CREATE OR REPLACE VIEW trader_follow_performance AS
SELECT 
    tf.id as follow_id,
    tf.user_address,
    tf.trader_address,
    tf.copy_percentage,
    tf.is_active,
    tf.total_copied_trades,
    tf.profitable_trades,
    tf.losing_trades,
    tf.total_profit_loss,
    tf.roi_percentage,
    -- Calculate win rate
    CASE 
        WHEN tf.total_copied_trades > 0 THEN 
            (tf.profitable_trades::DECIMAL / tf.total_copied_trades * 100)
        ELSE 0
    END as win_rate,
    -- Average P&L per trade
    CASE 
        WHEN tf.total_copied_trades > 0 THEN 
            tf.total_profit_loss / tf.total_copied_trades
        ELSE 0
    END as avg_pnl_per_trade,
    -- Trader info
    wp.elite_score as trader_elite_score,
    wp.win_rate as trader_win_rate,
    wp.total_profit as trader_total_profit,
    -- Open positions
    (SELECT COUNT(*) FROM copied_positions cp 
     WHERE cp.follow_id = tf.id AND cp.status = 'open') as open_positions,
    tf.followed_at,
    tf.last_copy_at
FROM trader_follows tf
LEFT JOIN wallet_performance wp ON tf.trader_address = wp.wallet_address
WHERE tf.is_active = true;

-- 7. User Copy Trading Dashboard View
CREATE OR REPLACE VIEW user_copy_dashboard AS
SELECT 
    cts.user_address,
    cts.total_copy_bankroll,
    cts.max_risk_per_trade,
    -- Following stats
    (SELECT COUNT(*) FROM trader_follows 
     WHERE user_address = cts.user_address AND is_active = true) as following_count,
    -- Position stats
    (SELECT COUNT(*) FROM copied_positions 
     WHERE user_address = cts.user_address AND status = 'open') as open_positions,
    (SELECT COALESCE(SUM(position_size), 0) FROM copied_positions 
     WHERE user_address = cts.user_address AND status = 'open') as total_exposure,
    (SELECT COALESCE(SUM(unrealized_pnl), 0) FROM copied_positions 
     WHERE user_address = cts.user_address AND status = 'open') as unrealized_pnl,
    -- Overall performance
    (SELECT COALESCE(SUM(realized_pnl), 0) FROM copied_positions 
     WHERE user_address = cts.user_address AND status IN ('closed', 'stopped_out', 'target_hit')) as total_realized_pnl,
    (SELECT COUNT(*) FROM copied_positions 
     WHERE user_address = cts.user_address 
     AND status IN ('closed', 'stopped_out', 'target_hit')
     AND realized_pnl > 0) as total_wins,
    (SELECT COUNT(*) FROM copied_positions 
     WHERE user_address = cts.user_address 
     AND status IN ('closed', 'stopped_out', 'target_hit')
     AND realized_pnl < 0) as total_losses,
    cts.created_at
FROM copy_trading_settings cts;

-- 8. Functions for copy trading

-- Function to calculate position size based on copy percentage
CREATE OR REPLACE FUNCTION calculate_copy_position_size(
    original_size DECIMAL,
    copy_percentage DECIMAL,
    user_bankroll DECIMAL,
    max_position_size DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    calculated_size DECIMAL;
BEGIN
    -- Calculate based on percentage
    calculated_size := original_size * (copy_percentage / 100);
    
    -- Apply max position size if set
    IF max_position_size IS NOT NULL AND calculated_size > max_position_size THEN
        calculated_size := max_position_size;
    END IF;
    
    -- Ensure doesn't exceed user bankroll
    IF calculated_size > user_bankroll THEN
        calculated_size := user_bankroll * 0.95; -- Use 95% max
    END IF;
    
    RETURN calculated_size;
END;
$$ LANGUAGE plpgsql;

-- Function to update follow performance
CREATE OR REPLACE FUNCTION update_follow_performance(follow_id_param UUID) 
RETURNS void AS $$
BEGIN
    UPDATE trader_follows
    SET 
        total_copied_trades = (
            SELECT COUNT(*) FROM copied_positions 
            WHERE follow_id = follow_id_param
        ),
        profitable_trades = (
            SELECT COUNT(*) FROM copied_positions 
            WHERE follow_id = follow_id_param 
            AND status IN ('closed', 'target_hit') 
            AND realized_pnl > 0
        ),
        losing_trades = (
            SELECT COUNT(*) FROM copied_positions 
            WHERE follow_id = follow_id_param 
            AND status IN ('closed', 'stopped_out') 
            AND realized_pnl < 0
        ),
        total_profit_loss = (
            SELECT COALESCE(SUM(realized_pnl), 0) FROM copied_positions 
            WHERE follow_id = follow_id_param 
            AND status IN ('closed', 'stopped_out', 'target_hit')
        ),
        roi_percentage = (
            SELECT CASE 
                WHEN SUM(position_size) > 0 THEN 
                    (SUM(realized_pnl) / SUM(position_size) * 100)
                ELSE 0
            END
            FROM copied_positions 
            WHERE follow_id = follow_id_param 
            AND status IN ('closed', 'stopped_out', 'target_hit')
        ),
        updated_at = NOW()
    WHERE id = follow_id_param;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '✅ Copy Trading System Created!' as status;

SELECT 'Tables Created:' as info;
SELECT 
    'trader_follows' as table_name,
    COUNT(*) as count 
FROM trader_follows
UNION ALL
SELECT 'copied_positions', COUNT(*) FROM copied_positions
UNION ALL
SELECT 'copy_trade_log', COUNT(*) FROM copy_trade_log
UNION ALL
SELECT 'copy_trading_settings', COUNT(*) FROM copy_trading_settings;

SELECT 'Views Created:' as info;
SELECT 'active_copied_positions' as view_name
UNION ALL
SELECT 'trader_follow_performance'
UNION ALL
SELECT 'user_copy_dashboard';

SELECT 'Functions Created:' as info;
SELECT 'calculate_copy_position_size()' as function_name
UNION ALL
SELECT 'update_follow_performance()';
