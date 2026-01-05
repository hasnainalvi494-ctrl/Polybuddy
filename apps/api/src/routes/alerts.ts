import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, alerts, markets } from "@polybuddy/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const AlertConditionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("price_move"),
    direction: z.enum(["above", "below"]),
    threshold: z.number().min(0).max(1),
  }),
  z.object({
    type: z.literal("volume_spike"),
    multiplier: z.number().min(1),
    timeWindow: z.number(),
  }),
  z.object({
    type: z.literal("liquidity_drop"),
    dropPercent: z.number().min(0).max(100),
    timeWindow: z.number(),
  }),
]);

const AlertSchema = z.object({
  id: z.string().uuid(),
  marketId: z.string().uuid(),
  marketQuestion: z.string(),
  type: z.enum(["price_move", "volume_spike", "liquidity_drop"]),
  condition: AlertConditionSchema,
  status: z.enum(["active", "triggered", "dismissed"]),
  triggeredAt: z.string().nullable(),
  createdAt: z.string(),
});

const CreateAlertSchema = z.object({
  marketId: z.string().uuid(),
  condition: AlertConditionSchema,
});

export const alertsRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // List user's alerts
  typedApp.get(
    "/",
    {
      schema: {
        querystring: z.object({
          status: z.enum(["active", "triggered", "dismissed", "all"]).default("all"),
        }),
        response: {
          200: z.array(AlertSchema),
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const user = await requireAuth(request, reply);
      if (!user) return;

      const userId = user.id;
      const { status } = request.query;

      const conditions = [eq(alerts.userId, userId)];
      if (status !== "all") {
        conditions.push(eq(alerts.status, status));
      }

      const userAlerts = await db
        .select({
          id: alerts.id,
          marketId: alerts.marketId,
          type: alerts.type,
          condition: alerts.condition,
          status: alerts.status,
          triggeredAt: alerts.triggeredAt,
          createdAt: alerts.createdAt,
          marketQuestion: markets.question,
        })
        .from(alerts)
        .innerJoin(markets, eq(alerts.marketId, markets.id))
        .where(and(...conditions))
        .orderBy(desc(alerts.createdAt));

      return userAlerts.map((a) => ({
        id: a.id,
        marketId: a.marketId,
        marketQuestion: a.marketQuestion,
        type: a.type,
        condition: a.condition as z.infer<typeof AlertConditionSchema>,
        status: a.status ?? "active",
        triggeredAt: a.triggeredAt?.toISOString() ?? null,
        createdAt: a.createdAt?.toISOString() ?? "",
      }));
    }
  );

  // Create alert
  typedApp.post(
    "/",
    {
      schema: {
        body: CreateAlertSchema,
        response: {
          201: AlertSchema,
          401: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const user = await requireAuth(request, reply);
      if (!user) return;

      const userId = user.id;
      const { marketId, condition } = request.body;

      // Check market exists
      const market = await db.query.markets.findFirst({
        where: eq(markets.id, marketId),
      });

      if (!market) {
        return reply.status(404).send({ error: `Market ${marketId} not found` });
      }

      const [newAlert] = await db
        .insert(alerts)
        .values({
          userId,
          marketId,
          type: condition.type,
          condition,
          status: "active",
        })
        .returning();

      return reply.status(201).send({
        id: newAlert!.id,
        marketId: newAlert!.marketId,
        marketQuestion: market.question,
        type: newAlert!.type,
        condition: condition,
        status: newAlert!.status ?? "active",
        triggeredAt: newAlert!.triggeredAt?.toISOString() ?? null,
        createdAt: newAlert!.createdAt?.toISOString() ?? "",
      });
    }
  );

  // Get single alert
  typedApp.get(
    "/:id",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: AlertSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const [alert] = await db
        .select({
          id: alerts.id,
          marketId: alerts.marketId,
          type: alerts.type,
          condition: alerts.condition,
          status: alerts.status,
          triggeredAt: alerts.triggeredAt,
          createdAt: alerts.createdAt,
          marketQuestion: markets.question,
        })
        .from(alerts)
        .innerJoin(markets, eq(alerts.marketId, markets.id))
        .where(eq(alerts.id, id))
        .limit(1);

      if (!alert) {
        return reply.status(404).send({ error: `Alert ${id} not found` });
      }

      return {
        id: alert.id,
        marketId: alert.marketId,
        marketQuestion: alert.marketQuestion,
        type: alert.type,
        condition: alert.condition as z.infer<typeof AlertConditionSchema>,
        status: alert.status ?? "active",
        triggeredAt: alert.triggeredAt?.toISOString() ?? null,
        createdAt: alert.createdAt?.toISOString() ?? "",
      };
    }
  );

  // Dismiss alert
  typedApp.post(
    "/:id/dismiss",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({ success: z.boolean() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const alert = await db.query.alerts.findFirst({
        where: eq(alerts.id, id),
      });

      if (!alert) {
        return reply.status(404).send({ error: `Alert ${id} not found` });
      }

      await db
        .update(alerts)
        .set({ status: "dismissed" })
        .where(eq(alerts.id, id));

      return { success: true };
    }
  );

  // Delete alert
  typedApp.delete(
    "/:id",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({ success: z.boolean() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const alert = await db.query.alerts.findFirst({
        where: eq(alerts.id, id),
      });

      if (!alert) {
        return reply.status(404).send({ error: `Alert ${id} not found` });
      }

      await db.delete(alerts).where(eq(alerts.id, id));

      return { success: true };
    }
  );
};
