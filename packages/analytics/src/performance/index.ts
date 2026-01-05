import type { PerformanceMetrics } from "../types.js";

export interface Trade {
  marketId: string;
  outcome: string;
  side: "buy" | "sell";
  shares: number;
  price: number;
  timestamp: Date;
}

export interface Position {
  marketId: string;
  outcome: string;
  shares: number;
  avgEntryPrice: number;
  currentPrice: number;
}

export interface PerformanceInput {
  trades: Trade[];
  positions: Position[];
  priceHistory: Map<string, { timestamp: Date; price: number }[]>;
}

export function calculatePerformanceMetrics(input: PerformanceInput): PerformanceMetrics {
  const { trades, positions, priceHistory } = input;

  // Calculate realized P&L from closed positions
  let realizedPnl = 0;
  const positionMap = new Map<string, { shares: number; cost: number }>();

  for (const trade of trades) {
    const key = `${trade.marketId}:${trade.outcome}`;
    const existing = positionMap.get(key) ?? { shares: 0, cost: 0 };

    if (trade.side === "buy") {
      existing.shares += trade.shares;
      existing.cost += trade.shares * trade.price;
    } else {
      const avgCost = existing.cost / existing.shares;
      realizedPnl += trade.shares * (trade.price - avgCost);
      existing.shares -= trade.shares;
      existing.cost -= trade.shares * avgCost;
    }

    positionMap.set(key, existing);
  }

  // Calculate unrealized P&L from open positions
  let unrealizedPnl = 0;
  for (const position of positions) {
    const pnl = position.shares * (position.currentPrice - position.avgEntryPrice);
    unrealizedPnl += pnl;
  }

  // Calculate win rate
  const closedTrades = trades.filter((t) => t.side === "sell");
  let wins = 0;
  for (const trade of closedTrades) {
    const key = `${trade.marketId}:${trade.outcome}`;
    const position = positionMap.get(key);
    if (position && position.cost / position.shares < trade.price) {
      wins++;
    }
  }
  const winRate = closedTrades.length > 0 ? wins / closedTrades.length : 0;

  // Calculate average slippage (simplified - compare to price at time of trade)
  let totalSlippage = 0;
  let slippageCount = 0;
  for (const trade of trades) {
    const history = priceHistory.get(trade.marketId);
    if (history) {
      const nearestPrice = findNearestPrice(history, trade.timestamp);
      if (nearestPrice !== null) {
        const slippage = Math.abs(trade.price - nearestPrice);
        totalSlippage += slippage;
        slippageCount++;
      }
    }
  }
  const avgSlippage = slippageCount > 0 ? totalSlippage / slippageCount : 0;

  // Calculate entry timing score
  const entryTimingScore = calculateEntryTimingScore(trades, priceHistory);

  return {
    totalPnl: realizedPnl + unrealizedPnl,
    realizedPnl,
    unrealizedPnl,
    totalTrades: trades.length,
    winRate: Math.round(winRate * 100) / 100,
    avgSlippage: Math.round(avgSlippage * 10000) / 10000,
    entryTimingScore,
  };
}

function findNearestPrice(
  history: { timestamp: Date; price: number }[],
  target: Date
): number | null {
  if (history.length === 0) return null;

  let nearest = history[0]!;
  let minDiff = Math.abs(target.getTime() - nearest.timestamp.getTime());

  for (const point of history) {
    const diff = Math.abs(target.getTime() - point.timestamp.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      nearest = point;
    }
  }

  return nearest.price;
}

function calculateEntryTimingScore(
  trades: Trade[],
  priceHistory: Map<string, { timestamp: Date; price: number }[]>
): number {
  if (trades.length === 0) return 50; // Neutral score

  let totalScore = 0;
  let scoredTrades = 0;

  for (const trade of trades.filter((t) => t.side === "buy")) {
    const history = priceHistory.get(trade.marketId);
    if (!history || history.length < 10) continue;

    // Get prices around the trade (before and after)
    const tradeTime = trade.timestamp.getTime();
    const windowMs = 24 * 60 * 60 * 1000; // 24 hours

    const windowPrices = history.filter(
      (h) =>
        h.timestamp.getTime() >= tradeTime - windowMs &&
        h.timestamp.getTime() <= tradeTime + windowMs
    );

    if (windowPrices.length < 5) continue;

    const prices = windowPrices.map((p) => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice;

    if (range === 0) continue;

    // Score: 100 if bought at minimum, 0 if bought at maximum
    const score = 100 * (1 - (trade.price - minPrice) / range);
    totalScore += score;
    scoredTrades++;
  }

  return scoredTrades > 0 ? Math.round(totalScore / scoredTrades) : 50;
}
