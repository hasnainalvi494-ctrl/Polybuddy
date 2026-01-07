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
  dotColor: string;
  label: string;
  signalName: string;
}> = {
  highly_linked: {
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/10",
    borderColor: "border-amber-200 dark:border-amber-800/50",
    dotColor: "bg-amber-500",
    label: "Linked Outcomes",
    signalName: "Shared Resolution",
  },
  partially_linked: {
    color: "text-sky-700 dark:text-sky-400",
    bgColor: "bg-sky-50 dark:bg-sky-900/10",
    borderColor: "border-sky-200 dark:border-sky-800/50",
    dotColor: "bg-sky-500",
    label: "Shared Drivers",
    signalName: "Partial Correlation",
  },
  independent: {
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/10",
    borderColor: "border-emerald-200 dark:border-emerald-800/50",
    dotColor: "bg-emerald-500",
    label: "Independent",
    signalName: "Uncorrelated",
  },
};

export function HiddenExposureWarning({ marketId, compact = false }: HiddenExposureWarningProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["hiddenExposure", marketId],
    queryFn: () => getHiddenExposure(marketId),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse h-16 bg-gray-100 dark:bg-gray-800 rounded-xl" />
    );
  }

  if (error || !data || data.warningLevel === "none") {
    return null;
  }

  const highlyLinked = data.linkedMarkets.filter(m => m.exposureLabel === "highly_linked");
  const partiallyLinked = data.linkedMarkets.filter(m => m.exposureLabel === "partially_linked");

  const primaryConfig = highlyLinked.length > 0
    ? EXPOSURE_CONFIG.highly_linked
    : EXPOSURE_CONFIG.partially_linked;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${primaryConfig.bgColor} border ${primaryConfig.borderColor}`}>
        <div className={`w-2 h-2 rounded-full ${primaryConfig.dotColor}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${primaryConfig.color}`}>
            Signal: {primaryConfig.label}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {highlyLinked.length > 0
              ? `${highlyLinked.length} market${highlyLinked.length > 1 ? "s" : ""} share resolution drivers`
              : `${partiallyLinked.length} market${partiallyLinked.length > 1 ? "s" : ""} have structural overlap`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border ${primaryConfig.borderColor} ${primaryConfig.bgColor} overflow-hidden`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-inherit">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${primaryConfig.dotColor}`} />
          <div>
            <h3 className={`font-semibold ${primaryConfig.color}`}>Signal: {primaryConfig.label}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Resolution drivers overlap with other markets
            </p>
          </div>
        </div>
      </div>

      {/* Linked Markets */}
      <div className="p-5 space-y-4">
        {/* Highly Linked */}
        {highlyLinked.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Shared Resolution
              </h4>
            </div>
            <div className="space-y-2">
              {highlyLinked.slice(0, 3).map((market) => (
                <LinkedMarketCard key={market.marketId} market={market} />
              ))}
              {highlyLinked.length > 3 && (
                <p className="text-xs text-gray-500 pl-3">
                  +{highlyLinked.length - 3} more linked markets
                </p>
              )}
            </div>
          </div>
        )}

        {/* Partially Linked */}
        {partiallyLinked.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                Structural Overlap
              </h4>
            </div>
            <div className="space-y-2">
              {partiallyLinked.slice(0, 2).map((market) => (
                <LinkedMarketCard key={market.marketId} market={market} />
              ))}
              {partiallyLinked.length > 2 && (
                <p className="text-xs text-gray-500 pl-3">
                  +{partiallyLinked.length - 2} more
                </p>
              )}
            </div>
          </div>
        )}

        {/* Insight */}
        {highlyLinked.length > 0 && highlyLinked[0]?.mistakePrevented && (
          <div className="pt-4 border-t border-inherit">
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              <span className="font-medium text-gray-700 dark:text-gray-300">Why this matters:</span>{" "}
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
      className="block p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all"
    >
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
        {market.question}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        {market.explanation}
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.bgColor} ${config.color}`}
      title={`${data.totalLinked} linked market${data.totalLinked > 1 ? "s" : ""}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      <span>{config.label}</span>
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
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      <span>Linked outcomes</span>
    </span>
  );
}
