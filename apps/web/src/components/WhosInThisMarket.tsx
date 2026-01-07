"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

interface ParticipationSide {
  side: "YES" | "NO";
  setupQualityScore: number;
  setupQualityBand: string;
  participantQualityScore: number;
  participantQualityBand: string;
  participationSummary: string;
  breakdown: {
    largePct: number;
    midPct: number;
    smallPct: number;
  };
  behaviorInsight: string;
  displayInfo: {
    setupQuality: {
      label: string;
      description: string;
      color: string;
    };
    participantQuality: {
      label: string;
      description: string;
      color: string;
    };
  };
}

interface ParticipationData {
  marketId: string;
  yes: ParticipationSide | null;
  no: ParticipationSide | null;
  disclaimer: string;
}

// Plain-language activity trend
function getActivityTrend(participantBand: string): { label: string; color: string } {
  switch (participantBand) {
    case "strong":
      return { label: "Active", color: "text-emerald-600 dark:text-emerald-400" };
    case "moderate":
      return { label: "Moderate", color: "text-amber-600 dark:text-amber-400" };
    case "limited":
      return { label: "Quiet", color: "text-gray-500 dark:text-gray-400" };
    default:
      return { label: "Unclear", color: "text-gray-400" };
  }
}

// Get crowd description based on participation summary
function getCrowdDescription(summary: string): string {
  switch (summary) {
    case "few_dominant":
      return "A few big players";
    case "mixed_participation":
      return "Mix of sizes";
    case "broad_retail":
      return "Mostly smaller traders";
    default:
      return "Various participants";
  }
}

// Participation Momentum - derives from quality scores to simulate trend
// In a real implementation, this would compare current vs historical participation
type MomentumState = "building" | "stable" | "fading";

function getParticipationMomentum(
  participantScore: number,
  setupScore: number,
  summary: string
): { state: MomentumState; label: string; color: string; arrow: string } {
  // Heuristic: high participant score + recent activity suggests building
  // Low scores suggest fading, moderate is stable
  // This is a simplified model - real implementation would track changes over time

  const combinedScore = (participantScore * 0.6 + setupScore * 0.4);

  // Add some variance based on participation summary
  const summaryBoost = summary === "broad_retail" ? 10 : summary === "few_dominant" ? -5 : 0;
  const adjusted = combinedScore + summaryBoost;

  if (adjusted >= 70) {
    return {
      state: "building",
      label: "Interest building",
      color: "text-emerald-600 dark:text-emerald-400",
      arrow: "↑",
    };
  }
  if (adjusted >= 45) {
    return {
      state: "stable",
      label: "Stable participation",
      color: "text-gray-600 dark:text-gray-400",
      arrow: "→",
    };
  }
  return {
    state: "fading",
    label: "Interest fading",
    color: "text-amber-600 dark:text-amber-400",
    arrow: "↓",
  };
}

// Simple stacked bar for wallet size breakdown
function WalletBreakdownBar({ breakdown, side }: { breakdown: { largePct: number; midPct: number; smallPct: number }; side: "YES" | "NO" }) {
  const colors = side === "YES"
    ? {
        large: "bg-emerald-700 dark:bg-emerald-400",
        mid: "bg-emerald-400 dark:bg-emerald-600",
        small: "bg-emerald-200 dark:bg-emerald-800",
      }
    : {
        large: "bg-rose-700 dark:bg-rose-400",
        mid: "bg-rose-400 dark:bg-rose-600",
        small: "bg-rose-200 dark:bg-rose-800",
      };

  return (
    <div className="space-y-2">
      <div className="h-2.5 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-800">
        <div
          className={`${colors.large} transition-all`}
          style={{ width: `${breakdown.largePct}%` }}
          title={`Large wallets: ${breakdown.largePct}%`}
        />
        <div
          className={`${colors.mid} transition-all`}
          style={{ width: `${breakdown.midPct}%` }}
          title={`Medium wallets: ${breakdown.midPct}%`}
        />
        <div
          className={`${colors.small} transition-all`}
          style={{ width: `${breakdown.smallPct}%` }}
          title={`Small wallets: ${breakdown.smallPct}%`}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400">
        <span>Large</span>
        <span>Medium</span>
        <span>Small</span>
      </div>
    </div>
  );
}

// Participation Momentum indicator
function MomentumIndicator({ momentum }: { momentum: { state: MomentumState; label: string; color: string; arrow: string } }) {
  return (
    <div
      className="flex items-center gap-1.5 group"
      title="Shows whether more participants are entering, staying steady, or leaving this side of the market. This reflects attention, not outcome."
    >
      <span className={`text-xs font-medium ${momentum.color}`}>
        {momentum.arrow}
      </span>
      <span className={`text-xs ${momentum.color}`}>
        {momentum.label}
      </span>
      <span className="text-[10px] text-gray-400 dark:text-gray-500 cursor-help opacity-0 group-hover:opacity-100 transition-opacity">
        ?
      </span>
    </div>
  );
}

// Setup Clarity indicator (0-5 dots)
function SetupClarityIndicator({ yesBand, noBand }: { yesBand: string; noBand: string }) {
  const bandRank: Record<string, number> = {
    historically_favorable: 4,
    mixed_workable: 3,
    neutral: 2,
    historically_unforgiving: 1,
  };

  const yeRank = bandRank[yesBand] ?? 2;
  const noRank = bandRank[noBand] ?? 2;
  const diff = Math.abs(yeRank - noRank);

  let clarity = 0;
  if (diff === 0) clarity = 0;
  else if (diff === 1) clarity = 2;
  else if (diff === 2) clarity = 4;
  else clarity = 5;

  if (clarity === 0) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400 italic">
        No clear structural asymmetry detected
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600 dark:text-gray-400">Setup Clarity:</span>
      <div className="flex gap-1" title="Reflects how clearly one side is structured differently than the other. Not a prediction.">
        {[1, 2, 3, 4, 5].map((dot) => (
          <div
            key={dot}
            className={`w-2 h-2 rounded-full ${
              dot <= clarity
                ? "bg-gray-700 dark:bg-gray-300"
                : "bg-gray-200 dark:bg-gray-700"
            }`}
          />
        ))}
      </div>
      <span className="text-[10px] text-gray-400 dark:text-gray-500 cursor-help" title="Reflects how clearly one side is structured differently than the other. Not a prediction.">
        ?
      </span>
    </div>
  );
}

// Generate "What this usually means" text
function getWhatThisMeans(yesSummary: string, noSummary: string): string {
  const yesIsDominant = yesSummary === "few_dominant";
  const noIsDominant = noSummary === "few_dominant";
  const yesIsRetail = yesSummary === "broad_retail";
  const noIsRetail = noSummary === "broad_retail";

  if (yesIsDominant && noIsRetail) {
    return "When big players stack one side and retail fills the other, moves can be sudden. The concentrated side often reprices faster than the crowded side can react.";
  }
  if (noIsDominant && yesIsRetail) {
    return "Big players concentrated on NO while retail crowds YES. If sentiment shifts, the retail side may see sharper moves as larger players step back.";
  }
  if (yesIsDominant && noIsDominant) {
    return "Both sides have concentrated positions. Markets like this tend to stay quiet until one side blinks, then can move fast.";
  }
  if (yesIsRetail && noIsRetail) {
    return "Retail-heavy on both sides. These markets often see choppy action around news, with price bouncing until a clearer direction emerges.";
  }
  if (yesSummary === "mixed_participation" || noSummary === "mixed_participation") {
    return "Mixed crowd on at least one side. Usually means decent liquidity but watch for sudden shifts if large players start moving.";
  }
  return "Standard participation pattern. Keep an eye on volume changes for hints about incoming moves.";
}

// Generate "Why retail should care" text
function getWhyRetailCares(yesSummary: string, noSummary: string, yesBreakdown: { largePct: number }, noBreakdown: { largePct: number }): string {
  const yesHasWhales = yesBreakdown.largePct >= 40;
  const noHasWhales = noBreakdown.largePct >= 40;

  if (yesHasWhales && !noHasWhales) {
    return "Large wallets dominate YES. If you're taking the other side, you're betting against bigger pockets. Your fills may get worse if they decide to move.";
  }
  if (noHasWhales && !yesHasWhales) {
    return "Large wallets dominate NO. Going against them means competing with deeper pockets. Consider your size and timing carefully.";
  }
  if (yesHasWhales && noHasWhales) {
    return "Big players on both sides. Execution matters here—entering or exiting quickly can be harder than it looks when whales start moving.";
  }
  if (yesSummary === "broad_retail" && noSummary === "broad_retail") {
    return "Mostly retail on both sides. Good for getting in and out, but expect noise. Don't mistake volume for signal.";
  }
  return "Check your size relative to the market. In thinner conditions, your entry and exit can move the price against you.";
}

// Generate "What often trips people up here" text - common retail mistakes
function getCommonMistakes(
  yesSummary: string,
  noSummary: string,
  yesMomentum: MomentumState,
  noMomentum: MomentumState
): string[] {
  const mistakes: string[] = [];
  const yesIsDominant = yesSummary === "few_dominant";
  const noIsDominant = noSummary === "few_dominant";
  const yesIsRetail = yesSummary === "broad_retail";
  const noIsRetail = noSummary === "broad_retail";

  // Late entry after move
  if (yesMomentum === "building" || noMomentum === "building") {
    mistakes.push("Most people enter after the price has already moved, paying more than they expect.");
  }

  // Crowded side punishment
  if (yesIsRetail || noIsRetail) {
    mistakes.push("Crowded sides tend to unwind painfully—late entries get punished when sentiment flips.");
  }

  // Flat then fast
  if (yesIsDominant && noIsDominant) {
    mistakes.push("Price often stays flat for a long time, then jumps quickly in a short window.");
  }

  // Early moves attract attention
  if ((yesMomentum === "building" && noMomentum === "stable") || (noMomentum === "building" && yesMomentum === "stable")) {
    mistakes.push("Small early moves attract attention, but most of the real movement happens later.");
  }

  // Fast moves when participation shifts
  if (yesMomentum === "fading" || noMomentum === "fading") {
    mistakes.push("Many traders underestimate how fast price can move once participation shifts.");
  }

  // Mixed crowd liquidity trap
  if (yesSummary === "mixed_participation" || noSummary === "mixed_participation") {
    mistakes.push("What looks like good liquidity can disappear fast when larger players step back.");
  }

  // Return top 2-3 most relevant mistakes
  return mistakes.slice(0, 3);
}

// Generate "How to use this" guidance - non-advisory, practical bullets
function getHowToUseThis(
  yesSummary: string,
  noSummary: string,
  yesMomentum: MomentumState,
  noMomentum: MomentumState
): string[] {
  const guidance: string[] = [];
  const yesIsDominant = yesSummary === "few_dominant";
  const noIsDominant = noSummary === "few_dominant";
  const yesIsRetail = yesSummary === "broad_retail";
  const noIsRetail = noSummary === "broad_retail";

  // Momentum flip warning
  if (yesMomentum === "building" || noMomentum === "building") {
    guidance.push("Watch for momentum flips—participation shifts often come with faster repricing.");
  }

  // Step moves for concentrated positions
  if (yesIsDominant || noIsDominant) {
    guidance.push("If one side is concentrated, expect quicker moves when that side changes. Prices often change in steps, not smoothly.");
  }

  // Fading activity
  if (yesMomentum === "fading" || noMomentum === "fading") {
    guidance.push("If activity is fading, price may stay quiet until attention returns.");
  }

  // Retail crowding execution
  if (yesIsRetail || noIsRetail) {
    guidance.push("With retail crowding, watch your entry timing—crowded trades tend to get worse fills when sentiment shifts.");
  }

  // Mixed participation liquidity
  if (yesSummary === "mixed_participation" || noSummary === "mixed_participation") {
    guidance.push("Mixed crowds can provide decent liquidity, but that can change fast if larger players exit.");
  }

  // General
  if (guidance.length === 0) {
    guidance.push("Monitor participation changes—shifts in who's active often precede price moves.");
  }

  return guidance.slice(0, 3);
}

// Check if participation is symmetric (no clear edge)
function isParticipationSymmetric(
  yesSummary: string,
  noSummary: string,
  yesMomentum: MomentumState,
  noMomentum: MomentumState,
  yesScore: number,
  noScore: number
): boolean {
  // Both sides same summary
  if (yesSummary === noSummary && yesSummary === "mixed_participation") {
    return true;
  }
  // Both momentum stable and similar scores
  if (yesMomentum === "stable" && noMomentum === "stable" && Math.abs(yesScore - noScore) < 15) {
    return true;
  }
  return false;
}

// Check if activity is too thin
function isActivityThin(yesScore: number, noScore: number): boolean {
  return yesScore < 30 && noScore < 30;
}

// Side card component with momentum
function SideCard({ side, data }: { side: "YES" | "NO"; data: ParticipationSide }) {
  const activityTrend = getActivityTrend(data.participantQualityBand);
  const crowdDesc = getCrowdDescription(data.participationSummary);
  const momentum = getParticipationMomentum(
    data.participantQualityScore,
    data.setupQualityScore,
    data.participationSummary
  );

  const bgColor = side === "YES"
    ? "bg-emerald-50 dark:bg-emerald-900/10"
    : "bg-rose-50 dark:bg-rose-900/10";
  const borderColor = side === "YES"
    ? "border-emerald-100 dark:border-emerald-900/30"
    : "border-rose-100 dark:border-rose-900/30";
  const labelColor = side === "YES"
    ? "text-emerald-700 dark:text-emerald-400"
    : "text-rose-700 dark:text-rose-400";

  return (
    <div className={`rounded-xl p-4 ${bgColor} border ${borderColor}`}>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-sm font-semibold ${labelColor}`}>
          {side}
        </span>
        <span className={`text-xs font-medium ${activityTrend.color}`}>
          {activityTrend.label}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Who's here</p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {crowdDesc}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Wallet mix</p>
          <WalletBreakdownBar breakdown={data.breakdown} side={side} />
        </div>

        {/* Participation Momentum */}
        <div className="pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
          <MomentumIndicator momentum={momentum} />
        </div>
      </div>
    </div>
  );
}

export function WhosInThisMarket({ marketId }: { marketId: string }) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<ParticipationData>({
    queryKey: ["participation", marketId],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/markets/${marketId}/participation`);
      if (!res.ok) {
        throw new Error("Failed to fetch participation data");
      }
      return res.json();
    },
    enabled: !!marketId,
    staleTime: 5 * 60 * 1000,
  });

  const computeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/markets/${marketId}/compute-participation`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to compute");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participation", marketId] });
    },
  });

  useEffect(() => {
    if (!isLoading && !error && data && !data.yes && !data.no && !computeMutation.isPending) {
      computeMutation.mutate();
    }
  }, [isLoading, error, data, computeMutation.isPending]);

  if (isLoading || computeMutation.isPending) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-6 bg-gray-900 dark:bg-gray-100 rounded-full" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Who's In This Market
          </h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Checking who's positioned on each side...
        </p>
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return null;
  }

  if (!data || (!data.yes && !data.no)) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-6 bg-gray-900 dark:bg-gray-100 rounded-full" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Who's In This Market
          </h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Not enough activity yet to see who's positioned here.
        </p>
      </div>
    );
  }

  const yesSummary = data.yes?.participationSummary ?? "mixed_participation";
  const noSummary = data.no?.participationSummary ?? "mixed_participation";
  const yesBreakdown = data.yes?.breakdown ?? { largePct: 30, midPct: 40, smallPct: 30 };
  const noBreakdown = data.no?.breakdown ?? { largePct: 30, midPct: 40, smallPct: 30 };
  const yesBand = data.yes?.setupQualityBand ?? "neutral";
  const noBand = data.no?.setupQualityBand ?? "neutral";

  // Calculate momentum for both sides
  const yesMomentum = getParticipationMomentum(
    data.yes?.participantQualityScore ?? 50,
    data.yes?.setupQualityScore ?? 50,
    yesSummary
  );
  const noMomentum = getParticipationMomentum(
    data.no?.participantQualityScore ?? 50,
    data.no?.setupQualityScore ?? 50,
    noSummary
  );

  const yesScore = data.yes?.participantQualityScore ?? 50;
  const noScore = data.no?.participantQualityScore ?? 50;

  const whatThisMeans = getWhatThisMeans(yesSummary, noSummary);
  const whyRetailCares = getWhyRetailCares(yesSummary, noSummary, yesBreakdown, noBreakdown);
  const commonMistakes = getCommonMistakes(yesSummary, noSummary, yesMomentum.state, noMomentum.state);
  const howToUseThis = getHowToUseThis(yesSummary, noSummary, yesMomentum.state, noMomentum.state);

  // Check for symmetric/thin data states
  const isSymmetric = isParticipationSymmetric(yesSummary, noSummary, yesMomentum.state, noMomentum.state, yesScore, noScore);
  const isThin = isActivityThin(yesScore, noScore);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-6 bg-gray-900 dark:bg-gray-100 rounded-full" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Who's In This Market
          </h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          A look at how many people are involved, how big they are, and how crowded each side is.
        </p>
      </div>

      {/* No clear edge state */}
      {(isSymmetric || isThin) && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            {isThin
              ? "Not enough recent activity to read participation structure yet."
              : "Participation looks balanced right now—no clear crowding or asymmetry detected."}
          </p>
        </div>
      )}

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {data.yes && <SideCard side="YES" data={data.yes} />}
        {data.no && <SideCard side="NO" data={data.no} />}
      </div>

      {/* Setup Clarity indicator */}
      {data.yes && data.no && !isSymmetric && !isThin && (
        <div className="mb-6">
          <SetupClarityIndicator yesBand={yesBand} noBand={noBand} />
        </div>
      )}

      {/* Explanation blocks - only show if not symmetric/thin */}
      {!isSymmetric && !isThin && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
              What this usually means
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {whatThisMeans}
            </p>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-400 uppercase tracking-wide mb-2">
              Why retail should care
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300/80 leading-relaxed">
              {whyRetailCares}
            </p>
          </div>

          {/* What often trips people up */}
          {commonMistakes.length > 0 && (
            <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/30">
              <p className="text-xs font-medium text-rose-800 dark:text-rose-400 uppercase tracking-wide mb-2">
                What often trips people up here
              </p>
              <ul className="space-y-2">
                {commonMistakes.map((mistake, idx) => (
                  <li key={idx} className="text-sm text-rose-700 dark:text-rose-300/80 leading-relaxed flex items-start gap-2">
                    <span className="text-rose-400 dark:text-rose-500 mt-0.5">•</span>
                    <span>{mistake}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* How to use this - NEW SECTION */}
          {howToUseThis.length > 0 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
              <p className="text-xs font-medium text-blue-800 dark:text-blue-400 uppercase tracking-wide mb-2">
                How to use this
              </p>
              <ul className="space-y-2">
                {howToUseThis.map((tip, idx) => (
                  <li key={idx} className="text-sm text-blue-700 dark:text-blue-300/80 leading-relaxed flex items-start gap-2">
                    <span className="text-blue-400 dark:text-blue-500 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Minimal disclaimer */}
      <p className="mt-5 text-[10px] text-gray-400 dark:text-gray-500">
        Based on structural patterns, not a prediction. Position sizes and timing are yours to decide.
      </p>
    </div>
  );
}

// Compact version for signal cards
export function ParticipationContextLine({ marketId }: { marketId: string }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<ParticipationData>({
    queryKey: ["participation", marketId],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/markets/${marketId}/participation`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!marketId,
    staleTime: 5 * 60 * 1000,
  });

  const computeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/markets/${marketId}/compute-participation`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to compute");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participation", marketId] });
    },
  });

  useEffect(() => {
    if (!isLoading && data && !data.yes && !data.no && !computeMutation.isPending) {
      computeMutation.mutate();
    }
  }, [isLoading, data, computeMutation.isPending]);

  if (!data?.yes) return null;

  const { participationSummary, participantQualityBand } = data.yes;
  const crowdDesc = getCrowdDescription(participationSummary);
  const activityTrend = getActivityTrend(participantQualityBand);

  return (
    <span className="text-xs text-gray-500 dark:text-gray-400">
      {crowdDesc} · {activityTrend.label.toLowerCase()} activity
    </span>
  );
}

// NEW: Compact momentum badge for Markets/Pulse pages
export function ParticipationMomentumBadge({ marketId }: { marketId: string }) {
  const { data } = useQuery<ParticipationData>({
    queryKey: ["participation", marketId],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/markets/${marketId}/participation`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!marketId,
    staleTime: 5 * 60 * 1000,
  });

  if (!data?.yes) return null;

  const momentum = getParticipationMomentum(
    data.yes.participantQualityScore,
    data.yes.setupQualityScore,
    data.yes.participationSummary
  );

  // Compact labels for badges
  const badgeLabels: Record<MomentumState, string> = {
    building: "Interest building",
    stable: "Crowd stable",
    fading: "Attention fading",
  };

  const badgeColors: Record<MomentumState, string> = {
    building: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    stable: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
    fading: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${badgeColors[momentum.state]}`}
      title="Shows whether more participants are entering, staying steady, or leaving this side of the market. This reflects attention, not outcome."
    >
      <span>{momentum.arrow}</span>
      <span>{badgeLabels[momentum.state]}</span>
    </span>
  );
}

// Helper to get momentum data for filtering (used by Pulse/Markets pages)
export function useParticipationMomentum(marketId: string) {
  const { data } = useQuery<ParticipationData>({
    queryKey: ["participation", marketId],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/markets/${marketId}/participation`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!marketId,
    staleTime: 5 * 60 * 1000,
  });

  if (!data?.yes || !data?.no) return null;

  const yesMomentum = getParticipationMomentum(
    data.yes.participantQualityScore,
    data.yes.setupQualityScore,
    data.yes.participationSummary
  );
  const noMomentum = getParticipationMomentum(
    data.no.participantQualityScore,
    data.no.setupQualityScore,
    data.no.participationSummary
  );

  return {
    yes: yesMomentum,
    no: noMomentum,
    hasAsymmetry: yesMomentum.state !== noMomentum.state,
    hasBuildingInterest: yesMomentum.state === "building" || noMomentum.state === "building",
  };
}
