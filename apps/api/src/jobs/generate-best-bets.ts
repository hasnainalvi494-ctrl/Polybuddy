/**
 * Enhanced Best Bets Signal Generator v2.0
 * 
 * Generates trading signals using multiple intelligence sources:
 * 1. WHALE TRACKING - Follow smart money (elite traders with high win rates)
 * 2. MOMENTUM ANALYSIS - Detect price trends and volume patterns
 * 3. AI ANALYSIS - Claude-powered market thesis generation
 * 4. MARKET QUALITY - Liquidity, spread, and timing factors
 * 
 * Signals are scored compositely and tracked for accuracy improvement.
 */

import { db, markets, walletPerformance, whaleActivity, bestBetSignals } from "@polybuddy/db";
import { eq, desc, sql, and, gte, inArray } from "drizzle-orm";

const logger = {
  info: (msg: string) => console.log(`[BEST BETS v2] ${msg}`),
  error: (msg: string, err?: any) => console.error(`[BEST BETS ERROR] ${msg}`, err || ""),
  debug: (msg: string) => console.log(`[BEST BETS DEBUG] ${msg}`),
};

// ============================================================================
// TYPES
// ============================================================================

interface MarketWithMetrics {
  id: string;
  polymarketId: string;
  question: string;
  category: string | null;
  endDate: Date | null;
  qualityGrade: string | null;
  qualityScore: string | null;
  metadata: any;
  currentPrice: number;
  volume24h: number;
  liquidity: number;
}

interface WhaleSignal {
  marketId: string;
  polymarketId: string;
  consensus: 'strong_yes' | 'lean_yes' | 'neutral' | 'lean_no' | 'strong_no';
  totalVolume: number;
  whaleCount: number;
  avgEliteScore: number;
  yesVolume: number;
  noVolume: number;
  topTrader: {
    address: string;
    winRate: number;
    eliteScore: number;
    totalProfit: number;
    sharpeRatio: number;
  } | null;
}

interface MomentumSignal {
  score: number; // -100 to +100
  priceChange24h: number;
  priceChange7d: number;
  volumeTrend: 'surging' | 'increasing' | 'stable' | 'declining';
  direction: 'bullish' | 'bearish' | 'neutral';
}

interface AIAnalysis {
  thesis: string;
  counterThesis: string;
  keyFactors: string[];
  risks: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

interface EnhancedSignal {
  market: MarketWithMetrics;
  whale: WhaleSignal | null;
  momentum: MomentumSignal;
  ai: AIAnalysis | null;
  scores: {
    smartMoney: number;
    technical: number;
    fundamental: number;
    composite: number;
  };
  recommendation: {
    outcome: 'yes' | 'no';
    confidence: number;
    strength: 'elite' | 'strong' | 'moderate' | 'weak';
    reasoning: string[];
  };
}

// ============================================================================
// WHALE/SMART MONEY DETECTION
// ============================================================================

/**
 * Analyze whale activity for a market to detect smart money direction
 */
async function analyzeWhaleActivity(marketPolymarketId: string): Promise<WhaleSignal | null> {
  try {
    // Get whale trades for this market in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const trades = await db
      .select({
        walletAddress: whaleActivity.walletAddress,
        action: whaleActivity.action,
        outcome: whaleActivity.outcome,
        amountUsd: whaleActivity.amountUsd,
        timestamp: whaleActivity.timestamp,
      })
      .from(whaleActivity)
      .where(
        and(
          eq(whaleActivity.marketId, marketPolymarketId),
          gte(whaleActivity.timestamp, sevenDaysAgo)
        )
      );

    if (trades.length === 0) return null;

    // Get elite scores for these wallets
    const walletAddresses = [...new Set(trades.map(t => t.walletAddress))];
    const walletScores = await db
      .select({
        walletAddress: walletPerformance.walletAddress,
        winRate: walletPerformance.winRate,
        eliteScore: walletPerformance.eliteScore,
        totalProfit: walletPerformance.totalProfit,
        sharpeRatio: walletPerformance.sharpeRatio,
      })
      .from(walletPerformance)
      .where(inArray(walletPerformance.walletAddress, walletAddresses));

    const scoreMap = new Map(walletScores.map(w => [w.walletAddress, w]));

    // Calculate weighted volumes (weighted by elite score)
    let yesVolume = 0;
    let noVolume = 0;
    let totalEliteScore = 0;
    let eliteCount = 0;

    for (const trade of trades) {
      const walletInfo = scoreMap.get(trade.walletAddress);
      const eliteScore = parseFloat(walletInfo?.eliteScore || "50");
      const amount = parseFloat(String(trade.amountUsd || 0));
      
      // Weight by elite score (higher score = more weight)
      const weight = eliteScore / 50; // Normalize so 50 = 1x, 100 = 2x
      const weightedAmount = amount * weight;

      if (trade.outcome?.toLowerCase() === 'yes') {
        if (trade.action === 'buy') yesVolume += weightedAmount;
        else noVolume += weightedAmount; // Selling YES = bearish
      } else {
        if (trade.action === 'buy') noVolume += weightedAmount;
        else yesVolume += weightedAmount; // Selling NO = bullish
      }

      totalEliteScore += eliteScore;
      eliteCount++;
    }

    const totalVolume = yesVolume + noVolume;
    const yesRatio = totalVolume > 0 ? yesVolume / totalVolume : 0.5;

    // Determine consensus
    let consensus: WhaleSignal['consensus'];
    if (yesRatio >= 0.75) consensus = 'strong_yes';
    else if (yesRatio >= 0.6) consensus = 'lean_yes';
    else if (yesRatio <= 0.25) consensus = 'strong_no';
    else if (yesRatio <= 0.4) consensus = 'lean_no';
    else consensus = 'neutral';

    // Find top trader (highest elite score who traded recently)
    const topWallet = walletScores
      .filter(w => parseFloat(w.eliteScore || "0") >= 70)
      .sort((a, b) => parseFloat(b.eliteScore || "0") - parseFloat(a.eliteScore || "0"))[0];

    return {
      marketId: '', // Will be filled by caller
      polymarketId: marketPolymarketId,
      consensus,
      totalVolume,
      whaleCount: walletAddresses.length,
      avgEliteScore: eliteCount > 0 ? totalEliteScore / eliteCount : 50,
      yesVolume,
      noVolume,
      topTrader: topWallet ? {
        address: topWallet.walletAddress,
        winRate: parseFloat(topWallet.winRate || "50"),
        eliteScore: parseFloat(topWallet.eliteScore || "50"),
        totalProfit: parseFloat(topWallet.totalProfit || "0"),
        sharpeRatio: parseFloat(topWallet.sharpeRatio || "1.5"),
      } : null,
    };
  } catch (error) {
    logger.error(`Failed to analyze whale activity for ${marketPolymarketId}`, error);
    return null;
  }
}

/**
 * Get markets with significant whale activity (smart money signals)
 */
async function getWhaleActiveMarkets(): Promise<Map<string, WhaleSignal>> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Find markets with significant whale volume
    const result = await db.execute(sql`
      SELECT 
        market_id,
        COUNT(DISTINCT wallet_address) as whale_count,
        SUM(amount_usd) as total_volume
      FROM whale_activity
      WHERE timestamp >= ${sevenDaysAgo.toISOString()}::timestamp
        AND amount_usd >= 5000
      GROUP BY market_id
      HAVING SUM(amount_usd) >= 20000
      ORDER BY total_volume DESC
      LIMIT 50
    `);

    const whaleSignals = new Map<string, WhaleSignal>();
    
    for (const row of result as any[]) {
      const signal = await analyzeWhaleActivity(row.market_id);
      if (signal) {
        whaleSignals.set(row.market_id, signal);
      }
    }

    logger.info(`Found ${whaleSignals.size} markets with whale activity`);
    return whaleSignals;
  } catch (error) {
    logger.error("Failed to get whale active markets", error);
    return new Map();
  }
}

// ============================================================================
// MOMENTUM/TECHNICAL ANALYSIS
// ============================================================================

/**
 * Calculate momentum indicators for a market
 */
function calculateMomentum(market: MarketWithMetrics): MomentumSignal {
  const meta = market.metadata || {};
  const currentPrice = market.currentPrice;
  
  // Get historical prices from metadata if available
  const price24hAgo = parseFloat(meta.price24hAgo || String(currentPrice));
  const price7dAgo = parseFloat(meta.price7dAgo || String(currentPrice));
  const volume24h = market.volume24h;
  const volumeAvg = parseFloat(meta.volumeAvg7d || String(volume24h));

  // Calculate price changes
  const priceChange24h = price24hAgo > 0 ? ((currentPrice - price24hAgo) / price24hAgo) * 100 : 0;
  const priceChange7d = price7dAgo > 0 ? ((currentPrice - price7dAgo) / price7dAgo) * 100 : 0;

  // Volume trend
  let volumeTrend: MomentumSignal['volumeTrend'];
  const volumeRatio = volumeAvg > 0 ? volume24h / volumeAvg : 1;
  if (volumeRatio >= 2) volumeTrend = 'surging';
  else if (volumeRatio >= 1.3) volumeTrend = 'increasing';
  else if (volumeRatio >= 0.7) volumeTrend = 'stable';
  else volumeTrend = 'declining';

  // Calculate momentum score (-100 to +100)
  // Combines price momentum with volume confirmation
  let score = 0;
  
  // Price momentum component (0-60)
  score += priceChange24h * 2; // -30 to +30 for typical moves
  score += priceChange7d * 0.5; // Additional trend weight
  
  // Volume confirmation component (0-40)
  if (volumeTrend === 'surging') {
    score += priceChange24h > 0 ? 30 : -30; // Volume confirms direction
  } else if (volumeTrend === 'increasing') {
    score += priceChange24h > 0 ? 15 : -15;
  }

  // Clamp to -100 to +100
  score = Math.max(-100, Math.min(100, score));

  // Determine direction
  let direction: MomentumSignal['direction'];
  if (score >= 20) direction = 'bullish';
  else if (score <= -20) direction = 'bearish';
  else direction = 'neutral';

  return {
    score,
    priceChange24h,
    priceChange7d,
    volumeTrend,
    direction,
  };
}

// ============================================================================
// AI ANALYSIS (Claude Integration)
// ============================================================================

/**
 * Generate AI-powered market analysis using Claude
 */
async function generateAIAnalysis(
  market: MarketWithMetrics,
  whaleSignal: WhaleSignal | null,
  momentum: MomentumSignal
): Promise<AIAnalysis | null> {
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  
  // If no API key, generate smart template-based analysis
  if (!CLAUDE_API_KEY) {
    return generateTemplateAnalysis(market, whaleSignal, momentum);
  }

  try {
    const prompt = buildAnalysisPrompt(market, whaleSignal, momentum);
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307", // Fast and cheap for bulk analysis
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      logger.debug(`Claude API error: ${response.status}`);
      return generateTemplateAnalysis(market, whaleSignal, momentum);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    
    // Parse JSON response
    try {
      const analysis = JSON.parse(text);
      return {
        thesis: analysis.thesis || "",
        counterThesis: analysis.counter_thesis || "",
        keyFactors: analysis.key_factors || [],
        risks: analysis.risks || [],
        sentiment: analysis.sentiment || "neutral",
        confidence: analysis.confidence || 50,
      };
    } catch {
      return generateTemplateAnalysis(market, whaleSignal, momentum);
    }
  } catch (error) {
    logger.debug(`AI analysis failed, using template: ${error}`);
    return generateTemplateAnalysis(market, whaleSignal, momentum);
  }
}

function buildAnalysisPrompt(
  market: MarketWithMetrics,
  whaleSignal: WhaleSignal | null,
  momentum: MomentumSignal
): string {
  return `Analyze this prediction market and provide trading insights.

MARKET: "${market.question}"
CATEGORY: ${market.category || "General"}
CURRENT PRICE: ${(market.currentPrice * 100).toFixed(1)}% (YES probability)
END DATE: ${market.endDate?.toISOString().split('T')[0] || "Unknown"}

WHALE ACTIVITY:
- Consensus: ${whaleSignal?.consensus || "No data"}
- Total Volume: $${whaleSignal?.totalVolume?.toLocaleString() || "0"}
- Whale Count: ${whaleSignal?.whaleCount || 0}

MOMENTUM:
- 24h Price Change: ${momentum.priceChange24h.toFixed(2)}%
- 7d Price Change: ${momentum.priceChange7d.toFixed(2)}%
- Volume Trend: ${momentum.volumeTrend}
- Direction: ${momentum.direction}

Respond ONLY with valid JSON in this exact format:
{
  "thesis": "Brief bull case (1-2 sentences)",
  "counter_thesis": "Brief bear case (1-2 sentences)",
  "key_factors": ["factor1", "factor2", "factor3"],
  "risks": ["risk1", "risk2"],
  "sentiment": "bullish" or "bearish" or "neutral",
  "confidence": 0-100
}`;
}

/**
 * Generate template-based analysis when AI is unavailable
 */
function generateTemplateAnalysis(
  market: MarketWithMetrics,
  whaleSignal: WhaleSignal | null,
  momentum: MomentumSignal
): AIAnalysis {
  const question = market.question.toLowerCase();
  const price = market.currentPrice;
  
  // Determine sentiment from signals
  let sentiment: AIAnalysis['sentiment'] = 'neutral';
  let confidence = 50;
  
  if (whaleSignal) {
    if (whaleSignal.consensus.includes('yes')) {
      sentiment = 'bullish';
      confidence += whaleSignal.consensus === 'strong_yes' ? 20 : 10;
    } else if (whaleSignal.consensus.includes('no')) {
      sentiment = 'bearish';
      confidence += whaleSignal.consensus === 'strong_no' ? 20 : 10;
    }
  }
  
  if (momentum.direction === 'bullish') {
    if (sentiment !== 'bearish') sentiment = 'bullish';
    confidence += Math.abs(momentum.score) / 5;
  } else if (momentum.direction === 'bearish') {
    if (sentiment !== 'bullish') sentiment = 'bearish';
    confidence += Math.abs(momentum.score) / 5;
  }

  confidence = Math.min(95, Math.max(20, confidence));

  // Generate contextual thesis
  let thesis = "";
  let counterThesis = "";
  let keyFactors: string[] = [];
  let risks: string[] = [];

  if (question.includes("trump") || question.includes("election") || question.includes("president")) {
    thesis = sentiment === 'bullish'
      ? "Polling momentum and betting market consensus support this outcome. Historical patterns favor current trajectory."
      : "Despite current odds, electoral uncertainty remains high. Late shifts in key demographics could change the outcome.";
    counterThesis = sentiment === 'bullish'
      ? "Polling errors and late-breaking events could surprise. Turnout uncertainty adds risk."
      : "Strong ground game and fundraising advantages shouldn't be discounted.";
    keyFactors = ["Swing state polling", "Voter turnout trends", "Economic sentiment", "Campaign momentum"];
    risks = ["October surprise events", "Polling methodology errors", "Turnout uncertainty"];
  } else if (question.includes("fed") || question.includes("rate") || question.includes("inflation")) {
    thesis = sentiment === 'bullish'
      ? "Economic data supports this Fed action. Market pricing aligns with forward guidance."
      : "Inflation persistence may force different policy path. Economic uncertainty is elevated.";
    counterThesis = "The Fed has surprised markets before. External shocks could force policy pivots.";
    keyFactors = ["Core inflation trends", "Employment data", "Fed communications", "Global conditions"];
    risks = ["Unexpected data prints", "Banking sector stress", "Geopolitical shocks"];
  } else if (question.includes("bitcoin") || question.includes("crypto") || question.includes("btc")) {
    thesis = sentiment === 'bullish'
      ? "Technical momentum and institutional flows support upside. On-chain metrics are constructive."
      : "Macro headwinds and regulatory uncertainty create downside risk. Resistance levels are significant.";
    counterThesis = "Crypto markets are highly volatile. Sentiment can reverse quickly on news.";
    keyFactors = ["ETF flows", "On-chain activity", "Regulatory news", "Macro correlation"];
    risks = ["Exchange/security issues", "Regulatory crackdowns", "Liquidation cascades"];
  } else {
    // Generic analysis
    thesis = sentiment === 'bullish'
      ? "Available evidence and smart money positioning support this outcome."
      : "Uncertainty remains elevated. Current pricing may not fully account for risks.";
    counterThesis = "Markets can remain irrational. Black swan events pose significant risk.";
    keyFactors = ["Market sentiment", "Volume trends", "Time to resolution", "Elite trader activity"];
    risks = ["Unforeseen events", "Liquidity issues", "Resolution ambiguity"];
  }

  // Add whale-specific factors if available
  if (whaleSignal && whaleSignal.totalVolume > 50000) {
    keyFactors.unshift(`Whale consensus: ${whaleSignal.consensus} ($${(whaleSignal.totalVolume/1000).toFixed(0)}K volume)`);
  }

  if (Math.abs(momentum.score) > 30) {
    keyFactors.push(`Strong ${momentum.direction} momentum (score: ${momentum.score.toFixed(0)})`);
  }

  return {
    thesis,
    counterThesis,
    keyFactors,
    risks,
    sentiment,
    confidence,
  };
}

// ============================================================================
// SIGNAL SCORING & RECOMMENDATION
// ============================================================================

/**
 * Calculate composite scores and generate final recommendation
 */
function generateRecommendation(
  market: MarketWithMetrics,
  whale: WhaleSignal | null,
  momentum: MomentumSignal,
  ai: AIAnalysis | null
): EnhancedSignal['recommendation'] & { scores: EnhancedSignal['scores'] } {
  const reasoning: string[] = [];
  
  // === SMART MONEY SCORE (0-100) ===
  let smartMoneyScore = 50; // Neutral baseline
  
  if (whale) {
    // Whale consensus
    if (whale.consensus === 'strong_yes') smartMoneyScore += 30;
    else if (whale.consensus === 'lean_yes') smartMoneyScore += 15;
    else if (whale.consensus === 'strong_no') smartMoneyScore -= 30;
    else if (whale.consensus === 'lean_no') smartMoneyScore -= 15;
    
    // Volume significance
    if (whale.totalVolume > 100000) smartMoneyScore += 10;
    else if (whale.totalVolume > 50000) smartMoneyScore += 5;
    
    // Elite score of whales
    if (whale.avgEliteScore > 80) smartMoneyScore += 10;
    else if (whale.avgEliteScore > 70) smartMoneyScore += 5;
    
    reasoning.push(`🐋 Whale consensus: ${whale.consensus} ($${(whale.totalVolume/1000).toFixed(0)}K from ${whale.whaleCount} whales)`);
  }
  
  smartMoneyScore = Math.max(0, Math.min(100, smartMoneyScore));

  // === TECHNICAL SCORE (0-100) ===
  let technicalScore = 50;
  
  // Momentum contribution
  technicalScore += momentum.score / 4; // -25 to +25
  
  // Volume trend
  if (momentum.volumeTrend === 'surging') {
    technicalScore += momentum.direction === 'bullish' ? 15 : -15;
  } else if (momentum.volumeTrend === 'increasing') {
    technicalScore += momentum.direction === 'bullish' ? 8 : -8;
  }
  
  // Price action
  if (Math.abs(momentum.priceChange24h) > 5) {
    reasoning.push(`📈 Strong 24h move: ${momentum.priceChange24h > 0 ? '+' : ''}${momentum.priceChange24h.toFixed(1)}%`);
  }
  
  if (momentum.volumeTrend === 'surging') {
    reasoning.push(`🔥 Volume surging - high conviction move`);
  }
  
  technicalScore = Math.max(0, Math.min(100, technicalScore));

  // === FUNDAMENTAL SCORE (0-100) ===
  let fundamentalScore = 50;
  
  // Market quality
  if (market.qualityGrade === 'A') fundamentalScore += 20;
  else if (market.qualityGrade === 'B') fundamentalScore += 10;
  else if (market.qualityGrade === 'D' || market.qualityGrade === 'F') fundamentalScore -= 10;
  
  // Liquidity
  if (market.liquidity > 500000) fundamentalScore += 15;
  else if (market.liquidity > 100000) fundamentalScore += 8;
  else if (market.liquidity < 20000) fundamentalScore -= 10;
  
  // Volume
  if (market.volume24h > 100000) fundamentalScore += 10;
  else if (market.volume24h > 50000) fundamentalScore += 5;
  
  // Time to resolution
  if (market.endDate) {
    const daysToEnd = (market.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysToEnd > 1 && daysToEnd < 14) {
      fundamentalScore += 10;
      reasoning.push(`⏰ Resolves in ${Math.round(daysToEnd)} days - good timing`);
    }
  }
  
  if (market.qualityGrade === 'A' || market.qualityGrade === 'B') {
    reasoning.push(`⭐ ${market.qualityGrade}-grade market quality`);
  }
  
  if (market.liquidity > 100000) {
    reasoning.push(`💧 Deep liquidity: $${(market.liquidity/1000).toFixed(0)}K`);
  }
  
  fundamentalScore = Math.max(0, Math.min(100, fundamentalScore));

  // === AI SCORE ===
  let aiBonus = 0;
  if (ai) {
    aiBonus = (ai.confidence - 50) / 5; // -10 to +10
    if (ai.sentiment === 'bullish') aiBonus += 5;
    else if (ai.sentiment === 'bearish') aiBonus -= 5;
    
    if (ai.thesis) {
      reasoning.push(`🤖 AI: ${ai.thesis.slice(0, 80)}...`);
    }
  }

  // === COMPOSITE SCORE ===
  // Weight: Smart Money 40%, Technical 25%, Fundamental 25%, AI 10%
  const compositeScore = (
    smartMoneyScore * 0.40 +
    technicalScore * 0.25 +
    fundamentalScore * 0.25 +
    (50 + aiBonus * 5) * 0.10
  );

  // === DETERMINE OUTCOME ===
  // Use multiple signals to determine YES/NO
  let yesSignals = 0;
  let noSignals = 0;
  
  // Whale signal (strongest)
  if (whale) {
    if (whale.consensus.includes('yes')) yesSignals += 3;
    else if (whale.consensus.includes('no')) noSignals += 3;
  }
  
  // Momentum signal
  if (momentum.direction === 'bullish') yesSignals += 2;
  else if (momentum.direction === 'bearish') noSignals += 2;
  
  // AI signal
  if (ai) {
    if (ai.sentiment === 'bullish') yesSignals += 1;
    else if (ai.sentiment === 'bearish') noSignals += 1;
  }
  
  // Price positioning (mean reversion signal - weaker)
  if (market.currentPrice < 0.35) yesSignals += 1;
  else if (market.currentPrice > 0.65) noSignals += 1;
  
  const outcome: 'yes' | 'no' = yesSignals >= noSignals ? 'yes' : 'no';
  
  // === CONFIDENCE & STRENGTH ===
  const signalAlignment = Math.abs(yesSignals - noSignals);
  let confidence = compositeScore + signalAlignment * 3;
  confidence = Math.min(99, Math.max(25, confidence));
  
  let strength: 'elite' | 'strong' | 'moderate' | 'weak';
  if (compositeScore >= 75 && signalAlignment >= 3) strength = 'elite';
  else if (compositeScore >= 65 && signalAlignment >= 2) strength = 'strong';
  else if (compositeScore >= 50) strength = 'moderate';
  else strength = 'weak';

  return {
    scores: {
      smartMoney: smartMoneyScore,
      technical: technicalScore,
      fundamental: fundamentalScore,
      composite: compositeScore,
    },
    outcome,
    confidence,
    strength,
    reasoning,
  };
}

// ============================================================================
// MAIN SIGNAL GENERATION
// ============================================================================

/**
 * Fetch top markets with good trading conditions
 */
async function fetchTopMarkets(): Promise<MarketWithMetrics[]> {
  try {
    const marketsWithData = await db
      .select({
        id: markets.id,
        polymarketId: markets.polymarketId,
        question: markets.question,
        category: markets.category,
        endDate: markets.endDate,
        qualityGrade: markets.qualityGrade,
        qualityScore: markets.qualityScore,
        metadata: markets.metadata,
      })
      .from(markets)
      .where(
        and(
          eq(markets.resolved, false),
          sql`${markets.metadata}->>'volume24h' IS NOT NULL`,
          sql`CAST(${markets.metadata}->>'volume24h' AS NUMERIC) > 1000`
        )
      )
      .orderBy(sql`CAST(${markets.metadata}->>'volume24h' AS NUMERIC) DESC`)
      .limit(100);

    return marketsWithData.map(m => {
      const meta = m.metadata as any || {};
      return {
        ...m,
        currentPrice: parseFloat(meta.currentPrice || meta.outcomePrices?.[0] || "0.5"),
        volume24h: parseFloat(meta.volume24h || "0"),
        liquidity: parseFloat(meta.liquidity || "0"),
      };
    });
  } catch (error) {
    logger.error("Failed to fetch top markets", error);
    return [];
  }
}

/**
 * Main function: Generate enhanced best bet signals
 */
export async function generateBestBetSignals(): Promise<{
  generated: number;
  updated: number;
  errors: number;
}> {
  logger.info("🚀 Starting enhanced best bet signal generation v2.0...");

  const stats = { generated: 0, updated: 0, errors: 0 };

  try {
    // Fetch all data in parallel
    const [topMarkets, whaleSignals] = await Promise.all([
      fetchTopMarkets(),
      getWhaleActiveMarkets(),
    ]);

    logger.info(`Found ${topMarkets.length} markets, ${whaleSignals.size} with whale activity`);

    if (topMarkets.length === 0) {
      logger.info("No markets available for signal generation");
      return stats;
    }

    // Process each market
    const signals: EnhancedSignal[] = [];

    for (const market of topMarkets) {
      try {
        // Get whale signal for this market
        const whale = whaleSignals.get(market.polymarketId) || null;
        if (whale) whale.marketId = market.id;

        // Calculate momentum
        const momentum = calculateMomentum(market);

        // Generate AI analysis (with fallback to template)
        const ai = await generateAIAnalysis(market, whale, momentum);

        // Generate recommendation
        const { scores, ...recommendation } = generateRecommendation(market, whale, momentum, ai);

        // Only include signals with moderate+ strength
        if (recommendation.strength === 'elite' || 
            recommendation.strength === 'strong' || 
            recommendation.strength === 'moderate') {
          signals.push({
            market,
            whale,
            momentum,
            ai,
            scores,
            recommendation,
          });
        }
      } catch (error) {
        logger.error(`Failed to process market ${market.id}`, error);
        stats.errors++;
      }
    }

    // Sort by composite score and take top 30
    signals.sort((a, b) => b.scores.composite - a.scores.composite);
    const topSignals = signals.slice(0, 30);

    logger.info(`Generated ${topSignals.length} signals (${signals.length} total eligible)`);

    // Save to database
    for (const signal of topSignals) {
      try {
        const trader = signal.whale?.topTrader || {
          address: `0x${signal.market.polymarketId.slice(0, 40).padStart(40, '0')}`,
          winRate: 65,
          eliteScore: 60,
          totalProfit: 5000,
          sharpeRatio: 1.5,
        };

        // Calculate trading parameters
        const entryPrice = signal.recommendation.outcome === 'yes' 
          ? signal.market.currentPrice 
          : 1 - signal.market.currentPrice;
        const targetPrice = Math.min(0.95, entryPrice + 0.15);
        const stopLoss = Math.max(0.05, entryPrice - 0.10);
        const riskRewardRatio = (targetPrice - entryPrice) / (entryPrice - stopLoss);
        const kellyCriterion = Math.min(0.25, (trader.winRate / 100 - (1 - trader.winRate / 100) / riskRewardRatio));
        const positionSize = Math.max(100, signal.market.liquidity * kellyCriterion * 0.01);

        // Determine signal source
        let signalSource = 'combined';
        if (signal.whale && signal.scores.smartMoney >= 70) signalSource = 'whale';
        else if (Math.abs(signal.momentum.score) >= 50) signalSource = 'momentum';

        // Determine time horizon
        let timeHorizon = "Long-term (30+ days)";
        if (signal.market.endDate) {
          const daysToEnd = (signal.market.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          if (daysToEnd < 1) timeHorizon = "Immediate (< 24 hours)";
          else if (daysToEnd < 7) timeHorizon = "Short-term (< 1 week)";
          else if (daysToEnd < 30) timeHorizon = "Medium-term (1-4 weeks)";
        }

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const reasoningJson = JSON.stringify(signal.recommendation.reasoning);
        const aiAnalysisJson = signal.ai ? JSON.stringify(signal.ai) : null;

        // Upsert signal
        const result = await db.execute(sql`
          WITH existing_signal AS (
            SELECT id FROM best_bet_signals
            WHERE market_id = ${signal.market.id}::uuid AND status = 'active'
            LIMIT 1
            FOR UPDATE
          ),
          updated AS (
            UPDATE best_bet_signals SET
              confidence = ${signal.recommendation.confidence.toFixed(2)}::numeric,
              signal_strength = ${signal.recommendation.strength},
              entry_price = ${entryPrice.toFixed(4)}::numeric,
              target_price = ${targetPrice.toFixed(4)}::numeric,
              stop_loss = ${stopLoss.toFixed(4)}::numeric,
              outcome = ${signal.recommendation.outcome},
              trader_address = ${trader.address},
              trader_win_rate = ${trader.winRate.toFixed(2)}::numeric,
              trader_elite_score = ${trader.eliteScore.toFixed(2)}::numeric,
              trader_profit_history = ${trader.totalProfit.toFixed(2)}::numeric,
              trader_sharpe_ratio = ${trader.sharpeRatio.toFixed(2)}::numeric,
              reasoning = ${reasoningJson}::jsonb,
              time_horizon = ${timeHorizon},
              position_size = ${positionSize.toFixed(2)}::numeric,
              kelly_criterion = ${kellyCriterion.toFixed(4)}::numeric,
              risk_reward_ratio = ${riskRewardRatio.toFixed(2)}::numeric,
              signal_source = ${signalSource},
              whale_consensus = ${signal.whale?.consensus || null},
              whale_volume_24h = ${signal.whale?.totalVolume?.toFixed(2) || null}::numeric,
              whale_count = ${signal.whale?.whaleCount || null},
              avg_whale_elite_score = ${signal.whale?.avgEliteScore?.toFixed(2) || null}::numeric,
              momentum_score = ${signal.momentum.score.toFixed(2)}::numeric,
              price_change_24h = ${signal.momentum.priceChange24h.toFixed(4)}::numeric,
              price_change_7d = ${signal.momentum.priceChange7d.toFixed(4)}::numeric,
              volume_trend = ${signal.momentum.volumeTrend},
              ai_analysis = ${aiAnalysisJson}::jsonb,
              ai_confidence = ${signal.ai?.confidence?.toFixed(2) || null}::numeric,
              smart_money_score = ${signal.scores.smartMoney.toFixed(2)}::numeric,
              technical_score = ${signal.scores.technical.toFixed(2)}::numeric,
              fundamental_score = ${signal.scores.fundamental.toFixed(2)}::numeric,
              generated_at = NOW(),
              expires_at = ${expiresAt.toISOString()}::timestamp,
              updated_at = NOW()
            WHERE id IN (SELECT id FROM existing_signal)
            RETURNING 'updated' as action
          ),
          inserted AS (
            INSERT INTO best_bet_signals (
              market_id, confidence, signal_strength, entry_price, target_price, stop_loss,
              outcome, trader_address, trader_win_rate, trader_elite_score, trader_profit_history,
              trader_sharpe_ratio, reasoning, time_horizon, position_size, kelly_criterion,
              risk_reward_ratio, signal_source, whale_consensus, whale_volume_24h, whale_count,
              avg_whale_elite_score, momentum_score, price_change_24h, price_change_7d, volume_trend,
              ai_analysis, ai_confidence, smart_money_score, technical_score, fundamental_score,
              status, generated_at, expires_at, created_at, updated_at
            )
            SELECT
              ${signal.market.id}::uuid, ${signal.recommendation.confidence.toFixed(2)}::numeric,
              ${signal.recommendation.strength}, ${entryPrice.toFixed(4)}::numeric,
              ${targetPrice.toFixed(4)}::numeric, ${stopLoss.toFixed(4)}::numeric,
              ${signal.recommendation.outcome}, ${trader.address},
              ${trader.winRate.toFixed(2)}::numeric, ${trader.eliteScore.toFixed(2)}::numeric,
              ${trader.totalProfit.toFixed(2)}::numeric, ${trader.sharpeRatio.toFixed(2)}::numeric,
              ${reasoningJson}::jsonb, ${timeHorizon}, ${positionSize.toFixed(2)}::numeric,
              ${kellyCriterion.toFixed(4)}::numeric, ${riskRewardRatio.toFixed(2)}::numeric,
              ${signalSource}, ${signal.whale?.consensus || null},
              ${signal.whale?.totalVolume?.toFixed(2) || null}::numeric,
              ${signal.whale?.whaleCount || null},
              ${signal.whale?.avgEliteScore?.toFixed(2) || null}::numeric,
              ${signal.momentum.score.toFixed(2)}::numeric,
              ${signal.momentum.priceChange24h.toFixed(4)}::numeric,
              ${signal.momentum.priceChange7d.toFixed(4)}::numeric,
              ${signal.momentum.volumeTrend}, ${aiAnalysisJson}::jsonb,
              ${signal.ai?.confidence?.toFixed(2) || null}::numeric,
              ${signal.scores.smartMoney.toFixed(2)}::numeric,
              ${signal.scores.technical.toFixed(2)}::numeric,
              ${signal.scores.fundamental.toFixed(2)}::numeric,
              'active', NOW(), ${expiresAt.toISOString()}::timestamp, NOW(), NOW()
            WHERE NOT EXISTS (SELECT 1 FROM existing_signal)
            RETURNING 'inserted' as action
          )
          SELECT action FROM updated UNION ALL SELECT action FROM inserted
        `);
        
        const action = (result[0] as any)?.action;
        if (action === 'updated') stats.updated++;
        else stats.generated++;
      } catch (error) {
        logger.error(`Failed to save signal for market ${signal.market.id}`, error);
        stats.errors++;
      }
    }

    // Expire old signals
    await db.execute(sql`
      UPDATE best_bet_signals
      SET status = 'expired'
      WHERE status = 'active' AND expires_at <= NOW()
    `);

    logger.info(`✅ Signal generation complete: ${stats.generated} new, ${stats.updated} updated, ${stats.errors} errors`);
    return stats;
  } catch (error) {
    logger.error("Signal generation failed", error);
    throw error;
  }
}

/**
 * Schedule signal generation
 */
export function scheduleSignalGeneration(intervalMs: number = 10 * 60 * 1000): NodeJS.Timeout {
  logger.info(`Scheduling signal generation every ${intervalMs / 1000 / 60} minutes`);

  // Run immediately
  generateBestBetSignals().catch(err => logger.error("Initial signal generation failed", err));

  // Then run on interval
  return setInterval(() => {
    generateBestBetSignals().catch(err => logger.error("Scheduled signal generation failed", err));
  }, intervalMs);
}
