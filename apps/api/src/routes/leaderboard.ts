import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, walletPerformance, whaleActivity } from "@polybuddy/db";
import { desc, asc, eq, sql, and, gte } from "drizzle-orm";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const LeaderboardQuerySchema = z.object({
  category: z.string().optional(),
  sort: z.enum(["profit", "winRate", "roi", "volume"]).default("profit"),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const TraderSchema = z.object({
  rank: z.number(),
  walletAddress: z.string(),
  totalProfit: z.number(),
  winRate: z.number(),
  tradeCount: z.number(),
  roiPercent: z.number(),
  primaryCategory: z.string().nullable(),
  lastTradeAt: z.string().nullable(),
  activePositions: z.number(),
});

const LeaderboardResponseSchema = z.object({
  traders: z.array(TraderSchema),
  totalTraders: z.number(),
});

const TradeSchema = z.object({
  id: z.string(),
  marketId: z.string(),
  side: z.string(),
  outcome: z.string(),
  entryPrice: z.number().nullable(),
  exitPrice: z.number().nullable(),
  size: z.number().nullable(),
  profit: z.number().nullable(),
  timestamp: z.string(),
  txHash: z.string().nullable(),
});

const CategoryBreakdownSchema = z.object({
  category: z.string(),
  tradeCount: z.number(),
  profit: z.number(),
  winRate: z.number(),
});

const TraderProfileSchema = z.object({
  walletAddress: z.string(),
  rank: z.number().nullable(),
  totalProfit: z.number().nullable(),
  totalVolume: z.number().nullable(),
  winRate: z.number().nullable(),
  tradeCount: z.number(),
  roiPercent: z.number().nullable(),
  primaryCategory: z.string().nullable(),
  lastTradeAt: z.string().nullable(),
  recentTrades: z.array(TradeSchema),
  categoryBreakdown: z.array(CategoryBreakdownSchema),
  performanceOverTime: z.array(z.object({
    date: z.string(),
    profit: z.number(),
    trades: z.number(),
  })),
  winLossDistribution: z.object({
    wins: z.number(),
    losses: z.number(),
    breakeven: z.number(),
  }),
});

// ============================================================================
// ROUTES
// ============================================================================

export const leaderboardRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/leaderboard - Get top traders
  typedApp.get(
    "/",
    {
      schema: {
        querystring: LeaderboardQuerySchema,
        response: {
          200: LeaderboardResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { category, sort, limit, offset } = request.query;

      // Build the query
      let query = db.select().from(walletPerformance);

      // Filter by category if provided
      if (category) {
        query = query.where(eq(walletPerformance.primaryCategory, category)) as any;
      }

      // Determine sort order
      let orderByColumn;
      switch (sort) {
        case "winRate":
          orderByColumn = desc(walletPerformance.winRate);
          break;
        case "roi":
          orderByColumn = desc(walletPerformance.roiPercent);
          break;
        case "volume":
          orderByColumn = desc(walletPerformance.totalVolume);
          break;
        case "profit":
        default:
          orderByColumn = desc(walletPerformance.totalProfit);
          break;
      }

      // Execute query with pagination
      const traders = await query
        .orderBy(orderByColumn)
        .limit(limit)
        .offset(offset);

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(walletPerformance)
        .where(category ? eq(walletPerformance.primaryCategory, category) : sql`true`);

      const totalTraders = countResult[0]?.count || 0;

      // For now, set activePositions to a placeholder
      // In production, this would be calculated from current market positions
      const tradersWithRank = traders.map((trader, index) => ({
        rank: offset + index + 1,
        walletAddress: trader.walletAddress,
        totalProfit: Number(trader.totalProfit || 0),
        winRate: Number(trader.winRate || 0),
        tradeCount: trader.tradeCount || 0,
        roiPercent: Number(trader.roiPercent || 0),
        primaryCategory: trader.primaryCategory,
        lastTradeAt: trader.lastTradeAt?.toISOString() || null,
        activePositions: Math.floor(Math.random() * 20), // Placeholder
      }));

      return {
        traders: tradersWithRank,
        totalTraders,
      };
    }
  );

  // GET /api/leaderboard/:walletAddress - Get trader profile
  typedApp.get(
    "/:walletAddress",
    {
      schema: {
        params: z.object({
          walletAddress: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { walletAddress } = request.params;

      // Get wallet performance
      const performance = await db
        .select()
        .from(walletPerformance)
        .where(eq(walletPerformance.walletAddress, walletAddress))
        .limit(1);

      if (performance.length === 0) {
        reply.code(404);
        throw new Error("Trader not found");
      }

      const trader = performance[0]!;

      // Trade details are disabled - wallet_trades table not in use
      // Return empty arrays for trade-related fields
      const recentTrades: any[] = [];
      const categoryBreakdown: any[] = [];
      const performanceOverTime: any[] = [];
      const winLossDistribution = { wins: 0, losses: 0, breakeven: 0 };

      return {
        walletAddress: trader.walletAddress,
        rank: trader.rank,
        totalProfit: Number(trader.totalProfit || 0),
        totalVolume: Number(trader.totalVolume || 0),
        winRate: Number(trader.winRate || 0),
        tradeCount: trader.tradeCount || 0,
        roiPercent: Number(trader.roiPercent || 0),
        primaryCategory: trader.primaryCategory,
        lastTradeAt: trader.lastTradeAt?.toISOString() || null,
        recentTrades: recentTrades.map((trade) => ({
          id: trade.id,
          marketId: trade.marketId,
          side: trade.side,
          outcome: trade.outcome,
          entryPrice: Number(trade.entryPrice || 0),
          exitPrice: Number(trade.exitPrice || 0),
          size: Number(trade.size || 0),
          profit: Number(trade.profit || 0),
          timestamp: trade.timestamp.toISOString(),
          txHash: trade.txHash,
        })),
        categoryBreakdown,
        performanceOverTime,
        winLossDistribution,
      };
    }
  );

  // GET /api/leaderboard/categories - Get available categories with trader counts
  typedApp.get(
    "/categories",
    {
      schema: {
        response: {
          200: z.object({
            categories: z.array(z.object({
              category: z.string(),
              traderCount: z.number(),
            })),
          }),
        },
      },
    },
    async (request, reply) => {
      const categories = await db
        .select({
          category: walletPerformance.primaryCategory,
          traderCount: sql<number>`count(*)::int`,
        })
        .from(walletPerformance)
        .where(sql`${walletPerformance.primaryCategory} IS NOT NULL`)
        .groupBy(walletPerformance.primaryCategory)
        .orderBy(desc(sql`count(*)`));

      return {
        categories: categories.map((cat) => ({
          category: cat.category || "unknown",
          traderCount: cat.traderCount,
        })),
      };
    }
  );
};

