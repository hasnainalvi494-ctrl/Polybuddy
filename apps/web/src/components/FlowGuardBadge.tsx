"use client";

import { useQuery } from "@tanstack/react-query";
import { getFlowGuard, type FlowGuardLabel, type FlowGuardSeverity } from "@/lib/api";
import { useState } from "react";

const SEVERITY_STYLES: Record<FlowGuardSeverity, { bg: string; text: string; border: string }> = {
  warning: {
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
  },
  caution: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    text: "text-yellow-700 dark:text-yellow-400",
    border: "border-yellow-200 dark:border-yellow-800",
  },
  info: {
    bg: "bg-green-50 dark:bg-green-900/20",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
  },
};

const SEVERITY_ICONS: Record<FlowGuardSeverity, React.ReactNode> = {
  warning: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  caution: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const CONFIDENCE_LABELS: Record<string, string> = {
  low: "Low Confidence",
  medium: "Medium Confidence",
  high: "High Confidence",
};

type FlowGuardBadgeProps = {
  marketId: string;
  compact?: boolean;
};

export function FlowGuardBadge({ marketId, compact = false }: FlowGuardBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["flowGuard", marketId],
    queryFn: () => getFlowGuard(marketId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-full" />
    );
  }

  if (error || !data) {
    return null;
  }

  const styles = SEVERITY_STYLES[data.severity];
  const icon = SEVERITY_ICONS[data.severity];

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${styles.bg} ${styles.text} border ${styles.border}`}
        title={data.explanation}
      >
        {icon}
        <span>{data.displayLabel}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${styles.bg} ${styles.text} border ${styles.border} hover:opacity-90`}
      >
        {icon}
        <span>Flow: {data.displayLabel}</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                {data.displayLabel}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {CONFIDENCE_LABELS[data.confidence]} Flow Analysis
              </p>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Explanation */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {data.explanation}
          </p>

          {/* Why Bullets */}
          <div className="mb-4">
            <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Flow Analysis Factors
            </h5>
            <ul className="space-y-2">
              {data.whyBullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-gray-400 dark:text-gray-500 mt-0.5">•</span>
                  <div>
                    <span className="text-gray-700 dark:text-gray-300">{bullet.text}</span>
                    {bullet.value !== undefined && (
                      <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                        {bullet.value}{bullet.unit ? ` ${bullet.unit}` : ""}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro-Dominant Warning */}
          {data.label === "pro_dominant" && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 mb-4">
              <h5 className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Warning: Professional Flow Dominant
              </h5>
              <p className="text-xs text-red-800 dark:text-red-300">
                Flow signals in this market are dominated by professional traders.
                Retail traders following these signals typically underperform.
              </p>
            </div>
          )}

          {/* Common Mistake */}
          <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
            <h5 className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Common Mistake
            </h5>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              {data.commonRetailMistake}
            </p>
          </div>

          {/* Disclaimer */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
              {data.disclaimer}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Section component for market detail page
export function FlowGuardSection({ marketId }: { marketId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["flowGuard", marketId],
    queryFn: () => getFlowGuard(marketId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const styles = SEVERITY_STYLES[data.severity];
  const icon = SEVERITY_ICONS[data.severity];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Retail Flow Guard
        </h3>
      </div>

      {/* Label Badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg mb-3 ${styles.bg} ${styles.text} border ${styles.border}`}>
        {icon}
        <div>
          <div className="font-semibold">{data.displayLabel}</div>
          <div className="text-xs opacity-80">{CONFIDENCE_LABELS[data.confidence]}</div>
        </div>
      </div>

      {/* Explanation */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {data.explanation}
      </p>

      {/* Why Bullets */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Flow Analysis
        </h4>
        <ul className="space-y-1.5">
          {data.whyBullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-gray-400 dark:text-gray-500 mt-0.5">•</span>
              <div>
                <span className="text-gray-700 dark:text-gray-300">{bullet.text}</span>
                {bullet.value !== undefined && (
                  <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                    {bullet.value}{bullet.unit ? ` ${bullet.unit}` : ""}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Pro-Dominant Warning */}
      {data.label === "pro_dominant" && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 mb-4">
          <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Warning: Professional Flow Dominant
          </h4>
          <p className="text-sm text-red-800 dark:text-red-300">
            Flow signals in this market are dominated by professional traders.
            Retail traders following these signals typically underperform.
          </p>
        </div>
      )}

      {/* Common Mistake */}
      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
        <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Common Mistake
        </h4>
        <p className="text-sm text-amber-800 dark:text-amber-300">
          {data.commonRetailMistake}
        </p>
      </div>

      {/* Disclaimer - always visible */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 italic flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {data.disclaimer}
        </p>
      </div>
    </div>
  );
}
