"use client";

import { useQuery } from "@tanstack/react-query";
import { getMarketContext, type WalletTrend } from "@/lib/api";

type PublicContextCardProps = {
  marketId: string;
};

const TREND_STYLES: Record<WalletTrend, { icon: React.ReactNode; text: string; color: string }> = {
  increasing: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    text: "Growing",
    color: "text-green-600 dark:text-green-400",
  },
  decreasing: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
      </svg>
    ),
    text: "Declining",
    color: "text-red-600 dark:text-red-400",
  },
  stable: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    ),
    text: "Stable",
    color: "text-gray-600 dark:text-gray-400",
  },
};

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

function PositionBar({ longPercent }: { longPercent: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
        <div
          className="h-full bg-green-500 dark:bg-green-400"
          style={{ width: `${longPercent}%` }}
        />
        <div
          className="h-full bg-red-500 dark:bg-red-400"
          style={{ width: `${100 - longPercent}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 w-20 text-right">
        {longPercent.toFixed(0)}% / {(100 - longPercent).toFixed(0)}%
      </div>
    </div>
  );
}

export function PublicContextCard({ marketId }: PublicContextCardProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["marketContext", marketId],
    queryFn: () => getMarketContext(marketId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Unable to load market context
        </p>
      </div>
    );
  }

  const trendStyle = TREND_STYLES[data.participation.walletTrend];
  const longPercent = data.positions.totalLongPositions + data.positions.totalShortPositions > 0
    ? (data.positions.totalLongPositions / (data.positions.totalLongPositions + data.positions.totalShortPositions)) * 100
    : 50;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Market Activity
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Public participation and volume data
          </p>
        </div>
        <div className={`flex items-center gap-1 ${trendStyle.color}`}>
          {trendStyle.icon}
          <span className="text-xs font-medium">{trendStyle.text}</span>
        </div>
      </div>

      {/* Participation Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Wallets</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {data.participation.totalWallets.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Active (24h)</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {data.participation.activeWallets24h.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">New (24h)</p>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            +{data.participation.newWallets24h}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Avg Position</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {formatVolume(data.positions.avgPositionSize)}
          </p>
        </div>
      </div>

      {/* Position Breakdown */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Long ({data.positions.totalLongPositions})
          </span>
          <span className="flex items-center gap-1">
            Short ({data.positions.totalShortPositions})
            <span className="w-2 h-2 bg-red-500 rounded-full" />
          </span>
        </div>
        <PositionBar longPercent={longPercent} />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
          Long/Short Ratio: {data.positions.longShortRatio.toFixed(2)}
        </p>
      </div>

      {/* Volume Section */}
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Volume</span>
          {data.volume.isVolumeSpike && (
            <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded-full font-medium">
              Spike Detected
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">24h</p>
            <p className="font-bold text-gray-900 dark:text-gray-100">
              {formatVolume(data.volume.volume24h)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">7d</p>
            <p className="font-bold text-gray-900 dark:text-gray-100">
              {formatVolume(data.volume.volume7d)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">24h Change</p>
            <p className={`font-bold ${data.volume.volumeChange24h >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {data.volume.volumeChange24h >= 0 ? "+" : ""}{data.volume.volumeChange24h.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Large Transactions */}
      {data.largeTransactions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Large Transactions
          </h4>
          <div className="space-y-1.5">
            {data.largeTransactions.slice(0, 5).map((tx, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 px-2 rounded bg-gray-50 dark:bg-gray-700/50"
              >
                <div className="flex items-center gap-2">
                  {tx.isWhale && (
                    <span className="text-lg">🐋</span>
                  )}
                  <span
                    className={`text-xs font-medium ${
                      tx.direction === "buy"
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {tx.direction === "buy" ? "BUY" : "SELL"}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {formatVolume(tx.volumeUsd)}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {formatTime(tx.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {data.insights.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Insights
          </h4>
          <ul className="space-y-1">
            {data.insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="text-purple-500 mt-0.5">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 text-right">
          Updated {formatTime(data.computedAt)}
        </p>
      </div>
    </div>
  );
}
