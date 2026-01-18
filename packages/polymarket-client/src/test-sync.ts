/**
 * Sync Real Markets to Database
 */

import { config } from "dotenv";
import { syncRealMarkets, getRealMarketStats } from "./sync-markets.js";

// Load environment variables
config({ path: "../../.env" });

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 POLYMARKET REAL DATA SYNC");
  console.log("=".repeat(70) + "\n");
  
  try {
    // First, get current stats
    await getRealMarketStats();
    
    // Sync markets
    console.log("Starting market sync...\n");
    const result = await syncRealMarkets(30);
    
    if (result.success) {
      console.log("✅ Sync completed successfully!");
      console.log(`   Markets synced: ${result.marketsUpdated}`);
      console.log(`   Errors: ${result.errors}\n`);
      
      console.log("🎯 Next: View markets at http://localhost:3000/markets\n");
    } else {
      console.log("❌ Sync failed\n");
    }
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

main();
