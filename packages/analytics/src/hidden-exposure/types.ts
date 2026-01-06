import { z } from "zod";
import { WhyBulletSchema } from "../market-state/types.js";

// Position input for clustering
export const PositionInputSchema = z.object({
  marketId: z.string().uuid(),
  question: z.string(),
  category: z.string().nullable(),
  exposure: z.number(), // USD value at risk
  outcome: z.string(),
  tags: z.array(z.string()).optional(), // Additional tags for clustering
});
export type PositionInput = z.infer<typeof PositionInputSchema>;

// Cluster result
export const ExposureClusterResultSchema = z.object({
  clusterId: z.string(),
  label: z.string(), // Human-readable cluster name
  exposurePct: z.number(), // % of total exposure
  exposureUsd: z.number(),
  marketCount: z.number(),
  confidence: z.number().min(0).max(100),
  whyBullets: z.array(WhyBulletSchema).length(3),
  markets: z.array(z.object({
    marketId: z.string().uuid(),
    question: z.string(),
    exposure: z.number(),
    weight: z.number(), // % within cluster
  })),
});
export type ExposureClusterResult = z.infer<typeof ExposureClusterResultSchema>;

// Full portfolio exposure analysis
export const PortfolioExposureResultSchema = z.object({
  walletId: z.string().uuid(),
  totalExposure: z.number(),
  clusters: z.array(ExposureClusterResultSchema),
  concentrationRisk: z.number().min(0).max(100), // HHI-based
  diversificationScore: z.number().min(0).max(100),
  topClusterExposure: z.number(), // % in largest cluster
  computedAt: z.date(),
});
export type PortfolioExposureResult = z.infer<typeof PortfolioExposureResultSchema>;

// Category-based clustering keywords
export const CATEGORY_CLUSTERS: Record<string, string[]> = {
  "US Politics 2024": ["trump", "biden", "election", "president", "congress", "senate", "republican", "democrat", "gop", "dnc"],
  "Crypto Markets": ["bitcoin", "btc", "ethereum", "eth", "crypto", "solana", "defi", "blockchain"],
  "Sports Outcomes": ["nfl", "nba", "mlb", "super bowl", "championship", "playoffs", "world series", "ufc"],
  "Tech Industry": ["apple", "google", "microsoft", "tesla", "ai", "openai", "nvidia", "meta"],
  "Economics & Fed": ["fed", "interest rate", "inflation", "gdp", "recession", "unemployment", "cpi"],
  "Entertainment": ["oscar", "grammy", "emmy", "movie", "netflix", "award", "celebrity"],
  "International Politics": ["ukraine", "russia", "china", "nato", "eu", "uk", "brexit"],
  "Climate & Weather": ["climate", "hurricane", "temperature", "weather", "el nino"],
};

// Thresholds for exposure warnings
export interface ExposureThresholds {
  concentrationWarning: number;    // Single cluster > this % triggers warning
  concentrationDanger: number;     // Single cluster > this % is dangerous
  minMarketsForCluster: number;    // Minimum markets to form a cluster
  maxClusterCount: number;         // Maximum clusters to report
}

export const DEFAULT_EXPOSURE_THRESHOLDS: ExposureThresholds = {
  concentrationWarning: 40,  // 40%
  concentrationDanger: 60,   // 60%
  minMarketsForCluster: 2,
  maxClusterCount: 10,
};
