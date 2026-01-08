import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  getActiveDisputes,
  getDisputeForMarket,
  getDisputeHistory,
} from "../services/uma-disputes.js";

// ============================================================================
// SCHEMAS
// ============================================================================

const DisputeSchema = z.object({
  id: z.string(),
  marketId: z.string(),
  disputeStatus: z.enum(["commit_stage", "reveal_stage", "resolved"]),
  proposedOutcome: z.string().nullable(),
  disputedOutcome: z.string().nullable(),
  totalVotes: z.number(),
  yesVotes: z.number(),
  noVotes: z.number(),
  votingEndsAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  market: z.object({
    id: z.string(),
    polymarketId: z.string(),
    question: z.string(),
    category: z.string().nullable(),
    endDate: z.string().nullable(),
  }).optional(),
});

const DisputeHistorySchema = z.object({
  id: z.string(),
  marketId: z.string(),
  resolutionFlipped: z.boolean(),
  originalOutcome: z.string().nullable(),
  finalOutcome: z.string().nullable(),
  resolvedAt: z.string(),
});

// ============================================================================
// ROUTES
// ============================================================================

export const disputesRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/disputes - Get all active disputes
  typedApp.get(
    "/",
    {
      schema: {
        description: "Get all active UMA disputes",
        tags: ["disputes"],
        response: {
          200: z.object({
            disputes: z.array(DisputeSchema),
            count: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const disputes = await getActiveDisputes();

      return {
        disputes: disputes.map((d) => ({
          id: d.id,
          marketId: d.marketId,
          disputeStatus: d.disputeStatus,
          proposedOutcome: d.proposedOutcome,
          disputedOutcome: d.disputedOutcome,
          totalVotes: d.totalVotes || 0,
          yesVotes: d.yesVotes || 0,
          noVotes: d.noVotes || 0,
          votingEndsAt: d.votingEndsAt?.toISOString() || null,
          createdAt: d.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: d.updatedAt?.toISOString() || new Date().toISOString(),
          market: d.market ? {
            id: d.market.id,
            polymarketId: d.market.polymarketId,
            question: d.market.question,
            category: d.market.category,
            endDate: d.market.endDate?.toISOString() || null,
          } : undefined,
        })),
        count: disputes.length,
      };
    }
  );

  // GET /api/disputes/:marketId - Get dispute for specific market
  typedApp.get(
    "/:marketId",
    {
      schema: {
        description: "Get dispute for a specific market",
        tags: ["disputes"],
        params: z.object({
          marketId: z.string().uuid(),
        }),
        response: {
          200: z.object({
            dispute: DisputeSchema.nullable(),
          }),
          404: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { marketId } = request.params;

      const dispute = await getDisputeForMarket(marketId);

      if (!dispute) {
        return reply.status(404).send({
          error: "No dispute found for this market",
        });
      }

      return {
        dispute: {
          id: dispute.id,
          marketId: dispute.marketId,
          disputeStatus: dispute.disputeStatus,
          proposedOutcome: dispute.proposedOutcome,
          disputedOutcome: dispute.disputedOutcome,
          totalVotes: dispute.totalVotes || 0,
          yesVotes: dispute.yesVotes || 0,
          noVotes: dispute.noVotes || 0,
          votingEndsAt: dispute.votingEndsAt?.toISOString() || null,
          createdAt: dispute.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: dispute.updatedAt?.toISOString() || new Date().toISOString(),
          market: dispute.market ? {
            id: dispute.market.id,
            polymarketId: dispute.market.polymarketId,
            question: dispute.market.question,
            category: dispute.market.category,
            endDate: dispute.market.endDate?.toISOString() || null,
          } : undefined,
        },
      };
    }
  );

  // GET /api/disputes/history - Get historical disputes
  typedApp.get(
    "/history",
    {
      schema: {
        description: "Get historical dispute resolutions",
        tags: ["disputes"],
        querystring: z.object({
          limit: z.coerce.number().min(1).max(100).default(50),
        }),
        response: {
          200: z.object({
            history: z.array(DisputeHistorySchema),
            count: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { limit } = request.query;

      const history = await getDisputeHistory(limit);

      return {
        history: history.map((h) => ({
          id: h.id,
          marketId: h.marketId,
          resolutionFlipped: h.resolutionFlipped,
          originalOutcome: h.originalOutcome,
          finalOutcome: h.finalOutcome,
          resolvedAt: h.resolvedAt?.toISOString() || new Date().toISOString(),
        })),
        count: history.length,
      };
    }
  );
};

