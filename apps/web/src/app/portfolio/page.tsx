"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getWallets,
  addWallet,
  deleteWallet,
  getWalletPositions,
  getPerformance,
  getPortfolioSummary,
  deletePosition,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { HiddenExposureCard } from "@/components/HiddenExposureCard";

interface Wallet {
  id: string;
  address: string;
  label: string | null;
  createdAt: string;
}

interface Position {
  id: string;
  marketId: string;
  marketQuestion: string;
  outcome: string;
  shares: number;
  avgEntryPrice: number | null;
  currentPrice: number | null;
  currentValue: number | null;
  unrealizedPnl: number | null;
  pnlPercent: number | null;
}

interface WalletPositions {
  wallet: Wallet;
  positions: Position[];
  summary: {
    totalValue: number;
    totalUnrealizedPnl: number;
    positionCount: number;
  };
}

interface Performance {
  totalValue: number;
  totalPnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalTrades: number;
  winRate: number;
  avgSlippage: number;
  entryTimingScore: number;
}

interface PortfolioSummary {
  walletCount: number;
  totalPositions: number;
  totalValue: number;
  totalUnrealizedPnl: number;
  topPositions: Position[];
}

export default function PortfolioPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [newWalletAddress, setNewWalletAddress] = useState("");
  const [newWalletLabel, setNewWalletLabel] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [performancePeriod, setPerformancePeriod] = useState("30d");

  const queryClient = useQueryClient();

  const { data: wallets, isLoading: walletsLoading } = useQuery<Wallet[]>({
    queryKey: ["wallets"],
    queryFn: () => getWallets() as Promise<Wallet[]>,
    enabled: isAuthenticated,
  });

  const { data: summary } = useQuery<PortfolioSummary>({
    queryKey: ["portfolio-summary"],
    queryFn: () => getPortfolioSummary() as Promise<PortfolioSummary>,
    enabled: isAuthenticated,
  });

  const { data: performance } = useQuery<Performance>({
    queryKey: ["performance", performancePeriod],
    queryFn: () => getPerformance({ period: performancePeriod }) as Promise<Performance>,
    enabled: isAuthenticated,
  });

  const { data: walletPositions, isLoading: positionsLoading } = useQuery<WalletPositions>({
    queryKey: ["wallet-positions", selectedWalletId],
    queryFn: () => getWalletPositions(selectedWalletId!) as Promise<WalletPositions>,
    enabled: !!selectedWalletId && isAuthenticated,
  });

  const addWalletMutation = useMutation({
    mutationFn: () => addWallet(newWalletAddress, newWalletLabel || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-summary"] });
      setNewWalletAddress("");
      setNewWalletLabel("");
      setShowAddWallet(false);
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
        <div className="max-w-6xl mx-auto text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  const deleteWalletMutation = useMutation({
    mutationFn: (walletId: string) => deleteWallet(walletId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-summary"] });
      if (selectedWalletId) {
        setSelectedWalletId(null);
      }
    },
  });

  const deletePositionMutation = useMutation({
    mutationFn: ({ walletId, positionId }: { walletId: string; positionId: string }) =>
      deletePosition(walletId, positionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet-positions"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-summary"] });
      queryClient.invalidateQueries({ queryKey: ["performance"] });
    },
  });

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return `$${value.toFixed(2)}`;
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return "-";
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return "-";
    return `${(price * 100).toFixed(1)}%`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isValidAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Portfolio</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Track your Polymarket positions and performance
              </p>
            </div>
            <button
              onClick={() => setShowAddWallet(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Wallet
            </button>
          </div>
        </header>

        {/* Portfolio Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalValue)}</p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Unrealized P&L</p>
              <p className={`text-2xl font-bold ${summary.totalUnrealizedPnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(summary.totalUnrealizedPnl)}
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Wallets</p>
              <p className="text-2xl font-bold">{summary.walletCount}</p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Positions</p>
              <p className="text-2xl font-bold">{summary.totalPositions}</p>
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {performance && (performance.totalTrades > 0 || wallets?.length === 0) && (
          <div className="mb-8 p-6 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Performance Metrics</h2>
              <div className="flex gap-2">
                {["7d", "30d", "90d", "all"].map((period) => (
                  <button
                    key={period}
                    onClick={() => setPerformancePeriod(period)}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      performancePeriod === period
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {period === "all" ? "All Time" : period}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Win Rate</p>
                <p className="text-xl font-semibold">{performance.winRate.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Trades</p>
                <p className="text-xl font-semibold">{performance.totalTrades}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Entry Timing</p>
                <p className="text-xl font-semibold">{performance.entryTimingScore.toFixed(0)}/100</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total P&L</p>
                <p className={`text-xl font-semibold ${performance.totalPnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(performance.totalPnl)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Add Wallet Form */}
        {showAddWallet && (
          <div className="mb-8 p-6 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Add Wallet</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Track a Polygon wallet address to view its Polymarket positions. This is read-only tracking.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Wallet Address</label>
                <input
                  type="text"
                  value={newWalletAddress}
                  onChange={(e) => setNewWalletAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 font-mono"
                />
                {newWalletAddress && !isValidAddress(newWalletAddress) && (
                  <p className="text-sm text-red-500 mt-1">Invalid Ethereum address format</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Label (optional)</label>
                <input
                  type="text"
                  value={newWalletLabel}
                  onChange={(e) => setNewWalletLabel(e.target.value)}
                  placeholder="My Trading Wallet"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddWallet(false);
                  setNewWalletAddress("");
                  setNewWalletLabel("");
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => addWalletMutation.mutate()}
                disabled={!isValidAddress(newWalletAddress) || addWalletMutation.isPending}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {addWalletMutation.isPending ? "Adding..." : "Add Wallet"}
              </button>
            </div>
            {addWalletMutation.isError && (
              <p className="mt-2 text-red-600 text-sm">
                Error: {(addWalletMutation.error as Error).message}
              </p>
            )}
          </div>
        )}

        {/* Loading State */}
        {(walletsLoading || authLoading) && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500"></div>
            <p className="mt-2 text-gray-500">Loading wallets...</p>
          </div>
        )}

        {/* Wallets List */}
        {wallets && wallets.length === 0 && !walletsLoading && (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-gray-500 mb-4">No wallets tracked yet.</p>
            <button
              onClick={() => setShowAddWallet(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Your First Wallet
            </button>
          </div>
        )}

        {wallets && wallets.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Wallets Sidebar */}
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold mb-4">Tracked Wallets</h2>
              <div className="space-y-2">
                {wallets.map((wallet) => (
                  <div
                    key={wallet.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedWalletId === wallet.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
                    }`}
                    onClick={() => setSelectedWalletId(wallet.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {wallet.label || formatAddress(wallet.address)}
                        </p>
                        <p className="text-sm text-gray-500 font-mono">
                          {formatAddress(wallet.address)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this wallet?")) {
                            deleteWalletMutation.mutate(wallet.id);
                          }
                        }}
                        className="ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete wallet"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Positions Panel */}
            <div className="lg:col-span-2">
              {!selectedWalletId && (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-gray-500">Select a wallet to view positions</p>
                </div>
              )}

              {selectedWalletId && positionsLoading && (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500"></div>
                  <p className="mt-2 text-gray-500">Loading positions...</p>
                </div>
              )}

              {walletPositions && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">
                      Positions ({walletPositions.summary.positionCount})
                    </h2>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total Value</p>
                      <p className="font-semibold">{formatCurrency(walletPositions.summary.totalValue)}</p>
                    </div>
                  </div>

                  {walletPositions.positions.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <p className="text-gray-500">No positions found for this wallet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {walletPositions.positions.map((position) => (
                        <div
                          key={position.id}
                          className="p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0 mr-4">
                              <Link
                                href={`/markets/${position.marketId}`}
                                className="font-medium hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2"
                              >
                                {position.marketQuestion}
                              </Link>
                              <p className="text-sm text-gray-500 mt-1">
                                {position.outcome} &bull; {position.shares.toFixed(2)} shares
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                deletePositionMutation.mutate({
                                  walletId: selectedWalletId!,
                                  positionId: position.id,
                                })
                              }
                              className="text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete position"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Entry</p>
                              <p className="font-mono">{formatPrice(position.avgEntryPrice)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Current</p>
                              <p className="font-mono">{formatPrice(position.currentPrice)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Value</p>
                              <p className="font-mono">{formatCurrency(position.currentValue)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">P&L</p>
                              <p className={`font-mono ${(position.unrealizedPnl ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {formatCurrency(position.unrealizedPnl)} ({formatPercent(position.pnlPercent)})
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Hidden Exposure Analysis */}
                  {walletPositions.positions.length > 0 && (
                    <div className="mt-6">
                      <HiddenExposureCard
                        walletId={selectedWalletId!}
                        walletLabel={walletPositions.wallet.label || undefined}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top Positions */}
        {summary && summary.topPositions.length > 0 && (
          <div className="mt-8 p-6 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Top Positions by Value</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-2 px-2 font-medium">Market</th>
                    <th className="text-right py-2 px-2 font-medium">Outcome</th>
                    <th className="text-right py-2 px-2 font-medium">Shares</th>
                    <th className="text-right py-2 px-2 font-medium">Value</th>
                    <th className="text-right py-2 px-2 font-medium">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.topPositions.map((position) => (
                    <tr key={position.id} className="border-b dark:border-gray-800">
                      <td className="py-2 px-2">
                        <Link
                          href={`/markets/${position.marketId}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400 line-clamp-1"
                        >
                          {position.marketQuestion}
                        </Link>
                      </td>
                      <td className="text-right py-2 px-2">{position.outcome}</td>
                      <td className="text-right py-2 px-2 font-mono">{position.shares.toFixed(2)}</td>
                      <td className="text-right py-2 px-2 font-mono">{formatCurrency(position.currentValue)}</td>
                      <td className={`text-right py-2 px-2 font-mono ${(position.unrealizedPnl ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatPercent(position.pnlPercent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
