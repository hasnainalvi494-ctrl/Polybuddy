import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, markets, marketSnapshots } from "@polybuddy/db";
import { eq, desc } from "drizzle-orm";

// CLOB API base URL
const CLOB_API = "https://clob.polymarket.com";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const OrderBookLevel = z.object({
  price: z.number(),
  size: z.number(),
});

const SlippageResponseSchema = z.object({
  inputSize: z.number(),
  side: z.enum(["buy", "sell"]),
  outcome: z.enum(["YES", "NO"]),
  midPrice: z.number(),
  executionPrice: z.number(),
  slippagePercent: z.number(),
  slippageDollars: z.number(),
  priceImpact: z.enum(["Low", "Medium", "High"]),
  warning: z.string(),
  breakdown: z.array(OrderBookLevel),
  dataSource: z.enum(["live", "estimated"]),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch real order book from Polymarket CLOB API
 */
async function fetchRealOrderBook(tokenId: string): Promise<{
  bids: Array<{ price: number; size: number }>;
  asks: Array<{ price: number; size: number }>;
  midPrice: number;
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

    const bids = (data.bids || []).map((bid: any) => ({
      price: parseFloat(bid.price || bid.p || 0),
      size: parseFloat(bid.size || bid.s || 0),
    }));

    const asks = (data.asks || []).map((ask: any) => ({
      price: parseFloat(ask.price || ask.p || 0),
      size: parseFloat(ask.size || ask.s || 0),
    }));

    const bestBid = bids[0]?.price || 0.49;
    const bestAsk = asks[0]?.price || 0.51;
    const midPrice = (bestBid + bestAsk) / 2;

    return { bids, asks, midPrice };
  } catch (error) {
    console.error("[SLIPPAGE] Failed to fetch from CLOB API:", error);
    return null;
  }
}

/**
 * Generate estimated order book based on market liquidity
 */
function generateEstimatedOrderBook(
  midPrice: number,
  liquidity: number,
  side: "buy" | "sell"
): Array<{ price: number; size: number }> {
  const levels: Array<{ price: number; size: number }> = [];
  const baseSize = Math.max(50, Math.min(500, liquidity / 1000));
  
  // For buy orders, we walk up the ask side (higher prices)
  // For sell orders, we walk down the bid side (lower prices)
  const priceStep = side === "buy" ? 0.01 : -0.01;
  
  for (let i = 0; i < 10; i++) {
    const price = Math.max(0.01, Math.min(0.99, midPrice + priceStep * (i + 1)));
    // Liquidity decreases away from mid price
    const size = baseSize * Math.pow(0.85, i);
    levels.push({
      price: Math.round(price * 100) / 100,
      size: Math.round(size),
    });
  }
  
  return levels;
}

function calculateSlippage(
  tradeSize: number,
  orderBook: Array<{ price: number; size: number }>,
  midPrice: number,
  side: "buy" | "sell"
): {
  executionPrice: number;
  slippagePercent: number;
  slippageDollars: number;
  priceImpact: "Low" | "Medium" | "High";
  warning: string;
} {
  let remainingSize = tradeSize;
  let totalCost = 0;
  let sharesFilled = 0;
  
  // Walk through order book levels
  for (const level of orderBook) {
    if (remainingSize <= 0) break;
    
    const fillSize = Math.min(remainingSize, level.size);
    const fillCost = fillSize * level.price;
    
    totalCost += fillCost;
    sharesFilled += fillSize;
    remainingSize -= fillSize;
  }
  
  // If we couldn't fill the entire order, use the last price for remaining
  if (remainingSize > 0 && orderBook.length > 0) {
    const lastPrice = orderBook[orderBook.length - 1]?.price ?? midPrice;
    totalCost += remainingSize * lastPrice;
    sharesFilled += remainingSize;
  }
  
  // Calculate average execution price
  const executionPrice = sharesFilled > 0 ? totalCost / sharesFilled : midPrice;
  
  // Calculate slippage
  const slippageDollars = Math.abs((executionPrice - midPrice) * sharesFilled);
  const slippagePercent = midPrice > 0 
    ? Math.abs(((executionPrice - midPrice) / midPrice) * 100)
    : 0;
  
  // Determine price impact
  let priceImpact: "Low" | "Medium" | "High";
  if (slippagePercent < 1) {
    priceImpact = "Low";
  } else if (slippagePercent < 3) {
    priceImpact = "Medium";
  } else {
    priceImpact = "High";
  }
  
  // Generate warning message
  let warning: string;
  if (slippagePercent < 1) {
    warning = "Good execution expected";
  } else if (slippagePercent < 3) {
    warning = `Moderate slippage. You'll pay ${slippagePercent.toFixed(1)}% ${side === "buy" ? "above" : "below"} mid price.`;
  } else if (slippagePercent < 5) {
    warning = `High slippage - consider smaller size. You'll pay ${slippagePercent.toFixed(1)}% ${side === "buy" ? "above" : "below"} mid price.`;
  } else {
    warning = `Very high slippage - market too thin. You'll pay ${slippagePercent.toFixed(1)}% ${side === "buy" ? "above" : "below"} mid price.`;
  }
  
  return {
    executionPrice,
    slippagePercent,
    slippageDollars,
    priceImpact,
    warning,
  };
}

// ============================================================================
// ROUTES
// ============================================================================

export const slippageRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/markets/:id/slippage
  typedApp.get(
    "/:id/slippage",
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
        querystring: z.object({
          size: z.coerce.number().min(1).default(500),
          side: z.enum(["buy", "sell"]).default("buy"),
          outcome: z.enum(["YES", "NO"]).default("YES"),
        }),
        response: {
          200: SlippageResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { size, side, outcome } = request.query;

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
      let midPrice = latestSnapshot[0]?.price 
        ? Number(latestSnapshot[0].price) 
        : (metadata?.currentPrice ?? 0.5);
      const liquidity = latestSnapshot[0]?.liquidity 
        ? Number(latestSnapshot[0].liquidity) 
        : (metadata?.liquidity ?? 10000);

      // Try to fetch real order book from CLOB API
      const realOrderBook = await fetchRealOrderBook(market.polymarketId);

      let orderBook: Array<{ price: number; size: number }>;
      let dataSource: "live" | "estimated";

      if (realOrderBook) {
        // Use real order book - pick appropriate side
        orderBook = side === "buy" ? realOrderBook.asks : realOrderBook.bids;
        midPrice = realOrderBook.midPrice;
        dataSource = "live";
      } else {
        // Fall back to estimated order book
        orderBook = generateEstimatedOrderBook(midPrice, liquidity, side);
        dataSource = "estimated";
      }

      // Ensure we have some order book levels
      if (orderBook.length === 0) {
        orderBook = generateEstimatedOrderBook(midPrice, liquidity, side);
        dataSource = "estimated";
      }

      // Calculate slippage
      const slippageCalc = calculateSlippage(size, orderBook, midPrice, side);
      
      return {
        inputSize: size,
        side,
        outcome,
        midPrice: Math.round(midPrice * 1000) / 1000,
        executionPrice: Math.round(slippageCalc.executionPrice * 1000) / 1000,
        slippagePercent: Math.round(slippageCalc.slippagePercent * 100) / 100,
        slippageDollars: Math.round(slippageCalc.slippageDollars * 100) / 100,
        priceImpact: slippageCalc.priceImpact,
        warning: slippageCalc.warning,
        breakdown: orderBook.slice(0, 10),
        dataSource,
      };
    }
  );
};
