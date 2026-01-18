import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { getCrossPlatformPrices } from "../services/cross-platform.js";

// ============================================================================
// SCHEMAS
// ============================================================================

const PlatformPriceSchema = z.object({
  platform: z.string(),
  yesPrice: z.number(),
  noPrice: z.number(),
  spread: z.number(),
  timestamp: z.string(),
});

const CrossPlatformComparisonSchema = z.object({
  marketId: z.string(),
  platforms: z.array(PlatformPriceSchema),
  bestYesPrice: z.object({
    platform: z.string(),
    price: z.number(),
    savingsVsWorst: z.number(),
  }).nullable(),
  bestNoPrice: z.object({
    platform: z.string(),
    price: z.number(),
    savingsVsWorst: z.number(),
  }).nullable(),
  recommendation: z.string(),
});

// ============================================================================
// ROUTES
// ============================================================================

export const crossPlatformRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/markets/:id/cross-platform
  typedApp.get(
    "/:id/cross-platform",
    {
      schema: {
        description: "Get cross-platform price comparison for a market",
        tags: ["cross-platform"],
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: CrossPlatformComparisonSchema.nullable(),
          404: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      // Cache for 1 minute (prices update frequently)
      reply.header("Cache-Control", "public, max-age=60");

      const comparison = await getCrossPlatformPrices(id);

      if (!comparison) {
        return reply.status(404).send({
          error: "No cross-platform data available for this market",
        });
      }

      return comparison;
    }
  );
};


