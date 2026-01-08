import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, markets } from "@polybuddy/db";
import { eq } from "drizzle-orm";
import { analyzeTimingWindows } from "../services/timing-windows.js";

// ============================================================================
// SCHEMAS
// ============================================================================

const TimingWindowSchema = z.object({
  windowType: z.enum(["dead_zone", "danger_window", "final_positioning", "opportunity_window"]),
  startsAt: z.string(),
  endsAt: z.string(),
  reason: z.string(),
  retailGuidance: z.string(),
});

const CurrentTimingWindowSchema = z.object({
  marketId: z.string(),
  currentWindow: TimingWindowSchema.nullable(),
  upcomingWindows: z.array(TimingWindowSchema),
  timeUntilResolution: z.number().nullable(),
  guidance: z.object({
    shouldEnter: z.boolean(),
    shouldExit: z.boolean(),
    waitFor: z.string().nullable(),
    reasoning: z.string(),
  }),
});

// ============================================================================
// ROUTES
// ============================================================================

export const timingWindowsRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/markets/:id/timing
  typedApp.get(
    "/:id/timing",
    {
      schema: {
        description: "Get timing window analysis for a market",
        tags: ["timing-windows"],
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: CurrentTimingWindowSchema,
          404: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      // Cache for 1 hour (timing windows update as time passes)
      reply.header("Cache-Control", "public, max-age=3600");

      // Fetch market details
      const market = await db.query.markets.findFirst({
        where: eq(markets.id, id),
      });

      if (!market) {
        return reply.status(404).send({
          error: "Market not found",
        });
      }

      // Analyze timing windows
      const analysis = await analyzeTimingWindows(
        market.id,
        market.endDate,
        market.currentPrice ? parseFloat(market.currentPrice) : null,
        market.category
      );

      return analysis;
    }
  );
};

