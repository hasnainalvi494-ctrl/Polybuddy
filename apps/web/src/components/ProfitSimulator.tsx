"use client";

import { useState, useMemo } from "react";

type ProfitSimulatorProps = {
  currentPrice: number | null;
  spread: number | null;
  marketQuestion: string;
};

type Scenario = {
  name: string;
  description: string;
  entryPrice: number;
  effectiveCost: number;
  profit: number;
  roi: number;
  color: string;
  bgColor: string;
};

// Simulation assumptions
const TYPICAL_SLIPPAGE = 0.015; // 1.5% slippage for retail
const TYPICAL_DELAY_DRIFT = 0.02; // 2% price drift during delay
const LATE_ENTRY_MOVE = 0.12; // 12% price already moved
const LATE_ENTRY_SPREAD_MULT = 1.5; // Spread widens in volatile markets

export function ProfitSimulator({
  currentPrice,
  spread,
  marketQuestion,
}: ProfitSimulatorProps) {
  const [positionSize, setPositionSize] = useState<number>(100);
  const [targetOutcome, setTargetOutcome] = useState<"yes" | "no">("yes");

  const effectiveSpread = spread ?? 0.03; // Default 3% spread if unknown
  const price = currentPrice ?? 0.5;

  // Calculate scenarios
  const scenarios = useMemo((): Scenario[] => {
    // Base price for the outcome we're betting on
    const basePrice = targetOutcome === "yes" ? price : 1 - price;

    // SCENARIO 1: Best Case (Perfect Execution)
    // You get exactly the mid-price with minimal spread
    const bestEntryPrice = basePrice + effectiveSpread / 2;
    const bestProfit =
      basePrice < 1
        ? positionSize * ((1 - bestEntryPrice) / bestEntryPrice)
        : 0;
    const bestRoi = (bestProfit / positionSize) * 100;

    // SCENARIO 2: Typical Retail Case
    // Full spread + slippage + slight delay drift
    const typicalSpreadCost = effectiveSpread;
    const typicalSlippage = TYPICAL_SLIPPAGE;
    const typicalDelayDrift = TYPICAL_DELAY_DRIFT;
    const typicalEntryPrice = Math.min(
      0.99,
      basePrice + typicalSpreadCost + typicalSlippage + typicalDelayDrift
    );
    const typicalProfit =
      typicalEntryPrice < 1
        ? positionSize * ((1 - typicalEntryPrice) / typicalEntryPrice)
        : 0;
    const typicalRoi = (typicalProfit / positionSize) * 100;

    // SCENARIO 3: Common Mistake (Late Entry After Move)
    // Price has already moved toward the outcome
    const lateBasePrice = Math.min(0.95, basePrice + LATE_ENTRY_MOVE);
    const lateSpread = effectiveSpread * LATE_ENTRY_SPREAD_MULT;
    const lateEntryPrice = Math.min(
      0.99,
      lateBasePrice + lateSpread + typicalSlippage
    );
    const lateProfit =
      lateEntryPrice < 1
        ? positionSize * ((1 - lateEntryPrice) / lateEntryPrice)
        : 0;
    const lateRoi = (lateProfit / positionSize) * 100;

    return [
      {
        name: "Best Case",
        description: "Perfect execution at mid-price",
        entryPrice: bestEntryPrice,
        effectiveCost: positionSize,
        profit: bestProfit,
        roi: bestRoi,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-900/20",
      },
      {
        name: "Typical Retail",
        description: "Average slippage + execution delay",
        entryPrice: typicalEntryPrice,
        effectiveCost: positionSize,
        profit: typicalProfit,
        roi: typicalRoi,
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
      },
      {
        name: "Late Entry",
        description: "Entering after price has moved",
        entryPrice: lateEntryPrice,
        effectiveCost: positionSize,
        profit: lateProfit,
        roi: lateRoi,
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-900/20",
      },
    ];
  }, [price, effectiveSpread, positionSize, targetOutcome]);

  // Calculate the "edge erosion" - how much of best-case profit is lost
  const edgeErosion = useMemo(() => {
    const bestProfit = scenarios[0].profit;
    const typicalProfit = scenarios[1].profit;
    if (bestProfit <= 0) return 0;
    return ((bestProfit - typicalProfit) / bestProfit) * 100;
  }, [scenarios]);

  const formatCurrency = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}$${Math.abs(value).toFixed(2)}`;
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Profit Simulator
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            See how execution affects your returns
          </p>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Position Size
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              $
            </span>
            <input
              type="number"
              value={positionSize}
              onChange={(e) =>
                setPositionSize(Math.max(1, Number(e.target.value)))
              }
              className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              min="1"
              step="10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Betting On
          </label>
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            <button
              onClick={() => setTargetOutcome("yes")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                targetOutcome === "yes"
                  ? "bg-green-500 text-white"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              }`}
            >
              Yes
            </button>
            <button
              onClick={() => setTargetOutcome("no")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                targetOutcome === "no"
                  ? "bg-red-500 text-white"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              }`}
            >
              No
            </button>
          </div>
        </div>
      </div>

      {/* Current Market Info */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Current {targetOutcome === "yes" ? "Yes" : "No"} Price
          </span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {formatPercent(targetOutcome === "yes" ? price : 1 - price)}
          </span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-gray-600 dark:text-gray-400">
            Current Spread
          </span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {formatPercent(effectiveSpread)}
          </span>
        </div>
      </div>

      {/* Scenario Cards */}
      <div className="space-y-3 mb-6">
        {scenarios.map((scenario) => (
          <div
            key={scenario.name}
            className={`rounded-lg border p-4 ${scenario.bgColor} ${
              scenario.name === "Best Case"
                ? "border-green-200 dark:border-green-800"
                : scenario.name === "Typical Retail"
                ? "border-yellow-200 dark:border-yellow-800"
                : "border-red-200 dark:border-red-800"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  {scenario.name}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {scenario.description}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${scenario.color}`}>
                  {formatCurrency(scenario.profit)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {scenario.roi.toFixed(1)}% ROI
                </p>
              </div>
            </div>
            <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
              <span>Entry: {formatPercent(scenario.entryPrice)}</span>
              <span>Cost: ${scenario.effectiveCost.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Edge Erosion Warning */}
      {edgeErosion > 20 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                {edgeErosion.toFixed(0)}% of potential profit lost to execution
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                High spread and slippage significantly reduce returns even when
                you&apos;re right.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key Insight */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Key Insight
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {scenarios[1].profit > 0 ? (
            <>
              If {targetOutcome === "yes" ? "Yes" : "No"} wins, typical retail
              execution yields{" "}
              <span className="font-medium text-yellow-600 dark:text-yellow-400">
                {formatCurrency(scenarios[1].profit)}
              </span>{" "}
              — about{" "}
              <span className="font-medium">
                {((scenarios[1].profit / scenarios[0].profit) * 100).toFixed(0)}
                %
              </span>{" "}
              of the best-case profit.
            </>
          ) : (
            <>
              At current prices, there&apos;s minimal profit potential even with
              perfect execution. Consider waiting for better entry.
            </>
          )}
        </p>
      </div>

      {/* Disclaimer */}
      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Simulated scenarios based on typical market conditions. Actual results
        vary.
      </p>
    </div>
  );
}
