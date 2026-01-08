import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, whaleActivity, markets } from "@polybuddy/db";
import { desc, eq, gte, sql } from "drizzle-orm";

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

      // Get recent whale trades
      const whaleTrades = await db
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

      // Calculate if trade is "hot" (less than 5 minutes old)
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // Format response
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
          marketName: trade.marketId, // For now, using marketId as name
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

