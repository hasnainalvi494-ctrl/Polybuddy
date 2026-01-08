"use client";

import { useQuery } from "@tanstack/react-query";
import { getDisputes, getDisputeHistory, type Dispute, type DisputeHistory } from "@/lib/api";
import Link from "next/link";

function getDisputeStatusBadge(status: Dispute["disputeStatus"]) {
  const configs = {
    commit_stage: {
      label: "Commit Stage",
      className: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    },
    reveal_stage: {
      label: "Reveal Stage",
      className: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
    },
    resolved: {
      label: "Resolved",
      className: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    },
  };

  const config = configs[status];

  return (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}

function formatTimeRemaining(votingEndsAt: string | null): string {
  if (!votingEndsAt) return "Unknown";
  
  const now = new Date();
  const end = new Date(votingEndsAt);
  const diff = end.getTime() - now.getTime();
  
  if (diff < 0) return "Ended";
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d remaining`;
  }
  
  return `${hours}h remaining`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ActiveDisputeCard({ dispute }: { dispute: Dispute }) {
  return (
    <Link href={`/markets/${dispute.marketId}`}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {dispute.market?.question || "Unknown Market"}
            </h3>
            {dispute.market?.category && (
              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400">
                {dispute.market.category}
              </span>
            )}
          </div>
          {getDisputeStatusBadge(dispute.disputeStatus)}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {dispute.proposedOutcome && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Proposed
              </div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {dispute.proposedOutcome}
              </div>
            </div>
          )}

          {dispute.disputedOutcome && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Disputed
              </div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {dispute.disputedOutcome}
              </div>
            </div>
          )}

          {dispute.totalVotes > 0 && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Votes
              </div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {dispute.totalVotes} ({dispute.yesVotes} YES / {dispute.noVotes} NO)
              </div>
            </div>
          )}

          {dispute.votingEndsAt && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Time Left
              </div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {formatTimeRemaining(dispute.votingEndsAt)}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <span>View market details</span>
        </div>
      </div>
    </Link>
  );
}

function HistoryCard({ history }: { history: DisputeHistory }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-100 dark:border-gray-800">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            Market ID: {history.marketId.slice(0, 8)}...
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Resolved {formatDate(history.resolvedAt)}
          </div>
        </div>
        {history.resolutionFlipped ? (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">
            Flipped
          </span>
        ) : (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
            Upheld
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {history.originalOutcome && (
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Original
            </div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {history.originalOutcome}
            </div>
          </div>
        )}

        {history.finalOutcome && (
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Final
            </div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {history.finalOutcome}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DisputesPage() {
  const { data: disputesData, isLoading: isLoadingDisputes } = useQuery({
    queryKey: ["disputes"],
    queryFn: getDisputes,
    staleTime: 60 * 1000, // 1 minute
  });

  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["dispute-history"],
    queryFn: () => getDisputeHistory(20),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            UMA Dispute Tracking
          </h1>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-3xl">
            Monitor active disputes and historical resolutions on Polymarket markets.
            UMA Oracle enables decentralized dispute resolution through token holder voting.
          </p>
        </header>

        {/* Active Disputes Section */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-gray-900 dark:bg-gray-100 rounded-full" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Active Disputes
            </h2>
            {disputesData && disputesData.count > 0 && (
              <span className="px-3 py-1 text-sm font-semibold rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">
                {disputesData.count}
              </span>
            )}
          </div>

          {isLoadingDisputes ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-900 dark:border-gray-700 dark:border-t-gray-100"></div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Loading disputes...
              </p>
            </div>
          ) : disputesData && disputesData.count > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {disputesData.disputes.map((dispute) => (
                <ActiveDisputeCard key={dispute.id} dispute={dispute} />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 border border-gray-100 dark:border-gray-800 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No Active Disputes
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                All market resolutions are currently undisputed.
              </p>
            </div>
          )}
        </section>

        {/* Historical Disputes Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-gray-900 dark:bg-gray-100 rounded-full" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Historical Disputes
            </h2>
          </div>

          {isLoadingHistory ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-900 dark:border-gray-700 dark:border-t-gray-100"></div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Loading history...
              </p>
            </div>
          ) : historyData && historyData.count > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {historyData.history.map((history) => (
                <HistoryCard key={history.id} history={history} />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 border border-gray-100 dark:border-gray-800 text-center">
              <div className="text-6xl mb-4">📜</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No Historical Disputes
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No dispute history available yet.
              </p>
            </div>
          )}
        </section>

        {/* Info Section */}
        <section className="mt-12 bg-sky-50 dark:bg-sky-900/10 rounded-2xl p-6 border border-sky-100 dark:border-sky-900/30">
          <h3 className="text-lg font-semibold text-sky-900 dark:text-sky-400 mb-3">
            About UMA Oracle Disputes
          </h3>
          <p className="text-sm text-sky-800 dark:text-sky-300 leading-relaxed mb-4">
            UMA Oracle provides decentralized dispute resolution for Polymarket. When a
            market resolution is disputed, UMA token holders vote on the correct outcome.
            This ensures fair and transparent resolution of prediction markets.
          </p>
          <a
            href="https://docs.uma.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 dark:text-sky-400 hover:underline"
          >
            Learn more about UMA Oracle
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </section>
      </div>
    </main>
  );
}

