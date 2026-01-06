const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: "include", // Include cookies for auth
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

// Auth types
export type User = {
  id: string;
  email: string;
  name: string | null;
};

// Auth functions
export async function signup(email: string, password: string, name?: string): Promise<User> {
  return fetchApi("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export async function login(email: string, password: string): Promise<User> {
  return fetchApi("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<{ success: boolean }> {
  return fetchApi("/api/auth/logout", { method: "POST" });
}

export async function getCurrentUser(): Promise<User> {
  return fetchApi("/api/auth/me");
}

// Markets
export async function getMarkets(params?: {
  limit?: number;
  offset?: number;
  category?: string;
  minQuality?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.set(key, String(value));
    });
  }
  const query = searchParams.toString();
  return fetchApi(`/api/markets${query ? `?${query}` : ""}`);
}

export async function getMarket(id: string) {
  return fetchApi(`/api/markets/${id}`);
}

export async function getMarketHistory(id: string, period: string = "24h") {
  return fetchApi(`/api/markets/${id}/history?period=${period}`);
}

export async function getCategories(): Promise<{ category: string; count: number }[]> {
  return fetchApi("/api/markets/categories");
}

// Watchlists
export async function getWatchlists() {
  return fetchApi("/api/watchlists");
}

export async function createWatchlist(name: string) {
  return fetchApi("/api/watchlists", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function getWatchlist(watchlistId: string) {
  return fetchApi(`/api/watchlists/${watchlistId}`);
}

export async function addToWatchlist(watchlistId: string, marketId: string) {
  return fetchApi(`/api/watchlists/${watchlistId}/markets`, {
    method: "POST",
    body: JSON.stringify({ marketId }),
  });
}

export async function removeFromWatchlist(watchlistId: string, marketId: string) {
  return fetchApi(`/api/watchlists/${watchlistId}/markets/${marketId}`, {
    method: "DELETE",
  });
}

export async function deleteWatchlist(watchlistId: string) {
  return fetchApi(`/api/watchlists/${watchlistId}`, {
    method: "DELETE",
  });
}

// Alerts
export async function getAlerts(status?: string) {
  const query = status && status !== "all" ? `?status=${status}` : "";
  return fetchApi(`/api/alerts${query}`);
}

export async function createAlert(
  marketId: string,
  condition: { type: string; [key: string]: unknown }
) {
  return fetchApi("/api/alerts", {
    method: "POST",
    body: JSON.stringify({ marketId, condition }),
  });
}

export async function dismissAlert(alertId: string) {
  return fetchApi(`/api/alerts/${alertId}/dismiss`, {
    method: "POST",
  });
}

export async function deleteAlert(alertId: string) {
  return fetchApi(`/api/alerts/${alertId}`, {
    method: "DELETE",
  });
}

// Portfolio
export async function getWallets() {
  return fetchApi("/api/portfolio/wallets");
}

export async function addWallet(address: string, label?: string) {
  return fetchApi("/api/portfolio/wallets", {
    method: "POST",
    body: JSON.stringify({ address, label }),
  });
}

export async function updateWalletLabel(walletId: string, label: string | null) {
  return fetchApi(`/api/portfolio/wallets/${walletId}`, {
    method: "PATCH",
    body: JSON.stringify({ label }),
  });
}

export async function deleteWallet(walletId: string) {
  return fetchApi(`/api/portfolio/wallets/${walletId}`, {
    method: "DELETE",
  });
}

export async function getWalletPositions(walletId: string) {
  return fetchApi(`/api/portfolio/wallets/${walletId}/positions`);
}

export async function addPosition(
  walletId: string,
  marketId: string,
  outcome: string,
  shares: number,
  avgEntryPrice?: number
) {
  return fetchApi(`/api/portfolio/wallets/${walletId}/positions`, {
    method: "POST",
    body: JSON.stringify({ marketId, outcome, shares, avgEntryPrice }),
  });
}

export async function deletePosition(walletId: string, positionId: string) {
  return fetchApi(`/api/portfolio/wallets/${walletId}/positions/${positionId}`, {
    method: "DELETE",
  });
}

export async function getPerformance(params?: { walletId?: string; period?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.walletId) searchParams.set("walletId", params.walletId);
  if (params?.period) searchParams.set("period", params.period);
  const query = searchParams.toString();
  return fetchApi(`/api/portfolio/performance${query ? `?${query}` : ""}`);
}

export async function getPortfolioSummary() {
  return fetchApi("/api/portfolio/summary");
}

// Analytics types
export type WhyBullet = {
  text: string;
  metric: string;
  value: number;
  unit?: string;
  comparison?: string;
};

export type MarketStateResponse = {
  marketId: string;
  stateLabel: "calm_liquid" | "thin_slippage" | "jumpy" | "event_driven";
  displayLabel: string;
  confidence: number;
  whyBullets: WhyBullet[];
  features: {
    spreadPct: number | null;
    depthUsd: number | null;
    stalenessMinutes: number | null;
    volatility: number | null;
  };
  computedAt: string;
};

export type ExposureCluster = {
  clusterId: string;
  label: string;
  exposurePct: number;
  exposureUsd: number;
  marketCount: number;
  confidence: number;
  whyBullets: WhyBullet[];
  markets: {
    marketId: string;
    question: string;
    exposure: number;
    weight: number;
  }[];
};

export type ExposureResponse = {
  walletId: string;
  totalExposure: number;
  clusters: ExposureCluster[];
  concentrationRisk: number;
  diversificationScore: number;
  topClusterExposure: number;
  warning: string | null;
  isDangerous: boolean;
  computedAt: string;
};

export type ConsistencyCheck = {
  aMarketId: string;
  bMarketId: string;
  aQuestion: string;
  bQuestion: string;
  relationType: "calendar_variant" | "multi_outcome" | "inverse" | "correlated";
  label: "looks_consistent" | "potential_inconsistency_low" | "potential_inconsistency_medium" | "potential_inconsistency_high";
  displayLabel: string;
  score: number;
  confidence: number;
  whyBullets: WhyBullet[];
  priceA: number;
  priceB: number;
  computedAt: string;
};

export type ConsistencyResponse = {
  checks: ConsistencyCheck[];
  summary: {
    totalPairs: number;
    relatedPairs: number;
    inconsistentPairs: number;
  };
};

export type RelatedMarketsResponse = {
  marketId: string;
  relatedMarkets: ConsistencyCheck[];
};

// Analytics functions
export async function getMarketState(marketId: string): Promise<MarketStateResponse> {
  return fetchApi(`/api/analytics/markets/${marketId}/state`);
}

export async function getWalletExposure(walletId: string): Promise<ExposureResponse> {
  return fetchApi(`/api/analytics/wallets/${walletId}/exposure`);
}

export async function checkConsistency(marketIds: string[]): Promise<ConsistencyResponse> {
  return fetchApi("/api/analytics/consistency", {
    method: "POST",
    body: JSON.stringify({ marketIds }),
  });
}

export async function getRelatedMarkets(marketId: string, limit?: number): Promise<RelatedMarketsResponse> {
  const query = limit ? `?limit=${limit}` : "";
  return fetchApi(`/api/analytics/markets/${marketId}/related${query}`);
}

// Behavior Cluster types
export type BehaviorClusterType =
  | "scheduled_event"
  | "continuous_info"
  | "binary_catalyst"
  | "high_volatility"
  | "long_duration"
  | "sports_scheduled";

export type BehaviorDimensions = {
  infoCadence: number;
  infoStructure: number;
  liquidityStability: number;
  timeToResolution: number;
  participantConcentration: number;
};

export type BehaviorClusterResponse = {
  marketId: string;
  cluster: BehaviorClusterType;
  clusterLabel: string;
  confidence: number;
  explanation: string;
  dimensions: BehaviorDimensions;
  whyBullets: WhyBullet[];
  displayInfo: {
    label: string;
    description: string;
    color: string;
    icon: string;
  };
  computedAt: string;
};

export async function getMarketBehavior(marketId: string): Promise<BehaviorClusterResponse> {
  return fetchApi(`/api/analytics/markets/${marketId}/behavior`);
}
