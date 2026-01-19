"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const API_URL = "https://polybuddy-api-production.up.railway.app";

interface EliteTrader {
  walletAddress: string;
  eliteScore: number;
  traderTier: string;
  riskProfile: string;
  // User profile fields
  userName: string | null;
  xUsername: string | null;
  profileImage: string | null;
  verifiedBadge: boolean;
  // Performance metrics
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
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

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
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case "elite":
        return "bg-amber-500/20 text-amber-300 border-amber-500/50";
      case "strong":
        return "bg-teal-500/20 text-teal-300 border-teal-500/50";
      case "moderate":
        return "bg-sky-500/20 text-sky-300 border-sky-500/50";
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
    <main className="min-h-screen p-4 md:p-8 bg-[#0a0f14]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">Elite Traders</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium border border-amber-500/30">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
              </span>
              LIVE
            </span>
          </div>
          <p className="text-gray-400">
            Real top performing traders from Polymarket's leaderboard
          </p>

          {/* Stats Bar */}
          {data && (
            <div className="flex flex-wrap gap-4 mt-4 p-4 bg-[#111820] rounded-xl border border-[#243040]">
              <div>
                <p className="text-sm text-gray-400">Total Traders</p>
                <p className="text-2xl font-bold text-white">{data.total}</p>
              </div>
              <div className="border-l border-[#243040] pl-4">
                <p className="text-sm text-gray-400">Elite Tier</p>
                <p className="text-2xl font-bold text-amber-400">{data.eliteCount}</p>
              </div>
              <div className="border-l border-[#243040] pl-4">
                <p className="text-sm text-gray-400">Strong Tier</p>
                <p className="text-2xl font-bold text-teal-400">{data.strongCount}</p>
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
                ? "bg-teal-500 text-white shadow-glow-sm"
                : "bg-[#111820] text-gray-300 border border-[#243040] hover:bg-[#1a2332]"
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
                  ? "bg-teal-500 text-white shadow-glow-sm"
                  : "bg-[#111820] text-gray-300 border border-[#243040] hover:bg-[#1a2332]"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent"></div>
            <p className="mt-2 text-gray-400">Loading elite traders...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-6 text-center">
            <p className="text-rose-300 font-medium mb-2">
              Trader data temporarily unavailable
            </p>
            <p className="text-sm text-rose-400/80">
              We're refreshing trader data. Please try again shortly.
            </p>
          </div>
        )}

        {/* Traders Grid */}
        {data && data.traders && data.traders.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.traders.map((trader, index) => (
              <div
                key={trader.walletAddress}
                className="bg-[#111820] rounded-xl border border-[#243040] p-5 hover:border-teal-500/50 transition-all hover:shadow-glow-md"
              >
                {/* Header with rank and tier */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {/* Rank badge */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index < 3 
                        ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50" 
                        : "bg-gray-800 text-gray-400"
                    }`}>
                      #{trader.rank || index + 1}
                    </div>
                    
                    {/* Name and badges */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-lg">
                          {trader.userName || formatAddress(trader.walletAddress)}
                        </span>
                        {trader.verifiedBadge && (
                          <span className="text-blue-400" title="Verified on Polymarket">✓</span>
                        )}
                      </div>
                      {trader.xUsername && (
                        <a
                          href={`https://x.com/${trader.xUsername.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-400 hover:text-primary-400 transition-colors"
                        >
                          @{trader.xUsername.replace('@', '')}
                        </a>
                      )}
                    </div>
                  </div>
                  
                  {/* Tier badge */}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getTierColor(trader.traderTier)}`}>
                    {trader.traderTier?.toUpperCase() || "N/A"}
                  </span>
                </div>

                {/* Wallet address with copy and links */}
                <div className="flex items-center gap-2 mb-4 p-2 bg-[#0a0f14] rounded-lg">
                  <span className="font-mono text-sm text-gray-400 flex-1">
                    {formatAddress(trader.walletAddress)}
                  </span>
                  <button
                    onClick={() => copyAddress(trader.walletAddress)}
                    className="p-1.5 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white"
                    title="Copy address"
                  >
                    {copiedAddress === trader.walletAddress ? (
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  <a
                    href={`https://polymarket.com/profile/${trader.walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-primary-400"
                    title="View on Polymarket"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  <a
                    href={`https://polygonscan.com/address/${trader.walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-purple-400"
                    title="View on PolygonScan"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </a>
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-2 bg-[#0a0f14] rounded-lg">
                    <p className="text-xs text-gray-500">Elite Score</p>
                    <p className="text-lg font-bold text-teal-400">{trader.eliteScore?.toFixed(1) || "-"}</p>
                  </div>
                  <div className="p-2 bg-[#0a0f14] rounded-lg">
                    <p className="text-xs text-gray-500">Win Rate</p>
                    <p className="text-lg font-bold text-emerald-400">{formatPercentage(trader.winRate || 0)}</p>
                  </div>
                  <div className="p-2 bg-[#0a0f14] rounded-lg">
                    <p className="text-xs text-gray-500">Total Profit</p>
                    <p className={`text-lg font-bold ${(trader.totalProfit || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {formatCurrency(trader.totalProfit || 0)}
                    </p>
                  </div>
                  <div className="p-2 bg-[#0a0f14] rounded-lg">
                    <p className="text-xs text-gray-500">Volume</p>
                    <p className="text-lg font-bold text-white">{formatCurrency(trader.totalVolume || 0)}</p>
                  </div>
                </div>

                {/* Additional stats */}
                <div className="flex items-center justify-between text-sm border-t border-[#243040] pt-3">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">
                      <span className="text-gray-500">Sharpe:</span> {(trader.sharpeRatio || 0).toFixed(2)}
                    </span>
                    <span className="text-gray-400">
                      <span className="text-gray-500">DD:</span> <span className="text-red-400">{formatPercentage(trader.maxDrawdown || 0)}</span>
                    </span>
                  </div>
                  <span className={`font-medium capitalize ${getRiskColor(trader.riskProfile)}`}>
                    {trader.riskProfile || "N/A"}
                  </span>
                </div>

                {/* Recommended badge */}
                {trader.isRecommended && (
                  <div className="mt-3 py-2 px-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2">
                    <span className="text-amber-400">⭐</span>
                    <span className="text-sm text-amber-300">Recommended for copy trading</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {data && data.traders && data.traders.length === 0 && !isLoading && !error && (
          <div className="text-center py-12 bg-[#111820] rounded-xl border border-[#243040]">
            <p className="text-gray-400">No traders found for the selected tier.</p>
            <button
              onClick={() => setSelectedTier(null)}
              className="mt-4 text-teal-400 hover:text-teal-300"
            >
              View all traders
            </button>
          </div>
        )}

        {/* Scoring Explanation */}
        <section className="mt-8 p-6 bg-[#111820] rounded-xl border border-[#243040]">
          <h2 className="text-lg font-semibold text-white mb-4">Elite Score Methodology</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-[#0a0f14]">
              <p className="text-amber-400 font-medium mb-1">Elite (90+)</p>
              <p className="text-gray-400">Top 1% performers with exceptional win rates, profit factors, and risk management.</p>
            </div>
            <div className="p-3 rounded-lg bg-[#0a0f14]">
              <p className="text-teal-400 font-medium mb-1">Strong (75-89)</p>
              <p className="text-gray-400">Consistently profitable traders with above-average risk-adjusted returns.</p>
            </div>
            <div className="p-3 rounded-lg bg-[#0a0f14]">
              <p className="text-sky-400 font-medium mb-1">Moderate (60-74)</p>
              <p className="text-gray-400">Solid performers with good potential for improvement.</p>
            </div>
            <div className="p-3 rounded-lg bg-[#0a0f14]">
              <p className="text-purple-400 font-medium mb-1">Developing (&lt;60)</p>
              <p className="text-gray-400">Traders building their track record with limited data.</p>
            </div>
          </div>
          
          <p className="mt-4 text-xs text-gray-500">
            Data sourced from Polymarket's official leaderboard API. Traders shown have real verified performance on the platform.
          </p>
        </section>
      </div>
    </main>
  );
}
