CREATE TYPE "public"."alert_status" AS ENUM('active', 'triggered', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('price_move', 'volume_spike', 'liquidity_drop', 'resolution_approaching', 'favorable_structure', 'structural_mispricing', 'crowd_chasing', 'event_window', 'retail_friendly');--> statement-breakpoint
CREATE TYPE "public"."behavior_cluster_type" AS ENUM('scheduled_event', 'continuous_info', 'binary_catalyst', 'high_volatility', 'long_duration', 'sports_scheduled');--> statement-breakpoint
CREATE TYPE "public"."consistency_label" AS ENUM('looks_consistent', 'potential_inconsistency_low', 'potential_inconsistency_medium', 'potential_inconsistency_high');--> statement-breakpoint
CREATE TYPE "public"."exposure_link_label" AS ENUM('independent', 'partially_linked', 'highly_linked');--> statement-breakpoint
CREATE TYPE "public"."flow_guard_label_type" AS ENUM('historically_noisy', 'pro_dominant', 'retail_actionable');--> statement-breakpoint
CREATE TYPE "public"."flow_label_type" AS ENUM('one_off_spike', 'sustained_accumulation', 'crowd_chase', 'exhaustion_move');--> statement-breakpoint
CREATE TYPE "public"."market_quality_grade" AS ENUM('A', 'B', 'C', 'D', 'F');--> statement-breakpoint
CREATE TYPE "public"."market_state_label" AS ENUM('calm_liquid', 'thin_slippage', 'jumpy', 'event_driven');--> statement-breakpoint
CREATE TYPE "public"."participant_quality_band" AS ENUM('strong', 'moderate', 'limited');--> statement-breakpoint
CREATE TYPE "public"."participation_summary" AS ENUM('few_dominant', 'mixed_participation', 'broad_retail');--> statement-breakpoint
CREATE TYPE "public"."relation_type" AS ENUM('calendar_variant', 'multi_outcome', 'inverse', 'correlated');--> statement-breakpoint
CREATE TYPE "public"."retail_friendliness_type" AS ENUM('favorable', 'neutral', 'unfavorable');--> statement-breakpoint
CREATE TYPE "public"."retail_signal_type" AS ENUM('favorable_structure', 'structural_mispricing', 'crowd_chasing', 'event_window', 'retail_friendliness');--> statement-breakpoint
CREATE TYPE "public"."setup_quality_band" AS ENUM('historically_favorable', 'mixed_workable', 'neutral', 'historically_unforgiving');--> statement-breakpoint
CREATE TYPE "public"."signal_confidence" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."state_event_severity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."state_event_type" AS ENUM('state_change', 'liquidity_drop', 'spread_widen', 'volatility_spike');--> statement-breakpoint
CREATE TYPE "public"."uma_dispute_status" AS ENUM('commit_stage', 'reveal_stage', 'resolved');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"market_id" uuid NOT NULL,
	"type" "alert_type" NOT NULL,
	"condition" jsonb NOT NULL,
	"status" "alert_status" DEFAULT 'active',
	"triggered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "constraint_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"relation_id" uuid NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"score" integer NOT NULL,
	"confidence" integer NOT NULL,
	"label" "consistency_label" NOT NULL,
	"why_json" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"trade_ts" timestamp with time zone NOT NULL,
	"side" varchar(10) NOT NULL,
	"notional" numeric(18, 2),
	"score" integer NOT NULL,
	"confidence" integer NOT NULL,
	"label" varchar(50) NOT NULL,
	"why_json" jsonb NOT NULL,
	"spread_at_entry" numeric(10, 6),
	"depth_at_entry" numeric(18, 2),
	"price_change_15m" numeric(10, 6),
	"market_state_at_entry" "market_state_label",
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exposure_cluster_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cluster_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"weight" numeric(5, 4),
	"exposure" numeric(18, 2)
);
--> statement-breakpoint
CREATE TABLE "exposure_clusters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"cluster_id" varchar(100) NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"exposure_pct" numeric(5, 2) NOT NULL,
	"label" varchar(100) NOT NULL,
	"confidence" integer NOT NULL,
	"why_json" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flow_labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flow_event_id" uuid NOT NULL,
	"label" "flow_label_type" NOT NULL,
	"score" integer NOT NULL,
	"confidence" integer NOT NULL,
	"why_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hidden_exposure_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_a_id" uuid NOT NULL,
	"market_b_id" uuid NOT NULL,
	"exposure_label" "exposure_link_label" NOT NULL,
	"explanation" text NOT NULL,
	"example_outcome" text NOT NULL,
	"mistake_prevented" text NOT NULL,
	"shared_driver_type" varchar(50) NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "market_behavior_dimensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"info_cadence" integer,
	"info_structure" integer,
	"liquidity_stability" integer,
	"time_to_resolution" integer,
	"participant_concentration" integer,
	"behavior_cluster" "behavior_cluster_type",
	"cluster_confidence" integer,
	"cluster_explanation" text,
	"retail_friendliness" "retail_friendliness_type",
	"common_retail_mistake" text,
	"why_retail_loses_here" text,
	"when_retail_can_compete" text,
	"computed_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "market_behavior_dimensions_market_id_unique" UNIQUE("market_id")
);
--> statement-breakpoint
CREATE TABLE "market_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"spread" numeric(10, 6),
	"depth" numeric(18, 2),
	"staleness" integer,
	"vol_proxy" numeric(10, 6),
	"impact_proxy" numeric(10, 6),
	"trade_count" integer,
	"volume_usd" numeric(18, 2)
);
--> statement-breakpoint
CREATE TABLE "market_participation_structure" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"side" varchar(3) NOT NULL,
	"setup_quality_score" integer NOT NULL,
	"setup_quality_band" "setup_quality_band" NOT NULL,
	"participant_quality_score" integer NOT NULL,
	"participant_quality_band" "participant_quality_band" NOT NULL,
	"participation_summary" "participation_summary" NOT NULL,
	"large_pct" integer NOT NULL,
	"mid_pct" integer NOT NULL,
	"small_pct" integer NOT NULL,
	"behavior_insight" text NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "market_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"a_market_id" uuid NOT NULL,
	"b_market_id" uuid NOT NULL,
	"relation_type" "relation_type" NOT NULL,
	"relation_meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "market_resolution_drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"underlying_asset" varchar(100),
	"resolution_source" varchar(200),
	"resolution_window_start" timestamp with time zone,
	"resolution_window_end" timestamp with time zone,
	"narrative_dependency" varchar(200),
	"asset_category" varchar(50),
	"computed_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "market_resolution_drivers_market_id_unique" UNIQUE("market_id")
);
--> statement-breakpoint
CREATE TABLE "market_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"price" numeric(10, 4),
	"spread" numeric(10, 4),
	"depth" numeric(18, 2),
	"volume_24h" numeric(18, 2),
	"liquidity" numeric(18, 2),
	"snapshot_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "market_state_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"event_type" "state_event_type" NOT NULL,
	"severity" "state_event_severity" NOT NULL,
	"why_json" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"start_ts" timestamp with time zone NOT NULL,
	"end_ts" timestamp with time zone,
	"state_label" "market_state_label" NOT NULL,
	"confidence" integer NOT NULL,
	"why_json" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"polymarket_id" varchar(255) NOT NULL,
	"question" text NOT NULL,
	"description" text,
	"category" varchar(100),
	"end_date" timestamp with time zone,
	"resolved" boolean DEFAULT false,
	"outcome" varchar(50),
	"quality_grade" "market_quality_grade",
	"quality_score" numeric(5, 2),
	"spread_score" numeric(5, 2),
	"depth_score" numeric(5, 2),
	"staleness_score" numeric(5, 2),
	"volatility_score" numeric(5, 2),
	"cluster_label" varchar(50),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "markets_polymarket_id_unique" UNIQUE("polymarket_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"alert_id" uuid,
	"market_id" uuid,
	"type" "alert_type" NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"read" boolean DEFAULT false,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "portfolio_exposure_warnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"market_ids" jsonb NOT NULL,
	"exposure_label" "exposure_link_label" NOT NULL,
	"warning_title" varchar(200) NOT NULL,
	"explanation" text NOT NULL,
	"example_outcome" text NOT NULL,
	"mistake_prevented" text NOT NULL,
	"dismissed" boolean DEFAULT false,
	"dismissed_at" timestamp with time zone,
	"computed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "portfolio_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"outcome" varchar(50) NOT NULL,
	"shares" numeric(18, 8) NOT NULL,
	"avg_entry_price" numeric(10, 4),
	"current_value" numeric(18, 2),
	"unrealized_pnl" numeric(18, 2),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "retail_flow_guard" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"label" "flow_guard_label_type" NOT NULL,
	"confidence" "signal_confidence" NOT NULL,
	"why_bullets" jsonb NOT NULL,
	"common_retail_mistake" text NOT NULL,
	"large_early_trades_pct" numeric(5, 2),
	"order_book_concentration" numeric(5, 2),
	"depth_shift_speed" numeric(10, 4),
	"repricing_speed" numeric(10, 4),
	"computed_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "retail_flow_guard_market_id_unique" UNIQUE("market_id")
);
--> statement-breakpoint
CREATE TABLE "retail_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"signal_type" "retail_signal_type" NOT NULL,
	"label" varchar(200) NOT NULL,
	"is_favorable" boolean NOT NULL,
	"confidence" "signal_confidence" NOT NULL,
	"why_bullets" jsonb NOT NULL,
	"metrics" jsonb,
	"valid_from" timestamp with time zone DEFAULT now(),
	"valid_until" timestamp with time zone,
	"computed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "signal_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"signal_type" "retail_signal_type" NOT NULL,
	"enabled" boolean DEFAULT true,
	"region_opt_in" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tracked_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"address" varchar(42) NOT NULL,
	"label" varchar(100),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "uma_dispute_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" text NOT NULL,
	"resolution_flipped" boolean NOT NULL,
	"original_outcome" text,
	"final_outcome" text,
	"resolved_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "uma_disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" text NOT NULL,
	"dispute_status" "uma_dispute_status" NOT NULL,
	"proposed_outcome" text,
	"disputed_outcome" text,
	"total_votes" integer DEFAULT 0,
	"yes_votes" integer DEFAULT 0,
	"no_votes" integer DEFAULT 0,
	"voting_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(100),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wallet_flow_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"market_id" uuid NOT NULL,
	"start_ts" timestamp with time zone NOT NULL,
	"end_ts" timestamp with time zone,
	"notional" numeric(18, 2) NOT NULL,
	"trade_count" integer NOT NULL,
	"side" varchar(10) NOT NULL,
	"meta" jsonb
);
--> statement-breakpoint
CREATE TABLE "wallet_performance" (
	"wallet_address" text PRIMARY KEY NOT NULL,
	"total_profit" numeric(18, 2),
	"total_volume" numeric(18, 2),
	"win_rate" numeric(5, 2),
	"trade_count" integer DEFAULT 0,
	"roi_percent" numeric(10, 2),
	"primary_category" text,
	"last_trade_at" timestamp with time zone,
	"rank" integer,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wallet_trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"market_id" text NOT NULL,
	"side" text NOT NULL,
	"outcome" text NOT NULL,
	"entry_price" numeric(10, 4),
	"exit_price" numeric(10, 4),
	"size" numeric(18, 8),
	"profit" numeric(18, 2),
	"timestamp" timestamp with time zone NOT NULL,
	"tx_hash" text
);
--> statement-breakpoint
CREATE TABLE "watchlist_markets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"watchlist_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "watchlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "weekly_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start" timestamp with time zone NOT NULL,
	"week_end" timestamp with time zone NOT NULL,
	"realized_pnl" numeric(18, 2),
	"unrealized_pnl" numeric(18, 2),
	"total_trades" integer DEFAULT 0,
	"win_rate" numeric(5, 2),
	"best_decision_id" uuid,
	"worst_decision_id" uuid,
	"best_market_question" text,
	"worst_market_question" text,
	"entry_timing_score" integer,
	"slippage_paid" numeric(18, 2),
	"concentration_score" integer,
	"quality_discipline_score" integer,
	"patterns_observed" jsonb,
	"coaching_notes" jsonb,
	"generated_at" timestamp with time zone DEFAULT now(),
	"viewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "whale_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"market_id" text NOT NULL,
	"action" text NOT NULL,
	"outcome" text NOT NULL,
	"amount_usd" numeric(18, 2) NOT NULL,
	"price" numeric(10, 4),
	"price_before" numeric(10, 4),
	"price_after" numeric(10, 4),
	"timestamp" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constraint_checks" ADD CONSTRAINT "constraint_checks_relation_id_market_relations_id_fk" FOREIGN KEY ("relation_id") REFERENCES "public"."market_relations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_reviews" ADD CONSTRAINT "decision_reviews_wallet_id_tracked_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."tracked_wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_reviews" ADD CONSTRAINT "decision_reviews_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exposure_cluster_members" ADD CONSTRAINT "exposure_cluster_members_cluster_id_exposure_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."exposure_clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exposure_cluster_members" ADD CONSTRAINT "exposure_cluster_members_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exposure_clusters" ADD CONSTRAINT "exposure_clusters_wallet_id_tracked_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."tracked_wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_labels" ADD CONSTRAINT "flow_labels_flow_event_id_wallet_flow_events_id_fk" FOREIGN KEY ("flow_event_id") REFERENCES "public"."wallet_flow_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hidden_exposure_links" ADD CONSTRAINT "hidden_exposure_links_market_a_id_markets_id_fk" FOREIGN KEY ("market_a_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hidden_exposure_links" ADD CONSTRAINT "hidden_exposure_links_market_b_id_markets_id_fk" FOREIGN KEY ("market_b_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_behavior_dimensions" ADD CONSTRAINT "market_behavior_dimensions_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_features" ADD CONSTRAINT "market_features_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_participation_structure" ADD CONSTRAINT "market_participation_structure_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_relations" ADD CONSTRAINT "market_relations_a_market_id_markets_id_fk" FOREIGN KEY ("a_market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_relations" ADD CONSTRAINT "market_relations_b_market_id_markets_id_fk" FOREIGN KEY ("b_market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_resolution_drivers" ADD CONSTRAINT "market_resolution_drivers_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_snapshots" ADD CONSTRAINT "market_snapshots_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_state_events" ADD CONSTRAINT "market_state_events_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_states" ADD CONSTRAINT "market_states_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_exposure_warnings" ADD CONSTRAINT "portfolio_exposure_warnings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_exposure_warnings" ADD CONSTRAINT "portfolio_exposure_warnings_wallet_id_tracked_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."tracked_wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_positions" ADD CONSTRAINT "portfolio_positions_wallet_id_tracked_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."tracked_wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_positions" ADD CONSTRAINT "portfolio_positions_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retail_flow_guard" ADD CONSTRAINT "retail_flow_guard_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retail_signals" ADD CONSTRAINT "retail_signals_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_subscriptions" ADD CONSTRAINT "signal_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uma_disputes" ADD CONSTRAINT "uma_disputes_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_flow_events" ADD CONSTRAINT "wallet_flow_events_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_markets" ADD CONSTRAINT "watchlist_markets_watchlist_id_watchlists_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "public"."watchlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_markets" ADD CONSTRAINT "watchlist_markets_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;