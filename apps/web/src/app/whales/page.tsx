"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

const API_URL = "https://polybuddy-api-production.up.railway.app";

interface WhaleActivity {
  id: string;
  walletAddress: string;
  marketId: string;
  internalMarketId: string | null;
  marketName: string;
  action: string;
  outcome: string;
  amountUsd: number;
  price: number | null;
  priceImpact: number | null;
  timestamp: string;
  isHot: boolean;
}

interface WhaleResponse {
  trades: WhaleActivity[];
  lastUpdated: string;
}

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diff = now - time;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatAmount(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

function formatAddress(address: string): string {
  if (!address) return "Unknown";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatPrice(price: number | null): string {
  if (price === null) return "-";
  return `${(price * 100).toFixed(1)}¢`;
}

type FilterType = "all" | "buys" | "sells";
type AmountFilter = "all" | "10k" | "50k" | "100k";

export default function WhaleActivityPage() {
  const [actionFilter, setActionFilter] = useState<FilterType>("all");
  const [amountFilter, setAmountFilter] = useState<AmountFilter>("all");

  const { data, isLoading, error, refetch } = useQuery<WhaleResponse>({
    queryKey: ["whale-activity-page"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/whale-activity?limit=50`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error("Failed to fetch whale activity");
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Filter trades
  const filteredTrades = data?.trades?.filter((trade) => {
    // Action filter
    if (actionFilter === "buys" && trade.action !== "buy") return false;
    if (actionFilter === "sells" && trade.action !== "sell") return false;

    // Amount filter
    if (amountFilter === "10k" && trade.amountUsd < 10000) return false;
    if (amountFilter === "50k" && trade.amountUsd < 50000) return false;
    if (amountFilter === "100k" && trade.amountUsd < 100000) return false;

    return true;
  }) || [];

  return (
    <main className="min-h-screen bg-[#0a0a1a]">
      {/* Header */}
      <div className="bg-[#111820] border-b border-[#243040]">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">🐋</span>
                <h1 className="text-3xl font-bold text-white">Whale Activity</h1>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-gray-400">
                Track big money moves in real-time. See what whales are betting on.
              </p>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="px-4 py-2 bg-[#243040] hover:bg-[#2d3a4d] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <svg
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Action Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Action:</span>
            <div className="flex gap-1">
              {[
                { value: "all", label: "All" },
                { value: "buys", label: "Buys" },
                { value: "sells", label: "Sells" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setActionFilter(option.value as FilterType)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    actionFilter === option.value
                      ? "bg-teal-500 text-white"
                      : "bg-[#1a2332] text-gray-400 hover:bg-[#243040]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Min Amount:</span>
            <div className="flex gap-1">
              {[
                { value: "all", label: "Any" },
                { value: "10k", label: "$10K+" },
                { value: "50k", label: "$50K+" },
                { value: "100k", label: "$100K+" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setAmountFilter(option.value as AmountFilter)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    amountFilter === option.value
                      ? "bg-teal-500 text-white"
                      : "bg-[#1a2332] text-gray-400 hover:bg-[#243040]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Trade Count */}
          <div className="ml-auto text-sm text-gray-500">
            {filteredTrades.length} trades
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-700 border-t-teal-500"></div>
            <p className="mt-4 text-gray-500">Loading whale activity...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
            <p className="text-red-400 mb-2">Failed to load whale activity</p>
            <button
              onClick={() => refetch()}
              className="text-sm text-red-400 hover:text-red-300 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Whale Feed */}
        {!isLoading && !error && (
          <div className="space-y-3">
            {filteredTrades.length === 0 ? (
              <div className="text-center py-16 bg-[#111820] rounded-xl border border-[#243040]">
                <span className="text-4xl mb-4 block">🐋</span>
                <p className="text-gray-400 mb-2">No whale activity found</p>
                <p className="text-sm text-gray-500">
                  Try adjusting your filters or check back later
                </p>
              </div>
            ) : (
              filteredTrades.map((trade) => (
                <div
                  key={trade.id}
                  className={`p-4 rounded-xl border transition-all hover:scale-[1.01] ${
                    trade.action === "buy"
                      ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40"
                      : "bg-red-500/5 border-red-500/20 hover:border-red-500/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Trade Info */}
                    <div className="flex-1 min-w-0">
                      {/* Time & Action Badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded ${
                            trade.action === "buy"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {trade.action === "buy" ? "BUY" : "SELL"} {trade.outcome.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(trade.timestamp)}
                        </span>
                        {trade.isHot && (
                          <span className="px-2 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded animate-pulse">
                            🔥 HOT
                          </span>
                        )}
                      </div>

                      {/* Market Name */}
                      <p className="text-white font-medium mb-2 line-clamp-2">
                        {trade.marketName || "Unknown Market"}
                      </p>

                      {/* Whale Address */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Whale:</span>
                        <Link
                          href={`/elite-traders/${trade.walletAddress}`}
                          className="font-mono text-gray-300 hover:text-teal-400 transition-colors"
                        >
                          {formatAddress(trade.walletAddress)}
                        </Link>
                      </div>
                    </div>

                    {/* Right: Amount & Price */}
                    <div className="text-right shrink-0">
                      <p
                        className={`text-2xl font-bold ${
                          trade.action === "buy" ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {formatAmount(trade.amountUsd)}
                      </p>
                      {trade.price && (
                        <p className="text-sm text-gray-500">@ {formatPrice(trade.price)}</p>
                      )}
                      {trade.priceImpact !== null && Math.abs(trade.priceImpact) > 1 && (
                        <p
                          className={`text-xs mt-1 ${
                            trade.priceImpact > 0 ? "text-emerald-500" : "text-red-500"
                          }`}
                        >
                          {trade.priceImpact > 0 ? "+" : ""}
                          {trade.priceImpact.toFixed(1)}% impact
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[#243040]">
                    <Link
                      href={`/elite-traders/${trade.walletAddress}`}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[#1a2332] hover:bg-[#243040] text-gray-300 hover:text-white rounded-lg text-sm transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      Watch Wallet
                    </Link>
                    {trade.internalMarketId ? (
                      <Link
                        href={`/markets/${trade.internalMarketId}`}
                        className="flex items-center gap-2 px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 rounded-lg text-sm transition-colors border border-teal-500/30"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                          />
                        </svg>
                        View Market
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-600">Market not in database</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Last Updated */}
        {data?.lastUpdated && (
          <div className="mt-6 text-center text-xs text-gray-600">
            Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
          </div>
        )}
      </div>
    </main>
  );
}
