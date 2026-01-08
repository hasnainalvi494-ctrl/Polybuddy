"use client";

import { useQuery } from "@tanstack/react-query";
import { getSimilarHistory } from "@/lib/api";

type HistoryResult = {
  outcome: "win" | "loss" | "pending";
  marketId: string;
  marketQuestion: string;
  roi: number | null;
};

type SimilarHistoryResponse = {
  marketId: string;
  clusterType: string;
  history: HistoryResult[];
  totalWins: number;
  totalLosses: number;
  totalPending: number;
  winRate: number;
  averageROI: number;
};

interface WinRateHistoryProps {
  marketId: string;
  size?: "small" | "medium";
  showLabel?: boolean;
}

export function WinRateHistory({ 
  marketId, 
  size = "medium",
  showLabel = true 
}: WinRateHistoryProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["similarHistory", marketId],
    queryFn: () => getSimilarHistory(marketId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        {showLabel && (
          <span className="text-xs text-gray-500">Loading history...</span>
        )}
        <div className="flex gap-1">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className={`${
                size === "small" ? "w-3 h-3" : "w-4 h-4"
              } rounded bg-gray-800 animate-pulse`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null; // Silently fail - not critical
  }

  const squareSize = size === "small" ? "w-3 h-3" : "w-4 h-4";
  const textSize = size === "small" ? "text-[10px]" : "text-xs";

  return (
    <div className="space-y-2">
      {/* Label */}
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className={`${textSize} text-gray-400 font-medium`}>
            Similar Markets History
          </span>
          <span className={`${textSize} text-gray-500`}>
            {data.clusterType.replace(/_/g, " ")}
          </span>
        </div>
      )}

      {/* Win/Loss Squares */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {data.history.map((result, index) => {
            const bgColor =
              result.outcome === "win"
                ? "bg-emerald-500"
                : result.outcome === "loss"
                ? "bg-rose-500"
                : "bg-gray-700";

            const hoverColor =
              result.outcome === "win"
                ? "hover:bg-emerald-400"
                : result.outcome === "loss"
                ? "hover:bg-rose-400"
                : "hover:bg-gray-600";

            return (
              <div
                key={index}
                className={`${squareSize} ${bgColor} ${hoverColor} rounded transition-all cursor-pointer group relative`}
                title={`${result.marketQuestion}\n${
                  result.outcome === "pending"
                    ? "Pending"
                    : result.outcome === "win"
                    ? `Win: ${result.roi ? `+${result.roi.toFixed(1)}%` : "N/A"}`
                    : `Loss: ${result.roi ? `${result.roi.toFixed(1)}%` : "N/A"}`
                }`}
              >
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                  <div className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-[10px] whitespace-nowrap shadow-lg">
                    {result.outcome === "pending" ? (
                      <span className="text-gray-400">Pending</span>
                    ) : (
                      <span
                        className={
                          result.outcome === "win"
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }
                      >
                        {result.outcome === "win" ? "Win" : "Loss"}
                        {result.roi && `: ${result.roi > 0 ? "+" : ""}${result.roi.toFixed(1)}%`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 ml-1">
          <span className={`${textSize} font-bold text-gray-300`}>
            {data.winRate.toFixed(0)}%
          </span>
          {data.averageROI !== 0 && (
            <span
              className={`${textSize} font-semibold ${
                data.averageROI > 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {data.averageROI > 0 ? "+" : ""}
              {data.averageROI.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Legend (optional, only for medium size) */}
      {size === "medium" && (
        <div className="flex items-center gap-3 text-[10px] text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-emerald-500" />
            <span>Win ({data.totalWins})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-rose-500" />
            <span>Loss ({data.totalLosses})</span>
          </div>
          {data.totalPending > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-gray-700" />
              <span>Pending ({data.totalPending})</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Compact version for cards
export function WinRateHistoryCompact({ marketId }: { marketId: string }) {
  return (
    <WinRateHistory 
      marketId={marketId} 
      size="small" 
      showLabel={false} 
    />
  );
}

