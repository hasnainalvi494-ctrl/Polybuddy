import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, markets, marketBehaviorDimensions } from "@polybuddy/db";
import { eq, and, isNotNull, desc, ne } from "drizzle-orm";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const HistoryResultSchema = z.object({
  outcome: z.enum(["win", "loss", "pending"]),
  marketId: z.string(),
  marketQuestion: z.string(),
  roi: z.number().nullable(),
});

const SimilarHistoryResponseSchema = z.object({
  marketId: z.string(),
  clusterType: z.string(),
  history: z.array(HistoryResultSchema),
  totalWins: z.number(),
  totalLosses: z.number(),
  totalPending: z.number(),
  winRate: z.number(),
  averageROI: z.number(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateOutcome(market: any): "win" | "loss" | "pending" {
  if (!market.resolved) {
    return "pending";
  }

  // If market resolved, check which outcome won
  // For simplicity, we'll use a heuristic:
  // - If final price > 0.5, YES won
  // - If final price <= 0.5, NO won
  const finalPrice = market.resolvedPrice || market.currentPrice || 0.5;
  
  // Assume we're betting on YES (this is simplified)
  // In reality, you'd track which side was recommended
  if (finalPrice > 0.5) {
    return "win"; // YES won
  } else {
    return "loss"; // NO won
  }
}

function calculateROI(market: any, outcome: "win" | "loss" | "pending"): number | null {
  if (outcome === "pending") {
    return null;
  }

  // Simplified ROI calculation
  // Assuming we bet on YES at entry price
  const entryPrice = market.currentPrice || 0.5;
  const exitPrice = market.resolvedPrice || (outcome === "win" ? 1 : 0);
  
  if (entryPrice === 0) return null;
  
  const roi = ((exitPrice - entryPrice) / entryPrice) * 100;
  return roi;
}

// ============================================================================
// ROUTES
// ============================================================================

export const similarHistoryRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/markets/:id/similar-history
  typedApp.get(
    "/:id/similar-history",
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: SimilarHistoryResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      // Cache for 5 minutes
      reply.header("Cache-Control", "public, max-age=300");

      // Get the market's cluster type
      const marketBehavior = await db.query.marketBehaviorDimensions.findFirst({
        where: eq(marketBehaviorDimensions.marketId, id),
      });

      if (!marketBehavior) {
        // No cluster data, return mock data
        return generateMockHistory(id);
      }

      const clusterType = marketBehavior.clusterType;

      // Find other markets in the same cluster that have resolved
      const similarMarkets = await db
        .select({
          marketId: markets.id,
          question: markets.question,
          resolved: markets.resolved,
          currentPrice: markets.currentPrice,
          resolvedPrice: markets.resolvedPrice,
          endDate: markets.endDate,
        })
        .from(markets)
        .innerJoin(
          marketBehaviorDimensions,
          eq(markets.id, marketBehaviorDimensions.marketId)
        )
        .where(
          and(
            eq(marketBehaviorDimensions.clusterType, clusterType),
            ne(markets.id, id), // Exclude current market
            isNotNull(markets.endDate)
          )
        )
        .orderBy(desc(markets.endDate))
        .limit(20); // Get more than we need

      // Process results
      const history = similarMarkets.slice(0, 10).map((market) => {
        const outcome = calculateOutcome(market);
        const roi = calculateROI(market, outcome);

        return {
          outcome,
          marketId: market.marketId,
          marketQuestion: market.question,
          roi,
        };
      });

      // Calculate stats
      const totalWins = history.filter((h) => h.outcome === "win").length;
      const totalLosses = history.filter((h) => h.outcome === "loss").length;
      const totalPending = history.filter((h) => h.outcome === "pending").length;
      
      const resolvedCount = totalWins + totalLosses;
      const winRate = resolvedCount > 0 ? (totalWins / resolvedCount) * 100 : 0;
      
      const roiValues = history
        .filter((h) => h.roi !== null)
        .map((h) => h.roi as number);
      const averageROI = roiValues.length > 0
        ? roiValues.reduce((sum, roi) => sum + roi, 0) / roiValues.length
        : 0;

      return {
        marketId: id,
        clusterType,
        history,
        totalWins,
        totalLosses,
        totalPending,
        winRate,
        averageROI,
      };
    }
  );
};

// ============================================================================
// MOCK DATA GENERATOR
// ============================================================================

function generateMockHistory(marketId: string) {
  // Generate realistic mock history
  const outcomes: Array<"win" | "loss" | "pending"> = [];
  
  // Generate 7 resolved + 3 pending
  for (let i = 0; i < 7; i++) {
    outcomes.push(Math.random() > 0.4 ? "win" : "loss"); // 60% win rate
  }
  for (let i = 0; i < 3; i++) {
    outcomes.push("pending");
  }

  const history = outcomes.map((outcome, index) => ({
    outcome,
    marketId: `mock-market-${index}`,
    marketQuestion: `Similar Market #${index + 1}`,
    roi: outcome === "pending" 
      ? null 
      : outcome === "win"
      ? 5 + Math.random() * 15 // 5-20% ROI for wins
      : -(5 + Math.random() * 15), // -5 to -20% for losses
  }));

  const totalWins = history.filter((h) => h.outcome === "win").length;
  const totalLosses = history.filter((h) => h.outcome === "loss").length;
  const totalPending = history.filter((h) => h.outcome === "pending").length;
  
  const resolvedCount = totalWins + totalLosses;
  const winRate = resolvedCount > 0 ? (totalWins / resolvedCount) * 100 : 0;
  
  const roiValues = history
    .filter((h) => h.roi !== null)
    .map((h) => h.roi as number);
  const averageROI = roiValues.length > 0
    ? roiValues.reduce((sum, roi) => sum + roi, 0) / roiValues.length
    : 0;

  return {
    marketId,
    clusterType: "scheduled_event",
    history,
    totalWins,
    totalLosses,
    totalPending,
    winRate,
    averageROI,
  };
}


