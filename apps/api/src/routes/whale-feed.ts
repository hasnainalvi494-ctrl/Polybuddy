import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, whaleActivity, markets } from "@polybuddy/db";
import { desc, eq, sql, inArray } from "drizzle-orm";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const WhaleTradeSchema = z.object({
  id: z.string(),
  walletAddress: z.string(),
  marketId: z.string(),
  marketName: z.string(),
  action: z.string(),
  outcome: z.string(),
  amountUsd: z.number(),
  price: z.number().nullable(),
  priceBefore: z.number().nullable(),
  priceAfter: z.number().nullable(),
  priceImpact: z.number().nullable(),
  timestamp: z.string(),
  isHot: z.boolean(),
});

const WhaleFeedResponseSchema = z.object({
  trades: z.array(WhaleTradeSchema),
  lastUpdated: z.string(),
});

// Cache for market names (fetched from Gamma API)
const marketNameCache = new Map<string, string>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let lastCacheUpdate = 0;

/**
 * Fetch market names from Gamma API for given market IDs
 */
async function getMarketNames(marketIds: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  
  // Check cache first
  const now = Date.now();
  if (now - lastCacheUpdate < CACHE_TTL) {
    for (const id of marketIds) {
      if (marketNameCache.has(id)) {
        names.set(id, marketNameCache.get(id)!);
      }
    }
    // If all found in cache, return
    if (names.size === marketIds.length) {
      return names;
    }
  }

  // Try to get names from our local database first
  try {
    const localMarkets = await db
      .select({ polymarketId: markets.polymarketId, question: markets.question })
      .from(markets)
      .where(inArray(markets.polymarketId, marketIds));
    
    for (const m of localMarkets) {
      names.set(m.polymarketId, m.question);
      marketNameCache.set(m.polymarketId, m.question);
    }
  } catch {
    // Ignore DB errors
  }

  // For any missing, try Gamma API
  const missing = marketIds.filter(id => !names.has(id));
  if (missing.length > 0) {
    try {
      const response = await fetch(`https://gamma-api.polymarket.com/markets?limit=100`, {
        headers: { "Accept": "application/json" },
      });
      if (response.ok) {
        const data = await response.json();
        for (const market of data) {
          if (missing.includes(market.id)) {
            names.set(market.id, market.question || `Market ${market.id}`);
            marketNameCache.set(market.id, market.question || `Market ${market.id}`);
          }
        }
      }
    } catch {
      // Ignore API errors
    }
  }

  lastCacheUpdate = now;
  return names;
}

// ============================================================================
// ROUTES
// ============================================================================

export const whaleFeedRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/whale-activity - Get recent whale trades
  typedApp.get(
    "/",
    {
      schema: {
        querystring: z.object({
          limit: z.coerce.number().min(1).max(50).default(15),
        }),
        response: {
          200: WhaleFeedResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { limit } = request.query;

      // Cache for 30 seconds
      reply.header("Cache-Control", "public, max-age=30");

      // Get recent whale trades - handle table not existing gracefully
      let whaleTrades: any[] = [];
      try {
        whaleTrades = await db
          .select({
            id: whaleActivity.id,
            walletAddress: whaleActivity.walletAddress,
            marketId: whaleActivity.marketId,
            action: whaleActivity.action,
            outcome: whaleActivity.outcome,
            amountUsd: whaleActivity.amountUsd,
            price: whaleActivity.price,
            priceBefore: whaleActivity.priceBefore,
            priceAfter: whaleActivity.priceAfter,
            timestamp: whaleActivity.timestamp,
          })
          .from(whaleActivity)
          .orderBy(desc(whaleActivity.timestamp))
          .limit(limit);
      } catch (error: any) {
        // If table doesn't exist, return empty array
        if (error.code === '42P01') { // undefined_table
          request.log.warn("whale_activity table does not exist yet");
          return {
            trades: [],
            lastUpdated: new Date().toISOString(),
          };
        }
        throw error;
      }

      // Get market names for all trades
      const marketIds = [...new Set(whaleTrades.map(t => t.marketId))];
      const marketNames = await getMarketNames(marketIds);

      // Calculate if trade is "hot" (less than 5 minutes old)
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // Format response with real market names
      const trades = whaleTrades.map((trade) => {
        const priceBefore = Number(trade.priceBefore || 0);
        const priceAfter = Number(trade.priceAfter || 0);
        const priceImpact = priceBefore > 0 && priceAfter > 0
          ? ((priceAfter - priceBefore) / priceBefore) * 100
          : null;

        const isHot = !!(trade.timestamp && trade.timestamp >= fiveMinutesAgo);

        return {
          id: trade.id,
          walletAddress: trade.walletAddress,
          marketId: trade.marketId,
          marketName: marketNames.get(trade.marketId) || `Market #${trade.marketId.slice(0, 8)}`,
          action: trade.action,
          outcome: trade.outcome,
          amountUsd: Number(trade.amountUsd),
          price: trade.price ? Number(trade.price) : null,
          priceBefore: trade.priceBefore ? Number(trade.priceBefore) : null,
          priceAfter: trade.priceAfter ? Number(trade.priceAfter) : null,
          priceImpact,
          timestamp: trade.timestamp ? trade.timestamp.toISOString() : new Date().toISOString(),
          isHot,
        };
      });

      return {
        trades,
        lastUpdated: new Date().toISOString(),
      };
    }
  );
};

