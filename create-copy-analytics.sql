-- ============================================================================
-- COPY TRADE ANALYTICS SYSTEM
-- ============================================================================

-- 1. Enhanced Copy Trades Table with Analytics
ALTER TABLE copied_positions ADD COLUMN IF NOT EXISTS 
  is_manual BOOLEAN DEFAULT false;

ALTER TABLE copied_positions ADD COLUMN IF NOT EXISTS 
  manual_override_reason TEXT;

ALTER TABLE copied_positions ADD COLUMN IF NOT EXISTS 
  original_signal_confidence DECIMAL(5, 2);

-- 2. Copy Performance Analytics Table
CREATE TABLE IF NOT EXISTS copy_performance_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address TEXT NOT NULL,
    analysis_period TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'all_time'
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    
    -- Copied trades performance
    total_copied_trades INTEGER DEFAULT 0,
    copied_wins INTEGER DEFAULT 0,
    copied_losses INTEGER DEFAULT 0,
    copied_total_pnl DECIMAL(18, 2) DEFAULT 0,
    copied_roi DECIMAL(10, 2) DEFAULT 0,
    copied_win_rate DECIMAL(5, 2) DEFAULT 0,
    copied_avg_pnl_per_trade DECIMAL(18, 2) DEFAULT 0,
    copied_sharpe_ratio DECIMAL(10, 4) DEFAULT 0,
    
    -- Manual trades performance
    total_manual_trades INTEGER DEFAULT 0,
    manual_wins INTEGER DEFAULT 0,
    manual_losses INTEGER DEFAULT 0,
    manual_total_pnl DECIMAL(18, 2) DEFAULT 0,
    manual_roi DECIMAL(10, 2) DEFAULT 0,
    manual_win_rate DECIMAL(5, 2) DEFAULT 0,
    manual_avg_pnl_per_trade DECIMAL(18, 2) DEFAULT 0,
    manual_sharpe_ratio DECIMAL(10, 4) DEFAULT 0,
    
    -- Comparison metrics
    copy_advantage DECIMAL(10, 2) DEFAULT 0, -- % difference in ROI
    better_strategy TEXT, -- 'copied', 'manual', 'equal'
    
    -- Risk-adjusted metrics
    risk_adjusted_copied_return DECIMAL(10, 4) DEFAULT 0,
    risk_adjusted_manual_return DECIMAL(10, 4) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copy_performance_user ON copy_performance_analytics(user_address);
CREATE INDEX IF NOT EXISTS idx_copy_performance_period ON copy_performance_analytics(analysis_period, period_start);

-- 3. Trader Performance by Follower Table
CREATE TABLE IF NOT EXISTS trader_follower_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address TEXT NOT NULL,
    trader_address TEXT NOT NULL,
    follow_id UUID REFERENCES trader_follows(id),
    
    -- Weekly performance
    week_start DATE NOT NULL,
    
    -- Trading activity
    trades_this_week INTEGER DEFAULT 0,
    wins_this_week INTEGER DEFAULT 0,
    losses_this_week INTEGER DEFAULT 0,
    
    -- Financial metrics
    pnl_this_week DECIMAL(18, 2) DEFAULT 0,
    roi_this_week DECIMAL(10, 2) DEFAULT 0,
    best_trade_pnl DECIMAL(18, 2) DEFAULT 0,
    worst_trade_pnl DECIMAL(18, 2) DEFAULT 0,
    
    -- Consistency metrics
    win_streak INTEGER DEFAULT 0,
    loss_streak INTEGER DEFAULT 0,
    
    -- Comparison to trader's overall stats
    trader_win_rate_snapshot DECIMAL(5, 2),
    follower_win_rate_this_week DECIMAL(5, 2),
    tracking_accuracy DECIMAL(5, 2), -- How well follower tracked trader
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_address, trader_address, week_start)
);

CREATE INDEX IF NOT EXISTS idx_trader_follower_perf_user ON trader_follower_performance(user_address);
CREATE INDEX IF NOT EXISTS idx_trader_follower_perf_trader ON trader_follower_performance(trader_address);
CREATE INDEX IF NOT EXISTS idx_trader_follower_perf_week ON trader_follower_performance(week_start DESC);

-- 4. Copy Trading Metrics Summary View
CREATE OR REPLACE VIEW copy_trading_metrics_summary AS
SELECT 
    tf.user_address,
    tf.trader_address,
    tf.copy_percentage,
    
    -- Overall performance
    COUNT(cp.id) as total_copied_trades,
    COUNT(*) FILTER (WHERE cp.realized_pnl > 0) as winning_trades,
    COUNT(*) FILTER (WHERE cp.realized_pnl < 0) as losing_trades,
    COUNT(*) FILTER (WHERE cp.status = 'open') as open_trades,
    
    -- Financial metrics
    COALESCE(SUM(cp.realized_pnl) FILTER (WHERE cp.status IN ('closed', 'stopped_out', 'target_hit')), 0) as total_realized_pnl,
    COALESCE(SUM(cp.unrealized_pnl) FILTER (WHERE cp.status = 'open'), 0) as total_unrealized_pnl,
    COALESCE(SUM(cp.position_size), 0) as total_capital_deployed,
    
    -- Performance ratios
    CASE 
        WHEN SUM(cp.position_size) > 0 THEN 
            (SUM(cp.realized_pnl) FILTER (WHERE cp.status IN ('closed', 'stopped_out', 'target_hit')) / SUM(cp.position_size) * 100)
        ELSE 0
    END as roi_percentage,
    
    CASE 
        WHEN COUNT(*) FILTER (WHERE cp.status IN ('closed', 'stopped_out', 'target_hit')) > 0 THEN
            (COUNT(*) FILTER (WHERE cp.realized_pnl > 0)::DECIMAL / 
             COUNT(*) FILTER (WHERE cp.status IN ('closed', 'stopped_out', 'target_hit')) * 100)
        ELSE 0
    END as win_rate,
    
    -- Average metrics
    AVG(cp.realized_pnl) FILTER (WHERE cp.status IN ('closed', 'stopped_out', 'target_hit')) as avg_pnl_per_trade,
    AVG(cp.roi_percentage) FILTER (WHERE cp.status IN ('closed', 'stopped_out', 'target_hit')) as avg_roi_per_trade,
    
    -- Risk metrics
    MAX(ABS(cp.realized_pnl)) FILTER (WHERE cp.realized_pnl < 0) as max_loss,
    MAX(cp.realized_pnl) FILTER (WHERE cp.realized_pnl > 0) as max_win,
    
    -- Timing metrics
    AVG(EXTRACT(EPOCH FROM (cp.closed_at - cp.executed_at)) / 3600) FILTER (WHERE cp.closed_at IS NOT NULL) as avg_hold_hours,
    
    -- Latest activity
    MAX(cp.executed_at) as last_copy_at,
    MAX(cp.closed_at) as last_close_at
    
FROM trader_follows tf
LEFT JOIN copied_positions cp ON cp.follow_id = tf.id
WHERE tf.is_active = true
GROUP BY tf.user_address, tf.trader_address, tf.copy_percentage;

-- 5. Manual vs Copied Performance Comparison View
CREATE OR REPLACE VIEW manual_vs_copied_comparison AS
SELECT 
    user_address,
    
    -- Copied performance
    SUM(CASE WHEN is_manual = false THEN 1 ELSE 0 END) as copied_count,
    SUM(CASE WHEN is_manual = false AND realized_pnl > 0 THEN 1 ELSE 0 END) as copied_wins,
    COALESCE(AVG(realized_pnl) FILTER (WHERE is_manual = false AND status IN ('closed', 'stopped_out', 'target_hit')), 0) as copied_avg_pnl,
    COALESCE(AVG(roi_percentage) FILTER (WHERE is_manual = false AND status IN ('closed', 'stopped_out', 'target_hit')), 0) as copied_avg_roi,
    
    -- Manual performance
    SUM(CASE WHEN is_manual = true THEN 1 ELSE 0 END) as manual_count,
    SUM(CASE WHEN is_manual = true AND realized_pnl > 0 THEN 1 ELSE 0 END) as manual_wins,
    COALESCE(AVG(realized_pnl) FILTER (WHERE is_manual = true AND status IN ('closed', 'stopped_out', 'target_hit')), 0) as manual_avg_pnl,
    COALESCE(AVG(roi_percentage) FILTER (WHERE is_manual = true AND status IN ('closed', 'stopped_out', 'target_hit')), 0) as manual_avg_roi,
    
    -- Comparison
    CASE 
        WHEN AVG(roi_percentage) FILTER (WHERE is_manual = false) > AVG(roi_percentage) FILTER (WHERE is_manual = true) THEN 'copied'
        WHEN AVG(roi_percentage) FILTER (WHERE is_manual = true) > AVG(roi_percentage) FILTER (WHERE is_manual = false) THEN 'manual'
        ELSE 'equal'
    END as better_strategy
    
FROM copied_positions
WHERE status IN ('closed', 'stopped_out', 'target_hit')
GROUP BY user_address;

-- 6. Risk-Adjusted Copy Trading Metrics View
CREATE OR REPLACE VIEW risk_adjusted_copy_metrics AS
SELECT 
    user_address,
    
    -- Returns
    AVG(roi_percentage) FILTER (WHERE is_manual = false) as avg_copied_return,
    STDDEV(roi_percentage) FILTER (WHERE is_manual = false) as copied_return_volatility,
    
    -- Risk-adjusted return (Sharpe-like)
    CASE 
        WHEN STDDEV(roi_percentage) FILTER (WHERE is_manual = false) > 0 THEN
            AVG(roi_percentage) FILTER (WHERE is_manual = false) / STDDEV(roi_percentage) FILTER (WHERE is_manual = false)
        ELSE 0
    END as copied_sharpe_ratio,
    
    -- Drawdown metrics
    MIN(roi_percentage) FILTER (WHERE is_manual = false) as max_copied_drawdown,
    
    -- Consistency
    COUNT(*) FILTER (WHERE is_manual = false AND roi_percentage > 0)::DECIMAL / 
    NULLIF(COUNT(*) FILTER (WHERE is_manual = false), 0) * 100 as copied_consistency_score,
    
    -- Capital efficiency
    AVG(roi_percentage / EXTRACT(EPOCH FROM (closed_at - executed_at)) * 86400) FILTER (WHERE is_manual = false AND closed_at IS NOT NULL) as copied_daily_return_rate
    
FROM copied_positions
WHERE status IN ('closed', 'stopped_out', 'target_hit')
GROUP BY user_address;

-- 7. Function to Calculate Copy Performance Analytics
CREATE OR REPLACE FUNCTION calculate_copy_performance(
    user_addr TEXT,
    period TEXT DEFAULT 'all_time'
) RETURNS TABLE (
    copied_trades INT,
    copied_roi DECIMAL,
    manual_trades INT,
    manual_roi DECIMAL,
    advantage DECIMAL,
    better_strat TEXT
) AS $$
DECLARE
    start_date TIMESTAMP;
BEGIN
    -- Determine period start
    start_date := CASE period
        WHEN 'daily' THEN NOW() - INTERVAL '1 day'
        WHEN 'weekly' THEN NOW() - INTERVAL '7 days'
        WHEN 'monthly' THEN NOW() - INTERVAL '30 days'
        ELSE '1970-01-01'::TIMESTAMP
    END;
    
    RETURN QUERY
    SELECT 
        COUNT(*)::INT FILTER (WHERE cp.is_manual = false) as copied_trades,
        COALESCE(AVG(cp.roi_percentage) FILTER (WHERE cp.is_manual = false), 0)::DECIMAL as copied_roi,
        COUNT(*)::INT FILTER (WHERE cp.is_manual = true) as manual_trades,
        COALESCE(AVG(cp.roi_percentage) FILTER (WHERE cp.is_manual = true), 0)::DECIMAL as manual_roi,
        (COALESCE(AVG(cp.roi_percentage) FILTER (WHERE cp.is_manual = false), 0) - 
         COALESCE(AVG(cp.roi_percentage) FILTER (WHERE cp.is_manual = true), 0))::DECIMAL as advantage,
        CASE 
            WHEN AVG(cp.roi_percentage) FILTER (WHERE cp.is_manual = false) > 
                 AVG(cp.roi_percentage) FILTER (WHERE cp.is_manual = true) THEN 'copied'
            WHEN AVG(cp.roi_percentage) FILTER (WHERE cp.is_manual = true) > 
                 AVG(cp.roi_percentage) FILTER (WHERE cp.is_manual = false) THEN 'manual'
            ELSE 'equal'
        END::TEXT as better_strat
    FROM copied_positions cp
    WHERE cp.user_address = user_addr
        AND cp.status IN ('closed', 'stopped_out', 'target_hit')
        AND cp.closed_at >= start_date;
END;
$$ LANGUAGE plpgsql;

-- 8. Function to Update Weekly Trader Performance
CREATE OR REPLACE FUNCTION update_weekly_trader_performance() RETURNS void AS $$
DECLARE
    current_week DATE;
BEGIN
    current_week := DATE_TRUNC('week', NOW())::DATE;
    
    INSERT INTO trader_follower_performance (
        user_address,
        trader_address,
        follow_id,
        week_start,
        trades_this_week,
        wins_this_week,
        losses_this_week,
        pnl_this_week,
        roi_this_week,
        best_trade_pnl,
        worst_trade_pnl,
        follower_win_rate_this_week
    )
    SELECT 
        cp.user_address,
        cp.trader_address,
        cp.follow_id,
        current_week,
        COUNT(*) as trades_this_week,
        COUNT(*) FILTER (WHERE cp.realized_pnl > 0) as wins,
        COUNT(*) FILTER (WHERE cp.realized_pnl < 0) as losses,
        COALESCE(SUM(cp.realized_pnl), 0) as pnl,
        COALESCE(AVG(cp.roi_percentage), 0) as roi,
        MAX(cp.realized_pnl),
        MIN(cp.realized_pnl),
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(*) FILTER (WHERE cp.realized_pnl > 0)::DECIMAL / COUNT(*) * 100)
            ELSE 0
        END as win_rate
    FROM copied_positions cp
    WHERE cp.closed_at >= current_week
        AND cp.closed_at < current_week + INTERVAL '7 days'
        AND cp.status IN ('closed', 'stopped_out', 'target_hit')
    GROUP BY cp.user_address, cp.trader_address, cp.follow_id
    ON CONFLICT (user_address, trader_address, week_start) 
    DO UPDATE SET
        trades_this_week = EXCLUDED.trades_this_week,
        wins_this_week = EXCLUDED.wins_this_week,
        losses_this_week = EXCLUDED.losses_this_week,
        pnl_this_week = EXCLUDED.pnl_this_week,
        roi_this_week = EXCLUDED.roi_this_week,
        best_trade_pnl = EXCLUDED.best_trade_pnl,
        worst_trade_pnl = EXCLUDED.worst_trade_pnl,
        follower_win_rate_this_week = EXCLUDED.follower_win_rate_this_week;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '✅ Copy Trade Analytics System Created!' as status;

SELECT 'Tables:' as info;
SELECT 'copy_performance_analytics' as table_name, COUNT(*) as rows FROM copy_performance_analytics
UNION ALL
SELECT 'trader_follower_performance', COUNT(*) FROM trader_follower_performance;

SELECT 'Views:' as info;
SELECT 'copy_trading_metrics_summary' as view_name
UNION ALL
SELECT 'manual_vs_copied_comparison'
UNION ALL
SELECT 'risk_adjusted_copy_metrics';

SELECT 'Functions:' as info;
SELECT 'calculate_copy_performance()' as function_name
UNION ALL
SELECT 'update_weekly_trader_performance()';

-- Sample query to test
SELECT '📊 Sample Analytics Query:' as info;
SELECT * FROM manual_vs_copied_comparison LIMIT 1;
