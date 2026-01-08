"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSlippage } from "@/lib/api";

interface SlippageCalculatorProps {
  marketId: string;
  currentPrice: number;
  outcome?: "YES" | "NO";
  defaultSize?: number;
}

type SlippageLevel = "good" | "moderate" | "high" | "very_high";

function getSlippageLevel(slippagePercent: number): SlippageLevel {
  if (slippagePercent < 1) return "good";
  if (slippagePercent < 3) return "moderate";
  if (slippagePercent < 5) return "high";
  return "very_high";
}

function getSlippageConfig(level: SlippageLevel) {
  const configs = {
    good: {
      icon: "✅",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      message: "Good execution expected",
    },
    moderate: {
      icon: "⚠️",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      message: "Moderate slippage",
    },
    high: {
      icon: "🔴",
      color: "text-rose-400",
      bgColor: "bg-rose-500/10",
      borderColor: "border-rose-500/20",
      message: "High slippage - consider smaller size",
    },
    very_high: {
      icon: "🚨",
      color: "text-rose-500",
      bgColor: "bg-rose-500/20",
      borderColor: "border-rose-500/30",
      message: "Very high slippage - market too thin",
    },
  };
  return configs[level];
}

export function SlippageCalculator({
  marketId,
  currentPrice,
  outcome = "YES",
  defaultSize = 500,
}: SlippageCalculatorProps) {
  const [tradeSize, setTradeSize] = useState<string>(defaultSize.toString());
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [selectedOutcome, setSelectedOutcome] = useState<"YES" | "NO">(outcome);

  const size = parseFloat(tradeSize) || 0;

  const { data: slippageData, isLoading } = useQuery({
    queryKey: ["slippage", marketId, size, side, selectedOutcome],
    queryFn: () => getSlippage(marketId, size, side, selectedOutcome),
    enabled: size > 0,
    staleTime: 30 * 1000, // 30 seconds
  });

  const slippageLevel = slippageData
    ? getSlippageLevel(slippageData.slippagePercent)
    : "good";
  const config = getSlippageConfig(slippageLevel);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Trade Size Input */}
        <div>
          <label
            htmlFor="trade-size"
            className="block text-xs font-medium text-gray-400 mb-2"
          >
            Trade Size
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
              $
            </span>
            <input
              id="trade-size"
              type="number"
              min="0"
              step="100"
              value={tradeSize}
              onChange={(e) => setTradeSize(e.target.value)}
              className="w-full text-base pl-7 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
              placeholder="500"
            />
          </div>
        </div>

        {/* Buy/Sell Toggle */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">
            Side
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setSide("buy")}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                side === "buy"
                  ? "bg-emerald-500 text-gray-950"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setSide("sell")}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                side === "sell"
                  ? "bg-rose-500 text-gray-950"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              Sell
            </button>
          </div>
        </div>

        {/* YES/NO Toggle */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">
            Outcome
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedOutcome("YES")}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                selectedOutcome === "YES"
                  ? "bg-emerald-500 text-gray-950"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              YES
            </button>
            <button
              onClick={() => setSelectedOutcome("NO")}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                selectedOutcome === "NO"
                  ? "bg-rose-500 text-gray-950"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              NO
            </button>
          </div>
        </div>
      </div>

      {/* Quick Size Buttons */}
      <div className="flex gap-2">
        {[100, 250, 500, 1000, 2500, 5000].map((quickSize) => (
          <button
            key={quickSize}
            onClick={() => setTradeSize(quickSize.toString())}
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all ${
              size === quickSize
                ? "bg-emerald-500 text-gray-950"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
            }`}
          >
            ${quickSize >= 1000 ? `${quickSize / 1000}K` : quickSize}
          </button>
        ))}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-700 border-t-emerald-500"></div>
          <p className="mt-2 text-sm text-gray-500">Calculating slippage...</p>
        </div>
      ) : slippageData ? (
        <div className="space-y-4">
          {/* Main Results Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Mid Price */}
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className="text-xs text-gray-500 mb-1">Mid Price</div>
              <div className="text-xl font-bold text-gray-300">
                {(slippageData.midPrice * 100).toFixed(1)}¢
              </div>
            </div>

            {/* Execution Price */}
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className="text-xs text-gray-500 mb-1">Execution Price</div>
              <div className="text-xl font-bold text-gray-100">
                {(slippageData.executionPrice * 100).toFixed(1)}¢
              </div>
            </div>

            {/* Slippage % */}
            <div
              className={`${config.bgColor} rounded-lg p-3 border ${config.borderColor}`}
            >
              <div className="text-xs text-gray-500 mb-1">Slippage</div>
              <div className={`text-xl font-bold ${config.color}`}>
                {slippageData.slippagePercent.toFixed(2)}%
              </div>
            </div>

            {/* Slippage $ */}
            <div
              className={`${config.bgColor} rounded-lg p-3 border ${config.borderColor}`}
            >
              <div className="text-xs text-gray-500 mb-1">Extra Cost</div>
              <div className={`text-xl font-bold ${config.color}`}>
                ${slippageData.slippageDollars.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Warning Banner */}
          <div
            className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{config.icon}</span>
              <div className="flex-1">
                <div className={`font-semibold ${config.color} mb-1`}>
                  {config.message}
                </div>
                <p className="text-sm text-gray-400">
                  {slippageData.warning ||
                    `You'll ${side} at ${(slippageData.executionPrice * 100).toFixed(1)}¢ vs mid price of ${(slippageData.midPrice * 100).toFixed(1)}¢`}
                </p>
              </div>
            </div>
          </div>

          {/* Price Impact */}
          <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
            <span className="text-sm text-gray-400">Price Impact</span>
            <span
              className={`text-sm font-bold ${
                slippageData.priceImpact === "Low"
                  ? "text-emerald-400"
                  : slippageData.priceImpact === "Medium"
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}
            >
              {slippageData.priceImpact}
            </span>
          </div>

          {/* Order Book Breakdown (if available) */}
          {slippageData.breakdown && slippageData.breakdown.length > 0 && (
            <details className="bg-gray-800/30 rounded-lg border border-gray-700/30">
              <summary className="p-3 cursor-pointer text-sm font-medium text-gray-300 hover:text-gray-100">
                Order Book Breakdown ({slippageData.breakdown.length} levels)
              </summary>
              <div className="p-3 pt-0 space-y-2">
                {slippageData.breakdown.slice(0, 5).map((level: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-gray-500">
                      Level {idx + 1}: {(level.price * 100).toFixed(1)}¢
                    </span>
                    <span className="text-gray-400 font-mono">
                      ${level.size.toFixed(0)}
                    </span>
                  </div>
                ))}
                {slippageData.breakdown.length > 5 && (
                  <div className="text-xs text-gray-600 text-center pt-2">
                    ... and {slippageData.breakdown.length - 5} more levels
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Educational Note */}
          <div className="text-xs text-gray-500 leading-relaxed">
            <strong>What is slippage?</strong> The difference between the
            expected price and the actual execution price. Larger trades move
            through multiple price levels in the order book, resulting in worse
            average execution.
          </div>
        </div>
      ) : size > 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Enter a trade size to calculate slippage</p>
        </div>
      ) : null}
    </div>
  );
}

