import type { ClusteringDimensions, ClusterLabel } from "../types.js";

// Cluster centroids (pre-defined based on expected market behaviors)
// In production, these would be learned from data
const CLUSTER_CENTROIDS: Record<ClusterLabel, ClusteringDimensions> = {
  stable_liquid: {
    volatility: 0.2,
    momentum: 0.5,
    liquidityProfile: 0.9,
    timeHorizon: 0.5,
    eventSensitivity: 0.3,
  },
  volatile_speculative: {
    volatility: 0.9,
    momentum: 0.6,
    liquidityProfile: 0.4,
    timeHorizon: 0.3,
    eventSensitivity: 0.8,
  },
  trending_momentum: {
    volatility: 0.5,
    momentum: 0.9,
    liquidityProfile: 0.6,
    timeHorizon: 0.4,
    eventSensitivity: 0.5,
  },
  illiquid_niche: {
    volatility: 0.4,
    momentum: 0.3,
    liquidityProfile: 0.1,
    timeHorizon: 0.6,
    eventSensitivity: 0.4,
  },
  event_binary: {
    volatility: 0.7,
    momentum: 0.4,
    liquidityProfile: 0.5,
    timeHorizon: 0.2,
    eventSensitivity: 0.95,
  },
  long_horizon: {
    volatility: 0.3,
    momentum: 0.4,
    liquidityProfile: 0.5,
    timeHorizon: 0.95,
    eventSensitivity: 0.3,
  },
};

function euclideanDistance(a: ClusteringDimensions, b: ClusteringDimensions): number {
  return Math.sqrt(
    Math.pow(a.volatility - b.volatility, 2) +
      Math.pow(a.momentum - b.momentum, 2) +
      Math.pow(a.liquidityProfile - b.liquidityProfile, 2) +
      Math.pow(a.timeHorizon - b.timeHorizon, 2) +
      Math.pow(a.eventSensitivity - b.eventSensitivity, 2)
  );
}

export interface ClusteringResult {
  label: ClusterLabel;
  confidence: number;
  distances: Record<ClusterLabel, number>;
}

export function classifyMarket(dimensions: ClusteringDimensions): ClusteringResult {
  const distances = Object.entries(CLUSTER_CENTROIDS).map(([label, centroid]) => ({
    label: label as ClusterLabel,
    distance: euclideanDistance(dimensions, centroid),
  }));

  distances.sort((a, b) => a.distance - b.distance);

  const closest = distances[0]!;
  const secondClosest = distances[1]!;

  // Confidence based on relative distance to nearest vs second nearest
  const confidence = 1 - closest.distance / (closest.distance + secondClosest.distance);

  return {
    label: closest.label,
    confidence: Math.round(confidence * 100) / 100,
    distances: Object.fromEntries(
      distances.map((d) => [d.label, Math.round(d.distance * 1000) / 1000])
    ) as Record<ClusterLabel, number>,
  };
}

export function getClusterDescription(label: ClusterLabel): string {
  const descriptions: Record<ClusterLabel, string> = {
    stable_liquid: "High liquidity market with stable price action. Good for larger positions.",
    volatile_speculative: "High volatility, event-driven market. Expect rapid price swings.",
    trending_momentum: "Market showing strong directional movement. May continue trending.",
    illiquid_niche: "Low liquidity specialized market. Expect wider spreads and slippage.",
    event_binary: "Binary outcome tied to specific event. Price will resolve sharply.",
    long_horizon: "Long resolution timeframe. Gradual price discovery expected.",
  };
  return descriptions[label];
}
