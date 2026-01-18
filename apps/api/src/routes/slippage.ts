import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

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
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateMockOrderBook(
  midPrice: number,
  side: "buy" | "sell",
  outcome: "YES" | "NO"
): Array<{ price: number; size: number }> {
  // Generate realistic order book levels
  const levels: Array<{ price: number; size: number }> = [];
  const baseSize = 100 + Math.random() * 200;
  
  // For buy orders, we walk up the ask side (higher prices)
  // For sell orders, we walk down the bid side (lower prices)
  const priceStep = side === "buy" ? 0.01 : -0.01;
  
  for (let i = 0; i < 10; i++) {
    const price = Math.max(0.01, Math.min(0.99, midPrice + priceStep * (i + 1)));
    const size = baseSize * (1 + Math.random() * 0.5) * (1 - i * 0.1); // Decreasing liquidity
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
  const slippagePercent = Math.abs(((executionPrice - midPrice) / midPrice) * 100);
  
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
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { size, side, outcome } = request.query;

      // Cache for 30 seconds
      reply.header("Cache-Control", "public, max-age=30");

      // In a real implementation, fetch from CLOB API
      // For now, generate mock data based on market characteristics
      
      // Mock mid price (in reality, fetch from market data)
      const midPrice = 0.5 + Math.random() * 0.3; // 0.5 - 0.8
      
      // Generate mock order book
      const orderBook = generateMockOrderBook(midPrice, side, outcome);
      
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
        breakdown: orderBook,
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
): Promise<Array<{ price: number; size: number }>> {
  // Example CLOB API endpoint
  const response = await fetch(
    `https://clob.polymarket.com/book?token_id=${marketId}&side=${outcome}`
  );
  
  const data = await response.json();
  
  // Transform CLOB response to our format
  return data.bids.map((bid: any) => ({
    price: parseFloat(bid.price),
    size: parseFloat(bid.size),
  }));
}
*/

