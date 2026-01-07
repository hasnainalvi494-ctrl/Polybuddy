"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getMarkets, getCategories } from "@/lib/api";
import { StructurallyInterestingCarousel } from "@/components/StructurallyInterestingCarousel";

interface Market {
  id: string;
  polymarketId: string;
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
  const limit = 20;

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
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

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Market Explorer</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Browse {data?.total?.toLocaleString() ?? "..."} markets from Polymarket
          </p>
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
