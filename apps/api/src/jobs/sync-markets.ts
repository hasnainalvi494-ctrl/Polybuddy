import { db, markets, marketSnapshots } from "@polybuddy/db";
import { eq, sql } from "drizzle-orm";

// ============================================================================
// TYPES
// ============================================================================

interface GammaMarket {
  id: string;
  question: string;
  description?: string;
  category?: string;
  endDate?: string;
  closed: boolean;
  active: boolean;
  volume?: string;
  volume24hr?: number;
  volumeNum?: number;
  liquidity?: string;
  liquidityNum?: number;
  outcomes?: string[];
  outcomePrices?: string[];
  spread?: number;
}

// ============================================================================
// GAMMA API CLIENT
// ============================================================================

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";

async function fetchMarketsFromGamma(limit: number = 100, offset: number = 0): Promise<GammaMarket[]> {
  const url = `${GAMMA_API_BASE}/markets?limit=${limit}&offset=${offset}&active=true&closed=false`;
  
  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "PolyBuddy/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Gamma API error: ${response.status}`);
  }

  const data = await response.json() as any[];
  
  // Parse outcomes and prices from JSON strings
  return data.map((m: any) => ({
    ...m,
    outcomes: typeof m.outcomes === "string" ? JSON.parse(m.outcomes) : m.outcomes,
    outcomePrices: typeof m.outcomePrices === "string" ? JSON.parse(m.outcomePrices) : m.outcomePrices,
  }));
}

async function fetchAllActiveMarkets(): Promise<GammaMarket[]> {
  const allMarkets: GammaMarket[] = [];
  const limit = 100;
  let offset = 0;
  let hasMore = true;

  console.log("[MARKET SYNC] Fetching all active markets from Gamma API...");

  while (hasMore) {
    try {
      const batch = await fetchMarketsFromGamma(limit, offset);
      allMarkets.push(...batch);
      
      console.log(`[MARKET SYNC] Fetched ${allMarkets.length} markets so far...`);
      
      if (batch.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
        // Rate limiting
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (error) {
      console.error("[MARKET SYNC] Error fetching batch:", error);
      hasMore = false;
    }
  }

  return allMarkets;
}

// ============================================================================
// QUALITY SCORING
// ============================================================================

function calculateQualityScores(market: GammaMarket): {
  qualityGrade: "A" | "B" | "C" | "D" | "F";
  qualityScore: number;
  spreadScore: number;
  depthScore: number;
  volatilityScore: number;
} {
  let totalScore = 0;
  
  // Spread score (0-25 points) - lower spread is better
  const spread = market.spread || 0.1;
  const spreadScore = Math.max(0, 25 - (spread * 100));
  totalScore += spreadScore;

  // Depth/Liquidity score (0-25 points)
  const liquidity = market.liquidityNum || 0;
  const depthScore = Math.min(25, Math.log10(liquidity + 1) * 5);
  totalScore += depthScore;

  // Volume score (0-25 points)
  const volume = market.volumeNum || 0;
  const volumeScore = Math.min(25, Math.log10(volume + 1) * 3);
  totalScore += volumeScore;

  // Activity score (0-25 points) - based on 24h volume
  const volume24h = market.volume24hr || 0;
  const activityScore = Math.min(25, Math.log10(volume24h + 1) * 5);
  totalScore += activityScore;

  // Volatility proxy (price distance from 0.5)
  const prices = market.outcomePrices || [];
  const yesPrice = parseFloat(prices[0] || "0.5");
  const volatilityScore = Math.abs(yesPrice - 0.5) * 50; // 0-25 range

  // Determine grade
  let qualityGrade: "A" | "B" | "C" | "D" | "F";
  if (totalScore >= 80) qualityGrade = "A";
  else if (totalScore >= 60) qualityGrade = "B";
  else if (totalScore >= 40) qualityGrade = "C";
  else if (totalScore >= 20) qualityGrade = "D";
  else qualityGrade = "F";

  return {
    qualityGrade,
    qualityScore: Math.round(totalScore),
    spreadScore: Math.round(spreadScore),
    depthScore: Math.round(depthScore),
    volatilityScore: Math.round(volatilityScore),
  };
}

function categorizeMarket(market: GammaMarket): string {
  const question = market.question.toLowerCase();
  const category = (market.category || "").toLowerCase();

  // Sports
  if (category.includes("sports") || question.includes("win") && (question.includes("game") || question.includes("match"))) {
    return "sports_scheduled";
  }

  // Politics/Elections
  if (category.includes("politics") || question.includes("election") || question.includes("president") || question.includes("vote")) {
    return "scheduled_event";
  }

  // Crypto
  if (category.includes("crypto") || question.includes("bitcoin") || question.includes("ethereum") || question.includes("btc")) {
    return "continuous_info";
  }

  // Finance/Markets
  if (question.includes("price") || question.includes("stock") || question.includes("market")) {
    return "high_volatility";
  }

  // Long duration (based on end date)
  if (market.endDate) {
    const daysUntilEnd = (new Date(market.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntilEnd > 60) {
      return "long_duration";
    }
  }

  return "binary_catalyst";
}

/**
 * Auto-categorize markets based on their questions
 * This fills in missing categories from the Polymarket API
 */
function autoDetectCategory(question: string, existingCategory?: string): string {
  // If category already exists and is valid, use it
  if (existingCategory && existingCategory.length > 0) {
    return existingCategory;
  }

  const q = question.toLowerCase();

  // Sports - NBA, NFL, NHL, MLB, Soccer, UFC, Tennis, Golf
  const sportsKeywords = [
    'nba', 'nfl', 'nhl', 'mlb', 'mls', 'ufc', 'wwe',
    'super bowl', 'world series', 'stanley cup', 'champions league',
    'premier league', 'la liga', 'bundesliga', 'serie a',
    'tennis', 'golf', 'masters', 'wimbledon', 'us open',
    'olympics', 'world cup', 'euro 202', 'march madness',
    'lakers', 'celtics', 'warriors', 'bulls', 'knicks', 'nets', 'heat', 'sixers', 'suns', 'mavs',
    'cowboys', 'patriots', 'chiefs', 'eagles', 'packers', '49ers', 'ravens', 'bills',
    'yankees', 'dodgers', 'red sox', 'cubs', 'mets', 'braves',
    ' vs. ', ' vs ', 'game ', ' game', 'match ', ' match', 'winner of',
    'mvp', 'rookie of', 'scoring title', 'playoff', 'championship'
  ];
  if (sportsKeywords.some(kw => q.includes(kw))) {
    return "Sports";
  }

  // Politics - Elections, Government, Policy
  const politicsKeywords = [
    'president', 'election', 'congress', 'senate', 'house of rep',
    'governor', 'mayor', 'vote', 'ballot', 'poll',
    'democrat', 'republican', 'gop', 'dnc', 'rnc',
    'trump', 'biden', 'harris', 'desantis', 'newsom', 'pence',
    'cabinet', 'secretary of', 'supreme court', 'justice',
    'legislation', 'bill pass', 'executive order', 'veto',
    'impeach', 'indictment', 'conviction', 'pardon',
    'iran', 'israel', 'russia', 'ukraine', 'china', 'taiwan', 'north korea',
    'sanctions', 'war', 'military', 'nato', 'un ', 'united nations',
    'ceasefire', 'invasion', 'troops', 'strike', 'bomb'
  ];
  if (politicsKeywords.some(kw => q.includes(kw))) {
    return "Politics";
  }

  // Crypto - Bitcoin, Ethereum, etc.
  const cryptoKeywords = [
    'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'blockchain',
    'solana', 'sol', 'cardano', 'ada', 'ripple', 'xrp',
    'dogecoin', 'doge', 'shiba', 'memecoin', 'nft',
    'binance', 'coinbase', 'kraken', 'defi', 'web3',
    'halving', 'mining', 'staking', 'token', 'altcoin'
  ];
  if (cryptoKeywords.some(kw => q.includes(kw))) {
    return "Crypto";
  }

  // Finance/Economics
  const financeKeywords = [
    'fed ', 'federal reserve', 'interest rate', 'rate cut', 'rate hike',
    'inflation', 'cpi', 'gdp', 'unemployment', 'recession',
    's&p', 'nasdaq', 'dow jones', 'stock market', 'nyse',
    'ipo', 'earnings', 'revenue', 'profit', 'bankruptcy',
    'oil price', 'gold price', 'commodity', 'treasury', 'bond yield'
  ];
  if (financeKeywords.some(kw => q.includes(kw))) {
    return "Finance";
  }

  // Tech
  const techKeywords = [
    'apple', 'google', 'microsoft', 'amazon', 'meta', 'facebook',
    'tesla', 'nvidia', 'openai', 'chatgpt', 'ai ', 'artificial intelligence',
    'spacex', 'starlink', 'neuralink', 'twitter', ' x ', 'tiktok',
    'iphone', 'android', 'software', 'app store', 'product launch',
    'ceo', 'elon musk', 'zuckerberg', 'bezos', 'tim cook', 'satya nadella'
  ];
  if (techKeywords.some(kw => q.includes(kw))) {
    return "Tech";
  }

  // Entertainment
  const entertainmentKeywords = [
    'movie', 'film', 'oscar', 'academy award', 'golden globe', 'emmy',
    'grammy', 'billboard', 'album', 'song', 'music', 'concert', 'tour',
    'netflix', 'disney', 'hbo', 'streaming', 'box office',
    'celebrity', 'kardashian', 'taylor swift', 'beyonce', 'drake',
    'tv show', 'series', 'season', 'finale', 'premiere',
    'youtube', 'twitch', 'tiktok', 'influencer', 'viral'
  ];
  if (entertainmentKeywords.some(kw => q.includes(kw))) {
    return "Entertainment";
  }

  // Science & Health
  const scienceKeywords = [
    'vaccine', 'covid', 'virus', 'pandemic', 'fda', 'cdc',
    'drug', 'treatment', 'clinical trial', 'approval',
    'nasa', 'space', 'mars', 'moon', 'asteroid', 'launch',
    'climate', 'temperature', 'hurricane', 'earthquake', 'wildfire',
    'study', 'research', 'scientist', 'discovery'
  ];
  if (scienceKeywords.some(kw => q.includes(kw))) {
    return "Science";
  }

  // Business
  const businessKeywords = [
    'merger', 'acquisition', 'buyout', 'deal', 'partnership',
    'layoff', 'hire', 'workforce', 'employee',
    'market cap', 'valuation', 'funding', 'venture capital',
    'startup', 'unicorn', 'company', 'corporation'
  ];
  if (businessKeywords.some(kw => q.includes(kw))) {
    return "Business";
  }

  // Default to uncategorized (will be shown as "Other")
  return "Other";
}

// ============================================================================
// DATABASE SYNC
// ============================================================================

async function upsertMarket(market: GammaMarket): Promise<string | null> {
  try {
    const scores = calculateQualityScores(market);
    const clusterLabel = categorizeMarket(market);
    
    // Auto-detect category if not provided by API
    const detectedCategory = autoDetectCategory(market.question, market.category || undefined);

    // Parse price from outcomePrices
    const prices = market.outcomePrices || [];
    const yesPrice = parseFloat(prices[0] || "0.5");

    // Check if market exists
    const existing = await db.query.markets.findFirst({
      where: eq(markets.polymarketId, market.id),
    });

    const marketData = {
      polymarketId: market.id,
      question: market.question,
      description: market.description || null,
      category: detectedCategory,
      endDate: market.endDate ? new Date(market.endDate) : null,
      resolved: market.closed,
      qualityGrade: scores.qualityGrade,
      qualityScore: scores.qualityScore.toString(),
      spreadScore: scores.spreadScore.toString(),
      depthScore: scores.depthScore.toString(),
      volatilityScore: scores.volatilityScore.toString(),
      clusterLabel,
      metadata: {
        outcomes: market.outcomes,
        outcomePrices: market.outcomePrices,
        currentPrice: yesPrice,
        volume: market.volumeNum,
        volume24h: market.volume24hr,
        liquidity: market.liquidityNum,
        spread: market.spread,
        lastSync: new Date().toISOString(),
      },
      updatedAt: new Date(),
    };

    let marketId: string;

    if (existing) {
      await db
        .update(markets)
        .set(marketData)
        .where(eq(markets.id, existing.id));
      marketId = existing.id;
    } else {
      const [inserted] = await db
        .insert(markets)
        .values(marketData)
        .returning({ id: markets.id });
      marketId = inserted?.id || "";
    }

    // Create snapshot for ALL markets with data (not just high volume)
    if (marketId && (market.volumeNum || market.liquidityNum || yesPrice)) {
      try {
        await db.insert(marketSnapshots).values({
          marketId,
          price: yesPrice.toString(),
          spread: (market.spread || 0).toString(),
          depth: (market.liquidityNum || 0).toString(),
          volume24h: (market.volume24hr || 0).toString(),
          liquidity: (market.liquidityNum || 0).toString(),
          snapshotAt: new Date(),
        });
      } catch {
        // Ignore snapshot errors - not critical
      }
    }

    return marketId || null;
  } catch (error) {
    console.error(`[MARKET SYNC] Error upserting market ${market.id}:`, error);
    return null;
  }
}

async function createSnapshot(marketId: string, market: GammaMarket): Promise<void> {
  try {
    const prices = market.outcomePrices || [];
    const yesPrice = parseFloat(prices[0] || "0.5");

    await db.insert(marketSnapshots).values({
      marketId,
      price: yesPrice.toString(),
      spread: (market.spread || 0).toString(),
      depth: (market.liquidityNum || 0).toString(),
      volume24h: (market.volume24hr || 0).toString(),
      snapshotAt: new Date(),
    });
  } catch (error) {
    // Ignore snapshot errors - not critical
  }
}

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

export async function syncMarkets(): Promise<{
  total: number;
  updated: number;
  failed: number;
}> {
  console.log("[MARKET SYNC] 🚀 Starting market sync from Gamma API...");
  
  const gammaMarkets = await fetchAllActiveMarkets();
  console.log(`[MARKET SYNC] Found ${gammaMarkets.length} active markets`);

  let updated = 0;
  let failed = 0;

  for (const market of gammaMarkets) {
    const marketId = await upsertMarket(market);
    
    if (marketId) {
      updated++;
    } else {
      failed++;
    }

    // Rate limiting
    if (updated % 50 === 0) {
      console.log(`[MARKET SYNC] Progress: ${updated}/${gammaMarkets.length}`);
      await new Promise(r => setTimeout(r, 100));
    }
  }

  console.log(`[MARKET SYNC] ✅ Sync complete: ${updated} updated, ${failed} failed`);

  return {
    total: gammaMarkets.length,
    updated,
    failed,
  };
}

// ============================================================================
// SCHEDULER
// ============================================================================

export function scheduleMarketSync(intervalMs: number = 15 * 60 * 1000): NodeJS.Timeout {
  console.log(`[MARKET SYNC] Scheduling market sync every ${intervalMs / 1000 / 60} minutes`);

  // Run immediately on startup
  syncMarkets().catch((error) => {
    console.error("[MARKET SYNC] Initial sync failed:", error);
  });

  // Then run periodically
  return setInterval(() => {
    syncMarkets().catch((error) => {
      console.error("[MARKET SYNC] Scheduled sync failed:", error);
    });
  }, intervalMs);
}
