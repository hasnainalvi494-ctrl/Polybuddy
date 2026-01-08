"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart } from "recharts";

// ============================================================================
// TYPES
// ============================================================================

type Candle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type PriceHistoryData = {
  candles: Candle[];
  currentPrice: number | null;
  priceChange: number | null;
  priceChangePercent: number | null;
};

type PriceChartProps = {
  marketId: string;
  size?: "small" | "medium" | "large";
  showTimeframeSelector?: boolean;
  showCurrentPrice?: boolean;
};

type Timeframe = "1h" | "4h" | "24h" | "7d";

// ============================================================================
// API FUNCTION
// ============================================================================

async function getPriceHistory(marketId: string, timeframe: Timeframe): Promise<PriceHistoryData> {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const response = await fetch(`${API_BASE}/api/markets/${marketId}/price-history?timeframe=${timeframe}`);
  if (!response.ok) {
    throw new Error("Failed to fetch price history");
  }
  return response.json();
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PriceChart({ 
  marketId, 
  size = "medium",
  showTimeframeSelector = false,
  showCurrentPrice = false 
}: PriceChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("24h");

  const { data, isLoading, error } = useQuery({
    queryKey: ["priceHistory", marketId, timeframe],
    queryFn: () => getPriceHistory(marketId, timeframe),
    staleTime: 60 * 1000, // 1 minute
  });

  // Size configurations
  const sizeConfig = {
    small: { width: 200, height: 40, showAxes: false, showVolume: false },
    medium: { width: 300, height: 120, showAxes: true, showVolume: true },
    large: { width: 400, height: 200, showAxes: true, showVolume: true },
  };

  const config = sizeConfig[size];

  if (isLoading) {
    return (
      <div 
        className="animate-pulse bg-gray-800/50 rounded-lg flex items-center justify-center"
        style={{ width: config.width, height: config.height }}
      >
        <span className="text-xs text-gray-600">Loading chart...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div 
        className="bg-gray-800/50 rounded-lg flex items-center justify-center"
        style={{ width: config.width, height: config.height }}
      >
        <span className="text-xs text-gray-500">Chart unavailable</span>
      </div>
    );
  }

  const { candles, currentPrice, priceChange, priceChangePercent } = data;

  if (candles.length === 0) {
    return (
      <div 
        className="bg-gray-800/50 rounded-lg flex items-center justify-center"
        style={{ width: config.width, height: config.height }}
      >
        <span className="text-xs text-gray-500">No data</span>
      </div>
    );
  }

  // Custom Candlestick component
  const Candlestick = (props: any) => {
    const { x, y, width, height, payload } = props;
    if (!payload) return null;

    const { open, close, high, low } = payload;
    const isGreen = close >= open;
    const color = isGreen ? "#10b981" : "#ef4444";
    
    const topY = Math.min(open, close) > 0 ? y + (height * (1 - Math.min(open, close))) : y;
    const bottomY = Math.max(open, close) > 0 ? y + (height * (1 - Math.max(open, close))) : y;
    const candleHeight = Math.abs(bottomY - topY) || 1;
    
    const wickTop = high > 0 ? y + (height * (1 - high)) : y;
    const wickBottom = low > 0 ? y + (height * (1 - low)) : y;
    
    return (
      <g>
        {/* Wick */}
        <line
          x1={x + width / 2}
          y1={wickTop}
          x2={x + width / 2}
          y2={wickBottom}
          stroke={color}
          strokeWidth={1}
        />
        {/* Body */}
        <rect
          x={x}
          y={topY}
          width={Math.max(width - 1, 1)}
          height={candleHeight}
          fill={color}
          stroke={color}
          strokeWidth={1}
        />
      </g>
    );
  };

  // Format timestamp for tooltip
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (timeframe === "1h" || timeframe === "4h") {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;
    
    const candle = payload[0].payload;
    const isGreen = candle.close >= candle.open;
    
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs">
        <p className="text-gray-400 mb-1">{formatTime(candle.timestamp)}</p>
        <div className="space-y-0.5">
          <p className="text-gray-300">O: {(candle.open * 100).toFixed(1)}¢</p>
          <p className="text-gray-300">H: {(candle.high * 100).toFixed(1)}¢</p>
          <p className="text-gray-300">L: {(candle.low * 100).toFixed(1)}¢</p>
          <p className={isGreen ? "text-emerald-400" : "text-rose-400"}>
            C: {(candle.close * 100).toFixed(1)}¢
          </p>
          {config.showVolume && (
            <p className="text-gray-400">Vol: ${(candle.volume / 1000).toFixed(1)}K</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Header with timeframe selector and current price */}
      {(showTimeframeSelector || showCurrentPrice) && (
        <div className="flex items-center justify-between">
          {showTimeframeSelector && (
            <div className="flex items-center gap-1">
              {(["1h", "4h", "24h", "7d"] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
                    timeframe === tf
                      ? "bg-emerald-500 text-gray-950"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
            </div>
          )}
          
          {showCurrentPrice && currentPrice !== null && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-200">
                YES: {(currentPrice * 100).toFixed(1)}¢
              </span>
              {priceChangePercent !== null && (
                <span className={`text-xs font-semibold ${priceChangePercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  ({priceChangePercent >= 0 ? "+" : ""}{priceChangePercent.toFixed(1)}%)
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="bg-gray-900/50 rounded-lg p-2" style={{ height: config.height }}>
        {config.showVolume ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={candles} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              {config.showAxes && (
                <>
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatTime}
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    stroke="#4b5563"
                  />
                  <YAxis 
                    domain={[0, 1]}
                    tickFormatter={(val) => `${(val * 100).toFixed(0)}¢`}
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    stroke="#4b5563"
                  />
                </>
              )}
              <Tooltip content={<CustomTooltip />} />
              
              {/* Candlesticks */}
              <Bar dataKey="close" fill="#10b981" shape={<Candlestick />} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={candles} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="close" 
                stroke="#10b981" 
                strokeWidth={1.5}
                fill="url(#priceGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// Export other components for backward compatibility
export { LiquidityBar, VolatilityIndicator } from "./MiniSparkline";



