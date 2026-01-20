import { logger } from "./logger.js";
import { db } from "@polybuddy/db";
import { sql } from "drizzle-orm";

/**
 * Initialize database tables that may be missing
 * Creates pattern recognition tables if they don't exist
 */
export async function initializeMissingTables(): Promise<void> {
  logger.info("Checking for missing database tables...");
  
  try {
    // Create pattern type enum if not exists
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE pattern_type AS ENUM (
          'momentum', 'reversal', 'breakout', 'consolidation',
          'accumulation', 'distribution', 'elite_follow', 'whale_accumulation'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `);

    // Create trading_patterns table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS trading_patterns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pattern_type pattern_type NOT NULL,
        pattern_name VARCHAR(200) NOT NULL,
        pattern_signature JSONB,
        confidence_score DECIMAL(5,2) NOT NULL,
        entry_price_range JSONB,
        position_size_range JSONB,
        holding_period_hours JSONB,
        exit_conditions JSONB,
        occurrences INTEGER DEFAULT 0,
        successful_outcomes INTEGER DEFAULT 0,
        failed_outcomes INTEGER DEFAULT 0,
        win_rate DECIMAL(5,2) DEFAULT 0,
        avg_roi DECIMAL(10,2) DEFAULT 0,
        sharpe_ratio DECIMAL(10,4) DEFAULT 0,
        market_category VARCHAR(100),
        market_phase VARCHAR(50),
        volatility_range JSONB,
        elite_traders_using INTEGER DEFAULT 0,
        avg_trader_elite_score DECIMAL(5,2),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        last_occurrence_at TIMESTAMPTZ
      )
    `);
    logger.info("✅ trading_patterns table ready");

    // Create pattern_matches table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pattern_matches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pattern_id UUID REFERENCES trading_patterns(id) ON DELETE CASCADE,
        market_id UUID REFERENCES markets(id),
        trader_address VARCHAR(42),
        match_score DECIMAL(5,2) NOT NULL,
        matched_features JSONB,
        entry_price DECIMAL(10,4),
        exit_price DECIMAL(10,4),
        position_size DECIMAL(18,2),
        actual_outcome VARCHAR(10),
        actual_roi DECIMAL(10,2),
        matched_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      )
    `);
    logger.info("✅ pattern_matches table ready");

    // Create trader_behavior_clusters table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS trader_behavior_clusters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cluster_name VARCHAR(200) NOT NULL,
        cluster_type VARCHAR(100) NOT NULL,
        avg_position_size DECIMAL(18,2),
        avg_holding_hours DECIMAL(10,2),
        avg_win_rate DECIMAL(5,2),
        avg_roi DECIMAL(10,2),
        entry_pattern JSONB,
        exit_pattern JSONB,
        risk_profile VARCHAR(50),
        trader_count INTEGER DEFAULT 0,
        elite_trader_percentage DECIMAL(5,2),
        cluster_win_rate DECIMAL(5,2),
        cluster_avg_roi DECIMAL(10,2),
        cluster_sharpe_ratio DECIMAL(10,4),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    logger.info("✅ trader_behavior_clusters table ready");

    // Create trader_cluster_assignments table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS trader_cluster_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cluster_id UUID REFERENCES trader_behavior_clusters(id) ON DELETE CASCADE,
        trader_address VARCHAR(42) NOT NULL,
        assignment_score DECIMAL(5,2),
        elite_score DECIMAL(5,2),
        assigned_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    logger.info("✅ trader_cluster_assignments table ready");

    // Create market_sentiment table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS market_sentiment (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        market_id UUID REFERENCES markets(id),
        sentiment_score DECIMAL(5,2) NOT NULL,
        sentiment_label VARCHAR(50) NOT NULL,
        sentiment_momentum VARCHAR(50),
        volume_weighted_score DECIMAL(5,2),
        measured_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    logger.info("✅ market_sentiment table ready");

    // Create order_book_analysis table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS order_book_analysis (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        market_id UUID REFERENCES markets(id),
        order_imbalance DECIMAL(10,2) NOT NULL,
        imbalance_direction VARCHAR(10) NOT NULL,
        whale_activity BOOLEAN DEFAULT FALSE,
        large_order_count INTEGER DEFAULT 0,
        large_order_volume DECIMAL(18,2),
        liquidity_score DECIMAL(5,2),
        spread_bps DECIMAL(10,2),
        hft_score DECIMAL(5,2),
        snapshot_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    logger.info("✅ order_book_analysis table ready");

    // Create market_correlations table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS market_correlations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        market_a_id UUID REFERENCES markets(id),
        market_b_id UUID REFERENCES markets(id),
        correlation_coefficient DECIMAL(5,4) NOT NULL,
        correlation_strength VARCHAR(50),
        optimal_lag_hours INTEGER,
        lag_correlation DECIMAL(5,4),
        sample_size INTEGER,
        p_value DECIMAL(10,6),
        is_significant BOOLEAN DEFAULT FALSE,
        calculated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    logger.info("✅ market_correlations table ready");

    // Insert sample data if tables are empty
    await seedPatternRecognitionData();

    logger.info("Database initialization complete");
  } catch (error) {
    logger.error({ error }, "Failed to initialize database tables");
    // Don't throw - allow API to continue even if some tables fail
  }
}

/**
 * Seed sample pattern recognition data
 */
async function seedPatternRecognitionData(): Promise<void> {
  try {
    // Check if clusters exist
    const clustersResult = await db.execute(sql`SELECT COUNT(*) as count FROM trader_behavior_clusters`);
    const clustersRows = Array.isArray(clustersResult) ? clustersResult : (clustersResult as any).rows || [];
    const clusterCount = parseInt(clustersRows[0]?.count || '0');

    if (clusterCount === 0) {
      logger.info("Seeding trader behavior clusters...");
      await db.execute(sql`
        INSERT INTO trader_behavior_clusters (cluster_name, cluster_type, avg_position_size, avg_holding_hours, avg_win_rate, avg_roi, risk_profile, trader_count, elite_trader_percentage, cluster_win_rate, cluster_avg_roi, cluster_sharpe_ratio)
        VALUES 
          ('Momentum Chasers', 'aggressive', 15000.00, 12.5, 58.00, 8.50, 'high', 45, 22.00, 56.00, 7.80, 1.25),
          ('Value Contrarians', 'conservative', 8500.00, 72.0, 65.00, 12.30, 'low', 32, 38.00, 67.00, 14.50, 1.85),
          ('Event Traders', 'opportunistic', 12000.00, 6.0, 52.00, 15.80, 'medium', 28, 15.00, 48.00, 18.20, 0.95),
          ('Elite Followers', 'moderate', 5000.00, 48.0, 62.00, 9.20, 'medium', 156, 8.00, 58.00, 8.50, 1.45),
          ('Whale Watchers', 'reactive', 3500.00, 24.0, 55.00, 6.80, 'medium', 89, 5.00, 52.00, 5.90, 1.10)
      `);
      logger.info("✅ Seeded trader behavior clusters");
    }

    // Check if patterns exist
    const patternsResult = await db.execute(sql`SELECT COUNT(*) as count FROM trading_patterns`);
    const patternsRows = Array.isArray(patternsResult) ? patternsResult : (patternsResult as any).rows || [];
    const patternCount = parseInt(patternsRows[0]?.count || '0');

    if (patternCount === 0) {
      logger.info("Seeding trading patterns...");
      await db.execute(sql`
        INSERT INTO trading_patterns (pattern_type, pattern_name, confidence_score, entry_price_range, position_size_range, holding_period_hours, win_rate, avg_roi, sharpe_ratio, market_category, market_phase, occurrences, successful_outcomes, failed_outcomes, elite_traders_using)
        VALUES 
          ('momentum', 'Early Momentum Surge', 85.00, '{"min": 0.15, "max": 0.35, "optimal": 0.25}'::jsonb, '{"min": 1000, "max": 10000, "avg": 5000}'::jsonb, '{"min": 6, "max": 48, "avg": 24}'::jsonb, 72.50, 18.30, 1.65, 'politics', 'early', 234, 170, 64, 12),
          ('reversal', 'Oversold Bounce', 78.00, '{"min": 0.05, "max": 0.20, "optimal": 0.12}'::jsonb, '{"min": 2000, "max": 15000, "avg": 7500}'::jsonb, '{"min": 12, "max": 96, "avg": 48}'::jsonb, 68.20, 22.10, 1.42, NULL, 'late', 156, 107, 49, 8),
          ('breakout', 'Volume Breakout', 82.00, '{"min": 0.40, "max": 0.60, "optimal": 0.50}'::jsonb, '{"min": 3000, "max": 20000, "avg": 10000}'::jsonb, '{"min": 4, "max": 24, "avg": 12}'::jsonb, 65.80, 15.60, 1.35, 'crypto', 'mid', 189, 124, 65, 15),
          ('accumulation', 'Smart Money Accumulation', 88.00, '{"min": 0.20, "max": 0.40, "optimal": 0.30}'::jsonb, '{"min": 5000, "max": 50000, "avg": 20000}'::jsonb, '{"min": 24, "max": 168, "avg": 72}'::jsonb, 75.30, 25.80, 1.92, 'politics', 'early', 98, 74, 24, 22),
          ('elite_follow', 'Elite Trader Follow', 90.00, '{"min": 0.25, "max": 0.45, "optimal": 0.35}'::jsonb, '{"min": 2000, "max": 12000, "avg": 6000}'::jsonb, '{"min": 12, "max": 72, "avg": 36}'::jsonb, 78.60, 19.40, 1.78, NULL, NULL, 312, 245, 67, 35)
      `);
      logger.info("✅ Seeded trading patterns");
    }
  } catch (error) {
    logger.warn({ error }, "Failed to seed pattern recognition data (may already exist)");
  }
}
