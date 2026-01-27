import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, marketSnapshots, markets } from "@polybuddy/db";
import { desc, eq, gte, sql, and } from "drizzle-orm";

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
  dataSource: z.enum(["live", "limited"]),
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

function getCandleIntervalMs(timeframe: string): number {
  // Return interval in milliseconds
  const map: Record<string, number> = {
    "1h": 5 * 60 * 1000,      // 5-minute candles for 1h
    "4h": 15 * 60 * 1000,     // 15-minute candles for 4h
    "24h": 60 * 60 * 1000,    // 1-hour candles for 24h
    "7d": 6 * 60 * 60 * 1000, // 6-hour candles for 7d
  };
  return map[timeframe] || map["24h"]!;
}

/**
 * Aggregate snapshots into OHLCV candles
 */
function aggregateToCandles(
  snapshots: Array<{ price: string | null; volume24h: string | null; snapshotAt: Date | null }>,
  timeframe: string,
  currentPrice: number
): Array<{
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}> {
  if (snapshots.length === 0) {
    // Return single candle with current price if no history
    return [{
      timestamp: new Date().toISOString(),
      open: currentPrice,
      high: currentPrice,
      low: currentPrice,
      close: currentPrice,
      volume: 0,
    }];
  }

  const candleIntervalMs = getCandleIntervalMs(timeframe);
  const now = Date.now();
  const startTime = now - getTimeframeMs(timeframe);
  
  // Group snapshots by candle interval
  const candleMap = new Map<number, {
    prices: number[];
    volumes: number[];
    timestamp: number;
  }>();

  for (const snapshot of snapshots) {
    if (!snapshot.snapshotAt || !snapshot.price) continue;
    
    const snapshotTime = snapshot.snapshotAt.getTime();
    if (snapshotTime < startTime) continue;
    
    // Calculate which candle this belongs to
    const candleIndex = Math.floor((snapshotTime - startTime) / candleIntervalMs);
    const candleTimestamp = startTime + (candleIndex * candleIntervalMs);
    
    if (!candleMap.has(candleTimestamp)) {
      candleMap.set(candleTimestamp, {
        prices: [],
        volumes: [],
        timestamp: candleTimestamp,
      });
    }
    
    const candle = candleMap.get(candleTimestamp)!;
    candle.prices.push(Number(snapshot.price));
    if (snapshot.volume24h) {
      candle.volumes.push(Number(snapshot.volume24h));
    }
  }

  // Convert grouped data to OHLCV candles
  const candles: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }> = [];

  const sortedTimestamps = Array.from(candleMap.keys()).sort((a, b) => a - b);
  let lastClose = snapshots[snapshots.length - 1]?.price 
    ? Number(snapshots[snapshots.length - 1].price) 
    : currentPrice;

  for (const timestamp of sortedTimestamps) {
    const data = candleMap.get(timestamp)!;
    
    if (data.prices.length === 0) continue;
    
    const open = data.prices[0] || lastClose;
    const close = data.prices[data.prices.length - 1] || lastClose;
    const high = Math.max(...data.prices);
    const low = Math.min(...data.prices);
    const volume = data.volumes.length > 0 
      ? Math.max(...data.volumes) 
      : 0;
    
    candles.push({
      timestamp: new Date(timestamp).toISOString(),
      open,
      high,
      low,
      close,
      volume,
    });
    
    lastClose = close;
  }

  // Ensure we have at least one candle
  if (candles.length === 0) {
    candles.push({
      timestamp: new Date().toISOString(),
      open: currentPrice,
      high: currentPrice,
      low: currentPrice,
      close: currentPrice,
      volume: 0,
    });
  }

  return candles;
}

// ============================================================================
// ROUTES
// ============================================================================

export const priceHistoryRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/markets/:id/price-history - Get candlestick data from REAL snapshots
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

      const marketData = market[0]!;
      const metadata = marketData.metadata as { currentPrice?: number } | null;

      // Get snapshots for the requested timeframe
      const timeframeMs = getTimeframeMs(timeframe);
      const since = new Date(Date.now() - timeframeMs);

      const snapshots = await db
        .select({
          price: marketSnapshots.price,
          volume24h: marketSnapshots.volume24h,
          snapshotAt: marketSnapshots.snapshotAt,
        })
        .from(marketSnapshots)
        .where(
          and(
            eq(marketSnapshots.marketId, id),
            gte(marketSnapshots.snapshotAt, since)
          )
        )
        .orderBy(marketSnapshots.snapshotAt);

      // Get latest snapshot for current price
      const latestSnapshot = await db
        .select()
        .from(marketSnapshots)
        .where(eq(marketSnapshots.marketId, id))
        .orderBy(desc(marketSnapshots.snapshotAt))
        .limit(1);

      // Use live price from snapshot, or metadata, or default
      const currentPrice = latestSnapshot[0]?.price 
        ? Number(latestSnapshot[0].price) 
        : (metadata?.currentPrice ?? 0.5);

      // Aggregate snapshots into OHLCV candles
      const candles = aggregateToCandles(snapshots, timeframe, currentPrice);

      // Determine data source quality
      const dataSource = snapshots.length >= 3 ? "live" as const : "limited" as const;

      // Calculate price change
      const firstCandle = candles[0];
      const lastCandle = candles[candles.length - 1];
      
      const priceChange = firstCandle && lastCandle
        ? lastCandle.close - firstCandle.open
        : null;
      
      const priceChangePercent = firstCandle && priceChange !== null && firstCandle.open > 0
        ? (priceChange / firstCandle.open) * 100
        : null;

      return {
        candles,
        currentPrice,
        priceChange,
        priceChangePercent,
        dataSource,
      };
    }
  );
};
