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
]);

export const alertStatus = pgEnum("alert_status", [
  "active",
  "triggered",
  "dismissed",
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

export const alertsRelations = relations(alerts, ({ one }) => ({
  market: one(markets, {
    fields: [alerts.marketId],
    references: [markets.id],
  }),
}));

export const trackedWalletsRelations = relations(trackedWallets, ({ many }) => ({
  positions: many(portfolioPositions),
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
