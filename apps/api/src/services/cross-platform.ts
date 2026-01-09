import { db } from "@polybuddy/db";
import { sql } from "drizzle-orm";

// ============================================================================
// CROSS-PLATFORM PRICE COMPARISON SERVICE
// ============================================================================

export interface PlatformPrice {
  platform: string;
  yesPrice: number;
  noPrice: number;
  spread: number;
  timestamp: string;
}

export interface CrossPlatformComparison {
  marketId: string;
  platforms: PlatformPrice[];
  bestYesPrice: {
    platform: string;
    price: number;
    savingsVsWorst: number;
  } | null;
  bestNoPrice: {
    platform: string;
    price: number;
    savingsVsWorst: number;
  } | null;
  recommendation: string;
}

/**
 * Get cross-platform price comparison for a market
 */
export async function getCrossPlatformPrices(polymarketId: string): Promise<CrossPlatformComparison | null> {
  try {
    // Find the cross-platform market mapping
    const mappingResult = await db.execute(
      sql`
        SELECT id, kalshi_id, limitless_id, match_confidence
        FROM cross_platform_markets
        WHERE polymarket_id = ${polymarketId}
      `
    );

    if (!mappingResult || !mappingResult.rows || mappingResult.rows.length === 0) {
      return null;
    }

    const mapping = mappingResult.rows[0] as any;

    // Get latest prices for all platforms
    const pricesResult = await db.execute(
      sql`
        SELECT platform, yes_price, no_price, timestamp
        FROM cross_platform_prices
        WHERE cross_platform_market_id = ${mapping.id}
        ORDER BY timestamp DESC
        LIMIT 10
      `
    );

    if (!pricesResult || !pricesResult.rows || pricesResult.rows.length === 0) {
      return null;
    }

  // Group by platform and get latest price for each
  const platformPrices = new Map<string, PlatformPrice>();
  
  for (const row of pricesResult.rows as any[]) {
    if (!platformPrices.has(row.platform)) {
      const yesPrice = parseFloat(row.yes_price);
      const noPrice = parseFloat(row.no_price);
      const spread = Math.abs((yesPrice + noPrice) - 1);
      
      platformPrices.set(row.platform, {
        platform: row.platform,
        yesPrice,
        noPrice,
        spread,
        timestamp: row.timestamp,
      });
    }
  }

  const platforms = Array.from(platformPrices.values());

  // Find best prices
  let bestYesPrice: CrossPlatformComparison["bestYesPrice"] = null;
  let bestNoPrice: CrossPlatformComparison["bestNoPrice"] = null;

  if (platforms.length > 0) {
    // Best YES price = lowest (you pay less to buy YES)
    const sortedByYes = [...platforms].sort((a, b) => a.yesPrice - b.yesPrice);
    const worstYes = sortedByYes[sortedByYes.length - 1].yesPrice;
    bestYesPrice = {
      platform: sortedByYes[0].platform,
      price: sortedByYes[0].yesPrice,
      savingsVsWorst: worstYes - sortedByYes[0].yesPrice,
    };

    // Best NO price = lowest (you pay less to buy NO)
    const sortedByNo = [...platforms].sort((a, b) => a.noPrice - b.noPrice);
    const worstNo = sortedByNo[sortedByNo.length - 1].noPrice;
    bestNoPrice = {
      platform: sortedByNo[0].platform,
      price: sortedByNo[0].noPrice,
      savingsVsWorst: worstNo - sortedByNo[0].noPrice,
    };
  }

  // Generate recommendation
  const recommendation = generateRecommendation(bestYesPrice, bestNoPrice, platforms);

    return {
      marketId: polymarketId,
      platforms,
      bestYesPrice,
      bestNoPrice,
      recommendation,
    };
  } catch (error) {
    console.error("Error fetching cross-platform prices:", error);
    return null;
  }
}

/**
 * Generate trading recommendation based on price comparison
 */
function generateRecommendation(
  bestYes: CrossPlatformComparison["bestYesPrice"],
  bestNo: CrossPlatformComparison["bestNoPrice"],
  platforms: PlatformPrice[]
): string {
  if (!bestYes || !bestNo) {
    return "Insufficient data for recommendation";
  }

  const platformName = capitalizeFirst(bestYes.platform);
  const savingsCents = (bestYes.savingsVsWorst * 100).toFixed(1);

  if (bestYes.savingsVsWorst > 0.02) {
    return `💡 ${platformName} has the best YES price (save ${savingsCents}¢)`;
  } else if (bestNo.savingsVsWorst > 0.02) {
    const noPlatform = capitalizeFirst(bestNo.platform);
    const noSavings = (bestNo.savingsVsWorst * 100).toFixed(1);
    return `💡 ${noPlatform} has the best NO price (save ${noSavings}¢)`;
  } else {
    return "✅ Prices are similar across platforms";
  }
}

/**
 * Capitalize first letter of string
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

