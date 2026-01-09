import { pgTable, text, uuid, timestamp, decimal, boolean, integer, jsonb, index, real } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Sessions table
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Watchlists table
export const watchlists = pgTable("watchlists", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Watchlist markets junction table
export const watchlistMarkets = pgTable("watchlist_markets", {
  id: uuid("id").primaryKey().defaultRandom(),
  watchlistId: uuid("watchlist_id").references(() => watchlists.id).notNull(),
  marketId: text("market_id").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

// Markets table
export const markets = pgTable("markets", {
  id: text("id").primaryKey(),
  question: text("question").notNull(),
  description: text("description"),
  category: text("category"),
  endDate: timestamp("end_date"),
  volume: decimal("volume"),
  liquidity: decimal("liquidity"),
  yesPrice: decimal("yes_price"),
  noPrice: decimal("no_price"),
  qualityScore: decimal("quality_score"), // Overall quality score
  qualityGrade: text("quality_grade"), // Letter grade (A, B, C, D, F)
  clusterLabel: text("cluster_label"), // Cluster classification
  volatilityScore: decimal("volatility_score"), // Volatility score
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Market snapshots table
export const marketSnapshots = pgTable("market_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: text("market_id").references(() => markets.id).notNull(),
  yesPrice: decimal("yes_price").notNull(),
  noPrice: decimal("no_price").notNull(),
  price: decimal("price").notNull(), // Alias for yesPrice
  volume: decimal("volume").notNull(),
  volume24h: decimal("volume_24h"), // 24h volume
  liquidity: decimal("liquidity").notNull(),
  spread: decimal("spread"), // Bid-ask spread
  depth: decimal("depth"), // Market depth
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  snapshotAt: timestamp("snapshot_at").defaultNow().notNull(), // Alias for timestamp
}, (table) => ({
  marketIdIdx: index("market_snapshots_market_id_idx").on(table.marketId),
  timestampIdx: index("market_snapshots_timestamp_idx").on(table.timestamp),
  snapshotAtIdx: index("market_snapshots_snapshot_at_idx").on(table.snapshotAt),
}));

// Alerts table
export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  marketId: text("market_id").notNull(),
  alertType: text("alert_type").notNull(),
  threshold: decimal("threshold"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  alertId: uuid("alert_id").references(() => alerts.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Portfolio positions table
export const portfolioPositions = pgTable("portfolio_positions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  walletId: text("wallet_id"), // Wallet ID for tracking
  marketId: text("market_id").notNull(),
  position: text("position").notNull(), // 'YES' or 'NO'
  outcome: text("outcome").notNull().default(''), // Outcome of the position
  shares: decimal("shares").notNull(),
  avgPrice: decimal("avg_price").notNull(),
  avgEntryPrice: decimal("avg_entry_price"), // Average entry price
  currentValue: decimal("current_value"),
  pnl: decimal("pnl"),
  pnlPercent: decimal("pnl_percent"),
  unrealizedPnl: decimal("unrealized_pnl"), // Unrealized P&L
  addedAt: timestamp("added_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tracked wallets table
export const trackedWallets = pgTable("tracked_wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  walletAddress: text("wallet_address").notNull(),
  label: text("label"),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

// Telegram connections table
export const telegramConnections = pgTable("telegram_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  telegramChatId: text("telegram_chat_id").unique().notNull(),
  telegramUsername: text("telegram_username"),
  connectedAt: timestamp("connected_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// Telegram alert subscriptions table
export const telegramAlertSubscriptions = pgTable("telegram_alert_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  telegramConnectionId: uuid("telegram_connection_id").references(() => telegramConnections.id).notNull(),
  alertType: text("alert_type").notNull(),
  marketId: text("market_id"),
  threshold: decimal("threshold"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Whale trades table
export const whaleTrades = pgTable("whale_trades", {
  id: uuid("id").primaryKey().defaultRandom(),
  tradeId: text("trade_id").unique().notNull(),
  marketId: text("market_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  side: text("side").notNull(), // 'BUY' or 'SELL'
  outcome: text("outcome").notNull(), // 'YES' or 'NO'
  shares: decimal("shares").notNull(),
  price: decimal("price").notNull(),
  usdValue: decimal("usd_value").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  marketIdIdx: index("whale_trades_market_id_idx").on(table.marketId),
  walletIdx: index("whale_trades_wallet_idx").on(table.walletAddress),
  timestampIdx: index("whale_trades_timestamp_idx").on(table.timestamp),
}));

// Retail signals table
export const retailSignals = pgTable("retail_signals", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: text("market_id").notNull(),
  signalType: text("signal_type").notNull(),
  severity: text("severity").notNull(), // 'INFO', 'WARNING', 'DANGER'
  message: text("message").notNull(),
  label: text("label").notNull().default(''), // Short label for the signal
  isFavorable: boolean("is_favorable").notNull().default(false), // Whether this signal is favorable for traders
  confidence: text("confidence").notNull().default('medium'), // Confidence level (LOW, MEDIUM, HIGH)
  actionable: boolean("actionable").default(false).notNull(),
  metadata: jsonb("metadata"),
  whyBullets: jsonb("why_bullets"), // Array of bullet points explaining the signal
  metrics: jsonb("metrics"), // Additional metrics data
  unit: text("unit"), // Unit of measurement for metrics
  validUntil: timestamp("valid_until"), // When the signal expires
  computedAt: timestamp("computed_at").defaultNow(), // When the signal was computed
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  marketIdIdx: index("retail_signals_market_id_idx").on(table.marketId),
  createdAtIdx: index("retail_signals_created_at_idx").on(table.createdAt),
}));

// Market relations table
export const marketRelations = pgTable("market_relations", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: text("market_id").notNull(),
  relatedMarketId: text("related_market_id").notNull(),
  aMarketId: text("a_market_id"), // First market in relation
  bMarketId: text("b_market_id"), // Second market in relation
  relationType: text("relation_type").notNull(),
  strength: decimal("strength"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Constraint checks table
export const constraintChecks = pgTable("constraint_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: text("market_id").notNull(),
  relationId: text("relation_id"), // Related relation ID
  checkType: text("check_type").notNull(),
  passed: boolean("passed").notNull(),
  label: text("label"), // Label for the check
  score: decimal("score"), // Score for the check
  details: jsonb("details"),
  whyJson: jsonb("why_json"), // JSON explanation
  ts: timestamp("ts"), // Timestamp
  checkedAt: timestamp("checked_at").defaultNow().notNull(),
});

// Wallet flow events table
export const walletFlowEvents = pgTable("wallet_flow_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletAddress: text("wallet_address").notNull(),
  marketId: text("market_id").notNull(),
  eventType: text("event_type").notNull(),
  amount: decimal("amount").notNull(),
  notional: decimal("notional"), // Notional value
  side: text("side"), // BUY or SELL
  startTs: timestamp("start_ts"), // Start timestamp
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  walletIdx: index("wallet_flow_events_wallet_idx").on(table.walletAddress),
  marketIdIdx: index("wallet_flow_events_market_id_idx").on(table.marketId),
}));

// Market behavior dimensions table
export const marketBehaviorDimensions = pgTable("market_behavior_dimensions", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: text("market_id").notNull(),
  volatility: decimal("volatility"),
  momentum: decimal("momentum"),
  sentiment: decimal("sentiment"),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
}, (table) => ({
  marketIdIdx: index("market_behavior_dimensions_market_id_idx").on(table.marketId),
}));

// Retail flow guard table
export const retailFlowGuard = pgTable("retail_flow_guard", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: text("market_id").notNull(),
  riskLevel: text("risk_level").notNull(),
  recommendation: text("recommendation").notNull(),
  reasons: jsonb("reasons"),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
}, (table) => ({
  marketIdIdx: index("retail_flow_guard_market_id_idx").on(table.marketId),
}));

// Market resolution drivers table
export const marketResolutionDrivers = pgTable("market_resolution_drivers", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: text("market_id").notNull(),
  driverType: text("driver_type").notNull(),
  description: text("description").notNull(),
  impact: decimal("impact"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Hidden exposure links table
export const hiddenExposureLinks = pgTable("hidden_exposure_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: text("market_id").notNull(),
  linkedMarketId: text("linked_market_id").notNull(),
  marketAId: text("market_a_id"), // First market
  marketBId: text("market_b_id"), // Second market
  exposureType: text("exposure_type").notNull(),
  exposureLabel: text("exposure_label"), // Label for exposure
  strength: decimal("strength"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Market participation structure table
export const marketParticipationStructure = pgTable("market_participation_structure", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: text("market_id").notNull(),
  whaleCount: integer("whale_count"),
  retailCount: integer("retail_count"),
  whaleVolume: decimal("whale_volume"),
  retailVolume: decimal("retail_volume"),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});

// Outcome patterns table
export const outcomePatterns = pgTable("outcome_patterns", {
  id: uuid("id").primaryKey().defaultRandom(),
  clusterType: text("cluster_type").notNull(),
  patternName: text("pattern_name").notNull(),
  frequencyPercent: decimal("frequency_percent").notNull(),
  description: text("description").notNull(),
  retailImplication: text("retail_implication").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Timing windows table
export const timingWindows = pgTable("timing_windows", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: text("market_id").notNull(),
  windowType: text("window_type").notNull(), // 'DEAD_ZONE', 'DANGER_WINDOW', 'FINAL_POSITIONING', 'OPPORTUNITY_WINDOW'
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  reason: text("reason").notNull(),
  retailGuidance: text("retail_guidance").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  marketIdIdx: index("timing_windows_market_id_idx").on(table.marketId),
}));

// Cross-platform markets table
export const crossPlatformMarkets = pgTable("cross_platform_markets", {
  id: uuid("id").primaryKey().defaultRandom(),
  polymarketId: text("polymarket_id"),
  kalshiId: text("kalshi_id"),
  limitlessId: text("limitless_id"),
  matchConfidence: decimal("match_confidence").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Cross-platform prices table
export const crossPlatformPrices = pgTable("cross_platform_prices", {
  id: uuid("id").primaryKey().defaultRandom(),
  crossPlatformMarketId: uuid("cross_platform_market_id").references(() => crossPlatformMarkets.id).notNull(),
  platform: text("platform").notNull(), // 'polymarket', 'kalshi', 'limitless'
  yesPrice: decimal("yes_price").notNull(),
  noPrice: decimal("no_price").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  marketIdIdx: index("cross_platform_prices_market_id_idx").on(table.crossPlatformMarketId),
  timestampIdx: index("cross_platform_prices_timestamp_idx").on(table.timestamp),
}));

// UMA disputes table
export const umaDisputes = pgTable("uma_disputes", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: text("market_id").notNull(),
  disputeId: text("dispute_id").unique().notNull(),
  proposedOutcome: text("proposed_outcome").notNull(),
  disputeReason: text("dispute_reason").notNull(),
  bondAmount: decimal("bond_amount").notNull(),
  status: text("status").notNull(), // 'PENDING', 'RESOLVED', 'REJECTED'
  votingEndsAt: timestamp("voting_ends_at"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  marketIdIdx: index("uma_disputes_market_id_idx").on(table.marketId),
  statusIdx: index("uma_disputes_status_idx").on(table.status),
}));

// Market quality scores table
export const marketQualityScores = pgTable("market_quality_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: text("market_id").unique().notNull(),
  liquidityScore: decimal("liquidity_score").notNull(),
  volumeScore: decimal("volume_score").notNull(),
  spreadScore: decimal("spread_score").notNull(),
  participationScore: decimal("participation_score").notNull(),
  overallScore: decimal("overall_score").notNull(),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
}, (table) => ({
  marketIdIdx: index("market_quality_scores_market_id_idx").on(table.marketId),
}));

// AI analysis table
export const aiAnalysis = pgTable("ai_analysis", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: text("market_id").notNull(),
  probabilityEstimate: decimal("probability_estimate").notNull(),
  confidence: text("confidence").notNull(), // 'LOW', 'MEDIUM', 'HIGH'
  thesis: text("thesis").notNull(),
  counterThesis: text("counter_thesis").notNull(),
  keyFactors: jsonb("key_factors").notNull(),
  whatCouldGoWrong: jsonb("what_could_go_wrong").notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
}, (table) => ({
  marketIdIdx: index("ai_analysis_market_id_idx").on(table.marketId),
}));

// Leaderboard table
export const leaderboard = pgTable("leaderboard", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletAddress: text("wallet_address").unique().notNull(),
  displayName: text("display_name"),
  totalVolume: decimal("total_volume").notNull(),
  totalPnl: decimal("total_pnl").notNull(),
  winRate: decimal("win_rate").notNull(),
  totalTrades: integer("total_trades").notNull(),
  rank: integer("rank"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  rankIdx: index("leaderboard_rank_idx").on(table.rank),
  volumeIdx: index("leaderboard_volume_idx").on(table.totalVolume),
}));

// Weekly reports table
export const weeklyReports = pgTable("weekly_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
  totalPnl: decimal("total_pnl"),
  realizedPnl: decimal("realized_pnl"), // Realized P&L
  unrealizedPnl: decimal("unrealized_pnl"), // Unrealized P&L
  totalVolume: decimal("total_volume"),
  tradesCount: integer("trades_count"),
  totalTrades: integer("total_trades"), // Total number of trades
  winRate: decimal("win_rate"),
  bestTrade: jsonb("best_trade"),
  worstTrade: jsonb("worst_trade"),
  bestMarketQuestion: text("best_market_question"), // Best performing market
  worstMarketQuestion: text("worst_market_question"), // Worst performing market
  entryTimingScore: decimal("entry_timing_score"), // Entry timing score
  slippagePaid: decimal("slippage_paid"), // Slippage paid
  concentrationScore: decimal("concentration_score"), // Portfolio concentration
  qualityDisciplineScore: decimal("quality_discipline_score"), // Quality discipline
  patternsObserved: jsonb("patterns_observed"), // Observed patterns
  coachingNotes: jsonb("coaching_notes"), // Coaching notes
  insights: jsonb("insights"),
  generatedAt: timestamp("generated_at").defaultNow(), // When report was generated
  viewedAt: timestamp("viewed_at"), // When user viewed the report
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("weekly_reports_user_id_idx").on(table.userId),
  weekStartIdx: index("weekly_reports_week_start_idx").on(table.weekStart),
}));

// Decision reviews table
export const decisionReviews = pgTable("decision_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  marketId: text("market_id").notNull(),
  decision: text("decision").notNull(),
  reasoning: text("reasoning"),
  outcome: text("outcome"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
