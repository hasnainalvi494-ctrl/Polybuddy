import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, markets, marketSnapshots } from "@polybuddy/db";
import { eq, desc } from "drizzle-orm";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const OrderBookLevelSchema = z.object({
  price: z.number(),
  size: z.number(),
  total: z.number(), // Cumulative size
});

const OrderBookResponseSchema = z.object({
  marketId: z.string(),
  midPrice: z.number(),
  spread: z.number(),
  bids: z.array(OrderBookLevelSchema),
  asks: z.array(OrderBookLevelSchema),
  timestamp: z.string(),
  dataSource: z.enum(["live", "estimated"]),
  interpretation: z.object({
    bookBalance: z.enum(["balanced", "heavy_bid", "heavy_ask"]),
    largeWalls: z.array(z.object({
      side: z.enum(["bid", "ask"]),
      price: z.number(),
      size: z.number(),
      percentage: z.number(),
    })),
    thinZones: z.array(z.object({
      startPrice: z.number(),
      endPrice: z.number(),
      gap: z.number(),
    })),
    summary: z.string(),
  }),
});

// CLOB API base URL
const CLOB_API = "https://clob.polymarket.com";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch real order book from Polymarket CLOB API
 */
async function fetchRealOrderBook(tokenId: string): Promise<{
  bids: Array<{ price: number; size: number; total: number }>;
  asks: Array<{ price: number; size: number; total: number }>;
  midPrice: number;
  spread: number;
} | null> {
  try {
    const response = await fetch(`${CLOB_API}/book?token_id=${tokenId}`, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "PolyBuddy/1.0",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const data = await response.json() as any;
    
    if (!data.bids && !data.asks) return null;

    // Process bids
    let bidTotal = 0;
    const bids = (data.bids || []).slice(0, 20).map((bid: any) => {
      const price = parseFloat(bid.price || bid.p || 0);
      const size = parseFloat(bid.size || bid.s || 0);
      bidTotal += size;
      return {
        price: Math.round(price * 100) / 100,
        size: Math.round(size),
        total: Math.round(bidTotal),
      };
    });

    // Process asks
    let askTotal = 0;
    const asks = (data.asks || []).slice(0, 20).map((ask: any) => {
      const price = parseFloat(ask.price || ask.p || 0);
      const size = parseFloat(ask.size || ask.s || 0);
      askTotal += size;
      return {
        price: Math.round(price * 100) / 100,
        size: Math.round(size),
        total: Math.round(askTotal),
      };
    });

    // Calculate mid price and spread
    const bestBid = bids[0]?.price || 0.49;
    const bestAsk = asks[0]?.price || 0.51;
    const midPrice = (bestBid + bestAsk) / 2;
    const spread = bestAsk - bestBid;

    return { bids, asks, midPrice, spread };
  } catch (error) {
    console.error("[ORDERBOOK] Failed to fetch from CLOB API:", error);
    return null;
  }
}

/**
 * Generate estimated order book based on market liquidity
 * Used when CLOB API is unavailable
 */
function generateEstimatedOrderBook(midPrice: number, liquidity: number) {
  const bids: Array<{ price: number; size: number; total: number }> = [];
  const asks: Array<{ price: number; size: number; total: number }> = [];

  let bidTotal = 0;
  let askTotal = 0;

  // Base size on liquidity (more liquidity = larger orders)
  const baseSize = Math.max(50, Math.min(500, liquidity / 1000));
  
  // Spread based on liquidity
  const spreadBps = liquidity > 50000 ? 1 : liquidity > 10000 ? 2 : 3;
  const spread = spreadBps / 100;

  // Generate 15 bid levels
  for (let i = 0; i < 15; i++) {
    const price = midPrice - spread / 2 - (i * 0.01);
    if (price <= 0.01) break;

    // Size decreases away from mid price
    const size = baseSize * Math.pow(0.9, i);

    bidTotal += size;
    bids.push({
      price: Math.round(price * 100) / 100,
      size: Math.round(size),
      total: Math.round(bidTotal),
    });
  }

  // Generate 15 ask levels
  for (let i = 0; i < 15; i++) {
    const price = midPrice + spread / 2 + (i * 0.01);
    if (price >= 0.99) break;

    const size = baseSize * Math.pow(0.9, i);

    askTotal += size;
    asks.push({
      price: Math.round(price * 100) / 100,
      size: Math.round(size),
      total: Math.round(askTotal),
    });
  }

  return { bids, asks, bidTotal, askTotal };
}

/**
 * Analyze order book and provide retail interpretation
 */
function analyzeOrderBook(
  bids: Array<{ price: number; size: number; total: number }>,
  asks: Array<{ price: number; size: number; total: number }>
) {
  const totalBidSize = bids.reduce((sum, b) => sum + b.size, 0);
  const totalAskSize = asks.reduce((sum, a) => sum + a.size, 0);

  // Determine book balance
  let bookBalance: "balanced" | "heavy_bid" | "heavy_ask" = "balanced";
  const bidAskRatio = totalBidSize / (totalAskSize || 1);

  if (bidAskRatio > 1.5) {
    bookBalance = "heavy_bid";
  } else if (bidAskRatio < 0.67) {
    bookBalance = "heavy_ask";
  }

  // Find large walls (orders > 3x average)
  const avgBidSize = totalBidSize / (bids.length || 1);
  const avgAskSize = totalAskSize / (asks.length || 1);

  const largeWalls: Array<{
    side: "bid" | "ask";
    price: number;
    size: number;
    percentage: number;
  }> = [];

  for (const bid of bids) {
    if (bid.size > avgBidSize * 3) {
      largeWalls.push({
        side: "bid",
        price: bid.price,
        size: bid.size,
        percentage: (bid.size / totalBidSize) * 100,
      });
    }
  }

  for (const ask of asks) {
    if (ask.size > avgAskSize * 3) {
      largeWalls.push({
        side: "ask",
        price: ask.price,
        size: ask.size,
        percentage: (ask.size / totalAskSize) * 100,
      });
    }
  }

  // Find thin zones (gaps between price levels)
  const thinZones: Array<{
    startPrice: number;
    endPrice: number;
    gap: number;
  }> = [];

  for (let i = 1; i < bids.length; i++) {
    const gap = (bids[i - 1]?.price || 0) - (bids[i]?.price || 0);
    if (gap > 0.02) {
      thinZones.push({
        startPrice: bids[i]?.price || 0,
        endPrice: bids[i - 1]?.price || 0,
        gap: Math.round(gap * 100) / 100,
      });
    }
  }

  for (let i = 1; i < asks.length; i++) {
    const gap = (asks[i]?.price || 0) - (asks[i - 1]?.price || 0);
    if (gap > 0.02) {
      thinZones.push({
        startPrice: asks[i - 1]?.price || 0,
        endPrice: asks[i]?.price || 0,
        gap: Math.round(gap * 100) / 100,
      });
    }
  }

  // Generate summary
  let summary: string;
  if (bookBalance === "heavy_bid") {
    summary = "Order book shows strong buying pressure. Bids outweigh asks, suggesting bullish sentiment.";
  } else if (bookBalance === "heavy_ask") {
    summary = "Order book shows selling pressure. Asks outweigh bids, suggesting bearish sentiment.";
  } else {
    summary = "Order book is relatively balanced. No strong directional bias from order flow.";
  }

  if (largeWalls.length > 0) {
    const wallSide = largeWalls[0]?.side;
    summary += ` Large ${wallSide} wall detected which may act as support/resistance.`;
  }

  if (thinZones.length > 0) {
    summary += " Thin liquidity zones detected - price could move quickly through these levels.";
  }

  return {
    bookBalance,
    largeWalls: largeWalls.slice(0, 3),
    thinZones: thinZones.slice(0, 3),
    summary,
  };
}

// ============================================================================
// ROUTES
// ============================================================================

export const orderbookRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/markets/:id/orderbook - Get order book for a market
  typedApp.get(
    "/:id/orderbook",
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      // Cache for 30 seconds
      reply.header("Cache-Control", "public, max-age=30");

      // Get market info
      const market = await db.query.markets.findFirst({
        where: eq(markets.id, id),
      });

      if (!market) {
        reply.code(404);
        return { error: "Market not found" };
      }

      // Get latest snapshot for current price and liquidity
      const latestSnapshot = await db
        .select()
        .from(marketSnapshots)
        .where(eq(marketSnapshots.marketId, id))
        .orderBy(desc(marketSnapshots.snapshotAt))
        .limit(1);

      const metadata = market.metadata as { currentPrice?: number; liquidity?: number } | null;
      const midPrice = latestSnapshot[0]?.price 
        ? Number(latestSnapshot[0].price) 
        : (metadata?.currentPrice ?? 0.5);
      const liquidity = latestSnapshot[0]?.liquidity 
        ? Number(latestSnapshot[0].liquidity) 
        : (metadata?.liquidity ?? 10000);

      // Try to fetch real order book from CLOB API
      const realOrderBook = await fetchRealOrderBook(market.polymarketId);

      let bids: Array<{ price: number; size: number; total: number }>;
      let asks: Array<{ price: number; size: number; total: number }>;
      let spread: number;
      let dataSource: "live" | "estimated";

      if (realOrderBook) {
        bids = realOrderBook.bids;
        asks = realOrderBook.asks;
        spread = realOrderBook.spread;
        dataSource = "live";
      } else {
        // Fall back to estimated order book
        const estimated = generateEstimatedOrderBook(midPrice, liquidity);
        bids = estimated.bids;
        asks = estimated.asks;
        spread = bids[0] && asks[0] ? asks[0].price - bids[0].price : 0.02;
        dataSource = "estimated";
      }

      const interpretation = analyzeOrderBook(bids, asks);

      return {
        marketId: id,
        midPrice: Math.round(midPrice * 1000) / 1000,
        spread: Math.round(spread * 1000) / 1000,
        bids,
        asks,
        timestamp: new Date().toISOString(),
        dataSource,
        interpretation,
      };
    }
  );
};
