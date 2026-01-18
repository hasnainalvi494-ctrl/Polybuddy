/**
 * Polymarket API Client
 * 
 * Fetches real data from Polymarket's public APIs:
 * - CLOB API: https://clob.polymarket.com (orderbook, trades)
 * - Gamma API: https://gamma-api.polymarket.com (market discovery, metadata)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PolymarketTrade {
  id: string;
  market: string;
  asset_id: string;
  maker_address: string;
  taker_address?: string;
  side: "BUY" | "SELL";
  outcome: "YES" | "NO";
  price: string;
  size: string;
  timestamp: number;
}

export interface PolymarketMarket {
  id: string;
  question: string;
  description?: string;
  outcomes: string[];
  outcomePrices: string[];
  volume: string;
  liquidity: string;
  endDate?: string;
  closed: boolean;
  category?: string;
  clobTokenIds?: string[];
  conditionId?: string;
}

export interface WalletPosition {
  market_id: string;
  asset_id: string;
  side: "YES" | "NO";
  size: number;
  value: number;
  cost_basis: number;
}

export interface OrderBook {
  market: string;
  asset_id: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
  hash?: string;
  timestamp?: number;
}

export interface PriceData {
  token_id: string;
  price: string;
  bid: string;
  ask: string;
  spread: string;
}

// ============================================================================
// CLOB API CLIENT
// ============================================================================

export class PolymarketClient {
  private readonly clobURL = "https://clob.polymarket.com";
  private readonly gammaURL = "https://gamma-api.polymarket.com";
  
  /**
   * Fetch all trades for a wallet address from CLOB API
   */
  async getWalletTrades(walletAddress: string, limit = 1000): Promise<PolymarketTrade[]> {
    try {
      const response = await fetch(
        `${this.clobURL}/trades?maker=${walletAddress}&limit=${limit}`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "PolyBuddy/1.0",
          },
        }
      );
      
      if (!response.ok) {
        console.error(`[CLOB] Failed to fetch trades for ${walletAddress}: ${response.statusText}`);
        return [];
      }
      
      const trades = await response.json() as PolymarketTrade[] | null;
      return Array.isArray(trades) ? trades : [];
    } catch (error) {
      console.error(`[CLOB] Error fetching wallet trades for ${walletAddress}:`, error);
      return [];
    }
  }
  
  /**
   * Fetch market data by ID from Gamma API
   */
  async getMarket(marketId: string): Promise<PolymarketMarket | null> {
    try {
      const response = await fetch(
        `${this.gammaURL}/markets/${marketId}`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "PolyBuddy/1.0",
          },
        }
      );
      
      if (!response.ok) {
        return null;
      }
      
      const market = await response.json() as PolymarketMarket | null;
      return market;
    } catch (error) {
      console.error(`[GAMMA] Error fetching market ${marketId}:`, error);
      return null;
    }
  }
  
  /**
   * Fetch active markets from Gamma API
   */
  async getActiveMarkets(limit = 100, offset = 0): Promise<PolymarketMarket[]> {
    try {
      const params = new URLSearchParams({
        closed: "false",
        active: "true",
        limit: String(limit),
        offset: String(offset),
      });

      const response = await fetch(
        `${this.gammaURL}/markets?${params}`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "PolyBuddy/1.0",
          },
        }
      );
      
      if (!response.ok) {
        console.error(`[GAMMA] Failed to fetch markets: ${response.statusText}`);
        return [];
      }
      
      const data = await response.json() as PolymarketMarket[] | null;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("[GAMMA] Error fetching active markets:", error);
      return [];
    }
  }
  
  /**
   * Get order book for a token from CLOB API
   */
  async getOrderBook(tokenId: string): Promise<OrderBook | null> {
    try {
      const response = await fetch(
        `${this.clobURL}/book?token_id=${tokenId}`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "PolyBuddy/1.0",
          },
        }
      );
      
      if (!response.ok) {
        return null;
      }
      
      const book = await response.json() as OrderBook | null;
      return book;
    } catch (error) {
      console.error(`[CLOB] Error fetching order book for ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Get current price for a token from CLOB API
   */
  async getPrice(tokenId: string): Promise<PriceData | null> {
    try {
      const response = await fetch(
        `${this.clobURL}/price?token_id=${tokenId}`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "PolyBuddy/1.0",
          },
        }
      );
      
      if (!response.ok) {
        return null;
      }
      
      const price = await response.json() as PriceData | null;
      return price;
    } catch (error) {
      console.error(`[CLOB] Error fetching price for ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Get midpoint price for a token from CLOB API
   */
  async getMidpoint(tokenId: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.clobURL}/midpoint?token_id=${tokenId}`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "PolyBuddy/1.0",
          },
        }
      );
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json() as { mid: string } | null;
      return data?.mid || null;
    } catch (error) {
      console.error(`[CLOB] Error fetching midpoint for ${tokenId}:`, error);
      return null;
    }
  }
  
  /**
   * Get current positions for a wallet (calculated from trades)
   */
  async getWalletPositions(walletAddress: string): Promise<WalletPosition[]> {
    try {
      const trades = await this.getWalletTrades(walletAddress);
      return this.calculatePositionsFromTrades(trades);
    } catch (error) {
      console.error(`[CLOB] Error fetching wallet positions for ${walletAddress}:`, error);
      return [];
    }
  }
  
  /**
   * Calculate current positions from trade history
   */
  private calculatePositionsFromTrades(trades: PolymarketTrade[]): WalletPosition[] {
    const positions = new Map<string, WalletPosition>();
    
    for (const trade of trades) {
      const key = `${trade.market}-${trade.outcome}`;
      const size = parseFloat(trade.size);
      const price = parseFloat(trade.price);
      
      if (!positions.has(key)) {
        positions.set(key, {
          market_id: trade.market,
          asset_id: trade.asset_id,
          side: trade.outcome,
          size: 0,
          value: 0,
          cost_basis: 0,
        });
      }
      
      const position = positions.get(key)!;
      
      if (trade.side === "BUY") {
        position.size += size;
        position.cost_basis += size * price;
      } else {
        position.size -= size;
        position.cost_basis -= size * price;
      }
      
      position.value = position.size * price;
    }
    
    // Filter out closed positions
    return Array.from(positions.values()).filter((p) => Math.abs(p.size) > 0.01);
  }
  
  /**
   * Get top traders by volume
   */
  async getTopTraders(limit = 50): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.clobURL}/trades?limit=10000`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "PolyBuddy/1.0",
          },
        }
      );
      
      if (!response.ok) {
        return [];
      }
      
      const trades = await response.json() as PolymarketTrade[] | null;
      
      if (!Array.isArray(trades)) {
        return [];
      }
      
      // Aggregate volume by trader
      const volumeByTrader = new Map<string, number>();
      
      for (const trade of trades) {
        const volume = parseFloat(trade.size) * parseFloat(trade.price);
        volumeByTrader.set(
          trade.maker_address,
          (volumeByTrader.get(trade.maker_address) || 0) + volume
        );
      }
      
      // Sort by volume and return top traders
      return Array.from(volumeByTrader.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([address]) => address);
    } catch (error) {
      console.error("[CLOB] Error fetching top traders:", error);
      return [];
    }
  }
  
  /**
   * Fetch trades for a specific market from CLOB API
   */
  async getMarketTrades(marketId: string, limit = 1000): Promise<PolymarketTrade[]> {
    try {
      const response = await fetch(
        `${this.clobURL}/trades?market=${marketId}&limit=${limit}`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "PolyBuddy/1.0",
          },
        }
      );
      
      if (!response.ok) {
        return [];
      }
      
      const trades = await response.json() as PolymarketTrade[] | null;
      return Array.isArray(trades) ? trades : [];
    } catch (error) {
      console.error(`[CLOB] Error fetching market trades for ${marketId}:`, error);
      return [];
    }
  }

  /**
   * Search markets by query
   */
  async searchMarkets(query: string, limit = 20): Promise<PolymarketMarket[]> {
    try {
      const markets = await this.getActiveMarkets(limit * 2);
      const searchTerm = query.toLowerCase();
      
      return markets.filter(
        (m) =>
          m.question.toLowerCase().includes(searchTerm) ||
          m.description?.toLowerCase().includes(searchTerm) ||
          m.category?.toLowerCase().includes(searchTerm)
      ).slice(0, limit);
    } catch (error) {
      console.error("[GAMMA] Error searching markets:", error);
      return [];
    }
  }

  /**
   * Get high volume markets
   */
  async getHighVolumeMarkets(limit = 50): Promise<PolymarketMarket[]> {
    try {
      const markets = await this.getActiveMarkets(limit * 2);
      
      return markets
        .filter((m) => m.volume && parseFloat(m.volume) > 0)
        .sort((a, b) => parseFloat(b.volume) - parseFloat(a.volume))
        .slice(0, limit);
    } catch (error) {
      console.error("[GAMMA] Error fetching high volume markets:", error);
      return [];
    }
  }
}

// Export singleton instance
export const polymarketClient = new PolymarketClient();

// Re-export all modules for convenience
export * from "./websocket.js";
export * from "./data-api.js";
export * from "./subgraph.js";
export * from "./public-api.js";
