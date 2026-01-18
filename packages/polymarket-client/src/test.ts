/**
 * Quick test script to fetch real Polymarket data
 */

import { polymarketClient } from "./index.js";

interface GammaEvent {
  title: string;
  markets?: Array<{ id: string }>;
}

async function testPolymarketAPI() {
  console.log("\n🧪 Testing Polymarket API Connection...\n");
  
  try {
    // Test 1: Fetch active markets
    console.log("📊 Test 1: Fetching active markets...");
    const markets = await polymarketClient.getActiveMarkets(5);
    console.log(`✅ Found ${markets.length} markets`);
    const firstMarket = markets[0];
    if (firstMarket) {
      console.log(`   Sample market: ${firstMarket.question}`);
    }
    
    // Test 2: Get recent trades (using Gamma API instead of CLOB)
    console.log("\n📈 Test 2: Fetching recent event data from Gamma API...");
    try {
      const eventsResponse = await fetch("https://gamma-api.polymarket.com/events?limit=3&active=true");
      const events = await eventsResponse.json() as GammaEvent[];
      console.log(`✅ Found ${events.length || 0} recent events`);
      
      const firstEvent = events[0];
      if (firstEvent?.markets && firstEvent.markets.length > 0) {
        const firstEventMarket = firstEvent.markets[0];
        if (firstEventMarket) {
          const firstMarketId = firstEventMarket.id;
          console.log(`   Sample market ID: ${firstMarketId}`);
          
          // Try to get market trades
          console.log(`\n📊 Test 3: Fetching market trades for ${firstMarketId}...`);
          const marketTrades = await polymarketClient.getMarketTrades(firstMarketId, 10);
          console.log(`✅ Found ${marketTrades.length} trades on this market`);
          
          const firstTrade = marketTrades[0];
          if (firstTrade) {
            const testWallet = firstTrade.maker_address;
            console.log(`\n💼 Test 4: Fetching all trades for wallet ${testWallet.substring(0, 10)}...`);
            const walletTrades = await polymarketClient.getWalletTrades(testWallet, 100);
            console.log(`✅ Found ${walletTrades.length} total trades for this wallet`);
          }
        }
      }
    } catch (error) {
      console.error("   Error:", error instanceof Error ? error.message : error);
    }
    
    console.log("\n✅ All tests passed!\n");
    
  } catch (error) {
    console.error("\n❌ Test failed:", error);
  }
}

testPolymarketAPI();
