/**
 * Best Bets Signal Generation Engine
 * 
 * Real-time signal generation system that identifies high-probability trades
 * based on elite trader activity and consensus.
 */

export type SignalType = 'elite' | 'strong' | 'moderate' | 'weak';
export type SignalAction = 'copy_immediately' | 'consider_copying' | 'watch_closely' | 'monitor_only';

export interface BestBetsSignal {
  id: string;
  
  // Market
  marketId: string;
  marketQuestion: string;
  marketCategory?: string;
  
  // Signal classification
  signalType: SignalType;
  signalAction: SignalAction;
  confidenceScore: number; // 0-100
  recommendedSide: 'yes' | 'no';
  
  // Elite consensus
  eliteTraderCount: number;
  eliteConsensusStrength: number; // % agreement
  avgEliteScore: number;
  
  // Position details
  recommendedEntryPrice: number;
  currentMarketPrice: number;
  potentialReturn: number; // %
  riskLevel: 'low' | 'medium' | 'high';
  
  // Top traders backing this signal
  topTraders: Array<{
    address: string;
    eliteScore: number;
    positionSide: 'yes' | 'no';
    entryPrice: number;
    positionSize: number;
    timestamp: Date;
  }>;
  
  // Timing
  signalGeneratedAt: Date;
  signalExpiresAt: Date;
  isActive: boolean;
  
  // Metrics
  urgency: 'immediate' | 'high' | 'normal' | 'low';
  timeToAct: string; // e.g., "2 hours", "1 day"
}

export interface TraderActivity {
  walletAddress: string;
  marketId: string;
  action: 'entry' | 'exit' | 'increase' | 'decrease';
  positionSide: 'yes' | 'no';
  entryPrice: number;
  positionSize: number;
  timestamp: Date;
  traderScore: number;
  traderTier: string;
}

/**
 * Signal Type Thresholds
 */
export const SIGNAL_THRESHOLDS = {
  ELITE: { min: 90, max: 100, action: 'copy_immediately' as SignalAction },
  STRONG: { min: 75, max: 89, action: 'consider_copying' as SignalAction },
  MODERATE: { min: 50, max: 74, action: 'watch_closely' as SignalAction },
  WEAK: { min: 25, max: 49, action: 'monitor_only' as SignalAction },
};

/**
 * Determine signal type and action from confidence score
 */
export function getSignalTypeFromConfidence(confidenceScore: number): {
  type: SignalType;
  action: SignalAction;
} {
  if (confidenceScore >= SIGNAL_THRESHOLDS.ELITE.min) {
    return { type: 'elite', action: SIGNAL_THRESHOLDS.ELITE.action };
  } else if (confidenceScore >= SIGNAL_THRESHOLDS.STRONG.min) {
    return { type: 'strong', action: SIGNAL_THRESHOLDS.STRONG.action };
  } else if (confidenceScore >= SIGNAL_THRESHOLDS.MODERATE.min) {
    return { type: 'moderate', action: SIGNAL_THRESHOLDS.MODERATE.action };
  } else {
    return { type: 'weak', action: SIGNAL_THRESHOLDS.WEAK.action };
  }
}

/**
 * Calculate confidence score for a Best Bet
 * 
 * Factors:
 * - Elite trader count (0-25 points)
 * - Average elite score (0-25 points)
 * - Consensus strength (0-30 points)
 * - Trade recency (0-10 points)
 * - Market liquidity (0-10 points)
 */
export function calculateConfidenceScore(params: {
  eliteTraderCount: number;
  avgEliteScore: number;
  consensusStrength: number; // 0-100%
  avgTradeRecency: number; // hours since last trade
  marketLiquidity: number;
}): number {
  let score = 0;
  
  // Elite trader count (0-25 points)
  if (params.eliteTraderCount >= 10) score += 25;
  else if (params.eliteTraderCount >= 7) score += 20;
  else if (params.eliteTraderCount >= 5) score += 15;
  else if (params.eliteTraderCount >= 3) score += 10;
  else if (params.eliteTraderCount >= 2) score += 5;
  
  // Average elite score (0-25 points)
  score += (params.avgEliteScore / 100) * 25;
  
  // Consensus strength (0-30 points)
  score += (params.consensusStrength / 100) * 30;
  
  // Trade recency (0-10 points) - fresher is better
  if (params.avgTradeRecency <= 1) score += 10;
  else if (params.avgTradeRecency <= 6) score += 8;
  else if (params.avgTradeRecency <= 24) score += 5;
  else if (params.avgTradeRecency <= 48) score += 2;
  
  // Market liquidity (0-10 points)
  if (params.marketLiquidity >= 1000000) score += 10;
  else if (params.marketLiquidity >= 500000) score += 8;
  else if (params.marketLiquidity >= 100000) score += 5;
  else if (params.marketLiquidity >= 50000) score += 3;
  
  return Math.min(Math.round(score), 100);
}

/**
 * Calculate elite consensus
 */
export function calculateEliteConsensus(
  activities: TraderActivity[]
): {
  recommendedSide: 'yes' | 'no';
  consensusStrength: number;
  avgEliteScore: number;
} {
  if (activities.length === 0) {
    return { recommendedSide: 'yes', consensusStrength: 0, avgEliteScore: 0 };
  }
  
  const yesActivities = activities.filter(a => a.positionSide === 'yes');
  const noActivities = activities.filter(a => a.positionSide === 'no');
  
  // Weight by position size
  const yesWeight = yesActivities.reduce((sum, a) => sum + a.positionSize, 0);
  const noWeight = noActivities.reduce((sum, a) => sum + a.positionSize, 0);
  const totalWeight = yesWeight + noWeight;
  
  const yesPercentage = totalWeight > 0 ? (yesWeight / totalWeight) * 100 : 50;
  const noPercentage = 100 - yesPercentage;
  
  const recommendedSide = yesPercentage >= noPercentage ? 'yes' : 'no';
  const consensusStrength = Math.max(yesPercentage, noPercentage);
  
  // Calculate average elite score
  const totalScore = activities.reduce((sum, a) => sum + a.traderScore, 0);
  const avgEliteScore = totalScore / activities.length;
  
  return { recommendedSide, consensusStrength, avgEliteScore };
}

/**
 * Calculate potential return
 */
export function calculatePotentialReturn(
  currentPrice: number,
  recommendedSide: 'yes' | 'no',
  avgEntryPrice: number
): number {
  if (recommendedSide === 'yes') {
    // Potential return if YES wins (pays $1)
    return ((1 - currentPrice) / currentPrice) * 100;
  } else {
    // Potential return if NO wins (YES doesn't happen, so NO position pays $1)
    return (currentPrice / (1 - currentPrice)) * 100;
  }
}

/**
 * Assess risk level
 */
export function assessRiskLevel(
  consensusStrength: number,
  eliteTraderCount: number,
  marketLiquidity: number
): 'low' | 'medium' | 'high' {
  // Low risk: Strong consensus + many traders + high liquidity
  if (
    consensusStrength >= 80 &&
    eliteTraderCount >= 5 &&
    marketLiquidity >= 500000
  ) {
    return 'low';
  }
  
  // High risk: Weak consensus OR few traders OR low liquidity
  if (
    consensusStrength < 60 ||
    eliteTraderCount < 2 ||
    marketLiquidity < 50000
  ) {
    return 'high';
  }
  
  return 'medium';
}

/**
 * Determine urgency level
 */
export function determineUrgency(
  confidenceScore: number,
  avgTradeRecency: number,
  eliteTraderCount: number
): { urgency: 'immediate' | 'high' | 'normal' | 'low'; timeToAct: string } {
  // Immediate: High confidence + very recent activity + multiple traders
  if (confidenceScore >= 85 && avgTradeRecency <= 2 && eliteTraderCount >= 5) {
    return { urgency: 'immediate', timeToAct: '1-2 hours' };
  }
  
  // High: Good confidence + recent activity
  if (confidenceScore >= 75 && avgTradeRecency <= 6) {
    return { urgency: 'high', timeToAct: '6-12 hours' };
  }
  
  // Normal: Decent confidence
  if (confidenceScore >= 60) {
    return { urgency: 'normal', timeToAct: '1-2 days' };
  }
  
  return { urgency: 'low', timeToAct: '3+ days' };
}

/**
 * Generate Best Bets signal from elite trader activity
 */
export function generateBestBetsSignal(
  marketId: string,
  marketQuestion: string,
  marketCategory: string | undefined,
  currentMarketPrice: number,
  marketLiquidity: number,
  recentActivities: TraderActivity[]
): BestBetsSignal | null {
  // Need at least 2 elite traders to generate a signal
  if (recentActivities.length < 2) {
    return null;
  }
  
  // Calculate elite consensus
  const { recommendedSide, consensusStrength, avgEliteScore } = 
    calculateEliteConsensus(recentActivities);
  
  // Calculate average trade recency
  const now = Date.now();
  const avgTradeRecency = recentActivities.reduce((sum, a) => {
    return sum + (now - a.timestamp.getTime()) / (1000 * 60 * 60); // hours
  }, 0) / recentActivities.length;
  
  // Calculate confidence score
  const confidenceScore = calculateConfidenceScore({
    eliteTraderCount: recentActivities.length,
    avgEliteScore,
    consensusStrength,
    avgTradeRecency,
    marketLiquidity,
  });
  
  // Get signal type and action
  const { type: signalType, action: signalAction } = 
    getSignalTypeFromConfidence(confidenceScore);
  
  // Calculate recommended entry price (weighted average)
  const totalWeight = recentActivities.reduce((sum, a) => sum + a.positionSize, 0);
  const recommendedEntryPrice = recentActivities.reduce((sum, a) => {
    return sum + (a.entryPrice * a.positionSize / totalWeight);
  }, 0);
  
  // Calculate potential return
  const potentialReturn = calculatePotentialReturn(
    currentMarketPrice,
    recommendedSide,
    recommendedEntryPrice
  );
  
  // Assess risk level
  const riskLevel = assessRiskLevel(
    consensusStrength,
    recentActivities.length,
    marketLiquidity
  );
  
  // Determine urgency
  const { urgency, timeToAct } = determineUrgency(
    confidenceScore,
    avgTradeRecency,
    recentActivities.length
  );
  
  // Get top traders (sorted by elite score)
  const topTraders = recentActivities
    .sort((a, b) => b.traderScore - a.traderScore)
    .slice(0, 5)
    .map(a => ({
      address: a.walletAddress,
      eliteScore: a.traderScore,
      positionSide: a.positionSide,
      entryPrice: a.entryPrice,
      positionSize: a.positionSize,
      timestamp: a.timestamp,
    }));
  
  // Calculate expiration (signals expire after 48 hours or when market resolves)
  const signalGeneratedAt = new Date();
  const signalExpiresAt = new Date(signalGeneratedAt.getTime() + 48 * 60 * 60 * 1000);
  
  return {
    id: '', // Will be assigned by database
    marketId,
    marketQuestion,
    marketCategory,
    signalType,
    signalAction,
    confidenceScore,
    recommendedSide,
    eliteTraderCount: recentActivities.length,
    eliteConsensusStrength: consensusStrength,
    avgEliteScore,
    recommendedEntryPrice,
    currentMarketPrice,
    potentialReturn,
    riskLevel,
    topTraders,
    signalGeneratedAt,
    signalExpiresAt,
    isActive: true,
    urgency,
    timeToAct,
  };
}

/**
 * Filter signals by confidence threshold
 */
export function filterSignalsByConfidence(
  signals: BestBetsSignal[],
  minConfidence: number
): BestBetsSignal[] {
  return signals.filter(s => s.confidenceScore >= minConfidence);
}

/**
 * Get signals by type
 */
export function filterSignalsByType(
  signals: BestBetsSignal[],
  type: SignalType | SignalType[]
): BestBetsSignal[] {
  const types = Array.isArray(type) ? type : [type];
  return signals.filter(s => types.includes(s.signalType));
}

/**
 * Get immediate action signals (Elite tier only)
 */
export function getImmediateActionSignals(
  signals: BestBetsSignal[]
): BestBetsSignal[] {
  return signals.filter(s => 
    s.signalType === 'elite' && 
    s.urgency === 'immediate' &&
    s.isActive
  );
}

/**
 * Sort signals by priority
 */
export function sortSignalsByPriority(
  signals: BestBetsSignal[]
): BestBetsSignal[] {
  return signals.sort((a, b) => {
    // First by urgency
    const urgencyOrder = { immediate: 4, high: 3, normal: 2, low: 1 };
    if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    }
    
    // Then by confidence score
    if (a.confidenceScore !== b.confidenceScore) {
      return b.confidenceScore - a.confidenceScore;
    }
    
    // Then by elite trader count
    return b.eliteTraderCount - a.eliteTraderCount;
  });
}
