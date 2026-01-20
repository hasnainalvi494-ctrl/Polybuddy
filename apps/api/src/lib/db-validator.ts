import { logger } from "./logger.js";
import { db } from "@polybuddy/db";
import { sql } from "drizzle-orm";

/**
 * Required tables for the API to function properly
 * Add new tables here when creating new features
 */
const REQUIRED_TABLES = [
  // Core tables
  "users",
  "sessions",
  "markets",
  "market_snapshots",
  "watchlists",
  "watchlist_markets",
  "alerts",
  "notifications",
  "tracked_wallets",
  "portfolio_positions",
  
  // Market analysis tables
  "market_features",
  "market_states",
  "market_state_events",
  "market_behavior_dimensions",
  "market_participation_structure",
  "market_resolution_drivers",
  
  // Trading & signals tables
  "wallet_performance",
  "wallet_trades",
  "whale_activity",
  "best_bet_signals",
  "retail_signals",
  "retail_flow_guard",
  
  // Pattern recognition tables (NEW)
  "trading_patterns",
  "pattern_matches",
  "trader_behavior_clusters",
  "trader_cluster_assignments",
  "market_sentiment",
  "order_book_analysis",
  "market_correlations",
  
  // Other feature tables
  "decision_reviews",
  "exposure_clusters",
  "exposure_cluster_members",
  "market_relations",
  "constraint_checks",
  "wallet_flow_events",
  "flow_labels",
  "weekly_reports",
  "signal_subscriptions",
  "hidden_exposure_links",
  "portfolio_exposure_warnings",
  "uma_disputes",
  "uma_dispute_history",
  "telegram_connections",
  "telegram_alert_subscriptions",
  "outcome_patterns",
  "timing_windows",
  "cross_platform_markets",
  "cross_platform_prices",
];

/**
 * Validates that all required database tables exist
 * Returns list of missing tables
 */
export async function validateDatabaseTables(): Promise<{
  valid: boolean;
  missingTables: string[];
  existingTables: string[];
}> {
  try {
    // Get all existing tables from the database
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const rows = Array.isArray(result) ? result : (result as any).rows || [];
    const existingTables = rows.map((row: any) => row.table_name as string);
    
    // Find missing tables
    const missingTables = REQUIRED_TABLES.filter(
      (table) => !existingTables.includes(table)
    );
    
    return {
      valid: missingTables.length === 0,
      missingTables,
      existingTables,
    };
  } catch (error) {
    logger.error({ error }, "Failed to validate database tables");
    return {
      valid: false,
      missingTables: REQUIRED_TABLES,
      existingTables: [],
    };
  }
}

/**
 * Logs database validation status
 */
export async function logDatabaseStatus(): Promise<void> {
  const { valid, missingTables, existingTables } = await validateDatabaseTables();
  
  logger.info(`Database has ${existingTables.length} tables`);
  
  if (valid) {
    logger.info("✅ All required database tables exist");
  } else {
    logger.warn(`⚠️ Missing ${missingTables.length} required tables:`);
    missingTables.forEach((table) => {
      logger.warn(`  - ${table}`);
    });
    logger.info("Tables will be created automatically...");
  }
}

/**
 * Check if a specific table exists
 */
export async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      ) as exists
    `);
    const rows = Array.isArray(result) ? result : (result as any).rows || [];
    return rows[0]?.exists === true;
  } catch {
    return false;
  }
}
