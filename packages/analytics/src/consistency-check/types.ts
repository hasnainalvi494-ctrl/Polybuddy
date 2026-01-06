import { z } from "zod";
import { WhyBulletSchema } from "../market-state/types.js";

// Relation types between markets
export const RelationTypeSchema = z.enum([
  "calendar_variant",   // Same question, different dates
  "multi_outcome",      // Part of same event (e.g., "Will X win?" vs "Will Y win?")
  "inverse",            // Logically opposite
  "correlated",         // Historically move together
]);
export type RelationType = z.infer<typeof RelationTypeSchema>;

// Consistency labels
export const ConsistencyLabelSchema = z.enum([
  "looks_consistent",
  "potential_inconsistency_low",
  "potential_inconsistency_medium",
  "potential_inconsistency_high",
]);
export type ConsistencyLabel = z.infer<typeof ConsistencyLabelSchema>;

// Human-readable labels
export const CONSISTENCY_DISPLAY_LABELS: Record<ConsistencyLabel, string> = {
  looks_consistent: "Looks Consistent",
  potential_inconsistency_low: "Potential Inconsistency (Low)",
  potential_inconsistency_medium: "Potential Inconsistency (Medium)",
  potential_inconsistency_high: "Potential Inconsistency (High)",
};

// Market pair for relation detection
export const MarketPairInputSchema = z.object({
  aMarketId: z.string().uuid(),
  aQuestion: z.string(),
  aPrice: z.number(), // YES price 0-1
  aEndDate: z.date().nullable(),
  aCategory: z.string().nullable(),

  bMarketId: z.string().uuid(),
  bQuestion: z.string(),
  bPrice: z.number(),
  bEndDate: z.date().nullable(),
  bCategory: z.string().nullable(),
});
export type MarketPairInput = z.infer<typeof MarketPairInputSchema>;

// Relation result
export const MarketRelationResultSchema = z.object({
  aMarketId: z.string().uuid(),
  bMarketId: z.string().uuid(),
  relationType: RelationTypeSchema,
  similarity: z.number().min(0).max(1), // How similar the questions are
  relationMeta: z.record(z.unknown()).optional(),
});
export type MarketRelationResult = z.infer<typeof MarketRelationResultSchema>;

// Consistency check result
export const ConsistencyCheckResultSchema = z.object({
  relationId: z.string().optional(),
  aMarketId: z.string().uuid(),
  bMarketId: z.string().uuid(),
  aQuestion: z.string(),
  bQuestion: z.string(),
  relationType: RelationTypeSchema,
  label: ConsistencyLabelSchema,
  displayLabel: z.string(),
  score: z.number().min(0).max(100), // Higher = more consistent
  confidence: z.number().min(0).max(100),
  whyBullets: z.array(WhyBulletSchema).length(3),
  priceA: z.number(),
  priceB: z.number(),
  computedAt: z.date(),
});
export type ConsistencyCheckResult = z.infer<typeof ConsistencyCheckResultSchema>;

// Thresholds for consistency detection
export interface ConsistencyThresholds {
  // Question similarity (Jaccard or similar)
  similarityThreshold: number;  // Above this = potential relation

  // Date proximity for calendar variants
  dateProximityDays: number;    // Within this many days = calendar variant

  // Price divergence thresholds
  invertedDivergence: number;   // Prices that should sum to 1 but don't
  calendarSpread: number;       // Unusual spread between date variants
}

export const DEFAULT_CONSISTENCY_THRESHOLDS: ConsistencyThresholds = {
  similarityThreshold: 0.6,     // 60% similar words
  dateProximityDays: 90,        // 90 days
  invertedDivergence: 0.1,      // 10% off from expected
  calendarSpread: 0.15,         // 15% spread between dates
};
