"use client";

// Types
export type MomentumState = "building" | "stable" | "fading";
export type CrowdingState = "yes" | "no" | "balanced" | "unknown";
export type RetailRiskState = "choppy" | "crowded" | "step-move" | "quiet" | "balanced";

export interface MarketParticipationData {
  participantQualityScore: number;
  setupQualityScore: number;
  participationSummary: string;
  setupQualityBand?: string;
  breakdown?: {
    largePct: number;
    midPct: number;
    smallPct: number;
  };
}

// Calculate momentum from scores
export function getMomentum(
  participantScore: number,
  setupScore: number,
  summary: string
): { state: MomentumState; label: string; arrow: string } {
  const combinedScore = participantScore * 0.6 + setupScore * 0.4;
  const summaryBoost = summary === "broad_retail" ? 10 : summary === "few_dominant" ? -5 : 0;
  const adjusted = combinedScore + summaryBoost;

  if (adjusted >= 70) {
    return { state: "building", label: "Interest building", arrow: "↑" };
  }
  if (adjusted >= 45) {
    return { state: "stable", label: "Crowd stable", arrow: "→" };
  }
  return { state: "fading", label: "Attention fading", arrow: "↓" };
}

// Calculate crowding state
export function getCrowding(
  summary: string,
  breakdown?: { largePct: number; midPct: number; smallPct: number }
): { state: CrowdingState; label: string } {
  if (!summary || summary === "unknown") {
    return { state: "unknown", label: "Unknown crowd" };
  }

  // If broad retail, it's crowded (likely YES side based on typical patterns)
  if (summary === "broad_retail") {
    const smallDominates = breakdown && breakdown.smallPct > 50;
    return smallDominates
      ? { state: "yes", label: "Crowded YES" }
      : { state: "yes", label: "Crowded YES" };
  }

  // If few dominant, likely concentrated on one side
  if (summary === "few_dominant") {
    return { state: "no", label: "Crowded NO" };
  }

  // Mixed participation = balanced
  return { state: "balanced", label: "Balanced crowd" };
}

// Calculate retail risk flag
export function getRetailRisk(
  summary: string,
  momentum: MomentumState,
  breakdown?: { largePct: number; midPct: number; smallPct: number }
): { state: RetailRiskState; label: string; tooltip: string } {
  const hasLargePlayers = breakdown && breakdown.largePct >= 40;
  const hasSmallCrowd = breakdown && breakdown.smallPct >= 50;

  // Choppy: crowded + mixed participation + building interest
  if (summary === "mixed_participation" && momentum === "building") {
    return {
      state: "choppy",
      label: "Choppy",
      tooltip: "Crowds + shifting participation often means sudden price swings.",
    };
  }

  // Crowded: many small wallets + building interest
  if (summary === "broad_retail" && (momentum === "building" || hasSmallCrowd)) {
    return {
      state: "crowded",
      label: "Crowded",
      tooltip: "Many smaller traders on one side—late entries often get punished.",
    };
  }

  // Step-move: few large participants dominate
  if (summary === "few_dominant" || hasLargePlayers) {
    return {
      state: "step-move",
      label: "Step-move",
      tooltip: "A few big participants can reprice quickly when they act.",
    };
  }

  // Quiet: low activity / fading interest
  if (momentum === "fading") {
    return {
      state: "quiet",
      label: "Quiet",
      tooltip: "Low activity—price may sit still until new attention arrives.",
    };
  }

  // Balanced: no meaningful asymmetry
  return {
    state: "balanced",
    label: "Balanced",
    tooltip: "No clear crowding or asymmetry—standard market conditions.",
  };
}

// Check if data indicates no clear edge
export function hasNoEdge(
  summary: string,
  momentum: MomentumState,
  participantScore: number
): boolean {
  // Symmetric/balanced participation
  if (summary === "mixed_participation" && momentum === "stable") {
    return true;
  }
  // Very low activity scores
  if (participantScore < 30) {
    return true;
  }
  return false;
}

// Momentum badge component
export function MomentumBadge({
  momentum,
  compact = false
}: {
  momentum: { state: MomentumState; label: string; arrow: string };
  compact?: boolean;
}) {
  const colors: Record<MomentumState, string> = {
    building: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    stable: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
    fading: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full ${colors[momentum.state]}`}
      title="Shows whether more participants are entering, staying steady, or leaving. This reflects attention, not outcome."
    >
      <span>{momentum.arrow}</span>
      {!compact && <span>{momentum.label}</span>}
    </span>
  );
}

// Crowding badge component
export function CrowdingBadge({ crowding }: { crowding: { state: CrowdingState; label: string } }) {
  const colors: Record<CrowdingState, string> = {
    yes: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    no: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
    balanced: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
    unknown: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500",
  };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full ${colors[crowding.state]}`}
      title="Shows which side has more concentrated positions."
    >
      {crowding.label}
    </span>
  );
}

// Retail risk badge component
export function RetailRiskBadge({ risk }: { risk: { state: RetailRiskState; label: string; tooltip: string } }) {
  const colors: Record<RetailRiskState, string> = {
    choppy: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    crowded: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
    "step-move": "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    quiet: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
    balanced: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full cursor-help ${colors[risk.state]}`}
      title={risk.tooltip}
    >
      {risk.label}
    </span>
  );
}

// Combined scanner chips row
export function MarketScannerChips({
  data,
  showNoEdge = true,
  compact = false,
}: {
  data: MarketParticipationData | null;
  showNoEdge?: boolean;
  compact?: boolean;
}) {
  if (!data) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">
          Loading participation data...
        </span>
      </div>
    );
  }

  const momentum = getMomentum(data.participantQualityScore, data.setupQualityScore, data.participationSummary);
  const crowding = getCrowding(data.participationSummary, data.breakdown);
  const risk = getRetailRisk(data.participationSummary, momentum.state, data.breakdown);
  const noEdge = hasNoEdge(data.participationSummary, momentum.state, data.participantQualityScore);

  // Show honest "no edge" state
  if (showNoEdge && noEdge) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-gray-500 dark:text-gray-400 italic">
          No clear edge right now
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${compact ? "" : "flex-wrap"}`}>
      <CrowdingBadge crowding={crowding} />
      <MomentumBadge momentum={momentum} compact={compact} />
      <RetailRiskBadge risk={risk} />
    </div>
  );
}

// Real data cues component
export function RealDataCues({
  updatedAt,
  tradeCount,
}: {
  updatedAt?: Date | string | null;
  tradeCount?: number | null;
}) {
  const formatTimeAgo = (date: Date | string): string => {
    const now = new Date();
    const then = typeof date === "string" ? new Date(date) : date;
    const diffMs = now.getTime() - then.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "Updated just now";
    if (diffMin < 60) return `Updated ${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `Updated ${diffHr}h ago`;
    return `Updated ${Math.floor(diffHr / 24)}d ago`;
  };

  // Don't show if no data
  if (!updatedAt && (!tradeCount || tradeCount === 0)) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500">
      {updatedAt && <span>{formatTimeAgo(updatedAt)}</span>}
      {tradeCount && tradeCount > 0 && (
        <>
          {updatedAt && <span>·</span>}
          <span>Seen: {tradeCount.toLocaleString()} trades (24h)</span>
        </>
      )}
    </div>
  );
}

// No clear edge state component
export function NoEdgeState({ reason }: { reason: "balanced" | "thin" }) {
  const messages = {
    balanced: "Participation looks balanced right now—no clear crowding or asymmetry detected.",
    thin: "Not enough recent activity to read participation structure yet.",
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
        {messages[reason]}
      </p>
    </div>
  );
}
