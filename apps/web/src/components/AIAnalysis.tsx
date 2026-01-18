"use client";

import { useQuery } from "@tanstack/react-query";
import { getAIAnalysis, type AIAnalysisResponse } from "@/lib/api";

interface AIAnalysisProps {
  marketId: string;
}

export function AIAnalysis({ marketId }: AIAnalysisProps) {
  const { data, isLoading, error } = useQuery<AIAnalysisResponse>({
    queryKey: ["ai-analysis", marketId],
    queryFn: () => getAIAnalysis(marketId),
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">AI Market Analysis</h3>
            <p className="text-sm text-gray-400">Powered by advanced reasoning</p>
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
          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">AI Market Analysis</h3>
        </div>
        <p className="text-sm text-red-400">Failed to load AI analysis</p>
      </div>
    );
  }

  if (!data) return null;

  const confidenceColor = {
    High: "text-green-400 bg-green-500/10",
    Medium: "text-yellow-400 bg-yellow-500/10",
    Low: "text-red-400 bg-red-500/10",
  }[data.confidence];

  const probabilityPercentage = Math.round(data.probability_estimate * 100);

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">AI Market Analysis</h3>
            <p className="text-xs text-gray-400">
              Generated {new Date(data.generatedAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{probabilityPercentage}%</div>
          <div className={`text-xs font-medium px-2 py-1 rounded ${confidenceColor}`}>
            {data.confidence} Confidence
          </div>
        </div>
      </div>

      {/* Thesis */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h4 className="text-sm font-semibold text-white uppercase tracking-wide">Thesis</h4>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed pl-7">{data.thesis}</p>
      </div>

      {/* Counter-Thesis */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h4 className="text-sm font-semibold text-white uppercase tracking-wide">Counter-Thesis</h4>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed pl-7">{data.counter_thesis}</p>
      </div>

      {/* Key Factors */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h4 className="text-sm font-semibold text-white uppercase tracking-wide">Key Factors</h4>
        </div>
        <ul className="space-y-2 pl-7">
          {data.key_factors.map((factor, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="text-blue-400 mt-1">•</span>
              <span>{factor}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* What Could Go Wrong */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h4 className="text-sm font-semibold text-white uppercase tracking-wide">What Could Go Wrong</h4>
        </div>
        <ul className="space-y-2 pl-7">
          {data.what_could_go_wrong.map((risk, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="text-orange-400 mt-1">•</span>
              <span>{risk}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Disclaimer */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-500 italic">
          ⚠️ This analysis is AI-generated and should not be considered financial advice. 
          Always conduct your own research before making trading decisions.
        </p>
      </div>
    </div>
  );
}


