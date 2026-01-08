const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: "include", // Include cookies for auth
    });
  } catch {
    // Network error - service unavailable
    throw new Error("Service temporarily unavailable");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Service error`);
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

export type RetailFriendliness = "favorable" | "neutral" | "unfavorable";

export type RetailInterpretation = {
  friendliness: RetailFriendliness;
  whatThisMeansForRetail: string;
  commonMistake: string;
  whyRetailLoses: string;
  whenRetailCanCompete: string;
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
  retailInterpretation?: RetailInterpretation;
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
    largeWalletsEntered24h?: number; // Wallets with >$10K entered in last 24h
    largeWalletsEnteredDirection?: "YES" | "NO"; // Which direction they entered
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
    volumeVsAverage?: number; // Ratio of 24h volume to 7d average
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

// Get event window signal for a market
export async function getEventWindowSignal(marketId: string): Promise<RetailSignal | null> {
  return fetchApi(`/api/retail-signals/markets/${marketId}/event-window`);
}

// Get retail friendliness signal for a market
export async function getRetailFriendlinessSignal(marketId: string): Promise<RetailSignal | null> {
  return fetchApi(`/api/retail-signals/markets/${marketId}/retail-friendliness`);
}

// Get all retail signals for a market
export async function getMarketRetailSignals(marketId: string): Promise<MarketRetailSignalsResponse> {
  return fetchApi(`/api/retail-signals/markets/${marketId}`);
}

// Daily signals types
export type DailySignalsMarket = {
  marketId: string;
  question: string;
  category: string | null;
  currentPrice: number | null;
  signals: RetailSignal[];
};

export type DailySignalsCrowdMarket = {
  marketId: string;
  question: string;
  category: string | null;
  currentPrice: number | null;
  signal: RetailSignal;
};

export type DailySignalsEventMarket = {
  marketId: string;
  question: string;
  category: string | null;
  currentPrice: number | null;
  hoursUntilEvent: number;
  signal: RetailSignal;
};

export type DailySignalsResponse = {
  date: string;
  available: boolean;
  reason?: string;
  summary: {
    totalMarkets: number;
    favorableCount: number;
    crowdChasingCount: number;
    eventWindowCount: number;
  };
  favorableMarkets: DailySignalsMarket[];
  crowdChasingMarkets: DailySignalsCrowdMarket[];
  eventWindowMarkets: DailySignalsEventMarket[];
  generatedAt: string;
  disclaimer: string;
};

// Get daily signals summary
export async function getDailySignals(): Promise<DailySignalsResponse> {
  return fetchApi("/api/retail-signals/daily");
}

// Check if daily signals are available (region check)
export async function checkDailySignalsAvailability(): Promise<{ available: boolean; reason?: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/retail-signals/daily`, {
      method: "GET",
      credentials: "include",
    });

    if (response.status === 403) {
      const data = await response.json();
      return { available: false, reason: data.reason };
    }

    return { available: true };
  } catch {
    return { available: false, reason: "Unable to check availability" };
  }
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

// ============================================
// DAILY ATTENTION
// ============================================

export type DailyAttentionResponse = {
  worthAttention: Array<{
    id: string;
    question: string;
    category: string | null;
    setupLabel: string;
    confidence: number;
    whyBullets: Array<{ text: string; value: string; unit: string }>;
    whyThisMatters: string;
  }>;
  retailTraps: Array<{
    id: string;
    question: string;
    category: string | null;
    warningLabel: string;
    commonMistake: string;
  }>;
  whatChanged: Array<{
    marketId: string;
    question: string;
    changeType: "state_shift" | "event_window" | "mispricing" | "flow_guard";
    description: string;
  }>;
  generatedAt: string;
};

export async function getDailyAttention(): Promise<DailyAttentionResponse> {
  return fetchApi("/api/daily");
}

// ============================================
// RETAIL FLOW GUARD
// ============================================

export type FlowGuardLabel = "historically_noisy" | "pro_dominant" | "retail_actionable";
export type FlowGuardSeverity = "warning" | "caution" | "info";

export type FlowGuardWhyBullet = {
  text: string;
  metric?: string;
  value?: number;
  unit?: string;
};

export type FlowGuardResponse = {
  label: FlowGuardLabel;
  confidence: "low" | "medium" | "high";
  whyBullets: FlowGuardWhyBullet[];
  commonRetailMistake: string;
  displayLabel: string;
  severity: FlowGuardSeverity;
  explanation: string;
  disclaimer: string;
  metrics?: {
    largeEarlyTradesPct: number | null;
    orderBookConcentration: number | null;
    depthShiftSpeed: number | null;
    repricingSpeed: number | null;
  };
};

export async function getFlowGuard(marketId: string): Promise<FlowGuardResponse | null> {
  return fetchApi(`/api/markets/${marketId}/flow-guard`);
}

export async function computeFlowGuard(marketId: string): Promise<FlowGuardResponse> {
  return fetchApi(`/api/markets/${marketId}/compute-flow-guard`, {
    method: "POST",
  });
}

// ============================================
// HIDDEN EXPOSURE DETECTOR
// ============================================

export type ExposureLinkLabel = "independent" | "partially_linked" | "highly_linked";

export type LinkedMarket = {
  marketId: string;
  question: string;
  exposureLabel: ExposureLinkLabel;
  explanation: string;
  exampleOutcome: string;
  mistakePrevented: string;
  sharedDriverType: string;
};

export type HiddenExposureResponse = {
  marketId: string;
  linkedMarkets: LinkedMarket[];
  totalLinked: number;
  highlyLinkedCount: number;
  warningLevel: "none" | "caution" | "warning";
};

export type ResolutionDriversResponse = {
  marketId: string;
  underlyingAsset: string | null;
  assetCategory: string | null;
  narrativeDependency: string | null;
  resolutionSource: string | null;
};

export type ComputeExposureResponse = {
  marketId: string;
  linksCreated: number;
  highlyLinked: number;
  partiallyLinked: number;
};

// Get hidden exposure for a market
export async function getHiddenExposure(marketId: string): Promise<HiddenExposureResponse> {
  return fetchApi(`/api/markets/${marketId}/hidden-exposure`);
}

// Compute resolution drivers for a market
export async function computeResolutionDrivers(marketId: string): Promise<ResolutionDriversResponse> {
  return fetchApi(`/api/markets/${marketId}/compute-drivers`, {
    method: "POST",
  });
}

// Compute hidden exposure links for a market
export async function computeHiddenExposure(marketId: string): Promise<ComputeExposureResponse> {
  return fetchApi(`/api/markets/${marketId}/compute-exposure`, {
    method: "POST",
  });
}

// ============================================================================
// LIVE STATS
// ============================================================================

export type LiveStatsResponse = {
  volume24h: number;
  activeTraders: number;
  topWinRate: number;
  lastUpdated: string;
};

// Get live platform statistics
export async function getLiveStats(): Promise<LiveStatsResponse> {
  return fetchApi("/api/stats/live");
}

// ============================================================================
// ARBITRAGE OPPORTUNITIES
// ============================================================================

export type ArbitrageOpportunity = {
  marketId: string;
  marketName: string;
  yesPrice: number;
  noPrice: number;
  spread: number;
  profitPerShare: number;
  profitPer100: number;
  roiPercent: number;
  resolvesIn: string;
  difficulty: "easy" | "medium" | "hard";
};

export type ArbitrageResponse = {
  opportunities: ArbitrageOpportunity[];
  lastUpdated: string;
  nextUpdate: number;
};

// Get arbitrage opportunities
export async function getArbitrageOpportunities(): Promise<ArbitrageResponse> {
  return fetchApi("/api/arbitrage");
}

// ============================================================================
// TOP TRADERS LEADERBOARD
// ============================================================================

export type Trader = {
  rank: number;
  walletAddress: string;
  totalProfit: number;
  winRate: number;
  tradeCount: number;
  roiPercent: number;
  primaryCategory: string | null;
  lastTradeAt: string | null;
  activePositions: number;
};

export type LeaderboardResponse = {
  traders: Trader[];
  totalTraders: number;
};

export type Trade = {
  id: string;
  marketId: string;
  side: string;
  outcome: string;
  entryPrice: number | null;
  exitPrice: number | null;
  size: number | null;
  profit: number | null;
  timestamp: string;
  txHash: string | null;
};

export type CategoryBreakdown = {
  category: string;
  tradeCount: number;
  profit: number;
  winRate: number;
};

export type TraderProfile = {
  walletAddress: string;
  rank: number | null;
  totalProfit: number | null;
  totalVolume: number | null;
  winRate: number | null;
  tradeCount: number;
  roiPercent: number | null;
  primaryCategory: string | null;
  lastTradeAt: string | null;
  recentTrades: Trade[];
  categoryBreakdown: CategoryBreakdown[];
  performanceOverTime: Array<{
    date: string;
    profit: number;
    trades: number;
  }>;
  winLossDistribution: {
    wins: number;
    losses: number;
    breakeven: number;
  };
};

export type LeaderboardCategory = {
  category: string;
  traderCount: number;
};

// Get top traders leaderboard
export async function getLeaderboard(params?: {
  category?: string;
  sort?: "profit" | "winRate" | "roi" | "volume";
  limit?: number;
  offset?: number;
}): Promise<LeaderboardResponse> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);
  if (params?.sort) searchParams.set("sort", params.sort);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  const query = searchParams.toString();
  return fetchApi(`/api/leaderboard${query ? `?${query}` : ""}`);
}

// Get trader profile by wallet address
export async function getTraderProfile(walletAddress: string): Promise<TraderProfile> {
  return fetchApi(`/api/leaderboard/${walletAddress}`);
}

// Get available categories
export async function getLeaderboardCategories(): Promise<{ categories: LeaderboardCategory[] }> {
  return fetchApi("/api/leaderboard/categories");
}

// ============================================================================
// WHALE ACTIVITY FEED
// ============================================================================

export type WhaleTrade = {
  id: string;
  walletAddress: string;
  marketId: string;
  marketName: string;
  action: string;
  outcome: string;
  amountUsd: number;
  price: number | null;
  priceBefore: number | null;
  priceAfter: number | null;
  priceImpact: number | null;
  timestamp: string;
  isHot: boolean;
};

export type WhaleFeedResponse = {
  trades: WhaleTrade[];
  lastUpdated: string;
};

// Get whale activity feed
export async function getWhaleActivity(limit?: number): Promise<WhaleFeedResponse> {
  const searchParams = new URLSearchParams();
  if (limit) searchParams.set("limit", String(limit));
  const query = searchParams.toString();
  return fetchApi(`/api/whale-activity${query ? `?${query}` : ""}`);
}

// ============================================================================
// SIMILAR HISTORY (WIN RATE VISUALIZATION)
// ============================================================================

export type HistoryResult = {
  outcome: "win" | "loss" | "pending";
  marketId: string;
  marketQuestion: string;
  roi: number | null;
};

export type SimilarHistoryResponse = {
  marketId: string;
  clusterType: string;
  history: HistoryResult[];
  totalWins: number;
  totalLosses: number;
  totalPending: number;
  winRate: number;
  averageROI: number;
};

// Get similar market history for win rate visualization
export async function getSimilarHistory(marketId: string): Promise<SimilarHistoryResponse> {
  return fetchApi(`/api/markets/${marketId}/similar-history`);
}

// ============================================================================
// SLIPPAGE CALCULATOR
// ============================================================================

export type SlippageResponse = {
  inputSize: number;
  side: "buy" | "sell";
  outcome: "YES" | "NO";
  midPrice: number;
  executionPrice: number;
  slippagePercent: number;
  slippageDollars: number;
  priceImpact: "Low" | "Medium" | "High";
  warning: string;
  breakdown: Array<{
    price: number;
    size: number;
  }>;
};

// Get slippage calculation for a trade
export async function getSlippage(
  marketId: string,
  size: number,
  side: "buy" | "sell",
  outcome: "YES" | "NO"
): Promise<SlippageResponse> {
  const params = new URLSearchParams({
    size: String(size),
    side,
    outcome,
  });
  return fetchApi(`/api/markets/${marketId}/slippage?${params.toString()}`);
}

// ============================================================================
// UMA DISPUTES
// ============================================================================

export type DisputeStatus = "commit_stage" | "reveal_stage" | "resolved";

export type Dispute = {
  id: string;
  marketId: string;
  disputeStatus: DisputeStatus;
  proposedOutcome: string | null;
  disputedOutcome: string | null;
  totalVotes: number;
  yesVotes: number;
  noVotes: number;
  votingEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
  market?: {
    id: string;
    polymarketId: string;
    question: string;
    category: string | null;
    endDate: string | null;
  };
};

export type DisputeHistory = {
  id: string;
  marketId: string;
  resolutionFlipped: boolean;
  originalOutcome: string | null;
  finalOutcome: string | null;
  resolvedAt: string;
};

export type DisputesResponse = {
  disputes: Dispute[];
  count: number;
};

export type DisputeHistoryResponse = {
  history: DisputeHistory[];
  count: number;
};

// Get all active disputes
export async function getDisputes(): Promise<DisputesResponse> {
  return fetchApi("/api/disputes");
}

// Get dispute for a specific market
export async function getDisputeForMarket(marketId: string): Promise<{ dispute: Dispute | null }> {
  try {
    return await fetchApi(`/api/disputes/${marketId}`);
  } catch (error) {
    // Return null if no dispute found (404)
    return { dispute: null };
  }
}

// Get historical disputes
export async function getDisputeHistory(limit: number = 50): Promise<DisputeHistoryResponse> {
  return fetchApi(`/api/disputes/history?limit=${limit}`);
}

// ============================================================================
// TELEGRAM INTEGRATION
// ============================================================================

export type TelegramConnection = {
  id: string;
  userId: string;
  telegramChatId: string;
  telegramUsername: string | null;
  connectedAt: string;
  isActive: boolean;
};

export type TelegramSubscription = {
  id: string;
  telegramConnectionId: string;
  alertType: string;
  marketId: string | null;
  threshold: string | null;
  createdAt: string;
};

export type TelegramBotInfo = {
  botUsername: string;
  botUrl: string;
  instructions: string[];
};

// Get Telegram connection status
export async function getTelegramConnection(): Promise<{ connection: TelegramConnection | null }> {
  return fetchApi("/api/telegram/connection");
}

// Get Telegram alert subscriptions
export async function getTelegramSubscriptions(): Promise<{
  subscriptions: TelegramSubscription[];
  count: number;
}> {
  return fetchApi("/api/telegram/subscriptions");
}

// Disconnect Telegram
export async function disconnectTelegram(): Promise<{ success: boolean; message: string }> {
  return fetchApi("/api/telegram/connection", { method: "DELETE" });
}

// Get bot information
export async function getTelegramBotInfo(): Promise<TelegramBotInfo> {
  return fetchApi("/api/telegram/bot-info");
}

// ============================================================================
// ORDER BOOK
// ============================================================================

export type OrderBookLevel = {
  price: number;
  size: number;
  total: number;
};

export type OrderBookInterpretation = {
  bookBalance: "balanced" | "heavy_bid" | "heavy_ask";
  largeWalls: Array<{
    side: "bid" | "ask";
    price: number;
    size: number;
    percentage: number;
  }>;
  thinZones: Array<{
    startPrice: number;
    endPrice: number;
    gap: number;
  }>;
  summary: string;
};

export type OrderBookResponse = {
  marketId: string;
  midPrice: number;
  spread: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: string;
  interpretation: OrderBookInterpretation;
};

// Get order book for a market
export async function getOrderBook(marketId: string): Promise<OrderBookResponse> {
  return fetchApi(`/api/markets/${marketId}/orderbook`);
}

// ============================================================================
// AI ANALYSIS
// ============================================================================

export type AIAnalysisResponse = {
  marketId: string;
  generatedAt: string;
  probability_estimate: number;
  confidence: "Low" | "Medium" | "High";
  thesis: string;
  counter_thesis: string;
  key_factors: string[];
  what_could_go_wrong: string[];
  news_summary?: string;
};

// Get AI analysis for a market
export async function getAIAnalysis(marketId: string): Promise<AIAnalysisResponse> {
  return fetchApi(`/api/markets/${marketId}/analysis`);
}
