/**
 * Participation Structure Types
 *
 * Types for analyzing market participation patterns without making predictions.
 * Describes historical behavior patterns, NOT outcomes.
 */

export type SetupQualityBand =
  | "historically_favorable"    // 80-100
  | "mixed_workable"           // 60-79
  | "neutral"                  // 40-59
  | "historically_unforgiving"; // <40

export type ParticipantQualityBand =
  | "strong"    // Many experienced participants
  | "moderate"  // Some experienced participants
  | "limited";  // Few experienced participants

export type ParticipationSummary =
  | "few_dominant"        // Few large participants dominate
  | "mixed_participation" // Mix of large, mid, and small
  | "broad_retail";       // Broad retail participation

export interface ParticipationBreakdown {
  largePct: number;  // Percentage from large participants
  midPct: number;    // Percentage from mid-sized participants
  smallPct: number;  // Percentage from small participants
}

export interface MarketParticipationInput {
  marketId: string;
  side: "YES" | "NO";

  // Snapshot data
  liquidity: number | null;
  volume24h: number | null;
  spread: number | null;
  depth: number | null;

  // Trade data (if available)
  uniqueTraders?: number;
  avgTradeSize?: number;
  largeTradeCount?: number;
  totalTradeCount?: number;

  // Flow concentration metrics
  largeTraderVolumePct?: number;  // Volume from wallets with >$10k trades
  midTraderVolumePct?: number;    // Volume from wallets with $1k-$10k trades
  smallTraderVolumePct?: number;  // Volume from wallets with <$1k trades

  // Historical behavior metrics
  priceStability?: number;        // 0-100, how stable prices have been
  liquidityStability?: number;    // 0-100, how stable liquidity has been
  volumeConsistency?: number;     // 0-100, how consistent volume has been
}

export interface ParticipationStructureResult {
  marketId: string;
  side: "YES" | "NO";

  // Setup Quality
  setupQualityScore: number;           // 0-100
  setupQualityBand: SetupQualityBand;

  // Participant Quality
  participantQualityScore: number;       // 0-100
  participantQualityBand: ParticipantQualityBand;

  // Participation Summary
  participationSummary: ParticipationSummary;
  breakdown: ParticipationBreakdown;

  // Behavior Insight (no predictions)
  behaviorInsight: string;

  computedAt: Date;
}

// Display info for UI
export interface SetupQualityDisplayInfo {
  band: SetupQualityBand;
  label: string;
  description: string;
  color: string;
}

export interface ParticipantQualityDisplayInfo {
  band: ParticipantQualityBand;
  label: string;
  description: string;
  color: string;
}
