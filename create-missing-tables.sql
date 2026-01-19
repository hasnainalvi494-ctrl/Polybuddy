-- Create missing tables for PolyBuddy
-- Run this in Railway's PostgreSQL Query tab

-- 1. Create wallet_trades table
CREATE TABLE IF NOT EXISTS wallet_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    market_id TEXT NOT NULL,
    side TEXT NOT NULL,
    outcome TEXT NOT NULL,
    entry_price DECIMAL(10, 4),
    exit_price DECIMAL(10, 4),
    size DECIMAL(18, 8),
    profit DECIMAL(18, 2),
    is_winner BOOLEAN,
    opened_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wallet_trades_wallet ON wallet_trades(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_trades_market ON wallet_trades(market_id);

-- 2. Create whale_activity table
CREATE TABLE IF NOT EXISTS whale_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    market_id TEXT NOT NULL,
    action TEXT NOT NULL,
    outcome TEXT,
    amount_usd DECIMAL(18, 2),
    price DECIMAL(10, 4),
    price_before DECIMAL(10, 4),
    price_after DECIMAL(10, 4),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Ensure best_bet_signals has all needed columns
-- (The table likely exists but may need additional columns)

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add entry_price column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'best_bet_signals' AND column_name = 'entry_price') THEN
        ALTER TABLE best_bet_signals ADD COLUMN entry_price DECIMAL(10, 4);
    END IF;
    
    -- Add outcome column if missing  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'best_bet_signals' AND column_name = 'outcome') THEN
        ALTER TABLE best_bet_signals ADD COLUMN outcome TEXT DEFAULT 'yes';
    END IF;
    
    -- Add position_size column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'best_bet_signals' AND column_name = 'position_size') THEN
        ALTER TABLE best_bet_signals ADD COLUMN position_size DECIMAL(10, 4);
    END IF;
    
    -- Add risk_reward_ratio column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'best_bet_signals' AND column_name = 'risk_reward_ratio') THEN
        ALTER TABLE best_bet_signals ADD COLUMN risk_reward_ratio DECIMAL(10, 4);
    END IF;
    
    -- Add kelly_criterion column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'best_bet_signals' AND column_name = 'kelly_criterion') THEN
        ALTER TABLE best_bet_signals ADD COLUMN kelly_criterion DECIMAL(10, 4);
    END IF;
    
    -- Add trader columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'best_bet_signals' AND column_name = 'trader_win_rate') THEN
        ALTER TABLE best_bet_signals ADD COLUMN trader_win_rate DECIMAL(10, 4);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'best_bet_signals' AND column_name = 'trader_elite_score') THEN
        ALTER TABLE best_bet_signals ADD COLUMN trader_elite_score DECIMAL(10, 4);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'best_bet_signals' AND column_name = 'trader_profit_history') THEN
        ALTER TABLE best_bet_signals ADD COLUMN trader_profit_history DECIMAL(18, 2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'best_bet_signals' AND column_name = 'trader_sharpe_ratio') THEN
        ALTER TABLE best_bet_signals ADD COLUMN trader_sharpe_ratio DECIMAL(10, 4);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'best_bet_signals' AND column_name = 'time_horizon') THEN
        ALTER TABLE best_bet_signals ADD COLUMN time_horizon TEXT DEFAULT '7d';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'best_bet_signals' AND column_name = 'generated_at') THEN
        ALTER TABLE best_bet_signals ADD COLUMN generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('wallet_trades', 'whale_activity', 'best_bet_signals', 'wallet_performance', 'markets');
