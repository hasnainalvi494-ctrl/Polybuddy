import { sql } from "drizzle-orm";
import { db } from "./db.js";
import { logger } from "./logger.js";

/**
 * Initialize any missing database tables
 * This runs on startup to ensure all required tables exist
 */
export async function initializeMissingTables(): Promise<void> {
  try {
    logger.info("Checking for missing database tables...");

    // Create wallet_trades table if not exists
    await db.execute(sql`
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
      )
    `);
    logger.info("✅ wallet_trades table verified");

    // Create indexes for wallet_trades (IF NOT EXISTS is implicit in the query)
    try {
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wallet_trades_wallet ON wallet_trades(wallet_address)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wallet_trades_market ON wallet_trades(market_id)`);
    } catch (e) {
      // Indexes may already exist, that's fine
    }

    // Create whale_activity table if not exists  
    await db.execute(sql`
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
      )
    `);
    logger.info("✅ whale_activity table verified");

    // Create best_bet_signals table if not exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS best_bet_signals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        market_id TEXT NOT NULL,
        signal_type TEXT NOT NULL DEFAULT 'best_bet',
        recommendation TEXT NOT NULL DEFAULT 'Yes',
        recommended_price DECIMAL(10, 4),
        target_price DECIMAL(10, 4),
        stop_loss DECIMAL(10, 4),
        kelly_size DECIMAL(10, 4),
        expected_value DECIMAL(10, 4),
        confidence INTEGER DEFAULT 70,
        signal_strength TEXT DEFAULT 'strong',
        status TEXT DEFAULT 'active',
        reasoning TEXT[],
        trader_address TEXT,
        trader_stats JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    logger.info("✅ best_bet_signals table verified");

    // Create indexes for best_bet_signals
    try {
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_best_bet_signals_market ON best_bet_signals(market_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_best_bet_signals_status ON best_bet_signals(status)`);
    } catch (e) {
      // Indexes may already exist
    }

    logger.info("✅ All database tables initialized successfully");

  } catch (error) {
    logger.error("Failed to initialize missing tables", error);
    // Don't throw - allow server to start even if this fails
    // The specific queries will fail later with better error context
  }
}
