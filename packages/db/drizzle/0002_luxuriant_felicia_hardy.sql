CREATE TABLE "ai_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" text NOT NULL,
	"probability_estimate" numeric NOT NULL,
	"confidence" text NOT NULL,
	"thesis" text NOT NULL,
	"counter_thesis" text NOT NULL,
	"key_factors" jsonb NOT NULL,
	"what_could_go_wrong" jsonb NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"market_id" text NOT NULL,
	"alert_type" text NOT NULL,
	"threshold" numeric,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cross_platform_markets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"polymarket_id" text,
	"kalshi_id" text,
	"limitless_id" text,
	"match_confidence" numeric NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cross_platform_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cross_platform_market_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"yes_price" numeric NOT NULL,
	"no_price" numeric NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"display_name" text,
	"total_volume" numeric NOT NULL,
	"total_pnl" numeric NOT NULL,
	"win_rate" numeric NOT NULL,
	"total_trades" integer NOT NULL,
	"rank" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "leaderboard_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
CREATE TABLE "market_quality_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" text NOT NULL,
	"liquidity_score" numeric NOT NULL,
	"volume_score" numeric NOT NULL,
	"spread_score" numeric NOT NULL,
	"participation_score" numeric NOT NULL,
	"overall_score" numeric NOT NULL,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "market_quality_scores_market_id_unique" UNIQUE("market_id")
);
--> statement-breakpoint
CREATE TABLE "outcome_patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cluster_type" text NOT NULL,
	"pattern_name" text NOT NULL,
	"frequency_percent" numeric NOT NULL,
	"description" text NOT NULL,
	"retail_implication" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"market_id" text NOT NULL,
	"position" text NOT NULL,
	"shares" numeric NOT NULL,
	"avg_price" numeric NOT NULL,
	"current_value" numeric,
	"pnl" numeric,
	"pnl_percent" numeric,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retail_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" text NOT NULL,
	"signal_type" text NOT NULL,
	"severity" text NOT NULL,
	"message" text NOT NULL,
	"actionable" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_alert_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_connection_id" uuid NOT NULL,
	"alert_type" text NOT NULL,
	"market_id" text,
	"threshold" numeric,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"telegram_chat_id" text NOT NULL,
	"telegram_username" text,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "telegram_connections_telegram_chat_id_unique" UNIQUE("telegram_chat_id")
);
--> statement-breakpoint
CREATE TABLE "timing_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" text NOT NULL,
	"window_type" text NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"reason" text NOT NULL,
	"retail_guidance" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uma_disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" text NOT NULL,
	"dispute_id" text NOT NULL,
	"proposed_outcome" text NOT NULL,
	"dispute_reason" text NOT NULL,
	"bond_amount" numeric NOT NULL,
	"status" text NOT NULL,
	"voting_ends_at" timestamp,
	"resolution" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uma_disputes_dispute_id_unique" UNIQUE("dispute_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "watchlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"market_id" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whale_trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_id" text NOT NULL,
	"market_id" text NOT NULL,
	"wallet_address" text NOT NULL,
	"side" text NOT NULL,
	"outcome" text NOT NULL,
	"shares" numeric NOT NULL,
	"price" numeric NOT NULL,
	"usd_value" numeric NOT NULL,
	"timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "whale_trades_trade_id_unique" UNIQUE("trade_id")
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_platform_prices" ADD CONSTRAINT "cross_platform_prices_cross_platform_market_id_cross_platform_markets_id_fk" FOREIGN KEY ("cross_platform_market_id") REFERENCES "public"."cross_platform_markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio" ADD CONSTRAINT "portfolio_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_alert_subscriptions" ADD CONSTRAINT "telegram_alert_subscriptions_telegram_connection_id_telegram_connections_id_fk" FOREIGN KEY ("telegram_connection_id") REFERENCES "public"."telegram_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_connections" ADD CONSTRAINT "telegram_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_analysis_market_id_idx" ON "ai_analysis" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "cross_platform_prices_market_id_idx" ON "cross_platform_prices" USING btree ("cross_platform_market_id");--> statement-breakpoint
CREATE INDEX "cross_platform_prices_timestamp_idx" ON "cross_platform_prices" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "leaderboard_rank_idx" ON "leaderboard" USING btree ("rank");--> statement-breakpoint
CREATE INDEX "leaderboard_volume_idx" ON "leaderboard" USING btree ("total_volume");--> statement-breakpoint
CREATE INDEX "market_quality_scores_market_id_idx" ON "market_quality_scores" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "retail_signals_market_id_idx" ON "retail_signals" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "retail_signals_created_at_idx" ON "retail_signals" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "timing_windows_market_id_idx" ON "timing_windows" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "uma_disputes_market_id_idx" ON "uma_disputes" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "uma_disputes_status_idx" ON "uma_disputes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "whale_trades_market_id_idx" ON "whale_trades" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "whale_trades_wallet_idx" ON "whale_trades" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "whale_trades_timestamp_idx" ON "whale_trades" USING btree ("timestamp");