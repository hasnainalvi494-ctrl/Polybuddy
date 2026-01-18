/**
 * Polymarket Subgraph Client
 * 
 * Uses Goldsky-hosted subgraphs for reliable historical data access.
 * The old TheGraph URLs are deprecated - Polymarket now uses Goldsky.
 * 
 * Available subgraphs:
 * - Orders: Order history and open orders
 * - Positions: User positions
 * - Activity: Trade activity and volume
 * - Open Interest: Market open interest data
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SubgraphTrade {
  id: string;
  marketId: string;
  conditionId?: string;
  trader: string;
  outcome: string;
  outcomeIndex: number;
  amount: string;
  price: string;
  timestamp: string;
  transactionHash?: string;
  type: "Buy" | "Sell";
}

export interface SubgraphPosition {
  id: string;
  user: string;
  conditionId: string;
  outcomeIndex: number;
  shares: string;
  initialValue: string;
  currentValue: string;
}

export interface SubgraphOrder {
  id: string;
  market: string;
  maker: string;
  side: string;
  price: string;
  size: string;
  sizeMatched: string;
  status: string;
  timestamp: string;
}

export interface SubgraphMarket {
  id: string;
  conditionId: string;
  question: string;
  outcomes: string[];
  volume: string;
  liquidity: string;
  openInterest: string;
}

// ============================================================================
// GOLDSKY SUBGRAPH URLS (Official Polymarket Subgraphs)
// ============================================================================

const SUBGRAPH_URLS = {
  // Primary Goldsky-hosted subgraphs (use these!)
  activity: "https://api.goldsky.com/api/public/project_clssc64y57n5r010yeoly05up/subgraphs/polymarket-activity/prod/gn",
  orderbook: "https://api.goldsky.com/api/public/project_clssc64y57n5r010yeoly05up/subgraphs/polymarket-orderbook-resync/prod/gn",
  positions: "https://api.goldsky.com/api/public/project_clssc64y57n5r010yeoly05up/subgraphs/polymarket-positions/prod/gn",
  
  // Fallback URLs
  fallback1: "https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/polymarket-matic/prod/gn",
} as const;

// ============================================================================
// SUBGRAPH CLIENT
// ============================================================================

export class PolymarketSubgraph {
  private activityURL = SUBGRAPH_URLS.activity;
  private orderbookURL = SUBGRAPH_URLS.orderbook;
  private positionsURL = SUBGRAPH_URLS.positions;
  
  /**
   * Execute a GraphQL query against a subgraph
   */
  private async query<T>(
    url: string,
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T | null> {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        console.error(`[SUBGRAPH] Query failed: ${response.status}`);
        return null;
      }

      const result = await response.json() as { data?: T; errors?: unknown[] };
      
      if (result.errors) {
        console.error("[SUBGRAPH] GraphQL errors:", result.errors);
        return null;
      }

      return result.data ?? null;
    } catch (error) {
      console.error("[SUBGRAPH] Error executing query:", error);
      return null;
    }
  }

  /**
   * Fetch recent trades (activity)
   */
  async getRecentTrades(limit = 100): Promise<SubgraphTrade[]> {
    const query = `
      query GetRecentTrades($first: Int!) {
        fpmmTrades(
          first: $first
          orderBy: creationTimestamp
          orderDirection: desc
        ) {
          id
          creationTimestamp
          type
          collateralAmount
          outcomeIndex
          outcomeTokensAmount
          feeAmount
          trader: user {
            id
          }
          fpmm: market {
            id
            question
            outcomes
          }
        }
      }
    `;

    const result = await this.query<{ fpmmTrades: Array<{
      id: string;
      creationTimestamp: string;
      type: string;
      collateralAmount: string;
      outcomeIndex: string;
      outcomeTokensAmount: string;
      trader: { id: string };
      fpmm: { id: string; question: string; outcomes: string[] };
    }> }>(this.activityURL, query, { first: limit });

    if (!result?.fpmmTrades) {
      return [];
    }

    return result.fpmmTrades.map((trade) => ({
      id: trade.id,
      marketId: trade.fpmm?.id || "",
      trader: trade.trader?.id || "",
      outcome: trade.fpmm?.outcomes?.[parseInt(trade.outcomeIndex)] || "Unknown",
      outcomeIndex: parseInt(trade.outcomeIndex),
      amount: (parseFloat(trade.collateralAmount) / 1e18).toFixed(2),
      price: trade.outcomeTokensAmount 
        ? (parseFloat(trade.collateralAmount) / parseFloat(trade.outcomeTokensAmount)).toFixed(4)
        : "0.5",
      timestamp: trade.creationTimestamp,
      type: trade.type as "Buy" | "Sell",
    }));
  }

  /**
   * Fetch trades for a specific wallet address
   */
  async getWalletTrades(walletAddress: string, limit = 100): Promise<SubgraphTrade[]> {
    const query = `
      query GetWalletTrades($trader: String!, $first: Int!) {
        fpmmTrades(
          first: $first
          orderBy: creationTimestamp
          orderDirection: desc
          where: { user: $trader }
        ) {
          id
          creationTimestamp
          type
          collateralAmount
          outcomeIndex
          outcomeTokensAmount
          fpmm: market {
            id
            question
            outcomes
          }
        }
      }
    `;

    const result = await this.query<{ fpmmTrades: Array<{
      id: string;
      creationTimestamp: string;
      type: string;
      collateralAmount: string;
      outcomeIndex: string;
      outcomeTokensAmount: string;
      fpmm: { id: string; question: string; outcomes: string[] };
    }> }>(this.activityURL, query, {
      trader: walletAddress.toLowerCase(),
      first: limit,
    });

    if (!result?.fpmmTrades) {
      return [];
    }

    return result.fpmmTrades.map((trade) => ({
      id: trade.id,
      marketId: trade.fpmm?.id || "",
      trader: walletAddress.toLowerCase(),
      outcome: trade.fpmm?.outcomes?.[parseInt(trade.outcomeIndex)] || "Unknown",
      outcomeIndex: parseInt(trade.outcomeIndex),
      amount: (parseFloat(trade.collateralAmount) / 1e18).toFixed(2),
      price: trade.outcomeTokensAmount 
        ? (parseFloat(trade.collateralAmount) / parseFloat(trade.outcomeTokensAmount)).toFixed(4)
        : "0.5",
      timestamp: trade.creationTimestamp,
      type: trade.type as "Buy" | "Sell",
    }));
  }

  /**
   * Fetch top traders by volume
   */
  async getTopTraders(limit = 50): Promise<Array<{ address: string; volume: number; tradeCount: number }>> {
    const query = `
      query GetRecentTrades {
        fpmmTrades(
          first: 1000
          orderBy: creationTimestamp
          orderDirection: desc
        ) {
          collateralAmount
          trader: user {
            id
          }
        }
      }
    `;

    const result = await this.query<{ fpmmTrades: Array<{
      collateralAmount: string;
      trader: { id: string };
    }> }>(this.activityURL, query);

    if (!result?.fpmmTrades) {
      return [];
    }

    // Aggregate by trader
    const traderStats = new Map<string, { volume: number; tradeCount: number }>();

    for (const trade of result.fpmmTrades) {
      const address = trade.trader?.id?.toLowerCase() || "";
      if (!address) continue;

      const volume = parseFloat(trade.collateralAmount) / 1e18;
      const existing = traderStats.get(address) || { volume: 0, tradeCount: 0 };
      
      traderStats.set(address, {
        volume: existing.volume + volume,
        tradeCount: existing.tradeCount + 1,
      });
    }

    // Sort by volume and return top traders
    return Array.from(traderStats.entries())
      .sort((a, b) => b[1].volume - a[1].volume)
      .slice(0, limit)
      .map(([address, stats]) => ({
        address,
        volume: stats.volume,
        tradeCount: stats.tradeCount,
      }));
  }

  /**
   * Fetch user positions from subgraph
   */
  async getUserPositions(walletAddress: string): Promise<SubgraphPosition[]> {
    const query = `
      query GetUserPositions($user: String!) {
        userPositions(
          where: { user: $user }
          first: 100
        ) {
          id
          user {
            id
          }
          conditionId
          outcomeIndex
          shares
          initialValue
          currentValue
        }
      }
    `;

    const result = await this.query<{ userPositions: Array<{
      id: string;
      user: { id: string };
      conditionId: string;
      outcomeIndex: number;
      shares: string;
      initialValue: string;
      currentValue: string;
    }> }>(this.positionsURL, query, { user: walletAddress.toLowerCase() });

    if (!result?.userPositions) {
      return [];
    }

    return result.userPositions.map((pos) => ({
      id: pos.id,
      user: pos.user?.id || walletAddress,
      conditionId: pos.conditionId,
      outcomeIndex: pos.outcomeIndex,
      shares: pos.shares,
      initialValue: pos.initialValue,
      currentValue: pos.currentValue,
    }));
  }

  /**
   * Fetch open orders for a user
   */
  async getUserOrders(walletAddress: string, status = "open"): Promise<SubgraphOrder[]> {
    const query = `
      query GetUserOrders($maker: String!, $status: String!) {
        orders(
          where: { maker: $maker, status: $status }
          first: 100
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          market
          maker
          side
          price
          size
          sizeMatched
          status
          timestamp
        }
      }
    `;

    const result = await this.query<{ orders: SubgraphOrder[] }>(
      this.orderbookURL,
      query,
      { maker: walletAddress.toLowerCase(), status }
    );

    return result?.orders || [];
  }

  /**
   * Fetch market volume and stats
   */
  async getMarketStats(marketId: string): Promise<SubgraphMarket | null> {
    const query = `
      query GetMarketStats($id: ID!) {
        fixedProductMarketMaker(id: $id) {
          id
          conditionIds
          question
          outcomes
          collateralVolume
          liquidityParameter
          openInterest
        }
      }
    `;

    const result = await this.query<{ fixedProductMarketMaker: {
      id: string;
      conditionIds: string[];
      question: string;
      outcomes: string[];
      collateralVolume: string;
      liquidityParameter: string;
      openInterest: string;
    } }>(this.activityURL, query, { id: marketId.toLowerCase() });

    if (!result?.fixedProductMarketMaker) {
      return null;
    }

    const market = result.fixedProductMarketMaker;
    return {
      id: market.id,
      conditionId: market.conditionIds?.[0] || "",
      question: market.question,
      outcomes: market.outcomes,
      volume: (parseFloat(market.collateralVolume) / 1e18).toFixed(2),
      liquidity: (parseFloat(market.liquidityParameter) / 1e18).toFixed(2),
      openInterest: (parseFloat(market.openInterest) / 1e18).toFixed(2),
    };
  }

  /**
   * Test subgraph connectivity
   */
  async testConnection(): Promise<{ activity: boolean; orderbook: boolean; positions: boolean }> {
    const testQuery = `query { _meta { block { number } } }`;
    
    const [activity, orderbook, positions] = await Promise.all([
      this.query(this.activityURL, testQuery).then((r) => !!r).catch(() => false),
      this.query(this.orderbookURL, testQuery).then((r) => !!r).catch(() => false),
      this.query(this.positionsURL, testQuery).then((r) => !!r).catch(() => false),
    ]);

    return { activity, orderbook, positions };
  }
}

// Export singleton instance
export const polymarketSubgraph = new PolymarketSubgraph();

// Export URLs for reference
export { SUBGRAPH_URLS };
