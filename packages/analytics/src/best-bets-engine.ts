/**
 * Best Bets Recommendation Engine
 * 
 * Identifies markets where elite traders are most active and provides
 * actionable trading recommendations based on their behavior.
 */

import type { TraderScore } from './trader-scoring.js';

export interface BestBet {
  marketId: string;
  marketQuestion: string;
  marketCategory?: string;
  
  // Elite Trader Activity
  eliteTraderCount: number;
  avgEliteScore: number;
  totalEliteVolume: number;
  eliteConsensus: 'bullish' | 'bearish' | 'mixed';
  consensusStrength: number; // 0-100%
  
  // Top Traders in this market
  topTraders: Array<{
    address: string;
    eliteScore: number;
    position: 'yes' | 'no';
    confidence: number; // Based on position size
    entryPrice: number;
    timestamp: Date;
  }>;
  
  // Recommendation
  recommendationStrength: 'strong' | 'moderate' | 'weak';
  recommendedSide: 'yes' | 'no' | 'none';
  confidenceScore: number; // 0-100
  
  // Market Metrics
  currentPrice: number;
  avgEliteEntryPrice: number;
  potentialReturn: number; // Estimated return %
  riskLevel: 'low' | 'medium' | 'high';
  
  // Timing
  lastEliteActivity: Date;
  activityTrend: 'increasing' | 'stable' | 'decreasing';
}

export interface MarketPosition {
  walletAddress: string;
  marketId: string;
  side: 'yes' | 'no';
  entryPrice: number;
  size: number;
  timestamp: Date;
}

export interface MarketData {
  id: string;
  question: string;
  category?: string;
  currentPrice: number;
  volume24h: number;
  liquidity: number;
}

/**
 * Calculate elite consensus for a market
 */
export function calculateEliteConsensus(
  positions: MarketPosition[]
): { consensus: 'bullish' | 'bearish' | 'mixed'; strength: number } {
  const yesPositions = positions.filter(p => p.side === 'yes');
  const noPositions = positions.filter(p => p.side === 'no');
  
  const yesVolume = yesPositions.reduce((sum, p) => sum + p.size, 0);
  const noVolume = noPositions.reduce((sum, p) => sum + p.size, 0);
  const totalVolume = yesVolume + noVolume;
  
  if (totalVolume === 0) {
    return { consensus: 'mixed', strength: 0 };
  }
  
  const yesPercentage = (yesVolume / totalVolume) * 100;
  const noPercentage = (noVolume / totalVolume) * 100;
  
  let consensus: 'bullish' | 'bearish' | 'mixed';
  let strength: number;
  
  if (yesPercentage >= 70) {
    consensus = 'bullish';
    strength = yesPercentage;
  } else if (noPercentage >= 70) {
    consensus = 'bearish';
    strength = noPercentage;
  } else {
    consensus = 'mixed';
    strength = Math.abs(yesPercentage - 50);
  }
  
  return { consensus, strength };
}

/**
 * Calculate recommendation strength
 */
export function calculateRecommendationStrength(
  eliteTraderCount: number,
  avgEliteScore: number,
  consensusStrength: number,
  activityRecency: number // hours since last activity
): { strength: 'strong' | 'moderate' | 'weak'; score: number } {
  let score = 0;
  
  // Elite trader count (0-30 points)
  if (eliteTraderCount >= 10) score += 30;
  else if (eliteTraderCount >= 5) score += 20;
  else if (eliteTraderCount >= 3) score += 10;
  else score += eliteTraderCount * 3;
  
  // Average elite score (0-30 points)
  score += (avgEliteScore / 100) * 30;
  
  // Consensus strength (0-25 points)
  score += (consensusStrength / 100) * 25;
  
  // Activity recency (0-15 points)
  if (activityRecency <= 1) score += 15;
  else if (activityRecency <= 6) score += 10;
  else if (activityRecency <= 24) score += 5;
  else if (activityRecency <= 72) score += 2;
  
  // Determine strength tier
  let strength: 'strong' | 'moderate' | 'weak';
  if (score >= 75) strength = 'strong';
  else if (score >= 50) strength = 'moderate';
  else strength = 'weak';
  
  return { strength, score };
}

/**
 * Analyze market for best bet potential
 */
export function analyzeMarketForBestBet(
  market: MarketData,
  elitePositions: MarketPosition[],
  eliteScores: Map<string, TraderScore>
): BestBet | null {
  if (elitePositions.length === 0) {
    return null;
  }
  
  // Calculate elite trader metrics
  const eliteTraderCount = new Set(elitePositions.map(p => p.walletAddress)).size;
  const scores = elitePositions
    .map(p => eliteScores.get(p.walletAddress)?.eliteScore || 0)
    .filter(s => s > 0);
  const avgEliteScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const totalEliteVolume = elitePositions.reduce((sum, p) => sum + p.size, 0);
  
  // Calculate consensus
  const { consensus, strength: consensusStrength } = calculateEliteConsensus(elitePositions);
  
  // Get top traders
  const topTraders = elitePositions
    .map(p => ({
      address: p.walletAddress,
      eliteScore: eliteScores.get(p.walletAddress)?.eliteScore || 0,
      position: p.side,
      confidence: (p.size / totalEliteVolume) * 100,
      entryPrice: p.entryPrice,
      timestamp: p.timestamp,
    }))
    .sort((a, b) => b.eliteScore - a.eliteScore)
    .slice(0, 5);
  
  // Calculate activity recency
  const latestActivity = Math.max(...elitePositions.map(p => p.timestamp.getTime()));
  const activityRecency = (Date.now() - latestActivity) / (1000 * 60 * 60); // hours
  
  // Calculate recommendation
  const { strength: recommendationStrength, score: confidenceScore } = 
    calculateRecommendationStrength(
      eliteTraderCount,
      avgEliteScore,
      consensusStrength,
      activityRecency
    );
  
  // Determine recommended side
  let recommendedSide: 'yes' | 'no' | 'none';
  if (consensus === 'bullish' && consensusStrength >= 70) {
    recommendedSide = 'yes';
  } else if (consensus === 'bearish' && consensusStrength >= 70) {
    recommendedSide = 'no';
  } else {
    recommendedSide = 'none';
  }
  
  // Calculate average entry price
  const avgEliteEntryPrice = 
    elitePositions.reduce((sum, p) => sum + p.entryPrice, 0) / elitePositions.length;
  
  // Calculate potential return
  const priceDiff = recommendedSide === 'yes' 
    ? (1 - market.currentPrice)
    : market.currentPrice;
  const potentialReturn = (priceDiff / market.currentPrice) * 100;
  
  // Assess risk level
  let riskLevel: 'low' | 'medium' | 'high';
  if (consensusStrength >= 80 && eliteTraderCount >= 5) {
    riskLevel = 'low';
  } else if (consensusStrength >= 60 && eliteTraderCount >= 3) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'high';
  }
  
  // Determine activity trend
  const recentPositions = elitePositions.filter(
    p => (Date.now() - p.timestamp.getTime()) < 24 * 60 * 60 * 1000
  );
  const oldPositions = elitePositions.filter(
    p => (Date.now() - p.timestamp.getTime()) >= 24 * 60 * 60 * 1000
  );
  
  let activityTrend: 'increasing' | 'stable' | 'decreasing';
  if (recentPositions.length > oldPositions.length * 1.5) {
    activityTrend = 'increasing';
  } else if (recentPositions.length < oldPositions.length * 0.5) {
    activityTrend = 'decreasing';
  } else {
    activityTrend = 'stable';
  }
  
  return {
    marketId: market.id,
    marketQuestion: market.question,
    marketCategory: market.category,
    eliteTraderCount,
    avgEliteScore,
    totalEliteVolume,
    eliteConsensus: consensus,
    consensusStrength,
    topTraders,
    recommendationStrength,
    recommendedSide,
    confidenceScore,
    currentPrice: market.currentPrice,
    avgEliteEntryPrice,
    potentialReturn,
    riskLevel,
    lastEliteActivity: new Date(latestActivity),
    activityTrend,
  };
}

/**
 * Generate Best Bets from all markets
 */
export function generateBestBets(
  markets: MarketData[],
  allPositions: MarketPosition[],
  eliteScores: Map<string, TraderScore>,
  options: {
    minEliteTraders?: number;
    minConfidence?: number;
    maxResults?: number;
    categoryFilter?: string;
  } = {}
): BestBet[] {
  const {
    minEliteTraders = 2,
    minConfidence = 50,
    maxResults = 10,
    categoryFilter,
  } = options;
  
  const bestBets: BestBet[] = [];
  
  // Group positions by market
  const positionsByMarket = new Map<string, MarketPosition[]>();
  for (const position of allPositions) {
    const existing = positionsByMarket.get(position.marketId) || [];
    existing.push(position);
    positionsByMarket.set(position.marketId, existing);
  }
  
  // Analyze each market
  for (const market of markets) {
    // Apply category filter if specified
    if (categoryFilter && market.category !== categoryFilter) {
      continue;
    }
    
    const positions = positionsByMarket.get(market.id) || [];
    const bet = analyzeMarketForBestBet(market, positions, eliteScores);
    
    if (bet) {
      // Apply filters
      if (
        bet.eliteTraderCount >= minEliteTraders &&
        bet.confidenceScore >= minConfidence &&
        bet.recommendedSide !== 'none'
      ) {
        bestBets.push(bet);
      }
    }
  }
  
  // Sort by confidence score and return top results
  return bestBets
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, maxResults);
}

/**
 * Get Best Bets by category
 */
export function getBestBetsByCategory(
  bestBets: BestBet[]
): Map<string, BestBet[]> {
  const byCategory = new Map<string, BestBet[]>();
  
  for (const bet of bestBets) {
    const category = bet.marketCategory || 'Uncategorized';
    const existing = byCategory.get(category) || [];
    existing.push(bet);
    byCategory.set(category, existing);
  }
  
  return byCategory;
}

/**
 * Get trending Best Bets (increasing elite activity)
 */
export function getTrendingBestBets(bestBets: BestBet[]): BestBet[] {
  return bestBets
    .filter(b => b.activityTrend === 'increasing')
    .sort((a, b) => b.confidenceScore - a.confidenceScore);
}

/**
 * Get high-confidence Best Bets only
 */
export function getHighConfidenceBestBets(
  bestBets: BestBet[],
  minConfidence: number = 75
): BestBet[] {
  return bestBets.filter(b => 
    b.confidenceScore >= minConfidence &&
    b.recommendationStrength === 'strong'
  );
}
