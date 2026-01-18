import type { FastifyPluginAsync } from "fastify";
import { db } from "@polybuddy/db";
import { sql } from "drizzle-orm";

// Database health check function
async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    // Simple query to verify database connectivity
    await db.execute(sql`SELECT 1`);
    return {
      connected: true,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      connected: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

export const healthRoutes: FastifyPluginAsync = async (app) => {
  // Basic liveness check - just confirms the server is running
  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // Readiness check - confirms the service can handle requests
  app.get("/ready", async (request, reply) => {
    const dbHealth = await checkDatabaseHealth();

    if (!dbHealth.connected) {
      return reply.status(503).send({
        status: "not_ready",
        timestamp: new Date().toISOString(),
        checks: {
          database: {
            status: "unhealthy",
            latencyMs: dbHealth.latencyMs,
            error: dbHealth.error,
          },
        },
      });
    }

    return {
      status: "ready",
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: "healthy",
          latencyMs: dbHealth.latencyMs,
        },
      },
    };
  });

  // Detailed health check endpoint for monitoring
  app.get("/health/detailed", async () => {
    const dbHealth = await checkDatabaseHealth();

    return {
      status: dbHealth.connected ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      checks: {
        database: {
          status: dbHealth.connected ? "healthy" : "unhealthy",
          latencyMs: dbHealth.latencyMs,
          error: dbHealth.error,
        },
      },
    };
  });
};

// Export the database health check for use in job startup
export { checkDatabaseHealth };
