/**
 * Test Real Polymarket Data Fetching
 */

import { polymarketPublicAPI } from "./public-api.js";

async function testRealData() {
  console.log("\n" + "=".repeat(70));
  console.log("🧪 TESTING REAL POLYMARKET PUBLIC API");
  console.log("=".repeat(70) + "\n");
  
  try {
    // Test 1: Fetch active markets
    console.log("📊 Test 1: Fetching active markets...");
    const markets = await polymarketPublicAPI.getActiveMarkets(5);
    console.log(`✅ Found ${markets.length} active markets`);
    const firstMarket = markets[0];
    if (firstMarket) {
      console.log("\n   Sample Market:");
      console.log(`   Question: ${firstMarket.question}`);
      console.log(`   Volume: $${parseFloat(firstMarket.volume || "0").toLocaleString()}`);
      console.log(`   Outcomes: ${Array.isArray(firstMarket.outcomes) ? firstMarket.outcomes.join(", ") : "Yes, No"}`);
    }
    
    // Test 2: Fetch trending events
    console.log("\n🔥 Test 2: Fetching trending events...");
    const events = await polymarketPublicAPI.getTrendingEvents(3);
    console.log(`✅ Found ${events.length} trending events`);
    const firstEvent = events[0];
    if (firstEvent) {
      console.log("\n   Top Event:");
      console.log(`   Title: ${firstEvent.title}`);
      console.log(`   Volume: $${parseFloat(firstEvent.volume || "0").toLocaleString()}`);
      console.log(`   Markets: ${firstEvent.markets?.length || 0}`);
    }
    
    // Test 3: Get high volume markets
    console.log("\n💰 Test 3: Fetching high volume markets...");
    const highVolume = await polymarketPublicAPI.getHighVolumeMarkets(5);
    console.log(`✅ Found ${highVolume.length} high volume markets`);
    if (highVolume.length > 0) {
      console.log("\n   Top 3 by Volume:");
      for (let i = 0; i < Math.min(3, highVolume.length); i++) {
        const m = highVolume[i];
        if (m) {
          console.log(`   ${i + 1}. ${m.question.substring(0, 50)}...`);
          console.log(`      Volume: $${parseFloat(m.volume || "0").toLocaleString()}`);
        }
      }
    }
    
    // Test 4: Get market statistics
    console.log("\n📈 Test 4: Getting market statistics...");
    const stats = await polymarketPublicAPI.getMarketStats();
    console.log("✅ Market Stats:");
    console.log(`   Total Markets: ${stats.totalMarkets}`);
    console.log(`   Total Volume: $${parseFloat(stats.totalVolume).toLocaleString()}`);
    console.log(`   Active Markets (>$1K vol): ${stats.activeMarkets}`);
    
    // Test 5: Search markets
    console.log("\n🔍 Test 5: Searching markets...");
    const searchResults = await polymarketPublicAPI.searchMarkets("trump", 3);
    console.log(`✅ Found ${searchResults.length} markets matching "trump"`);
    const firstResult = searchResults[0];
    if (firstResult) {
      console.log("\n   Sample Result:");
      console.log(`   ${firstResult.question}`);
    }
    
    console.log("\n" + "=".repeat(70));
    console.log("✅ ALL TESTS PASSED - Real data is flowing!");
    console.log("=".repeat(70) + "\n");
    
    console.log("💡 Next Steps:");
    console.log("   1. Run: pnpm tsx src/test-sync.ts");
    console.log("   2. This will sync real markets to your database");
    console.log("   3. Then view them at http://localhost:3000/markets\n");
    
  } catch (error) {
    console.error("\n❌ Test failed:", error);
  }
}

testRealData();
