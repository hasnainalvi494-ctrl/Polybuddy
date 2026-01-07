"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getDailyAttention, type DailyAttentionResponse } from "@/lib/api";
import { MiniSparkline, LiquidityBar, VolatilityIndicator } from "@/components/MiniSparkline";
import { HiddenExposureInlineWarning } from "@/components/HiddenExposureWarning";

// Premium signal hook language - creates intrigue
const SIGNAL_HOOKS: Record<string, string> = {
  "Lower friction means more of your edge translates to profit.":
    "Structure allows patient entries without execution penalty.",
  "Price divergence from related markets creates opportunity.":
    "Odds have not repriced yet — patient positioning may capture the gap.",
  "Defined timeline helps manage position sizing and exit planning.":
    "Clear resolution window enables precise position management.",
  "Market structure doesn't systematically disadvantage smaller participants.":
    "Execution costs are contained — edge translates more directly to outcome.",
  "Favorable conditions for retail participation.":
    "Structure favors deliberate decision-making over speed.",
  "Rare: Flow signals in this market may benefit patient retail traders.":
    "Unusual structural alignment — fast traders aren't dominating flow.",
};

function getSignalHook(original: string): string {
  return SIGNAL_HOOKS[original] || original;
}

// Detect if same underlying asset appears in both sections
function findContrastMarkets(
  worthAttention: DailyAttentionResponse["worthAttention"],
  retailTraps: DailyAttentionResponse["retailTraps"]
): Set<string> {
  const worthQuestions = new Set(worthAttention.map(m => extractAsset(m.question)));
  const trapQuestions = new Set(retailTraps.map(m => extractAsset(m.question)));
  const overlap = new Set<string>();
  worthQuestions.forEach(q => {
    if (trapQuestions.has(q)) overlap.add(q);
  });
  return overlap;
}

function extractAsset(question: string): string {
  const keywords = ["Bitcoin", "Ethereum", "Trump", "Biden", "Fed", "inflation", "election"];
  for (const kw of keywords) {
    if (question.toLowerCase().includes(kw.toLowerCase())) return kw;
  }
  return question.split(" ").slice(0, 3).join(" ").toLowerCase();
}

// Format time ago
function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function LowFrictionCard({
  market,
  hasContrastTrap
}: {
  market: DailyAttentionResponse["worthAttention"][0];
  hasContrastTrap?: boolean;
}) {
  const volatility: "low" | "medium" | "high" =
    market.confidence > 75 ? "low" : market.confidence > 50 ? "medium" : "high";

  return (
    <Link
      href={`/markets/${market.id}`}
      className="group block bg-white dark:bg-gray-900 rounded-2xl p-5 hover:shadow-lg transition-all duration-200 border border-gray-100 dark:border-gray-800"
    >
      {/* Signal Type + Confidence */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Low Friction
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-12 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${market.confidence}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {market.confidence}%
          </span>
        </div>
      </div>

      {/* Market Name */}
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base leading-snug mb-2 line-clamp-2">
        {market.question}
      </h3>

      {/* Signal Hook - The intrigue line */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
        {getSignalHook(market.whyThisMatters)}
      </p>

      {/* Evidence Preview */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
        <div className="flex-1">
          <MiniSparkline marketId={market.id} height={32} color="green" />
        </div>
        <div className="flex flex-col gap-2 pl-3 border-l border-gray-200 dark:border-gray-700">
          <VolatilityIndicator level={volatility} />
          <LiquidityBar value={market.confidence} label="Depth" />
        </div>
      </div>

      {/* Signal Labels */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs rounded-lg font-medium">
          {market.setupLabel}
        </span>
        <HiddenExposureInlineWarning marketId={market.id} />
      </div>

      {/* Contrast Signal */}
      {hasContrastTrap && (
        <div className="mb-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <span className="font-medium">Signal:</span> Same asset has high-friction variant — this structure is preferable.
          </p>
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {market.category || "Market"}
        </span>
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:gap-2 transition-all">
          View signal context
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

function HighFrictionCard({
  market,
  hasContrastGood
}: {
  market: DailyAttentionResponse["retailTraps"][0];
  hasContrastGood?: boolean;
}) {
  return (
    <Link
      href={`/markets/${market.id}`}
      className="group block bg-white dark:bg-gray-900 rounded-2xl p-5 hover:shadow-lg transition-all duration-200 border border-gray-100 dark:border-gray-800"
    >
      {/* Signal Type */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            High Friction
          </span>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Structurally unfavorable
        </span>
      </div>

      {/* Market Name */}
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base leading-snug mb-2 line-clamp-2">
        {market.question}
      </h3>

      {/* Signal Hook */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
        {market.commonMistake}
      </p>

      {/* Evidence Preview */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
        <div className="flex-1">
          <MiniSparkline marketId={market.id} height={32} color="red" />
        </div>
        <div className="flex flex-col gap-2 pl-3 border-l border-gray-200 dark:border-gray-700">
          <VolatilityIndicator level="high" />
          <LiquidityBar value={30} label="Depth" />
        </div>
      </div>

      {/* Signal Labels */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 text-xs rounded-lg font-medium">
          {market.warningLabel}
        </span>
        <HiddenExposureInlineWarning marketId={market.id} />
      </div>

      {/* Contrast Signal */}
      {hasContrastGood && (
        <div className="mb-3 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg">
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            <span className="font-medium">Signal:</span> Low-friction variant exists — check favorable setups.
          </p>
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {market.category || "Market"}
        </span>
        <span className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1 group-hover:gap-2 transition-all">
          Understand structure
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

function StateChangeCard({ change }: { change: DailyAttentionResponse["whatChanged"][0] }) {
  const typeConfig: Record<string, { color: string; label: string }> = {
    state_shift: { color: "violet", label: "Structure Shift" },
    event_window: { color: "amber", label: "Timeline Active" },
    mispricing: { color: "sky", label: "Price Divergence" },
    flow_guard: { color: "rose", label: "Flow Signal" },
  };

  const config = typeConfig[change.changeType] || typeConfig.state_shift;
  const colorClasses = {
    violet: { bg: "bg-violet-50 dark:bg-violet-900/20", text: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500" },
    amber: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
    sky: { bg: "bg-sky-50 dark:bg-sky-900/20", text: "text-sky-600 dark:text-sky-400", dot: "bg-sky-500" },
    rose: { bg: "bg-rose-50 dark:bg-rose-900/20", text: "text-rose-600 dark:text-rose-400", dot: "bg-rose-500" },
  }[config.color];

  return (
    <Link
      href={`/markets/${change.marketId}`}
      className="group block bg-white dark:bg-gray-900 rounded-2xl p-5 hover:shadow-lg transition-all duration-200 border border-gray-100 dark:border-gray-800"
    >
      {/* Signal Type */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${colorClasses?.dot}`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${colorClasses?.text}`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Market Name */}
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base leading-snug mb-2 line-clamp-2">
        {change.question}
      </h3>

      {/* Signal Hook */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
        {change.description}
      </p>

      {/* Evidence Preview */}
      <div className="mb-4">
        <MiniSparkline marketId={change.marketId} height={32} color="purple" />
      </div>

      {/* CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
        <span className={`px-2.5 py-1 text-xs rounded-lg font-medium ${colorClasses?.bg} ${colorClasses?.text}`}>
          {config.label}
        </span>
        <span className={`text-xs font-medium ${colorClasses?.text} flex items-center gap-1 group-hover:gap-2 transition-all`}>
          Analyze change
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

export default function DailyPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dailyAttention"],
    queryFn: getDailyAttention,
    staleTime: 5 * 60 * 1000,
  });

  const contrastAssets = data
    ? findContrastMarkets(data.worthAttention, data.retailTraps)
    : new Set<string>();

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-900 dark:border-gray-700 dark:border-t-gray-100"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading signals...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-rose-50 dark:bg-rose-900/20 rounded-2xl p-6 text-rose-700 dark:text-rose-400">
            Unable to load signals. Please refresh.
          </div>
        </div>
      </main>
    );
  }

  const totalSignals = (data?.worthAttention?.length || 0) + (data?.retailTraps?.length || 0) + (data?.whatChanged?.length || 0);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                Signal Console
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {totalSignals} active signals detected
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Updated {data?.generatedAt ? timeAgo(data.generatedAt) : "just now"}
              </p>
            </div>
          </div>

          {/* Signal Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Low Friction</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data?.worthAttention?.length || 0}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">High Friction</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data?.retailTraps?.length || 0}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">State Changes</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data?.whatChanged?.length || 0}</p>
            </div>
          </div>
        </header>

        {/* Section A: Low Friction Signals */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-emerald-500 rounded-full" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Signals: Low Friction Setups
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Structure enables patient positioning without execution penalty
              </p>
            </div>
          </div>

          {data?.worthAttention && data.worthAttention.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.worthAttention.map((market) => (
                <LowFrictionCard
                  key={market.id}
                  market={market}
                  hasContrastTrap={contrastAssets.has(extractAsset(market.question))}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center border border-gray-100 dark:border-gray-800">
              <p className="text-gray-500 dark:text-gray-400">No low-friction setups detected today.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Quality signals are rare by design.</p>
            </div>
          )}
        </section>

        {/* Section B: High Friction Signals */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-rose-500 rounded-full" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Signals: High Friction
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Structure disadvantages patient capital — execution costs dominate
              </p>
            </div>
          </div>

          {data?.retailTraps && data.retailTraps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.retailTraps.map((market) => (
                <HighFrictionCard
                  key={market.id}
                  market={market}
                  hasContrastGood={contrastAssets.has(extractAsset(market.question))}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center border border-gray-100 dark:border-gray-800">
              <p className="text-gray-500 dark:text-gray-400">No high-friction signals detected.</p>
            </div>
          )}
        </section>

        {/* Section C: State Changes */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-violet-500 rounded-full" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Signals: State Changes
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Markets where conditions shifted since last session
              </p>
            </div>
          </div>

          {data?.whatChanged && data.whatChanged.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {data.whatChanged.map((change, i) => (
                <StateChangeCard key={i} change={change} />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center border border-gray-100 dark:border-gray-800">
              <p className="text-gray-500 dark:text-gray-400">No state changes detected.</p>
            </div>
          )}
        </section>

        {/* Footer Note */}
        <div className="text-center py-6 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-md mx-auto">
            Signals reflect structural conditions, not predictions.
            Use to filter research, not as execution triggers.
          </p>
        </div>
      </div>
    </main>
  );
}
