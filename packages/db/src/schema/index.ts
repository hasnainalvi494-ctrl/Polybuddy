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
