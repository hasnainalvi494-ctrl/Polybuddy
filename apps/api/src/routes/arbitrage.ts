import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, markets, marketSnapshots } from "@polybuddy/db";
import { desc, sql } from "drizzle-orm";

// Cache for arbitrage opportunities
let arbitrageCache: {
  opportunities: ArbitrageOpportunity[];
  lastUpdated: Date;
} | null = null;

const CACHE_DURATION_MS = 60 * 1000; // 60 seconds

type ArbitrageOpportunity = {
  marketId: string;
  marketName: string;
  yesPrice: number;
  noPrice: number;
  spread: number;
  profitPerShare: number;
  profitPer100: number;
  roiPercent: number;
  resolvesIn: string;
  difficulty: "easy" | "medium" | "hard";
};

// Calculate time until resolution
function calculateResolvesIn(endDate: Date | null): string {
  if (!endDate) return "Open-ended";
  
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  
  if (diff < 0) return "Resolved";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return "< 1h";
}

// Determine difficulty based on spread and liquidity
function calculateDifficulty(spread: number, volume: number): "easy" | "medium" | "hard" {
  // Easy: tight spread, high volume
  if (spread < 0.96 && volume > 50000) return "easy";
  // Medium: moderate spread or volume
  if (spread < 0.97 || volume > 20000) return "medium";
  // Hard: wide spread, low volume
  return "hard";
}

export const arbitrageRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/arbitrage - Find arbitrage opportunities
  typedApp.get(
    "/",
    {
      schema: {
        response: {
          200: z.object({
            opportunities: z.array(z.object({
              marketId: z.string(),
              marketName: z.string(),
              yesPrice: z.number(),
              noPrice: z.number(),
              spread: z.number(),
              profitPerShare: z.number(),
              profitPer100: z.number(),
              roiPercent: z.number(),
              resolvesIn: z.string(),
              difficulty: z.enum(["easy", "medium", "hard"]),
            })),
            lastUpdated: z.string(),
            nextUpdate: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const now = new Date();

      // Return cached data if still valid
      if (
        arbitrageCache &&
        now.getTime() - arbitrageCache.lastUpdated.getTime() < CACHE_DURATION_MS
      ) {
        const timeUntilNextUpdate = CACHE_DURATION_MS - (now.getTime() - arbitrageCache.lastUpdated.getTime());
        return {
          opportunities: arbitrageCache.opportunities,
          lastUpdated: arbitrageCache.lastUpdated.toISOString(),
          nextUpdate: Math.ceil(timeUntilNextUpdate / 1000),
        };
      }

      // Fetch all active markets with their latest snapshots
      const marketsWithSnapshots = await db
        .select({
          marketId: markets.id,
          marketName: markets.question,
          marketEndDate: markets.endDate,
          snapshotPrice: marketSnapshots.price,
          snapshotVolume: marketSnapshots.volume24h,
          snapshotAt: marketSnapshots.snapshotAt,
        })
        .from(markets)
        .leftJoin(
          marketSnapshots,
          sql`${marketSnapshots.marketId} = ${markets.id}`
        )
        .where(sql`${markets.resolved} = false`)
        .orderBy(desc(marketSnapshots.snapshotAt));

      // Group by market and get latest snapshot for each
      const marketMap = new Map<string, {
        marketId: string;
        marketName: string;
        endDate: Date | null;
        price: number | null;
        volume: number | null;
      }>();

      for (const row of marketsWithSnapshots) {
        if (!marketMap.has(row.marketId) && row.snapshotPrice) {
          marketMap.set(row.marketId, {
            marketId: row.marketId,
            marketName: row.marketName,
            endDate: row.marketEndDate,
            price: row.snapshotPrice ? Number(row.snapshotPrice) : null,
            volume: row.snapshotVolume ? Number(row.snapshotVolume) : null,
          });
        }
      }

      // Find arbitrage opportunities
      const opportunities: ArbitrageOpportunity[] = [];

      for (const market of marketMap.values()) {
        if (!market.price) continue;

        const yesPrice = market.price;
        const noPrice = 1 - yesPrice;
        const spread = yesPrice + noPrice;

        // Arbitrage exists if spread < 0.98 (allowing for 2% fees)
        if (spread < 0.98) {
          const profitPerShare = 1 - spread;
          const profitPer100 = profitPerShare * 100;
          const roiPercent = (profitPerShare / spread) * 100;
          const resolvesIn = calculateResolvesIn(market.endDate);
          const difficulty = calculateDifficulty(spread, market.volume || 0);

          opportunities.push({
            marketId: market.marketId,
            marketName: market.marketName,
            yesPrice: Math.round(yesPrice * 100) / 100,
            noPrice: Math.round(noPrice * 100) / 100,
            spread: Math.round(spread * 100) / 100,
            profitPerShare: Math.round(profitPerShare * 100) / 100,
            profitPer100: Math.round(profitPer100 * 100) / 100,
            roiPercent: Math.round(roiPercent * 10) / 10,
            resolvesIn,
            difficulty,
          });
        }
      }

      // Sort by highest profit percentage
      opportunities.sort((a, b) => b.roiPercent - a.roiPercent);

      // Take top 10
      const topOpportunities = opportunities.slice(0, 10);

      // Update cache
      arbitrageCache = {
        opportunities: topOpportunities,
        lastUpdated: now,
      };

      return {
        opportunities: topOpportunities,
        lastUpdated: now.toISOString(),
        nextUpdate: 60,
      };
    }
  );
};




