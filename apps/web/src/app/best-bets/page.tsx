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
        return "bg-amber-500/20 text-amber-300 border-amber-500/50";
      case "strong":
        return "bg-teal-500/20 text-teal-300 border-teal-500/50";
      case "moderate":
        return "bg-sky-500/20 text-sky-300 border-sky-500/50";
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
    <main className="min-h-screen p-4 md:p-8 bg-[#0a0f14]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">Best Bets Signals</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-400 text-xs font-medium border border-teal-500/30">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500"></span>
              </span>
              LIVE
            </span>
          </div>
          <p className="text-gray-400">
            AI-powered trading signals based on elite trader analysis
          </p>
          
          {/* Stats Bar */}
          {data && (
            <div className="flex flex-wrap gap-4 mt-4 p-4 bg-[#111820] rounded-xl border border-[#243040]">
              <div>
                <p className="text-sm text-gray-400">Total Signals</p>
                <p className="text-2xl font-bold text-white">{data.total}</p>
              </div>
              <div className="border-l border-[#243040] pl-4">
                <p className="text-sm text-gray-400">Elite Signals</p>
                <p className="text-2xl font-bold text-amber-400">{data.eliteCount}</p>
              </div>
              <div className="border-l border-[#243040] pl-4">
                <p className="text-sm text-gray-400">Strong Signals</p>
                <p className="text-2xl font-bold text-teal-400">{data.strongCount}</p>
              </div>
              <div className="border-l border-[#243040] pl-4">
                <p className="text-sm text-gray-400">Avg Confidence</p>
                <p className="text-2xl font-bold text-cyan-400">
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
                ? "bg-teal-500 text-white shadow-glow-sm"
                : "bg-[#111820] text-gray-300 border border-[#243040] hover:bg-[#1a2332]"
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
                  ? "bg-teal-500 text-white shadow-glow-sm"
                  : "bg-[#111820] text-gray-300 border border-[#243040] hover:bg-[#1a2332]"
              }`}
            >
              {strength}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent"></div>
            <p className="mt-2 text-gray-400">Loading signals...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-6 text-center">
            <p className="text-rose-300 font-medium mb-2">
              Signals temporarily unavailable
            </p>
            <p className="text-sm text-rose-400/80">
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
                className="bg-[#111820] border border-[#243040] rounded-xl p-6 hover:border-teal-500/30 transition-all hover:shadow-glow-sm"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <Link
                      href={`/markets/${signal.marketId}`}
                      className="text-lg font-semibold text-white hover:text-teal-400 transition-colors"
                    >
                      {signal.marketQuestion}
                    </Link>
                    {signal.marketCategory && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded bg-[#243040] text-gray-400">
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
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/50"
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
                    <p className="text-lg font-semibold font-mono text-rose-400">{formatPrice(signal.stopLoss)}</p>
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
                  <div className="mb-4 p-3 bg-[#0a0f14] rounded-lg">
                    <p className="text-sm text-gray-500 mb-2">Analysis Rationale</p>
                    <ul className="space-y-1">
                      {signal.reasoning.slice(0, 3).map((reason, index) => (
                        <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="text-teal-400">•</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Trader Info */}
                <div className="flex items-center justify-between pt-4 border-t border-[#243040]">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Top Trader</p>
                      <p className="font-mono text-sm text-gray-300">{formatAddress(signal.traderAddress)}</p>
                    </div>
                    <div className="border-l border-[#243040] pl-4">
                      <p className="text-sm text-gray-500">Win Rate</p>
                      <p className="font-semibold text-emerald-400">{formatPercent(signal.traderWinRate / 100)}</p>
                    </div>
                    <div className="border-l border-[#243040] pl-4">
                      <p className="text-sm text-gray-500">Elite Score</p>
                      <p className="font-semibold text-amber-400">{signal.traderEliteScore?.toFixed(1) || "-"}</p>
                    </div>
                    {signal.traderSharpeRatio && (
                      <div className="border-l border-[#243040] pl-4">
                        <p className="text-sm text-gray-500">Sharpe Ratio</p>
                        <p className="font-semibold text-cyan-400">{signal.traderSharpeRatio.toFixed(2)}</p>
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
          <div className="text-center py-12 bg-[#111820] rounded-xl border border-[#243040]">
            <p className="text-gray-400">No signals found for the selected filter.</p>
            <button
              onClick={() => setSelectedStrength(null)}
              className="mt-4 text-teal-400 hover:text-teal-300"
            >
              View all signals
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
