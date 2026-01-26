"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { getMarkets, getCategories, refreshMarketPrices } from "@/lib/api";
import { StructurallyInterestingCarousel } from "@/components/StructurallyInterestingCarousel";

interface Market {
  id: string;
  polymarketId: string;
  slug: string | null;
  question: string;
  category: string | null;
  endDate: string | null;
  qualityGrade: string | null;
  qualityScore: number | null;
  currentPrice: number | null;
  volume24h: number | null;
  liquidity: number | null;
}

interface MarketsResponse {
  data: Market[];
  total: number;
  limit: number;
  offset: number;
}

type SortOption = "volume" | "createdAt" | "endDate";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "volume", label: "Volume (High to Low)" },
  { value: "createdAt", label: "Newest First" },
  { value: "endDate", label: "Ending Soon" },
];

export default function MarketsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("volume");
  const [page, setPage] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const limit = 20;
  const queryClient = useQueryClient();

  // Manual refresh live prices
  const handleRefreshPrices = useCallback(async (marketIds: string[]) => {
    if (isRefreshing || marketIds.length === 0) return;
    
    setIsRefreshing(true);
    try {
      await refreshMarketPrices(marketIds);
      setLastRefresh(new Date());
      // Invalidate the markets query to refetch with new prices
      queryClient.invalidateQueries({ queryKey: ["markets"] });
    } catch (error) {
      console.error("Failed to refresh prices:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, queryClient]);

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    refetchInterval: 60000, // Refresh every minute
    refetchOnWindowFocus: true,
  });

  // Debounce search
  const handleSearch = (value: string) => {
    setSearch(value);
    setTimeout(() => {
      setDebouncedSearch(value);
      setPage(0);
    }, 300);
  };

  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category);
    setPage(0);
  };

  const { data, isLoading, error } = useQuery<MarketsResponse>({
    queryKey: ["markets", debouncedSearch, selectedCategory, sortBy, page],
    queryFn: () =>
      getMarkets({
        search: debouncedSearch || undefined,
        category: selectedCategory || undefined,
        sortBy,
        sortOrder: sortBy === "endDate" ? "asc" : "desc",
        limit,
        offset: page * limit,
      }) as Promise<MarketsResponse>,
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: true,
  });

  const formatPrice = (price: number | null) => {
    if (price === null) return "-";
    return `${(price * 100).toFixed(0)}¢`;
  };

  const formatVolume = (volume: number | null) => {
    if (volume === null || volume === 0) return "-";
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(0)}K`;
    return `$${volume.toFixed(0)}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatLiquidity = (liquidity: number | null) => {
    if (liquidity === null || liquidity === 0) return "-";
    if (liquidity >= 1000000) return `$${(liquidity / 1000000).toFixed(1)}M`;
    if (liquidity >= 1000) return `$${(liquidity / 1000).toFixed(0)}K`;
    return `$${liquidity.toFixed(0)}`;
  };

  // Quality grade badge colors and labels
  const getGradeStyle = (grade: string | null) => {
    switch (grade?.toUpperCase()) {
      case "A":
        return { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30", label: "Excellent" };
      case "B":
        return { bg: "bg-teal-500/20", text: "text-teal-400", border: "border-teal-500/30", label: "Good" };
      case "C":
        return { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30", label: "Fair" };
      case "D":
        return { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30", label: "Poor" };
      case "F":
        return { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30", label: "Risky" };
      default:
        return { bg: "bg-gray-500/20", text: "text-gray-400", border: "border-gray-500/30", label: "-" };
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Market Explorer</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Browse {data?.total?.toLocaleString() ?? "..."} markets from Polymarket
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastRefresh && (
                <span className="text-xs text-gray-500">
                  Updated {lastRefresh.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={() => data?.data && handleRefreshPrices(data.data.map(m => m.id))}
                disabled={isRefreshing || !data?.data}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isRefreshing
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-teal-600 hover:bg-teal-700 text-white"
                }`}
              >
                <svg
                  className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {isRefreshing ? "Refreshing..." : "Refresh Prices"}
              </button>
            </div>
          </div>
        </header>

        {/* Structurally Interesting Markets Carousel */}
        <div className="mb-10">
          <StructurallyInterestingCarousel limit={6} />
        </div>

        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search markets..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1 max-w-md px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
            />
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortOption);
                setPage(0);
              }}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filters */}
          {categories && categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleCategoryChange(null)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  selectedCategory === null
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.category}
                  onClick={() => handleCategoryChange(cat.category)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    selectedCategory === cat.category
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {cat.category.replace(/-/g, " ")} ({cat.count.toLocaleString()})
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500"></div>
            <p className="mt-2 text-gray-500">Loading markets...</p>
          </div>
        )}

        {error && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 text-center">
            <p className="text-amber-800 dark:text-amber-300 font-medium mb-2">
              Markets temporarily unavailable
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              We're refreshing market data. Please try again shortly.
            </p>
          </div>
        )}

        {data && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium">Market</th>
                    <th className="text-center py-3 px-4 font-medium w-20">Grade</th>
                    <th className="text-center py-3 px-4 font-medium w-32">YES / NO</th>
                    <th className="text-right py-3 px-4 font-medium w-24">Volume</th>
                    <th className="text-right py-3 px-4 font-medium w-24">Liquidity</th>
                    <th className="text-right py-3 px-4 font-medium w-28">End Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((market) => {
                    const yesPrice = market.currentPrice;
                    const noPrice = yesPrice !== null ? 1 - yesPrice : null;
                    return (
                      <tr
                        key={market.id}
                        className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <Link
                            href={`/markets/${market.id}`}
                            className="hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            <span className="line-clamp-2">{market.question}</span>
                          </Link>
                          {market.category && (
                            <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                              {market.category}
                            </span>
                          )}
                        </td>
                        <td className="text-center py-3 px-4">
                          {(() => {
                            const style = getGradeStyle(market.qualityGrade);
                            return market.qualityGrade ? (
                              <span 
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${style.bg} ${style.text} border ${style.border}`}
                                title={`Quality: ${style.label}`}
                              >
                                {market.qualityGrade.toUpperCase()}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            );
                          })()}
                        </td>
                        <td className="text-center py-3 px-4 font-mono">
                          <span className="text-green-600 dark:text-green-400">{formatPrice(yesPrice)}</span>
                          <span className="text-gray-400 mx-1">/</span>
                          <span className="text-red-600 dark:text-red-400">{formatPrice(noPrice)}</span>
                        </td>
                        <td className="text-right py-3 px-4 font-mono text-gray-600 dark:text-gray-400">
                          {formatVolume(market.volume24h)}
                        </td>
                        <td className="text-right py-3 px-4 font-mono text-gray-600 dark:text-gray-400">
                          {formatLiquidity(market.liquidity)}
                        </td>
                        <td className="text-right py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(market.endDate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {page * limit + 1}-{Math.min((page + 1) * limit, data.total)} of {data.total.toLocaleString()}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * limit >= data.total}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
