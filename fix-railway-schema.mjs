#!/usr/bin/env node

/**
 * Fix Railway Database Schema
 * This script adds all missing columns to fix the errors
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("\n❌ ERROR: DATABASE_URL not set\n");
  console.log("Get it from Railway:");
  console.log("1. Go to Railway dashboard");
  console.log("2. Click 'polybuddy-db'");
  console.log("3. Click 'Connect' tab");
  console.log("4. Copy the 'Public URL'\n");
  console.log("Then run:");
  console.log('$env:DATABASE_URL="postgresql://..." ; node fix-railway-schema.mjs\n');
  process.exit(1);
}

async function fixSchema() {
  console.log("╔════════════════════════════════════════════╗");
  console.log("║   Fixing Railway Database Schema          ║");
  console.log("╚════════════════════════════════════════════╝\n");
  
  const sql = postgres(DATABASE_URL, { max: 1 });
  
  try {
    console.log("📡 Connecting to database...");
    await sql`SELECT 1`;
    console.log("✅ Connected!\n");
    
    // Fix wallet_performance table
    console.log("🔧 Adding missing columns to wallet_performance...");
    
    await sql`
      ALTER TABLE wallet_performance 
      ADD COLUMN IF NOT EXISTS last_trade_at TIMESTAMP WITH TIME ZONE
    `;
    console.log("  ✅ Added: last_trade_at");
    
    await sql`
      ALTER TABLE wallet_performance 
      ADD COLUMN IF NOT EXISTS address VARCHAR(42)
    `;
    console.log("  ✅ Added: address");
    
    // Update address column with wallet_address for existing rows
    await sql`
      UPDATE wallet_performance 
      SET address = wallet_address 
      WHERE address IS NULL
    `;
    console.log("  ✅ Populated: address from wallet_address\n");
    
    // Fix markets table (outcome vs outcomes)
    console.log("🔧 Fixing markets table...");
    
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'markets' 
      AND column_name LIKE 'outcome%'
    `;
    
    if (columns.some(c => c.column_name === 'outcomes')) {
      await sql`ALTER TABLE markets RENAME COLUMN outcomes TO outcome`;
      console.log("  ✅ Renamed: outcomes → outcome");
    } else {
      await sql`ALTER TABLE markets ADD COLUMN IF NOT EXISTS outcome VARCHAR(50)`;
      console.log("  ✅ Ensured: outcome column exists");
    }
    
    // Clean up invalid whale activity data
    console.log("\n🔧 Cleaning up whale_activity...");
    const deleted = await sql`
      DELETE FROM whale_activity 
      WHERE id::text NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    `;
    console.log(`  ✅ Removed ${deleted.count || 0} invalid entries\n`);
    
    // Verify tables exist and are accessible
    console.log("🔍 Verifying schema...");
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('markets', 'wallet_performance', 'whale_activity', 'best_bet_signals')
      ORDER BY table_name
    `;
    
    console.log("  Tables found:");
    tables.forEach(t => console.log(`    ✅ ${t.table_name}`));
    
    console.log("\n" + "=".repeat(50));
    console.log("\n🎉 Schema fixed successfully!\n");
    console.log("Next steps:");
    console.log("1. Go to Railway dashboard");
    console.log("2. Click 'polybuddy-api'");
    console.log("3. Click '...' menu → 'Restart'");
    console.log("4. Watch logs - jobs should now complete without errors");
    console.log("5. Wait 2-3 minutes for data to populate");
    console.log("6. Refresh your Vercel site - data should appear!\n");
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

fixSchema();
