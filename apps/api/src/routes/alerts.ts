import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, alerts, markets, notifications, marketSnapshots, retailSignals } from "@polybuddy/db";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

// All alert types including retail signals
const AlertTypeEnum = z.enum([
  "price_move",
  "volume_spike",
  "liquidity_drop",
  "resolution_approaching",
  "favorable_structure",
  "structural_mispricing",
  "crowd_chasing",
  "event_window",
  "retail_friendly",
]);

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
  z.object({
    type: z.literal("resolution_approaching"),
    hoursBeforeEnd: z.number().min(1).max(168), // 1h to 1 week
  }),
  // Retail signal alert conditions
  z.object({
    type: z.literal("favorable_structure"),
    minConfidence: z.enum(["low", "medium", "high"]).default("medium"),
  }),
  z.object({
    type: z.literal("structural_mispricing"),
    minConfidence: z.enum(["low", "medium", "high"]).default("medium"),
  }),
  z.object({
    type: z.literal("crowd_chasing"),
    minConfidence: z.enum(["low", "medium", "high"]).default("low"), // Default low to catch early
  }),
  z.object({
    type: z.literal("event_window"),
    minConfidence: z.enum(["low", "medium", "high"]).default("medium"),
  }),
  z.object({
    type: z.literal("retail_friendly"),
    minConfidence: z.enum(["low", "medium", "high"]).default("medium"),
  }),
]);

const AlertSchema = z.object({
  id: z.string().uuid(),
  marketId: z.string().uuid(),
  marketQuestion: z.string(),
  type: AlertTypeEnum,
  condition: AlertConditionSchema,
  status: z.enum(["active", "triggered", "dismissed"]),
  triggeredAt: z.string().nullable(),
  createdAt: z.string(),
});

const NotificationSchema = z.object({
  id: z.string().uuid(),
  alertId: z.string().uuid().nullable(),
  marketId: z.string().uuid().nullable(),
  type: AlertTypeEnum,
  title: z.string(),
  message: z.string(),
  marketQuestion: z.string().nullable(),
  read: z.boolean(),
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

  // =============================================
  // NOTIFICATIONS INBOX
  // =============================================

  // List notifications
  typedApp.get(
    "/notifications",
    {
      schema: {
        querystring: z.object({
          unreadOnly: z.coerce.boolean().default(false),
          limit: z.coerce.number().min(1).max(100).default(20),
        }),
        response: {
          200: z.object({
            notifications: z.array(NotificationSchema),
            unreadCount: z.number(),
          }),
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const user = await requireAuth(request, reply);
      if (!user) return;

      const { unreadOnly, limit } = request.query;

      const conditions = [eq(notifications.userId, user.id)];
      if (unreadOnly) {
        conditions.push(eq(notifications.read, false));
      }

      const [userNotifications, unreadResult] = await Promise.all([
        db
          .select({
            id: notifications.id,
            alertId: notifications.alertId,
            marketId: notifications.marketId,
            type: notifications.type,
            title: notifications.title,
            message: notifications.message,
            read: notifications.read,
            createdAt: notifications.createdAt,
            marketQuestion: markets.question,
          })
          .from(notifications)
          .leftJoin(markets, eq(notifications.marketId, markets.id))
          .where(and(...conditions))
          .orderBy(desc(notifications.createdAt))
          .limit(limit),
        db
          .select({ count: sql<number>`count(*)` })
          .from(notifications)
          .where(and(eq(notifications.userId, user.id), eq(notifications.read, false))),
      ]);

      return {
        notifications: userNotifications.map((n) => ({
          id: n.id,
          alertId: n.alertId,
          marketId: n.marketId,
          type: n.type,
          title: n.title,
          message: n.message,
          marketQuestion: n.marketQuestion || null,
          read: n.read ?? false,
          createdAt: n.createdAt?.toISOString() ?? "",
        })),
        unreadCount: Number(unreadResult[0]?.count ?? 0),
      };
    }
  );

  // Mark notification as read
  typedApp.post(
    "/notifications/:id/read",
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
      const user = await requireAuth(request, reply);
      if (!user) return;

      const { id } = request.params;

      const notification = await db.query.notifications.findFirst({
        where: and(eq(notifications.id, id), eq(notifications.userId, user.id)),
      });

      if (!notification) {
        return reply.status(404).send({ error: "Notification not found" });
      }

      await db
        .update(notifications)
        .set({ read: true, readAt: new Date() })
        .where(eq(notifications.id, id));

      return { success: true };
    }
  );

  // Mark all notifications as read
  typedApp.post(
    "/notifications/read-all",
    {
      schema: {
        response: {
          200: z.object({ success: z.boolean(), count: z.number() }),
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const user = await requireAuth(request, reply);
      if (!user) return;

      // Get count before update
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));
      const count = Number(countResult[0]?.count ?? 0);

      await db
        .update(notifications)
        .set({ read: true, readAt: new Date() })
        .where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));

      return { success: true, count };
    }
  );

  // Process alerts (called by cron or manually to check and trigger alerts)
  typedApp.post(
    "/process",
    {
      schema: {
        response: {
          200: z.object({
            processed: z.number(),
            triggered: z.number(),
          }),
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const user = await requireAuth(request, reply);
      if (!user) return;

      const now = new Date();
      let processed = 0;
      let triggered = 0;

      // Get all active alerts for this user with latest snapshot data
      const activeAlerts = await db
        .select({
          id: alerts.id,
          marketId: alerts.marketId,
          type: alerts.type,
          condition: alerts.condition,
          marketQuestion: markets.question,
          endDate: markets.endDate,
        })
        .from(alerts)
        .innerJoin(markets, eq(alerts.marketId, markets.id))
        .where(and(eq(alerts.userId, user.id), eq(alerts.status, "active")));

      // Get latest snapshots for these markets
      const marketIds = activeAlerts.map((a) => a.marketId);
      const latestSnapshots = marketIds.length > 0
        ? await db
            .select({
              marketId: marketSnapshots.marketId,
              price: marketSnapshots.price,
              volume24h: marketSnapshots.volume24h,
            })
            .from(marketSnapshots)
            .where(sql`${marketSnapshots.marketId} IN ${marketIds}`)
            .orderBy(desc(marketSnapshots.snapshotAt))
        : [];

      // Create a map of latest snapshots by market
      const snapshotMap = new Map<string, { price: string | null; volume24h: string | null }>();
      for (const snap of latestSnapshots) {
        if (!snapshotMap.has(snap.marketId)) {
          snapshotMap.set(snap.marketId, { price: snap.price, volume24h: snap.volume24h });
        }
      }

      for (const alert of activeAlerts) {
        processed++;
        const condition = alert.condition as z.infer<typeof AlertConditionSchema>;
        const snapshot = snapshotMap.get(alert.marketId);
        let shouldTrigger = false;
        let message = "";

        switch (condition.type) {
          case "price_move": {
            const price = snapshot?.price ? Number(snapshot.price) : null;
            if (price !== null) {
              if (condition.direction === "above" && price >= condition.threshold) {
                shouldTrigger = true;
                message = `Price moved above ${(condition.threshold * 100).toFixed(0)}% (now ${(price * 100).toFixed(1)}%)`;
              } else if (condition.direction === "below" && price <= condition.threshold) {
                shouldTrigger = true;
                message = `Price dropped below ${(condition.threshold * 100).toFixed(0)}% (now ${(price * 100).toFixed(1)}%)`;
              }
            }
            break;
          }

          case "volume_spike": {
            // Simulated - in production you'd compare to historical average
            const volume = snapshot?.volume24h ? Number(snapshot.volume24h) : 0;
            const avgVolume = 50000; // Would come from historical data
            if (volume > avgVolume * condition.multiplier) {
              shouldTrigger = true;
              message = `Volume spike detected: $${(volume / 1000).toFixed(1)}K (${condition.multiplier}x above average)`;
            }
            break;
          }

          case "resolution_approaching": {
            if (alert.endDate) {
              const hoursUntilEnd = (alert.endDate.getTime() - now.getTime()) / (1000 * 60 * 60);
              if (hoursUntilEnd > 0 && hoursUntilEnd <= condition.hoursBeforeEnd) {
                shouldTrigger = true;
                const timeStr = hoursUntilEnd < 1
                  ? `${Math.round(hoursUntilEnd * 60)} minutes`
                  : hoursUntilEnd < 24
                  ? `${Math.round(hoursUntilEnd)} hours`
                  : `${Math.round(hoursUntilEnd / 24)} days`;
                message = `Market resolves in ${timeStr}`;
              }
            }
            break;
          }

          case "liquidity_drop": {
            // Simulated - would need historical liquidity tracking
            break;
          }

          // Retail signal alert types - check if a matching signal exists
          case "favorable_structure":
          case "structural_mispricing":
          case "crowd_chasing":
          case "event_window":
          case "retail_friendly": {
            // Map retail_friendly to retail_friendliness signal type
            const signalType = condition.type === "retail_friendly"
              ? "retail_friendliness"
              : condition.type;

            // Check for recent matching signal
            const confidenceLevels = ["low", "medium", "high"];
            const minIndex = confidenceLevels.indexOf(condition.minConfidence || "medium");
            const validConfidences = confidenceLevels.slice(minIndex);

            const recentSignal = await db
              .select()
              .from(retailSignals)
              .where(
                and(
                  eq(retailSignals.marketId, alert.marketId),
                  eq(retailSignals.signalType, signalType),
                  gte(retailSignals.computedAt, new Date(now.getTime() - 4 * 60 * 60 * 1000)),
                  // For crowd chasing, trigger on unfavorable (warning)
                  // For others, trigger on favorable
                  condition.type === "crowd_chasing"
                    ? eq(retailSignals.isFavorable, false)
                    : eq(retailSignals.isFavorable, true)
                )
              )
              .orderBy(desc(retailSignals.computedAt))
              .limit(1);

            if (recentSignal.length > 0) {
              const signal = recentSignal[0]!;
              // Check confidence meets minimum
              if (validConfidences.includes(signal.confidence)) {
                shouldTrigger = true;
                message = signal.label;
              }
            }
            break;
          }
        }

        if (shouldTrigger) {
          triggered++;

          // Update alert status
          await db
            .update(alerts)
            .set({ status: "triggered", triggeredAt: now })
            .where(eq(alerts.id, alert.id));

          // Create notification
          await db.insert(notifications).values({
            userId: user.id,
            alertId: alert.id,
            marketId: alert.marketId,
            type: alert.type,
            title: getAlertTitle(condition.type),
            message,
            metadata: { condition, triggeredAt: now.toISOString() },
          });
        }
      }

      return { processed, triggered };
    }
  );
};

function getAlertTitle(type: string): string {
  switch (type) {
    case "price_move":
      return "Price Alert Triggered";
    case "volume_spike":
      return "Volume Spike Detected";
    case "resolution_approaching":
      return "Resolution Approaching";
    case "liquidity_drop":
      return "Liquidity Alert";
    // Retail signal alert titles
    case "favorable_structure":
      return "Favorable Market Structure";
    case "structural_mispricing":
      return "Structural Mispricing Detected";
    case "crowd_chasing":
      return "Crowd Chasing Warning";
    case "event_window":
      return "Event Window Opening";
    case "retail_friendly":
      return "Retail-Friendly Conditions";
    default:
      return "Alert Triggered";
  }
}
