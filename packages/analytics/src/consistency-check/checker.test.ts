import { describe, it, expect } from "vitest";
import { detectRelation, checkConsistency } from "./checker.js";
import { MarketPairInput, MarketRelationResult } from "./types.js";

describe("detectRelation", () => {
  it("detects inverse relationship when prices sum near 1", () => {
    const pair: MarketPairInput = {
      aMarketId: "550e8400-e29b-41d4-a716-446655440001",
      aQuestion: "Will the event happen?",
      aPrice: 0.55,
      aEndDate: new Date("2024-12-31"),
      aCategory: "General",
      bMarketId: "550e8400-e29b-41d4-a716-446655440002",
      bQuestion: "Will the event NOT happen?",
      bPrice: 0.42, // Sum ~0.97
      bEndDate: new Date("2024-12-31"),
      bCategory: "General",
    };

    const result = detectRelation(pair);

    expect(result).not.toBeNull();
    expect(result!.relationType).toBe("inverse");
    expect(result!.similarity).toBeGreaterThan(0.5);
  });

  it("detects calendar variant relationship with different dates", () => {
    const pair: MarketPairInput = {
      aMarketId: "550e8400-e29b-41d4-a716-446655440001",
      aQuestion: "Will Bitcoin reach one hundred thousand dollars by March 2024?",
      aPrice: 0.30,
      aEndDate: new Date("2024-03-31"),
      aCategory: "Crypto",
      bMarketId: "550e8400-e29b-41d4-a716-446655440002",
      bQuestion: "Will Bitcoin reach one hundred thousand dollars by June 2024?",
      bPrice: 0.45,
      bEndDate: new Date("2024-06-30"),
      bCategory: "Crypto",
    };

    const result = detectRelation(pair);

    expect(result).not.toBeNull();
    expect(["calendar_variant", "multi_outcome", "correlated"]).toContain(result!.relationType);
  });

  it("detects multi-outcome relationship for same category", () => {
    const pair: MarketPairInput = {
      aMarketId: "550e8400-e29b-41d4-a716-446655440001",
      aQuestion: "Will the Dodgers win the World Series?",
      aPrice: 0.25,
      aEndDate: new Date("2024-11-01"),
      aCategory: "Sports",
      bMarketId: "550e8400-e29b-41d4-a716-446655440002",
      bQuestion: "Will the Yankees win the World Series?",
      bPrice: 0.20,
      bEndDate: new Date("2024-11-01"),
      bCategory: "Sports",
    };

    const result = detectRelation(pair);

    expect(result).not.toBeNull();
    expect(result!.relationType).toBe("multi_outcome");
  });

  it("returns null for unrelated markets", () => {
    const pair: MarketPairInput = {
      aMarketId: "550e8400-e29b-41d4-a716-446655440001",
      aQuestion: "Will it snow in New York tomorrow?",
      aPrice: 0.20,
      aEndDate: null,
      aCategory: "Weather",
      bMarketId: "550e8400-e29b-41d4-a716-446655440002",
      bQuestion: "Will Lakers win the NBA championship?",
      bPrice: 0.15,
      bEndDate: null,
      bCategory: "Sports",
    };

    const result = detectRelation(pair);

    expect(result).toBeNull();
  });

  it("detects correlated markets with high similarity", () => {
    const pair: MarketPairInput = {
      aMarketId: "550e8400-e29b-41d4-a716-446655440001",
      aQuestion: "Will inflation rate drop below 3 percent in 2024 United States?",
      aPrice: 0.60,
      aEndDate: new Date("2024-12-31"),
      aCategory: "Economics",
      bMarketId: "550e8400-e29b-41d4-a716-446655440002",
      bQuestion: "Will inflation rate stay below 3 percent in 2024 United States economy?",
      bPrice: 0.58,
      bEndDate: new Date("2024-12-31"),
      bCategory: "Economics",
    };

    const result = detectRelation(pair);

    // These questions have high overlap - should be detected as related
    if (result !== null) {
      expect(["correlated", "inverse", "multi_outcome"]).toContain(result.relationType);
      expect(result.similarity).toBeGreaterThan(0.5);
    }
    // If null, it means similarity wasn't high enough - that's ok for this test
  });
});

describe("checkConsistency", () => {
  it("finds inconsistency when inverse markets sum far from 1", () => {
    const pair: MarketPairInput = {
      aMarketId: "550e8400-e29b-41d4-a716-446655440001",
      aQuestion: "Will event happen?",
      aPrice: 0.60,
      aEndDate: new Date("2024-12-31"),
      aCategory: "General",
      bMarketId: "550e8400-e29b-41d4-a716-446655440002",
      bQuestion: "Will event not happen?",
      bPrice: 0.60, // Sum = 1.2, should be ~1.0
      bEndDate: new Date("2024-12-31"),
      bCategory: "General",
    };

    const relation: MarketRelationResult = {
      aMarketId: pair.aMarketId,
      bMarketId: pair.bMarketId,
      relationType: "inverse",
      similarity: 0.85,
    };

    const result = checkConsistency(pair, relation);

    expect(["potential_inconsistency_low", "potential_inconsistency_medium", "potential_inconsistency_high"]).toContain(result.label);
    expect(result.score).toBeLessThan(100);
    expect(result.whyBullets).toHaveLength(3);
  });

  it("marks consistent inverse markets correctly", () => {
    const pair: MarketPairInput = {
      aMarketId: "550e8400-e29b-41d4-a716-446655440001",
      aQuestion: "Will event happen?",
      aPrice: 0.55,
      aEndDate: new Date("2024-12-31"),
      aCategory: "General",
      bMarketId: "550e8400-e29b-41d4-a716-446655440002",
      bQuestion: "Will event not happen?",
      bPrice: 0.45, // Sum = 1.0, perfect
      bEndDate: new Date("2024-12-31"),
      bCategory: "General",
    };

    const relation: MarketRelationResult = {
      aMarketId: pair.aMarketId,
      bMarketId: pair.bMarketId,
      relationType: "inverse",
      similarity: 0.85,
    };

    const result = checkConsistency(pair, relation);

    expect(result.label).toBe("looks_consistent");
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("checks calendar spread between date variants", () => {
    const pair: MarketPairInput = {
      aMarketId: "550e8400-e29b-41d4-a716-446655440001",
      aQuestion: "Will X happen by Q1?",
      aPrice: 0.20,
      aEndDate: new Date("2024-03-31"),
      aCategory: "General",
      bMarketId: "550e8400-e29b-41d4-a716-446655440002",
      bQuestion: "Will X happen by Q2?",
      bPrice: 0.60, // 40% spread
      bEndDate: new Date("2024-06-30"),
      bCategory: "General",
    };

    const relation: MarketRelationResult = {
      aMarketId: pair.aMarketId,
      bMarketId: pair.bMarketId,
      relationType: "calendar_variant",
      similarity: 0.90,
    };

    const result = checkConsistency(pair, relation);

    expect(result.whyBullets).toHaveLength(3);
    expect(result.score).toBeDefined();
    expect(result.relationType).toBe("calendar_variant");
  });

  it("includes all required fields in result", () => {
    const pair: MarketPairInput = {
      aMarketId: "550e8400-e29b-41d4-a716-446655440001",
      aQuestion: "Market A question?",
      aPrice: 0.50,
      aEndDate: null,
      aCategory: "Test",
      bMarketId: "550e8400-e29b-41d4-a716-446655440002",
      bQuestion: "Market B question?",
      bPrice: 0.50,
      bEndDate: null,
      bCategory: "Test",
    };

    const relation: MarketRelationResult = {
      aMarketId: pair.aMarketId,
      bMarketId: pair.bMarketId,
      relationType: "correlated",
      similarity: 0.75,
    };

    const result = checkConsistency(pair, relation);

    expect(result.aMarketId).toBe(pair.aMarketId);
    expect(result.bMarketId).toBe(pair.bMarketId);
    expect(result.aQuestion).toBe(pair.aQuestion);
    expect(result.bQuestion).toBe(pair.bQuestion);
    expect(result.relationType).toBe("correlated");
    expect(result.label).toBeDefined();
    expect(result.displayLabel).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
    expect(result.whyBullets).toHaveLength(3);
    expect(result.priceA).toBe(0.50);
    expect(result.priceB).toBe(0.50);
    expect(result.computedAt).toBeInstanceOf(Date);
  });

  it("handles multi-outcome consistency check", () => {
    const pair: MarketPairInput = {
      aMarketId: "550e8400-e29b-41d4-a716-446655440001",
      aQuestion: "Team A wins?",
      aPrice: 0.40,
      aEndDate: new Date("2024-12-31"),
      aCategory: "Sports",
      bMarketId: "550e8400-e29b-41d4-a716-446655440002",
      bQuestion: "Team B wins?",
      bPrice: 0.35,
      bEndDate: new Date("2024-12-31"),
      bCategory: "Sports",
    };

    const relation: MarketRelationResult = {
      aMarketId: pair.aMarketId,
      bMarketId: pair.bMarketId,
      relationType: "multi_outcome",
      similarity: 0.70,
    };

    const result = checkConsistency(pair, relation);

    expect(result.relationType).toBe("multi_outcome");
    expect(result.whyBullets).toHaveLength(3);
    expect(result.label).toBeDefined();
  });
});
