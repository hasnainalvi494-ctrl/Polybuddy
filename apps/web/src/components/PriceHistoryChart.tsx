"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { getMarketHistory } from "@/lib/api";

interface HistoryResponse {
  marketId: string;
  period: string;
  snapshots: {
    timestamp: string;
    price: number;
    volume: number;
  }[];
}

type Period = "1h" | "24h" | "7d" | "30d";

const periodLabels: Record<Period, string> = {
  "1h": "1H",
  "24h": "24H",
  "7d": "7D",
  "30d": "30D",
};

interface PriceHistoryChartProps {
  marketId: string;
}

export function PriceHistoryChart({ marketId }: PriceHistoryChartProps) {
  const [period, setPeriod] = useState<Period>("24h");

  const { data, isLoading, error } = useQuery<HistoryResponse>({
    queryKey: ["marketHistory", marketId, period],
    queryFn: () => getMarketHistory(marketId, period) as Promise<HistoryResponse>,
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (period === "1h" || period === "24h") {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatPrice = (price: number) => `${(price * 100).toFixed(1)}%`;

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(0)}K`;
    return `$${volume.toFixed(0)}`;
  };

  const chartData = data?.snapshots.map((s) => ({
    time: formatTime(s.timestamp),
    price: s.price,
    volume: s.volume,
  })) ?? [];

  // Calculate price change
  const priceChange = chartData.length >= 2
    ? chartData[chartData.length - 1].price - chartData[0].price
    : 0;
  const priceChangePercent = chartData.length >= 2 && chartData[0].price > 0
    ? (priceChange / chartData[0].price) * 100
    : 0;

  return (
    <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Price History</h2>
          {chartData.length >= 2 && (
            <p className={`text-sm ${priceChange >= 0 ? "text-green-600" : "text-red-600"}`}>
              {priceChange >= 0 ? "+" : ""}{(priceChange * 100).toFixed(1)}pp
              ({priceChangePercent >= 0 ? "+" : ""}{priceChangePercent.toFixed(1)}%)
            </p>
          )}
        </div>
        <div className="flex gap-1">
          {(Object.keys(periodLabels) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                period === p
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="h-64 flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="h-64 flex items-center justify-center text-gray-500">
          Failed to load price history
        </div>
      )}

      {!isLoading && !error && chartData.length === 0 && (
        <div className="h-64 flex items-center justify-center text-gray-500">
          No price history available for this period
        </div>
      )}

      {!isLoading && !error && chartData.length > 0 && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 50, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                stroke="#9CA3AF"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="price"
                domain={["auto", "auto"]}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                tick={{ fontSize: 12 }}
                stroke="#9CA3AF"
                tickLine={false}
                axisLine={false}
                width={45}
              />
              <YAxis
                yAxisId="volume"
                orientation="right"
                tickFormatter={(v) => formatVolume(v)}
                tick={{ fontSize: 10 }}
                stroke="#6B7280"
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#9CA3AF" }}
                formatter={(value, name) => {
                  if (name === "price") return [formatPrice(value as number), "Price"];
                  if (name === "volume") return [formatVolume(value as number), "Volume"];
                  return [value, name];
                }}
              />
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill="#6B7280"
                opacity={0.3}
                radius={[2, 2, 0, 0]}
              />
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="price"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#3B82F6" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
