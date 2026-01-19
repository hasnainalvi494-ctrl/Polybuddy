import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env files
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../.env") });
config({ path: resolve(process.cwd(), "../../.env") });

// Set default DATABASE_URL for local development
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://polybuddy:polybuddy@localhost:5432/polybuddy";
}

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { z } from "zod";
import { loggerConfig } from "./lib/logger.js";

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  COOKIE_SECRET: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
});

function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
      console.error("❌ Environment validation failed:\n" + issues);
      process.exit(1);
    }
    throw error;
  }
}

const env = validateEnv();
import { authRoutes } from "./routes/auth.js";
import { marketsRoutes } from "./routes/markets.js";
import { watchlistsRoutes } from "./routes/watchlists.js";
import { alertsRoutes } from "./routes/alerts.js";
import { portfolioRoutes } from "./routes/portfolio.js";
import { healthRoutes, checkDatabaseHealth } from "./routes/health.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { reportsRoutes } from "./routes/reports.js";
import { signalsRoutes } from "./routes/signals.js";
import { retailSignalsRoutes } from "./routes/retail-signals.js";
import { dailyRoutes } from "./routes/daily.js";
import { statsRoutes } from "./routes/stats.js";
import { arbitrageRoutes } from "./routes/arbitrage.js";
import { leaderboardRoutes } from "./routes/leaderboard.js";
import { whaleFeedRoutes } from "./routes/whale-feed.js";
import { priceHistoryRoutes } from "./routes/price-history.js";
import { similarHistoryRoutes } from "./routes/similar-history.js";
import { slippageRoutes } from "./routes/slippage.js";
import { disputesRoutes } from "./routes/disputes.js";
import { telegramRoutes } from "./routes/telegram.js";
import { orderbookRoutes } from "./routes/orderbook.js";
import { aiAnalysisRoutes } from "./routes/ai-analysis.js";
import { outcomePathsRoutes } from "./routes/outcome-paths.js";
import { timingWindowsRoutes } from "./routes/timing-windows.js";
import { crossPlatformRoutes } from "./routes/cross-platform.js";
import { scheduleWalletSync } from "./jobs/sync-wallets.js";
import { scheduleMarketSync } from "./jobs/sync-markets.js";
import { scheduleUMADisputeSync } from "./services/uma-disputes.js";
import { scheduleSignalGeneration } from "./jobs/generate-best-bets.js";
import { scheduleRealTraderSync } from "./jobs/sync-real-traders.js";
import { eliteTraderRoutes } from "./routes/elite-traders.js";
import { adminRoutes } from "./routes/admin.js";
import { bestBetsApiRoutes } from "./routes/best-bets-api.js";
import { riskManagementRoutes } from "./routes/risk-management.js";
import { copyTradingRoutes } from "./routes/copy-trading.js";
// import { patternRecognitionRoutes } from "./routes/pattern-recognition.js"; // File deleted
// import { alertsSystemRoutes } from "./routes/alerts-system.js"; // File deleted
// import { realtimeRoutes } from "./routes/realtime.js"; // File deleted
// import { realtimePolymarket } from "./services/realtime-polymarket.js"; // File deleted

const PORT = env.PORT;
const HOST = env.HOST;

async function buildApp() {
  const app = Fastify({
    logger: loggerConfig,
  });

  // Global error handler for better resilience
  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error, url: request.url }, "Request error");
    
    // Don't expose internal errors in production
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 
      ? "Internal server error - please try again" 
      : error.message;
    
    reply.status(statusCode).send({ 
      error: message,
      statusCode,
    });
  });

  // Zod validation
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // CORS - must be registered BEFORE helmet
  await app.register(cors, {
    // Allow all origins for public API access
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Cache-Control", "Pragma"],
    exposedHeaders: ["Content-Length", "X-Request-Id"],
    maxAge: 86400, // Cache preflight for 24 hours
  });

  // Security - configured to allow cross-origin API access
  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
    contentSecurityPolicy: false, // Disable CSP for API
  });
  
  // Cookie secret - required in production
  if (!env.COOKIE_SECRET && env.NODE_ENV === "production") {
    throw new Error("COOKIE_SECRET environment variable is required in production");
  }
  await app.register(cookie, {
    secret: env.COOKIE_SECRET || "dev-only-secret-not-for-production",
  });

  // Rate limiting to prevent brute force attacks
  await app.register(rateLimit, {
    max: 100, // 100 requests per minute globally
    timeWindow: "1 minute",
    // Stricter limits for auth endpoints
    keyGenerator: (request) => {
      return request.ip;
    },
  });

  // API docs
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Poly Buddy API",
        description: "Polymarket Decision & Performance Assistant API",
        version: "0.1.0",
      },
    },
  });
  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });

  // Routes
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(marketsRoutes, { prefix: "/api/markets" });
  await app.register(watchlistsRoutes, { prefix: "/api/watchlists" });
  await app.register(alertsRoutes, { prefix: "/api/alerts" });
  await app.register(portfolioRoutes, { prefix: "/api/portfolio" });
  await app.register(analyticsRoutes, { prefix: "/api/analytics" });
  await app.register(reportsRoutes, { prefix: "/api/reports" });
  await app.register(signalsRoutes, { prefix: "/api/signals" });
  await app.register(retailSignalsRoutes, { prefix: "/api/retail-signals" });
  await app.register(dailyRoutes, { prefix: "/api/daily" });
  await app.register(statsRoutes, { prefix: "/api/stats" });
  await app.register(arbitrageRoutes, { prefix: "/api/arbitrage" });
  await app.register(leaderboardRoutes, { prefix: "/api/leaderboard" });
  await app.register(whaleFeedRoutes, { prefix: "/api/whale-activity" });
  await app.register(priceHistoryRoutes, { prefix: "/api/markets" });
  await app.register(similarHistoryRoutes, { prefix: "/api/markets" });
  await app.register(slippageRoutes, { prefix: "/api/markets" });
  await app.register(orderbookRoutes, { prefix: "/api/markets" });
  await app.register(aiAnalysisRoutes, { prefix: "/api/markets" });
  await app.register(outcomePathsRoutes, { prefix: "/api/markets" });
  await app.register(timingWindowsRoutes, { prefix: "/api/markets" });
  await app.register(crossPlatformRoutes, { prefix: "/api/markets" });
  await app.register(disputesRoutes, { prefix: "/api/disputes" });
  await app.register(telegramRoutes, { prefix: "/api/telegram" });
  await app.register(eliteTraderRoutes); // Elite trader routes
  await app.register(adminRoutes); // Admin routes
  await app.register(bestBetsApiRoutes); // Best Bets API with copy trade
  await app.register(riskManagementRoutes); // Risk management & portfolio analytics
  await app.register(copyTradingRoutes); // Copy trading system
  // await app.register(patternRecognitionRoutes); // AI pattern recognition - File deleted
  // await app.register(alertsSystemRoutes); // Comprehensive notification system - File deleted
  // await app.register(realtimeRoutes, { prefix: "/api/realtime" }); // Real-time WebSocket data - File deleted

  return app;
}

async function main() {
  const app = await buildApp();

  // Store interval IDs for cleanup
  let walletSyncInterval: NodeJS.Timeout;
  let marketSyncInterval: NodeJS.Timeout;
  let umaSyncInterval: NodeJS.Timeout;
  let signalGenInterval: NodeJS.Timeout;
  let realTraderSyncInterval: NodeJS.Timeout;

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Server running at http://${HOST}:${PORT}`);
    app.log.info(`API docs at http://${HOST}:${PORT}/docs`);

    // Verify database connectivity before starting background jobs
    app.log.info("Verifying database connectivity...");
    const dbHealth = await checkDatabaseHealth();
    
    if (!dbHealth.connected) {
      app.log.error(`Database connection failed: ${dbHealth.error}`);
      app.log.warn("Background jobs will NOT start until database is available");
      app.log.warn("Service is running but degraded - fix database connection and restart");
    } else {
      app.log.info(`✅ Database connected (latency: ${dbHealth.latencyMs}ms)`);

      // Start market sync job (runs every 15 minutes) - PRIORITY: populates market data
      app.log.info("Starting market sync job...");
      marketSyncInterval = scheduleMarketSync(15 * 60 * 1000); // 15 minutes

      // Start wallet sync job (runs every hour)
      app.log.info("Starting wallet sync job...");
      walletSyncInterval = scheduleWalletSync(60 * 60 * 1000); // 1 hour

      // Start UMA dispute sync job (runs every 5 minutes)
      app.log.info("Starting UMA dispute sync job...");
      umaSyncInterval = scheduleUMADisputeSync(5 * 60 * 1000); // 5 minutes

      // Start best bets signal generation (runs every 10 minutes)
      app.log.info("Starting best bets signal generation...");
      signalGenInterval = scheduleSignalGeneration(10 * 60 * 1000); // 10 minutes

      // Start real Polymarket trader sync (runs every 30 minutes)
      app.log.info("Starting real Polymarket trader sync...");
      realTraderSyncInterval = scheduleRealTraderSync(30 * 60 * 1000); // 30 minutes

      // Start real-time WebSocket service - DISABLED (service file deleted)
      // app.log.info("Starting real-time WebSocket service...");
      // try {
      //   await realtimePolymarket.start();
      //   app.log.info("✅ Real-time WebSocket service started successfully");
      // } catch (err) {
      //   app.log.error({ err }, "Failed to start real-time WebSocket service");
      //   // Continue even if WebSocket fails - it's not critical for basic functionality
      // }
    } // end of database connected block

    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
      app.log.info(`${signal} received. Shutting down gracefully...`);
      
      // Stop real-time service - DISABLED (service deleted)
      // if (realtimePolymarket.isServiceRunning()) {
      //   app.log.info("Stopping real-time WebSocket service...");
      //   realtimePolymarket.stop();
      // }
      
      // Clear scheduled jobs
      if (marketSyncInterval) clearInterval(marketSyncInterval);
      if (walletSyncInterval) clearInterval(walletSyncInterval);
      if (umaSyncInterval) clearInterval(umaSyncInterval);
      if (signalGenInterval) clearInterval(signalGenInterval);
      if (realTraderSyncInterval) clearInterval(realTraderSyncInterval);
      
      // Close server (stop accepting new connections)
      try {
        await app.close();
        app.log.info("Server closed successfully");
        process.exit(0);
      } catch (err) {
        app.log.error(err, "Error during shutdown");
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
