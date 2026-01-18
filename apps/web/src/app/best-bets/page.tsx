"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

const API_URL = "https://polybuddy-api-production.up.railway.app";

interface BestBetSignal {
  id: string;
  marketId: string;
  marketQuestion: string;
  marketCategory: string | null;
  confidence: number;
  signalStrength: "elite" | "strong" | "moderate" | "weak";
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  positionSize?: number;
  riskRewardRatio?: number;
  kellyCriterion?: number;
  outcome: "yes" | "no";
  traderAddress: string;
  traderWinRate: number;
  traderEliteScore: number;
  traderProfitHistory: number;
  traderSharpeRatio?: number;
  reasoning: string[];
  timeHorizon: string;
  generatedAt: string;
  expiresAt: string;
}

interface BestBetsResponse {
  signals: BestBetSignal[];
  total: number;
  eliteCount: number;
  strongCount: number;
  avgConfidence: number;
}

export default function BestBetsPage() {
  const [selectedStrength, setSelectedStrength] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<BestBetsResponse>({
    queryKey: ["best-bets"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/best-bets-signals`);
      if (!response.ok) throw new Error("Failed to fetch best bets");
      return response.json();
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const filteredSignals = selectedStrength
    ? data?.signals?.filter((s) => s.signalStrength === selectedStrength)
    : data?.signals;

  const getSignalColor = (strength: string) => {
    switch (strength) {
      case "elite":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/50";
      case "strong":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/50";
      case "moderate":
        return "bg-blue-500/20 text-blue-300 border-blue-500/50";
      case "weak":
        return "bg-gray-500/20 text-gray-300 border-gray-500/50";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/50";
    }
  };

  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return "-";
    return `${(price * 100).toFixed(0)}¢`;
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return `${(value * 100).toFixed(0)}%`;
  };

  const formatAddress = (address: string) => {
    if (!address) return "-";
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="min-h-screen p-4 md:p-8 bg-[#0a0a1a]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white">Best Bets Signals</h1>
          <p className="text-gray-400">
            AI-powered trading signals based on elite trader analysis
          </p>
          
          {/* Stats Bar */}
          {data && (
            <div className="flex flex-wrap gap-4 mt-4 p-4 bg-[#14142b] rounded-xl border border-[#252545]">
              <div>
                <p className="text-sm text-gray-400">Total Signals</p>
                <p className="text-2xl font-bold text-white">{data.total}</p>
              </div>
              <div className="border-l border-[#252545] pl-4">
                <p className="text-sm text-gray-400">Elite Signals</p>
                <p className="text-2xl font-bold text-yellow-400">{data.eliteCount}</p>
              </div>
              <div className="border-l border-[#252545] pl-4">
                <p className="text-sm text-gray-400">Strong Signals</p>
                <p className="text-2xl font-bold text-emerald-400">{data.strongCount}</p>
              </div>
              <div className="border-l border-[#252545] pl-4">
                <p className="text-sm text-gray-400">Avg Confidence</p>
                <p className="text-2xl font-bold text-primary-400">
                  {(data.avgConfidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          )}
        </header>

        {/* Signal Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedStrength(null)}
            className={`px-4 py-2 rounded-lg transition-all ${
              selectedStrength === null
                ? "bg-primary-500 text-white shadow-glow-sm"
                : "bg-[#14142b] text-gray-300 border border-[#252545] hover:bg-[#1a1a3e]"
            }`}
          >
            All Signals
          </button>
          {["elite", "strong", "moderate", "weak"].map((strength) => (
            <button
              key={strength}
              onClick={() => setSelectedStrength(strength)}
              className={`px-4 py-2 rounded-lg transition-all capitalize ${
                selectedStrength === strength
                  ? "bg-primary-500 text-white shadow-glow-sm"
                  : "bg-[#14142b] text-gray-300 border border-[#252545] hover:bg-[#1a1a3e]"
              }`}
            >
              {strength}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
            <p className="mt-2 text-gray-400">Loading signals...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-center">
            <p className="text-amber-300 font-medium mb-2">
              Signals temporarily unavailable
            </p>
            <p className="text-sm text-amber-400/80">
              We're refreshing signal data. Please try again shortly.
            </p>
          </div>
        )}

        {/* Signals List */}
        {filteredSignals && filteredSignals.length > 0 && (
          <div className="space-y-4">
            {filteredSignals.map((signal) => (
              <div
                key={signal.id}
                className="bg-[#14142b] border border-[#252545] rounded-xl p-6 hover:border-primary-500/30 transition-all"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <Link
                      href={`/markets/${signal.marketId}`}
                      className="text-lg font-semibold text-white hover:text-primary-400 transition-colors"
                    >
                      {signal.marketQuestion}
                    </Link>
                    {signal.marketCategory && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded bg-[#252545] text-gray-400">
                        {signal.marketCategory}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getSignalColor(signal.signalStrength)}`}>
                      {signal.signalStrength.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      signal.outcome === "yes" 
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
                        : "bg-red-500/20 text-red-300 border border-red-500/50"
                    }`}>
                      {signal.outcome.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Confidence</p>
                    <p className="text-lg font-semibold text-white">{formatPercent(signal.confidence)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Entry Price</p>
                    <p className="text-lg font-semibold font-mono text-white">{formatPrice(signal.entryPrice)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Target</p>
                    <p className="text-lg font-semibold font-mono text-emerald-400">{formatPrice(signal.targetPrice)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Stop Loss</p>
                    <p className="text-lg font-semibold font-mono text-red-400">{formatPrice(signal.stopLoss)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Risk/Reward</p>
                    <p className="text-lg font-semibold text-white">
                      {signal.riskRewardRatio ? signal.riskRewardRatio.toFixed(2) : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Time Horizon</p>
                    <p className="text-lg font-semibold text-white">{signal.timeHorizon}</p>
                  </div>
                </div>

                {/* Reasoning */}
                {signal.reasoning && signal.reasoning.length > 0 && (
                  <div className="mb-4 p-3 bg-[#0a0a1a] rounded-lg">
                    <p className="text-sm text-gray-500 mb-2">Analysis Rationale</p>
                    <ul className="space-y-1">
                      {signal.reasoning.slice(0, 3).map((reason, index) => (
                        <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="text-primary-400">•</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Trader Info */}
                <div className="flex items-center justify-between pt-4 border-t border-[#252545]">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Top Trader</p>
                      <p className="font-mono text-sm text-gray-300">{formatAddress(signal.traderAddress)}</p>
                    </div>
                    <div className="border-l border-[#252545] pl-4">
                      <p className="text-sm text-gray-500">Win Rate</p>
                      <p className="font-semibold text-emerald-400">{formatPercent(signal.traderWinRate / 100)}</p>
                    </div>
                    <div className="border-l border-[#252545] pl-4">
                      <p className="text-sm text-gray-500">Elite Score</p>
                      <p className="font-semibold text-yellow-400">{signal.traderEliteScore?.toFixed(1) || "-"}</p>
                    </div>
                    {signal.traderSharpeRatio && (
                      <div className="border-l border-[#252545] pl-4">
                        <p className="text-sm text-gray-500">Sharpe Ratio</p>
                        <p className="font-semibold text-primary-400">{signal.traderSharpeRatio.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Generated</p>
                    <p className="text-sm text-gray-400">{formatTime(signal.generatedAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredSignals && filteredSignals.length === 0 && !isLoading && !error && (
          <div className="text-center py-12 bg-[#14142b] rounded-xl border border-[#252545]">
            <p className="text-gray-400">No signals found for the selected filter.</p>
            <button
              onClick={() => setSelectedStrength(null)}
              className="mt-4 text-primary-400 hover:text-primary-300"
            >
              View all signals
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
