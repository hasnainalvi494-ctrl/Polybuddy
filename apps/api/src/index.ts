import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { logger } from "./lib/logger.js";
import { authRoutes } from "./routes/auth.js";
import { marketsRoutes } from "./routes/markets.js";
import { watchlistsRoutes } from "./routes/watchlists.js";
import { alertsRoutes } from "./routes/alerts.js";
import { portfolioRoutes } from "./routes/portfolio.js";
import { healthRoutes } from "./routes/health.js";
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
import { scheduleWalletSync } from "./jobs/sync-wallets.js";
import { scheduleUMADisputeSync } from "./services/uma-disputes.js";

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";

async function buildApp() {
  const app = Fastify({
    logger,
  });

  // Zod validation
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Security
  await app.register(helmet);
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(",") || [
      "http://localhost:3000",
      "http://localhost:3002",
      "http://localhost:3003",
    ],
    credentials: true,
  });
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || "polybuddy-secret-key-change-in-production",
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
  await app.register(disputesRoutes, { prefix: "/api/disputes" });
  await app.register(telegramRoutes, { prefix: "/api/telegram" });

  return app;
}

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Server running at http://${HOST}:${PORT}`);
    app.log.info(`API docs at http://${HOST}:${PORT}/docs`);

    // Start wallet sync job (runs every hour)
    app.log.info("Starting wallet sync job...");
    scheduleWalletSync(60 * 60 * 1000); // 1 hour

    // Start UMA dispute sync job (runs every 5 minutes)
    app.log.info("Starting UMA dispute sync job...");
    scheduleUMADisputeSync(5 * 60 * 1000); // 5 minutes
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
