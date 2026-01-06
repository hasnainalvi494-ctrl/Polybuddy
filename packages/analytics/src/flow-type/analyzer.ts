import {
  TradeEvent,
  FlowEpisode,
  FlowLabel,
  FlowLabelResult,
  MarketFlowSummary,
  FlowThresholds,
  DEFAULT_FLOW_THRESHOLDS,
  FLOW_DISPLAY_LABELS,
} from "./types.js";
import { WhyBullet } from "../market-state/types.js";

/**
 * Flow Type Analyzer
 *
 * Sessionizes trades into episodes and classifies each by flow pattern.
 * Helps distinguish meaningful flow from noise.
 */

/**
 * Build flow episodes from raw trades (sessionize by time gap)
 */
export function buildFlowEpisodes(
  marketId: string,
  trades: TradeEvent[],
  thresholds: FlowThresholds = DEFAULT_FLOW_THRESHOLDS
): FlowEpisode[] {
  if (trades.length === 0) return [];

  // Sort by timestamp
  const sorted = [...trades].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const firstTrade = sorted[0];
  if (!firstTrade) return [];

  const episodes: FlowEpisode[] = [];
  let currentEpisode: TradeEvent[] = [firstTrade];

  for (let i = 1; i < sorted.length; i++) {
    const trade = sorted[i]!;
    const lastTrade = currentEpisode[currentEpisode.length - 1]!;
    const gapMinutes = (trade.timestamp.getTime() - lastTrade.timestamp.getTime()) / (1000 * 60);

    if (gapMinutes > thresholds.sessionGapMinutes) {
      // Gap too large, close current episode and start new one
      if (currentEpisode.length >= thresholds.minTradesForEpisode) {
        episodes.push(buildEpisodeFromTrades(marketId, currentEpisode, episodes.length));
      }
      currentEpisode = [trade];
    } else {
      currentEpisode.push(trade);
    }
  }

  // Don't forget the last episode
  if (currentEpisode.length >= thresholds.minTradesForEpisode) {
    episodes.push(buildEpisodeFromTrades(marketId, currentEpisode, episodes.length));
  }

  return episodes;
}

/**
 * Build episode from a group of trades
 */
function buildEpisodeFromTrades(
  marketId: string,
  trades: TradeEvent[],
  index: number
): FlowEpisode {
  const firstTrade = trades[0]!;
  const lastTrade = trades[trades.length - 1]!;
  const startTime = firstTrade.timestamp;
  const endTime = lastTrade.timestamp;
  const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

  // Calculate net flow (buys positive, sells negative)
  let netFlow = 0;
  let totalVolume = 0;
  const wallets = new Set<string>();

  for (const trade of trades) {
    const signedSize = trade.side === "buy" ? trade.size : -trade.size;
    netFlow += signedSize;
    totalVolume += trade.size;
    wallets.add(trade.walletId);
  }

  const priceAtStart = firstTrade.price;
  const priceAtEnd = lastTrade.price;
  const priceChange = priceAtStart > 0 ? ((priceAtEnd - priceAtStart) / priceAtStart) * 100 : 0;

  return {
    episodeId: `${marketId}-${index}-${startTime.getTime()}`,
    marketId,
    startTime,
    endTime,
    durationMinutes,
    trades,
    netFlow,
    totalVolume,
    uniqueWallets: wallets.size,
    avgTradeSize: totalVolume / trades.length,
    priceAtStart,
    priceAtEnd,
    priceChange,
  };
}

/**
 * Classify a flow episode by pattern type
 */
export function classifyFlowEpisode(
  episode: FlowEpisode,
  thresholds: FlowThresholds = DEFAULT_FLOW_THRESHOLDS,
  followUpPrice: number | null = null
): FlowLabelResult {
  // Calculate scores for each label
  const scores: Record<FlowLabel, number> = {
    one_off_spike: scoreOneOffSpike(episode, thresholds),
    sustained_accumulation: scoreSustainedAccumulation(episode, thresholds),
    crowd_chase: scoreCrowdChase(episode, thresholds),
    exhaustion_move: scoreExhaustionMove(episode, thresholds),
  };

  // Pick the highest score
  let bestLabel: FlowLabel = "one_off_spike";
  let bestScore = scores.one_off_spike;

  for (const [label, score] of Object.entries(scores) as [FlowLabel, number][]) {
    if (score > bestScore) {
      bestScore = score;
      bestLabel = label;
    }
  }

  // Calculate price impact
  const priceImpact = Math.abs(episode.priceChange);

  // Calculate follow-up price change if available
  let followUpPriceChange: number | null = null;
  if (followUpPrice !== null) {
    followUpPriceChange = ((followUpPrice - episode.priceAtEnd) / episode.priceAtEnd) * 100;
  }

  // Build why bullets
  const whyBullets = buildWhyBullets(bestLabel, episode, thresholds);

  return {
    episodeId: episode.episodeId,
    marketId: episode.marketId,
    label: bestLabel,
    displayLabel: FLOW_DISPLAY_LABELS[bestLabel],
    confidence: Math.round(Math.min(100, bestScore)),
    whyBullets,
    episode,
    priceImpact,
    followUpPriceChange,
    computedAt: new Date(),
  };
}

/**
 * Score for one-off spike (single large trade, likely news-driven)
 */
function scoreOneOffSpike(episode: FlowEpisode, thresholds: FlowThresholds): number {
  let score = 0;

  // Few trades, high volume = spike
  if (episode.trades.length <= 3) {
    score += 30;
  }

  // High average trade size
  if (episode.avgTradeSize > thresholds.spikeMinSize) {
    score += 40;
  } else if (episode.avgTradeSize > thresholds.spikeMinSize / 2) {
    score += 20;
  }

  // Single wallet more likely to be spike
  if (episode.uniqueWallets === 1) {
    score += 20;
  }

  // Short duration
  if (episode.durationMinutes < 5) {
    score += 10;
  }

  return score;
}

/**
 * Score for sustained accumulation (repeated adds, conviction)
 */
function scoreSustainedAccumulation(episode: FlowEpisode, thresholds: FlowThresholds): number {
  let score = 0;

  // Many trades
  if (episode.trades.length >= thresholds.accumulationMinTrades) {
    score += 30;
  }

  // Consistent direction (mostly buys or mostly sells)
  const buyCount = episode.trades.filter(t => t.side === "buy").length;
  const directionRatio = Math.max(buyCount, episode.trades.length - buyCount) / episode.trades.length;
  if (directionRatio > 0.8) {
    score += 30;
  } else if (directionRatio > 0.6) {
    score += 15;
  }

  // Longer duration suggests conviction
  if (episode.durationMinutes > 60) {
    score += 20;
  } else if (episode.durationMinutes > 15) {
    score += 10;
  }

  // Few wallets = single actor accumulating
  if (episode.uniqueWallets <= 2) {
    score += 20;
  }

  return score;
}

/**
 * Score for crowd chase (many wallets following momentum)
 */
function scoreCrowdChase(episode: FlowEpisode, thresholds: FlowThresholds): number {
  let score = 0;

  // Many unique wallets
  if (episode.uniqueWallets >= thresholds.crowdMinWallets) {
    score += 40;
  } else if (episode.uniqueWallets >= 3) {
    score += 20;
  }

  // Price moving in direction of flow
  const flowDirection = episode.netFlow > 0 ? 1 : -1;
  const priceDirection = episode.priceChange > 0 ? 1 : -1;
  if (flowDirection === priceDirection && Math.abs(episode.priceChange) > 2) {
    score += 30;
  }

  // Many trades in short time
  const tradesPerMinute = episode.trades.length / Math.max(1, episode.durationMinutes);
  if (tradesPerMinute > 0.5) {
    score += 20;
  }

  // Similar sized trades (not one whale)
  const sizeStdDev = calculateStdDev(episode.trades.map(t => t.size));
  if (sizeStdDev / episode.avgTradeSize < 0.5) {
    score += 10;
  }

  return score;
}

/**
 * Score for exhaustion move (late-stage crowding, potential reversal)
 */
function scoreExhaustionMove(episode: FlowEpisode, thresholds: FlowThresholds): number {
  let score = 0;

  // Price at extreme level
  const extremePrice = Math.max(episode.priceAtStart, episode.priceAtEnd);
  if (extremePrice > thresholds.exhaustionPriceThreshold || extremePrice < (1 - thresholds.exhaustionPriceThreshold)) {
    score += 30;
  }

  // Many wallets piling in
  if (episode.uniqueWallets >= thresholds.crowdMinWallets) {
    score += 20;
  }

  // Decreasing trade sizes (late participants going smaller)
  const firstHalfAvg = average(episode.trades.slice(0, Math.floor(episode.trades.length / 2)).map(t => t.size));
  const secondHalfAvg = average(episode.trades.slice(Math.floor(episode.trades.length / 2)).map(t => t.size));
  if (secondHalfAvg < firstHalfAvg * 0.7) {
    score += 25;
  }

  // Price momentum slowing
  if (Math.abs(episode.priceChange) < 1) {
    score += 15;
  }

  // Many small trades (retail piling in)
  if (episode.avgTradeSize < 500) {
    score += 10;
  }

  return score;
}

/**
 * Build why bullets for the classified label
 */
function buildWhyBullets(
  label: FlowLabel,
  episode: FlowEpisode,
  _thresholds: FlowThresholds
): [WhyBullet, WhyBullet, WhyBullet] {
  const bullets: WhyBullet[] = [];

  switch (label) {
    case "one_off_spike":
      bullets.push({
        text: "Large single-session volume burst",
        metric: "Total volume",
        value: Math.round(episode.totalVolume),
        unit: "USD",
        comparison: `in ${episode.trades.length} trades`,
      });
      bullets.push({
        text: "High average trade size suggests informed flow",
        metric: "Avg trade size",
        value: Math.round(episode.avgTradeSize),
        unit: "USD",
      });
      bullets.push({
        text: `Price moved ${episode.priceChange > 0 ? "up" : "down"} during spike`,
        metric: "Price impact",
        value: Number(Math.abs(episode.priceChange).toFixed(1)),
        unit: "%",
      });
      break;

    case "sustained_accumulation":
      bullets.push({
        text: "Repeated trading over extended period",
        metric: "Trade count",
        value: episode.trades.length,
        unit: "trades",
        comparison: `over ${Math.round(episode.durationMinutes)} minutes`,
      });
      bullets.push({
        text: "Consistent directional flow suggests conviction",
        metric: "Net flow",
        value: Math.round(Math.abs(episode.netFlow)),
        unit: "USD",
        comparison: episode.netFlow > 0 ? "buying" : "selling",
      });
      bullets.push({
        text: `${episode.uniqueWallets} wallet(s) building position`,
        metric: "Unique wallets",
        value: episode.uniqueWallets,
        unit: "wallets",
      });
      break;

    case "crowd_chase":
      bullets.push({
        text: "Many wallets trading simultaneously",
        metric: "Unique wallets",
        value: episode.uniqueWallets,
        unit: "wallets",
        comparison: `in ${Math.round(episode.durationMinutes)} min window`,
      });
      bullets.push({
        text: "Flow following price momentum",
        metric: "Price change",
        value: Number(episode.priceChange.toFixed(1)),
        unit: "%",
        comparison: episode.netFlow > 0 ? "with net buying" : "with net selling",
      });
      bullets.push({
        text: "High activity rate indicates FOMO behavior",
        metric: "Activity rate",
        value: Number((episode.trades.length / Math.max(1, episode.durationMinutes)).toFixed(2)),
        unit: "trades/min",
      });
      break;

    case "exhaustion_move":
      bullets.push({
        text: "Price at extreme level suggests late-stage crowding",
        metric: "Current price",
        value: Number((Math.max(episode.priceAtStart, episode.priceAtEnd) * 100).toFixed(0)),
        unit: "%",
        comparison: "approaching limit",
      });
      bullets.push({
        text: "Many participants piling in at extremes",
        metric: "Participant count",
        value: episode.uniqueWallets,
        unit: "wallets",
      });
      bullets.push({
        text: "Watch for potential reversal",
        metric: "Net flow",
        value: Math.round(Math.abs(episode.netFlow)),
        unit: "USD",
        comparison: episode.netFlow > 0 ? "still buying" : "still selling",
      });
      break;
  }

  // Ensure exactly 3 bullets
  while (bullets.length < 3) {
    bullets.push({
      text: "Flow episode analyzed",
      metric: "Duration",
      value: Math.round(episode.durationMinutes),
      unit: "minutes",
    });
  }

  return bullets.slice(0, 3) as [WhyBullet, WhyBullet, WhyBullet];
}

/**
 * Get flow summary for a market
 */
export function summarizeMarketFlow(
  marketId: string,
  trades: TradeEvent[],
  thresholds: FlowThresholds = DEFAULT_FLOW_THRESHOLDS
): MarketFlowSummary {
  const episodes = buildFlowEpisodes(marketId, trades, thresholds);
  const labeledEpisodes = episodes.map(ep => classifyFlowEpisode(ep, thresholds));

  // Find dominant flow type
  const labelCounts = new Map<FlowLabel, number>();
  for (const ep of labeledEpisodes) {
    labelCounts.set(ep.label, (labelCounts.get(ep.label) || 0) + 1);
  }

  let dominantFlowType: FlowLabel | null = null;
  let maxCount = 0;
  for (const [label, count] of labelCounts) {
    if (count > maxCount) {
      maxCount = count;
      dominantFlowType = label;
    }
  }

  // Calculate net flow direction
  const totalNetFlow = episodes.reduce((sum, ep) => sum + ep.netFlow, 0);
  const netFlowDirection = totalNetFlow > 1000 ? "buying" : totalNetFlow < -1000 ? "selling" : "neutral";

  // Calculate flow intensity (normalized volume)
  const recentVolume = episodes.slice(-5).reduce((sum, ep) => sum + ep.totalVolume, 0);
  const flowIntensity = Math.min(100, Math.round(recentVolume / 1000)); // Normalize to 0-100

  return {
    marketId,
    recentEpisodes: labeledEpisodes.slice(-10), // Keep last 10
    dominantFlowType,
    netFlowDirection,
    flowIntensity,
    computedAt: new Date(),
  };
}

// Helper functions
function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = average(values);
  const squaredDiffs = values.map(v => (v - avg) ** 2);
  return Math.sqrt(average(squaredDiffs));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
