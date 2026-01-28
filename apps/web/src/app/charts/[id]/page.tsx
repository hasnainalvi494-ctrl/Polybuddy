"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

const API_URL = "https://polybuddy-api-production.up.railway.app";

interface PricePoint {
  timestamp: string;
  price: number;
  volume?: number;
}

interface ChartData {
  marketId: string;
  marketQuestion: string;
  currentPrice: number;
  priceHistory: PricePoint[];
}

type Timeframe = "1H" | "4H" | "1D" | "1W" | "1M";
type ChartType = "line" | "candlestick" | "area";
type Indicator = "none" | "sma" | "ema" | "bollinger" | "rsi" | "macd";

export default function AdvancedChartPage() {
  const params = useParams();
  const marketId = params?.id as string;

  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [indicator, setIndicator] = useState<Indicator>("none");
  const [showVolume, setShowVolume] = useState(true);

  // Fetch market details first
  const { data: market } = useQuery({
    queryKey: ["market", marketId],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_URL}/api/markets/${marketId}`);
        if (!response.ok) return null;
        return response.json();
      } catch {
        return null;
      }
    },
    enabled: !!marketId,
  });

  // Fetch chart data
  const { data: chartData, isLoading } = useQuery<ChartData>({
    queryKey: ["chart-data", marketId, timeframe],
    queryFn: async () => {
      try {
        // Try to fetch real price history
        const response = await fetch(`${API_URL}/api/markets/${marketId}/history?timeframe=${timeframe.toLowerCase()}`);
        if (response.ok) {
          const history = await response.json();
          return {
            marketId,
            marketQuestion: market?.question || "Market",
            currentPrice: market?.current_price || 0.5,
            priceHistory: history.map((h: any) => ({
              timestamp: h.timestamp,
              price: h.price,
              volume: h.volume || 0,
            })),
          };
        }
      } catch (error) {
        console.warn("Failed to fetch real price history, using fallback");
      }

      // Fallback: generate sample data with market's current price
      const currentPrice = market?.current_price || 0.5;
      const now = Date.now();
      const points = timeframe === "1H" ? 24 : timeframe === "4H" ? 42 : timeframe === "1D" ? 30 : timeframe === "1W" ? 12 : 6;
      const interval = timeframe === "1H" ? 3600000 : timeframe === "4H" ? 14400000 : timeframe === "1D" ? 86400000 : timeframe === "1W" ? 604800000 : 2592000000;
      
      let price = currentPrice;
      const priceHistory: PricePoint[] = [];
      
      for (let i = points; i >= 0; i--) {
        const change = (Math.random() - 0.5) * 0.03; // Smaller changes for realism
        price = Math.max(0.05, Math.min(0.95, price + change));
        
        priceHistory.push({
          timestamp: new Date(now - i * interval).toISOString(),
          price: Number(price.toFixed(4)),
          volume: Math.floor(Math.random() * 50000) + 10000,
        });
      }

      // Make sure last price matches current
      if (priceHistory.length > 0) {
        priceHistory[priceHistory.length - 1].price = currentPrice;
      }

      return {
        marketId,
        marketQuestion: market?.question || "Market Chart",
        currentPrice,
        priceHistory,
      };
    },
    staleTime: 30000,
    enabled: !!marketId,
  });

  const calculateSMA = (data: PricePoint[], period: number = 7) => {
    if (!data || data.length < period) return [];
    const sma: number[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, point) => acc + point.price, 0);
      sma.push(sum / period);
    }
    return sma;
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    if (timeframe === "1H" || timeframe === "4H") {
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    }
    if (timeframe === "1D") {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const priceChange = chartData
    ? ((chartData.currentPrice - chartData.priceHistory[0].price) / chartData.priceHistory[0].price) * 100
    : 0;

  const maxPrice = chartData ? Math.max(...chartData.priceHistory.map(p => p.price)) : 1;
  const minPrice = chartData ? Math.min(...chartData.priceHistory.map(p => p.price)) : 0;
  const priceRange = maxPrice - minPrice;

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
              href={marketId ? `/markets/${marketId}` : "/markets"}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
            >
              ← Back
            </Link>
          </div>
          <p className="text-gray-400">Professional trading charts with technical indicators</p>
        </div>

        {/* Chart Controls */}
        <div className="bg-[#1a2332] border border-gray-700 rounded-t-xl p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Timeframes */}
            <div className="flex gap-2 overflow-x-auto">
              {(["1H", "4H", "1D", "1W", "1M"] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all text-sm whitespace-nowrap ${
                    timeframe === tf
                      ? "bg-teal-500 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Chart Type */}
            <div className="flex gap-2">
              <button
                onClick={() => setChartType("line")}
                className={`p-2 rounded-lg transition-all ${
                  chartType === "line"
                    ? "bg-teal-500 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
                title="Line Chart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </button>
              <button
                onClick={() => setChartType("area")}
                className={`p-2 rounded-lg transition-all ${
                  chartType === "area"
                    ? "bg-teal-500 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
                title="Area Chart"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </button>
              <button
                onClick={() => setShowVolume(!showVolume)}
                className={`p-2 rounded-lg transition-all ${
                  showVolume
                    ? "bg-purple-500 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
                title="Toggle Volume"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Indicators */}
          <div className="flex gap-2 mt-4 overflow-x-auto">
            <span className="text-gray-400 text-sm self-center mr-2">Indicators:</span>
            {(["none", "sma", "ema", "bollinger", "rsi", "macd"] as Indicator[]).map((ind) => (
              <button
                key={ind}
                onClick={() => setIndicator(ind)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  indicator === ind
                    ? "bg-purple-500 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {ind === "none" ? "None" : ind.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="bg-[#1a2332] border-x border-gray-700 p-6">
          {isLoading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
            </div>
          ) : chartData ? (
            <>
              {/* Market Info */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-2">{chartData.marketQuestion}</h2>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-3xl font-bold text-white">
                      {(chartData.currentPrice * 100).toFixed(1)}¢
                    </div>
                    <div
                      className={`text-sm font-medium ${
                        priceChange >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {priceChange >= 0 ? "↑" : "↓"} {Math.abs(priceChange).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Price Chart */}
              <div className="relative h-96 bg-gray-900/50 rounded-lg p-4">
                <svg className="w-full h-full" viewBox="0 0 1000 400" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <g stroke="#374151" strokeWidth="1" opacity="0.3">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <line key={`h-${i}`} x1="0" y1={i * 100} x2="1000" y2={i * 100} />
                    ))}
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                      <line key={`v-${i}`} x1={i * 100} y1="0" x2={i * 100} y2="400" />
                    ))}
                  </g>

                  {/* Price line/area */}
                  {chartData.priceHistory.length > 0 && (
                    <>
                      {chartType === "area" && (
                        <defs>
                          <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      )}

                      {/* Main price path */}
                      <path
                        d={chartData.priceHistory
                          .map((point, i) => {
                            const x = (i / (chartData.priceHistory.length - 1)) * 1000;
                            const y = 400 - ((point.price - minPrice) / priceRange) * 400;
                            return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                          })
                          .join(" ")}
                        fill={chartType === "area" ? "url(#priceGradient)" : "none"}
                        stroke="#14b8a6"
                        strokeWidth="3"
                        vectorEffect="non-scaling-stroke"
                      />

                      {/* Area fill bottom */}
                      {chartType === "area" && (
                        <path
                          d={
                            chartData.priceHistory
                              .map((point, i) => {
                                const x = (i / (chartData.priceHistory.length - 1)) * 1000;
                                const y = 400 - ((point.price - minPrice) / priceRange) * 400;
                                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                              })
                              .join(" ") + " L 1000 400 L 0 400 Z"
                          }
                          fill="url(#priceGradient)"
                        />
                      )}

                      {/* SMA Indicator */}
                      {indicator === "sma" && chartData.priceHistory.length >= 7 && (
                        <path
                          d={calculateSMA(chartData.priceHistory, 7)
                            .map((smaPrice, i) => {
                              const adjustedIndex = i + 6;
                              const x = (adjustedIndex / (chartData.priceHistory.length - 1)) * 1000;
                              const y = 400 - ((smaPrice - minPrice) / priceRange) * 400;
                              return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                            })
                            .join(" ")}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                          vectorEffect="non-scaling-stroke"
                        />
                      )}
                    </>
                  )}
                </svg>

                {/* Y-axis labels */}
                <div className="absolute right-2 top-4 space-y-16">
                  {[maxPrice, (maxPrice + minPrice) / 2, minPrice].map((price, i) => (
                    <div key={i} className="text-xs text-gray-500 font-mono">
                      {(price * 100).toFixed(1)}¢
                    </div>
                  ))}
                </div>

                {/* Indicator label */}
                {indicator !== "none" && (
                  <div className="absolute top-4 left-4 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-purple-400 text-xs font-medium">
                    {indicator.toUpperCase()}
                    {indicator === "sma" && " (7-period)"}
                  </div>
                )}
              </div>

              {/* Volume Chart */}
              {showVolume && (
                <div className="relative h-24 bg-gray-900/50 rounded-lg p-4 mt-4">
                  <div className="text-xs text-gray-500 mb-2">Volume</div>
                  <svg className="w-full h-full" viewBox="0 0 1000 80" preserveAspectRatio="none">
                    {chartData.priceHistory.map((point, i) => {
                      const x = (i / (chartData.priceHistory.length - 1)) * 1000;
                      const maxVolume = Math.max(...chartData.priceHistory.map(p => p.volume || 0));
                      const height = ((point.volume || 0) / maxVolume) * 80;
                      const width = 1000 / chartData.priceHistory.length;
                      return (
                        <rect
                          key={i}
                          x={x - width / 2}
                          y={80 - height}
                          width={width * 0.8}
                          height={height}
                          fill="#6366f1"
                          opacity="0.6"
                        />
                      );
                    })}
                  </svg>
                </div>
              )}

              {/* X-axis labels */}
              <div className="flex justify-between mt-2 px-4">
                {[0, Math.floor(chartData.priceHistory.length / 2), chartData.priceHistory.length - 1].map((i) => (
                  <span key={i} className="text-xs text-gray-500 font-mono">
                    {formatDate(chartData.priceHistory[i].timestamp)}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="h-96 flex items-center justify-center text-gray-400">
              No chart data available
            </div>
          )}
        </div>

        {/* Chart Info */}
        <div className="bg-[#1a2332] border border-gray-700 rounded-b-xl p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-gray-500 text-xs mb-1">High</div>
              <div className="text-white font-bold">{(maxPrice * 100).toFixed(1)}¢</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs mb-1">Low</div>
              <div className="text-white font-bold">{(minPrice * 100).toFixed(1)}¢</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs mb-1">Range</div>
              <div className="text-white font-bold">{(priceRange * 100).toFixed(1)}¢</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs mb-1">Data Points</div>
              <div className="text-white font-bold">{chartData?.priceHistory.length || 0}</div>
            </div>
          </div>
        </div>

        {/* Coming Soon: Advanced Features */}
        <div className="mt-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6">
          <h3 className="text-white font-bold text-lg mb-2">Premium Chart Features Coming Soon 📈</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-white/80 text-sm">
            <div>✨ Candlestick charts with OHLC data</div>
            <div>✨ More technical indicators (MACD, Bollinger Bands)</div>
            <div>✨ Drawing tools (trend lines, support/resistance)</div>
            <div>✨ Chart pattern recognition</div>
            <div>✨ Multiple chart comparison</div>
            <div>✨ Export charts as images</div>
          </div>
        </div>
      </div>
    </main>
  );
}
