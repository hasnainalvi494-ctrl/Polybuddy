"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getMarketRetailSignals,
  type RetailSignal,
  type RetailSignalType,
  type SignalConfidenceLevel,
} from "@/lib/api";

type RetailSignalCardProps = {
  marketId: string;
};

const SIGNAL_TYPE_INFO: Record<
  RetailSignalType,
  { title: string; icon: React.ReactNode }
> = {
  favorable_structure: {
    title: "Market Structure",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  structural_mispricing: {
    title: "Related Markets",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  crowd_chasing: {
    title: "Crowd Activity",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  event_window: {
    title: "Event Timing",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  retail_friendliness: {
    title: "Retail Suitability",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
};

const CONFIDENCE_STYLES: Record<SignalConfidenceLevel, { label: string; color: string }> = {
  low: {
    label: "Low",
    color: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400",
  },
  medium: {
    label: "Medium",
    color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  },
  high: {
    label: "High",
    color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  },
};

function SignalItem({ signal }: { signal: RetailSignal }) {
  const typeInfo = SIGNAL_TYPE_INFO[signal.signalType];
  const confidenceStyle = CONFIDENCE_STYLES[signal.confidence];

  return (
    <div
      className={`rounded-lg border p-4 ${
        signal.isFavorable
          ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
          : "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-lg ${
              signal.isFavorable
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
            }`}
          >
            {typeInfo.icon}
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {typeInfo.title}
            </h4>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${confidenceStyle.color}`}>
          {confidenceStyle.label} Confidence
        </span>
      </div>

      {/* Label */}
      <p
        className={`text-sm font-semibold mb-3 ${
          signal.isFavorable
            ? "text-green-800 dark:text-green-300"
            : "text-amber-800 dark:text-amber-300"
        }`}
      >
        {signal.label}
      </p>

      {/* Why Bullets */}
      <div className="space-y-1.5">
        {signal.whyBullets.map((bullet, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span
              className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                signal.isFavorable ? "bg-green-500" : "bg-amber-500"
              }`}
            />
            <span>{bullet.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RetailSignalCard({ marketId }: RetailSignalCardProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["retailSignals", marketId],
    queryFn: () => getMarketRetailSignals(marketId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return null; // Hide entirely if error
  }

  const signals = data?.signals || [];

  // Hide if no signals computed
  if (signals.length === 0) {
    return null; // Don't show empty panel
  }

  // Separate favorable vs unfavorable
  const favorableSignals = signals.filter((s) => s.isFavorable);
  const unfavorableSignals = signals.filter((s) => !s.isFavorable);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Retail Conditions
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Market conditions for retail participation
          </p>
        </div>
      </div>

      {/* Signal Summary */}
      <div className="flex gap-4 mb-4 text-sm">
        {favorableSignals.length > 0 && (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{favorableSignals.length} favorable</span>
          </div>
        )}
        {unfavorableSignals.length > 0 && (
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{unfavorableSignals.length} caution</span>
          </div>
        )}
      </div>

      {/* Signals */}
      <div className="space-y-3">
        {signals.map((signal) => (
          <SignalItem key={signal.id} signal={signal} />
        ))}
      </div>

      {/* Disclaimer */}
      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Signals describe market conditions, not trading recommendations.
      </p>
    </div>
  );
}
