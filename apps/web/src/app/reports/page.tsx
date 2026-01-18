"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getReports, generateReport, type WeeklyReport } from "@/lib/api";
import Link from "next/link";

function ScoreBar({ value, max = 100, color }: { value: number | null; max?: number; color: string }) {
  if (value === null) return <span className="text-gray-400">-</span>;
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-medium w-8 text-right">{value}</span>
    </div>
  );
}

function formatWeekRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}`;
}

function formatPnl(value: number | null): { text: string; color: string } {
  if (value === null) return { text: "-", color: "text-gray-500" };
  const sign = value >= 0 ? "+" : "";
  const color = value >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  return { text: `${sign}$${value.toFixed(2)}`, color };
}

function ReportCard({ report, isLatest }: { report: WeeklyReport; isLatest: boolean }) {
  const [isExpanded, setIsExpanded] = useState(isLatest);
  const realizedPnl = formatPnl(report.realizedPnl);
  const unrealizedPnl = formatPnl(report.unrealizedPnl);

  return (
    <div className={`bg-white dark:bg-gray-800 border rounded-lg overflow-hidden ${
      isLatest ? "border-blue-300 dark:border-blue-700" : "border-gray-200 dark:border-gray-700"
    }`}>
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-left">
              {formatWeekRange(report.weekStart, report.weekEnd)}
            </h3>
            {isLatest && !report.viewedAt && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                New
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">Realized P&L</p>
            <p className={`font-semibold ${realizedPnl.color}`}>{realizedPnl.text}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">Trades</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{report.totalTrades}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">Win Rate</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {report.winRate !== null ? `${report.winRate.toFixed(0)}%` : "-"}
            </p>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            {/* Left column - Metrics */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Performance Metrics
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Realized P&L</p>
                  <p className={`text-xl font-bold ${realizedPnl.color}`}>{realizedPnl.text}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Unrealized P&L</p>
                  <p className={`text-xl font-bold ${unrealizedPnl.color}`}>{unrealizedPnl.text}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Entry Timing</span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      {report.entryTimingScore !== null && report.entryTimingScore >= 70
                        ? "Good timing"
                        : report.entryTimingScore !== null && report.entryTimingScore < 50
                        ? "Chasing moves"
                        : "Average"}
                    </span>
                  </div>
                  <ScoreBar value={report.entryTimingScore} color="bg-blue-500" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Quality Discipline</span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      {report.qualityDisciplineScore !== null && report.qualityDisciplineScore >= 70
                        ? "Sticking to A/B markets"
                        : "Trading lower quality"}
                    </span>
                  </div>
                  <ScoreBar value={report.qualityDisciplineScore} color="bg-purple-500" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Concentration Risk</span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      {report.concentrationScore !== null && report.concentrationScore > 70
                        ? "High concentration"
                        : "Diversified"}
                    </span>
                  </div>
                  <ScoreBar value={report.concentrationScore} color="bg-orange-500" />
                </div>
              </div>

              {report.slippagePaid !== null && report.slippagePaid > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-400">
                    You paid <span className="font-semibold">${report.slippagePaid.toFixed(2)}</span> in slippage this week
                  </p>
                </div>
              )}
            </div>

            {/* Right column - Coaching */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Coaching Insights
              </h4>

              {/* Patterns Observed */}
              {report.patternsObserved.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Patterns Observed</p>
                  <ul className="space-y-2">
                    {report.patternsObserved.map((pattern, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-gray-700 dark:text-gray-300">{pattern}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Coaching Notes */}
              {report.coachingNotes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Recommendations</p>
                  <ul className="space-y-2">
                    {report.coachingNotes.map((note, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-700 dark:text-gray-300">{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {report.patternsObserved.length === 0 && report.coachingNotes.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No specific patterns or coaching notes for this week.
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Generated {new Date(report.generatedAt).toLocaleDateString()}</span>
            {report.viewedAt && <span>Viewed {new Date(report.viewedAt).toLocaleDateString()}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["reports"],
    queryFn: () => getReports(12),
  });

  const generateMutation = useMutation({
    mutationFn: () => generateReport(0),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Weekly Reports
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Track your performance and get personalized coaching insights
              </p>
            </div>
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {generateMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generate This Week
                </>
              )}
            </button>
          </div>
        </header>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500" />
            <p className="mt-2 text-gray-500">Loading reports...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            Error loading reports: {(error as Error).message}
          </div>
        )}

        {/* Empty state */}
        {data && data.reports.length === 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No reports yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Generate your first weekly report to start tracking your performance.
            </p>
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Generate Report
            </button>
          </div>
        )}

        {/* Reports list */}
        {data && data.reports.length > 0 && (
          <div className="space-y-4">
            {data.reports.map((report, index) => (
              <ReportCard key={report.id} report={report} isLatest={index === 0} />
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Link
            href="/portfolio"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            &larr; Back to Portfolio
          </Link>
        </div>
      </div>
    </main>
  );
}
