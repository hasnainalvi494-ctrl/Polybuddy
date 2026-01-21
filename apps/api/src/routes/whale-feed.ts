import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, whaleActivity, markets } from "@polybuddy/db";
import { desc, eq, sql, inArray } from "drizzle-orm";
import { syncWalletData } from "../jobs/sync-wallets.js";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const WhaleTradeSchema = z.object({
  id: z.string(),
  walletAddress: z.string(),
  marketId: z.string(),
  internalMarketId: z.string().nullable(),
  polymarketSlug: z.string().nullable(),
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

// Cache for market info (fetched from DB/Gamma API)
interface MarketInfo {
  name: string;
  internalId: string | null;
  slug: string | null;
}
const marketInfoCache = new Map<string, MarketInfo>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let lastCacheUpdate = 0;

/**
 * Fetch market info (name + internal ID) for given Polymarket IDs
 */
async function getMarketInfo(marketIds: string[]): Promise<Map<string, MarketInfo>> {
  const info = new Map<string, MarketInfo>();
  
  // Check cache first
  const now = Date.now();
  if (now - lastCacheUpdate < CACHE_TTL) {
    for (const id of marketIds) {
      if (marketInfoCache.has(id)) {
        info.set(id, marketInfoCache.get(id)!);
      }
    }
    // If all found in cache, return
    if (info.size === marketIds.length) {
      return info;
    }
  }

  // Try to get info from our local database first
  try {
    const localMarkets = await db
      .select({ 
        id: markets.id,
        polymarketId: markets.polymarketId, 
        question: markets.question 
      })
      .from(markets)
      .where(inArray(markets.polymarketId, marketIds));
    
    for (const m of localMarkets) {
      // For DB markets, we don't have slug stored, will get from Gamma API
      const marketInfo = { name: m.question, internalId: m.id, slug: null };
      info.set(m.polymarketId, marketInfo);
      // Don't cache yet - we'll update with slug from Gamma API
    }
  } catch {
    // Ignore DB errors
  }

  // For all markets, try Gamma API to get slug (and name for missing ones)
  const needsSlug = marketIds.filter(id => !info.has(id) || !info.get(id)?.slug);
  if (needsSlug.length > 0) {
    // Try to fetch each market from Gamma API
    for (const marketId of needsSlug) {
      try {
        const response = await fetch(`https://gamma-api.polymarket.com/markets/${marketId}`, {
          headers: { "Accept": "application/json" },
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          const market = await response.json();
          if (market) {
            const existingInfo = info.get(marketId);
            const marketInfo: MarketInfo = { 
              name: market.question || existingInfo?.name || `Market #${marketId.slice(0, 8)}`,
              internalId: existingInfo?.internalId || null,
              slug: market.slug || null,
            };
            info.set(marketId, marketInfo);
            marketInfoCache.set(marketId, marketInfo);
          }
        }
      } catch {
        // If API fails but we have DB info, keep it
        const existingInfo = info.get(marketId);
        if (existingInfo && !marketInfoCache.has(marketId)) {
          marketInfoCache.set(marketId, existingInfo);
        }
      }
    }
  }

  lastCacheUpdate = now;
  return info;
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
            marketQuestion: whaleActivity.marketQuestion,
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

      // Get market info (names + internal IDs) for all trades
      const marketIds = [...new Set(whaleTrades.map(t => t.marketId))];
      const marketInfo = await getMarketInfo(marketIds);

      // Calculate if trade is "hot" (less than 5 minutes old)
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // Format response with real market names and internal IDs
      const trades = whaleTrades.map((trade) => {
        const priceBefore = Number(trade.priceBefore || 0);
        const priceAfter = Number(trade.priceAfter || 0);
        const priceImpact = priceBefore > 0 && priceAfter > 0
          ? ((priceAfter - priceBefore) / priceBefore) * 100
          : null;

        const isHot = !!(trade.timestamp && trade.timestamp >= fiveMinutesAgo);
        const info = marketInfo.get(trade.marketId);
        
        // Use stored marketQuestion first, then API lookup, then fallback
        const marketName = trade.marketQuestion || info?.name || `Market #${trade.marketId.slice(0, 8)}`;

        return {
          id: trade.id,
          walletAddress: trade.walletAddress,
          marketId: trade.marketId,
          internalMarketId: info?.internalId || null,
          polymarketSlug: info?.slug || null,
          marketName,
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

  // POST /api/whale-activity/sync - Manually trigger whale sync from Polymarket
  typedApp.post(
    "/sync",
    {
      schema: {
        response: {
          200: z.object({
            success: z.boolean(),
            message: z.string(),
            tradesFound: z.number().optional(),
          }),
          429: z.object({
            error: z.string(),
            retryAfter: z.number(),
          }),
          500: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      // Simple rate limiting - check last sync time
      const lastSyncKey = "whale_last_manual_sync";
      const cooldownMs = 60 * 1000; // 1 minute cooldown

      try {
        // Check cooldown (using a simple in-memory approach for now)
        const lastSync = (global as any)[lastSyncKey] as number | undefined;
        const now = Date.now();

        if (lastSync && now - lastSync < cooldownMs) {
          const retryAfter = Math.ceil((cooldownMs - (now - lastSync)) / 1000);
          return reply.code(429).send({
            error: "Please wait before syncing again",
            retryAfter,
          });
        }

        // Update last sync time
        (global as any)[lastSyncKey] = now;

        request.log.info("Manual whale sync triggered");

        // Run the sync
        await syncWalletData();

        // Get count of recent trades
        const recentTrades = await db
          .select({ count: sql<number>`count(*)` })
          .from(whaleActivity);

        const count = recentTrades[0]?.count || 0;

        return {
          success: true,
          message: "Whale activity synced from Polymarket",
          tradesFound: Number(count),
        };
      } catch (error: any) {
        request.log.error(error, "Failed to sync whale activity");
        return reply.code(500).send({
          error: "Failed to sync whale activity: " + (error.message || "Unknown error"),
        });
      }
    }
  );
};

