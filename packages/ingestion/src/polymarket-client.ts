import { z } from "zod";

const POLYMARKET_API_BASE = "https://gamma-api.polymarket.com";
const CLOB_API_BASE = "https://clob.polymarket.com";

// Helper to parse JSON string arrays from the API
const jsonStringArray = z.string().transform((val) => {
  try {
    return JSON.parse(val) as string[];
  } catch {
    return [];
  }
});

export const PolymarketMarketSchema = z.object({
  id: z.string(),
  question: z.string(),
  description: z.string().nullish(),
  category: z.string().nullish(),
  endDate: z.string().nullish(),
  closed: z.boolean(),
  active: z.boolean(),
  volume: z.string().nullish(),
  volume24hr: z.number().nullish(),
  volumeNum: z.number().nullish(),
  liquidity: z.string().nullish(),
  liquidityNum: z.number().nullish(),
  outcomes: jsonStringArray.optional(),
  outcomePrices: jsonStringArray.optional(),
  spread: z.number().nullish(),
});

export const PolymarketMarketsResponseSchema = z.array(PolymarketMarketSchema);

export type PolymarketMarket = z.infer<typeof PolymarketMarketSchema>;

export const OrderBookSchema = z.object({
  market: z.string(),
  asset_id: z.string(),
  bids: z.array(
    z.object({
      price: z.string(),
      size: z.string(),
    })
  ),
  asks: z.array(
    z.object({
      price: z.string(),
      size: z.string(),
    })
  ),
  hash: z.string().optional(),
  timestamp: z.string().optional(),
});

export type OrderBook = z.infer<typeof OrderBookSchema>;

export class PolymarketClient {
  private rateLimitDelay = 200; // ms between requests

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetch<T extends z.ZodTypeAny>(url: string, schema: T): Promise<z.output<T>> {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "PolyBuddy/0.1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return schema.parse(data);
  }

  async getMarkets(params?: {
    limit?: number;
    offset?: number;
    active?: boolean;
    closed?: boolean;
  }): Promise<PolymarketMarket[]> {
    const searchParams = new URLSearchParams();

    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());
    if (params?.active !== undefined) searchParams.set("active", params.active.toString());
    if (params?.closed !== undefined) searchParams.set("closed", params.closed.toString());

    const url = `${POLYMARKET_API_BASE}/markets?${searchParams.toString()}`;
    await this.delay(this.rateLimitDelay);

    return this.fetch(url, PolymarketMarketsResponseSchema);
  }

  async getMarket(marketId: string): Promise<PolymarketMarket> {
    const url = `${POLYMARKET_API_BASE}/markets/${marketId}`;
    await this.delay(this.rateLimitDelay);

    return this.fetch(url, PolymarketMarketSchema);
  }

  async getAllActiveMarkets(): Promise<PolymarketMarket[]> {
    const allMarkets: PolymarketMarket[] = [];
    const limit = 100;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const markets = await this.getMarkets({
        limit,
        offset,
        active: true,
        closed: false,
      });

      allMarkets.push(...markets);

      if (markets.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    return allMarkets;
  }

  async getOrderBook(tokenId: string): Promise<OrderBook | null> {
    try {
      const url = `${CLOB_API_BASE}/book?token_id=${tokenId}`;
      await this.delay(this.rateLimitDelay);

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "PolyBuddy/0.1.0",
        },
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Order book request failed: ${response.status}`);
      }

      const data = await response.json();
      return OrderBookSchema.parse(data);
    } catch (error) {
      console.error(`Failed to fetch order book for ${tokenId}:`, error);
      return null;
    }
  }

  calculateSpread(orderBook: OrderBook): number | null {
    if (orderBook.bids.length === 0 || orderBook.asks.length === 0) {
      return null;
    }

    const bestBid = parseFloat(orderBook.bids[0].price);
    const bestAsk = parseFloat(orderBook.asks[0].price);

    return bestAsk - bestBid;
  }

  calculateDepth(orderBook: OrderBook, levels: number = 5): number {
    let totalDepth = 0;

    for (let i = 0; i < Math.min(levels, orderBook.bids.length); i++) {
      totalDepth += parseFloat(orderBook.bids[i].size);
    }

    for (let i = 0; i < Math.min(levels, orderBook.asks.length); i++) {
      totalDepth += parseFloat(orderBook.asks[i].size);
    }

    return totalDepth;
  }
}

export const polymarketClient = new PolymarketClient();
