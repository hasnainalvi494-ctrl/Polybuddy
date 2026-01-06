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

// Notification types
export type Notification = {
  id: string;
  alertId: string | null;
  marketId: string | null;
  type: "price_move" | "volume_spike" | "liquidity_drop" | "resolution_approaching";
  title: string;
  message: string;
  marketQuestion: string | null;
  read: boolean;
  createdAt: string;
};

// Notification functions
export async function getNotifications(params?: { unreadOnly?: boolean; limit?: number }): Promise<{
  notifications: Notification[];
  unreadCount: number;
}> {
  const searchParams = new URLSearchParams();
  if (params?.unreadOnly) searchParams.set("unreadOnly", "true");
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const query = searchParams.toString();
  return fetchApi(`/api/alerts/notifications${query ? `?${query}` : ""}`);
}

export async function markNotificationRead(notificationId: string): Promise<{ success: boolean }> {
  return fetchApi(`/api/alerts/notifications/${notificationId}/read`, { method: "POST" });
}

export async function markAllNotificationsRead(): Promise<{ success: boolean; count: number }> {
  return fetchApi("/api/alerts/notifications/read-all", { method: "POST" });
}

export async function processAlerts(): Promise<{ processed: number; triggered: number }> {
  return fetchApi("/api/alerts/process", { method: "POST" });
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

// Flow Analysis types
export type FlowType = "smart_money" | "mixed" | "retail_dominated" | "unknown";
export type FlowDirection = "bullish" | "bearish" | "neutral";

export type FlowAnalysisResponse = {
  marketId: string;
  flowType: FlowType;
  flowLabel: string;
  confidence: number;
  metrics: {
    totalTransactions: number;
    smartMoneyTransactions: number;
    retailTransactions: number;
    smartMoneyVolume: number;
    retailVolume: number;
    netFlowDirection: FlowDirection;
    largestTransaction: number | null;
  };
  recentActivity: Array<{
    timestamp: string;
    type: "smart_money" | "retail" | "unknown";
    direction: "buy" | "sell";
    volumeUsd: number;
  }>;
  whyBullets: WhyBullet[];
  computedAt: string;
};

export async function getMarketFlow(marketId: string): Promise<FlowAnalysisResponse> {
  return fetchApi(`/api/analytics/markets/${marketId}/flow`);
}

// Public Flow Context types
export type WalletTrend = "increasing" | "decreasing" | "stable";

export type PublicContextResponse = {
  marketId: string;
  participation: {
    totalWallets: number;
    activeWallets24h: number;
    newWallets24h: number;
    walletTrend: WalletTrend;
  };
  positions: {
    totalLongPositions: number;
    totalShortPositions: number;
    longShortRatio: number;
    avgPositionSize: number;
    medianPositionSize: number;
  };
  volume: {
    volume24h: number;
    volume7d: number;
    volumeChange24h: number;
    avgDailyVolume: number;
    isVolumeSpike: boolean;
  };
  largeTransactions: Array<{
    timestamp: string;
    direction: "buy" | "sell";
    volumeUsd: number;
    isWhale: boolean;
  }>;
  insights: string[];
  computedAt: string;
};

export async function getMarketContext(marketId: string): Promise<PublicContextResponse> {
  return fetchApi(`/api/analytics/markets/${marketId}/context`);
}

// Signals types
export type SignalType = "momentum" | "contrarian" | "liquidity_opportunity" | "value_gap" | "event_catalyst";
export type SignalStrength = "weak" | "moderate" | "strong";

export type Signal = {
  id: string;
  marketId: string;
  marketQuestion: string;
  type: SignalType;
  strength: SignalStrength;
  direction: "bullish" | "bearish";
  currentPrice: number;
  targetPrice: number | null;
  confidence: number;
  reasoning: string[];
  risks: string[];
  timeHorizon: string;
  expiresAt: string;
  createdAt: string;
};

export type SignalsResponse = {
  signals: Signal[];
  disclaimer: string;
  generatedAt: string;
};

export type SignalsAvailability = {
  available: boolean;
  countryDetected: string | null;
  reason: string | null;
};

// Signals functions
export async function getSignals(params?: {
  type?: SignalType;
  minStrength?: SignalStrength;
  limit?: number;
}): Promise<SignalsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set("type", params.type);
  if (params?.minStrength) searchParams.set("minStrength", params.minStrength);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const query = searchParams.toString();
  return fetchApi(`/api/signals${query ? `?${query}` : ""}`);
}

export async function checkSignalsAvailability(): Promise<SignalsAvailability> {
  return fetchApi("/api/signals/availability");
}

// ============================================
// RETAIL SIGNALS
// ============================================

export type RetailSignalType =
  | "favorable_structure"
  | "structural_mispricing"
  | "crowd_chasing"
  | "event_window"
  | "retail_friendliness";

export type SignalConfidenceLevel = "low" | "medium" | "high";

export type RetailWhyBullet = {
  text: string;
  metric: string;
  value: number;
  unit?: string;
};

export type RetailSignal = {
  id: string;
  marketId: string;
  signalType: RetailSignalType;
  label: string;
  isFavorable: boolean;
  confidence: SignalConfidenceLevel;
  whyBullets: RetailWhyBullet[];
  metrics: Record<string, unknown> | null;
  computedAt: string;
};

export type MarketRetailSignalsResponse = {
  marketId: string;
  signals: RetailSignal[];
};

// Get favorable structure signal for a market
export async function getFavorableStructureSignal(marketId: string): Promise<RetailSignal | null> {
  return fetchApi(`/api/retail-signals/markets/${marketId}/favorable-structure`);
}

// Get structural mispricing signal for a market
export async function getStructuralMispricingSignal(marketId: string): Promise<RetailSignal | null> {
  return fetchApi(`/api/retail-signals/markets/${marketId}/structural-mispricing`);
}

// Get crowd chasing signal for a market
export async function getCrowdChasingSignal(marketId: string): Promise<RetailSignal | null> {
  return fetchApi(`/api/retail-signals/markets/${marketId}/crowd-chasing`);
}

// Get all retail signals for a market
export async function getMarketRetailSignals(marketId: string): Promise<MarketRetailSignalsResponse> {
  return fetchApi(`/api/retail-signals/markets/${marketId}`);
}

// Weekly Reports types
export type WeeklyReport = {
  id: string;
  weekStart: string;
  weekEnd: string;
  realizedPnl: number | null;
  unrealizedPnl: number | null;
  totalTrades: number;
  winRate: number | null;
  bestMarketQuestion: string | null;
  worstMarketQuestion: string | null;
  entryTimingScore: number | null;
  slippagePaid: number | null;
  concentrationScore: number | null;
  qualityDisciplineScore: number | null;
  patternsObserved: string[];
  coachingNotes: string[];
  generatedAt: string;
  viewedAt: string | null;
};

// Weekly Reports functions
export async function getReports(limit?: number): Promise<{ reports: WeeklyReport[] }> {
  const query = limit ? `?limit=${limit}` : "";
  return fetchApi(`/api/reports${query}`);
}

export async function getReport(id: string): Promise<WeeklyReport> {
  return fetchApi(`/api/reports/${id}`);
}

export async function generateReport(weekOffset?: number): Promise<WeeklyReport> {
  return fetchApi("/api/reports/generate", {
    method: "POST",
    body: JSON.stringify({ weekOffset: weekOffset || 0 }),
  });
}
