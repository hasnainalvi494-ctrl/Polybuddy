import { describe, it, expect } from "vitest";
import { analyzePortfolioExposure, isExposureDangerous } from "./analyzer.js";
import { PositionInput } from "./types.js";

describe("analyzePortfolioExposure", () => {
  it("clusters positions by theme keywords", () => {
    const positions: PositionInput[] = [
      {
        marketId: "550e8400-e29b-41d4-a716-446655440001",
        question: "Will Trump win the 2024 election?",
        category: "Politics",
        exposure: 5000,
        outcome: "yes",
      },
      {
        marketId: "550e8400-e29b-41d4-a716-446655440002",
        question: "Will Biden drop out before election?",
        category: "Politics",
        exposure: 3000,
        outcome: "yes",
      },
      {
        marketId: "550e8400-e29b-41d4-a716-446655440003",
        question: "Will Bitcoin hit $100K?",
        category: "Crypto",
        exposure: 2000,
        outcome: "yes",
      },
    ];

    const result = analyzePortfolioExposure("wallet-1", positions);

    expect(result.walletId).toBe("wallet-1");
    expect(result.totalExposure).toBe(10000);
    expect(result.clusters.length).toBeGreaterThan(0);

    // Should have US Politics cluster
    const politicsCluster = result.clusters.find(c =>
      c.label.toLowerCase().includes("politics") || c.label.includes("2024")
    );
    expect(politicsCluster).toBeDefined();
    expect(politicsCluster?.marketCount).toBe(2);
    expect(politicsCluster?.exposurePct).toBeCloseTo(80, 0);
  });

  it("calculates concentration risk correctly", () => {
    const positions: PositionInput[] = [
      {
        marketId: "550e8400-e29b-41d4-a716-446655440001",
        question: "Will Trump win?",
        category: "Politics",
        exposure: 9000,
        outcome: "yes",
      },
      {
        marketId: "550e8400-e29b-41d4-a716-446655440002",
        question: "Will Biden win?",
        category: "Politics",
        exposure: 1000,
        outcome: "yes",
      },
    ];

    const result = analyzePortfolioExposure("wallet-1", positions);

    // 90% concentration = high risk
    expect(result.topClusterExposure).toBeCloseTo(100, 0); // All in one cluster
    expect(result.concentrationRisk).toBeGreaterThan(50);
    expect(result.diversificationScore).toBeLessThan(50);
  });

  it("returns empty result for empty portfolio", () => {
    const result = analyzePortfolioExposure("wallet-1", []);

    expect(result.totalExposure).toBe(0);
    expect(result.clusters).toHaveLength(0);
    expect(result.concentrationRisk).toBe(0);
    expect(result.diversificationScore).toBe(100);
    expect(result.topClusterExposure).toBe(0);
  });

  it("includes why bullets in cluster results", () => {
    const positions: PositionInput[] = [
      {
        marketId: "550e8400-e29b-41d4-a716-446655440001",
        question: "Will Bitcoin hit $100K?",
        category: "Crypto",
        exposure: 5000,
        outcome: "yes",
      },
      {
        marketId: "550e8400-e29b-41d4-a716-446655440002",
        question: "Will Ethereum reach $5K?",
        category: "Crypto",
        exposure: 3000,
        outcome: "yes",
      },
    ];

    const result = analyzePortfolioExposure("wallet-1", positions);
    const cryptoCluster = result.clusters.find(c =>
      c.label.toLowerCase().includes("crypto")
    );

    expect(cryptoCluster).toBeDefined();
    expect(cryptoCluster!.whyBullets).toHaveLength(3);
    expect(cryptoCluster!.whyBullets[0]!.metric).toBeDefined();
    expect(cryptoCluster!.whyBullets[0]!.value).toBeDefined();
  });

  it("assigns uncategorized markets to Other", () => {
    const positions: PositionInput[] = [
      {
        marketId: "550e8400-e29b-41d4-a716-446655440001",
        question: "Will aliens be discovered?",
        category: null,
        exposure: 1000,
        outcome: "yes",
      },
      {
        marketId: "550e8400-e29b-41d4-a716-446655440002",
        question: "Will time travel be invented?",
        category: null,
        exposure: 1000,
        outcome: "yes",
      },
    ];

    const result = analyzePortfolioExposure("wallet-1", positions);

    const otherCluster = result.clusters.find(c =>
      c.label === "Other Markets"
    );
    expect(otherCluster).toBeDefined();
    expect(otherCluster!.marketCount).toBe(2);
  });

  it("limits cluster count to max threshold", () => {
    // Create positions in many different categories
    const categories = ["Crypto", "Politics", "Sports", "Tech", "Economics"];
    const positions: PositionInput[] = categories.flatMap((cat, i) => [
      {
        marketId: `550e8400-e29b-41d4-a716-44665544000${i}`,
        question: `Question about ${cat}?`,
        category: cat,
        exposure: 1000,
        outcome: "yes" as const,
      },
      {
        marketId: `550e8400-e29b-41d4-a716-44665544001${i}`,
        question: `Another question about ${cat}?`,
        category: cat,
        exposure: 1000,
        outcome: "yes" as const,
      },
    ]);

    const result = analyzePortfolioExposure("wallet-1", positions);

    expect(result.clusters.length).toBeLessThanOrEqual(10);
  });
});

describe("isExposureDangerous", () => {
  it("returns dangerous for very high concentration", () => {
    const exposure = {
      walletId: "wallet-1",
      totalExposure: 10000,
      clusters: [{
        clusterId: "politics",
        label: "US Politics 2024",
        exposurePct: 70,
        exposureUsd: 7000,
        marketCount: 3,
        confidence: 80,
        whyBullets: [] as any,
        markets: [],
      }],
      concentrationRisk: 70,
      diversificationScore: 30,
      topClusterExposure: 70,
      computedAt: new Date(),
    };

    const result = isExposureDangerous(exposure);

    expect(result.isDangerous).toBe(true);
    expect(result.warning).toContain("70%");
    expect(result.warning).toContain("US Politics 2024");
  });

  it("returns warning for moderate concentration", () => {
    const exposure = {
      walletId: "wallet-1",
      totalExposure: 10000,
      clusters: [{
        clusterId: "crypto",
        label: "Crypto Markets",
        exposurePct: 45,
        exposureUsd: 4500,
        marketCount: 2,
        confidence: 80,
        whyBullets: [] as any,
        markets: [],
      }],
      concentrationRisk: 45,
      diversificationScore: 55,
      topClusterExposure: 45,
      computedAt: new Date(),
    };

    const result = isExposureDangerous(exposure);

    expect(result.isDangerous).toBe(false);
    expect(result.warning).toContain("45%");
    expect(result.warning).toContain("diversifying");
  });

  it("returns no warning for diversified portfolio", () => {
    const exposure = {
      walletId: "wallet-1",
      totalExposure: 10000,
      clusters: [
        { clusterId: "a", label: "A", exposurePct: 25, exposureUsd: 2500, marketCount: 2, confidence: 80, whyBullets: [] as any, markets: [] },
        { clusterId: "b", label: "B", exposurePct: 25, exposureUsd: 2500, marketCount: 2, confidence: 80, whyBullets: [] as any, markets: [] },
      ],
      concentrationRisk: 25,
      diversificationScore: 75,
      topClusterExposure: 25,
      computedAt: new Date(),
    };

    const result = isExposureDangerous(exposure);

    expect(result.isDangerous).toBe(false);
    expect(result.warning).toBeNull();
  });
});
