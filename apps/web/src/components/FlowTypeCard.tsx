"use client";

import { useQuery } from "@tanstack/react-query";
import { getMarketFlow, type FlowType, type FlowDirection } from "@/lib/api";
import { WhyBullets } from "./WhyBullets";

type FlowTypeCardProps = {
  marketId: string;
};

const FLOW_TYPE_STYLES: Record<
  FlowType,
  { bg: string; border: string; text: string; icon: React.ReactNode; label: string; description: string }
> = {
  smart_money: {
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-400",
    label: "Smart Money Flow",
    description: "Institutional or whale activity detected",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  mixed: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-400",
    label: "Mixed Flow",
    description: "Both institutional and retail participation",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  retail_dominated: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-400",
    label: "Retail Dominated",
    description: "Mostly smaller retail transactions",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  unknown: {
    bg: "bg-gray-50 dark:bg-gray-800/50",
    border: "border-gray-200 dark:border-gray-700",
    text: "text-gray-600 dark:text-gray-400",
    label: "Unknown Activity",
    description: "Insufficient data to classify",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

function DirectionArrow({ direction }: { direction: FlowDirection }) {
  if (direction === "bullish") {
    return (
      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
        <span className="text-xs font-medium">Net Buying</span>
      </div>
    );
  }
  if (direction === "bearish") {
    return (
      <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        <span className="text-xs font-medium">Net Selling</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-gray-500">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
      <span className="text-xs font-medium">Neutral</span>
    </div>
  );
}

function formatVolume(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function FlowTypeCard({ marketId }: FlowTypeCardProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["marketFlow", marketId],
    queryFn: () => getMarketFlow(marketId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null; // Hide entirely if no data
  }

  // Hide if unknown flow type with no transactions (no meaningful data)
  if (data.flowType === "unknown" && data.metrics.totalTransactions === 0) {
    return null; // Don't show empty panel
  }

  const style = FLOW_TYPE_STYLES[data.flowType];

  return (
    <div className={`rounded-lg border p-6 ${style.bg} ${style.border}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 ${style.text}`}>
            {style.icon}
          </div>
          <div>
            <h3 className={`font-semibold ${style.text}`}>{data.flowLabel}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {style.description}
            </p>
          </div>
        </div>
        <DirectionArrow direction={data.metrics.netFlowDirection} />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Txs</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {data.metrics.totalTransactions}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Smart Money</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {data.metrics.smartMoneyTransactions}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Smart Volume</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {formatVolume(data.metrics.smartMoneyVolume)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Largest Tx</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {data.metrics.largestTransaction
              ? formatVolume(data.metrics.largestTransaction)
              : "-"}
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      {data.recentActivity.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Recent Activity
          </h4>
          <div className="space-y-1.5">
            {data.recentActivity.slice(0, 5).map((activity, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 px-2 rounded bg-white dark:bg-gray-800"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activity.type === "smart_money"
                        ? "bg-emerald-500"
                        : activity.type === "retail"
                        ? "bg-amber-500"
                        : "bg-gray-400"
                    }`}
                  />
                  <span
                    className={`text-xs font-medium ${
                      activity.direction === "buy"
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {activity.direction === "buy" ? "BUY" : "SELL"}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {formatVolume(activity.volumeUsd)}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {formatTime(activity.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Why Bullets */}
      <WhyBullets bullets={data.whyBullets} />

      {/* Confidence */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Confidence: {data.confidence}%</span>
          <span>Updated {formatTime(data.computedAt)}</span>
        </div>
      </div>
    </div>
  );
}
