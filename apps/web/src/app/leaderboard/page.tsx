"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { getLeaderboard, getLeaderboardCategories, type Trader } from "@/lib/api";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatProfit(profit: number): string {
  const sign = profit >= 0 ? "+" : "";
  return `${sign}$${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getProfitColor(profit: number): string {
  return profit >= 0 ? "text-emerald-400" : "text-rose-400";
}

function getWinRateColor(winRate: number): string {
  if (winRate >= 80) return "text-emerald-400";
  if (winRate >= 60) return "text-amber-400";
  return "text-rose-400";
}

function getRankBadge(rank: number) {
  if (rank === 1) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-2xl">🥇</span>
        <span className="text-yellow-400 font-bold text-lg">#1</span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-2xl">🥈</span>
        <span className="text-gray-300 font-bold text-lg">#2</span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-2xl">🥉</span>
        <span className="text-orange-400 font-bold text-lg">#3</span>
      </div>
    );
  }
  return <span className="text-gray-400 font-semibold">#{rank}</span>;
}

function formatWalletAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ============================================================================
// MOBILE CARD COMPONENT
// ============================================================================

function TraderCard({ trader }: { trader: Trader }) {
  const canCopyTrade = trader.winRate >= 85;

  return (
    <Link
      href={`/traders/${trader.walletAddress}`}
      className="block bg-gray-900/80 backdrop-blur-sm rounded-xl p-4 border border-gray-800/50 hover:border-emerald-500/30 transition-all duration-200 transform hover:scale-[1.01]"
    >
      {/* Rank & Copy Trade Badge */}
      <div className="flex items-center justify-between mb-3">
        {getRankBadge(trader.rank)}
        {canCopyTrade && (
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30">
            ⭐ COPY TRADE
          </span>
        )}
      </div>

      {/* Wallet Address */}
      <div className="mb-3">
        <p className="text-xs text-gray-500 mb-1">Wallet</p>
        <p className="text-gray-200 font-mono text-sm">{formatWalletAddress(trader.walletAddress)}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Total Profit</p>
          <p className={`text-lg font-bold ${getProfitColor(trader.totalProfit)}`}>
            {formatProfit(trader.totalProfit)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Win Rate</p>
          <p className={`text-lg font-bold ${getWinRateColor(trader.winRate)}`}>
            {trader.winRate.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">ROI</p>
          <p className="text-gray-200 font-semibold">{trader.roiPercent.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Trades</p>
          <p className="text-gray-200 font-semibold">{trader.tradeCount.toLocaleString()}</p>
        </div>
      </div>

      {/* Category & Active Positions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-800/50">
        <span className="text-xs text-gray-500">
          {trader.primaryCategory || "Mixed"}
        </span>
        <span className="text-xs text-gray-500">
          {trader.activePositions} active positions
        </span>
      </div>
    </Link>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function LeaderboardPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<"profit" | "winRate" | "roi" | "volume">("profit");

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["leaderboardCategories"],
    queryFn: getLeaderboardCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch leaderboard
  const { data: leaderboardData, isLoading, error } = useQuery({
    queryKey: ["leaderboard", selectedCategory, sortBy],
    queryFn: () => getLeaderboard({
      category: selectedCategory,
      sort: sortBy,
      limit: 100,
    }),
    staleTime: 30 * 1000, // 30 seconds
  });

  const categories = categoriesData?.categories || [];
  const traders = leaderboardData?.traders || [];

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900/50 border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-100 mb-2">
                🏆 Top Traders Leaderboard
              </h1>
              <p className="text-gray-400">
                Follow the best traders and copy their winning strategies
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors text-sm font-semibold"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${
                selectedCategory === undefined
                  ? "bg-emerald-500 text-gray-950"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.category}
                onClick={() => setSelectedCategory(cat.category)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === cat.category
                    ? "bg-emerald-500 text-gray-950"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {cat.category} ({cat.traderCount})
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-400 font-semibold">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-4 py-2 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="profit">Total Profit</option>
              <option value="winRate">Win Rate</option>
              <option value="roi">ROI %</option>
              <option value="volume">Trade Volume</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-700 border-t-emerald-500"></div>
            <p className="mt-4 text-sm text-gray-500">Loading traders...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-rose-400">
            Unable to load leaderboard. Please refresh the page.
          </div>
        )}

        {/* Desktop Table */}
        {!isLoading && !error && (
          <>
            <div className="hidden lg:block bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-800/50 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-800/50 border-b border-gray-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Wallet
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Total Profit
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Win Rate
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">
                      ROI
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Trades
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {traders.map((trader) => {
                    const canCopyTrade = trader.winRate >= 85;
                    return (
                      <tr
                        key={trader.walletAddress}
                        className="hover:bg-gray-800/30 transition-colors cursor-pointer"
                        onClick={() => window.location.href = `/traders/${trader.walletAddress}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getRankBadge(trader.rank)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-gray-200">
                              {formatWalletAddress(trader.walletAddress)}
                            </span>
                            {canCopyTrade && (
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded uppercase border border-emerald-500/30">
                                Copy
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className={`font-bold text-sm ${getProfitColor(trader.totalProfit)}`}>
                            {formatProfit(trader.totalProfit)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className={`font-bold text-sm ${getWinRateColor(trader.winRate)}`}>
                            {trader.winRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-gray-300 font-semibold text-sm">
                            {trader.roiPercent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-gray-300 font-semibold text-sm">
                            {trader.tradeCount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-gray-400 text-sm capitalize">
                            {trader.primaryCategory || "Mixed"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-gray-500 text-xs">
                            {trader.activePositions} active
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {traders.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400">No traders found in this category.</p>
                </div>
              )}
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {traders.map((trader) => (
                <TraderCard key={trader.walletAddress} trader={trader} />
              ))}

              {traders.length === 0 && (
                <div className="text-center py-12 bg-gray-900/80 rounded-xl border border-gray-800/50">
                  <p className="text-gray-400">No traders found in this category.</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Stats Footer */}
        {!isLoading && !error && leaderboardData && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Showing {traders.length} of {leaderboardData.totalTraders} traders
          </div>
        )}
      </div>
    </main>
  );
}

