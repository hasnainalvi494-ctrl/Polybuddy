import {
  MarketStateLabel,
  MarketStateResult,
  MarketFeaturesInput,
  WhyBullet,
  MarketStateThresholds,
  DEFAULT_THRESHOLDS,
  STATE_DISPLAY_LABELS,
} from "./types.js";

/**
 * Market State Classifier
 *
 * Rule-based classification of market regime into retail-friendly labels.
 * Each classification includes exactly 3 "why" bullets with numeric evidence.
 */

interface ClassificationContext {
  features: MarketFeaturesInput;
  thresholds: MarketStateThresholds;
  historicalAvg?: {
    spread: number;
    depth: number;
    vol: number;
  };
}

interface ClassificationScore {
  label: MarketStateLabel;
  score: number; // 0-100
  reasons: WhyBullet[];
}

/**
 * Classify a single market's state based on current features
 */
export function classifyMarketState(
  features: MarketFeaturesInput,
  thresholds: MarketStateThresholds = DEFAULT_THRESHOLDS,
  historicalAvg?: { spread: number; depth: number; vol: number }
): MarketStateResult {
  const context: ClassificationContext = { features, thresholds, historicalAvg };

  // Score each possible state
  const scores: ClassificationScore[] = [
    scoreCalmLiquid(context),
    scoreThinSlippage(context),
    scoreJumpy(context),
    scoreEventDriven(context),
  ];

  // Select highest scoring state
  scores.sort((a, b) => b.score - a.score);
  const winner = scores[0]!; // Always have at least one score

  // Ensure we have exactly 3 why bullets
  const whyBullets = padOrTrimWhyBullets(winner.reasons);

  // Calculate confidence based on score margin
  const secondScore = scores[1]?.score ?? 0;
  const margin = winner.score - secondScore;
  const confidence = Math.min(100, Math.round(50 + margin * 2));

  return {
    marketId: features.marketId,
    stateLabel: winner.label,
    displayLabel: STATE_DISPLAY_LABELS[winner.label],
    confidence,
    whyBullets,
    features: {
      spreadPct: features.spread ? features.spread * 100 : null,
      depthUsd: features.depth,
      stalenessMinutes: features.staleness ? Math.round(features.staleness / 60) : null,
      volatility: features.volProxy,
    },
    computedAt: new Date(),
  };
}

/**
 * Score for "Calm & Liquid" state
 */
function scoreCalmLiquid(ctx: ClassificationContext): ClassificationScore {
  const { features, thresholds, historicalAvg } = ctx;
  let score = 50; // Base score
  const reasons: WhyBullet[] = [];

  // Low spread = calm
  if (features.spread !== null && features.spread < thresholds.spreadThin) {
    const spreadPct = features.spread * 100;
    score += 20;
    reasons.push({
      text: "Tight spread indicates stable pricing",
      metric: "Spread",
      value: Number(spreadPct.toFixed(2)),
      unit: "%",
      comparison: historicalAvg ? `vs ${(historicalAvg.spread * 100).toFixed(2)}% avg` : undefined,
    });
  }

  // High depth = liquid
  if (features.depth !== null && features.depth > thresholds.depthMedium) {
    score += 20;
    reasons.push({
      text: "Deep order book supports larger trades",
      metric: "Depth",
      value: Math.round(features.depth),
      unit: "USD",
      comparison: historicalAvg ? `vs $${Math.round(historicalAvg.depth)} avg` : undefined,
    });
  }

  // Low staleness = active
  if (features.staleness !== null && features.staleness < thresholds.stalenessMedium) {
    score += 10;
    reasons.push({
      text: "Recent trades show active market",
      metric: "Last trade",
      value: Math.round(features.staleness / 60),
      unit: "min ago",
    });
  }

  // Low volatility = calm
  if (features.volProxy !== null && features.volProxy < thresholds.volHigh) {
    score += 10;
    reasons.push({
      text: "Low price volatility reduces execution risk",
      metric: "Volatility",
      value: Number((features.volProxy * 100).toFixed(1)),
      unit: "%",
    });
  }

  return { label: "calm_liquid", score, reasons };
}

/**
 * Score for "Thin — Slippage Risk" state
 */
function scoreThinSlippage(ctx: ClassificationContext): ClassificationScore {
  const { features, thresholds, historicalAvg } = ctx;
  let score = 30;
  const reasons: WhyBullet[] = [];

  // Low depth = thin
  if (features.depth !== null && features.depth < thresholds.depthLow) {
    score += 30;
    reasons.push({
      text: "Shallow order book may cause slippage",
      metric: "Depth",
      value: Math.round(features.depth),
      unit: "USD",
      comparison: historicalAvg ? `vs $${Math.round(historicalAvg.depth)} avg` : undefined,
    });
  } else if (features.depth !== null && features.depth < thresholds.depthMedium) {
    score += 15;
    reasons.push({
      text: "Below-average liquidity available",
      metric: "Depth",
      value: Math.round(features.depth),
      unit: "USD",
    });
  }

  // Wide spread = thin
  if (features.spread !== null && features.spread > thresholds.spreadThin) {
    const spreadPct = features.spread * 100;
    score += 20;
    reasons.push({
      text: "Wide spread increases trading cost",
      metric: "Spread",
      value: Number(spreadPct.toFixed(2)),
      unit: "%",
    });
  }

  // Low trade count = inactive
  if (features.tradeCount !== null && features.tradeCount < 5) {
    score += 10;
    reasons.push({
      text: "Low trading activity in recent window",
      metric: "Trades",
      value: features.tradeCount,
      unit: "in window",
    });
  }

  // Stale = thin market activity
  if (features.staleness !== null && features.staleness > thresholds.stalenessMedium) {
    score += 10;
    reasons.push({
      text: "No recent trades - market may be stale",
      metric: "Last trade",
      value: Math.round(features.staleness / 60),
      unit: "min ago",
    });
  }

  return { label: "thin_slippage", score, reasons };
}

/**
 * Score for "Jumpier Than Usual" state
 */
function scoreJumpy(ctx: ClassificationContext): ClassificationScore {
  const { features, thresholds, historicalAvg } = ctx;
  let score = 30;
  const reasons: WhyBullet[] = [];

  // High volatility = jumpy
  if (features.volProxy !== null && features.volProxy > thresholds.volHigh) {
    const volMultiple = historicalAvg?.vol
      ? features.volProxy / historicalAvg.vol
      : features.volProxy;
    score += 30;
    reasons.push({
      text: "Price volatility is elevated",
      metric: "Volatility",
      value: Number((features.volProxy * 100).toFixed(1)),
      unit: "%",
      comparison: historicalAvg ? `${volMultiple.toFixed(1)}x normal` : undefined,
    });
  }

  // Wide spread = uncertainty
  if (features.spread !== null && features.spread > thresholds.spreadThin) {
    score += 15;
    reasons.push({
      text: "Spread widened from normal levels",
      metric: "Spread",
      value: Number((features.spread * 100).toFixed(2)),
      unit: "%",
    });
  }

  // High impact estimate = jumpy
  if (features.impactProxy !== null && features.impactProxy > 0.02) {
    score += 15;
    reasons.push({
      text: "Expected price impact is higher than usual",
      metric: "Impact",
      value: Number((features.impactProxy * 100).toFixed(2)),
      unit: "% per $1K",
    });
  }

  // Volume spike can indicate jumpiness
  if (features.volumeUsd !== null && historicalAvg && features.volumeUsd > historicalAvg.depth * 2) {
    score += 10;
    reasons.push({
      text: "Elevated trading volume",
      metric: "Volume",
      value: Math.round(features.volumeUsd),
      unit: "USD",
    });
  }

  return { label: "jumpy", score, reasons };
}

/**
 * Score for "Event-driven — Expect Gaps" state
 */
function scoreEventDriven(ctx: ClassificationContext): ClassificationScore {
  const { features, thresholds } = ctx;
  let score = 20; // Lower base - need clear signals
  const reasons: WhyBullet[] = [];

  // Extreme volatility = event-driven
  if (features.volProxy !== null && features.volProxy > thresholds.volExtreme) {
    score += 35;
    reasons.push({
      text: "Extreme price movement suggests news/event",
      metric: "Volatility",
      value: Number((features.volProxy * 100).toFixed(1)),
      unit: "%",
      comparison: `${(features.volProxy / thresholds.volHigh).toFixed(1)}x elevated`,
    });
  }

  // Very wide spread = uncertainty
  if (features.spread !== null && features.spread > thresholds.spreadJumpy) {
    score += 25;
    reasons.push({
      text: "Very wide spread indicates uncertainty",
      metric: "Spread",
      value: Number((features.spread * 100).toFixed(2)),
      unit: "%",
    });
  }

  // High volume = event activity
  if (features.volumeUsd !== null && features.volumeUsd > 50000) {
    score += 15;
    reasons.push({
      text: "Surge in trading activity",
      metric: "Volume",
      value: Math.round(features.volumeUsd),
      unit: "USD",
    });
  }

  // High trade count = event activity
  if (features.tradeCount !== null && features.tradeCount > 20) {
    score += 10;
    reasons.push({
      text: "Unusually high number of trades",
      metric: "Trades",
      value: features.tradeCount,
      unit: "in window",
    });
  }

  return { label: "event_driven", score, reasons };
}

/**
 * Ensure exactly 3 why bullets - pad with generic ones if needed
 */
function padOrTrimWhyBullets(reasons: WhyBullet[]): [WhyBullet, WhyBullet, WhyBullet] {
  const result = reasons.slice(0, 3);

  // Pad with generic bullets if needed
  while (result.length < 3) {
    result.push({
      text: "Market conditions within normal parameters",
      metric: "Status",
      value: 1,
      unit: "normal",
    });
  }

  return result as [WhyBullet, WhyBullet, WhyBullet];
}

/**
 * Check if state has changed significantly (for event generation)
 */
export function hasStateChanged(
  previousState: MarketStateLabel | null,
  newState: MarketStateLabel,
  previousConfidence: number,
  newConfidence: number
): boolean {
  if (previousState === null) return false;
  if (previousState !== newState) return true;
  // Also trigger if confidence changed significantly
  return Math.abs(newConfidence - previousConfidence) > 20;
}
