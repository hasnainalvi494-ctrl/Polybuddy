"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

const API_URL = "https://polybuddy-api-production.up.railway.app";

interface Market {
  id: string;
  question: string;
  current_price: number;
  volume_24h: number;
  price_change_24h: number;
}

export default function ChartsListPage() {
  const { data: markets, isLoading } = useQuery<Market[]>({
    queryKey: ["markets-for-charts"],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_URL}/api/markets?limit=20`);
        const data = await response.json();
        return data.markets || [];
      } catch {
        return [];
      }
    },
    staleTime: 60000,
  });

  return (
    <main className="min-h-screen bg-[#0a0f14] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white">
              Advanced <span className="text-teal-400">Charts</span>
            </h1>
            <Link
              href="/home"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
            >
              ← Back
            </Link>
          </div>
          <p className="text-gray-400">
            Select a market to view professional trading charts
          </p>
        </div>

        {/* Featured Chart Tools */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl p-6">
            <div className="text-white/80 text-sm mb-2">Chart Types</div>
            <div className="text-2xl font-bold text-white mb-2">3+</div>
            <div className="text-white/70 text-sm">Line, Area, Candlestick</div>
          </div>

          <div className="bg-[#1a2332] border border-purple-500/30 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Indicators</div>
            <div className="text-2xl font-bold text-white mb-2">6+</div>
            <div className="text-gray-500 text-sm">SMA, EMA, RSI, MACD & more</div>
          </div>

          <div className="bg-[#1a2332] border border-amber-500/30 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Timeframes</div>
            <div className="text-2xl font-bold text-white mb-2">5</div>
            <div className="text-gray-500 text-sm">1H, 4H, 1D, 1W, 1M</div>
          </div>
        </div>

        {/* Markets List */}
        <div className="bg-[#1a2332] border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Select Market to Chart</h2>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto"></div>
              <p className="text-gray-400 mt-4">Loading markets...</p>
            </div>
          ) : markets && markets.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {markets.map((market) => (
                <Link
                  key={market.id}
                  href={`/charts/${market.id}`}
                  className="p-4 bg-gray-900/50 border border-gray-700 rounded-lg hover:border-teal-500 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-white font-medium group-hover:text-teal-400 transition-colors mb-2">
                        {market.question}
                      </h3>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500">
                          Price: {(market.current_price * 100).toFixed(1)}¢
                        </span>
                        {market.price_change_24h !== undefined && (
                          <span
                            className={`font-medium ${
                              market.price_change_24h >= 0
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {market.price_change_24h >= 0 ? "↑" : "↓"}{" "}
                            {Math.abs(market.price_change_24h).toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <svg
                      className="w-6 h-6 text-gray-500 group-hover:text-teal-400 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                </Link>
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
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-white font-medium mb-2">No Markets Available</h3>
              <p className="text-gray-400 text-sm">Check back later for charts</p>
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-[#1a2332] border border-teal-500/30 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-3">📊 Professional Charts</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>✓ Real-time price updates</li>
              <li>✓ Multiple timeframes (1H to 1M)</li>
              <li>✓ Technical indicators (SMA, EMA, RSI, MACD)</li>
              <li>✓ Volume analysis</li>
              <li>✓ Price change tracking</li>
            </ul>
          </div>

          <div className="bg-[#1a2332] border border-purple-500/30 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-3">🎯 Coming Soon</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>✓ Candlestick charts</li>
              <li>✓ Drawing tools (trend lines)</li>
              <li>✓ Chart pattern recognition</li>
              <li>✓ Multi-chart comparison</li>
              <li>✓ Export as image</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
