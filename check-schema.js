#!/usr/bin/env node

/**
 * Database Schema Verification Script
 * Checks if the production database schema matches the TypeScript schema
 */

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://localhost:5432/polybuddy";

const requiredTables = [
  "users",
  "markets",
  "market_snapshots",
  "wallet_performance",
  "wallet_trades",
  "whale_activity",
  "best_bet_signals",
];

const requiredColumns = {
  markets: ["id", "polymarket_id", "question", "category", "end_date", "resolved", "outcome", "metadata"],
  whale_activity: ["id", "wallet_address", "market_id", "action", "outcome", "amount_usd", "timestamp"],
  wallet_performance: ["wallet_address", "total_profit", "win_rate", "elite_score", "trader_tier"],
  best_bet_signals: ["id", "market_id", "confidence", "signal_strength", "entry_price", "outcome"],
};

async function checkSchema() {
  try {
    console.log("╔════════════════════════════════════════════╗");
    console.log("║   Database Schema Verification            ║");
    console.log("╚════════════════════════════════════════════╝\n");
    
    console.log(`Connecting to: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`);
    
    // For Node.js, we'd need pg library
    // This is a placeholder - actual implementation would use pg or drizzle
    
    console.log("⚠️  This script requires manual verification.\n");
    console.log("Please run these SQL queries in your Railway dashboard:\n");
    
    console.log("-- Check if tables exist:");
    console.log("SELECT table_name FROM information_schema.tables");
    console.log("WHERE table_schema = 'public'");
    console.log("ORDER BY table_name;\n");
    
    console.log("-- Check markets table columns:");
    console.log("SELECT column_name, data_type, is_nullable");
    console.log("FROM information_schema.columns");
    console.log("WHERE table_name = 'markets'");
    console.log("ORDER BY ordinal_position;\n");
    
    console.log("-- Check for schema drift (outcomes vs outcome):");
    console.log("SELECT column_name FROM information_schema.columns");
    console.log("WHERE table_name = 'markets' AND column_name LIKE 'outcome%';\n");
    
    console.log("Expected result: Should show 'outcome' not 'outcomes'");
    console.log("\nIf you see 'outcomes', run the fix migration:");
    console.log("psql $DATABASE_URL -f packages/db/migrations/0012_fix_outcome_column.sql");
    
  } catch (error) {
    console.error("\n💥 Error:", error.message);
    process.exit(1);
  }
}

checkSchema();
