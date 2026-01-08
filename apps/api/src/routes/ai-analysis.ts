import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, markets } from "@polybuddy/db";
import { eq } from "drizzle-orm";
import { generateAIAnalysis } from "../services/ai-analysis.js";

// ============================================================================
// SCHEMAS
// ============================================================================

const AIAnalysisResponseSchema = z.object({
  marketId: z.string(),
  generatedAt: z.string(),
  probability_estimate: z.number(),
  confidence: z.enum(["Low", "Medium", "High"]),
  thesis: z.string(),
  counter_thesis: z.string(),
  key_factors: z.array(z.string()),
  what_could_go_wrong: z.array(z.string()),
  news_summary: z.string().optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

export const aiAnalysisRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/markets/:id/analysis
  typedApp.get(
    "/:id/analysis",
    {
      schema: {
        description: "Get AI-powered analysis for a market",
        tags: ["ai-analysis"],
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: AIAnalysisResponseSchema,
          404: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      // Cache for 1 hour (AI analysis doesn't need to be real-time)
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

      // Generate AI analysis
      const analysis = await generateAIAnalysis(
        market.id,
        market.question,
        market.currentPrice ? parseFloat(market.currentPrice) : null
      );

      return analysis;
    }
  );
};

