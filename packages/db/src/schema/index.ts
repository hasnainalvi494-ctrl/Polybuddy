import { pgTable, text, uuid, timestamp, decimal, boolean, integer, jsonb, index } from "drizzle-orm/pg-core";

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Watchlists table
export const watchlists = pgTable("watchlists", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  marketId: text("market_id").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

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

// Portfolio table
export const portfolio = pgTable("portfolio", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  marketId: text("market_id").notNull(),
  position: text("position").notNull(), // 'YES' or 'NO'
  shares: decimal("shares").notNull(),
  avgPrice: decimal("avg_price").notNull(),
  currentValue: decimal("current_value"),
  pnl: decimal("pnl"),
  pnlPercent: decimal("pnl_percent"),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

// Retail signals table
export const retailSignals = pgTable("retail_signals", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: text("market_id").notNull(),
  signalType: text("signal_type").notNull(),
  severity: text("severity").notNull(), // 'INFO', 'WARNING', 'DANGER'
  message: text("message").notNull(),
  actionable: boolean("actionable").default(false).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  marketIdIdx: index("retail_signals_market_id_idx").on(table.marketId),
  createdAtIdx: index("retail_signals_created_at_idx").on(table.createdAt),
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

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Watchlist = typeof watchlists.$inferSelect;
export type NewWatchlist = typeof watchlists.$inferInsert;
export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
export type Portfolio = typeof portfolio.$inferSelect;
export type NewPortfolio = typeof portfolio.$inferInsert;
export type TelegramConnection = typeof telegramConnections.$inferSelect;
export type NewTelegramConnection = typeof telegramConnections.$inferInsert;
export type TelegramAlertSubscription = typeof telegramAlertSubscriptions.$inferSelect;
export type NewTelegramAlertSubscription = typeof telegramAlertSubscriptions.$inferInsert;
export type WhaleTrade = typeof whaleTrades.$inferSelect;
export type NewWhaleTrade = typeof whaleTrades.$inferInsert;
export type OutcomePattern = typeof outcomePatterns.$inferSelect;
export type NewOutcomePattern = typeof outcomePatterns.$inferInsert;
export type TimingWindow = typeof timingWindows.$inferSelect;
export type NewTimingWindow = typeof timingWindows.$inferInsert;
export type CrossPlatformMarket = typeof crossPlatformMarkets.$inferSelect;
export type NewCrossPlatformMarket = typeof crossPlatformMarkets.$inferInsert;
export type CrossPlatformPrice = typeof crossPlatformPrices.$inferSelect;
export type NewCrossPlatformPrice = typeof crossPlatformPrices.$inferInsert;
export type UmaDispute = typeof umaDisputes.$inferSelect;
export type NewUmaDispute = typeof umaDisputes.$inferInsert;
export type MarketQualityScore = typeof marketQualityScores.$inferSelect;
export type NewMarketQualityScore = typeof marketQualityScores.$inferInsert;
export type AiAnalysis = typeof aiAnalysis.$inferSelect;
export type NewAiAnalysis = typeof aiAnalysis.$inferInsert;
export type RetailSignal = typeof retailSignals.$inferSelect;
export type NewRetailSignal = typeof retailSignals.$inferInsert;
export type Leaderboard = typeof leaderboard.$inferSelect;
export type NewLeaderboard = typeof leaderboard.$inferInsert;
