"use client";

import { useQuery } from "@tanstack/react-query";
import { getDisputeForMarket, type Dispute } from "@/lib/api";

interface DisputeWarningBannerProps {
  marketId: string;
}

function getDisputeStatusLabel(status: Dispute["disputeStatus"]): string {
  switch (status) {
    case "commit_stage":
      return "Commit Stage";
    case "reveal_stage":
      return "Reveal Stage";
    case "resolved":
      return "Resolved";
    default:
      return "Unknown";
  }
}

function getDisputeStatusColor(status: Dispute["disputeStatus"]): string {
  switch (status) {
    case "commit_stage":
      return "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400";
    case "reveal_stage":
      return "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400";
    case "resolved":
      return "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400";
    default:
      return "bg-gray-500/10 border-gray-500/30 text-gray-600 dark:text-gray-400";
  }
}

function formatTimeRemaining(votingEndsAt: string | null): string {
  if (!votingEndsAt) return "Unknown";
  
  const now = new Date();
  const end = new Date(votingEndsAt);
  const diff = end.getTime() - now.getTime();
  
  if (diff < 0) return "Ended";
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h remaining`;
  }
  
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  
  return `${minutes}m remaining`;
}

export function DisputeWarningBanner({ marketId }: DisputeWarningBannerProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["dispute", marketId],
    queryFn: () => getDisputeForMarket(marketId),
    staleTime: 60 * 1000, // 1 minute
  });

  // Don't show anything while loading or if no dispute
  if (isLoading || !data?.dispute) {
    return null;
  }

  const dispute = data.dispute;
  const statusColor = getDisputeStatusColor(dispute.disputeStatus);
  const statusLabel = getDisputeStatusLabel(dispute.disputeStatus);

  return (
    <div className={`rounded-2xl border-2 p-6 ${statusColor}`}>
      <div className="flex items-start gap-4">
        {/* Warning Icon */}
        <div className="flex-shrink-0">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-bold">⚠️ Resolution Disputed</h3>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-current/10">
              {statusLabel}
            </span>
          </div>

          <p className="text-sm leading-relaxed mb-4 opacity-90">
            This market's resolution is currently being disputed through UMA Oracle.
            The outcome may change based on the voting results.
          </p>

          {/* Dispute Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {dispute.proposedOutcome && (
              <div className="bg-black/5 dark:bg-white/5 rounded-lg p-3">
                <div className="text-xs opacity-70 mb-1">Proposed Outcome</div>
                <div className="font-semibold">{dispute.proposedOutcome}</div>
              </div>
            )}

            {dispute.disputedOutcome && (
              <div className="bg-black/5 dark:bg-white/5 rounded-lg p-3">
                <div className="text-xs opacity-70 mb-1">Disputed Outcome</div>
                <div className="font-semibold">{dispute.disputedOutcome}</div>
              </div>
            )}

            {dispute.votingEndsAt && (
              <div className="bg-black/5 dark:bg-white/5 rounded-lg p-3">
                <div className="text-xs opacity-70 mb-1">Voting Ends</div>
                <div className="font-semibold">
                  {formatTimeRemaining(dispute.votingEndsAt)}
                </div>
              </div>
            )}
          </div>

          {/* Voting Stats */}
          {dispute.totalVotes > 0 && (
            <div className="bg-black/5 dark:bg-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Voting Progress</span>
                <span className="text-sm opacity-70">
                  {dispute.totalVotes} total votes
                </span>
              </div>

              <div className="flex gap-2 mb-2">
                <div className="flex-1">
                  <div className="h-2 bg-emerald-500 rounded-full" style={{
                    width: `${(dispute.yesVotes / dispute.totalVotes) * 100}%`
                  }} />
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-rose-500 rounded-full" style={{
                    width: `${(dispute.noVotes / dispute.totalVotes) * 100}%`
                  }} />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span>YES: {dispute.yesVotes}</span>
                <span>NO: {dispute.noVotes}</span>
              </div>
            </div>
          )}

          {/* Warning Message */}
          <div className="mt-4 text-sm opacity-80 leading-relaxed">
            <strong>What this means:</strong> UMA token holders are voting on the
            correct resolution. The final outcome will be determined by this vote.
            Consider the dispute status before trading.
          </div>

          {/* Learn More Link */}
          <a
            href="https://docs.uma.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-sm font-medium hover:underline"
          >
            Learn about UMA Oracle
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

