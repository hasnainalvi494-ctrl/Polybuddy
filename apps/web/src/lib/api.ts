// API client for PolyBuddy backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://polybuddy-api-production.up.railway.app";

// Helper for fetching with timeout and retry (handles Railway cold starts)
async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for cold starts
      const response = await fetch(url, { 
        ...options, 
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      // Wait before retry: 2s, 4s, 8s (exponential backoff)
      await new Promise(r => setTimeout(r, Math.pow(2, i + 1) * 1000));
    }
  }
  throw new Error("Failed after retries");
}

interface GetMarketsParams {
  search?: string;
  category?: string;
  sortBy?: "volume" | "createdAt" | "endDate";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export async function getMarkets(params: GetMarketsParams = {}) {
  const searchParams = new URLSearchParams();
  
  if (params.search) searchParams.set("search", params.search);
  if (params.category) searchParams.set("category", params.category);
  if (params.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.offset) searchParams.set("offset", params.offset.toString());

  const url = `${API_URL}/api/markets?${searchParams.toString()}`;
  
  const response = await fetchWithRetry(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch markets: ${response.statusText}`);
  }

  return response.json();
}

export async function getCategories() {
  const url = `${API_URL}/api/markets/categories`;
  
  const response = await fetchWithRetry(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.statusText}`);
  }

  return response.json();
}

export async function getMarketById(id: string) {
  const url = `${API_URL}/api/markets/${id}`;
  
  const response = await fetchWithRetry(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch market: ${response.statusText}`);
  }

  return response.json();
}

// Alias for backwards compatibility
export const getMarket = getMarketById;

export async function getStructurallyInteresting(limit: number = 6) {
  const url = `${API_URL}/api/markets/structurally-interesting?limit=${limit}`;
  
  const response = await fetchWithRetry(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch structurally interesting markets: ${response.statusText}`);
  }

  return response.json();
}

export async function getRetailSignals(marketId: string) {
  const url = `${API_URL}/api/retail-signals/${marketId}`;
  
  const response = await fetchWithRetry(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch retail signals: ${response.statusText}`);
  }

  return response.json();
}

export async function signup(email: string, password: string) {
  const url = `${API_URL}/api/auth/signup`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Signup failed");
  }

  return response.json();
}

export async function login(email: string, password: string) {
  const url = `${API_URL}/api/auth/login`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Login failed");
  }

  return response.json();
}

// Auth functions
export async function getCurrentUser() {
  const url = `${API_URL}/api/auth/me`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get current user");
  }

  return response.json();
}

export async function logout() {
  const url = `${API_URL}/api/auth/logout`;

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Logout failed");
  }

  return response.json();
}

// Alerts functions
export async function getAlerts() {
  const url = `${API_URL}/api/alerts`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch alerts");
  }

  return response.json();
}

export async function getNotifications() {
  const url = `${API_URL}/api/notifications`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }

  return response.json();
}

export async function createAlert(data: any) {
  const url = `${API_URL}/api/alerts`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to create alert");
  }

  return response.json();
}

export async function dismissAlert(id: string) {
  const url = `${API_URL}/api/alerts/${id}/dismiss`;

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to dismiss alert");
  }

  return response.json();
}

export async function deleteAlert(id: string) {
  const url = `${API_URL}/api/alerts/${id}`;

  const response = await fetch(url, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to delete alert");
  }

  return response.json();
}

export async function markNotificationRead(id: string) {
  const url = `${API_URL}/api/notifications/${id}/read`;

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to mark notification as read");
  }

  return response.json();
}

export async function markAllNotificationsRead() {
  const url = `${API_URL}/api/notifications/mark-all-read`;

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to mark all notifications as read");
  }

  return response.json();
}

export async function processAlerts() {
  const url = `${API_URL}/api/alerts/process`;

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to process alerts");
  }

  return response.json();
}

// Portfolio functions
export async function getWallets() {
  const url = `${API_URL}/api/portfolio/wallets`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch wallets");
  }

  return response.json();
}

export async function getPortfolioSummary() {
  const url = `${API_URL}/api/portfolio/summary`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch portfolio summary");
  }

  return response.json();
}

export async function getPerformance() {
  const url = `${API_URL}/api/portfolio/performance`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch performance");
  }

  return response.json();
}

export async function getWalletPositions(walletId: string) {
  const url = `${API_URL}/api/portfolio/wallets/${walletId}/positions`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch wallet positions");
  }

  return response.json();
}

export async function addWallet(data: any) {
  const url = `${API_URL}/api/portfolio/wallets`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to add wallet");
  }

  return response.json();
}

export async function deleteWallet(id: string) {
  const url = `${API_URL}/api/portfolio/wallets/${id}`;

  const response = await fetch(url, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to delete wallet");
  }

  return response.json();
}

export async function deletePosition(walletId: string, positionId: string) {
  const url = `${API_URL}/api/portfolio/wallets/${walletId}/positions/${positionId}`;

  const response = await fetch(url, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to delete position");
  }

  return response.json();
}

// Reports functions
export async function getReports() {
  const url = `${API_URL}/api/reports`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch reports");
  }

  return response.json();
}

export async function generateReport(data: any) {
  const url = `${API_URL}/api/reports/generate`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to generate report");
  }

  return response.json();
}

// Signals functions
export async function checkSignalsAvailability() {
  const url = `${API_URL}/api/signals/availability`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    throw new Error("Failed to check signals availability");
  }

  return response.json();
}

export async function getSignals() {
  const url = `${API_URL}/api/signals`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch signals");
  }

  return response.json();
}

export async function checkDailySignalsAvailability() {
  const url = `${API_URL}/api/signals/daily/availability`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    throw new Error("Failed to check daily signals availability");
  }

  return response.json();
}

export async function getDailySignals() {
  const url = `${API_URL}/api/signals/daily`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch daily signals");
  }

  return response.json();
}

// Watchlists functions
export async function getWatchlists() {
  const url = `${API_URL}/api/watchlists`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch watchlists");
  }

  return response.json();
}

export async function createWatchlist(data: any) {
  const url = `${API_URL}/api/watchlists`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to create watchlist");
  }

  return response.json();
}

export async function getWatchlist(id: string) {
  const url = `${API_URL}/api/watchlists/${id}`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch watchlist");
  }

  return response.json();
}

export async function addToWatchlist(watchlistId: string, marketId: string) {
  const url = `${API_URL}/api/watchlists/${watchlistId}/markets`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ marketId }),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to add to watchlist");
  }

  return response.json();
}

export async function removeFromWatchlist(watchlistId: string, marketId: string) {
  const url = `${API_URL}/api/watchlists/${watchlistId}/markets/${marketId}`;

  const response = await fetch(url, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to remove from watchlist");
  }

  return response.json();
}

export async function deleteWatchlist(id: string) {
  const url = `${API_URL}/api/watchlists/${id}`;

  const response = await fetch(url, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to delete watchlist");
  }

  return response.json();
}

// Hidden exposure functions
export async function getWalletExposure(walletId: string) {
  const url = `${API_URL}/api/portfolio/wallets/${walletId}/exposure`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch wallet exposure");
  }

  return response.json();
}

export async function getHiddenExposure(marketId: string) {
  const url = `${API_URL}/api/markets/${marketId}/hidden-exposure`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    throw new Error("Failed to fetch hidden exposure");
  }

  return response.json();
}

// Best Bets functions
export async function getBestBets() {
  const url = `${API_URL}/api/best-bets-signals`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    throw new Error("Failed to fetch best bets");
  }

  return response.json();
}

export async function getBestBetByMarket(marketId: string) {
  const url = `${API_URL}/api/best-bets-signals/${marketId}`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    throw new Error("Failed to fetch best bet");
  }

  return response.json();
}

// Elite Traders functions
export async function getEliteTraders() {
  const url = `${API_URL}/api/elite-traders?limit=100`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    throw new Error("Failed to fetch elite traders");
  }

  const data = await response.json();
  return data.traders; // Return just the traders array
}

export async function getEliteTrader(address: string) {
  const url = `${API_URL}/api/elite-traders/${address}`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    throw new Error("Failed to fetch elite trader");
  }

  return response.json();
}

// Copy Trading functions
export async function followTrader(traderAddress: string, copyPercentage: number = 100) {
  const url = `${API_URL}/api/copy-trading/follow`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ traderAddress, copyPercentage }),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to follow trader");
  }

  return response.json();
}

export async function unfollowTrader(traderAddress: string) {
  const url = `${API_URL}/api/copy-trading/unfollow/${traderAddress}`;

  const response = await fetch(url, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to unfollow trader");
  }

  return response.json();
}

export async function getFollowedTraders() {
  const url = `${API_URL}/api/copy-trading/following`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch followed traders");
  }

  return response.json();
}

export async function getCopyTradingDashboard() {
  const url = `${API_URL}/api/copy-trading/dashboard`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch copy trading dashboard");
  }

  return response.json();
}

// Analytics functions
export async function getAnalyticsStats() {
  const url = `${API_URL}/api/analytics/stats`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    throw new Error("Failed to fetch analytics stats");
  }

  return response.json();
}

// Market Detail Components API Functions

export async function getAIAnalysis(marketId: string) {
  const url = `${API_URL}/api/markets/${marketId}/ai-analysis`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    // Return null for features that may not be implemented yet
    return null;
  }

  return response.json();
}

export async function getMarketBehavior(marketId: string) {
  const url = `${API_URL}/api/markets/${marketId}/behavior`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function getCrossPlatformPrices(marketId: string) {
  const url = `${API_URL}/api/markets/${marketId}/cross-platform`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function getDisputeForMarket(marketId: string) {
  const url = `${API_URL}/api/markets/${marketId}/disputes`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function getRelatedMarkets(marketId: string) {
  const url = `${API_URL}/api/markets/${marketId}/related`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return { markets: [] };
  }

  return response.json();
}

export async function getFlowGuard(marketId: string) {
  const url = `${API_URL}/api/markets/${marketId}/flow-guard`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function getMarketFlow(marketId: string) {
  const url = `${API_URL}/api/markets/${marketId}/flow`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function getOrderBook(marketId: string) {
  const url = `${API_URL}/api/markets/${marketId}/orderbook`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function getPriceHistory(marketId: string) {
  const url = `${API_URL}/api/markets/${marketId}/price-history`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return { prices: [] };
  }

  return response.json();
}

export async function getPublicContext(marketId: string) {
  const url = `${API_URL}/api/markets/${marketId}/context`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function getTimingWindow(marketId: string) {
  const url = `${API_URL}/api/markets/${marketId}/timing`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function getWhosInMarket(marketId: string) {
  const url = `${API_URL}/api/markets/${marketId}/participants`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return { participants: [] };
  }

  return response.json();
}

export async function getOutcomePathAnalysis(marketId: string) {
  const url = `${API_URL}/api/markets/${marketId}/outcome-paths`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function getSlippageEstimate(marketId: string, amount: number, side: string) {
  const url = `${API_URL}/api/markets/${marketId}/slippage?amount=${amount}&side=${side}`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

// Alias for SlippageCalculator component
export const getSlippage = getSlippageEstimate;

export async function getMarketState(marketId: string) {
  const url = `${API_URL}/api/markets/${marketId}/state`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function getOutcomePaths(marketId: string) {
  const url = `${API_URL}/api/markets/${marketId}/outcome-paths`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function getMarketHistory(marketId: string) {
  const url = `${API_URL}/api/markets/${marketId}/history`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return { history: [] };
  }

  return response.json();
}

export async function getMarketContext(marketId: string) {
  const url = `${API_URL}/api/markets/${marketId}/context`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function getMarketRetailSignals(marketId: string) {
  const url = `${API_URL}/api/markets/${marketId}/retail-signals`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function getTimingWindows(marketId: string) {
  const url = `${API_URL}/api/markets/${marketId}/timing`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function getParticipants(marketId: string) {
  const url = `${API_URL}/api/markets/${marketId}/participants`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return { participants: [] };
  }

  return response.json();
}

// ==========================================
// Disputes API
// ==========================================

export interface Dispute {
  id: string;
  marketId: string;
  marketQuestion: string;
  disputeStatus: "commit_stage" | "reveal_stage" | "resolved";
  votingEndsAt: string | null;
  proposedOutcome: string;
  currentOutcome: string;
  bondAmount: number;
  createdAt: string;
}

export interface DisputeHistory {
  id: string;
  marketId: string;
  marketQuestion: string;
  finalOutcome: string;
  resolvedAt: string;
  totalVotes: number;
}

export async function getDisputes(): Promise<Dispute[]> {
  const url = `${API_URL}/api/disputes`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.disputes || [];
}

export async function getDisputeHistory(): Promise<DisputeHistory[]> {
  const url = `${API_URL}/api/disputes/history`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.history || [];
}

// ==========================================
// Leaderboard API
// ==========================================

export interface Trader {
  address: string;
  rank: number;
  profit: number;
  winRate: number;
  tradeCount: number;
  volume: number;
  category?: string;
}

export async function getLeaderboard(category?: string): Promise<Trader[]> {
  const url = category 
    ? `${API_URL}/api/leaderboard?category=${category}`
    : `${API_URL}/api/leaderboard`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.traders || [];
}

export async function getLeaderboardCategories(): Promise<string[]> {
  const url = `${API_URL}/api/leaderboard/categories`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.categories || [];
}

// ==========================================
// Telegram API
// ==========================================

export interface TelegramConnection {
  isConnected: boolean;
  username?: string;
  chatId?: string;
  connectedAt?: string;
  linkCode?: string;
}

export async function getTelegramConnection(): Promise<TelegramConnection> {
  const url = `${API_URL}/api/telegram/connection`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    return { isConnected: false };
  }

  return response.json();
}

export async function getTelegramBotInfo() {
  const url = `${API_URL}/api/telegram/bot-info`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function disconnectTelegram() {
  const url = `${API_URL}/api/telegram/disconnect`;

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to disconnect Telegram");
  }

  return response.json();
}
