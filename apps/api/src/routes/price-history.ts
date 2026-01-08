import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, marketSnapshots, markets } from "@polybuddy/db";
import { desc, eq, gte, sql } from "drizzle-orm";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const TimeframeEnum = z.enum(["1h", "4h", "24h", "7d"]);

const CandleSchema = z.object({
  timestamp: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
});

const PriceHistoryResponseSchema = z.object({
  candles: z.array(CandleSchema),
  currentPrice: z.number().nullable(),
  priceChange: z.number().nullable(),
  priceChangePercent: z.number().nullable(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTimeframeMs(timeframe: string): number {
  const map: Record<string, number> = {
    "1h": 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
  };
  return map[timeframe] || map["24h"]!;
}

function getCandleInterval(timeframe: string): number {
  // Return interval in minutes
  const map: Record<string, number> = {
    "1h": 5,      // 5-minute candles for 1h
    "4h": 15,     // 15-minute candles for 4h
    "24h": 60,    // 1-hour candles for 24h
    "7d": 360,    // 6-hour candles for 7d
  };
  return map[timeframe] || map["24h"]!;
}

/**
 * Generate mock OHLCV data for demonstration
 * In production, this would aggregate real price data from snapshots
 */
function generateMockCandles(timeframe: string, currentPrice: number = 0.65): Array<{
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}> {
  const now = new Date();
  const intervalMs = getTimeframeMs(timeframe);
  const candleCount = timeframe === "1h" ? 12 : timeframe === "4h" ? 16 : timeframe === "24h" ? 24 : 28;
  const candleIntervalMs = intervalMs / candleCount;
  
  const candles = [];
  let price = currentPrice - (Math.random() * 0.1 - 0.05); // Start slightly off current

  for (let i = 0; i < candleCount; i++) {
    const timestamp = new Date(now.getTime() - intervalMs + (i * candleIntervalMs));
    
    // Generate OHLC with some volatility
    const volatility = 0.02; // 2% volatility
    const open = price;
    const change = (Math.random() - 0.5) * volatility;
    const close = Math.max(0.01, price + change);
    
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    
    const volume = Math.floor(Math.random() * 50000 + 10000);
    
    candles.push({
      timestamp: timestamp.toISOString(),
      open: Math.max(0.01, open),
      high: Math.max(0.01, high),
      low: Math.max(0.01, low),
      close: Math.max(0.01, close),
      volume,
    });
    
    price = close;
  }
  
  // Ensure last candle close matches current price
  if (candles.length > 0) {
    candles[candles.length - 1]!.close = currentPrice;
  }
  
  return candles;
}

// ============================================================================
// ROUTES
// ============================================================================

export const priceHistoryRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/markets/:id/price-history - Get candlestick data
  typedApp.get(
    "/:id/price-history",
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
        querystring: z.object({
          timeframe: TimeframeEnum.default("24h"),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { timeframe } = request.query;

      // Cache for 1 minute
      reply.header("Cache-Control", "public, max-age=60");

      // Get market to find current price
      const market = await db
        .select()
        .from(markets)
        .where(eq(markets.id, id))
        .limit(1);

      if (market.length === 0) {
        reply.code(404);
        return { error: "Market not found" };
      }

      // Get latest snapshot for current price
      const latestSnapshot = await db
        .select()
        .from(marketSnapshots)
        .where(eq(marketSnapshots.marketId, id))
        .orderBy(desc(marketSnapshots.snapshotAt))
        .limit(1);

      const currentPrice = latestSnapshot[0]?.price 
        ? Number(latestSnapshot[0].price) 
        : 0.5; // Default to 50% if no snapshots

      // Generate mock candles
      // In production, this would aggregate real snapshot data into OHLCV candles
      const candles = generateMockCandles(timeframe, currentPrice);

      // Calculate price change
      const firstCandle = candles[0];
      const lastCandle = candles[candles.length - 1];
      
      const priceChange = firstCandle && lastCandle
        ? lastCandle.close - firstCandle.open
        : null;
      
      const priceChangePercent = firstCandle && priceChange !== null
        ? (priceChange / firstCandle.open) * 100
        : null;

      return {
        candles,
        currentPrice,
        priceChange,
        priceChangePercent,
      };
    }
  );
};

