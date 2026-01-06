import { describe, it, expect } from "vitest";
import { scoreTradeExecution } from "./scorer.js";
import { TradeInput, TradeContext } from "./types.js";

describe("scoreTradeExecution", () => {
  const goodContext: TradeContext = {
    spreadAtEntry: 0.01, // 1% - good
    depthAtEntry: 25000, // $25K - good
    priceChange15m: 0.001, // Stable
    priceChange5m: 0.0005,
    marketState: "calm_liquid",
    volumeRatio: 1.0,
    userMedianSpread: 0.02,
  };

  it("scores a trade under good conditions", () => {
    const trade: TradeInput = {
      walletId: "550e8400-e29b-41d4-a716-446655440001",
      marketId: "550e8400-e29b-41d4-a716-446655440000",
      tradeTs: new Date(),
      side: "buy",
      notional: 100,
    };

    const result = scoreTradeExecution(trade, goodContext);

    expect(result.label).toBe("good_process");
    expect(result.displayLabel).toBe("Good Execution Conditions");
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.whyBullets).toHaveLength(3);
  });

  it("penalizes wide spread at entry", () => {
    const trade: TradeInput = {
      walletId: "550e8400-e29b-41d4-a716-446655440001",
      marketId: "550e8400-e29b-41d4-a716-446655440000",
      tradeTs: new Date(),
      side: "buy",
      notional: 500,
    };

    const badSpreadContext: TradeContext = {
      ...goodContext,
      spreadAtEntry: 0.08, // 8% spread - bad
    };

    const result = scoreTradeExecution(trade, badSpreadContext);

    expect(result.score).toBeLessThan(80);
    expect(result.whyBullets.some(b => b.text.toLowerCase().includes("spread"))).toBe(true);
  });

  it("detects chasing behavior", () => {
    const trade: TradeInput = {
      walletId: "550e8400-e29b-41d4-a716-446655440001",
      marketId: "550e8400-e29b-41d4-a716-446655440000",
      tradeTs: new Date(),
      side: "buy",
      notional: 100,
    };

    const chasingContext: TradeContext = {
      ...goodContext,
      priceChange15m: 0.05, // 5% rise before buy = chasing
    };

    const result = scoreTradeExecution(trade, chasingContext);

    expect(result.label).toBe("poor_timing");
    expect(result.score).toBeLessThan(75);
  });

  it("handles poor conditions in thin market", () => {
    const trade: TradeInput = {
      walletId: "550e8400-e29b-41d4-a716-446655440001",
      marketId: "550e8400-e29b-41d4-a716-446655440000",
      tradeTs: new Date(),
      side: "buy",
      notional: 2000,
    };

    const thinContext: TradeContext = {
      spreadAtEntry: 0.06, // 6% - bad
      depthAtEntry: 3000, // $3K - very low
      priceChange15m: 0.001,
      priceChange5m: null,
      marketState: "thin_slippage",
      volumeRatio: null,
      userMedianSpread: null,
    };

    const result = scoreTradeExecution(trade, thinContext);

    expect(["acceptable_process", "risky_process"]).toContain(result.label);
    expect(result.score).toBeLessThan(75);
  });

  it("includes all required fields in result", () => {
    const trade: TradeInput = {
      walletId: "550e8400-e29b-41d4-a716-446655440001",
      marketId: "550e8400-e29b-41d4-a716-446655440000",
      tradeTs: new Date(),
      side: "buy",
      notional: 100,
    };

    const result = scoreTradeExecution(trade, goodContext);

    expect(result.walletId).toBe("550e8400-e29b-41d4-a716-446655440001");
    expect(result.marketId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.tradeTs).toBeDefined();
    expect(result.side).toBe("buy");
    expect(result.notional).toBe(100);
    expect(result.label).toBeDefined();
    expect(result.displayLabel).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
    expect(result.whyBullets).toHaveLength(3);
    expect(result.whyBullets[0]!.metric).toBeDefined();
    expect(result.whyBullets[0]!.value).toBeDefined();
    expect(result.computedAt).toBeInstanceOf(Date);
  });

  it("handles missing optional context values", () => {
    const trade: TradeInput = {
      walletId: "550e8400-e29b-41d4-a716-446655440001",
      marketId: "550e8400-e29b-41d4-a716-446655440000",
      tradeTs: new Date(),
      side: "buy",
      notional: 100,
    };

    const minimalContext: TradeContext = {
      spreadAtEntry: null,
      depthAtEntry: null,
      priceChange15m: null,
      priceChange5m: null,
      marketState: null,
      volumeRatio: null,
      userMedianSpread: null,
    };

    const result = scoreTradeExecution(trade, minimalContext);

    expect(result.label).toBeDefined();
    expect(result.whyBullets).toHaveLength(3);
    expect(result.confidence).toBeLessThan(100); // Less confident with missing data
  });
});
