"use client";

import { useQuery } from "@tanstack/react-query";
import { getOutcomePaths, type OutcomePathAnalysis as OutcomePathAnalysisType } from "@/lib/api";

interface OutcomePathAnalysisProps {
  marketId: string;
}

export function OutcomePathAnalysis({ marketId }: OutcomePathAnalysisProps) {
  const { data, isLoading, error } = useQuery<OutcomePathAnalysisType>({
    queryKey: ["outcome-paths", marketId],
    queryFn: () => getOutcomePaths(marketId),
    staleTime: 1000 * 60 * 60 * 6, // 6 hours
  });

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Outcome Path Analysis</h3>
            <p className="text-sm text-gray-400">Historical patterns from similar markets</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded animate-pulse w-full"></div>
          <div className="h-4 bg-gray-700 rounded animate-pulse w-5/6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">Outcome Path Analysis</h3>
        </div>
        <p className="text-sm text-red-400">Failed to load outcome path analysis</p>
      </div>
    );
  }

  if (!data) return null;

  const clusterTypeLabels: Record<string, string> = {
    election: "Election Markets",
    economic: "Economic/Fed Markets",
    crypto: "Crypto Markets",
    sports: "Sports Markets",
    geopolitical: "Geopolitical Markets",
    tech: "Tech/Product Markets",
  };

  const clusterTypeColors: Record<string, string> = {
    election: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    economic: "bg-green-500/10 text-green-400 border-green-500/20",
    crypto: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    sports: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    geopolitical: "bg-red-500/10 text-red-400 border-red-500/20",
    tech: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };

  const clusterLabel = clusterTypeLabels[data.clusterType] || data.clusterType;
  const clusterColor = clusterTypeColors[data.clusterType] || "bg-gray-500/10 text-gray-400 border-gray-500/20";

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Outcome Path Analysis</h3>
            <p className="text-xs text-gray-400">Based on {data.patterns.length} historical patterns</p>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${clusterColor}`}>
          {clusterLabel}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
          <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Most Common Path</div>
          <div className="text-sm font-semibold text-white">{data.summary.mostCommonPath}</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
          <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Retail Trap Rate</div>
          <div className="text-sm font-semibold text-orange-400">{data.summary.retailTrapFrequency}%</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
          <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Key Timing</div>
          <div className="text-xs font-medium text-white leading-tight">{data.summary.keyTiming}</div>
        </div>
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wide">Recommendations</h4>
          </div>
          <div className="space-y-2">
            {data.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-gray-300 bg-gray-900 rounded p-3 border border-gray-700">
                <span className="text-indigo-400 flex-shrink-0">{rec.substring(0, 2)}</span>
                <span>{rec.substring(2).trim()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historical Patterns */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <h4 className="text-sm font-semibold text-white uppercase tracking-wide">Historical Patterns</h4>
        </div>
        <div className="space-y-3">
          {data.patterns.map((pattern, index) => (
            <div key={index} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="flex items-start justify-between mb-2">
                <h5 className="text-sm font-semibold text-white">{pattern.patternName}</h5>
                <span className="text-xs font-medium px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded">
                  {pattern.frequencyPercent}%
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-2 leading-relaxed">{pattern.description}</p>
              <div className="flex items-start gap-2 mt-3 pt-3 border-t border-gray-700">
                <svg className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-orange-300 leading-relaxed">
                  <span className="font-semibold">Retail Trap:</span> {pattern.retailImplication}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-500 italic">
          📊 Historical patterns don't guarantee future outcomes. Use this analysis as one input among many in your decision-making process.
        </p>
      </div>
    </div>
  );
}


