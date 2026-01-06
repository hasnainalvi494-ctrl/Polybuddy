"use client";

import { useQuery } from "@tanstack/react-query";
import { getMarketHistory } from "@/lib/api";

type MiniSparklineProps = {
  marketId: string;
  height?: number;
  color?: "green" | "red" | "blue" | "purple";
};

export function MiniSparkline({ marketId, height = 24, color = "blue" }: MiniSparklineProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["marketHistory", marketId, "24h"],
    queryFn: () => getMarketHistory(marketId, "24h"),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div
        className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded"
        style={{ height, width: 80 }}
      />
    );
  }

  const snapshots = (data as { snapshots?: Array<{ price: number }> })?.snapshots || [];
  if (snapshots.length < 2) {
    return (
      <div
        className="bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-xs text-gray-400"
        style={{ height, width: 80 }}
      >
        No data
      </div>
    );
  }

  // Get prices and normalize
  const prices = snapshots.map(s => s.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 0.01;

  // Sample down to ~20 points for the sparkline
  const sampleRate = Math.max(1, Math.floor(prices.length / 20));
  const sampledPrices = prices.filter((_, i) => i % sampleRate === 0);

  // Create SVG path
  const width = 80;
  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = sampledPrices.map((price, i) => {
    const x = padding + (i / (sampledPrices.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((price - min) / range) * chartHeight;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;

  // Calculate trend
  const firstPrice = prices[0] || 0;
  const lastPrice = prices[prices.length - 1] || 0;
  const trend = lastPrice >= firstPrice ? "up" : "down";

  const colorMap = {
    green: { stroke: "#22c55e", fill: "rgba(34, 197, 94, 0.1)" },
    red: { stroke: "#ef4444", fill: "rgba(239, 68, 68, 0.1)" },
    blue: { stroke: "#3b82f6", fill: "rgba(59, 130, 246, 0.1)" },
    purple: { stroke: "#a855f7", fill: "rgba(168, 85, 247, 0.1)" },
  };

  const strokeColor = color === "green" || color === "red"
    ? (trend === "up" ? colorMap.green.stroke : colorMap.red.stroke)
    : colorMap[color].stroke;

  return (
    <svg width={width} height={height} className="rounded overflow-hidden bg-gray-50 dark:bg-gray-800/50">
      {/* Area fill */}
      <path
        d={`${pathD} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`}
        fill={color === "green" || color === "red"
          ? (trend === "up" ? colorMap.green.fill : colorMap.red.fill)
          : colorMap[color].fill}
      />
      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type LiquidityBarProps = {
  value: number; // 0-100 scale
  label?: string;
};

export function LiquidityBar({ value, label }: LiquidityBarProps) {
  const normalizedValue = Math.min(100, Math.max(0, value));
  const barColor = normalizedValue > 60
    ? "bg-green-500"
    : normalizedValue > 30
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <div className="flex items-center gap-1.5">
      {label && (
        <span className="text-[10px] text-gray-500 dark:text-gray-400 w-12 shrink-0">{label}</span>
      )}
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all`}
          style={{ width: `${normalizedValue}%` }}
        />
      </div>
    </div>
  );
}

type VolatilityIndicatorProps = {
  level: "low" | "medium" | "high";
};

export function VolatilityIndicator({ level }: VolatilityIndicatorProps) {
  const config = {
    low: { bars: 1, color: "bg-green-500", label: "Calm" },
    medium: { bars: 2, color: "bg-yellow-500", label: "Active" },
    high: { bars: 3, color: "bg-red-500", label: "Volatile" },
  };

  const { bars, color, label } = config[level];

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-end gap-0.5 h-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-1 rounded-sm ${i <= bars ? color : "bg-gray-200 dark:bg-gray-700"}`}
            style={{ height: `${i * 4}px` }}
          />
        ))}
      </div>
      <span className="text-[10px] text-gray-500 dark:text-gray-400">{label}</span>
    </div>
  );
}
