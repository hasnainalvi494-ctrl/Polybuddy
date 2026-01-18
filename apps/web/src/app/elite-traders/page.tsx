"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://polybuddy-api-production.up.railway.app";

interface EliteTrader {
  walletAddress: string;
  eliteScore: number;
  traderTier: string;
  riskProfile: string;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalProfit: number;
  totalVolume: number;
  tradeCount: number;
  rank: number;
  eliteRank: number | null;
  primaryCategory: string | null;
  strengths: string[];
  warnings: string[];
  isRecommended: boolean;
}

interface EliteTradersResponse {
  traders: EliteTrader[];
  total: number;
  eliteCount: number;
  strongCount: number;
}

export default function EliteTradersPage() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<EliteTradersResponse>({
    queryKey: ["elite-traders", selectedTier],
    queryFn: async () => {
      let url = `${API_URL}/api/elite-traders?limit=50`;
      if (selectedTier) {
        url += `&tier=${selectedTier}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch elite traders");
      return response.json();
    },
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatAddress = (address: string) => {
    if (!address) return "-";
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case "elite":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/50";
      case "strong":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/50";
      case "moderate":
        return "bg-blue-500/20 text-blue-300 border-blue-500/50";
      case "developing":
        return "bg-purple-500/20 text-purple-300 border-purple-500/50";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/50";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case "aggressive":
        return "text-red-400";
      case "moderate":
        return "text-yellow-400";
      case "conservative":
        return "text-emerald-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8 bg-[#0a0a1a]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white">Elite Traders</h1>
          <p className="text-gray-400">
            Top performing traders on Polymarket identified by our AI scoring system
          </p>

          {/* Stats Bar */}
          {data && (
            <div className="flex flex-wrap gap-4 mt-4 p-4 bg-[#14142b] rounded-xl border border-[#252545]">
              <div>
                <p className="text-sm text-gray-400">Total Traders</p>
                <p className="text-2xl font-bold text-white">{data.total}</p>
              </div>
              <div className="border-l border-[#252545] pl-4">
                <p className="text-sm text-gray-400">Elite Tier</p>
                <p className="text-2xl font-bold text-yellow-400">{data.eliteCount}</p>
              </div>
              <div className="border-l border-[#252545] pl-4">
                <p className="text-sm text-gray-400">Strong Tier</p>
                <p className="text-2xl font-bold text-emerald-400">{data.strongCount}</p>
              </div>
            </div>
          )}
        </header>

        {/* Tier Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTier(null)}
            className={`px-4 py-2 rounded-lg transition-all ${
              selectedTier === null
                ? "bg-primary-500 text-white shadow-glow-sm"
                : "bg-[#14142b] text-gray-300 border border-[#252545] hover:bg-[#1a1a3e]"
            }`}
          >
            All Tiers
          </button>
          {["elite", "strong", "moderate", "developing"].map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-4 py-2 rounded-lg transition-all capitalize ${
                selectedTier === tier
                  ? "bg-primary-500 text-white shadow-glow-sm"
                  : "bg-[#14142b] text-gray-300 border border-[#252545] hover:bg-[#1a1a3e]"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
            <p className="mt-2 text-gray-400">Loading elite traders...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-center">
            <p className="text-amber-300 font-medium mb-2">
              Trader data temporarily unavailable
            </p>
            <p className="text-sm text-amber-400/80">
              We're refreshing trader data. Please try again shortly.
            </p>
          </div>
        )}

        {/* Traders Table */}
        {data && data.traders && data.traders.length > 0 && (
          <div className="bg-[#14142b] rounded-xl border border-[#252545] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#252545] text-gray-400 text-sm">
                    <th className="text-left py-4 px-4 font-medium">Rank</th>
                    <th className="text-left py-4 px-4 font-medium">Trader</th>
                    <th className="text-center py-4 px-4 font-medium">Tier</th>
                    <th className="text-right py-4 px-4 font-medium">Elite Score</th>
                    <th className="text-right py-4 px-4 font-medium">Win Rate</th>
                    <th className="text-right py-4 px-4 font-medium">Total Profit</th>
                    <th className="text-right py-4 px-4 font-medium">Sharpe Ratio</th>
                    <th className="text-right py-4 px-4 font-medium">Max Drawdown</th>
                    <th className="text-right py-4 px-4 font-medium">Trades</th>
                    <th className="text-center py-4 px-4 font-medium">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {data.traders.map((trader, index) => (
                    <tr
                      key={trader.walletAddress}
                      className="border-b border-[#252545]/50 hover:bg-[#1a1a3e] transition-colors"
                    >
                      <td className="py-4 px-4">
                        <span className={`text-lg font-bold ${
                          index < 3 ? "text-yellow-400" : "text-gray-500"
                        }`}>
                          #{trader.rank || index + 1}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <span className="font-mono text-sm text-gray-200">
                            {formatAddress(trader.walletAddress)}
                          </span>
                          {trader.primaryCategory && (
                            <span className="ml-2 px-2 py-0.5 text-xs rounded bg-[#252545] text-gray-400">
                              {trader.primaryCategory}
                            </span>
                          )}
                        </div>
                        {trader.isRecommended && (
                          <span className="text-xs text-yellow-400 flex items-center gap-1 mt-1">
                            ⭐ Recommended
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getTierColor(trader.traderTier)}`}>
                          {trader.traderTier?.toUpperCase() || "N/A"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-lg font-bold text-primary-400">
                          {trader.eliteScore?.toFixed(1) || "-"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="font-semibold text-emerald-400">
                          {formatPercentage(trader.winRate || 0)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className={`font-mono font-semibold ${
                          (trader.totalProfit || 0) >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}>
                          {formatCurrency(trader.totalProfit || 0)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-gray-300">
                        {(trader.sharpeRatio || 0).toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-red-400">
                          {formatPercentage(trader.maxDrawdown || 0)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-gray-400">
                        {(trader.tradeCount || 0).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`text-sm font-medium capitalize ${getRiskColor(trader.riskProfile)}`}>
                          {trader.riskProfile || "N/A"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {data && data.traders && data.traders.length === 0 && !isLoading && !error && (
          <div className="text-center py-12 bg-[#14142b] rounded-xl border border-[#252545]">
            <p className="text-gray-400">No traders found for the selected tier.</p>
            <button
              onClick={() => setSelectedTier(null)}
              className="mt-4 text-primary-400 hover:text-primary-300"
            >
              View all traders
            </button>
          </div>
        )}

        {/* Scoring Explanation */}
        <section className="mt-8 p-6 bg-[#14142b] rounded-xl border border-[#252545]">
          <h2 className="text-lg font-semibold text-white mb-4">Elite Score Methodology</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-[#0a0a1a]">
              <p className="text-yellow-400 font-medium mb-1">Elite (90+)</p>
              <p className="text-gray-400">Top 1% performers with exceptional win rates, profit factors, and risk management.</p>
            </div>
            <div className="p-3 rounded-lg bg-[#0a0a1a]">
              <p className="text-emerald-400 font-medium mb-1">Strong (75-89)</p>
              <p className="text-gray-400">Consistently profitable traders with above-average risk-adjusted returns.</p>
            </div>
            <div className="p-3 rounded-lg bg-[#0a0a1a]">
              <p className="text-blue-400 font-medium mb-1">Moderate (60-74)</p>
              <p className="text-gray-400">Solid performers with good potential for improvement.</p>
            </div>
            <div className="p-3 rounded-lg bg-[#0a0a1a]">
              <p className="text-purple-400 font-medium mb-1">Developing (&lt;60)</p>
              <p className="text-gray-400">Traders building their track record with limited data.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
