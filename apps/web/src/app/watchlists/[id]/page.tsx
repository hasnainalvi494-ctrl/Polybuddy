"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getWatchlist, getMarkets, addToWatchlist, removeFromWatchlist, deleteWatchlist } from "@/lib/api";

interface WatchlistMarket {
  id: string;
  question: string;
  qualityGrade: string | null;
  currentPrice: number | null;
  addedAt: string;
}

interface WatchlistDetail {
  id: string;
  name: string;
  marketCount: number;
  createdAt: string;
  updatedAt: string;
  markets: WatchlistMarket[];
}

interface Market {
  id: string;
  question: string;
  currentPrice: number | null;
}

interface MarketsResponse {
  data: Market[];
  total: number;
}

export default function WatchlistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const [showAddMarket, setShowAddMarket] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: watchlist, isLoading, error } = useQuery<WatchlistDetail>({
    queryKey: ["watchlist", id],
    queryFn: () => getWatchlist(id) as Promise<WatchlistDetail>,
    enabled: !!id,
  });

  const { data: searchResults } = useQuery<MarketsResponse>({
    queryKey: ["markets-search", searchQuery],
    queryFn: () => getMarkets({ search: searchQuery, limit: 10 }) as Promise<MarketsResponse>,
    enabled: searchQuery.length > 2,
  });

  const addMutation = useMutation({
    mutationFn: (marketId: string) => addToWatchlist(id, marketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist", id] });
      setSearchQuery("");
      setShowAddMarket(false);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (marketId: string) => removeFromWatchlist(id, marketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist", id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteWatchlist(id),
    onSuccess: () => {
      router.push("/watchlists");
    },
  });

  const formatPrice = (price: number | null) => {
    if (price === null) return "-";
    return `${(price * 100).toFixed(1)}%`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500"></div>
            <p className="mt-2 text-gray-500">Loading watchlist...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            Error loading watchlist: {(error as Error).message}
          </div>
        </div>
      </main>
    );
  }

  if (!watchlist) return null;

  const watchlistMarketIds = new Set(watchlist.markets.map((m) => m.id));

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{watchlist.name}</h1>
              <p className="text-gray-600 dark:text-gray-400">
                {watchlist.marketCount} {watchlist.marketCount === 1 ? "market" : "markets"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddMarket(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Market
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </header>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 mb-4">
              Are you sure you want to delete this watchlist? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Add Market Modal */}
        {showAddMarket && (
          <div className="mb-6 p-6 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Add Market to Watchlist</h2>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a market..."
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 mb-4"
              autoFocus
            />

            {searchResults && searchResults.data.length > 0 && (
              <div className="max-h-64 overflow-y-auto border dark:border-gray-700 rounded-lg divide-y dark:divide-gray-700">
                {searchResults.data.map((market) => {
                  const alreadyAdded = watchlistMarketIds.has(market.id);
                  return (
                    <div
                      key={market.id}
                      className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="truncate">{market.question}</p>
                        <p className="text-sm text-gray-500">{formatPrice(market.currentPrice)}</p>
                      </div>
                      <button
                        onClick={() => addMutation.mutate(market.id)}
                        disabled={alreadyAdded || addMutation.isPending}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {alreadyAdded ? "Added" : "Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {searchQuery.length > 2 && searchResults?.data.length === 0 && (
              <p className="text-gray-500 text-center py-4">No markets found</p>
            )}

            {searchQuery.length <= 2 && searchQuery.length > 0 && (
              <p className="text-gray-500 text-center py-4">Type at least 3 characters to search</p>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setShowAddMarket(false);
                  setSearchQuery("");
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Markets List */}
        {watchlist.markets.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-gray-500 mb-4">No markets in this watchlist yet.</p>
            <button
              onClick={() => setShowAddMarket(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Your First Market
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium">Market</th>
                  <th className="text-right py-3 px-4 font-medium w-24">Price</th>
                  <th className="text-right py-3 px-4 font-medium w-36">Added</th>
                  <th className="text-right py-3 px-4 font-medium w-20"></th>
                </tr>
              </thead>
              <tbody>
                {watchlist.markets.map((market) => (
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
                      {market.qualityGrade && (
                        <span
                          className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${
                            market.qualityGrade === "A"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : market.qualityGrade === "B"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          Grade {market.qualityGrade}
                        </span>
                      )}
                    </td>
                    <td className="text-right py-3 px-4 font-mono">
                      {formatPrice(market.currentPrice)}
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(market.addedAt)}
                    </td>
                    <td className="text-right py-3 px-4">
                      <button
                        onClick={() => removeMutation.mutate(market.id)}
                        disabled={removeMutation.isPending}
                        className="text-red-600 hover:text-red-700 text-sm disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
