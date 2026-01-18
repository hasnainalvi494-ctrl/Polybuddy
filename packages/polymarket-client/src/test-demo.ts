/**
 * Quick test for demo wallets from database
 */

import { polymarketClient } from "./index.js";
import { polymarketSubgraph } from "./subgraph.js";

// Test with some known active Polymarket wallets (from public leaderboard)
const DEMO_WALLETS = [
  "0x1111111111111111111111111111111111111111", // From our demo data
  "0x2222222222222222222222222222222222222222",
  "0x3333333333333333333333333333333333333333",
];

async function testWithDemoWallets() {
  console.log("\n🧪 Testing with demo wallet addresses...\n");
  
  try {
    // Test subgraph
    console.log("📊 Test 1: Checking subgraph connectivity...");
    try {
      const traders = await polymarketSubgraph.getTopTraders(5);
      console.log(`✅ Subgraph returned ${traders.length} top traders`);
      if (traders.length > 0 && traders[0]) {
        console.log(`   Sample: ${traders[0].address}`);
      }
    } catch (error) {
      console.log("⚠️  Subgraph might not be available:", error instanceof Error ? error.message : error);
    }
    
    // Test with demo wallets
    console.log("\n💼 Test 2: Testing with our demo wallets...");
    for (const wallet of DEMO_WALLETS.slice(0, 1)) {
      console.log(`\n   Wallet: ${wallet}`);
      
      // Try getting trades from CLOB API
      const trades = await polymarketClient.getWalletTrades(wallet, 10);
      console.log(`   CLOB API: ${trades.length} trades`);
      
      // Try subgraph
      try {
        const subgraphTrades = await polymarketSubgraph.getWalletTrades(wallet, 10);
        console.log(`   Subgraph: ${subgraphTrades.length} trades`);
      } catch {
        console.log("   Subgraph: Error");
      }
    }
    
    console.log("\n✅ Tests complete!\n");
    console.log("💡 Note: Demo wallets may not have real trades on Polymarket");
    console.log("   We will use simulated data for the demo and sync real data later.\n");
    
  } catch (error) {
    console.error("\n❌ Test failed:", error);
  }
}

testWithDemoWallets();
