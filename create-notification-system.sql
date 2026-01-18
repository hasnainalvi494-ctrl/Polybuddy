-- ============================================================================
-- COMPREHENSIVE NOTIFICATION SYSTEM
-- ============================================================================

-- 1. Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address TEXT NOT NULL,
    
    -- Alert configuration
    alert_type TEXT NOT NULL CHECK (alert_type IN (
        'best_bet', 'elite_trader', 'price_alert', 'arbitrage', 
        'risk_management', 'whale_activity', 'pattern_match', 
        'market_resolution', 'position_alert', 'portfolio_alert'
    )),
    alert_name TEXT NOT NULL,
    description TEXT,
    
    -- Alert conditions
    conditions JSONB NOT NULL, -- Flexible condition storage
    
    -- Target configuration
    market_id UUID REFERENCES markets(id),
    trader_address TEXT, -- For elite trader alerts
    
    -- Thresholds
    price_threshold DECIMAL(10, 6),
    price_direction TEXT CHECK (price_direction IN ('above', 'below', 'crosses')),
    volume_threshold DECIMAL(18, 2),
    confidence_threshold DECIMAL(5, 2),
    risk_threshold DECIMAL(5, 2),
    
    -- Priority and scheduling
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    is_active BOOLEAN DEFAULT true,
    
    -- Time-based scheduling
    schedule_enabled BOOLEAN DEFAULT false,
    schedule_start_time TIME,
    schedule_end_time TIME,
    schedule_days INTEGER[], -- 0=Sunday, 1=Monday, etc.
    
    -- Notification channels
    notify_in_app BOOLEAN DEFAULT true,
    notify_push BOOLEAN DEFAULT false,
    notify_email BOOLEAN DEFAULT false,
    notify_telegram BOOLEAN DEFAULT false,
    
    -- Alert limits
    max_triggers_per_day INTEGER DEFAULT 10,
    cooldown_minutes INTEGER DEFAULT 60, -- Minimum time between triggers
    
    -- Performance tracking
    trigger_count INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMP,
    successful_triggers INTEGER DEFAULT 0,
    false_positives INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_address);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_alerts_market ON alerts(market_id);
CREATE INDEX IF NOT EXISTS idx_alerts_priority ON alerts(priority);

-- 2. Alert Triggers Table (History)
CREATE TABLE IF NOT EXISTS alert_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
    user_address TEXT NOT NULL,
    
    -- Trigger details
    triggered_at TIMESTAMP DEFAULT NOW(),
    trigger_reason TEXT NOT NULL,
    trigger_data JSONB, -- Snapshot of data that triggered alert
    
    -- Alert content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT NOT NULL,
    
    -- Notification status
    sent_in_app BOOLEAN DEFAULT false,
    sent_push BOOLEAN DEFAULT false,
    sent_email BOOLEAN DEFAULT false,
    sent_telegram BOOLEAN DEFAULT false,
    
    -- User interaction
    read_at TIMESTAMP,
    dismissed_at TIMESTAMP,
    clicked_at TIMESTAMP,
    action_taken TEXT, -- 'viewed', 'traded', 'ignored', 'snoozed'
    
    -- Performance
    was_accurate BOOLEAN, -- User feedback
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triggers_alert ON alert_triggers(alert_id);
CREATE INDEX IF NOT EXISTS idx_triggers_user ON alert_triggers(user_address);
CREATE INDEX IF NOT EXISTS idx_triggers_time ON alert_triggers(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_triggers_unread ON alert_triggers(user_address, read_at) WHERE read_at IS NULL;

-- 3. Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address TEXT NOT NULL UNIQUE,
    
    -- Global settings
    notifications_enabled BOOLEAN DEFAULT true,
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    
    -- Channel preferences
    in_app_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT false,
    email_enabled BOOLEAN DEFAULT false,
    telegram_enabled BOOLEAN DEFAULT false,
    
    -- Contact information
    email_address TEXT,
    telegram_chat_id TEXT,
    push_token TEXT,
    
    -- Priority filters
    min_priority TEXT DEFAULT 'low' CHECK (min_priority IN ('critical', 'high', 'medium', 'low')),
    critical_only_quiet_hours BOOLEAN DEFAULT true,
    
    -- Alert type preferences
    alert_type_preferences JSONB DEFAULT '{
        "best_bet": true,
        "elite_trader": true,
        "price_alert": true,
        "arbitrage": true,
        "risk_management": true,
        "whale_activity": true,
        "pattern_match": true,
        "market_resolution": true,
        "position_alert": true,
        "portfolio_alert": true
    }'::jsonb,
    
    -- Frequency limits
    max_alerts_per_hour INTEGER DEFAULT 20,
    max_alerts_per_day INTEGER DEFAULT 100,
    
    -- Digest settings
    daily_digest_enabled BOOLEAN DEFAULT false,
    daily_digest_time TIME DEFAULT '09:00:00',
    weekly_digest_enabled BOOLEAN DEFAULT false,
    weekly_digest_day INTEGER DEFAULT 1, -- Monday
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_address);

-- 4. Alert Performance Analytics Table
CREATE TABLE IF NOT EXISTS alert_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
    
    -- Time period
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    
    -- Trigger statistics
    total_triggers INTEGER DEFAULT 0,
    successful_triggers INTEGER DEFAULT 0,
    false_positives INTEGER DEFAULT 0,
    
    -- User engagement
    read_rate DECIMAL(5, 2), -- Percentage
    click_rate DECIMAL(5, 2),
    action_rate DECIMAL(5, 2),
    
    -- Performance metrics
    avg_user_rating DECIMAL(3, 2),
    accuracy_rate DECIMAL(5, 2),
    
    -- Financial impact (if applicable)
    avg_roi DECIMAL(10, 2),
    total_profit DECIMAL(18, 2),
    
    calculated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_perf_alert ON alert_performance(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_perf_period ON alert_performance(period_start, period_end);

-- 5. Telegram Bot Users Table
CREATE TABLE IF NOT EXISTS telegram_bot_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address TEXT NOT NULL,
    telegram_chat_id TEXT NOT NULL UNIQUE,
    telegram_username TEXT,
    
    -- Bot settings
    is_active BOOLEAN DEFAULT true,
    language TEXT DEFAULT 'en',
    
    -- Subscription
    subscribed_at TIMESTAMP DEFAULT NOW(),
    last_interaction_at TIMESTAMP DEFAULT NOW(),
    
    -- Preferences
    alert_format TEXT DEFAULT 'detailed' CHECK (alert_format IN ('minimal', 'standard', 'detailed')),
    include_charts BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_user ON telegram_bot_users(user_address);
CREATE INDEX IF NOT EXISTS idx_telegram_chat ON telegram_bot_users(telegram_chat_id);

-- ============================================================================
-- VIEWS FOR NOTIFICATION SYSTEM
-- ============================================================================

-- 6. Active Alerts View
CREATE OR REPLACE VIEW active_alerts AS
SELECT 
    a.*,
    COUNT(at.id) FILTER (WHERE at.triggered_at > NOW() - INTERVAL '24 hours') as triggers_last_24h,
    COUNT(at.id) FILTER (WHERE at.triggered_at > NOW() - INTERVAL '1 hour') as triggers_last_hour,
    MAX(at.triggered_at) as last_trigger_time,
    CASE 
        WHEN a.last_triggered_at IS NULL THEN true
        WHEN EXTRACT(EPOCH FROM (NOW() - a.last_triggered_at)) / 60 >= a.cooldown_minutes THEN true
        ELSE false
    END as can_trigger_now
FROM alerts a
LEFT JOIN alert_triggers at ON a.id = at.alert_id
WHERE a.is_active = true
    AND (a.expires_at IS NULL OR a.expires_at > NOW())
GROUP BY a.id;

-- 7. Unread Notifications View
CREATE OR REPLACE VIEW unread_notifications AS
SELECT 
    at.*,
    a.alert_type,
    a.alert_name,
    EXTRACT(EPOCH FROM (NOW() - at.triggered_at)) / 60 as minutes_ago
FROM alert_triggers at
JOIN alerts a ON at.alert_id = a.id
WHERE at.read_at IS NULL
ORDER BY 
    CASE at.priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    at.triggered_at DESC;

-- 8. Alert Performance Summary View
CREATE OR REPLACE VIEW alert_performance_summary AS
SELECT 
    a.id as alert_id,
    a.user_address,
    a.alert_type,
    a.alert_name,
    a.priority,
    COUNT(at.id) as total_triggers,
    COUNT(at.id) FILTER (WHERE at.read_at IS NOT NULL) as read_count,
    COUNT(at.id) FILTER (WHERE at.clicked_at IS NOT NULL) as click_count,
    COUNT(at.id) FILTER (WHERE at.action_taken = 'traded') as action_count,
    ROUND(
        COUNT(at.id) FILTER (WHERE at.read_at IS NOT NULL)::DECIMAL / 
        NULLIF(COUNT(at.id), 0) * 100, 
        2
    ) as read_rate,
    ROUND(
        COUNT(at.id) FILTER (WHERE at.clicked_at IS NOT NULL)::DECIMAL / 
        NULLIF(COUNT(at.id), 0) * 100, 
        2
    ) as click_rate,
    AVG(at.user_rating) as avg_rating,
    MAX(at.triggered_at) as last_triggered
FROM alerts a
LEFT JOIN alert_triggers at ON a.id = at.alert_id
GROUP BY a.id, a.user_address, a.alert_type, a.alert_name, a.priority;

-- ============================================================================
-- FUNCTIONS FOR NOTIFICATION SYSTEM
-- ============================================================================

-- 9. Function to Check if Alert Should Trigger
CREATE OR REPLACE FUNCTION should_trigger_alert(
    p_alert_id UUID,
    p_user_address TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_alert RECORD;
    v_prefs RECORD;
    v_triggers_today INTEGER;
    v_triggers_hour INTEGER;
    v_can_trigger BOOLEAN := true;
BEGIN
    -- Get alert details
    SELECT * INTO v_alert FROM alerts WHERE id = p_alert_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check expiration
    IF v_alert.expires_at IS NOT NULL AND v_alert.expires_at < NOW() THEN
        RETURN false;
    END IF;
    
    -- Check cooldown
    IF v_alert.last_triggered_at IS NOT NULL THEN
        IF EXTRACT(EPOCH FROM (NOW() - v_alert.last_triggered_at)) / 60 < v_alert.cooldown_minutes THEN
            RETURN false;
        END IF;
    END IF;
    
    -- Check daily limit
    SELECT COUNT(*) INTO v_triggers_today
    FROM alert_triggers
    WHERE alert_id = p_alert_id
        AND triggered_at > NOW() - INTERVAL '24 hours';
    
    IF v_triggers_today >= v_alert.max_triggers_per_day THEN
        RETURN false;
    END IF;
    
    -- Get user preferences
    SELECT * INTO v_prefs FROM notification_preferences WHERE user_address = p_user_address;
    
    IF FOUND THEN
        -- Check if notifications are globally enabled
        IF NOT v_prefs.notifications_enabled THEN
            RETURN false;
        END IF;
        
        -- Check quiet hours
        IF v_prefs.quiet_hours_enabled THEN
            IF v_prefs.critical_only_quiet_hours AND v_alert.priority != 'critical' THEN
                IF CURRENT_TIME BETWEEN v_prefs.quiet_hours_start AND v_prefs.quiet_hours_end THEN
                    RETURN false;
                END IF;
            END IF;
        END IF;
        
        -- Check hourly limit
        SELECT COUNT(*) INTO v_triggers_hour
        FROM alert_triggers
        WHERE user_address = p_user_address
            AND triggered_at > NOW() - INTERVAL '1 hour';
        
        IF v_triggers_hour >= v_prefs.max_alerts_per_hour THEN
            RETURN false;
        END IF;
    END IF;
    
    RETURN v_can_trigger;
END;
$$ LANGUAGE plpgsql;

-- 10. Function to Trigger Alert
CREATE OR REPLACE FUNCTION trigger_alert(
    p_alert_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_trigger_reason TEXT,
    p_trigger_data JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_alert RECORD;
    v_trigger_id UUID;
    v_should_trigger BOOLEAN;
BEGIN
    -- Get alert details
    SELECT * INTO v_alert FROM alerts WHERE id = p_alert_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Alert not found';
    END IF;
    
    -- Check if should trigger
    v_should_trigger := should_trigger_alert(p_alert_id, v_alert.user_address);
    
    IF NOT v_should_trigger THEN
        RETURN NULL;
    END IF;
    
    -- Create trigger record
    INSERT INTO alert_triggers (
        alert_id,
        user_address,
        title,
        message,
        priority,
        trigger_reason,
        trigger_data,
        sent_in_app,
        sent_push,
        sent_email,
        sent_telegram
    ) VALUES (
        p_alert_id,
        v_alert.user_address,
        p_title,
        p_message,
        v_alert.priority,
        p_trigger_reason,
        p_trigger_data,
        v_alert.notify_in_app,
        v_alert.notify_push,
        v_alert.notify_email,
        v_alert.notify_telegram
    ) RETURNING id INTO v_trigger_id;
    
    -- Update alert statistics
    UPDATE alerts
    SET 
        trigger_count = trigger_count + 1,
        last_triggered_at = NOW(),
        updated_at = NOW()
    WHERE id = p_alert_id;
    
    RETURN v_trigger_id;
END;
$$ LANGUAGE plpgsql;

-- 11. Function to Mark Notification as Read
CREATE OR REPLACE FUNCTION mark_notification_read(
    p_trigger_id UUID,
    p_user_address TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE alert_triggers
    SET read_at = NOW()
    WHERE id = p_trigger_id
        AND user_address = p_user_address
        AND read_at IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 12. Function to Calculate Alert Performance
CREATE OR REPLACE FUNCTION calculate_alert_performance(
    p_alert_id UUID,
    p_period_days INTEGER DEFAULT 7
) RETURNS void AS $$
DECLARE
    v_period_start TIMESTAMP := NOW() - (p_period_days || ' days')::INTERVAL;
    v_period_end TIMESTAMP := NOW();
    v_stats RECORD;
BEGIN
    -- Calculate statistics
    SELECT 
        COUNT(*) as total_triggers,
        COUNT(*) FILTER (WHERE was_accurate = true) as successful_triggers,
        COUNT(*) FILTER (WHERE was_accurate = false) as false_positives,
        ROUND(
            COUNT(*) FILTER (WHERE read_at IS NOT NULL)::DECIMAL / 
            NULLIF(COUNT(*), 0) * 100, 
            2
        ) as read_rate,
        ROUND(
            COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::DECIMAL / 
            NULLIF(COUNT(*), 0) * 100, 
            2
        ) as click_rate,
        ROUND(
            COUNT(*) FILTER (WHERE action_taken IS NOT NULL)::DECIMAL / 
            NULLIF(COUNT(*), 0) * 100, 
            2
        ) as action_rate,
        AVG(user_rating) as avg_rating,
        ROUND(
            COUNT(*) FILTER (WHERE was_accurate = true)::DECIMAL / 
            NULLIF(COUNT(*) FILTER (WHERE was_accurate IS NOT NULL), 0) * 100, 
            2
        ) as accuracy_rate
    INTO v_stats
    FROM alert_triggers
    WHERE alert_id = p_alert_id
        AND triggered_at BETWEEN v_period_start AND v_period_end;
    
    -- Insert or update performance record
    INSERT INTO alert_performance (
        alert_id,
        period_start,
        period_end,
        total_triggers,
        successful_triggers,
        false_positives,
        read_rate,
        click_rate,
        action_rate,
        avg_user_rating,
        accuracy_rate
    ) VALUES (
        p_alert_id,
        v_period_start,
        v_period_end,
        v_stats.total_triggers,
        v_stats.successful_triggers,
        v_stats.false_positives,
        v_stats.read_rate,
        v_stats.click_rate,
        v_stats.action_rate,
        v_stats.avg_rating,
        v_stats.accuracy_rate
    );
    
    -- Update alert statistics
    UPDATE alerts
    SET 
        successful_triggers = v_stats.successful_triggers,
        false_positives = v_stats.false_positives
    WHERE id = p_alert_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert sample notification preferences
INSERT INTO notification_preferences (
    user_address,
    notifications_enabled,
    in_app_enabled,
    telegram_enabled,
    min_priority
) VALUES 
    ('0x1234567890abcdef', true, true, true, 'medium'),
    ('0xabcdef1234567890', true, true, false, 'high')
ON CONFLICT (user_address) DO NOTHING;

-- Insert sample alerts
INSERT INTO alerts (
    user_address,
    alert_type,
    alert_name,
    description,
    conditions,
    priority,
    confidence_threshold,
    notify_in_app,
    notify_telegram
) VALUES 
(
    '0x1234567890abcdef',
    'best_bet',
    'Elite Best Bet Alert',
    'Notify when elite-level best bet opportunities appear',
    '{"min_confidence": 90, "min_elite_traders": 3}'::jsonb,
    'high',
    90.0,
    true,
    true
),
(
    '0x1234567890abcdef',
    'price_alert',
    'Bitcoin $100k Alert',
    'Alert when Bitcoin market crosses 0.70 probability',
    '{"market": "bitcoin-100k", "threshold": 0.70}'::jsonb,
    'medium',
    NULL,
    true,
    false
),
(
    '0xabcdef1234567890',
    'whale_activity',
    'Whale Trade Alert',
    'Notify on whale trades over $50k',
    '{"min_size": 50000}'::jsonb,
    'high',
    NULL,
    true,
    true
);

SELECT '✅ Notification System Created!' as status;

-- Show sample data
SELECT '📊 Sample Alerts:' as info;
SELECT 
    alert_name,
    alert_type,
    priority,
    is_active
FROM alerts
ORDER BY priority DESC, created_at DESC;

SELECT '👤 Sample Preferences:' as info;
SELECT 
    user_address,
    notifications_enabled,
    in_app_enabled,
    telegram_enabled,
    min_priority
FROM notification_preferences;
