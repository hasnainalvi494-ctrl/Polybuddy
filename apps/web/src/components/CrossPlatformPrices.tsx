"use client";

import { useQuery } from "@tanstack/react-query";
import { getCrossPlatformPrices, type CrossPlatformComparison } from "@/lib/api";
import { ErrorState } from "./ErrorState";

interface CrossPlatformPricesProps {
  marketId: string;
}

export function CrossPlatformPrices({ marketId }: CrossPlatformPricesProps) {
  const { data: comparison, isLoading, error, refetch } = useQuery<CrossPlatformComparison | null>({
    queryKey: ["cross-platform", marketId],
    queryFn: () => getCrossPlatformPrices(marketId),
    refetchInterval: 60000, // Refresh every minute
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-[#1f1f1f] rounded w-48 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-[#1f1f1f] rounded"></div>
            <div className="h-4 bg-[#1f1f1f] rounded"></div>
            <div className="h-4 bg-[#1f1f1f] rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load cross-platform prices"
        message="We couldn't fetch price comparison data. Please try again."
        onRetry={() => refetch()}
        compact
      />
    );
  }

  if (!comparison) {
    return null; // No cross-platform data available
  }

  const formatPrice = (price: number) => `${(price * 100).toFixed(1)}¢`;
  const formatSpread = (spread: number) => `${(spread * 100).toFixed(1)}¢`;

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-6 hover:border-emerald-500/30 transition-all duration-300">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📊</span>
        <h3 className="text-lg font-semibold text-white">Cross-Platform Prices</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1f1f1f]">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Platform</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">YES</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">NO</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Spread</th>
            </tr>
          </thead>
          <tbody>
            {comparison.platforms.map((platform) => {
              const isBestYes = comparison.bestYesPrice?.platform === platform.platform;
              const isBestNo = comparison.bestNoPrice?.platform === platform.platform;

              return (
                <tr
                  key={platform.platform}
                  className="border-b border-[#1f1f1f] hover:bg-[#1a1a1a] transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="text-white font-medium capitalize">
                      {platform.platform}
                    </span>
                  </td>
                  <td className="text-right py-3 px-4">
                    <span
                      className={`font-mono ${
                        isBestYes
                          ? "text-emerald-400 font-semibold"
                          : "text-gray-300"
                      }`}
                    >
                      {formatPrice(platform.yesPrice)}
                    </span>
                    {isBestYes && (
                      <span className="ml-2 text-xs text-emerald-400">✓ Best</span>
                    )}
                  </td>
                  <td className="text-right py-3 px-4">
                    <span
                      className={`font-mono ${
                        isBestNo
                          ? "text-emerald-400 font-semibold"
                          : "text-gray-300"
                      }`}
                    >
                      {formatPrice(platform.noPrice)}
                    </span>
                    {isBestNo && (
                      <span className="ml-2 text-xs text-emerald-400">✓ Best</span>
                    )}
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className="font-mono text-gray-400">
                      {formatSpread(platform.spread)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Recommendation */}
      <div className="mt-4 p-4 bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg">
        <p className="text-sm text-gray-300">{comparison.recommendation}</p>
      </div>

      {/* Savings Details */}
      {(comparison.bestYesPrice?.savingsVsWorst ?? 0) > 0.01 && (
        <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <p className="text-sm text-emerald-400">
            💰 Save up to{" "}
            <span className="font-semibold">
              {formatPrice(comparison.bestYesPrice?.savingsVsWorst ?? 0)}
            </span>{" "}
            by trading on {comparison.bestYesPrice?.platform}
          </p>
        </div>
      )}

      {/* Last Updated */}
      <div className="mt-3 text-xs text-gray-500 text-right">
        Last updated: {new Date(comparison.platforms[0]?.timestamp ?? Date.now()).toLocaleTimeString()}
      </div>
    </div>
  );
}

