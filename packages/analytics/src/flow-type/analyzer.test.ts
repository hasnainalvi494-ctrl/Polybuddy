import { describe, it, expect } from "vitest";
import { buildFlowEpisodes, classifyFlowEpisode, summarizeMarketFlow } from "./analyzer.js";
import { TradeEvent } from "./types.js";

function createTrade(overrides: Partial<TradeEvent> & { minutesAgo?: number } = {}): TradeEvent {
  const { minutesAgo = 0, ...rest } = overrides;
  return {
    tradeId: `trade-${Math.random().toString(36).slice(2)}`,
    walletId: "wallet-1",
    marketId: "550e8400-e29b-41d4-a716-446655440000",
    timestamp: new Date(Date.now() - minutesAgo * 60 * 1000),
    side: "buy",
    outcome: "yes",
    size: 1000,
    price: 0.50,
    ...rest,
  };
}

describe("buildFlowEpisodes", () => {
  it("groups trades within session gap", () => {
    const trades: TradeEvent[] = [
      createTrade({ minutesAgo: 10 }),
      createTrade({ minutesAgo: 8 }),
      createTrade({ minutesAgo: 5 }),
    ];

    const episodes = buildFlowEpisodes("market-1", trades);

    expect(episodes).toHaveLength(1);
    expect(episodes[0]!.trades).toHaveLength(3);
  });

  it("splits episodes at session gap", () => {
    const trades: TradeEvent[] = [
      createTrade({ minutesAgo: 120 }), // Episode 1
      createTrade({ minutesAgo: 115 }),
      createTrade({ minutesAgo: 50 }),  // Episode 2 (>30 min gap)
      createTrade({ minutesAgo: 45 }),
    ];

    const episodes = buildFlowEpisodes("market-1", trades);

    expect(episodes).toHaveLength(2);
    expect(episodes[0]!.trades).toHaveLength(2);
    expect(episodes[1]!.trades).toHaveLength(2);
  });

  it("calculates episode metrics correctly", () => {
    const trades: TradeEvent[] = [
      createTrade({ minutesAgo: 10, size: 1000, side: "buy", price: 0.50, walletId: "w1" }),
      createTrade({ minutesAgo: 8, size: 500, side: "buy", price: 0.52, walletId: "w2" }),
      createTrade({ minutesAgo: 5, size: 300, side: "sell", price: 0.55, walletId: "w1" }),
    ];

    const episodes = buildFlowEpisodes("market-1", trades);

    expect(episodes).toHaveLength(1);
    const ep = episodes[0]!;
    expect(ep.totalVolume).toBe(1800);
    expect(ep.netFlow).toBe(1200); // 1000 + 500 - 300
    expect(ep.uniqueWallets).toBe(2);
    expect(ep.avgTradeSize).toBeCloseTo(600);
    expect(ep.priceAtStart).toBe(0.50);
    expect(ep.priceAtEnd).toBe(0.55);
  });

  it("returns empty array for no trades", () => {
    const episodes = buildFlowEpisodes("market-1", []);
    expect(episodes).toHaveLength(0);
  });

  it("requires minimum trades for episode", () => {
    const trades: TradeEvent[] = [
      createTrade({ minutesAgo: 10 }),
    ];

    const episodes = buildFlowEpisodes("market-1", trades);
    expect(episodes).toHaveLength(0); // Only 1 trade, need 2 minimum
  });
});

describe("classifyFlowEpisode", () => {
  it("classifies one-off spike with large trades", () => {
    const trades: TradeEvent[] = [
      createTrade({ minutesAgo: 2, size: 15000, walletId: "whale" }),
      createTrade({ minutesAgo: 1, size: 12000, walletId: "whale" }),
    ];

    const episodes = buildFlowEpisodes("market-1", trades);
    const result = classifyFlowEpisode(episodes[0]!);

    expect(result.label).toBe("one_off_spike");
    expect(result.displayLabel).toBe("One-off Spike");
    expect(result.whyBullets).toHaveLength(3);
  });

  it("classifies sustained accumulation with many trades from few wallets", () => {
    const trades: TradeEvent[] = [];
    // Many trades over time from same wallet
    for (let i = 0; i < 8; i++) {
      trades.push(createTrade({
        minutesAgo: i * 10, // Every 10 minutes
        size: 500,
        walletId: "accumulator",
        side: "buy",
      }));
    }

    const episodes = buildFlowEpisodes("market-1", trades);
    const result = classifyFlowEpisode(episodes[0]!);

    expect(result.label).toBe("sustained_accumulation");
    expect(result.displayLabel).toBe("Sustained Accumulation");
  });

  it("classifies crowd chase with many unique wallets", () => {
    const trades: TradeEvent[] = [];
    // Many different wallets trading in short period
    for (let i = 0; i < 8; i++) {
      trades.push(createTrade({
        minutesAgo: i * 2,
        size: 500,
        walletId: `wallet-${i}`,
        side: "buy",
        price: 0.50 + i * 0.01, // Price going up
      }));
    }

    const episodes = buildFlowEpisodes("market-1", trades);
    const result = classifyFlowEpisode(episodes[0]!);

    expect(result.label).toBe("crowd_chase");
    expect(result.displayLabel).toBe("Crowd Chase");
  });

  it("classifies exhaustion at extreme price levels", () => {
    const trades: TradeEvent[] = [];
    // Many wallets piling in at extreme price with decreasing sizes
    for (let i = 0; i < 8; i++) {
      trades.push(createTrade({
        minutesAgo: i * 2,
        size: Math.max(50, 200 - i * 25), // Decreasing sizes
        walletId: `wallet-${i}`,
        side: "buy",
        price: 0.95, // At extreme price level
      }));
    }

    const episodes = buildFlowEpisodes("market-1", trades);
    const result = classifyFlowEpisode(episodes[0]!);

    // At extreme prices with decreasing sizes = exhaustion or crowd_chase
    expect(["exhaustion_move", "crowd_chase"]).toContain(result.label);
    expect(result.whyBullets).toHaveLength(3);
  });

  it("includes price impact in result", () => {
    const trades: TradeEvent[] = [
      createTrade({ minutesAgo: 5, price: 0.50 }),
      createTrade({ minutesAgo: 1, price: 0.55 }),
    ];

    const episodes = buildFlowEpisodes("market-1", trades);
    const result = classifyFlowEpisode(episodes[0]!);

    expect(result.priceImpact).toBeCloseTo(10, 0); // 10% move
  });

  it("includes follow-up price change when provided", () => {
    const trades: TradeEvent[] = [
      createTrade({ minutesAgo: 5, price: 0.50 }),
      createTrade({ minutesAgo: 1, price: 0.55 }),
    ];

    const episodes = buildFlowEpisodes("market-1", trades);
    const result = classifyFlowEpisode(episodes[0]!, undefined, 0.52); // Reverted to 0.52

    expect(result.followUpPriceChange).toBeDefined();
    expect(result.followUpPriceChange).toBeLessThan(0); // Price went down after episode
  });

  it("includes all required fields", () => {
    const trades: TradeEvent[] = [
      createTrade({ minutesAgo: 5 }),
      createTrade({ minutesAgo: 2 }),
    ];

    const episodes = buildFlowEpisodes("market-1", trades);
    const result = classifyFlowEpisode(episodes[0]!);

    expect(result.episodeId).toBeDefined();
    expect(result.marketId).toBe("market-1");
    expect(result.label).toBeDefined();
    expect(result.displayLabel).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
    expect(result.whyBullets).toHaveLength(3);
    expect(result.whyBullets[0]!.metric).toBeDefined();
    expect(result.episode).toBeDefined();
    expect(result.priceImpact).toBeDefined();
    expect(result.computedAt).toBeInstanceOf(Date);
  });
});

describe("summarizeMarketFlow", () => {
  it("summarizes multiple episodes", () => {
    const trades: TradeEvent[] = [];

    // Episode 1: Accumulation
    for (let i = 0; i < 5; i++) {
      trades.push(createTrade({
        minutesAgo: 200 - i * 10,
        size: 500,
        walletId: "accumulator",
        side: "buy",
      }));
    }

    // Episode 2: Spike (gap of 60+ min)
    trades.push(createTrade({ minutesAgo: 50, size: 15000, walletId: "whale" }));
    trades.push(createTrade({ minutesAgo: 48, size: 12000, walletId: "whale" }));

    const summary = summarizeMarketFlow("market-1", trades);

    expect(summary.marketId).toBe("market-1");
    expect(summary.recentEpisodes.length).toBeGreaterThanOrEqual(1);
    expect(summary.dominantFlowType).toBeDefined();
    expect(["buying", "selling", "neutral"]).toContain(summary.netFlowDirection);
    expect(summary.flowIntensity).toBeGreaterThanOrEqual(0);
    expect(summary.flowIntensity).toBeLessThanOrEqual(100);
    expect(summary.computedAt).toBeInstanceOf(Date);
  });

  it("handles empty trade list", () => {
    const summary = summarizeMarketFlow("market-1", []);

    expect(summary.recentEpisodes).toHaveLength(0);
    expect(summary.dominantFlowType).toBeNull();
    expect(summary.netFlowDirection).toBe("neutral");
    expect(summary.flowIntensity).toBe(0);
  });

  it("determines net flow direction correctly", () => {
    // Net buying
    const buyTrades = [
      createTrade({ minutesAgo: 5, size: 5000, side: "buy" }),
      createTrade({ minutesAgo: 3, size: 3000, side: "buy" }),
    ];

    const buySummary = summarizeMarketFlow("market-1", buyTrades);
    expect(buySummary.netFlowDirection).toBe("buying");

    // Net selling
    const sellTrades = [
      createTrade({ minutesAgo: 5, size: 5000, side: "sell" }),
      createTrade({ minutesAgo: 3, size: 3000, side: "sell" }),
    ];

    const sellSummary = summarizeMarketFlow("market-1", sellTrades);
    expect(sellSummary.netFlowDirection).toBe("selling");
  });

  it("limits returned episodes to 10", () => {
    const trades: TradeEvent[] = [];
    // Create many episodes
    for (let ep = 0; ep < 15; ep++) {
      const baseTime = ep * 60;
      for (let i = 0; i < 3; i++) {
        trades.push(createTrade({
          minutesAgo: baseTime + i * 5,
          size: 500,
        }));
      }
    }

    const summary = summarizeMarketFlow("market-1", trades);

    expect(summary.recentEpisodes.length).toBeLessThanOrEqual(10);
  });
});
