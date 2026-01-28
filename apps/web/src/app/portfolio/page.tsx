"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

const API_URL = "https://polybuddy-api-production.up.railway.app";

interface PortfolioMetrics {
  totalValue: number;
  totalPnL: number;
  pnLPercentage: number;
  winRate: number;
  activePositions: number;
  closedPositions: number;
  sharpeRatio: number;
  maxDrawdown: number;
  roi: number;
}

interface Position {
  id: string;
  marketId: string;
  marketQuestion: string;
  outcome: "yes" | "no";
  shares: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercentage: number;
  openedAt: string;
}

export default function PortfolioPage() {
  const [timeframe, setTimeframe] = useState<"1D" | "1W" | "1M" | "ALL">("1M");

  // Fetch portfolio metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<PortfolioMetrics>({
    queryKey: ["portfolio-metrics", timeframe],
    queryFn: async () => {
      // TODO: Replace with real API call when backend is ready
      // const response = await fetch(`${API_URL}/api/portfolio/metrics?timeframe=${timeframe}`);
      // return response.json();
      
      // Mock data for now
      return {
        totalValue: 12547.23,
        totalPnL: 2547.23,
        pnLPercentage: 25.47,
        winRate: 76.3,
        activePositions: 8,
        closedPositions: 47,
        sharpeRatio: 1.82,
        maxDrawdown: -12.4,
        roi: 185.3,
      };
    },
    staleTime: 30000,
  });

  // Fetch active positions
  const { data: positions, isLoading: positionsLoading } = useQuery<Position[]>({
    queryKey: ["portfolio-positions"],
    queryFn: async () => {
      // TODO: Replace with real API call
      // const response = await fetch(`${API_URL}/api/portfolio/positions`);
      // return response.json();
      
      // Mock data
      return [
        {
          id: "1",
          marketId: "market-1",
          marketQuestion: "Will Bitcoin hit $100K by end of 2026?",
          outcome: "yes",
          shares: 100,
          avgPrice: 0.67,
          currentPrice: 0.72,
          value: 72,
          pnl: 5,
          pnlPercentage: 7.46,
          openedAt: "2026-01-15T10:30:00Z",
        },
        {
          id: "2",
          marketId: "market-2",
          marketQuestion: "Will Trump win 2026 midterms?",
          outcome: "no",
          shares: 200,
          avgPrice: 0.45,
          currentPrice: 0.38,
          value: 76,
          pnl: -14,
          pnlPercentage: -15.56,
          openedAt: "2026-01-10T14:20:00Z",
        },
        {
          id: "3",
          marketId: "market-3",
          marketQuestion: "Will Fed cut rates in Q1 2026?",
          outcome: "yes",
          shares: 150,
          avgPrice: 0.52,
          currentPrice: 0.61,
          value: 91.5,
          pnl: 13.5,
          pnlPercentage: 17.31,
          openedAt: "2026-01-05T09:15:00Z",
        },
      ];
    },
    staleTime: 30000,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <main className="min-h-screen bg-[#0a0f14] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white">
              Portfolio <span className="text-teal-400">Analytics</span>
            </h1>
            <Link
              href="/home"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
            >
              ← Back
            </Link>
          </div>
          <p className="text-gray-400">Professional-grade portfolio tracking and analytics</p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex gap-2 mb-6">
          {(["1D", "1W", "1M", "ALL"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                timeframe === tf
                  ? "bg-teal-500 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Value */}
          <div className="bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl p-6">
            <div className="text-white/80 text-sm mb-2">Total Value</div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatCurrency(metrics?.totalValue || 0)}
            </div>
            <div
              className={`text-sm font-medium ${
                (metrics?.pnLPercentage || 0) >= 0 ? "text-green-300" : "text-red-300"
              }`}
            >
              {formatPercent(metrics?.pnLPercentage || 0)}
            </div>
          </div>

          {/* Win Rate */}
          <div className="bg-[#1a2332] border border-purple-500/30 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Win Rate</div>
            <div className="text-3xl font-bold text-white mb-1">
              {metrics?.winRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">
              {metrics?.activePositions + (metrics?.closedPositions || 0)} total bets
            </div>
          </div>

          {/* Sharpe Ratio */}
          <div className="bg-[#1a2332] border border-amber-500/30 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Sharpe Ratio</div>
            <div className="text-3xl font-bold text-white mb-1">
              {metrics?.sharpeRatio.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">Risk-adjusted returns</div>
          </div>

          {/* Max Drawdown */}
          <div className="bg-[#1a2332] border border-red-500/30 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Max Drawdown</div>
            <div className="text-3xl font-bold text-white mb-1">
              {metrics?.maxDrawdown.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">Peak to trough</div>
          </div>
        </div>

        {/* P&L Chart Placeholder */}
        <div className="bg-[#1a2332] border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Portfolio Performance</h2>
          <div className="h-64 flex items-center justify-center border border-gray-700 rounded-lg bg-gray-900/30">
            <div className="text-center">
              <svg
                className="w-16 h-16 text-gray-600 mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                />
              </svg>
              <p className="text-gray-400 text-sm">Interactive chart coming soon</p>
              <p className="text-gray-500 text-xs mt-1">
                Will show P&L over time with annotations
              </p>
            </div>
          </div>
        </div>

        {/* Active Positions */}
        <div className="bg-[#1a2332] border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Active Positions</h2>
            <span className="px-3 py-1 bg-teal-500/20 text-teal-400 rounded-full text-sm">
              {metrics?.activePositions || 0} open
            </span>
          </div>

          {positionsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto"></div>
              <p className="text-gray-400 mt-4">Loading positions...</p>
            </div>
          ) : positions && positions.length > 0 ? (
            <div className="space-y-3">
              {positions.map((position) => (
                <div
                  key={position.id}
                  className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <Link
                        href={`/markets/${position.marketId}`}
                        className="text-white hover:text-teal-400 transition-colors font-medium"
                      >
                        {position.marketQuestion}
                      </Link>
                      <div className="flex items-center gap-3 mt-2 text-sm">
                        <span
                          className={`px-2 py-1 rounded ${
                            position.outcome === "yes"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {position.outcome.toUpperCase()}
                        </span>
                        <span className="text-gray-500">
                          {position.shares} shares @ {(position.avgPrice * 100).toFixed(0)}¢
                        </span>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-500">{formatDate(position.openedAt)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold mb-1">
                        {formatCurrency(position.value)}
                      </div>
                      <div
                        className={`text-sm font-medium ${
                          position.pnl >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {formatPercent(position.pnlPercentage)} ({formatCurrency(position.pnl)})
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full ${
                          position.pnl >= 0 ? "bg-green-500" : "bg-red-500"
                        }`}
                        style={{
                          width: `${Math.min(Math.abs(position.pnlPercentage), 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      Current: {(position.currentPrice * 100).toFixed(0)}¢
                    </span>
                  </div>
                </div>
              ))}
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
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
              </div>
              <h3 className="text-white font-medium mb-2">No Active Positions</h3>
              <p className="text-gray-400 text-sm mb-4">
                Connect your wallet or place your first bet to see positions here
              </p>
              <Link
                href="/best-bets"
                className="inline-block px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors"
              >
                Browse Best Bets
              </Link>
            </div>
          )}
        </div>

        {/* Coming Soon Banner */}
        <div className="mt-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-lg mb-2">
                Premium Analytics Coming Soon 🚀
              </h3>
              <p className="text-white/80 text-sm">
                Advanced charts, risk heatmaps, tax reporting, and more!
              </p>
            </div>
            <button className="px-6 py-3 bg-white text-purple-600 font-bold rounded-lg hover:bg-gray-100 transition-colors">
              Notify Me
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
