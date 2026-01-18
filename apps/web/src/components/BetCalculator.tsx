"use client";

import { useState, useEffect } from "react";

interface BetCalculatorProps {
  currentOdds: number; // Current price (0-1, e.g., 0.65 for 65¢)
  outcome?: "YES" | "NO";
  defaultAmount?: number;
  size?: "small" | "medium" | "large";
  showBreakeven?: boolean;
}

export function BetCalculator({
  currentOdds,
  outcome = "YES",
  defaultAmount = 100,
  size = "medium",
  showBreakeven = true,
}: BetCalculatorProps) {
  const [betAmount, setBetAmount] = useState<string>(defaultAmount.toString());
  const [isFocused, setIsFocused] = useState(false);

  // Parse bet amount
  const amount = parseFloat(betAmount) || 0;

  // Calculate potential outcomes
  const calculateWinAmount = (bet: number, odds: number): number => {
    if (bet <= 0 || odds <= 0 || odds >= 1) return 0;
    // Win amount = bet amount * (1 / odds - 1)
    // This is how much profit you make if you win
    return bet * (1 / odds - 1);
  };

  const calculateTotalReturn = (bet: number, odds: number): number => {
    return bet + calculateWinAmount(bet, odds);
  };

  const calculateROI = (bet: number, odds: number): number => {
    if (bet <= 0) return 0;
    const winAmount = calculateWinAmount(bet, odds);
    return (winAmount / bet) * 100;
  };

  const calculateBreakeven = (odds: number): number => {
    // Break-even is when your odds equal the true probability
    return odds * 100;
  };

  const winAmount = calculateWinAmount(amount, currentOdds);
  const totalReturn = calculateTotalReturn(amount, currentOdds);
  const roi = calculateROI(amount, currentOdds);
  const maxLoss = amount;
  const breakeven = calculateBreakeven(currentOdds);

  // Determine text sizes based on component size
  const inputSize =
    size === "small"
      ? "text-sm"
      : size === "medium"
      ? "text-base"
      : "text-lg";
  const labelSize =
    size === "small"
      ? "text-[10px]"
      : size === "medium"
      ? "text-xs"
      : "text-sm";
  const valueSize =
    size === "small"
      ? "text-lg"
      : size === "medium"
      ? "text-2xl"
      : "text-3xl";
  const subValueSize =
    size === "small"
      ? "text-xs"
      : size === "medium"
      ? "text-sm"
      : "text-base";

  return (
    <div className="space-y-3">
      {/* Input Section */}
      <div>
        <label
          htmlFor="bet-amount"
          className={`block ${labelSize} font-medium text-gray-400 mb-2`}
        >
          Bet Amount
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
            $
          </span>
          <input
            id="bet-amount"
            type="number"
            min="0"
            step="10"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`w-full ${inputSize} pl-7 pr-4 py-2 bg-gray-800 border ${
              isFocused ? "border-emerald-500" : "border-gray-700"
            } rounded-lg text-gray-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all`}
            placeholder="100"
          />
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Potential Win */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 transition-all hover:bg-emerald-500/15">
          <div className={`${labelSize} text-emerald-400 font-medium mb-1`}>
            If {outcome} Wins
          </div>
          <div className={`${valueSize} font-bold text-emerald-400 transition-all`}>
            +${winAmount.toFixed(2)}
          </div>
          <div className={`${subValueSize} text-emerald-400/70 mt-1`}>
            Total: ${totalReturn.toFixed(2)}
          </div>
        </div>

        {/* Potential Loss */}
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 transition-all hover:bg-rose-500/15">
          <div className={`${labelSize} text-rose-400 font-medium mb-1`}>
            If {outcome} Loses
          </div>
          <div className={`${valueSize} font-bold text-rose-400 transition-all`}>
            -${maxLoss.toFixed(2)}
          </div>
          <div className={`${subValueSize} text-rose-400/70 mt-1`}>
            Total: $0.00
          </div>
        </div>
      </div>

      {/* ROI and Break-even */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-800">
        <div>
          <div className={`${labelSize} text-gray-500`}>Expected ROI</div>
          <div
            className={`${subValueSize} font-bold ${
              roi > 0 ? "text-emerald-400" : "text-gray-400"
            } transition-colors`}
          >
            {roi > 0 ? "+" : ""}
            {roi.toFixed(1)}%
          </div>
        </div>

        {showBreakeven && (
          <div className="text-right">
            <div className={`${labelSize} text-gray-500`}>Break-even</div>
            <div className={`${subValueSize} font-bold text-gray-400`}>
              {breakeven.toFixed(0)}%
            </div>
          </div>
        )}

        <div className="text-right">
          <div className={`${labelSize} text-gray-500`}>Current Odds</div>
          <div className={`${subValueSize} font-bold text-gray-300`}>
            {(currentOdds * 100).toFixed(0)}¢
          </div>
        </div>
      </div>

      {/* Quick Bet Amounts */}
      {size !== "small" && (
        <div className="flex gap-2">
          {[50, 100, 250, 500].map((quickAmount) => (
            <button
              key={quickAmount}
              onClick={() => setBetAmount(quickAmount.toString())}
              className={`flex-1 py-1.5 px-2 ${labelSize} font-semibold rounded-md transition-all ${
                amount === quickAmount
                  ? "bg-emerald-500 text-gray-950"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
              }`}
            >
              ${quickAmount}
            </button>
          ))}
        </div>
      )}

      {/* Risk Warning */}
      {amount > 1000 && (
        <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <span className="text-amber-500 text-sm">⚠️</span>
          <p className={`${labelSize} text-amber-400/90 leading-relaxed`}>
            Large bet amount. Consider position sizing and risk management.
          </p>
        </div>
      )}
    </div>
  );
}

// Compact version for cards
export function BetCalculatorCompact({
  currentOdds,
  outcome = "YES",
}: {
  currentOdds: number;
  outcome?: "YES" | "NO";
}) {
  return (
    <BetCalculator
      currentOdds={currentOdds}
      outcome={outcome}
      defaultAmount={100}
      size="small"
      showBreakeven={false}
    />
  );
}

// Inline version for quick calculations
export function BetCalculatorInline({
  betAmount,
  currentOdds,
  outcome = "YES",
}: {
  betAmount: number;
  currentOdds: number;
  outcome?: "YES" | "NO";
}) {
  const winAmount = betAmount * (1 / currentOdds - 1);
  const roi = (winAmount / betAmount) * 100;

  return (
    <div className="inline-flex items-center gap-3 text-sm">
      <div className="flex items-center gap-1">
        <span className="text-gray-500">Win:</span>
        <span className="font-bold text-emerald-400">
          +${winAmount.toFixed(2)}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-gray-500">Loss:</span>
        <span className="font-bold text-rose-400">-${betAmount.toFixed(2)}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-gray-500">ROI:</span>
        <span className="font-bold text-gray-300">{roi.toFixed(1)}%</span>
      </div>
    </div>
  );
}


