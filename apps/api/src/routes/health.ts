import type { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  app.get("/ready", async () => {
    // Add DB connectivity check here
    return { status: "ready", timestamp: new Date().toISOString() };
  });
};
