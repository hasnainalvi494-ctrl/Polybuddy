"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

const API_URL = "https://polybuddy-api-production.up.railway.app";

interface EliteTrader {
  wallet_address: string;
  display_name: string;
  avatar_url?: string;
  total_volume: number;
  win_rate: number;
  roi: number;
  total_trades: number;
  winning_trades: number;
  avg_bet_size: number;
  sharpe_ratio: number;
  max_drawdown: number;
  last_trade_at: string;
  elite_score: number;
  specialty?: string;
  current_streak?: number;
}

interface CopySettings {
  traderId: string;
  enabled: boolean;
  maxBetSize: number;
  minConfidence: number;
  autoSync: boolean;
}

export default function CopyTradingPage() {
  const [selectedTrader, setSelectedTrader] = useState<EliteTrader | null>(null);
  const [sortBy, setSortBy] = useState<"roi" | "winRate" | "volume" | "score">("score");
  const [showCopyModal, setShowCopyModal] = useState(false);

  // Fetch elite traders
  const { data: traders, isLoading } = useQuery<EliteTrader[]>({
    queryKey: ["elite-traders", sortBy],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/elite-traders?sort=${sortBy}`);
      return response.json();
    },
    staleTime: 30000,
  });

  // Mock copy settings (would come from user's settings)
  const copiedTraders = new Set<string>([]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return { emoji: "🥇", color: "from-amber-500 to-yellow-500" };
    if (index === 1) return { emoji: "🥈", color: "from-gray-400 to-gray-500" };
    if (index === 2) return { emoji: "🥉", color: "from-orange-600 to-orange-700" };
    return { emoji: `#${index + 1}`, color: "from-gray-700 to-gray-800" };
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-400";
    if (score >= 75) return "text-teal-400";
    if (score >= 60) return "text-amber-400";
    return "text-gray-400";
  };

  return (
    <main className="min-h-screen bg-[#0a0f14] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white">
              Copy <span className="text-teal-400">Trading</span>
            </h1>
            <Link
              href="/home"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
            >
              ← Back
            </Link>
          </div>
          <p className="text-gray-400">
            Automatically copy trades from top-performing elite traders
          </p>
        </div>

        {/* Copy Trading Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl p-6">
            <div className="text-white/80 text-sm mb-2">Elite Traders</div>
            <div className="text-3xl font-bold text-white">{traders?.length || 0}</div>
            <div className="text-sm text-white/70 mt-1">Available to copy</div>
          </div>

          <div className="bg-[#1a2332] border border-green-500/30 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Avg Win Rate</div>
            <div className="text-3xl font-bold text-white">
              {traders
                ? (
                    traders.reduce((sum, t) => sum + t.win_rate, 0) / traders.length
                  ).toFixed(1)
                : 0}
              %
            </div>
            <div className="text-sm text-gray-500 mt-1">Across all traders</div>
          </div>

          <div className="bg-[#1a2332] border border-purple-500/30 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Avg ROI</div>
            <div className="text-3xl font-bold text-white">
              {traders
                ? formatPercent(
                    traders.reduce((sum, t) => sum + t.roi, 0) / traders.length
                  )
                : "+0%"}
            </div>
            <div className="text-sm text-gray-500 mt-1">Return on investment</div>
          </div>

          <div className="bg-[#1a2332] border border-amber-500/30 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Active Copies</div>
            <div className="text-3xl font-bold text-white">{copiedTraders.size}</div>
            <div className="text-sm text-gray-500 mt-1">Traders you're copying</div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">📚 How Copy Trading Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                1
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">Choose a Trader</h3>
                <p className="text-gray-400 text-sm">
                  Browse elite traders and pick one with a strategy you like
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                2
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">Set Your Rules</h3>
                <p className="text-gray-400 text-sm">
                  Configure bet size, confidence threshold, and risk limits
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                3
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">Auto-Sync Trades</h3>
                <p className="text-gray-400 text-sm">
                  When they bet, you bet automatically (within your limits)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Elite Traders Leaderboard</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy("score")}
              className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                sortBy === "score"
                  ? "bg-teal-500 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              Elite Score
            </button>
            <button
              onClick={() => setSortBy("roi")}
              className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                sortBy === "roi"
                  ? "bg-teal-500 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              ROI
            </button>
            <button
              onClick={() => setSortBy("winRate")}
              className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                sortBy === "winRate"
                  ? "bg-teal-500 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              Win Rate
            </button>
          </div>
        </div>

        {/* Traders List */}
        <div className="bg-[#1a2332] border border-gray-700 rounded-xl p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto"></div>
              <p className="text-gray-400 mt-4">Loading elite traders...</p>
            </div>
          ) : traders && traders.length > 0 ? (
            <div className="space-y-4">
              {traders.map((trader, index) => {
                const rank = getRankBadge(index);
                const isCopying = copiedTraders.has(trader.wallet_address);

                return (
                  <div
                    key={trader.wallet_address}
                    className={`relative bg-gray-900/50 border rounded-xl p-6 hover:border-teal-500/50 transition-all ${
                      isCopying ? "border-teal-500 bg-teal-500/5" : "border-gray-700"
                    }`}
                  >
                    {/* Rank Badge */}
                    <div className="absolute -top-3 -left-3 z-10">
                      <div
                        className={`w-12 h-12 bg-gradient-to-br ${rank.color} rounded-full flex items-center justify-center text-white font-bold shadow-lg`}
                      >
                        {rank.emoji}
                      </div>
                    </div>

                    {isCopying && (
                      <div className="absolute top-4 right-4">
                        <span className="px-3 py-1 bg-teal-500 text-white rounded-full text-xs font-bold flex items-center gap-1">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Copying
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Trader Info */}
                      <div className="lg:col-span-4">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                            {trader.display_name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">
                              {trader.display_name}
                            </h3>
                            <p className="text-gray-500 text-sm font-mono">
                              {trader.wallet_address.substring(0, 8)}...
                            </p>
                          </div>
                        </div>
                        {trader.specialty && (
                          <div className="mb-2">
                            <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-medium">
                              {trader.specialty}
                            </span>
                          </div>
                        )}
                        {trader.current_streak && trader.current_streak > 0 && (
                          <div className="text-sm text-amber-400">
                            🔥 {trader.current_streak} win streak
                          </div>
                        )}
                      </div>

                      {/* Performance Metrics */}
                      <div className="lg:col-span-5">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-gray-500 text-xs mb-1">Elite Score</div>
                            <div
                              className={`text-2xl font-bold ${getScoreColor(
                                trader.elite_score
                              )}`}
                            >
                              {trader.elite_score.toFixed(0)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500 text-xs mb-1">Win Rate</div>
                            <div className="text-2xl font-bold text-white">
                              {trader.win_rate.toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500 text-xs mb-1">ROI</div>
                            <div
                              className={`text-2xl font-bold ${
                                trader.roi >= 0 ? "text-green-400" : "text-red-400"
                              }`}
                            >
                              {formatPercent(trader.roi)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500 text-xs mb-1">Sharpe Ratio</div>
                            <div className="text-2xl font-bold text-white">
                              {trader.sharpe_ratio.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500 text-xs mb-1">Total Volume</div>
                            <div className="text-lg font-bold text-white">
                              {formatCurrency(trader.total_volume)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500 text-xs mb-1">Avg Bet</div>
                            <div className="text-lg font-bold text-white">
                              {formatCurrency(trader.avg_bet_size)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="lg:col-span-3 flex flex-col gap-3">
                        <button
                          onClick={() => {
                            setSelectedTrader(trader);
                            setShowCopyModal(true);
                          }}
                          className={`px-6 py-3 rounded-lg font-bold transition-all ${
                            isCopying
                              ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                              : "bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
                          }`}
                        >
                          {isCopying ? "Manage Copy" : "Start Copying"}
                        </button>
                        <Link
                          href={`/elite-traders/${trader.wallet_address}`}
                          className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-center text-sm"
                        >
                          View Profile
                        </Link>
                      </div>
                    </div>

                    {/* Performance Bar */}
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-500">Win/Loss</span>
                        <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-400 h-full"
                            style={{ width: `${trader.win_rate}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">
                          {trader.winning_trades}W / {trader.total_trades - trader.winning_trades}
                          L
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-white font-medium mb-2">No Elite Traders Found</h3>
              <p className="text-gray-400 text-sm">Check back later for top performers</p>
            </div>
          )}
        </div>

        {/* Premium Upgrade Banner */}
        <div className="mt-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-lg mb-2">
                Unlock Premium Copy Trading 🚀
              </h3>
              <ul className="text-white/80 text-sm space-y-1">
                <li>✨ Copy up to 10 traders simultaneously</li>
                <li>✨ Advanced risk management settings</li>
                <li>✨ Real-time trade sync notifications</li>
                <li>✨ Performance analytics & tracking</li>
              </ul>
            </div>
            <button className="px-6 py-3 bg-white text-purple-600 font-bold rounded-lg hover:bg-gray-100 transition-colors whitespace-nowrap">
              Upgrade Now
            </button>
          </div>
        </div>
      </div>

      {/* Copy Settings Modal (Placeholder) */}
      {showCopyModal && selectedTrader && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a2332] border border-gray-700 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">
              Copy {selectedTrader.display_name}
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Max Bet Size ($)</label>
                <input
                  type="number"
                  placeholder="100"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">
                  Min Confidence (%)
                </label>
                <input
                  type="number"
                  placeholder="70"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-teal-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="auto-sync" className="w-5 h-5" />
                <label htmlFor="auto-sync" className="text-white">
                  Enable auto-sync
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCopyModal(false)}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Save copy settings
                  setShowCopyModal(false);
                }}
                className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors font-bold"
              >
                Start Copying
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
