"use client";

import { useQuery } from "@tanstack/react-query";
import { getMarkets } from "@/lib/api";
import { MarketCardSkeleton } from "./skeletons/MarketCardSkeleton";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import Link from "next/link";

export function MarketsList() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["markets"],
    queryFn: async () => {
      const result = await getMarkets();
      return result as { data: any[]; total: number };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <MarketCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load markets"
        message="We couldn't fetch the latest markets. Please check your connection and try again."
        onRetry={() => refetch()}
      />
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <EmptyState
        icon="📊"
        title="No markets available"
        message="There are no markets to display at the moment. Check back soon!"
        action={{
          label: "Refresh",
          onClick: () => refetch(),
        }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {data.data.map((market) => (
        <Link
          key={market.id}
          href={`/markets/${market.id}`}
          className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-6 hover:border-emerald-500/30 transition-all duration-300 group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors line-clamp-2">
                {market.question}
              </h3>
              {market.category && (
                <span className="text-sm text-gray-500 mt-1 block">{market.category}</span>
              )}
            </div>
            {market.qualityGrade && (
              <span
                className={`ml-3 px-2 py-1 rounded text-xs font-medium ${
                  market.qualityGrade === "A"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : market.qualityGrade === "B"
                    ? "bg-blue-500/20 text-blue-400"
                    : market.qualityGrade === "C"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {market.qualityGrade}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Price</p>
              <p className="text-sm font-medium text-white">
                {market.currentPrice ? `${(market.currentPrice * 100).toFixed(0)}¢` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Volume</p>
              <p className="text-sm font-medium text-white">
                {market.volume24h ? `$${(market.volume24h / 1000).toFixed(0)}k` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Liquidity</p>
              <p className="text-sm font-medium text-white">
                {market.liquidity ? `$${(market.liquidity / 1000).toFixed(0)}k` : "—"}
              </p>
            </div>
          </div>

          <div className="text-emerald-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
            View Details →
          </div>
        </Link>
      ))}
    </div>
  );
}

