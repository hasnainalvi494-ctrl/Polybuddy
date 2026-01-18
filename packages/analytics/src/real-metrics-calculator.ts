/**
 * Real Trade Metrics Calculator
 * 
 * Calculates actual trader metrics from Polymarket trade history
 */

import type { TraderMetrics } from './trader-scoring.js';

export interface PolymarketTrade {
  id: string;
  market: string;
  asset_id: string;
  maker_address: string;
  taker_address: string;
  side: 'BUY' | 'SELL';
  outcome: 'YES' | 'NO';
  price: string;
  size: string;
  timestamp: number;
}

export interface ProcessedTrade {
  marketId: string;
  side: 'YES' | 'NO';
  entryPrice: number;
  exitPrice: number | undefined;
  size: number;
  profit: number;
  timestamp: Date;
  isOpen: boolean;
}

/**
 * Process raw Polymarket trades into position history
 */
export function processTradesIntoPositions(trades: any[]): ProcessedTrade[] {
  // Sort trades by timestamp
  const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp);
  
  // Track positions by market + outcome
  const positions = new Map<string, {
    entryPrice: number;
    size: number;
    entryTime: number;
    trades: PolymarketTrade[];
  }>();
  
  const closedTrades: ProcessedTrade[] = [];
  
  for (const trade of sortedTrades) {
    const key = `${trade.market}-${trade.outcome}`;
    const price = parseFloat(trade.price);
    const size = parseFloat(trade.size);
    
    if (trade.side === 'BUY') {
      // Opening or adding to position
      if (!positions.has(key)) {
        positions.set(key, {
          entryPrice: price,
          size: size,
          entryTime: trade.timestamp,
          trades: [trade],
        });
      } else {
        const pos = positions.get(key)!;
        // Calculate weighted average entry price
        const totalCost = pos.entryPrice * pos.size + price * size;
        const totalSize = pos.size + size;
        pos.entryPrice = totalCost / totalSize;
        pos.size = totalSize;
        pos.trades.push(trade);
      }
    } else {
      // SELL - closing or reducing position
      if (positions.has(key)) {
        const pos = positions.get(key)!;
        const exitSize = Math.min(size, pos.size);
        
        // Calculate profit for closed portion
        const profit = (price - pos.entryPrice) * exitSize;
        
        closedTrades.push({
          marketId: trade.market,
          side: trade.outcome,
          entryPrice: pos.entryPrice,
          exitPrice: price,
          size: exitSize,
          profit: profit,
          timestamp: new Date(trade.timestamp * 1000),
          isOpen: false,
        });
        
        pos.size -= exitSize;
        
        if (pos.size <= 0.001) {
          positions.delete(key);
        }
      }
    }
  }
  
  // Add still-open positions
  for (const [key, pos] of positions.entries()) {
    const [marketId, side] = key.split('-');
    closedTrades.push({
      marketId: marketId || '',
      side: (side as 'YES' | 'NO') || 'YES',
      entryPrice: pos.entryPrice,
      size: pos.size,
      exitPrice: undefined,
      profit: 0, // Can't calculate until closed
      timestamp: new Date(pos.entryTime * 1000),
      isOpen: true,
    });
  }
  
  return closedTrades;
}

/**
 * Calculate trader metrics from processed trades
 */
export function calculateMetricsFromTrades(
  trades: ProcessedTrade[],
  walletAddress: string
): TraderMetrics {
  // Filter only closed trades for accurate metrics
  const closedTrades = trades.filter(t => !t.isOpen);
  
  if (closedTrades.length === 0) {
    return {
      totalProfit: 0,
      totalVolume: 0,
      winRate: 0,
      tradeCount: 0,
      roiPercent: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      grossProfit: 0,
      grossLoss: 0,
      consecutiveWins: 0,
      longestWinStreak: 0,
      avgHoldingTimeHours: 0,
      marketTimingScore: 50,
    };
  }
  
  // Basic metrics
  let totalProfit = 0;
  let totalVolume = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let winningTrades = 0;
  let currentStreak = 0;
  let longestStreak = 0;
  const returns: number[] = [];
  
  for (const trade of closedTrades) {
    const cost = trade.entryPrice * trade.size;
    totalVolume += cost;
    totalProfit += trade.profit;
    
    if (trade.profit > 0) {
      grossProfit += trade.profit;
      winningTrades++;
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      grossLoss += Math.abs(trade.profit);
      currentStreak = 0;
    }
    
    // Calculate return on this trade
    if (cost > 0) {
      returns.push(trade.profit / cost);
    }
  }
  
  const tradeCount = closedTrades.length;
  const winRate = (winningTrades / tradeCount) * 100;
  const roiPercent = totalVolume > 0 ? (totalProfit / totalVolume) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
  
  // Calculate Sharpe Ratio
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
  
  // Calculate Max Drawdown
  let maxDrawdown = 0;
  let peak = 0;
  let runningProfit = 0;
  
  for (const trade of closedTrades) {
    runningProfit += trade.profit;
    if (runningProfit > peak) {
      peak = runningProfit;
    }
    const drawdown = peak - runningProfit;
    if (peak > 0) {
      maxDrawdown = Math.max(maxDrawdown, (drawdown / peak) * 100);
    }
  }
  
  // Calculate average holding time (simplified - would need entry/exit timestamps)
  const avgHoldingTimeHours = 24; // Placeholder
  
  // Market timing score (simplified - would analyze entry/exit relative to market movement)
  const marketTimingScore = winRate > 60 ? 70 + (winRate - 60) : 50 + winRate / 6;
  
  return {
    totalProfit,
    totalVolume,
    winRate,
    tradeCount,
    roiPercent,
    profitFactor,
    sharpeRatio,
    maxDrawdown,
    grossProfit,
    grossLoss,
    consecutiveWins: currentStreak,
    longestWinStreak: longestStreak,
    avgHoldingTimeHours,
    marketTimingScore,
  };
}

/**
 * Fetch and calculate metrics for a wallet
 */
export async function fetchAndCalculateWalletMetrics(
  polymarketClient: any,
  walletAddress: string
): Promise<TraderMetrics> {
  console.log(`Fetching trades for wallet: ${walletAddress}`);
  
  const trades = await polymarketClient.getWalletTrades(walletAddress);
  
  if (!trades || trades.length === 0) {
    console.log(`No trades found for ${walletAddress}`);
    return calculateMetricsFromTrades([], '0x0');
  }
  
  console.log(`Found ${trades.length} trades for ${walletAddress}`);
  
  const processedTrades = processTradesIntoPositions(trades);
  const metrics = calculateMetricsFromTrades(processedTrades, '0x0');
  
  console.log(`Calculated metrics for ${walletAddress}:`, {
    totalProfit: metrics.totalProfit,
    winRate: metrics.winRate,
    tradeCount: metrics.tradeCount,
  });
  
  return metrics;
}
