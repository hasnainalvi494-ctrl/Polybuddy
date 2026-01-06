"use client";

interface QualityBreakdown {
  spreadScore: number;
  depthScore: number;
  stalenessScore: number;
  volatilityScore: number;
}

interface MarketQualityScoreProps {
  grade: string | null;
  score: number | null;
  breakdown: QualityBreakdown | null;
  summary: string | null;
  isLowQuality: boolean;
}

const gradeColors: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", border: "border-green-500" },
  B: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", border: "border-blue-500" },
  C: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-500" },
  D: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400", border: "border-orange-500" },
  F: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", border: "border-red-500" },
};

const scoreLabels: Record<string, { name: string; description: string }> = {
  spreadScore: { name: "Spread", description: "Bid-ask spread tightness" },
  depthScore: { name: "Depth", description: "Available liquidity" },
  stalenessScore: { name: "Freshness", description: "Price update recency" },
  volatilityScore: { name: "Stability", description: "Price consistency" },
};

function ScoreBar({ score, label }: { score: number; label: string }) {
  const getColor = (s: number) => {
    if (s >= 80) return "bg-green-500";
    if (s >= 60) return "bg-blue-500";
    if (s >= 40) return "bg-yellow-500";
    if (s >= 20) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{scoreLabels[label]?.name || label}</span>
        <span className="font-medium">{score}</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor(score)} transition-all duration-300`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-500">
        {scoreLabels[label]?.description}
      </p>
    </div>
  );
}

export function MarketQualityScore({
  grade,
  score,
  breakdown,
  summary,
  isLowQuality,
}: MarketQualityScoreProps) {
  if (!grade) {
    return null;
  }

  const colors = gradeColors[grade] || gradeColors.C;

  return (
    <div className="space-y-4">
      {/* Low Quality Warning Banner */}
      {isLowQuality && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">&#9888;&#65039;</span>
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                Low Quality Market
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Wide spreads and thin liquidity may result in poor execution. Consider smaller position sizes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quality Score Card */}
      <div className={`${colors.bg} border ${colors.border} rounded-lg p-6`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Market Quality Score</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Our proprietary analysis of trading conditions
            </p>
          </div>
          <div className="text-center">
            <div className={`text-4xl font-bold ${colors.text}`}>{grade}</div>
            {score !== null && (
              <div className="text-sm text-gray-500 dark:text-gray-400">{score}/100</div>
            )}
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
            {summary}
          </p>
        )}

        {/* Score Breakdown */}
        {breakdown && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Score Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ScoreBar score={breakdown.spreadScore} label="spreadScore" />
              <ScoreBar score={breakdown.depthScore} label="depthScore" />
              <ScoreBar score={breakdown.stalenessScore} label="stalenessScore" />
              <ScoreBar score={breakdown.volatilityScore} label="volatilityScore" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
