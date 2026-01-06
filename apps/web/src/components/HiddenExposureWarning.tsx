"use client";

import { useQuery } from "@tanstack/react-query";
import { getHiddenExposure, type LinkedMarket, type ExposureLinkLabel } from "@/lib/api";
import Link from "next/link";

type HiddenExposureWarningProps = {
  marketId: string;
  compact?: boolean;
};

const EXPOSURE_CONFIG: Record<ExposureLinkLabel, {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  label: string;
}> = {
  highly_linked: {
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800",
    icon: "!",
    label: "Highly Linked",
  },
  partially_linked: {
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-amber-200 dark:border-amber-800",
    icon: "~",
    label: "Partially Linked",
  },
  independent: {
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-800",
    icon: "✓",
    label: "Independent",
  },
};

export function HiddenExposureWarning({ marketId, compact = false }: HiddenExposureWarningProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["hiddenExposure", marketId],
    queryFn: () => getHiddenExposure(marketId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse h-16 bg-gray-100 dark:bg-gray-800 rounded-lg" />
    );
  }

  if (error || !data || data.warningLevel === "none") {
    return null;
  }

  const highlyLinked = data.linkedMarkets.filter(m => m.exposureLabel === "highly_linked");
  const partiallyLinked = data.linkedMarkets.filter(m => m.exposureLabel === "partially_linked");

  // Determine primary warning level
  const primaryConfig = highlyLinked.length > 0
    ? EXPOSURE_CONFIG.highly_linked
    : EXPOSURE_CONFIG.partially_linked;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${primaryConfig.bgColor} border ${primaryConfig.borderColor}`}>
        <span className={`text-lg font-bold ${primaryConfig.color}`}>{primaryConfig.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${primaryConfig.color}`}>
            Hidden Exposure Detected
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {highlyLinked.length > 0
              ? `${highlyLinked.length} market${highlyLinked.length > 1 ? "s" : ""} move together`
              : `${partiallyLinked.length} partially linked market${partiallyLinked.length > 1 ? "s" : ""}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${primaryConfig.borderColor} ${primaryConfig.bgColor} overflow-hidden`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-inherit">
        <div className="flex items-center gap-2">
          <span className={`text-xl font-bold ${primaryConfig.color}`}>{primaryConfig.icon}</span>
          <div>
            <h3 className={`font-semibold ${primaryConfig.color}`}>Hidden Exposure Detected</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This market shares resolution drivers with other markets
            </p>
          </div>
        </div>
      </div>

      {/* Linked Markets */}
      <div className="p-4 space-y-3">
        {/* Highly Linked */}
        {highlyLinked.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
              Effectively the Same Bet
            </h4>
            <div className="space-y-2">
              {highlyLinked.slice(0, 3).map((market) => (
                <LinkedMarketCard key={market.marketId} market={market} />
              ))}
              {highlyLinked.length > 3 && (
                <p className="text-xs text-gray-500">
                  +{highlyLinked.length - 3} more highly linked markets
                </p>
              )}
            </div>
          </div>
        )}

        {/* Partially Linked */}
        {partiallyLinked.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
              Shared Drivers
            </h4>
            <div className="space-y-2">
              {partiallyLinked.slice(0, 2).map((market) => (
                <LinkedMarketCard key={market.marketId} market={market} />
              ))}
              {partiallyLinked.length > 2 && (
                <p className="text-xs text-gray-500">
                  +{partiallyLinked.length - 2} more partially linked markets
                </p>
              )}
            </div>
          </div>
        )}

        {/* What mistake this prevents */}
        {highlyLinked.length > 0 && highlyLinked[0]?.mistakePrevented && (
          <div className="pt-3 border-t border-inherit">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium">What this prevents:</span>{" "}
              {highlyLinked[0].mistakePrevented}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function LinkedMarketCard({ market }: { market: LinkedMarket }) {
  const config = EXPOSURE_CONFIG[market.exposureLabel];

  return (
    <Link
      href={`/markets/${market.marketId}`}
      className="block p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
    >
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
        {market.question}
      </p>
      <p className="text-xs text-gray-600 dark:text-gray-400">
        {market.explanation}
      </p>
      <p className={`text-xs mt-1 ${config.color}`}>
        {market.exampleOutcome}
      </p>
    </Link>
  );
}

// Badge version for inline use
export function HiddenExposureBadge({ marketId }: { marketId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["hiddenExposure", marketId],
    queryFn: () => getHiddenExposure(marketId),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (isLoading || !data || data.warningLevel === "none") {
    return null;
  }

  const config = data.highlyLinkedCount > 0
    ? EXPOSURE_CONFIG.highly_linked
    : EXPOSURE_CONFIG.partially_linked;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color}`}
      title={`${data.totalLinked} linked market${data.totalLinked > 1 ? "s" : ""}`}
    >
      <span>{config.icon}</span>
      <span>Linked</span>
    </span>
  );
}

// Inline warning for lists
export function HiddenExposureInlineWarning({ marketId }: { marketId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["hiddenExposure", marketId],
    queryFn: () => getHiddenExposure(marketId),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (isLoading || !data || data.warningLevel === "none") {
    return null;
  }

  const highlyLinked = data.linkedMarkets.filter(m => m.exposureLabel === "highly_linked");

  if (highlyLinked.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
      <span className="font-bold">!</span>
      <span>Looks different, resolves the same</span>
    </div>
  );
}
