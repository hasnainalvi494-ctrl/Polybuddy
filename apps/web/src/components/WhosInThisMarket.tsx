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

// Setup Clarity indicator (0-5 dots)
function SetupClarityIndicator({ yesBand, noBand }: { yesBand: string; noBand: string }) {
  // Calculate asymmetry - how different are the sides?
  const bandRank: Record<string, number> = {
    historically_favorable: 4,
    mixed_workable: 3,
    neutral: 2,
    historically_unforgiving: 1,
  };

  const yeRank = bandRank[yesBand] ?? 2;
  const noRank = bandRank[noBand] ?? 2;
  const diff = Math.abs(yeRank - noRank);

  // 0 diff = symmetric, 3 diff = max asymmetry
  // Map to 0-5 dots
  let clarity = 0;
  if (diff === 0) clarity = 0; // symmetric
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

// Side card component - simplified
function SideCard({ side, data }: { side: "YES" | "NO"; data: ParticipationSide }) {
  const activityTrend = getActivityTrend(data.participantQualityBand);
  const crowdDesc = getCrowdDescription(data.participationSummary);

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
      </div>
    </div>
  );
}

export function WhosInThisMarket({ marketId }: { marketId: string }) {
  const queryClient = useQueryClient();

  // Fetch existing participation data
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

  // Auto-compute mutation
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

  // Auto-trigger computation if no data exists
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
    return null; // Fail silently
  }

  // If still no data after computation attempt
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

  const whatThisMeans = getWhatThisMeans(yesSummary, noSummary);
  const whyRetailCares = getWhyRetailCares(yesSummary, noSummary, yesBreakdown, noBreakdown);

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

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {data.yes && <SideCard side="YES" data={data.yes} />}
        {data.no && <SideCard side="NO" data={data.no} />}
      </div>

      {/* Setup Clarity indicator */}
      {data.yes && data.no && (
        <div className="mb-6">
          <SetupClarityIndicator yesBand={yesBand} noBand={noBand} />
        </div>
      )}

      {/* Explanation blocks */}
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
      </div>

      {/* Minimal disclaimer */}
      <p className="mt-5 text-[10px] text-gray-400 dark:text-gray-500">
        Based on structural patterns, not a prediction. Position sizes and timing are yours to decide.
      </p>
    </div>
  );
}

// Compact version for signal cards - also auto-computes
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

  // Auto-compute mutation
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

  // Auto-trigger computation if no data
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
