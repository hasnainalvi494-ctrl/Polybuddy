"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getDailyAttention, type DailyAttentionResponse } from "@/lib/api";
import { MiniSparkline, LiquidityBar, VolatilityIndicator } from "@/components/MiniSparkline";
import { HiddenExposureInlineWarning } from "@/components/HiddenExposureWarning";
import { PremiumUpgradeModal, usePremiumUpgrade, usePremiumStatus } from "@/components/PremiumUpgradeModal";

// ============================================================================
// HERO SECTION
// ============================================================================

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900/50 to-gray-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent" />

      <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-20">
        {/* Product name */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-950" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-emerald-400 uppercase tracking-wider">Pulse</span>
        </div>

        {/* Primary headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-100 tracking-tight mb-6 max-w-3xl leading-[1.1]">
          See market structure before price moves.
        </h1>

        {/* One-sentence explainer */}
        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mb-12 leading-relaxed">
          Live structural signals across prediction markets that show where retail traders can compete — and where hidden risks quietly punish late or crowded entries.
        </p>

        {/* Value bullets */}
        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <h3 className="font-semibold text-gray-100">Identify retail-friendly setups</h3>
            </div>
            <p className="text-sm text-gray-500 pl-3.5">
              See when structure allows patient positioning without execution penalty.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <h3 className="font-semibold text-gray-100">Avoid hidden exposure</h3>
            </div>
            <p className="text-sm text-gray-500 pl-3.5">
              Detect when different markets are effectively the same bet.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <h3 className="font-semibold text-gray-100">Read flow dynamics</h3>
            </div>
            <p className="text-sm text-gray-500 pl-3.5">
              Understand whether market structure helps or hurts retail.
            </p>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-wrap gap-4 mb-12">
          <a
            href="#signals"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-gray-950 font-semibold rounded-xl hover:bg-emerald-400 transition-colors"
          >
            View live signals
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </a>
          <Link
            href="/markets"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 text-gray-200 font-semibold rounded-xl hover:bg-gray-700 transition-colors border border-gray-700"
          >
            Explore markets
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Trust line */}
        <p className="text-xs text-gray-600 max-w-lg">
          Pulse provides analysis only. It does not predict outcomes or execute trades.
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// SIGNAL CARDS
// ============================================================================

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

function ActiveSignalCard({
  market,
  index,
}: {
  market: DailyAttentionResponse["worthAttention"][0];
  index: number;
}) {
  const volatility: "low" | "medium" | "high" =
    market.confidence > 75 ? "low" : market.confidence > 50 ? "medium" : "high";

  return (
    <Link
      href={`/markets/${market.id}`}
      className="group block bg-gray-900/50 backdrop-blur rounded-2xl p-5 hover:bg-gray-900/80 transition-all duration-300 border border-gray-800/50 hover:border-emerald-500/30"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Signal badge + confidence */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Active Signal
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-14 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${market.confidence}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-500">
            {market.confidence}%
          </span>
        </div>
      </div>

      {/* Market name */}
      <h3 className="font-semibold text-gray-100 text-base leading-snug mb-2 line-clamp-2">
        {market.question}
      </h3>

      {/* Why this is interesting now */}
      <p className="text-sm text-gray-400 mb-4 leading-relaxed line-clamp-2">
        {market.whyThisMatters}
      </p>

      {/* Evidence preview */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-gray-800/50 rounded-xl">
        <div className="flex-1">
          <MiniSparkline marketId={market.id} height={32} color="green" />
        </div>
        <div className="flex flex-col gap-2 pl-3 border-l border-gray-700">
          <VolatilityIndicator level={volatility} />
          <LiquidityBar value={market.confidence} label="Depth" />
        </div>
      </div>

      {/* Signal label */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-lg font-medium border border-emerald-500/20">
          {market.setupLabel}
        </span>
        <HiddenExposureInlineWarning marketId={market.id} />
      </div>

      {/* CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-800">
        <span className="text-xs text-gray-600">
          {market.category || "Market"}
        </span>
        <span className="text-xs font-medium text-emerald-400 flex items-center gap-1 group-hover:gap-2 transition-all">
          View market details
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

function HighFrictionSignalCard({
  market,
}: {
  market: DailyAttentionResponse["retailTraps"][0];
}) {
  return (
    <Link
      href={`/markets/${market.id}`}
      className="group block bg-gray-900/50 backdrop-blur rounded-2xl p-5 hover:bg-gray-900/80 transition-all duration-300 border border-gray-800/50 hover:border-rose-500/30"
    >
      {/* Signal badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
            High Friction
          </span>
        </div>
        <span className="text-xs text-gray-600">
          Structurally unfavorable
        </span>
      </div>

      {/* Market name */}
      <h3 className="font-semibold text-gray-100 text-base leading-snug mb-2 line-clamp-2">
        {market.question}
      </h3>

      {/* Common mistake */}
      <p className="text-sm text-gray-400 mb-4 leading-relaxed line-clamp-2">
        {market.commonMistake}
      </p>

      {/* Evidence preview */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-gray-800/50 rounded-xl">
        <div className="flex-1">
          <MiniSparkline marketId={market.id} height={32} color="red" />
        </div>
        <div className="flex flex-col gap-2 pl-3 border-l border-gray-700">
          <VolatilityIndicator level="high" />
          <LiquidityBar value={30} label="Depth" />
        </div>
      </div>

      {/* Signal label */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="px-2.5 py-1 bg-rose-500/10 text-rose-400 text-xs rounded-lg font-medium border border-rose-500/20">
          {market.warningLabel}
        </span>
        <HiddenExposureInlineWarning marketId={market.id} />
      </div>

      {/* CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-800">
        <span className="text-xs text-gray-600">
          {market.category || "Market"}
        </span>
        <span className="text-xs font-medium text-rose-400 flex items-center gap-1 group-hover:gap-2 transition-all">
          Understand structure
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

function SignalTimelineRow({ change }: { change: DailyAttentionResponse["whatChanged"][0] }) {
  const typeConfig: Record<string, { color: string; label: string }> = {
    state_shift: { color: "violet", label: "State Shift" },
    event_window: { color: "amber", label: "Event Window" },
    mispricing: { color: "sky", label: "Exposure Link" },
    flow_guard: { color: "rose", label: "Flow Guard" },
  };

  const config = typeConfig[change.changeType] || typeConfig.state_shift;
  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    violet: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
    sky: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/20" },
    rose: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
  };
  const colors = colorClasses[config.color];

  return (
    <Link
      href={`/markets/${change.marketId}`}
      className="group flex items-center gap-4 p-4 bg-gray-900/30 rounded-xl hover:bg-gray-900/50 transition-all border border-gray-800/30 hover:border-gray-700"
    >
      {/* Label chip */}
      <span className={`shrink-0 px-2.5 py-1 text-xs rounded-lg font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
        {config.label}
      </span>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-300 truncate">{change.question}</p>
        <p className="text-xs text-gray-500 truncate">{change.description}</p>
      </div>

      {/* Time indicator */}
      <span className="shrink-0 text-xs text-gray-600">
        Recent
      </span>

      {/* Arrow */}
      <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-1 transition-all shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function PulsePage() {
  const { isPremium } = usePremiumStatus();
  const { isOpen, openUpgrade, closeUpgrade } = usePremiumUpgrade();

  const { data, isLoading, error } = useQuery({
    queryKey: ["dailyAttention"],
    queryFn: getDailyAttention,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Hero */}
      <HeroSection />

      {/* Signal Sections */}
      <div id="signals" className="max-w-6xl mx-auto px-6 pb-16">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-700 border-t-emerald-500"></div>
            <p className="mt-4 text-sm text-gray-500">Loading signals...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-rose-400">
            Unable to load signals. Please refresh.
          </div>
        ) : (
          <>
            {/* Section A: Active Signals */}
            <section className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 bg-emerald-500 rounded-full" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-100">
                    Active Signals
                  </h2>
                  <p className="text-sm text-gray-500">
                    Where structure is favorable or changing right now
                  </p>
                </div>
              </div>

              {data?.worthAttention && data.worthAttention.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {data.worthAttention.slice(0, 6).map((market, index) => (
                    <ActiveSignalCard
                      key={market.id}
                      market={market}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-gray-900/50 rounded-2xl p-8 text-center border border-gray-800/50">
                  <p className="text-gray-400">No active signals detected.</p>
                  <p className="text-xs text-gray-600 mt-1">Quality signals are rare by design.</p>
                </div>
              )}
            </section>

            {/* Section B: High Friction Signals */}
            <section className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 bg-rose-500 rounded-full" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-100">
                    High Friction Signals
                  </h2>
                  <p className="text-sm text-gray-500">
                    Markets that quietly punish late or crowded entries
                  </p>
                </div>
              </div>

              {data?.retailTraps && data.retailTraps.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {data.retailTraps.slice(0, 6).map((market) => (
                    <HighFrictionSignalCard
                      key={market.id}
                      market={market}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-gray-900/50 rounded-2xl p-8 text-center border border-gray-800/50">
                  <p className="text-gray-400">No high-friction signals detected.</p>
                </div>
              )}
            </section>

            {/* Section C: Signal Timeline */}
            <section className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 bg-violet-500 rounded-full" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-100">
                    Signal Timeline
                  </h2>
                  <p className="text-sm text-gray-500">
                    State changes, event windows, and emerging signals
                  </p>
                </div>
              </div>

              {data?.whatChanged && data.whatChanged.length > 0 ? (
                <div className="space-y-3">
                  {data.whatChanged.slice(0, 8).map((change, i) => (
                    <SignalTimelineRow key={i} change={change} />
                  ))}
                </div>
              ) : (
                <div className="bg-gray-900/50 rounded-2xl p-8 text-center border border-gray-800/50">
                  <p className="text-gray-400">No recent signal changes.</p>
                </div>
              )}
            </section>

            {/* Premium Promotion - Free Users Only */}
            {!isPremium && (
              <section className="mb-16">
                <button
                  onClick={openUpgrade}
                  className="w-full bg-gradient-to-r from-emerald-900/30 to-emerald-800/10 border border-emerald-500/20 rounded-2xl p-8 text-left hover:from-emerald-900/40 hover:to-emerald-800/20 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-xl bg-emerald-500 flex items-center justify-center">
                        <svg className="w-7 h-7 text-gray-950" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-100 mb-1">
                          Unlock deeper signal context
                        </h3>
                        <p className="text-gray-400">
                          See why signals fire and what retail traders typically get wrong.
                        </p>
                      </div>
                    </div>
                    <svg className="w-6 h-6 text-emerald-500 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </section>
            )}
          </>
        )}

        {/* Footer */}
        <footer className="text-center pt-8 border-t border-gray-800">
          <p className="text-xs text-gray-600 max-w-md mx-auto">
            Pulse provides structural analysis only. Signals reflect market conditions, not predictions.
            Not financial advice. Not a trading service.
          </p>
        </footer>
      </div>

      {/* Premium Upgrade Modal */}
      <PremiumUpgradeModal isOpen={isOpen} onClose={closeUpgrade} />
    </main>
  );
}
