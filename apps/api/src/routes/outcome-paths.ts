import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, markets } from "@polybuddy/db";
import { eq } from "drizzle-orm";
import { analyzeOutcomePaths } from "../services/outcome-paths.js";

// ============================================================================
// SCHEMAS
// ============================================================================

const OutcomePatternSchema = z.object({
  patternName: z.string(),
  frequencyPercent: z.number(),
  description: z.string(),
  retailImplication: z.string(),
});

const OutcomePathAnalysisSchema = z.object({
  marketId: z.string(),
  clusterType: z.string(),
  patterns: z.array(OutcomePatternSchema),
  summary: z.object({
    mostCommonPath: z.string(),
    retailTrapFrequency: z.number(),
    keyTiming: z.string(),
  }),
  recommendations: z.array(z.string()),
});

// ============================================================================
// ROUTES
// ============================================================================

export const outcomePathsRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/markets/:id/outcome-paths
  typedApp.get(
    "/:id/outcome-paths",
    {
      schema: {
        description: "Get outcome path analysis for a market",
        tags: ["outcome-paths"],
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: OutcomePathAnalysisSchema,
          404: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      // Cache for 6 hours (patterns don't change frequently)
      reply.header("Cache-Control", "public, max-age=21600");

      // Fetch market details
      const market = await db.query.markets.findFirst({
        where: eq(markets.id, id),
      });

      if (!market) {
        return reply.status(404).send({
          error: "Market not found",
        });
      }

      // Analyze outcome paths
      const analysis = await analyzeOutcomePaths(
        market.id,
        market.category,
        market.question
      );

      return analysis;
    }
  );
};


