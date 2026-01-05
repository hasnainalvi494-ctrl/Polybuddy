import { db, markets, marketSnapshots } from "@polybuddy/db";
import { eq } from "drizzle-orm";
import { polymarketClient, type PolymarketMarket } from "./polymarket-client.js";

// Infer category from question keywords if not provided by API
function inferCategory(question: string, apiCategory: string | null | undefined): string | null {
  if (apiCategory) return apiCategory;

  const q = question.toLowerCase();

  // Politics
  if (q.includes("trump") || q.includes("biden") || q.includes("election") ||
      q.includes("president") || q.includes("congress") || q.includes("senate") ||
      q.includes("democrat") || q.includes("republican") || q.includes("governor")) {
    return "Politics";
  }

  // Crypto
  if (q.includes("bitcoin") || q.includes("ethereum") || q.includes("crypto") ||
      q.includes("btc") || q.includes("eth") || q.includes("solana") ||
      q.includes("blockchain") || q.includes("defi")) {
    return "Crypto";
  }

  // Sports
  if (q.includes("nfl") || q.includes("nba") || q.includes("mlb") ||
      q.includes("super bowl") || q.includes("world series") || q.includes("championship") ||
      q.includes("playoffs") || q.includes("win the") || q.includes("world cup") ||
      q.includes("ufc") || q.includes("boxing")) {
    return "Sports";
  }

  // Entertainment
  if (q.includes("oscar") || q.includes("movie") || q.includes("film") ||
      q.includes("grammy") || q.includes("emmy") || q.includes("netflix") ||
      q.includes("celebrity") || q.includes("kardashian")) {
    return "Entertainment";
  }

  // Tech
  if (q.includes("apple") || q.includes("google") || q.includes("microsoft") ||
      q.includes("tesla") || q.includes("ai") || q.includes("artificial intelligence") ||
      q.includes("openai") || q.includes("iphone") || q.includes("tech")) {
    return "Tech";
  }

  // Finance
  if (q.includes("fed") || q.includes("interest rate") || q.includes("inflation") ||
      q.includes("stock") || q.includes("s&p") || q.includes("nasdaq") ||
      q.includes("recession") || q.includes("gdp")) {
    return "Finance";
  }

  // Science/Weather
  if (q.includes("climate") || q.includes("temperature") || q.includes("hurricane") ||
      q.includes("earthquake") || q.includes("nasa") || q.includes("space")) {
    return "Science";
  }

  return null;
}

export interface IngestionStats {
  marketsProcessed: number;
  marketsCreated: number;
  marketsUpdated: number;
  snapshotsCreated: number;
  errors: number;
  duration: number;
}

export class MarketIngestionService {
  async syncMarkets(): Promise<IngestionStats> {
    const startTime = Date.now();
    const stats: IngestionStats = {
      marketsProcessed: 0,
      marketsCreated: 0,
      marketsUpdated: 0,
      snapshotsCreated: 0,
      errors: 0,
      duration: 0,
    };

    console.log("[Ingestion] Starting market sync...");

    try {
      const apiMarkets = await polymarketClient.getAllActiveMarkets();
      console.log(`[Ingestion] Fetched ${apiMarkets.length} markets from Polymarket`);

      for (const apiMarket of apiMarkets) {
        try {
          await this.upsertMarket(apiMarket, stats);
          stats.marketsProcessed++;
        } catch (error) {
          console.error(`[Ingestion] Error processing market ${apiMarket.id}:`, error);
          stats.errors++;
        }
      }
    } catch (error) {
      console.error("[Ingestion] Failed to fetch markets:", error);
      throw error;
    }

    stats.duration = Date.now() - startTime;
    console.log(`[Ingestion] Sync complete in ${stats.duration}ms`, stats);

    return stats;
  }

  private async upsertMarket(
    apiMarket: PolymarketMarket,
    stats: IngestionStats
  ): Promise<void> {
    const existingMarket = await db.query.markets.findFirst({
      where: eq(markets.polymarketId, apiMarket.id),
    });

    const price = apiMarket.outcomePrices?.[0]
      ? parseFloat(apiMarket.outcomePrices[0])
      : null;

    const category = inferCategory(apiMarket.question, apiMarket.category);

    const marketData = {
      polymarketId: apiMarket.id,
      question: apiMarket.question,
      description: apiMarket.description,
      category,
      endDate: apiMarket.endDate ? new Date(apiMarket.endDate) : null,
      resolved: apiMarket.closed,
      metadata: {
        outcomes: apiMarket.outcomes,
        active: apiMarket.active,
      },
      updatedAt: new Date(),
    };

    let marketId: string;

    if (existingMarket) {
      await db
        .update(markets)
        .set(marketData)
        .where(eq(markets.id, existingMarket.id));
      marketId = existingMarket.id;
      stats.marketsUpdated++;
    } else {
      const [newMarket] = await db.insert(markets).values(marketData).returning();
      marketId = newMarket.id;
      stats.marketsCreated++;
    }

    await this.createSnapshot(marketId, apiMarket, price);
    stats.snapshotsCreated++;
  }

  private async createSnapshot(
    marketId: string,
    apiMarket: PolymarketMarket,
    price: number | null
  ): Promise<void> {
    const volume24h = apiMarket.volume24hr ?? null;
    const liquidity = apiMarket.liquidityNum ?? (apiMarket.liquidity ? parseFloat(apiMarket.liquidity) : null);

    await db.insert(marketSnapshots).values({
      marketId,
      price: price?.toString() ?? null,
      spread: apiMarket.spread?.toString() ?? null,
      volume24h: volume24h?.toString() ?? null,
      liquidity: liquidity?.toString() ?? null,
      snapshotAt: new Date(),
    });
  }

  async syncSingleMarket(polymarketId: string): Promise<void> {
    console.log(`[Ingestion] Syncing single market: ${polymarketId}`);

    const apiMarket = await polymarketClient.getMarket(polymarketId);
    const stats: IngestionStats = {
      marketsProcessed: 0,
      marketsCreated: 0,
      marketsUpdated: 0,
      snapshotsCreated: 0,
      errors: 0,
      duration: 0,
    };

    await this.upsertMarket(apiMarket, stats);
    console.log(`[Ingestion] Single market sync complete`);
  }
}

export const marketIngestionService = new MarketIngestionService();
