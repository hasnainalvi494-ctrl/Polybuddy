/**
 * Optimized React Query configuration
 * Provides intelligent caching and background updates
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Caching strategy - shorter times for fresher data
      staleTime: 1000 * 30, // 30 seconds - data is fresh
      gcTime: 1000 * 60 * 5, // 5 minutes - keep in cache
      
      // Retry strategy - more retries for unreliable connections
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      
      // Refetch strategy
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      
      // Performance - allow offline fallback to cached data
      networkMode: "offlineFirst",
      
      // Error handling
      throwOnError: false,
    },
    mutations: {
      retry: 2,
      networkMode: "offlineFirst",
    },
  },
});

// Query key factory for consistent cache keys
export const queryKeys = {
  // Markets
  markets: {
    all: ['markets'] as const,
    lists: () => [...queryKeys.markets.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.markets.lists(), filters] as const,
    details: () => [...queryKeys.markets.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.markets.details(), id] as const,
  },
  
  // Leaderboard
  leaderboard: {
    all: ['leaderboard'] as const,
    top: (limit: number) => [...queryKeys.leaderboard.all, 'top', limit] as const,
  },
  
  // Whale activity
  whales: {
    all: ['whales'] as const,
    recent: (limit: number) => [...queryKeys.whales.all, 'recent', limit] as const,
  },
  
  // Analytics
  analytics: {
    all: ['analytics'] as const,
    daily: () => [...queryKeys.analytics.all, 'daily'] as const,
    stats: () => [...queryKeys.analytics.all, 'stats'] as const,
  },
  
  // Market-specific data
  marketData: {
    priceHistory: (marketId: string) => ['market', marketId, 'price-history'] as const,
    orderBook: (marketId: string) => ['market', marketId, 'orderbook'] as const,
    analysis: (marketId: string) => ['market', marketId, 'analysis'] as const,
    crossPlatform: (marketId: string) => ['market', marketId, 'cross-platform'] as const,
  },
};

// Prefetch utilities
export const prefetchMarket = async (marketId: string) => {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.markets.detail(marketId),
    queryFn: () => fetch(`/api/markets/${marketId}`).then((res) => res.json()),
    staleTime: 1000 * 60 * 5,
  });
};

export const prefetchMarketData = async (marketId: string) => {
  // Prefetch multiple related queries in parallel
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.marketData.priceHistory(marketId),
      queryFn: () => fetch(`/api/markets/${marketId}/price-history`).then((res) => res.json()),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.marketData.orderBook(marketId),
      queryFn: () => fetch(`/api/markets/${marketId}/orderbook`).then((res) => res.json()),
    }),
  ]);
};

// Cache invalidation utilities
export const invalidateMarket = (marketId: string) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.markets.detail(marketId) });
};

export const invalidateMarketData = (marketId: string) => {
  queryClient.invalidateQueries({ queryKey: ['market', marketId] });
};

// Background refetch for critical data
export const startBackgroundRefetch = () => {
  // Refetch live stats every 30 seconds
  const liveStatsInterval = setInterval(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics.stats() });
  }, 30000);

  // Refetch whale activity every minute
  const whaleInterval = setInterval(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.whales.all });
  }, 60000);

  // Cleanup function
  return () => {
    clearInterval(liveStatsInterval);
    clearInterval(whaleInterval);
  };
};


