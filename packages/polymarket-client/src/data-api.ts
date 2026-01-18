/**
 * Polymarket Data API Client
 * 
 * Provides access to historical data, user positions, and trade activity
 * via the official Data API: https://data-api.polymarket.com
 */

// ============================================================================
// TYPES
// ============================================================================

export interface UserPosition {
  asset_id: string;
  market_id: string;
  position: string;
  avg_price: string;
  cur_price: string;
  initial_value: string;
  current_value: string;
  pnl: string;
  pnl_percent: string;
  size: string;
  outcome: string;
}

export interface TradeActivity {
  id: string;
  market: string;
  market_slug?: string;
  asset_id: string;
  side: "BUY" | "SELL";
  price: string;
  size: string;
  fee: string;
  timestamp: string;
  transaction_hash: string;
  outcome: string;
  status: string;
}

export interface MarketActivity {
  trades: TradeActivity[];
  volume_24h: string;
  num_trades_24h: number;
}

export interface Leaderboard {
  rank: number;
  address: string;
  profit: string;
  volume: string;
  num_trades: number;
  profit_percent: string;
}

export interface MarketHistory {
  prices: Array<{ timestamp: string; price: string }>;
  volume: Array<{ timestamp: string; volume: string }>;
}

// ============================================================================
// DATA API CLIENT
// ============================================================================

export class PolymarketDataAPI {
  private readonly baseURL = "https://data-api.polymarket.com";
  
  /**
   * Fetch user positions for a wallet address
   */
  async getUserPositions(walletAddress: string): Promise<UserPosition[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/positions?user=${walletAddress.toLowerCase()}`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "PolyBuddy/1.0",
          },
        }
      );

      if (!response.ok) {
        console.error(`[DATA-API] Failed to fetch positions: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("[DATA-API] Error fetching positions:", error);
      return [];
    }
  }

  /**
   * Fetch trade history for a wallet address
   */
  async getUserTrades(
    walletAddress: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<TradeActivity[]> {
    try {
      const params = new URLSearchParams({
        user: walletAddress.toLowerCase(),
        limit: String(options.limit || 100),
        offset: String(options.offset || 0),
      });

      const response = await fetch(
        `${this.baseURL}/activity?${params}`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "PolyBuddy/1.0",
          },
        }
      );

      if (!response.ok) {
        console.error(`[DATA-API] Failed to fetch trades: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("[DATA-API] Error fetching trades:", error);
      return [];
    }
  }

  /**
   * Fetch market activity (recent trades for a market)
   */
  async getMarketActivity(
    marketId: string,
    options: { limit?: number } = {}
  ): Promise<MarketActivity> {
    try {
      const params = new URLSearchParams({
        market: marketId,
        limit: String(options.limit || 100),
      });

      const response = await fetch(
        `${this.baseURL}/activity?${params}`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "PolyBuddy/1.0",
          },
        }
      );

      if (!response.ok) {
        return { trades: [], volume_24h: "0", num_trades_24h: 0 };
      }

      const data = await response.json();
      
      // Calculate 24h metrics
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const trades: TradeActivity[] = Array.isArray(data) ? data : [];
      
      const recentTrades = trades.filter(
        (t) => new Date(t.timestamp).getTime() > oneDayAgo
      );
      
      const volume24h = recentTrades.reduce(
        (sum, t) => sum + parseFloat(t.size) * parseFloat(t.price),
        0
      );

      return {
        trades,
        volume_24h: volume24h.toFixed(2),
        num_trades_24h: recentTrades.length,
      };
    } catch (error) {
      console.error("[DATA-API] Error fetching market activity:", error);
      return { trades: [], volume_24h: "0", num_trades_24h: 0 };
    }
  }

  /**
   * Fetch global leaderboard
   */
  async getLeaderboard(
    options: { limit?: number; period?: "24h" | "7d" | "30d" | "all" } = {}
  ): Promise<Leaderboard[]> {
    try {
      const params = new URLSearchParams({
        limit: String(options.limit || 100),
      });
      
      if (options.period) {
        params.set("period", options.period);
      }

      const response = await fetch(
        `${this.baseURL}/leaderboard?${params}`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "PolyBuddy/1.0",
          },
        }
      );

      if (!response.ok) {
        console.error(`[DATA-API] Failed to fetch leaderboard: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("[DATA-API] Error fetching leaderboard:", error);
      return [];
    }
  }

  /**
   * Fetch price history for a market
   */
  async getMarketHistory(
    marketId: string,
    options: { interval?: "1m" | "5m" | "1h" | "1d"; start?: Date; end?: Date } = {}
  ): Promise<MarketHistory> {
    try {
      const params = new URLSearchParams({
        market: marketId,
        interval: options.interval || "1h",
      });
      
      if (options.start) {
        params.set("start", options.start.toISOString());
      }
      if (options.end) {
        params.set("end", options.end.toISOString());
      }

      const response = await fetch(
        `${this.baseURL}/history?${params}`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "PolyBuddy/1.0",
          },
        }
      );

      if (!response.ok) {
        return { prices: [], volume: [] };
      }

      const data = await response.json() as MarketHistory | null;
      return {
        prices: data?.prices || [],
        volume: data?.volume || [],
      };
    } catch (error) {
      console.error("[DATA-API] Error fetching market history:", error);
      return { prices: [], volume: [] };
    }
  }

  /**
   * Fetch recent large trades (whale activity)
   */
  async getWhaleTrades(
    options: { minSize?: number; limit?: number } = {}
  ): Promise<TradeActivity[]> {
    try {
      const params = new URLSearchParams({
        limit: String(options.limit || 100),
        min_size: String(options.minSize || 10000),
      });

      const response = await fetch(
        `${this.baseURL}/activity?${params}`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "PolyBuddy/1.0",
          },
        }
      );

      if (!response.ok) {
        console.error(`[DATA-API] Failed to fetch whale trades: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const trades: TradeActivity[] = Array.isArray(data) ? data : [];
      
      // Filter by minimum size if API doesn't support it
      const minSize = options.minSize || 10000;
      return trades.filter(
        (t) => parseFloat(t.size) * parseFloat(t.price) >= minSize
      );
    } catch (error) {
      console.error("[DATA-API] Error fetching whale trades:", error);
      return [];
    }
  }
}

// Export singleton instance
export const dataAPI = new PolymarketDataAPI();
