"use client";

import { useQuery } from "@tanstack/react-query";
import { getRelatedMarkets, type ConsistencyCheck } from "@/lib/api";
import { WhyBullets } from "./WhyBullets";
import { useState } from "react";
import Link from "next/link";

type RelatedMarketsCardProps = {
  marketId: string;
  limit?: number;
};

const LABEL_STYLES: Record<ConsistencyCheck["label"], { bg: string; text: string }> = {
  looks_consistent: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
  },
  potential_inconsistency_low: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-400",
  },
  potential_inconsistency_medium: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-400",
  },
  potential_inconsistency_high: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
  },
};

const RELATION_LABELS: Record<ConsistencyCheck["relationType"], string> = {
  calendar_variant: "Calendar Variant",
  multi_outcome: "Multi-Outcome",
  inverse: "Inverse Market",
  correlated: "Correlated",
};

function RelatedMarketItem({
  check,
  isExpanded,
  onToggle,
}: {
  check: ConsistencyCheck;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const labelStyle = LABEL_STYLES[check.label];

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 mr-2">
            <Link
              href={`/markets/${check.bMarketId}`}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {check.bQuestion}
            </Link>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transform transition-transform shrink-0 ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${labelStyle.bg} ${labelStyle.text}`}
          >
            {check.displayLabel}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
            {RELATION_LABELS[check.relationType]}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {check.confidence}% confidence
          </span>
        </div>

        <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>This: {(check.priceA * 100).toFixed(0)}%</span>
          <span>Related: {(check.priceB * 100).toFixed(0)}%</span>
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700/50">
          <div className="pt-3">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Why these are related
            </h4>
            <WhyBullets bullets={check.whyBullets} />
          </div>
        </div>
      )}
    </div>
  );
}

export function RelatedMarketsCard({ marketId, limit = 5 }: RelatedMarketsCardProps) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["relatedMarkets", marketId, limit],
    queryFn: () => getRelatedMarkets(marketId, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Related markets analysis unavailable
        </p>
      </div>
    );
  }

  const inconsistentCount = data.relatedMarkets.filter(
    (r) => r.label !== "looks_consistent"
  ).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Related Markets
        </h3>
        {inconsistentCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
            {inconsistentCount} potential inconsistenc{inconsistentCount === 1 ? "y" : "ies"}
          </span>
        )}
      </div>

      {data.relatedMarkets.length > 0 ? (
        <div className="space-y-2">
          {data.relatedMarkets.map((check) => (
            <RelatedMarketItem
              key={check.bMarketId}
              check={check}
              isExpanded={expandedItem === check.bMarketId}
              onToggle={() =>
                setExpandedItem(expandedItem === check.bMarketId ? null : check.bMarketId)
              }
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No related markets found
        </p>
      )}
    </div>
  );
}
