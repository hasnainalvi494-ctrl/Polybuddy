import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

// Import routes
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { marketsRoutes } from "./routes/markets.js";
import { signalsRoutes } from "./routes/signals.js";
import { retailSignalsRoutes } from "./routes/retail-signals.js";
import { whaleFeedRoutes } from "./routes/whale-feed.js";
import { watchlistsRoutes } from "./routes/watchlists.js";
import { alertsRoutes } from "./routes/alerts.js";
import { portfolioRoutes } from "./routes/portfolio.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { leaderboardRoutes } from "./routes/leaderboard.js";
import { telegramRoutes } from "./routes/telegram.js";
import { aiAnalysisRoutes } from "./routes/ai-analysis.js";
import { outcomePathsRoutes } from "./routes/outcome-paths.js";
import { timingWindowsRoutes } from "./routes/timing-windows.js";
import { crossPlatformRoutes } from "./routes/cross-platform.js";
import { umaDisputesRoutes } from "./routes/disputes.js";
import { orderbookRoutes } from "./routes/orderbook.js";
import { slippageRoutes } from "./routes/slippage.js";
import { arbitrageRoutes } from "./routes/arbitrage.js";
import { priceHistoryRoutes } from "./routes/price-history.js";
import { similarHistoryRoutes } from "./routes/similar-history.js";
import { statsRoutes } from "./routes/stats.js";
import { dailyRoutes } from "./routes/daily.js";
import { reportsRoutes } from "./routes/reports.js";

const PORT = parseInt(process.env.PORT || "3001", 10);
const HOST = process.env.HOST || "0.0.0.0";

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    transport:
      process.env.NODE_ENV !== "production"
        ? {
            target: "pino-pretty",
            options: {
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          }
        : undefined,
  },
}).withTypeProvider<TypeBoxTypeProvider>();

// Register plugins
await app.register(helmet, {
  contentSecurityPolicy: false,
});

await app.register(cors, {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
});

await app.register(cookie, {
  secret: process.env.COOKIE_SECRET || "change-this-secret-in-production",
});

// Register routes
await app.register(healthRoutes, { prefix: "/health" });
await app.register(authRoutes, { prefix: "/api/auth" });
await app.register(marketsRoutes, { prefix: "/api/markets" });
await app.register(signalsRoutes, { prefix: "/api/signals" });
await app.register(retailSignalsRoutes, { prefix: "/api/retail-signals" });
await app.register(whaleFeedRoutes, { prefix: "/api/whale-feed" });
await app.register(watchlistsRoutes, { prefix: "/api/watchlists" });
await app.register(alertsRoutes, { prefix: "/api/alerts" });
await app.register(portfolioRoutes, { prefix: "/api/portfolio" });
await app.register(analyticsRoutes, { prefix: "/api/analytics" });
await app.register(leaderboardRoutes, { prefix: "/api/leaderboard" });
await app.register(telegramRoutes, { prefix: "/api/telegram" });
await app.register(aiAnalysisRoutes, { prefix: "/api/ai-analysis" });
await app.register(outcomePathsRoutes, { prefix: "/api/outcome-paths" });
await app.register(timingWindowsRoutes, { prefix: "/api/timing-windows" });
await app.register(crossPlatformRoutes, { prefix: "/api/cross-platform" });
await app.register(umaDisputesRoutes, { prefix: "/api/disputes" });
await app.register(orderbookRoutes, { prefix: "/api/orderbook" });
await app.register(slippageRoutes, { prefix: "/api/slippage" });
await app.register(arbitrageRoutes, { prefix: "/api/arbitrage" });
await app.register(priceHistoryRoutes, { prefix: "/api/price-history" });
await app.register(similarHistoryRoutes, { prefix: "/api/similar-history" });
await app.register(statsRoutes, { prefix: "/api/stats" });
await app.register(dailyRoutes, { prefix: "/api/daily" });
await app.register(reportsRoutes, { prefix: "/api/reports" });

// Start server
try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`Server listening on ${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
