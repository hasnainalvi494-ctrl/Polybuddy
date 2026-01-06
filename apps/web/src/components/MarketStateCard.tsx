"use client";

import { useQuery } from "@tanstack/react-query";
import { getMarketState, type MarketStateResponse } from "@/lib/api";
import { WhyBullets } from "./WhyBullets";

type MarketStateCardProps = {
  marketId: string;
};

const STATE_STYLES: Record<
  MarketStateResponse["stateLabel"],
  { bg: string; text: string; border: string; icon: string }
> = {
  calm_liquid: {
    bg: "bg-green-50 dark:bg-green-900/20",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
    icon: "checkmark-circle",
  },
  thin_slippage: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    text: "text-yellow-700 dark:text-yellow-400",
    border: "border-yellow-200 dark:border-yellow-800",
    icon: "warning",
  },
  jumpy: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-800",
    icon: "trending-up",
  },
  event_driven: {
    bg: "bg-purple-50 dark:bg-purple-900/20",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
    icon: "calendar",
  },
};

function ConfidenceBar({ confidence }: { confidence: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 w-8">
        {confidence}%
      </span>
    </div>
  );
}

export function MarketStateCard({ marketId }: MarketStateCardProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["marketState", marketId],
    queryFn: () => getMarketState(marketId),
    staleTime: 60 * 1000, // 1 minute
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Market state analysis unavailable
        </p>
      </div>
    );
  }

  const styles = STATE_STYLES[data.stateLabel];

  return (
    <div
      className={`rounded-lg border p-4 ${styles.bg} ${styles.border}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            Market State
          </h3>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${styles.bg} ${styles.text}`}
          >
            {data.displayLabel}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Confidence
          </span>
          <div className="w-20 mt-1">
            <ConfidenceBar confidence={data.confidence} />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Why this classification
        </h4>
        <WhyBullets bullets={data.whyBullets} />
      </div>

      {/* Feature metrics row */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700/50 grid grid-cols-2 gap-2 text-xs">
        {data.features.spreadPct !== null && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">Spread:</span>{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {(data.features.spreadPct * 100).toFixed(1)}%
            </span>
          </div>
        )}
        {data.features.depthUsd !== null && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">Depth:</span>{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              ${(data.features.depthUsd / 1000).toFixed(1)}K
            </span>
          </div>
        )}
        {data.features.stalenessMinutes !== null && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">Last update:</span>{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {data.features.stalenessMinutes} min ago
            </span>
          </div>
        )}
        {data.features.volatility !== null && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">Volatility:</span>{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {(data.features.volatility * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
