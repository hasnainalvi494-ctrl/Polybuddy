import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  integer,
  boolean,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Sessions table for cookie-based auth
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Enums
export const marketQualityGrade = pgEnum("market_quality_grade", [
  "A",
  "B",
  "C",
  "D",
  "F",
]);

export const alertType = pgEnum("alert_type", [
  "price_move",
  "volume_spike",
  "liquidity_drop",
  "resolution_approaching",
  // Retail signal alert types
  "favorable_structure",
  "structural_mispricing",
  "crowd_chasing",
  "event_window",
  "retail_friendly",
]);

export const alertStatus = pgEnum("alert_status", [
  "active",
  "triggered",
  "dismissed",
]);

// Market State enums
export const marketStateLabel = pgEnum("market_state_label", [
  "calm_liquid",      // Calm & Liquid
  "thin_slippage",    // Thin — Slippage Risk
  "jumpy",            // Jumpier Than Usual
  "event_driven",     // Event-driven — Expect Gaps
]);

export const stateEventType = pgEnum("state_event_type", [
  "state_change",
  "liquidity_drop",
  "spread_widen",
  "volatility_spike",
]);

export const stateEventSeverity = pgEnum("state_event_severity", [
  "low",
  "medium",
  "high",
]);

// Flow Type enums
export const flowLabelType = pgEnum("flow_label_type", [
  "one_off_spike",        // One-off Spike
  "sustained_accumulation", // Sustained Accumulation
  "crowd_chase",          // Crowd Chase
  "exhaustion_move",      // Exhaustion Move
]);

// Behavior Cluster enum
export const behaviorClusterType = pgEnum("behavior_cluster_type", [
  "scheduled_event",     // Scheduled Event (e.g., elections, earnings)
  "continuous_info",     // Continuous Info (e.g., ongoing geopolitical)
  "binary_catalyst",     // Binary Catalyst (single event resolution)
  "high_volatility",     // High Volatility (jumpy, news-driven)
  "long_duration",       // Long Duration (months away)
  "sports_scheduled",    // Sports/Scheduled (known timing, binary)
]);

// Retail friendliness enum
export const retailFriendlinessType = pgEnum("retail_friendliness_type", [
  "favorable",
  "neutral",
  "unfavorable",
]);

// Retail Flow Guard enum
export const flowGuardLabelType = pgEnum("flow_guard_label_type", [
  "historically_noisy",    // Flow signals unreliable in this market
  "pro_dominant",          // Professional flow dominates - retail disadvantaged
  "retail_actionable",     // Rare: flow signals may benefit retail
]);

// Consistency Check enums
export const relationTypeEnum = pgEnum("relation_type", [
  "calendar_variant",     // Same question, different dates
  "multi_outcome",        // Part of same event
  "inverse",              // Logically opposite
  "correlated",           // Historically correlated
]);

export const consistencyLabel = pgEnum("consistency_label", [
  "looks_consistent",
  "potential_inconsistency_low",
  "potential_inconsistency_medium",
  "potential_inconsistency_high",
]);

// Markets table
export const markets = pgTable("markets", {
  id: uuid("id").primaryKey().defaultRandom(),
  polymarketId: varchar("polymarket_id", { length: 255 }).notNull().unique(),
  question: text("question").notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  endDate: timestamp("end_date", { withTimezone: true }),
  resolved: boolean("resolved").default(false),
  outcome: varchar("outcome", { length: 50 }),
  qualityGrade: marketQualityGrade("quality_grade"),
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
  spreadScore: decimal("spread_score", { precision: 5, scale: 2 }),
  depthScore: decimal("depth_score", { precision: 5, scale: 2 }),
  stalenessScore: decimal("staleness_score", { precision: 5, scale: 2 }),
  volatilityScore: decimal("volatility_score", { precision: 5, scale: 2 }),
  clusterLabel: varchar("cluster_label", { length: 50 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Market snapshots for historical data
export const marketSnapshots = pgTable("market_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id),
  price: decimal("price", { precision: 10, scale: 4 }),
  spread: decimal("spread", { precision: 10, scale: 4 }),
  depth: decimal("depth", { precision: 18, scale: 2 }),
  volume24h: decimal("volume_24h", { precision: 18, scale: 2 }),
  liquidity: decimal("liquidity", { precision: 18, scale: 2 }),
  snapshotAt: timestamp("snapshot_at", { withTimezone: true }).defaultNow(),
});

// Watchlists
export const watchlists = pgTable("watchlists", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const watchlistMarkets = pgTable("watchlist_markets", {
  id: uuid("id").primaryKey().defaultRandom(),
  watchlistId: uuid("watchlist_id")
    .notNull()
    .references(() => watchlists.id, { onDelete: "cascade" }),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
});

// Alerts
export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id),
  type: alertType("type").notNull(),
  condition: jsonb("condition").notNull(),
  status: alertStatus("status").default("active"),
  triggeredAt: timestamp("triggered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Notifications for triggered alerts
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  alertId: uuid("alert_id").references(() => alerts.id, { onDelete: "set null" }),
  marketId: uuid("market_id").references(() => markets.id),
  type: alertType("type").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata"), // Store trigger details
  read: boolean("read").default(false),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Tracked wallets for portfolio
export const trackedWallets = pgTable("tracked_wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  address: varchar("address", { length: 42 }).notNull(),
  label: varchar("label", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Portfolio positions (read-only tracking)
export const portfolioPositions = pgTable("portfolio_positions", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletId: uuid("wallet_id")
    .notNull()
    .references(() => trackedWallets.id, { onDelete: "cascade" }),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id),
  outcome: varchar("outcome", { length: 50 }).notNull(),
  shares: decimal("shares", { precision: 18, scale: 8 }).notNull(),
  avgEntryPrice: decimal("avg_entry_price", { precision: 10, scale: 4 }),
  currentValue: decimal("current_value", { precision: 18, scale: 2 }),
  unrealizedPnl: decimal("unrealized_pnl", { precision: 18, scale: 2 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============================================
// FEATURE A: Market State / Regime Detection
// ============================================

// Rolling market features computed from orderbook + trades
export const marketFeatures = pgTable("market_features", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id),
  ts: timestamp("ts", { withTimezone: true }).notNull(),
  spread: decimal("spread", { precision: 10, scale: 6 }),
  depth: decimal("depth", { precision: 18, scale: 2 }),
  staleness: integer("staleness"), // seconds since last trade
  volProxy: decimal("vol_proxy", { precision: 10, scale: 6 }), // rolling volatility
  impactProxy: decimal("impact_proxy", { precision: 10, scale: 6 }), // price impact estimate
  tradeCount: integer("trade_count"), // trades in window
  volumeUsd: decimal("volume_usd", { precision: 18, scale: 2 }),
});

// Market state periods with labels
export const marketStates = pgTable("market_states", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id),
  startTs: timestamp("start_ts", { withTimezone: true }).notNull(),
  endTs: timestamp("end_ts", { withTimezone: true }),
  stateLabel: marketStateLabel("state_label").notNull(),
  confidence: integer("confidence").notNull(), // 0-100
  whyJson: jsonb("why_json").notNull(), // Array of 3 "why" bullets with numbers
});

// State change events
export const marketStateEvents = pgTable("market_state_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id),
  ts: timestamp("ts", { withTimezone: true }).notNull(),
  eventType: stateEventType("event_type").notNull(),
  severity: stateEventSeverity("severity").notNull(),
  whyJson: jsonb("why_json").notNull(),
});

// ============================================
// FEATURE E: Trade Review (Decision Quality)
// ============================================

export const decisionReviews = pgTable("decision_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletId: uuid("wallet_id")
    .notNull()
    .references(() => trackedWallets.id, { onDelete: "cascade" }),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id),
  tradeTs: timestamp("trade_ts", { withTimezone: true }).notNull(),
  side: varchar("side", { length: 10 }).notNull(), // buy/sell
  notional: decimal("notional", { precision: 18, scale: 2 }),
  score: integer("score").notNull(), // 0-100
  confidence: integer("confidence").notNull(), // 0-100
  label: varchar("label", { length: 50 }).notNull(), // e.g., "good_process", "risky_process"
  whyJson: jsonb("why_json").notNull(), // Array of 3 "why" bullets
  spreadAtEntry: decimal("spread_at_entry", { precision: 10, scale: 6 }),
  depthAtEntry: decimal("depth_at_entry", { precision: 18, scale: 2 }),
  priceChange15m: decimal("price_change_15m", { precision: 10, scale: 6 }),
  marketStateAtEntry: marketStateLabel("market_state_at_entry"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ============================================
// FEATURE D: Hidden Exposure (Portfolio Clustering)
// ============================================

export const exposureClusters = pgTable("exposure_clusters", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletId: uuid("wallet_id")
    .notNull()
    .references(() => trackedWallets.id, { onDelete: "cascade" }),
  clusterId: varchar("cluster_id", { length: 100 }).notNull(), // e.g., "politics_us_2024"
  ts: timestamp("ts", { withTimezone: true }).notNull(),
  exposurePct: decimal("exposure_pct", { precision: 5, scale: 2 }).notNull(),
  label: varchar("label", { length: 100 }).notNull(), // Human-readable cluster name
  confidence: integer("confidence").notNull(),
  whyJson: jsonb("why_json").notNull(),
});

export const exposureClusterMembers = pgTable("exposure_cluster_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  clusterId: uuid("cluster_id")
    .notNull()
    .references(() => exposureClusters.id, { onDelete: "cascade" }),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id),
  weight: decimal("weight", { precision: 5, scale: 4 }), // Contribution to cluster
  exposure: decimal("exposure", { precision: 18, scale: 2 }), // $ exposure in this market
});

// ============================================
// FEATURE C: Consistency Check (Cross-Market Constraints)
// ============================================

export const marketRelations = pgTable("market_relations", {
  id: uuid("id").primaryKey().defaultRandom(),
  aMarketId: uuid("a_market_id")
    .notNull()
    .references(() => markets.id),
  bMarketId: uuid("b_market_id")
    .notNull()
    .references(() => markets.id),
  relationType: relationTypeEnum("relation_type").notNull(),
  relationMeta: jsonb("relation_meta"), // Additional context
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const constraintChecks = pgTable("constraint_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  relationId: uuid("relation_id")
    .notNull()
    .references(() => marketRelations.id, { onDelete: "cascade" }),
  ts: timestamp("ts", { withTimezone: true }).notNull(),
  score: integer("score").notNull(), // 0-100, higher = more consistent
  confidence: integer("confidence").notNull(),
  label: consistencyLabel("label").notNull(),
  whyJson: jsonb("why_json").notNull(),
});

// ============================================
// FEATURE B: Flow Type (Flow Persistence vs Noise)
// ============================================

export const walletFlowEvents = pgTable("wallet_flow_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id),
  startTs: timestamp("start_ts", { withTimezone: true }).notNull(),
  endTs: timestamp("end_ts", { withTimezone: true }),
  notional: decimal("notional", { precision: 18, scale: 2 }).notNull(),
  tradeCount: integer("trade_count").notNull(),
  side: varchar("side", { length: 10 }).notNull(), // net direction
  meta: jsonb("meta"), // Additional flow metadata
});

export const flowLabels = pgTable("flow_labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  flowEventId: uuid("flow_event_id")
    .notNull()
    .references(() => walletFlowEvents.id, { onDelete: "cascade" }),
  label: flowLabelType("label").notNull(),
  score: integer("score").notNull(), // 0-100
  confidence: integer("confidence").notNull(),
  whyJson: jsonb("why_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  watchlists: many(watchlists),
  alerts: many(alerts),
  trackedWallets: many(trackedWallets),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const marketsRelations = relations(markets, ({ many }) => ({
  snapshots: many(marketSnapshots),
  watchlistMarkets: many(watchlistMarkets),
  alerts: many(alerts),
  positions: many(portfolioPositions),
  features: many(marketFeatures),
  states: many(marketStates),
  stateEvents: many(marketStateEvents),
  decisionReviews: many(decisionReviews),
  flowEvents: many(walletFlowEvents),
}));

export const marketSnapshotsRelations = relations(
  marketSnapshots,
  ({ one }) => ({
    market: one(markets, {
      fields: [marketSnapshots.marketId],
      references: [markets.id],
    }),
  })
);

export const watchlistsRelations = relations(watchlists, ({ many }) => ({
  markets: many(watchlistMarkets),
}));

export const watchlistMarketsRelations = relations(
  watchlistMarkets,
  ({ one }) => ({
    watchlist: one(watchlists, {
      fields: [watchlistMarkets.watchlistId],
      references: [watchlists.id],
    }),
    market: one(markets, {
      fields: [watchlistMarkets.marketId],
      references: [markets.id],
    }),
  })
);

export const alertsRelations = relations(alerts, ({ one, many }) => ({
  market: one(markets, {
    fields: [alerts.marketId],
    references: [markets.id],
  }),
  notifications: many(notifications),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  alert: one(alerts, {
    fields: [notifications.alertId],
    references: [alerts.id],
  }),
  market: one(markets, {
    fields: [notifications.marketId],
    references: [markets.id],
  }),
}));

export const trackedWalletsRelations = relations(trackedWallets, ({ many }) => ({
  positions: many(portfolioPositions),
  decisionReviews: many(decisionReviews),
  exposureClusters: many(exposureClusters),
}));

export const portfolioPositionsRelations = relations(
  portfolioPositions,
  ({ one }) => ({
    wallet: one(trackedWallets, {
      fields: [portfolioPositions.walletId],
      references: [trackedWallets.id],
    }),
    market: one(markets, {
      fields: [portfolioPositions.marketId],
      references: [markets.id],
    }),
  })
);

// ============================================
// New Feature Relations
// ============================================

export const marketFeaturesRelations = relations(marketFeatures, ({ one }) => ({
  market: one(markets, {
    fields: [marketFeatures.marketId],
    references: [markets.id],
  }),
}));

export const marketStatesRelations = relations(marketStates, ({ one }) => ({
  market: one(markets, {
    fields: [marketStates.marketId],
    references: [markets.id],
  }),
}));

export const marketStateEventsRelations = relations(marketStateEvents, ({ one }) => ({
  market: one(markets, {
    fields: [marketStateEvents.marketId],
    references: [markets.id],
  }),
}));

export const decisionReviewsRelations = relations(decisionReviews, ({ one }) => ({
  wallet: one(trackedWallets, {
    fields: [decisionReviews.walletId],
    references: [trackedWallets.id],
  }),
  market: one(markets, {
    fields: [decisionReviews.marketId],
    references: [markets.id],
  }),
}));

export const exposureClustersRelations = relations(exposureClusters, ({ one, many }) => ({
  wallet: one(trackedWallets, {
    fields: [exposureClusters.walletId],
    references: [trackedWallets.id],
  }),
  members: many(exposureClusterMembers),
}));

export const exposureClusterMembersRelations = relations(exposureClusterMembers, ({ one }) => ({
  cluster: one(exposureClusters, {
    fields: [exposureClusterMembers.clusterId],
    references: [exposureClusters.id],
  }),
  market: one(markets, {
    fields: [exposureClusterMembers.marketId],
    references: [markets.id],
  }),
}));

export const marketRelationsRelations = relations(marketRelations, ({ one, many }) => ({
  marketA: one(markets, {
    fields: [marketRelations.aMarketId],
    references: [markets.id],
  }),
  marketB: one(markets, {
    fields: [marketRelations.bMarketId],
    references: [markets.id],
  }),
  checks: many(constraintChecks),
}));

export const constraintChecksRelations = relations(constraintChecks, ({ one }) => ({
  relation: one(marketRelations, {
    fields: [constraintChecks.relationId],
    references: [marketRelations.id],
  }),
}));

export const walletFlowEventsRelations = relations(walletFlowEvents, ({ one, many }) => ({
  market: one(markets, {
    fields: [walletFlowEvents.marketId],
    references: [markets.id],
  }),
  labels: many(flowLabels),
}));

export const flowLabelsRelations = relations(flowLabels, ({ one }) => ({
  flowEvent: one(walletFlowEvents, {
    fields: [flowLabels.flowEventId],
    references: [walletFlowEvents.id],
  }),
}));

// ============================================
// FEATURE: Behavior-Based Market Clustering
// ============================================

export const marketBehaviorDimensions = pgTable("market_behavior_dimensions", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id)
    .unique(),
  // 5 dimensions (0-100 scale)
  infoCadence: integer("info_cadence"), // How often new info arrives (0=rare, 100=constant)
  infoStructure: integer("info_structure"), // Structured vs unstructured (0=unstructured, 100=scheduled)
  liquidityStability: integer("liquidity_stability"), // How stable is liquidity (0=volatile, 100=stable)
  timeToResolution: integer("time_to_resolution"), // 0=minutes, 100=months+
  participantConcentration: integer("participant_concentration"), // 0=distributed, 100=concentrated
  // Cluster assignment
  behaviorCluster: behaviorClusterType("behavior_cluster"),
  clusterConfidence: integer("cluster_confidence"), // 0-100
  clusterExplanation: text("cluster_explanation"),
  // Retail interpretation
  retailFriendliness: retailFriendlinessType("retail_friendliness"),
  commonRetailMistake: text("common_retail_mistake"),
  whyRetailLosesHere: text("why_retail_loses_here"),
  whenRetailCanCompete: text("when_retail_can_compete"),
  // Timestamps
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const marketBehaviorDimensionsRelations = relations(marketBehaviorDimensions, ({ one }) => ({
  market: one(markets, {
    fields: [marketBehaviorDimensions.marketId],
    references: [markets.id],
  }),
}));

// ============================================
// FEATURE: Weekly Coaching Reports
// ============================================

export const weeklyReports = pgTable("weekly_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  weekStart: timestamp("week_start", { withTimezone: true }).notNull(),
  weekEnd: timestamp("week_end", { withTimezone: true }).notNull(),
  // P&L Summary
  realizedPnl: decimal("realized_pnl", { precision: 18, scale: 2 }),
  unrealizedPnl: decimal("unrealized_pnl", { precision: 18, scale: 2 }),
  totalTrades: integer("total_trades").default(0),
  winRate: decimal("win_rate", { precision: 5, scale: 2 }),
  // Best/Worst
  bestDecisionId: uuid("best_decision_id"),
  worstDecisionId: uuid("worst_decision_id"),
  bestMarketQuestion: text("best_market_question"),
  worstMarketQuestion: text("worst_market_question"),
  // Process Metrics (0-100)
  entryTimingScore: integer("entry_timing_score"),
  slippagePaid: decimal("slippage_paid", { precision: 18, scale: 2 }),
  concentrationScore: integer("concentration_score"),
  qualityDisciplineScore: integer("quality_discipline_score"),
  // Patterns & Coaching
  patternsObserved: jsonb("patterns_observed"), // Array of pattern strings
  coachingNotes: jsonb("coaching_notes"), // Array of coaching notes
  // Metadata
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow(),
  viewedAt: timestamp("viewed_at", { withTimezone: true }),
});

export const weeklyReportsRelations = relations(weeklyReports, ({ one }) => ({
  user: one(users, {
    fields: [weeklyReports.userId],
    references: [users.id],
  }),
}));

// ============================================
// FEATURE: Retail Signal System
// ============================================

export const retailSignalType = pgEnum("retail_signal_type", [
  "favorable_structure",      // Low friction market structure
  "structural_mispricing",    // Odds stretched vs related markets
  "crowd_chasing",            // FOMO/late entry risk
  "event_window",             // Information window approaching
  "retail_friendliness",      // Retail-friendly vs unfriendly structure
]);

export const signalConfidence = pgEnum("signal_confidence", [
  "low",
  "medium",
  "high",
]);

export const retailSignals = pgTable("retail_signals", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id),
  signalType: retailSignalType("signal_type").notNull(),
  // Label is the human-readable signal output
  label: varchar("label", { length: 200 }).notNull(),
  // Whether this is favorable or unfavorable for retail
  isFavorable: boolean("is_favorable").notNull(),
  confidence: signalConfidence("confidence").notNull(),
  // 3 "Why" bullets with numbers (stored as JSON array)
  whyBullets: jsonb("why_bullets").notNull(), // [{text, metric, value, unit}]
  // Raw metrics used to compute signal
  metrics: jsonb("metrics"), // Signal-specific metrics
  // Validity
  validFrom: timestamp("valid_from", { withTimezone: true }).defaultNow(),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  // Timestamps
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow(),
});

export const retailSignalsRelations = relations(retailSignals, ({ one }) => ({
  market: one(markets, {
    fields: [retailSignals.marketId],
    references: [markets.id],
  }),
}));

// Signal subscriptions for users
export const signalSubscriptions = pgTable("signal_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  signalType: retailSignalType("signal_type").notNull(),
  enabled: boolean("enabled").default(true),
  // Region opt-in required
  regionOptIn: boolean("region_opt_in").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const signalSubscriptionsRelations = relations(signalSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [signalSubscriptions.userId],
    references: [users.id],
  }),
}));

// ============================================
// FEATURE: Retail Flow Guard
// ============================================

export const retailFlowGuard = pgTable("retail_flow_guard", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id)
    .unique(),
  // Flow Guard Label
  label: flowGuardLabelType("label").notNull(),
  confidence: signalConfidence("confidence").notNull(),
  // Explanation bullets
  whyBullets: jsonb("why_bullets").notNull(), // [{text, metric, value, unit}]
  // Common retail mistake for this flow type
  commonRetailMistake: text("common_retail_mistake").notNull(),
  // Flow metrics used for classification
  largeEarlyTradesPct: decimal("large_early_trades_pct", { precision: 5, scale: 2 }),
  orderBookConcentration: decimal("order_book_concentration", { precision: 5, scale: 2 }),
  depthShiftSpeed: decimal("depth_shift_speed", { precision: 10, scale: 4 }),
  repricingSpeed: decimal("repricing_speed", { precision: 10, scale: 4 }),
  // Timestamps
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const retailFlowGuardRelations = relations(retailFlowGuard, ({ one }) => ({
  market: one(markets, {
    fields: [retailFlowGuard.marketId],
    references: [markets.id],
  }),
}));

// ============================================
// FEATURE: Hidden Exposure Detector
// ============================================

// Exposure link label enum
export const exposureLinkLabel = pgEnum("exposure_link_label", [
  "independent",        // Outcomes largely unrelated
  "partially_linked",   // Some shared drivers
  "highly_linked",      // Effectively the same bet
]);

// Market resolution drivers - what determines the outcome
export const marketResolutionDrivers = pgTable("market_resolution_drivers", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id)
    .unique(),
  // Underlying asset or subject (e.g., BTC, ETH, Trump, Fed)
  underlyingAsset: varchar("underlying_asset", { length: 100 }),
  // Resolution source (exchange, oracle, news outlet)
  resolutionSource: varchar("resolution_source", { length: 200 }),
  // Resolution window start/end for time overlap detection
  resolutionWindowStart: timestamp("resolution_window_start", { withTimezone: true }),
  resolutionWindowEnd: timestamp("resolution_window_end", { withTimezone: true }),
  // Narrative dependency - the event or story this depends on
  narrativeDependency: varchar("narrative_dependency", { length: 200 }),
  // Asset category for grouping
  assetCategory: varchar("asset_category", { length: 50 }),
  // Timestamps
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow(),
});

export const marketResolutionDriversRelations = relations(marketResolutionDrivers, ({ one }) => ({
  market: one(markets, {
    fields: [marketResolutionDrivers.marketId],
    references: [markets.id],
  }),
}));

// Hidden exposure links between markets
export const hiddenExposureLinks = pgTable("hidden_exposure_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketAId: uuid("market_a_id")
    .notNull()
    .references(() => markets.id),
  marketBId: uuid("market_b_id")
    .notNull()
    .references(() => markets.id),
  // Exposure classification
  exposureLabel: exposureLinkLabel("exposure_label").notNull(),
  // Plain English explanation
  explanation: text("explanation").notNull(),
  // Example outcome showing how they're linked
  exampleOutcome: text("example_outcome").notNull(),
  // What mistake this warning prevents
  mistakePrevented: text("mistake_prevented").notNull(),
  // Shared driver type (asset, time, narrative)
  sharedDriverType: varchar("shared_driver_type", { length: 50 }).notNull(),
  // Timestamps
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow(),
});

export const hiddenExposureLinksRelations = relations(hiddenExposureLinks, ({ one }) => ({
  marketA: one(markets, {
    fields: [hiddenExposureLinks.marketAId],
    references: [markets.id],
  }),
  marketB: one(markets, {
    fields: [hiddenExposureLinks.marketBId],
    references: [markets.id],
  }),
}));

// Portfolio hidden exposure warnings for users
export const portfolioExposureWarnings = pgTable("portfolio_exposure_warnings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  walletId: uuid("wallet_id")
    .notNull()
    .references(() => trackedWallets.id, { onDelete: "cascade" }),
  // Markets involved in the exposure
  marketIds: jsonb("market_ids").notNull(), // Array of market IDs
  // Warning details
  exposureLabel: exposureLinkLabel("exposure_label").notNull(),
  warningTitle: varchar("warning_title", { length: 200 }).notNull(),
  explanation: text("explanation").notNull(),
  exampleOutcome: text("example_outcome").notNull(),
  mistakePrevented: text("mistake_prevented").notNull(),
  // Is this warning dismissed by user?
  dismissed: boolean("dismissed").default(false),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  // Timestamps
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow(),
});

export const portfolioExposureWarningsRelations = relations(portfolioExposureWarnings, ({ one }) => ({
  user: one(users, {
    fields: [portfolioExposureWarnings.userId],
    references: [users.id],
  }),
  wallet: one(trackedWallets, {
    fields: [portfolioExposureWarnings.walletId],
    references: [trackedWallets.id],
  }),
}));

// ============================================
// FEATURE: Market Participation Structure
// ============================================

// Setup Quality Band enum
export const setupQualityBand = pgEnum("setup_quality_band", [
  "historically_favorable",    // 80-100: Markets with this structure historically behaved well
  "mixed_workable",           // 60-79: Mixed but workable structure
  "neutral",                  // 40-59: Neutral structure
  "historically_unforgiving", // <40: Historically unforgiving structure
]);

// Participant Quality Band enum
export const participantQualityBand = pgEnum("participant_quality_band", [
  "strong",    // Many experienced participants
  "moderate",  // Some experienced participants
  "limited",   // Few experienced participants
]);

// Participation Summary enum
export const participationSummary = pgEnum("participation_summary", [
  "few_dominant",        // Few dominant participants
  "mixed_participation", // Mixed participation
  "broad_retail",        // Broad retail participation
]);

// Market Participation Structure - stores per-side analysis
export const marketParticipationStructure = pgTable("market_participation_structure", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id),
  side: varchar("side", { length: 3 }).notNull(), // "YES" or "NO"
  // Note: Unique constraint on (marketId, side) is handled by database index

  // Setup Quality Score (0-100)
  // Represents how markets with similar structure historically behaved
  // Based on participation asymmetry, concentration, liquidity stability, repricing timing
  // NOT a win probability
  setupQualityScore: integer("setup_quality_score").notNull(),
  setupQualityBand: setupQualityBand("setup_quality_band").notNull(),

  // Participant Quality Score (0-100)
  // Represents presence of experienced participants on that side
  // Experienced = wallets with positive historical performance in similar markets
  participantQualityScore: integer("participant_quality_score").notNull(),
  participantQualityBand: participantQualityBand("participant_quality_band").notNull(),

  // Participation Summary
  participationSummary: participationSummary("participation_summary").notNull(),

  // Participation Breakdown (percentages for stacked bar chart)
  // These are approximate ranges, not exact values (guardrail compliance)
  largePct: integer("large_pct").notNull(), // Percentage of few large participants
  midPct: integer("mid_pct").notNull(),     // Percentage of mid-sized participants
  smallPct: integer("small_pct").notNull(), // Percentage of many small participants

  // Behavior insights (plain English, no predictions)
  behaviorInsight: text("behavior_insight").notNull(), // e.g., "Markets with concentrated participation often reprice quickly"

  // Timestamps
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const marketParticipationStructureRelations = relations(marketParticipationStructure, ({ one }) => ({
  market: one(markets, {
    fields: [marketParticipationStructure.marketId],
    references: [markets.id],
  }),
}));

// ============================================
// FEATURE: Trader Tracking & Leaderboard
// ============================================

// Wallet performance tracking for leaderboard
export const walletPerformance = pgTable("wallet_performance", {
  walletAddress: text("wallet_address").primaryKey(),
  totalProfit: decimal("total_profit", { precision: 18, scale: 2 }),
  totalVolume: decimal("total_volume", { precision: 18, scale: 2 }),
  winRate: decimal("win_rate", { precision: 5, scale: 2 }),
  tradeCount: integer("trade_count").default(0),
  roiPercent: decimal("roi_percent", { precision: 10, scale: 2 }),
  primaryCategory: text("primary_category"),
  lastTradeAt: timestamp("last_trade_at", { withTimezone: true }),
  rank: integer("rank"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  
  // User Profile Fields (from Polymarket leaderboard)
  userName: text("user_name"),
  xUsername: text("x_username"), // Twitter/X handle
  profileImage: text("profile_image"),
  verifiedBadge: boolean("verified_badge").default(false),
  
  // Elite Trader Scoring Columns
  eliteScore: decimal("elite_score", { precision: 5, scale: 2 }),
  traderTier: text("trader_tier"), // 'elite' | 'strong' | 'moderate' | 'developing' | 'limited'
  riskProfile: text("risk_profile"), // 'conservative' | 'moderate' | 'aggressive'
  
  // Advanced Performance Metrics
  profitFactor: decimal("profit_factor", { precision: 10, scale: 4 }),
  sharpeRatio: decimal("sharpe_ratio", { precision: 10, scale: 4 }),
  maxDrawdown: decimal("max_drawdown", { precision: 5, scale: 2 }),
  grossProfit: decimal("gross_profit", { precision: 18, scale: 2 }),
  grossLoss: decimal("gross_loss", { precision: 18, scale: 2 }),
  
  // Consistency Metrics
  consecutiveWins: integer("consecutive_wins").default(0),
  consecutiveLosses: integer("consecutive_losses").default(0),
  longestWinStreak: integer("longest_win_streak").default(0),
  longestLossStreak: integer("longest_loss_streak").default(0),
  avgHoldingTimeHours: decimal("avg_holding_time_hours", { precision: 10, scale: 2 }),
  marketTimingScore: decimal("market_timing_score", { precision: 5, scale: 2 }),
  
  // Specialization
  secondaryCategory: text("secondary_category"),
  categorySpecialization: jsonb("category_specialization"),
  
  // Elite Ranking
  eliteRank: integer("elite_rank"),
  scoredAt: timestamp("scored_at", { withTimezone: true }),
});

// Individual trades for wallet tracking
export const walletTrades = pgTable("wallet_trades", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletAddress: text("wallet_address").notNull(),
  marketId: text("market_id").notNull(),
  side: text("side").notNull(), // 'buy' or 'sell'
  outcome: text("outcome").notNull(), // 'yes' or 'no'
  entryPrice: decimal("entry_price", { precision: 10, scale: 4 }),
  exitPrice: decimal("exit_price", { precision: 10, scale: 4 }),
  size: decimal("size", { precision: 18, scale: 8 }),
  profit: decimal("profit", { precision: 18, scale: 2 }),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  txHash: text("tx_hash"),
});

// Whale activity feed
export const whaleActivity = pgTable("whale_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletAddress: text("wallet_address").notNull(),
  marketId: text("market_id").notNull(),
  action: text("action").notNull(), // 'buy' or 'sell'
  outcome: text("outcome").notNull(), // 'yes' or 'no'
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }).notNull(),
  price: decimal("price", { precision: 10, scale: 4 }),
  priceBefore: decimal("price_before", { precision: 10, scale: 4 }),
  priceAfter: decimal("price_after", { precision: 10, scale: 4 }),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
});

// ============================================
// FEATURE: Best Bet Signals
// ============================================

// Signal strength enum
export const signalStrengthEnum = pgEnum("signal_strength", [
  "elite",
  "strong",
  "moderate",
  "weak",
]);

// Best bet signal status enum
export const bestBetStatusEnum = pgEnum("best_bet_status", [
  "active",
  "executed",
  "expired",
  "cancelled",
]);

// Best bet signals table - AI-generated trading signals from elite traders
export const bestBetSignals = pgTable("best_bet_signals", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: uuid("market_id").notNull().references(() => markets.id),
  traderAddress: text("trader_address").notNull(),
  
  // Signal Metadata
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(),
  signalStrength: text("signal_strength").notNull(), // 'elite' | 'strong' | 'moderate' | 'weak'
  
  // Trading Parameters
  entryPrice: decimal("entry_price", { precision: 10, scale: 4 }).notNull(),
  targetPrice: decimal("target_price", { precision: 10, scale: 4 }),
  stopLoss: decimal("stop_loss", { precision: 10, scale: 4 }),
  positionSize: decimal("position_size", { precision: 18, scale: 2 }),
  
  // Risk Management
  riskRewardRatio: decimal("risk_reward_ratio", { precision: 10, scale: 2 }),
  kellyCriterion: decimal("kelly_criterion", { precision: 5, scale: 4 }),
  maxPositionSize: decimal("max_position_size", { precision: 18, scale: 2 }),
  
  // Trader Metrics (snapshot at signal time)
  traderWinRate: decimal("trader_win_rate", { precision: 5, scale: 2 }),
  traderProfitHistory: decimal("trader_profit_history", { precision: 18, scale: 2 }),
  traderEliteScore: decimal("trader_elite_score", { precision: 5, scale: 2 }),
  traderSharpeRatio: decimal("trader_sharpe_ratio", { precision: 10, scale: 4 }),
  
  // Signal Details
  reasoning: jsonb("reasoning"), // Array of reasoning strings
  timeHorizon: text("time_horizon"),
  outcome: text("outcome"), // 'yes' | 'no'
  
  // Metadata
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  status: text("status").default("active"), // 'active' | 'executed' | 'expired' | 'cancelled'
  
  // Performance Tracking
  actualOutcome: text("actual_outcome"),
  actualProfit: decimal("actual_profit", { precision: 18, scale: 2 }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Relations for best bet signals
export const bestBetSignalsRelations = relations(bestBetSignals, ({ one }) => ({
  market: one(markets, {
    fields: [bestBetSignals.marketId],
    references: [markets.id],
  }),
}));

// Relations for trader tracking
export const walletPerformanceRelations = relations(walletPerformance, ({ many }) => ({
  trades: many(walletTrades),
  whaleActivities: many(whaleActivity),
}));

export const walletTradesRelations = relations(walletTrades, ({ one }) => ({
  performance: one(walletPerformance, {
    fields: [walletTrades.walletAddress],
    references: [walletPerformance.walletAddress],
  }),
}));

export const whaleActivityRelations = relations(whaleActivity, ({ one }) => ({
  performance: one(walletPerformance, {
    fields: [whaleActivity.walletAddress],
    references: [walletPerformance.walletAddress],
  }),
}));

// ============================================
// FEATURE: UMA Dispute Tracking
// ============================================

// UMA Dispute Status enum
export const umaDisputeStatus = pgEnum("uma_dispute_status", [
  "commit_stage",
  "reveal_stage",
  "resolved",
]);

// Active UMA disputes
export const umaDisputes = pgTable("uma_disputes", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id),
  disputeStatus: umaDisputeStatus("dispute_status").notNull(),
  proposedOutcome: text("proposed_outcome"),
  disputedOutcome: text("disputed_outcome"),
  totalVotes: integer("total_votes").default(0),
  yesVotes: integer("yes_votes").default(0),
  noVotes: integer("no_votes").default(0),
  votingEndsAt: timestamp("voting_ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Historical record of dispute resolutions
export const umaDisputeHistory = pgTable("uma_dispute_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id),
  resolutionFlipped: boolean("resolution_flipped").notNull(),
  originalOutcome: text("original_outcome"),
  finalOutcome: text("final_outcome"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }).defaultNow(),
});

// Relations for UMA disputes
export const umaDisputesRelations = relations(umaDisputes, ({ one }) => ({
  market: one(markets, {
    fields: [umaDisputes.marketId],
    references: [markets.id],
  }),
}));

// ============================================
// FEATURE: Telegram Alert Bot
// ============================================

// Telegram connections for users
export const telegramConnections = pgTable("telegram_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  telegramChatId: text("telegram_chat_id").notNull().unique(),
  telegramUsername: text("telegram_username"),
  connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow(),
  isActive: boolean("is_active").default(true),
});

// Alert subscriptions via Telegram
export const telegramAlertSubscriptions = pgTable("telegram_alert_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  telegramConnectionId: uuid("telegram_connection_id")
    .notNull()
    .references(() => telegramConnections.id, { onDelete: "cascade" }),
  alertType: text("alert_type").notNull(),
  marketId: text("market_id"),
  threshold: decimal("threshold", { precision: 10, scale: 4 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Relations for Telegram
export const telegramConnectionsRelations = relations(telegramConnections, ({ one, many }) => ({
  user: one(users, {
    fields: [telegramConnections.userId],
    references: [users.id],
  }),
  subscriptions: many(telegramAlertSubscriptions),
}));

export const telegramAlertSubscriptionsRelations = relations(telegramAlertSubscriptions, ({ one }) => ({
  connection: one(telegramConnections, {
    fields: [telegramAlertSubscriptions.telegramConnectionId],
    references: [telegramConnections.id],
  }),
}));

// ============================================
// FEATURE: Outcome Path Analysis
// ============================================

// Historical outcome patterns for different market types
export const outcomePatterns = pgTable("outcome_patterns", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  clusterType: text("cluster_type").notNull(),
  patternName: text("pattern_name").notNull(),
  frequencyPercent: decimal("frequency_percent", { precision: 5, scale: 2 }).notNull(),
  description: text("description").notNull(),
  retailImplication: text("retail_implication").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ============================================
// FEATURE: Timing Windows
// ============================================

// Window type enum
export const timingWindowType = pgEnum("timing_window_type", [
  "dead_zone",
  "danger_window",
  "final_positioning",
  "opportunity_window",
]);

// Timing windows for market entry/exit guidance
export const timingWindows = pgTable("timing_windows", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  marketId: text("market_id").notNull(),
  windowType: text("window_type").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  reason: text("reason").notNull(),
  retailGuidance: text("retail_guidance").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ============================================
// FEATURE: Cross-Platform Price Comparison
// ============================================

// Cross-platform market mappings
export const crossPlatformMarkets = pgTable("cross_platform_markets", {
  id: uuid("id").primaryKey().defaultRandom(),
  polymarketId: text("polymarket_id"),
  kalshiId: text("kalshi_id"),
  limitlessId: text("limitless_id"),
  matchConfidence: decimal("match_confidence", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Platform enum
export const platformType = pgEnum("platform_type", ["polymarket", "kalshi", "limitless"]);

// Cross-platform prices
export const crossPlatformPrices = pgTable("cross_platform_prices", {
  id: uuid("id").primaryKey().defaultRandom(),
  crossPlatformMarketId: uuid("cross_platform_market_id")
    .notNull()
    .references(() => crossPlatformMarkets.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  yesPrice: decimal("yes_price", { precision: 10, scale: 4 }),
  noPrice: decimal("no_price", { precision: 10, scale: 4 }),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
});

// Relations
export const crossPlatformMarketsRelations = relations(crossPlatformMarkets, ({ many }) => ({
  prices: many(crossPlatformPrices),
}));

export const crossPlatformPricesRelations = relations(crossPlatformPrices, ({ one }) => ({
  market: one(crossPlatformMarkets, {
    fields: [crossPlatformPrices.crossPlatformMarketId],
    references: [crossPlatformMarkets.id],
  }),
}));

// ============================================
// FEATURE: AI Pattern Recognition System
// ============================================

// Pattern type enum
export const patternTypeEnum = pgEnum("pattern_type", [
  "momentum",
  "reversal", 
  "breakout",
  "consolidation",
  "accumulation",
  "distribution",
  "elite_follow",
  "whale_accumulation",
]);

// Trading patterns discovered by AI analysis
export const tradingPatterns = pgTable("trading_patterns", {
  id: uuid("id").primaryKey().defaultRandom(),
  patternType: patternTypeEnum("pattern_type").notNull(),
  patternName: varchar("pattern_name", { length: 200 }).notNull(),
  patternSignature: jsonb("pattern_signature"), // Unique pattern characteristics
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }).notNull(),
  
  // Entry/Exit conditions
  entryPriceRange: jsonb("entry_price_range"), // {min, max, optimal}
  positionSizeRange: jsonb("position_size_range"), // {min, max, avg}
  holdingPeriodHours: jsonb("holding_period_hours"), // {min, max, avg}
  exitConditions: jsonb("exit_conditions"), // Array of exit triggers
  
  // Performance metrics
  occurrences: integer("occurrences").default(0),
  successfulOutcomes: integer("successful_outcomes").default(0),
  failedOutcomes: integer("failed_outcomes").default(0),
  winRate: decimal("win_rate", { precision: 5, scale: 2 }).default("0"),
  avgRoi: decimal("avg_roi", { precision: 10, scale: 2 }).default("0"),
  sharpeRatio: decimal("sharpe_ratio", { precision: 10, scale: 4 }).default("0"),
  
  // Market context
  marketCategory: varchar("market_category", { length: 100 }),
  marketPhase: varchar("market_phase", { length: 50 }), // early, mid, late
  volatilityRange: jsonb("volatility_range"), // {min, max}
  
  // Elite trader association
  eliteTradersUsing: integer("elite_traders_using").default(0),
  avgTraderEliteScore: decimal("avg_trader_elite_score", { precision: 5, scale: 2 }),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  lastOccurrenceAt: timestamp("last_occurrence_at", { withTimezone: true }),
});

// Pattern match records - when patterns are detected
export const patternMatches = pgTable("pattern_matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  patternId: uuid("pattern_id")
    .notNull()
    .references(() => tradingPatterns.id, { onDelete: "cascade" }),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id),
  traderAddress: varchar("trader_address", { length: 42 }),
  
  // Match details
  matchScore: decimal("match_score", { precision: 5, scale: 2 }).notNull(),
  matchedFeatures: jsonb("matched_features"), // Array of matched features
  
  // Trade details
  entryPrice: decimal("entry_price", { precision: 10, scale: 4 }),
  exitPrice: decimal("exit_price", { precision: 10, scale: 4 }),
  positionSize: decimal("position_size", { precision: 18, scale: 2 }),
  
  // Outcome tracking
  actualOutcome: varchar("actual_outcome", { length: 10 }), // win, loss, pending
  actualRoi: decimal("actual_roi", { precision: 10, scale: 2 }),
  
  // Timestamps
  matchedAt: timestamp("matched_at", { withTimezone: true }).defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

// Trader behavior clusters - grouping traders by behavior
export const traderBehaviorClusters = pgTable("trader_behavior_clusters", {
  id: uuid("id").primaryKey().defaultRandom(),
  clusterName: varchar("cluster_name", { length: 200 }).notNull(),
  clusterType: varchar("cluster_type", { length: 100 }).notNull(), // aggressive, conservative, momentum, contrarian
  
  // Behavior characteristics
  avgPositionSize: decimal("avg_position_size", { precision: 18, scale: 2 }),
  avgHoldingHours: decimal("avg_holding_hours", { precision: 10, scale: 2 }),
  avgWinRate: decimal("avg_win_rate", { precision: 5, scale: 2 }),
  avgRoi: decimal("avg_roi", { precision: 10, scale: 2 }),
  
  // Trading style
  entryPattern: jsonb("entry_pattern"), // Common entry behaviors
  exitPattern: jsonb("exit_pattern"), // Common exit behaviors
  riskProfile: varchar("risk_profile", { length: 50 }), // low, medium, high
  
  // Cluster stats
  traderCount: integer("trader_count").default(0),
  eliteTraderPercentage: decimal("elite_trader_percentage", { precision: 5, scale: 2 }),
  
  // Performance
  clusterWinRate: decimal("cluster_win_rate", { precision: 5, scale: 2 }),
  clusterAvgRoi: decimal("cluster_avg_roi", { precision: 10, scale: 2 }),
  clusterSharpeRatio: decimal("cluster_sharpe_ratio", { precision: 10, scale: 4 }),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Trader cluster assignments
export const traderClusterAssignments = pgTable("trader_cluster_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clusterId: uuid("cluster_id")
    .notNull()
    .references(() => traderBehaviorClusters.id, { onDelete: "cascade" }),
  traderAddress: varchar("trader_address", { length: 42 }).notNull(),
  
  // Assignment details
  assignmentScore: decimal("assignment_score", { precision: 5, scale: 2 }),
  eliteScore: decimal("elite_score", { precision: 5, scale: 2 }),
  
  // Timestamps
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow(),
});

// Market sentiment analysis
export const marketSentiment = pgTable("market_sentiment", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id),
  
  // Sentiment metrics
  sentimentScore: decimal("sentiment_score", { precision: 5, scale: 2 }).notNull(), // -100 to 100
  sentimentLabel: varchar("sentiment_label", { length: 50 }).notNull(), // bullish, bearish, neutral
  sentimentMomentum: varchar("sentiment_momentum", { length: 50 }), // increasing, decreasing, stable
  
  // Volume-weighted sentiment
  volumeWeightedScore: decimal("volume_weighted_score", { precision: 5, scale: 2 }),
  
  // Timestamps
  measuredAt: timestamp("measured_at", { withTimezone: true }).defaultNow(),
});

// Order book analysis
export const orderBookAnalysis = pgTable("order_book_analysis", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id),
  
  // Imbalance metrics
  orderImbalance: decimal("order_imbalance", { precision: 10, scale: 2 }).notNull(), // % imbalance
  imbalanceDirection: varchar("imbalance_direction", { length: 10 }).notNull(), // buy, sell
  
  // Whale detection
  whaleActivity: boolean("whale_activity").default(false),
  largeOrderCount: integer("large_order_count").default(0),
  largeOrderVolume: decimal("large_order_volume", { precision: 18, scale: 2 }),
  
  // Liquidity metrics
  liquidityScore: decimal("liquidity_score", { precision: 5, scale: 2 }),
  spreadBps: decimal("spread_bps", { precision: 10, scale: 2 }), // Spread in basis points
  
  // HFT detection
  hftScore: decimal("hft_score", { precision: 5, scale: 2 }),
  
  // Timestamps
  snapshotAt: timestamp("snapshot_at", { withTimezone: true }).defaultNow(),
});

// Market correlations
export const marketCorrelations = pgTable("market_correlations", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketAId: uuid("market_a_id")
    .notNull()
    .references(() => markets.id),
  marketBId: uuid("market_b_id")
    .notNull()
    .references(() => markets.id),
  
  // Correlation metrics
  correlationCoefficient: decimal("correlation_coefficient", { precision: 5, scale: 4 }).notNull(),
  correlationStrength: varchar("correlation_strength", { length: 50 }), // strong, moderate, weak
  
  // Lag analysis
  optimalLagHours: integer("optimal_lag_hours"),
  lagCorrelation: decimal("lag_correlation", { precision: 5, scale: 4 }),
  
  // Statistical significance
  sampleSize: integer("sample_size"),
  pValue: decimal("p_value", { precision: 10, scale: 6 }),
  isSignificant: boolean("is_significant").default(false),
  
  // Timestamps
  calculatedAt: timestamp("calculated_at", { withTimezone: true }).defaultNow(),
});

// Relations for pattern recognition
export const tradingPatternsRelations = relations(tradingPatterns, ({ many }) => ({
  matches: many(patternMatches),
}));

export const patternMatchesRelations = relations(patternMatches, ({ one }) => ({
  pattern: one(tradingPatterns, {
    fields: [patternMatches.patternId],
    references: [tradingPatterns.id],
  }),
  market: one(markets, {
    fields: [patternMatches.marketId],
    references: [markets.id],
  }),
}));

export const traderBehaviorClustersRelations = relations(traderBehaviorClusters, ({ many }) => ({
  assignments: many(traderClusterAssignments),
}));

export const traderClusterAssignmentsRelations = relations(traderClusterAssignments, ({ one }) => ({
  cluster: one(traderBehaviorClusters, {
    fields: [traderClusterAssignments.clusterId],
    references: [traderBehaviorClusters.id],
  }),
}));

export const marketSentimentRelations = relations(marketSentiment, ({ one }) => ({
  market: one(markets, {
    fields: [marketSentiment.marketId],
    references: [markets.id],
  }),
}));

export const orderBookAnalysisRelations = relations(orderBookAnalysis, ({ one }) => ({
  market: one(markets, {
    fields: [orderBookAnalysis.marketId],
    references: [markets.id],
  }),
}));

export const marketCorrelationsRelations = relations(marketCorrelations, ({ one }) => ({
  marketA: one(markets, {
    fields: [marketCorrelations.marketAId],
    references: [markets.id],
  }),
  marketB: one(markets, {
    fields: [marketCorrelations.marketBId],
    references: [markets.id],
  }),
}));