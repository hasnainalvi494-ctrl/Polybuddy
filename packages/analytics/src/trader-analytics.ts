/**
 * Trader Analytics Service
 * 
 * Provides functions to calculate, update, and query elite trader scores
 */

import { calculateTraderScore, type TraderMetrics, type TraderScore, isEliteTrader, type TraderTier, type RiskProfile } from './trader-scoring.js';

export interface WalletTrade {
  profit: number;
  timestamp: Date;
  entryPrice: number;
  exitPrice: number;
  marketId: string;
}

/**
 * Calculate metrics from trade history
 */
export function calculateMetricsFromTrades(trades: WalletTrade[]): TraderMetrics {
  if (trades.length === 0) {
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

  // Sort trades by timestamp
  const sortedTrades = [...trades].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  // Basic calculations
  const totalProfit = sortedTrades.reduce((sum, t) => sum + t.profit, 0);
  const totalVolume = sortedTrades.reduce((sum, t) => sum + Math.abs(t.profit), 0);
  const winningTrades = sortedTrades.filter(t => t.profit > 0);
  const losingTrades = sortedTrades.filter(t => t.profit < 0);
  const winRate = (winningTrades.length / sortedTrades.length) * 100;
  
  // Gross profit and loss
  const grossProfit = winningTrades.reduce((sum, t) => sum + t.profit, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profit, 0));
  
  // Profit factor
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 10 : 0;
  
  // Calculate ROI
  const roiPercent = totalVolume > 0 ? (totalProfit / totalVolume) * 100 : 0;
  
  // Calculate Sharpe Ratio (simplified)
  const returns = sortedTrades.map(t => t.profit);
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized
  
  // Calculate max drawdown
  let maxDrawdown = 0;
  let peak = 0;
  let runningTotal = 0;
  
  for (const trade of sortedTrades) {
    runningTotal += trade.profit;
    if (runningTotal > peak) {
      peak = runningTotal;
    }
    const drawdown = peak > 0 ? ((peak - runningTotal) / peak) * 100 : 0;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  // Calculate win streaks
  let currentStreak = 0;
  let longestWinStreak = 0;
  let consecutiveWins = 0;
  
  for (const trade of sortedTrades) {
    if (trade.profit > 0) {
      currentStreak++;
      if (currentStreak > longestWinStreak) {
        longestWinStreak = currentStreak;
      }
    } else {
      if (currentStreak > 0) {
        consecutiveWins = currentStreak;
      }
      currentStreak = 0;
    }
  }
  
  // Average holding time (simplified - would need entry/exit timestamps in real implementation)
  const avgHoldingTimeHours = 24; // Placeholder
  
  // Market timing score (simplified)
  const marketTimingScore = Math.min(100, winRate + (profitFactor * 10));
  
  // Category specialization
  const categoryMap: Record<string, number> = {};
  let primaryCategory: string | undefined;
  let maxCount = 0;
  
  for (const trade of sortedTrades) {
    // Would extract category from marketId in real implementation
    const category = "General";
    categoryMap[category] = (categoryMap[category] || 0) + 1;
    if (categoryMap[category] > maxCount) {
      maxCount = categoryMap[category];
      primaryCategory = category;
    }
  }
  
  const categorySpecialization: Record<string, number> = {};
  for (const [category, count] of Object.entries(categoryMap)) {
    categorySpecialization[category] = (count / sortedTrades.length) * 100;
  }
  
  return {
    totalProfit,
    totalVolume,
    winRate,
    tradeCount: sortedTrades.length,
    roiPercent,
    profitFactor,
    sharpeRatio,
    maxDrawdown,
    grossProfit,
    grossLoss,
    consecutiveWins,
    longestWinStreak,
    avgHoldingTimeHours,
    marketTimingScore,
    primaryCategory,
    categorySpecialization,
  };
}

/**
 * Generate trader performance metrics for a wallet
 */
export async function analyzeWalletPerformance(
  walletAddress: string,
  trades: WalletTrade[]
): Promise<TraderScore> {
  const metrics = calculateMetricsFromTrades(trades);
  return calculateTraderScore(walletAddress, metrics);
}

/**
 * Batch calculate scores for multiple wallets
 */
export async function batchCalculateScores(
  walletTrades: Map<string, WalletTrade[]>
): Promise<Map<string, TraderScore>> {
  const scores = new Map<string, TraderScore>();
  
  for (const [walletAddress, trades] of walletTrades.entries()) {
    const score = await analyzeWalletPerformance(walletAddress, trades);
    scores.set(walletAddress, score);
  }
  
  // Assign rankings
  const sortedScores = Array.from(scores.values())
    .sort((a, b) => b.eliteScore - a.eliteScore);
  
  sortedScores.forEach((score, index) => {
    score.rank = index + 1;
  });
  
  // Assign elite rankings
  const eliteScores = sortedScores.filter(s => s.traderTier === 'elite');
  eliteScores.forEach((score, index) => {
    score.eliteRank = index + 1;
  });
  
  return scores;
}

/**
 * Filter traders by tier
 */
export function filterByTier(
  scores: TraderScore[],
  tier: string | string[]
): TraderScore[] {
  const tiers = Array.isArray(tier) ? tier : [tier];
  return scores.filter(s => tiers.includes(s.traderTier));
}

/**
 * Get top N traders
 */
export function getTopTraders(
  scores: TraderScore[],
  limit: number = 10
): TraderScore[] {
  return scores
    .sort((a, b) => b.eliteScore - a.eliteScore)
    .slice(0, limit);
}

/**
 * Get elite traders only
 */
export function getEliteTraders(scores: TraderScore[]): TraderScore[] {
  return filterByTier(scores, 'elite');
}

/**
 * Calculate category statistics for a group of traders
 */
export function calculateCategoryStats(
  traders: TraderScore[],
  metrics: Map<string, TraderMetrics>
): Record<string, { count: number; avgScore: number; totalVolume: number }> {
  const stats: Record<string, { count: number; totalScore: number; totalVolume: number }> = {};
  
  for (const trader of traders) {
    const metric = metrics.get(trader.walletAddress);
    if (!metric?.primaryCategory) continue;
    
    const category = metric.primaryCategory;
    if (!stats[category]) {
      stats[category] = { count: 0, totalScore: 0, totalVolume: 0 };
    }
    
    stats[category].count++;
    stats[category].totalScore += trader.eliteScore;
    stats[category].totalVolume += metric.totalVolume;
  }
  
  // Convert to averages
  const result: Record<string, { count: number; avgScore: number; totalVolume: number }> = {};
  for (const [category, data] of Object.entries(stats)) {
    result[category] = {
      count: data.count,
      avgScore: data.totalScore / data.count,
      totalVolume: data.totalVolume,
    };
  }
  
  return result;
}
