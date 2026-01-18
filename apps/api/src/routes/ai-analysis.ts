import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, markets } from "@polybuddy/db";
import { eq, sql } from "drizzle-orm";
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

      // Fetch market details with current price
      const marketData = await db.execute(sql`
        SELECT
          m.*,
          COALESCE(
            (m.metadata->>'currentPrice')::numeric,
            (SELECT price FROM market_snapshots WHERE market_id = m.id ORDER BY snapshot_at DESC LIMIT 1),
            0.50
          ) as current_price
        FROM markets m
        WHERE m.id = ${id}
      `);

      if (marketData.length === 0) {
        return reply.status(404).send({
          error: "Market not found",
        });
      }

      const market = marketData[0]!;

      // Generate AI analysis
      const analysis = await generateAIAnalysis(
        market.id as string,
        market.question as string,
        market.current_price ? parseFloat(market.current_price.toString()) : null
      );

      return analysis;
    }
  );
};


