"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getWatchlists, createWatchlist } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Watchlist {
  id: string;
  name: string;
  marketCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function WatchlistsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const queryClient = useQueryClient();

  const { data: watchlists, isLoading, error } = useQuery<Watchlist[]>({
    queryKey: ["watchlists"],
    queryFn: () => getWatchlists() as Promise<Watchlist[]>,
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createWatchlist(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      setNewWatchlistName("");
      setShowCreateForm(false);
    },
  });

  // Redirect to login if not authenticated - use useEffect to avoid render-time side effects
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Show loading while checking auth or if not authenticated (will redirect)
  if (authLoading || !isAuthenticated) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWatchlistName.trim()) {
      createMutation.mutate(newWatchlistName.trim());
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Watchlists</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Track your favorite markets
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              New Watchlist
            </button>
          </div>
        </header>

        {showCreateForm && (
          <div className="mb-8 p-6 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Create New Watchlist</h2>
            <form onSubmit={handleCreate} className="flex gap-4">
              <input
                type="text"
                value={newWatchlistName}
                onChange={(e) => setNewWatchlistName(e.target.value)}
                placeholder="Watchlist name..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                autoFocus
              />
              <button
                type="submit"
                disabled={!newWatchlistName.trim() || createMutation.isPending}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewWatchlistName("");
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </form>
            {createMutation.isError && (
              <p className="mt-2 text-red-600 text-sm">
                Error: {(createMutation.error as Error).message}
              </p>
            )}
          </div>
        )}

        {(isLoading || authLoading) && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500"></div>
            <p className="mt-2 text-gray-500">Loading watchlists...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            Error loading watchlists: {(error as Error).message}
          </div>
        )}

        {watchlists && watchlists.length === 0 && (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-gray-500 mb-4">You don&apos;t have any watchlists yet.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Watchlist
            </button>
          </div>
        )}

        {watchlists && watchlists.length > 0 && (
          <div className="grid gap-4">
            {watchlists.map((watchlist) => (
              <Link
                key={watchlist.id}
                href={`/watchlists/${watchlist.id}`}
                className="block p-6 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">{watchlist.name}</h2>
                    <p className="text-gray-500 text-sm">
                      {watchlist.marketCount} {watchlist.marketCount === 1 ? "market" : "markets"}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>Created {formatDate(watchlist.createdAt)}</p>
                    <p>Updated {formatDate(watchlist.updatedAt)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
