import {
  PositionInput,
  ExposureClusterResult,
  PortfolioExposureResult,
  ExposureThresholds,
  DEFAULT_EXPOSURE_THRESHOLDS,
  CATEGORY_CLUSTERS,
} from "./types.js";
import { WhyBullet } from "../market-state/types.js";

/**
 * Hidden Exposure Analyzer
 *
 * Clusters portfolio positions to reveal hidden concentration risk.
 * Uses category and keyword matching to group related markets.
 */

interface MarketClusterAssignment {
  marketId: string;
  question: string;
  category: string | null;
  exposure: number;
  clusterId: string;
  weight: number;
}

/**
 * Analyze portfolio exposure and identify hidden clusters
 */
export function analyzePortfolioExposure(
  walletId: string,
  positions: PositionInput[],
  thresholds: ExposureThresholds = DEFAULT_EXPOSURE_THRESHOLDS
): PortfolioExposureResult {
  const totalExposure = positions.reduce((sum, p) => sum + Math.abs(p.exposure), 0);

  if (totalExposure === 0 || positions.length === 0) {
    return {
      walletId,
      totalExposure: 0,
      clusters: [],
      concentrationRisk: 0,
      diversificationScore: 100,
      topClusterExposure: 0,
      computedAt: new Date(),
    };
  }

  // Assign each position to a cluster
  const assignments = positions.map((p) => assignToCluster(p, totalExposure));

  // Group by cluster
  const clusterGroups = new Map<string, MarketClusterAssignment[]>();
  for (const assignment of assignments) {
    const group = clusterGroups.get(assignment.clusterId) || [];
    group.push(assignment);
    clusterGroups.set(assignment.clusterId, group);
  }

  // Build cluster results
  const clusters: ExposureClusterResult[] = [];
  for (const [clusterId, members] of clusterGroups) {
    if (members.length < thresholds.minMarketsForCluster) continue;

    const clusterExposure = members.reduce((sum, m) => sum + Math.abs(m.exposure), 0);
    const exposurePct = (clusterExposure / totalExposure) * 100;

    const cluster = buildClusterResult(
      clusterId,
      members,
      clusterExposure,
      exposurePct,
      totalExposure
    );
    clusters.push(cluster);
  }

  // Sort by exposure and limit
  clusters.sort((a, b) => b.exposurePct - a.exposurePct);
  const topClusters = clusters.slice(0, thresholds.maxClusterCount);

  // Calculate portfolio-level metrics
  const topClusterExposure = topClusters[0]?.exposurePct ?? 0;
  const concentrationRisk = calculateHHI(topClusters.map((c) => c.exposurePct));
  const diversificationScore = Math.max(0, 100 - concentrationRisk);

  return {
    walletId,
    totalExposure,
    clusters: topClusters,
    concentrationRisk,
    diversificationScore,
    topClusterExposure,
    computedAt: new Date(),
  };
}

/**
 * Assign a position to a cluster based on keywords and category
 */
function assignToCluster(
  position: PositionInput,
  totalExposure: number
): MarketClusterAssignment {
  const question = position.question.toLowerCase();
  const category = position.category?.toLowerCase() || "";

  // Try to match to known clusters
  for (const [clusterName, keywords] of Object.entries(CATEGORY_CLUSTERS)) {
    for (const keyword of keywords) {
      if (question.includes(keyword) || category.includes(keyword)) {
        return {
          marketId: position.marketId,
          question: position.question,
          category: position.category,
          exposure: position.exposure,
          clusterId: clusterName,
          weight: totalExposure > 0 ? Math.abs(position.exposure) / totalExposure : 0,
        };
      }
    }
  }

  // Fall back to category if available
  if (position.category) {
    return {
      marketId: position.marketId,
      question: position.question,
      category: position.category,
      exposure: position.exposure,
      clusterId: position.category,
      weight: totalExposure > 0 ? Math.abs(position.exposure) / totalExposure : 0,
    };
  }

  // Uncategorized
  return {
    marketId: position.marketId,
    question: position.question,
    category: position.category,
    exposure: position.exposure,
    clusterId: "Other Markets",
    weight: totalExposure > 0 ? Math.abs(position.exposure) / totalExposure : 0,
  };
}

/**
 * Build a cluster result with why bullets
 */
function buildClusterResult(
  clusterId: string,
  members: MarketClusterAssignment[],
  clusterExposure: number,
  exposurePct: number,
  totalExposure: number
): ExposureClusterResult {
  // Sort members by exposure
  members.sort((a, b) => Math.abs(b.exposure) - Math.abs(a.exposure));
  const topMarket = members[0]!; // Always at least one member

  // Calculate confidence based on cluster coherence
  const confidence = Math.min(100, Math.round(60 + members.length * 5));

  // Build why bullets
  const topMarketShare = (Math.abs(topMarket.exposure) / clusterExposure) * 100;
  const whyBullets: [WhyBullet, WhyBullet, WhyBullet] = [
    {
      text: `${exposurePct.toFixed(0)}% of your exposure resolves on same theme`,
      metric: "Theme concentration",
      value: Number(exposurePct.toFixed(1)),
      unit: "%",
      comparison: `$${Math.round(clusterExposure).toLocaleString()} at risk`,
    },
    {
      text: `${members.length} markets in this cluster`,
      metric: "Market count",
      value: members.length,
      unit: "markets",
      comparison: `of ${Math.round(totalExposure / members.length).toLocaleString()} avg exposure each`,
    },
    {
      text: `Top market contributes ${topMarketShare.toFixed(0)}%`,
      metric: "Top market share",
      value: Number(topMarketShare.toFixed(1)),
      unit: "%",
      comparison: topMarket.question.substring(0, 50) + (topMarket.question.length > 50 ? "..." : ""),
    },
  ];

  return {
    clusterId,
    label: clusterId,
    exposurePct,
    exposureUsd: clusterExposure,
    marketCount: members.length,
    confidence,
    whyBullets,
    markets: members.map((m) => ({
      marketId: m.marketId,
      question: m.question,
      exposure: m.exposure,
      weight: (Math.abs(m.exposure) / clusterExposure) * 100,
    })),
  };
}

/**
 * Calculate Herfindahl-Hirschman Index for concentration
 * Returns 0-100 where higher = more concentrated
 */
function calculateHHI(exposurePcts: number[]): number {
  if (exposurePcts.length === 0) return 0;

  // HHI is sum of squared market shares
  // Max HHI = 10000 (one cluster has 100%)
  // Min HHI = 10000/n (equally distributed)
  const sumSquares = exposurePcts.reduce((sum, pct) => sum + (pct / 100) ** 2, 0);

  // Normalize to 0-100 scale
  // HHI of 0.25 (25%) is moderate, 0.5 (50%) is high
  return Math.min(100, Math.round(sumSquares * 100));
}

/**
 * Check if exposure is dangerously concentrated
 */
export function isExposureDangerous(
  exposure: PortfolioExposureResult,
  thresholds: ExposureThresholds = DEFAULT_EXPOSURE_THRESHOLDS
): { isDangerous: boolean; warning: string | null } {
  if (exposure.topClusterExposure > thresholds.concentrationDanger) {
    return {
      isDangerous: true,
      warning: `${exposure.topClusterExposure.toFixed(0)}% of your exposure is concentrated in "${exposure.clusters[0]?.label}"`,
    };
  }

  if (exposure.topClusterExposure > thresholds.concentrationWarning) {
    return {
      isDangerous: false,
      warning: `Consider diversifying - ${exposure.topClusterExposure.toFixed(0)}% is in "${exposure.clusters[0]?.label}"`,
    };
  }

  return { isDangerous: false, warning: null };
}
