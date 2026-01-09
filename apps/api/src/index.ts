import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";

// Import routes
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { marketsRoutes } from "./routes/markets.js";
import { signalsRoutes } from "./routes/signals.js";
import { retailSignalsRoutes } from "./routes/retail-signals.js";
// import { whaleFeedRoutes } from "./routes/whale-feed.js"; // Empty file
import { watchlistsRoutes } from "./routes/watchlists.js";
import { alertsRoutes } from "./routes/alerts.js";
import { portfolioRoutes } from "./routes/portfolio.js";
// import { analyticsRoutes } from "./routes/analytics.js"; // Temporarily disabled - missing schema exports
// import { leaderboardRoutes } from "./routes/leaderboard.js"; // Empty file
// import { telegramRoutes } from "./routes/telegram.js"; // Empty file
// import { aiAnalysisRoutes } from "./routes/ai-analysis.js"; // Empty file
// import { outcomePathsRoutes } from "./routes/outcome-paths.js"; // Empty file
// import { timingWindowsRoutes } from "./routes/timing-windows.js"; // Empty file
// import { crossPlatformRoutes } from "./routes/cross-platform.js"; // Empty file
// import { umaDisputesRoutes } from "./routes/disputes.js"; // Empty file
// import { orderbookRoutes } from "./routes/orderbook.js"; // Empty file
// import { slippageRoutes } from "./routes/slippage.js"; // Empty file
// import { arbitrageRoutes } from "./routes/arbitrage.js"; // Empty file
// import { priceHistoryRoutes } from "./routes/price-history.js"; // Empty file
// import { similarHistoryRoutes } from "./routes/similar-history.js"; // Empty file
// import { statsRoutes } from "./routes/stats.js"; // Empty file
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
}).withTypeProvider<ZodTypeProvider>();

// Set up Zod validation and serialization
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

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

// Root route
app.get("/", async () => {
  return {
    name: "Polybuddy API",
    version: "0.1.0",
    status: "running",
    endpoints: {
      health: "/health",
      ready: "/ready",
      auth: "/api/auth/*",
      markets: "/api/markets/*",
      signals: "/api/signals/*",
      watchlists: "/api/watchlists/*",
      alerts: "/api/alerts/*",
      portfolio: "/api/portfolio/*",
      daily: "/api/daily/*",
      reports: "/api/reports/*",
    },
  };
});

// Register routes
await app.register(healthRoutes); // No prefix - routes define their own paths
await app.register(authRoutes, { prefix: "/api/auth" });
await app.register(marketsRoutes, { prefix: "/api/markets" });
await app.register(signalsRoutes, { prefix: "/api/signals" });
await app.register(retailSignalsRoutes, { prefix: "/api/retail-signals" });
// await app.register(whaleFeedRoutes, { prefix: "/api/whale-feed" }); // Empty file
await app.register(watchlistsRoutes, { prefix: "/api/watchlists" });
await app.register(alertsRoutes, { prefix: "/api/alerts" });
await app.register(portfolioRoutes, { prefix: "/api/portfolio" });
// await app.register(analyticsRoutes, { prefix: "/api/analytics" }); // Temporarily disabled - missing schema
// await app.register(leaderboardRoutes, { prefix: "/api/leaderboard" }); // Empty file
// await app.register(telegramRoutes, { prefix: "/api/telegram" }); // Empty file
// await app.register(aiAnalysisRoutes, { prefix: "/api/ai-analysis" }); // Empty file
// await app.register(outcomePathsRoutes, { prefix: "/api/outcome-paths" }); // Empty file
// await app.register(timingWindowsRoutes, { prefix: "/api/timing-windows" }); // Empty file
// await app.register(crossPlatformRoutes, { prefix: "/api/cross-platform" }); // Empty file
// await app.register(umaDisputesRoutes, { prefix: "/api/disputes" }); // Empty file
// await app.register(orderbookRoutes, { prefix: "/api/orderbook" }); // Empty file
// await app.register(slippageRoutes, { prefix: "/api/slippage" }); // Empty file
// await app.register(arbitrageRoutes, { prefix: "/api/arbitrage" }); // Empty file
// await app.register(priceHistoryRoutes, { prefix: "/api/price-history" }); // Empty file
// await app.register(similarHistoryRoutes, { prefix: "/api/similar-history" }); // Empty file
// await app.register(statsRoutes, { prefix: "/api/stats" }); // Empty file
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
