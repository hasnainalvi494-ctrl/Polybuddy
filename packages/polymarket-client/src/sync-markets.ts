/**
 * Real-Time Market Data Sync
 * 
 * Syncs real market data from Polymarket public APIs
 */

import { db, markets } from "@polybuddy/db";
import { eq } from "drizzle-orm";
import { polymarketPublicAPI } from "./public-api.js";

export interface SyncMarketsResult {
  success: boolean;
  marketsAdded: number;
  marketsUpdated: number;
  errors: number;
}

/**
 * Sync real markets from Polymarket
 */
export async function syncRealMarkets(limit = 50): Promise<SyncMarketsResult> {
  console.log(`\n🔄 Syncing ${limit} real markets from Polymarket...\n`);
  
  let marketsAdded = 0;
  let marketsUpdated = 0;
  let errors = 0;
  
  try {
    // Fetch high volume markets (these are the most active)
    const realMarkets = await polymarketPublicAPI.getHighVolumeMarkets(limit);
    
    console.log(`✅ Fetched ${realMarkets.length} markets from Polymarket\n`);
    
    for (const market of realMarkets) {
      try {
        console.log(`Processing: ${market.question.substring(0, 60)}...`);
        
        // Check if market exists
        const existing = await db.query.markets.findFirst({
          where: eq(markets.polymarketId, market.id),
        });

        // Parse outcome prices for quality scoring
        const prices = market.outcomePrices || [];
        const yesPrice = parseFloat(prices[0] || "0.5");
        const volume = parseFloat(market.volume || "0");
        const liquidity = parseFloat(market.liquidity || "0");
        
        // Calculate simple quality scores
        const spreadScore = Math.max(0, 25 - Math.abs(0.5 - yesPrice) * 50);
        const depthScore = Math.min(25, Math.log10(liquidity + 1) * 5);
        const volumeScore = Math.min(25, Math.log10(volume + 1) * 3);
        const totalScore = spreadScore + depthScore + volumeScore;
        
        let qualityGrade: "A" | "B" | "C" | "D" | "F";
        if (totalScore >= 60) qualityGrade = "A";
        else if (totalScore >= 45) qualityGrade = "B";
        else if (totalScore >= 30) qualityGrade = "C";
        else if (totalScore >= 15) qualityGrade = "D";
        else qualityGrade = "F";

        const marketData = {
          polymarketId: market.id,
          question: market.question,
          description: market.description || null,
          category: market.category || "General",
          endDate: market.endDate ? new Date(market.endDate) : null,
          qualityGrade,
          qualityScore: totalScore.toFixed(2),
          spreadScore: spreadScore.toFixed(2),
          depthScore: depthScore.toFixed(2),
          metadata: {
            slug: market.id,
            clobTokenIds: market.clobTokenIds || [],
            outcomes: market.outcomes || ["Yes", "No"],
            outcomePrices: market.outcomePrices || [],
            volume: market.volume,
            liquidity: market.liquidity,
            lastSync: new Date().toISOString(),
          },
          updatedAt: new Date(),
        };

        if (existing) {
          await db
            .update(markets)
            .set(marketData)
            .where(eq(markets.id, existing.id));
          marketsUpdated++;
        } else {
          await db.insert(markets).values(marketData);
          marketsAdded++;
        }
      } catch (error) {
        console.error(`  ❌ Error processing market ${market.id}:`, error);
        errors++;
      }
    }
    
    console.log(`\n✅ Sync complete!`);
    console.log(`   Added: ${marketsAdded}`);
    console.log(`   Updated: ${marketsUpdated}`);
    console.log(`   Errors: ${errors}\n`);
    
    return {
      success: true,
      marketsAdded,
      marketsUpdated,
      errors,
    };
  } catch (error) {
    console.error("❌ Fatal error during sync:", error);
    return {
      success: false,
      marketsAdded: 0,
      marketsUpdated: 0,
      errors: 1,
    };
  }
}

/**
 * Get market statistics from real data
 */
export async function getRealMarketStats() {
  console.log("\n📊 Fetching real-time market statistics...\n");
  
  try {
    const stats = await polymarketPublicAPI.getMarketStats();
    
    console.log(`Total Active Markets: ${stats.totalMarkets}`);
    console.log(`Total Volume: $${stats.totalVolume}`);
    console.log(`High Activity Markets: ${stats.activeMarkets}\n`);
    
    return stats;
  } catch (error) {
    console.error("Error fetching market stats:", error);
    return null;
  }
}
