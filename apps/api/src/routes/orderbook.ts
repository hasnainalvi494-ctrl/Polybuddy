import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate mock order book data
 * In production, this would fetch from CLOB API
 */
function generateMockOrderBook(midPrice: number = 0.5) {
  const bids: Array<{ price: number; size: number; total: number }> = [];
  const asks: Array<{ price: number; size: number; total: number }> = [];

  let bidTotal = 0;
  let askTotal = 0;

  // Generate 20 bid levels (below mid price)
  for (let i = 0; i < 20; i++) {
    const price = midPrice - (i + 1) * 0.01;
    if (price <= 0) break;

    // Vary size with some randomness and occasional large walls
    let size = 100 + Math.random() * 200;
    
    // Create occasional large walls (20% chance)
    if (Math.random() > 0.8) {
      size *= 3;
    }

    bidTotal += size;
    bids.push({
      price: Math.round(price * 100) / 100,
      size: Math.round(size),
      total: Math.round(bidTotal),
    });
  }

  // Generate 20 ask levels (above mid price)
  for (let i = 0; i < 20; i++) {
    const price = midPrice + (i + 1) * 0.01;
    if (price >= 1) break;

    let size = 100 + Math.random() * 200;
    
    // Create occasional large walls
    if (Math.random() > 0.8) {
      size *= 3;
    }

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
function interpretOrderBook(
  bids: Array<{ price: number; size: number; total: number }>,
  asks: Array<{ price: number; size: number; total: number }>,
  bidTotal: number,
  askTotal: number
) {
  // Determine book balance
  const bidAskRatio = bidTotal / askTotal;
  let bookBalance: "balanced" | "heavy_bid" | "heavy_ask";
  
  if (bidAskRatio > 1.3) {
    bookBalance = "heavy_bid";
  } else if (bidAskRatio < 0.7) {
    bookBalance = "heavy_ask";
  } else {
    bookBalance = "balanced";
  }

  // Find large walls (>20% of total depth on that side)
  const largeWalls: Array<{
    side: "bid" | "ask";
    price: number;
    size: number;
    percentage: number;
  }> = [];

  bids.forEach((bid) => {
    const percentage = (bid.size / bidTotal) * 100;
    if (percentage > 20) {
      largeWalls.push({
        side: "bid",
        price: bid.price,
        size: bid.size,
        percentage: Math.round(percentage),
      });
    }
  });

  asks.forEach((ask) => {
    const percentage = (ask.size / askTotal) * 100;
    if (percentage > 20) {
      largeWalls.push({
        side: "ask",
        price: ask.price,
        size: ask.size,
        percentage: Math.round(percentage),
      });
    }
  });

  // Find thin zones (gaps >2% between levels)
  const thinZones: Array<{
    startPrice: number;
    endPrice: number;
    gap: number;
  }> = [];

  for (let i = 0; i < bids.length - 1; i++) {
    const gap = Math.abs(bids[i].price - bids[i + 1].price);
    const gapPercent = (gap / bids[i].price) * 100;
    if (gapPercent > 2) {
      thinZones.push({
        startPrice: bids[i + 1].price,
        endPrice: bids[i].price,
        gap: Math.round(gapPercent * 100) / 100,
      });
    }
  }

  for (let i = 0; i < asks.length - 1; i++) {
    const gap = Math.abs(asks[i + 1].price - asks[i].price);
    const gapPercent = (gap / asks[i].price) * 100;
    if (gapPercent > 2) {
      thinZones.push({
        startPrice: asks[i].price,
        endPrice: asks[i + 1].price,
        gap: Math.round(gapPercent * 100) / 100,
      });
    }
  }

  // Generate summary
  let summary = "";
  
  if (bookBalance === "heavy_bid") {
    summary = "Strong buying pressure. More buyers than sellers in the book.";
  } else if (bookBalance === "heavy_ask") {
    summary = "Strong selling pressure. More sellers than buyers in the book.";
  } else {
    summary = "Balanced order book. Similar depth on both sides.";
  }

  if (largeWalls.length > 0) {
    summary += ` ${largeWalls.length} large liquidity wall${largeWalls.length > 1 ? "s" : ""} detected.`;
  }

  if (thinZones.length > 0) {
    summary += ` ${thinZones.length} thin zone${thinZones.length > 1 ? "s" : ""} with low liquidity.`;
  }

  return {
    bookBalance,
    largeWalls,
    thinZones,
    summary,
  };
}

// ============================================================================
// ROUTES
// ============================================================================

export const orderbookRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/markets/:id/orderbook
  typedApp.get(
    "/:id/orderbook",
    {
      schema: {
        description: "Get order book for a market",
        tags: ["orderbook"],
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: OrderBookResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      // Cache for 5 seconds
      reply.header("Cache-Control", "public, max-age=5");

      // In production, fetch from CLOB API
      // For now, generate mock data
      const midPrice = 0.45 + Math.random() * 0.2; // 0.45 - 0.65
      const { bids, asks, bidTotal, askTotal } = generateMockOrderBook(midPrice);

      // Calculate spread
      const bestBid = bids[0]?.price || midPrice - 0.01;
      const bestAsk = asks[0]?.price || midPrice + 0.01;
      const spread = bestAsk - bestBid;

      // Interpret order book
      const interpretation = interpretOrderBook(bids, asks, bidTotal, askTotal);

      return {
        marketId: id,
        midPrice: Math.round(midPrice * 1000) / 1000,
        spread: Math.round(spread * 10000) / 10000,
        bids,
        asks,
        timestamp: new Date().toISOString(),
        interpretation,
      };
    }
  );
};

// ============================================================================
// CLOB API INTEGRATION (Future Enhancement)
// ============================================================================

/*
async function fetchOrderBookFromCLOB(
  marketId: string,
  outcome: "YES" | "NO"
): Promise<{ bids: any[]; asks: any[] }> {
  // Example CLOB API endpoint
  const response = await fetch(
    `https://clob.polymarket.com/book?token_id=${marketId}&side=${outcome}`
  );
  
  const data = await response.json();
  
  return {
    bids: data.bids.map((bid: any) => ({
      price: parseFloat(bid.price),
      size: parseFloat(bid.size),
    })),
    asks: data.asks.map((ask: any) => ({
      price: parseFloat(ask.price),
      size: parseFloat(ask.size),
    })),
  };
}
*/

