"use client";

import { useQuery } from "@tanstack/react-query";
import { getMarketState, type MarketStateResponse } from "@/lib/api";

type MarketBehaviorCardProps = {
  marketId: string;
};

// Map state labels to retail opportunity profiles
const STATE_TO_OPPORTUNITY: Record<
  MarketStateResponse["stateLabel"],
  { level: "High" | "Medium" | "Low"; color: string; bgColor: string }
> = {
  calm_liquid: { level: "High", color: "text-green-700 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30" },
  thin_slippage: { level: "Low", color: "text-red-700 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30" },
  jumpy: { level: "Low", color: "text-red-700 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30" },
  event_driven: { level: "Medium", color: "text-yellow-700 dark:text-yellow-400", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" },
};

// Retail-friendly behavior descriptions
const BEHAVIOR_DESCRIPTIONS: Record<MarketStateResponse["stateLabel"], string> = {
  calm_liquid: "Stable & Liquid",
  thin_slippage: "Thin Order Book",
  jumpy: "High Volatility",
  event_driven: "News Sensitive",
};

// Decision-oriented interpretations
const RETAIL_INTERPRETATIONS: Record<
  MarketStateResponse["stateLabel"],
  {
    hardFor: string[];
    riskyFor: string[];
    favors: string[];
    confidenceExplanation: string;
  }
> = {
  calm_liquid: {
    hardFor: [
      "Traders looking for quick price swings",
      "Those expecting dramatic moves before resolution",
    ],
    riskyFor: [
      "Impatient traders who over-leverage small edges",
      "Anyone expecting the price to move significantly from current levels",
    ],
    favors: [
      "Patient traders with clear conviction",
      "Those who can wait for resolution without needing to exit early",
      "Retail traders who want minimal execution friction",
    ],
    confidenceExplanation: "High confidence — market behavior is stable and predictable",
  },
  thin_slippage: {
    hardFor: [
      "Anyone trading more than small amounts",
      "Traders who need to exit positions quickly",
      "Those unfamiliar with limit orders",
    ],
    riskyFor: [
      "Retail traders using market orders — you will lose on spread",
      "Anyone without patience to wait for fills",
      "Traders who can't afford to be stuck in a position",
    ],
    favors: [
      "Market makers who can provide liquidity",
      "Patient traders using limit orders only",
      "Those with small position sizes who can wait",
    ],
    confidenceExplanation: "Classification based on observable spread and depth — actual slippage may vary",
  },
  jumpy: {
    hardFor: [
      "Retail traders who check prices infrequently",
      "Anyone without stop-loss discipline",
      "Traders who react emotionally to price swings",
    ],
    riskyFor: [
      "Late entries — price may have already moved past fair value",
      "Anyone chasing momentum after a spike",
      "Traders without a clear exit plan before entry",
    ],
    favors: [
      "Experienced traders who anticipated the volatility",
      "Those with pre-set limit orders catching overreactions",
      "Traders comfortable with rapid decision-making",
    ],
    confidenceExplanation: "Based on recent price action — volatility may increase or decrease",
  },
  event_driven: {
    hardFor: [
      "Traders without access to real-time news",
      "Anyone who can't monitor positions continuously",
      "Retail traders competing against news-focused desks",
    ],
    riskyFor: [
      "Anyone entering after news has already moved the price",
      "Traders who don't understand the specific event catalyst",
      "Those expecting gradual price discovery — moves can be instant",
    ],
    favors: [
      "Traders with domain expertise on the specific event",
      "Those positioned before the catalyst",
      "Anyone with genuine informational edge on the outcome",
    ],
    confidenceExplanation: "Event timing is known — but market reaction to outcomes is uncertain",
  },
};

function ConfidenceExplainer({ confidence, explanation }: { confidence: number; explanation: string }) {
  const getConfidenceLabel = () => {
    if (confidence >= 80) return "Very confident";
    if (confidence >= 60) return "Moderately confident";
    if (confidence >= 40) return "Somewhat confident";
    return "Low confidence";
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
          {getConfidenceLabel()} ({confidence}%)
        </span>
      </div>
      <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${confidence}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{explanation}</p>
    </div>
  );
}

function InterpretationSection({
  title,
  items,
  icon,
  accentColor,
}: {
  title: string;
  items: string[];
  icon: "warning" | "alert" | "check";
  accentColor: string;
}) {
  const icons = {
    warning: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    alert: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    check: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className="space-y-2">
      <h4 className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 ${accentColor}`}>
        {icons[icon]}
        {title}
      </h4>
      <ul className="space-y-1.5">
        {items.map((item, idx) => (
          <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
            <span className="text-gray-400 dark:text-gray-500 mt-1">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MetricComparison({
  label,
  value,
  unit,
  comparison,
  isGood,
}: {
  label: string;
  value: number | null;
  unit: string;
  comparison: string;
  isGood: boolean;
}) {
  if (value === null) return null;

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-medium ${isGood ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}`}>
          {typeof value === "number" && value < 1 ? (value * 100).toFixed(1) : value.toFixed(1)}{unit}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-500 ml-1">({comparison})</span>
      </div>
    </div>
  );
}

export function MarketBehaviorCard({ marketId }: MarketBehaviorCardProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["marketState", marketId],
    queryFn: () => getMarketState(marketId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Market behavior analysis unavailable
        </p>
      </div>
    );
  }

  const opportunity = STATE_TO_OPPORTUNITY[data.stateLabel];
  const behavior = BEHAVIOR_DESCRIPTIONS[data.stateLabel];
  const interpretations = RETAIL_INTERPRETATIONS[data.stateLabel];

  // Determine metric comparisons based on typical values
  const spreadComparison = data.features.spreadPct !== null
    ? data.features.spreadPct < 0.02 ? "better than typical" : data.features.spreadPct < 0.05 ? "typical" : "worse than typical"
    : "";
  const depthComparison = data.features.depthUsd !== null
    ? data.features.depthUsd > 10000 ? "healthy depth" : data.features.depthUsd > 2000 ? "moderate" : "thin — slippage likely"
    : "";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Market Behavior
            </h3>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {behavior}
            </p>
          </div>
          <div className={`px-3 py-1.5 rounded-lg ${opportunity.bgColor}`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Retail Opportunity</p>
            <p className={`text-lg font-bold ${opportunity.color}`}>{opportunity.level}</p>
          </div>
        </div>
      </div>

      {/* Confidence Section */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <ConfidenceExplainer
          confidence={data.confidence}
          explanation={interpretations.confidenceExplanation}
        />
      </div>

      {/* Market Metrics with Comparisons */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Current Conditions vs. Typical
        </h4>
        <MetricComparison
          label="Spread (cost to trade)"
          value={data.features.spreadPct}
          unit="%"
          comparison={spreadComparison}
          isGood={data.features.spreadPct !== null && data.features.spreadPct < 0.03}
        />
        <MetricComparison
          label="Order Book Depth"
          value={data.features.depthUsd}
          unit=""
          comparison={depthComparison}
          isGood={data.features.depthUsd !== null && data.features.depthUsd > 5000}
        />
        {data.features.stalenessMinutes !== null && (
          <MetricComparison
            label="Last Activity"
            value={data.features.stalenessMinutes}
            unit=" min ago"
            comparison={data.features.stalenessMinutes < 5 ? "active" : data.features.stalenessMinutes < 30 ? "moderate" : "stale — prices may be outdated"}
            isGood={data.features.stalenessMinutes < 15}
          />
        )}
      </div>

      {/* Interpretation Sections */}
      <div className="p-5 space-y-5">
        <InterpretationSection
          title="Why this market is hard for retail"
          items={interpretations.hardFor}
          icon="warning"
          accentColor="text-orange-600 dark:text-orange-400"
        />

        <InterpretationSection
          title="Who this market is risky for"
          items={interpretations.riskyFor}
          icon="alert"
          accentColor="text-red-600 dark:text-red-400"
        />

        <InterpretationSection
          title="Who this market favors"
          items={interpretations.favors}
          icon="check"
          accentColor="text-green-600 dark:text-green-400"
        />
      </div>
    </div>
  );
}
