/**
 * Enhanced Polymarket Client with Public APIs
 * 
 * Uses publicly available endpoints to fetch real market and trader data:
 * - Gamma API for market discovery and metadata
 * - CLOB API for orderbook and price data
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PolymarketEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  markets: PolymarketMarket[];
  volume: string;
  liquidity: string;
  closed: boolean;
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

export interface OrderBookData {
  market: string;
  asset_id: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
}

export interface MarketStats {
  totalMarkets: number;
  totalVolume: string;
  activeMarkets: number;
}

// ============================================================================
// PUBLIC API CLIENT
// ============================================================================

export class PolymarketPublicAPI {
  private readonly gammaURL = "https://gamma-api.polymarket.com";
  private readonly clobURL = "https://clob.polymarket.com";
  
  /**
   * Fetch active events with markets
   */
  async getActiveEvents(limit = 20): Promise<PolymarketEvent[]> {
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        active: "true",
        closed: "false",
      });

      const response = await fetch(
        `${this.gammaURL}/events?${params}`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "PolyBuddy/1.0",
          },
        }
      );
      
      if (!response.ok) {
        console.error(`[GAMMA] Failed to fetch events: ${response.statusText}`);
        return [];
      }
      
      const events = await response.json() as PolymarketEvent[] | null;
      return Array.isArray(events) ? events : [];
    } catch (error) {
      console.error("[GAMMA] Error fetching active events:", error);
      return [];
    }
  }
  
  /**
   * Fetch all active markets
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
   * Get market data by ID
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
   * Get event by slug
   */
  async getEvent(slug: string): Promise<PolymarketEvent | null> {
    try {
      const response = await fetch(
        `${this.gammaURL}/events/${slug}`,
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
      
      const event = await response.json() as PolymarketEvent | null;
      return event;
    } catch (error) {
      console.error(`[GAMMA] Error fetching event ${slug}:`, error);
      return null;
    }
  }
  
  /**
   * Get order book for a market (public data)
   */
  async getOrderBook(tokenId: string): Promise<OrderBookData | null> {
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
      
      const book = await response.json() as OrderBookData | null;
      return book;
    } catch (error) {
      console.error(`[CLOB] Error fetching order book for ${tokenId}:`, error);
      return null;
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
   * Get high volume markets (proxy for active traders)
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
  
  /**
   * Get trending events (by volume and activity)
   */
  async getTrendingEvents(limit = 10): Promise<PolymarketEvent[]> {
    try {
      const events = await this.getActiveEvents(limit * 2);
      
      return events
        .filter((e) => e.volume && parseFloat(e.volume) > 0)
        .sort((a, b) => parseFloat(b.volume) - parseFloat(a.volume))
        .slice(0, limit);
    } catch (error) {
      console.error("[GAMMA] Error fetching trending events:", error);
      return [];
    }
  }
  
  /**
   * Get market statistics
   */
  async getMarketStats(): Promise<MarketStats> {
    try {
      const markets = await this.getActiveMarkets(500);
      
      const totalVolume = markets.reduce((sum, m) => {
        return sum + parseFloat(m.volume || "0");
      }, 0);
      
      return {
        totalMarkets: markets.length,
        totalVolume: totalVolume.toFixed(2),
        activeMarkets: markets.filter((m) => parseFloat(m.volume || "0") > 1000).length,
      };
    } catch (error) {
      console.error("[GAMMA] Error calculating market stats:", error);
      return {
        totalMarkets: 0,
        totalVolume: "0",
        activeMarkets: 0,
      };
    }
  }

  /**
   * Get markets by category
   */
  async getMarketsByCategory(category: string, limit = 50): Promise<PolymarketMarket[]> {
    try {
      const markets = await this.getActiveMarkets(limit * 3);
      
      return markets
        .filter((m) => m.category?.toLowerCase() === category.toLowerCase())
        .slice(0, limit);
    } catch (error) {
      console.error(`[GAMMA] Error fetching markets for category ${category}:`, error);
      return [];
    }
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<string[]> {
    try {
      const markets = await this.getActiveMarkets(500);
      
      const categories = new Set<string>();
      for (const market of markets) {
        if (market.category) {
          categories.add(market.category);
        }
      }
      
      return Array.from(categories).sort();
    } catch (error) {
      console.error("[GAMMA] Error fetching categories:", error);
      return [];
    }
  }
}

// Export singleton instance
export const polymarketPublicAPI = new PolymarketPublicAPI();

// Also export as the old name for backwards compatibility
export { PolymarketPublicAPI as PolymarketClient };
export const polymarketClient = polymarketPublicAPI;
