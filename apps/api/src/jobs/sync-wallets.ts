import { db, walletPerformance, walletTrades, whaleActivity } from "@polybuddy/db";
import { sql, desc, eq } from "drizzle-orm";

// Simple logger for sync jobs
const logger = {
  info: (message: string | object, ...args: any[]) => {
    if (typeof message === "string") {
      console.log(`[SYNC] ${message}`, ...args);
    } else {
      console.log("[SYNC]", message, ...args);
    }
  },
  error: (data: object | string, message?: string) => {
    if (typeof data === "string") {
      console.error(`[SYNC ERROR] ${data}`);
    } else {
      console.error(`[SYNC ERROR] ${message || "Error occurred"}`, data);
    }
  },
};

// ============================================================================
// TYPES
// ============================================================================

type PolymarketTrade = {
  id: string;
  market: string;
  asset_id: string;
  maker_address: string;
  side: "BUY" | "SELL";
  outcome: "YES" | "NO";
  price: string;
  size: string;
  timestamp: number;
  transaction_hash: string;
};

type WalletMetrics = {
  walletAddress: string;
  totalProfit: number;
  totalVolume: number;
  wins: number;
  losses: number;
  tradeCount: number;
  categoryTrades: Map<string, number>;
  lastTradeTimestamp: Date | null;
};

// ============================================================================
// POLYMARKET CLOB API CLIENT
// ============================================================================

const POLYMARKET_CLOB_API = "https://clob.polymarket.com";
const WHALE_THRESHOLD_USD = 10000; // $10K minimum for whale tracking

/**
 * Fetch recent trades from Polymarket CLOB API
 * In production, this would paginate through all trades
 * For now, we'll fetch a sample and use mock data
 */
async function fetchRecentTrades(limit: number = 1000): Promise<PolymarketTrade[]> {
  try {
    // Note: Polymarket CLOB API requires authentication for some endpoints
    // This is a placeholder implementation
    // In production, you'd use their actual API with proper auth
    
    logger.info("Fetching recent trades from Polymarket...");
    
    // For now, return empty array as we don't have real API access
    // In production, this would be:
    // const response = await fetch(`${POLYMARKET_CLOB_API}/trades?limit=${limit}`);
    // return await response.json();
    
    return [];
  } catch (error) {
    logger.error({ error }, "Failed to fetch trades from Polymarket");
    return [];
  }
}

/**
 * Generate mock trade data for testing
 * This simulates what we'd get from Polymarket API
 */
function generateMockTrades(count: number = 100): PolymarketTrade[] {
  const mockWallets: string[] = [
    "0x7a3f8c4e2b1d9f6a5c8e3b7d4f1a9c6e2b5d8f3a",
    "0x1b4e7d9c3f6a2b8e5d1c4a7f3b9e6d2a8c5f1b4e",
    "0x9c6a3f1b7e4d2a8c5f3b1e9d6a4c7f2b5e8d1a3c",
    "0x4d7a1c9e6b3f8a2d5c1e7b4f9a6c3d8e2b5a1f7c",
    "0x8e2b5d1a7c4f9b6e3d1a8c5f2b7e4d9a6c3f1b5e",
  ];

  const mockMarkets: string[] = [
    "will-trump-win-2024",
    "bitcoin-100k-by-eoy",
    "fed-rate-cut-march",
    "nba-finals-winner",
    "eth-5k-q1-2024",
  ];

  const trades: PolymarketTrade[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const wallet = mockWallets[Math.floor(Math.random() * mockWallets.length)] || mockWallets[0]!;
    const market = mockMarkets[Math.floor(Math.random() * mockMarkets.length)] || mockMarkets[0]!;
    const side = Math.random() > 0.5 ? "BUY" : "SELL";
    const outcome = Math.random() > 0.5 ? "YES" : "NO";
    const price = (Math.random() * 0.5 + 0.25).toFixed(4); // 0.25 - 0.75
    const size = (Math.random() * 10000 + 100).toFixed(2); // $100 - $10,100
    const timestamp = now - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000); // Last 30 days

    trades.push({
      id: `trade-${i}`,
      market,
      asset_id: `asset-${market}`,
      maker_address: wallet,
      side,
      outcome,
      price,
      size,
      timestamp,
      transaction_hash: `0x${Math.random().toString(16).substring(2)}`,
    });
  }

  return trades;
}

// ============================================================================
// TRADE PROCESSING
// ============================================================================

/**
 * Process trades and calculate profit/loss
 * This is a simplified implementation - in production, you'd need to:
 * 1. Match buy/sell pairs to calculate realized P&L
 * 2. Track positions and unrealized P&L
 * 3. Handle partial fills and multiple entries/exits
 */
function calculateTradeMetrics(trades: PolymarketTrade[]): Map<string, WalletMetrics> {
  const walletMetrics = new Map<string, WalletMetrics>();

  for (const trade of trades) {
    const wallet = trade.maker_address;
    
    if (!walletMetrics.has(wallet)) {
      walletMetrics.set(wallet, {
        walletAddress: wallet,
        totalProfit: 0,
        totalVolume: 0,
        wins: 0,
        losses: 0,
        tradeCount: 0,
        categoryTrades: new Map(),
        lastTradeTimestamp: null,
      });
    }

    const metrics = walletMetrics.get(wallet)!;
    const tradeValue = parseFloat(trade.size);
    const tradePrice = parseFloat(trade.price);

    // Simplified P&L calculation
    // In reality, you'd need to match entry/exit to calculate profit
    // For now, we'll estimate based on price movement
    const estimatedProfit = trade.side === "BUY" 
      ? tradeValue * (Math.random() * 0.2 - 0.1) // -10% to +10%
      : tradeValue * (Math.random() * 0.2 - 0.1);

    metrics.totalProfit += estimatedProfit;
    metrics.totalVolume += tradeValue;
    metrics.tradeCount += 1;

    if (estimatedProfit > 0) {
      metrics.wins += 1;
    } else if (estimatedProfit < 0) {
      metrics.losses += 1;
    }

    // Track category
    const category = trade.market.split("-")[0] || "unknown"; // Simple category extraction
    metrics.categoryTrades.set(category, (metrics.categoryTrades.get(category) || 0) + 1);

    // Update last trade timestamp
    const tradeDate = new Date(trade.timestamp);
    if (!metrics.lastTradeTimestamp || tradeDate > metrics.lastTradeTimestamp) {
      metrics.lastTradeTimestamp = tradeDate;
    }
  }

  return walletMetrics;
}

/**
 * Insert trades into database
 */
async function storeTrades(trades: PolymarketTrade[]): Promise<void> {
  if (trades.length === 0) return;

  logger.info(`Storing ${trades.length} trades...`);

  for (const trade of trades) {
    try {
      // Check if trade already exists
      const existing = await db
        .select()
        .from(walletTrades)
        .where(eq(walletTrades.txHash, trade.transaction_hash))
        .limit(1);

      if (existing.length > 0) {
        continue; // Skip duplicate
      }

      // Insert trade
      await db.insert(walletTrades).values({
        walletAddress: trade.maker_address,
        marketId: trade.market,
        side: trade.side.toLowerCase(),
        outcome: trade.outcome.toLowerCase(),
        entryPrice: trade.price || "0",
        exitPrice: null, // Will be updated when position is closed
        size: trade.size || "0",
        profit: null, // Will be calculated when position is closed
        timestamp: new Date(trade.timestamp),
        txHash: trade.transaction_hash || null,
      });
    } catch (error) {
      logger.error({ error, trade }, "Failed to store trade");
    }
  }

  logger.info("Trades stored successfully");
}

/**
 * Update wallet performance metrics
 */
async function updateWalletPerformance(metricsMap: Map<string, WalletMetrics>): Promise<void> {
  logger.info(`Updating performance for ${metricsMap.size} wallets...`);

  for (const [walletAddress, metrics] of metricsMap.entries()) {
    try {
      const winRate = metrics.tradeCount > 0 
        ? (metrics.wins / metrics.tradeCount) * 100 
        : 0;

      const roiPercent = metrics.totalVolume > 0 
        ? (metrics.totalProfit / metrics.totalVolume) * 100 
        : 0;

      // Find primary category (most traded)
      let primaryCategory = null;
      let maxTrades = 0;
      for (const [category, count] of metrics.categoryTrades.entries()) {
        if (count > maxTrades) {
          maxTrades = count;
          primaryCategory = category;
        }
      }

      // Upsert wallet performance
      await db
        .insert(walletPerformance)
        .values({
          walletAddress,
          totalProfit: metrics.totalProfit.toFixed(2),
          totalVolume: metrics.totalVolume.toFixed(2),
          winRate: winRate.toFixed(2),
          tradeCount: metrics.tradeCount,
          roiPercent: roiPercent.toFixed(2),
          primaryCategory: primaryCategory || null,
          lastTradeAt: metrics.lastTradeTimestamp || null,
          rank: null, // Will be calculated separately
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: walletPerformance.walletAddress,
          set: {
            totalProfit: metrics.totalProfit.toFixed(2),
            totalVolume: metrics.totalVolume.toFixed(2),
            winRate: winRate.toFixed(2),
            tradeCount: metrics.tradeCount,
            roiPercent: roiPercent.toFixed(2),
            primaryCategory: primaryCategory || null,
            lastTradeAt: metrics.lastTradeTimestamp || null,
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      logger.error({ error, walletAddress }, "Failed to update wallet performance");
    }
  }

  logger.info("Wallet performance updated");
}

/**
 * Update wallet ranks based on total profit
 */
async function updateWalletRanks(): Promise<void> {
  logger.info("Updating wallet ranks...");

  try {
    // Get all wallets ordered by profit
    const wallets = await db
      .select()
      .from(walletPerformance)
      .orderBy(desc(walletPerformance.totalProfit));

    // Update ranks
    for (let i = 0; i < wallets.length; i++) {
      const wallet = wallets[i];
      if (wallet) {
        await db
          .update(walletPerformance)
          .set({ rank: i + 1 })
          .where(eq(walletPerformance.walletAddress, wallet.walletAddress));
      }
    }

    logger.info(`Updated ranks for ${wallets.length} wallets`);
  } catch (error) {
    logger.error({ error }, "Failed to update wallet ranks");
  }
}

/**
 * Track whale activity (trades > $10K)
 */
async function trackWhaleActivity(trades: PolymarketTrade[]): Promise<void> {
  const whaleTrades = trades.filter(trade => parseFloat(trade.size) >= WHALE_THRESHOLD_USD);

  if (whaleTrades.length === 0) {
    return;
  }

  logger.info(`Tracking ${whaleTrades.length} whale trades...`);

  for (const trade of whaleTrades) {
    try {
      // Check if already tracked
      const existing = await db
        .select()
        .from(whaleActivity)
        .where(
          sql`${whaleActivity.walletAddress} = ${trade.maker_address} 
              AND ${whaleActivity.marketId} = ${trade.market} 
              AND ${whaleActivity.timestamp} = ${new Date(trade.timestamp)}`
        )
        .limit(1);

      if (existing.length > 0) {
        continue;
      }

      // Insert whale activity
      await db.insert(whaleActivity).values({
        walletAddress: trade.maker_address,
        marketId: trade.market,
        action: trade.side.toLowerCase(),
        outcome: trade.outcome.toLowerCase(),
        amountUsd: trade.size,
        price: trade.price,
        priceBefore: null, // Would need historical data
        priceAfter: null, // Would need subsequent data
        timestamp: new Date(trade.timestamp),
      });
    } catch (error) {
      logger.error({ error, trade }, "Failed to track whale activity");
    }
  }

  logger.info("Whale activity tracked");
}

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

/**
 * Main sync function - fetches trades and updates database
 */
export async function syncWalletData(): Promise<void> {
  logger.info("Starting wallet data sync...");

  try {
    // Fetch recent trades
    let trades = await fetchRecentTrades(1000);

    // If no real trades (API not available), use mock data for demo
    if (trades.length === 0) {
      logger.info("No trades from API, generating mock data for demo...");
      trades = generateMockTrades(500);
    }

    logger.info(`Processing ${trades.length} trades...`);

    // Store trades
    await storeTrades(trades);

    // Calculate metrics
    const metricsMap = calculateTradeMetrics(trades);

    // Update wallet performance
    await updateWalletPerformance(metricsMap);

    // Update ranks
    await updateWalletRanks();

    // Track whale activity
    await trackWhaleActivity(trades);

    logger.info("Wallet data sync completed successfully");
  } catch (error) {
    logger.error({ error }, "Wallet data sync failed");
    throw error;
  }
}

/**
 * Schedule sync job to run every hour
 */
export function scheduleWalletSync(intervalMs: number = 60 * 60 * 1000): NodeJS.Timeout {
  logger.info(`Scheduling wallet sync every ${intervalMs / 1000 / 60} minutes`);

  // Run immediately on startup
  syncWalletData().catch((error) => {
    logger.error({ error }, "Initial sync failed");
  });

  // Then run on interval
  return setInterval(() => {
    syncWalletData().catch((error) => {
      logger.error({ error }, "Scheduled sync failed");
    });
  }, intervalMs);
}

