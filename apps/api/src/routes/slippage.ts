import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, markets, marketSnapshots } from "@polybuddy/db";
import { eq, desc } from "drizzle-orm";

const SlippageCalculationSchema = z.object({
  marketId: z.string().uuid(),
  tradeSize: z.number().positive(),
  side: z.enum(["YES", "NO"]),
});

const SlippageResponseSchema = z.object({
  marketId: z.string(),
  tradeSize: z.number(),
  side: z.string(),
  estimatedSlippage: z.number(),
  slippagePercentage: z.number(),
  effectivePrice: z.number(),
  marketPrice: z.number(),
  breakdown: z.object({
    spreadCost: z.number(),
    marketImpact: z.number(),
    totalSlippage: z.number(),
  }),
  disclaimer: z.string(),
});

export const slippageRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // Calculate slippage for a trade
  typedApp.post(
    "/calculate",
    {
      schema: {
        body: SlippageCalculationSchema,
        response: {
          200: SlippageResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { marketId, tradeSize, side } = request.body;

      // Get market data
      const market = await db.query.markets.findFirst({
        where: eq(markets.id, marketId),
      });

      if (!market) {
        return reply.status(404).send({ error: "Market not found" });
      }

      // Get latest snapshot
      const [snapshot] = await db
        .select()
        .from(marketSnapshots)
        .where(eq(marketSnapshots.marketId, marketId))
        .orderBy(desc(marketSnapshots.snapshotAt))
        .limit(1);

      if (!snapshot) {
        return reply.status(404).send({ error: "No market data available" });
      }

      const marketPrice = Number(snapshot.price) || 0.5;
      const liquidity = Number(snapshot.liquidity) || 0;
      const spread = Number(snapshot.spread) || 0.01;

      // Calculate slippage components
      const spreadCost = tradeSize * (spread / 2); // Half spread for midpoint execution
      const marketImpact = liquidity > 0 ? (tradeSize / liquidity) * tradeSize * 0.5 : tradeSize * 0.1;

      const totalSlippage = spreadCost + marketImpact;
      const slippagePercentage = marketPrice > 0 ? (totalSlippage / tradeSize) * 100 : 0;

      // Effective price after slippage
      const effectivePrice = side === "YES"
        ? Math.min(1, marketPrice + (totalSlippage / tradeSize))
        : Math.max(0, marketPrice - (totalSlippage / tradeSize));

      return {
        marketId,
        tradeSize,
        side,
        estimatedSlippage: totalSlippage,
        slippagePercentage,
        effectivePrice,
        marketPrice,
        breakdown: {
          spreadCost,
          marketImpact,
          totalSlippage,
        },
        disclaimer: "Slippage estimates are approximations based on current market conditions and may vary at execution time.",
      };
    }
  );

  // Get slippage history for a market
  typedApp.get(
    "/history/:marketId",
    {
      schema: {
        params: z.object({ marketId: z.string().uuid() }),
        querystring: z.object({
          days: z.coerce.number().min(1).max(30).default(7),
        }),
        response: {
          200: z.object({
            marketId: z.string(),
            period: z.string(),
            averageSlippage: z.number(),
            maxSlippage: z.number(),
            dataPoints: z.number(),
            disclaimer: z.string(),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { marketId } = request.params;
      const { days } = request.query;

      // Get market data
      const market = await db.query.markets.findFirst({
        where: eq(markets.id, marketId),
      });

      if (!market) {
        return reply.status(404).send({ error: "Market not found" });
      }

      // Get historical snapshots
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const snapshots = await db
        .select({
          price: marketSnapshots.price,
          liquidity: marketSnapshots.liquidity,
          spread: marketSnapshots.spread,
          volume24h: marketSnapshots.volume24h,
        })
        .from(marketSnapshots)
        .where(eq(marketSnapshots.marketId, marketId))
        .orderBy(desc(marketSnapshots.snapshotAt));

      if (snapshots.length === 0) {
        return reply.status(404).send({ error: "No historical data available" });
      }

      // Calculate average slippage over time
      // This is a simplified calculation - in reality you'd need trade data
      let totalSlippage = 0;
      let maxSlippage = 0;
      let validPoints = 0;

      for (const snapshot of snapshots) {
        const price = Number(snapshot.price) || 0.5;
        const liquidity = Number(snapshot.liquidity) || 0;
        const spread = Number(snapshot.spread) || 0.01;
        const volume = Number(snapshot.volume24h) || 0;

        if (volume > 0 && liquidity > 0) {
          // Estimate typical trade size as 1% of daily volume
          const typicalTradeSize = volume * 0.01;
          const spreadCost = typicalTradeSize * (spread / 2);
          const marketImpact = (typicalTradeSize / liquidity) * typicalTradeSize * 0.5;
          const slippage = spreadCost + marketImpact;

          totalSlippage += slippage;
          maxSlippage = Math.max(maxSlippage, slippage);
          validPoints++;
        }
      }

      const averageSlippage = validPoints > 0 ? totalSlippage / validPoints : 0;

      return {
        marketId,
        period: `${days} days`,
        averageSlippage,
        maxSlippage,
        dataPoints: validPoints,
        disclaimer: "Historical slippage estimates are based on market conditions and may not reflect future execution quality.",
      };
    }
  );
};
