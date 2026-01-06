"use client";

import { useQuery } from "@tanstack/react-query";
import { getRelatedMarkets, type ConsistencyCheck } from "@/lib/api";
import { useState } from "react";
import Link from "next/link";

type ExposureRiskCardProps = {
  marketId: string;
  limit?: number;
};

// Reframe relation types to explain exposure risk
const RELATION_RISK_LABELS: Record<ConsistencyCheck["relationType"], {
  label: string;
  riskExplanation: string;
}> = {
  calendar_variant: {
    label: "Same Event, Different Timing",
    riskExplanation: "These markets resolve based on the same underlying outcome. Holding positions in both is NOT diversification — it's concentrated exposure to a single event.",
  },
  multi_outcome: {
    label: "Same Resolution Source",
    riskExplanation: "Both markets depend on the same underlying data or event. If you're wrong about the outcome, you're wrong in both markets.",
  },
  inverse: {
    label: "Opposite Bet",
    riskExplanation: "This market moves opposite to your current one. Entering both would hedge your position but also cap your upside.",
  },
  correlated: {
    label: "Correlated Outcome",
    riskExplanation: "These markets tend to move together. Gains or losses in one often predict similar results in the other.",
  },
};

// Reframe consistency labels to be actionable
const CONSISTENCY_INTERPRETATION: Record<ConsistencyCheck["label"], {
  label: string;
  explanation: string;
  color: string;
  bgColor: string;
}> = {
  looks_consistent: {
    label: "Prices Aligned",
    explanation: "Current prices don't show obvious mispricing between these related markets.",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-700/50",
  },
  potential_inconsistency_low: {
    label: "Minor Price Gap",
    explanation: "Small price difference exists. Could be noise, or an edge for experienced traders.",
    color: "text-yellow-700 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  potential_inconsistency_medium: {
    label: "Notable Price Gap",
    explanation: "Meaningful price difference. Either markets disagree, or one is mispriced.",
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  potential_inconsistency_high: {
    label: "Large Price Gap",
    explanation: "Significant disagreement between related markets. Investigate before entering either.",
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
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
  const relationInfo = RELATION_RISK_LABELS[check.relationType];
  const consistencyInfo = CONSISTENCY_INTERPRETATION[check.label];
  const priceDiff = Math.abs(check.priceA - check.priceB) * 100;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
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

        {/* Relation type badge */}
        <div className="mb-3">
          <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
            {relationInfo.label}
          </span>
        </div>

        {/* Price comparison */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex-1">
            <span className="text-gray-500 dark:text-gray-400">This market:</span>{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {(check.priceA * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex-1">
            <span className="text-gray-500 dark:text-gray-400">Related:</span>{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {(check.priceB * 100).toFixed(0)}%
            </span>
          </div>
          <div className={`px-2 py-0.5 rounded text-xs font-medium ${consistencyInfo.bgColor} ${consistencyInfo.color}`}>
            {priceDiff.toFixed(0)}% gap
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700/50 space-y-4">
          {/* Exposure Risk Warning */}
          <div className="pt-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <h5 className="text-xs font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Clustering Risk
              </h5>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {relationInfo.riskExplanation}
              </p>
            </div>
          </div>

          {/* Price Gap Interpretation */}
          <div>
            <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Price Gap Analysis
            </h5>
            <div className={`p-3 rounded-lg ${consistencyInfo.bgColor}`}>
              <p className={`text-sm font-medium ${consistencyInfo.color} mb-1`}>
                {consistencyInfo.label}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {consistencyInfo.explanation}
              </p>
            </div>
          </div>

          {/* Implication */}
          <div className="text-xs text-gray-500 dark:text-gray-400 italic">
            Entering both markets exposes you to the same underlying risk. Consider this concentrated, not diversified exposure.
          </div>
        </div>
      )}
    </div>
  );
}

export function ExposureRiskCard({ marketId, limit = 5 }: ExposureRiskCardProps) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["relatedMarkets", marketId, limit],
    queryFn: () => getRelatedMarkets(marketId, limit),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Related markets analysis unavailable
        </p>
      </div>
    );
  }

  const hasRelated = data.relatedMarkets.length > 0;
  const gapCount = data.relatedMarkets.filter(r => r.label !== "looks_consistent").length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Exposure & Clustering Risk
            </h3>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {hasRelated
                ? `${data.relatedMarkets.length} related market${data.relatedMarkets.length !== 1 ? "s" : ""} share underlying risk`
                : "No related markets detected"
              }
            </p>
          </div>
          {gapCount > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-medium">
              {gapCount} price gap{gapCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Warning Banner */}
      {hasRelated && (
        <div className="px-5 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-400">
            <strong>Key insight:</strong> Betting on multiple related markets is not diversification.
            These markets often resolve together — one wrong call affects all positions.
          </p>
        </div>
      )}

      {/* Related Markets List */}
      <div className="p-5">
        {hasRelated ? (
          <div className="space-y-3">
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
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No related markets found. This market appears to have independent resolution.
            </p>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      {hasRelated && (
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700">
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
            Compare with longer-horizon markets &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
