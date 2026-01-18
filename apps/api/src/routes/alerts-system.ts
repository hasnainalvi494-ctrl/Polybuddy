import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "@polybuddy/db";
import { sql } from "drizzle-orm";

/**
 * Comprehensive Notification & Alerts System API
 * 
 * Real-time trading opportunity alerts with smart filtering
 */

// ============================================================================
// SCHEMAS
// ============================================================================

const AlertConditionsSchema = z.record(z.any());

const CreateAlertSchema = z.object({
  userAddress: z.string(),
  alertType: z.enum([
    'best_bet', 'elite_trader', 'price_alert', 'arbitrage',
    'risk_management', 'whale_activity', 'pattern_match',
    'market_resolution', 'position_alert', 'portfolio_alert'
  ]),
  alertName: z.string().min(1).max(200),
  description: z.string().optional(),
  conditions: AlertConditionsSchema,
  
  // Optional targeting
  marketId: z.string().uuid().optional(),
  traderAddress: z.string().optional(),
  
  // Thresholds
  priceThreshold: z.number().min(0).max(1).optional(),
  priceDirection: z.enum(['above', 'below', 'crosses']).optional(),
  volumeThreshold: z.number().positive().optional(),
  confidenceThreshold: z.number().min(0).max(100).optional(),
  riskThreshold: z.number().min(0).max(100).optional(),
  
  // Priority and scheduling
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  
  // Time-based scheduling
  scheduleEnabled: z.boolean().default(false),
  scheduleStartTime: z.string().optional(), // HH:MM:SS
  scheduleEndTime: z.string().optional(),
  scheduleDays: z.array(z.number().min(0).max(6)).optional(),
  
  // Notification channels
  notifyInApp: z.boolean().default(true),
  notifyPush: z.boolean().default(false),
  notifyEmail: z.boolean().default(false),
  notifyTelegram: z.boolean().default(false),
  
  // Limits
  maxTriggersPerDay: z.number().positive().default(10),
  cooldownMinutes: z.number().positive().default(60),
  
  // Expiration
  expiresAt: z.string().datetime().optional(),
});

const UpdateAlertSchema = CreateAlertSchema.partial().omit({ userAddress: true });

const TriggerAlertManuallySchema = z.object({
  title: z.string(),
  message: z.string(),
  triggerReason: z.string(),
  triggerData: z.record(z.any()).optional(),
});

const MarkReadSchema = z.object({
  triggerIds: z.array(z.string().uuid()),
});

const FeedbackSchema = z.object({
  wasAccurate: z.boolean(),
  userRating: z.number().min(1).max(5).optional(),
  actionTaken: z.enum(['viewed', 'traded', 'ignored', 'snoozed']).optional(),
});

const NotificationPreferencesSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().optional(), // HH:MM:SS
  quietHoursEnd: z.string().optional(),
  
  inAppEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  telegramEnabled: z.boolean().optional(),
  
  emailAddress: z.string().email().optional(),
  telegramChatId: z.string().optional(),
  
  minPriority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  criticalOnlyQuietHours: z.boolean().optional(),
  
  alertTypePreferences: z.record(z.boolean()).optional(),
  
  maxAlertsPerHour: z.number().positive().optional(),
  maxAlertsPerDay: z.number().positive().optional(),
  
  dailyDigestEnabled: z.boolean().optional(),
  dailyDigestTime: z.string().optional(),
});

export async function alertsSystemRoutes(app: FastifyInstance) {
  
  // ==========================================================================
  // ALERT MANAGEMENT
  // ==========================================================================
  
  /**
   * GET /api/alerts-system
   * Get all alerts for a user
   */
  app.get<{
    Querystring: {
      userAddress: string;
      alertType?: string;
      isActive?: boolean;
      priority?: string;
    };
  }>(
    "/api/alerts-system",
    {
      schema: {
        querystring: z.object({
          userAddress: z.string(),
          alertType: z.string().optional(),
          isActive: z.coerce.boolean().optional(),
          priority: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { userAddress, alertType, isActive, priority } = request.query;

      try {
        let query = sql`
          SELECT 
            a.*,
            COUNT(at.id) FILTER (WHERE at.triggered_at > NOW() - INTERVAL '24 hours') as triggers_last_24h,
            COUNT(at.id) FILTER (WHERE at.read_at IS NULL) as unread_triggers
          FROM alerts a
          LEFT JOIN alert_triggers at ON a.id = at.alert_id
          WHERE a.user_address = ${userAddress}
        `;

        if (alertType) {
          query = sql`${query} AND a.alert_type = ${alertType}`;
        }

        if (isActive !== undefined) {
          query = sql`${query} AND a.is_active = ${isActive}`;
        }

        if (priority) {
          query = sql`${query} AND a.priority = ${priority}`;
        }

        query = sql`${query}
          GROUP BY a.id
          ORDER BY 
            CASE a.priority
              WHEN 'critical' THEN 1
              WHEN 'high' THEN 2
              WHEN 'medium' THEN 3
              WHEN 'low' THEN 4
            END,
            a.created_at DESC
        `;

        const result = await db.execute(query);

        const alerts = result.map((row: any) => ({
          id: row.id,
          alertType: row.alert_type,
          alertName: row.alert_name,
          description: row.description,
          conditions: row.conditions,
          marketId: row.market_id,
          traderAddress: row.trader_address,
          priceThreshold: row.price_threshold ? parseFloat(row.price_threshold) : null,
          priceDirection: row.price_direction,
          volumeThreshold: row.volume_threshold ? parseFloat(row.volume_threshold) : null,
          confidenceThreshold: row.confidence_threshold ? parseFloat(row.confidence_threshold) : null,
          riskThreshold: row.risk_threshold ? parseFloat(row.risk_threshold) : null,
          priority: row.priority,
          isActive: row.is_active,
          scheduleEnabled: row.schedule_enabled,
          scheduleStartTime: row.schedule_start_time,
          scheduleEndTime: row.schedule_end_time,
          scheduleDays: row.schedule_days,
          notifyInApp: row.notify_in_app,
          notifyPush: row.notify_push,
          notifyEmail: row.notify_email,
          notifyTelegram: row.notify_telegram,
          maxTriggersPerDay: parseInt(row.max_triggers_per_day),
          cooldownMinutes: parseInt(row.cooldown_minutes),
          triggerCount: parseInt(row.trigger_count),
          lastTriggeredAt: row.last_triggered_at,
          triggersLast24h: parseInt(row.triggers_last_24h || 0),
          unreadTriggers: parseInt(row.unread_triggers || 0),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          expiresAt: row.expires_at,
        }));

        return reply.send({ alerts, total: alerts.length });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({ error: "Failed to fetch alerts" });
      }
    }
  );

  /**
   * POST /api/alerts-system
   * Create a new alert
   */
  app.post<{
    Body: z.infer<typeof CreateAlertSchema>;
  }>(
    "/api/alerts-system",
    {
      schema: {
        body: CreateAlertSchema,
      },
    },
    async (request, reply) => {
      const alertData = request.body;

      try {
        const result = await db.execute(sql`
          INSERT INTO alerts (
            user_address, alert_type, alert_name, description, conditions,
            market_id, trader_address,
            price_threshold, price_direction, volume_threshold,
            confidence_threshold, risk_threshold,
            priority, schedule_enabled, schedule_start_time, schedule_end_time, schedule_days,
            notify_in_app, notify_push, notify_email, notify_telegram,
            max_triggers_per_day, cooldown_minutes, expires_at
          ) VALUES (
            ${alertData.userAddress}, ${alertData.alertType}, ${alertData.alertName},
            ${alertData.description || null}, ${JSON.stringify(alertData.conditions)},
            ${alertData.marketId || null}, ${alertData.traderAddress || null},
            ${alertData.priceThreshold || null}, ${alertData.priceDirection || null},
            ${alertData.volumeThreshold || null}, ${alertData.confidenceThreshold || null},
            ${alertData.riskThreshold || null}, ${alertData.priority},
            ${alertData.scheduleEnabled}, ${alertData.scheduleStartTime || null},
            ${alertData.scheduleEndTime || null}, 
            ${alertData.scheduleDays ? `{${alertData.scheduleDays.join(',')}}` : null},
            ${alertData.notifyInApp}, ${alertData.notifyPush},
            ${alertData.notifyEmail}, ${alertData.notifyTelegram},
            ${alertData.maxTriggersPerDay}, ${alertData.cooldownMinutes},
            ${alertData.expiresAt || null}
          )
          RETURNING *
        `);

        const alert = result[0];

        if (!alert) {
          return reply.code(500).send({ error: "Failed to create alert" });
        }

        return reply.code(201).send({
          success: true,
          alertId: alert.id,
          message: "Alert created successfully",
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({ error: "Failed to create alert" });
      }
    }
  );

  /**
   * PUT /api/alerts-system/:id
   * Update an existing alert
   */
  app.put<{
    Params: { id: string };
    Body: z.infer<typeof UpdateAlertSchema>;
  }>(
    "/api/alerts-system/:id",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: UpdateAlertSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const updates = request.body;

      try {
        // Build dynamic update query
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (updates.alertName !== undefined) {
          setClauses.push(`alert_name = $${paramIndex++}`);
          values.push(updates.alertName);
        }
        if (updates.description !== undefined) {
          setClauses.push(`description = $${paramIndex++}`);
          values.push(updates.description);
        }
        if (updates.conditions !== undefined) {
          setClauses.push(`conditions = $${paramIndex++}`);
          values.push(JSON.stringify(updates.conditions));
        }
        if (updates.priority !== undefined) {
          setClauses.push(`priority = $${paramIndex++}`);
          values.push(updates.priority);
        }
        if (updates.priceThreshold !== undefined) {
          setClauses.push(`price_threshold = $${paramIndex++}`);
          values.push(updates.priceThreshold);
        }
        if (updates.notifyInApp !== undefined) {
          setClauses.push(`notify_in_app = $${paramIndex++}`);
          values.push(updates.notifyInApp);
        }
        if (updates.notifyTelegram !== undefined) {
          setClauses.push(`notify_telegram = $${paramIndex++}`);
          values.push(updates.notifyTelegram);
        }

        setClauses.push(`updated_at = NOW()`);

        if (setClauses.length === 1) {
          return reply.code(400).send({ error: "No valid fields to update" });
        }

        values.push(id);
        const updateQuery = `
          UPDATE alerts
          SET ${setClauses.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING *
        `;

        const result = await db.execute(sql.unsafe(updateQuery));

        if (result.length === 0) {
          return reply.code(404).send({ error: "Alert not found" });
        }

        return reply.send({
          success: true,
          message: "Alert updated successfully",
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({ error: "Failed to update alert" });
      }
    }
  );

  /**
   * DELETE /api/alerts-system/:id
   * Delete an alert
   */
  app.delete<{
    Params: { id: string };
  }>(
    "/api/alerts-system/:id",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const result = await db.execute(sql`
          DELETE FROM alerts WHERE id = ${id} RETURNING id
        `);

        if (result.length === 0) {
          return reply.code(404).send({ error: "Alert not found" });
        }

        return reply.send({
          success: true,
          message: "Alert deleted successfully",
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({ error: "Failed to delete alert" });
      }
    }
  );

  /**
   * POST /api/alerts-system/:id/toggle
   * Toggle alert active status
   */
  app.post<{
    Params: { id: string };
  }>(
    "/api/alerts-system/:id/toggle",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const result = await db.execute(sql`
          UPDATE alerts
          SET is_active = NOT is_active, updated_at = NOW()
          WHERE id = ${id}
          RETURNING is_active
        `);

        if (result.length === 0) {
          return reply.code(404).send({ error: "Alert not found" });
        }

        return reply.send({
          success: true,
          isActive: result[0].is_active,
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({ error: "Failed to toggle alert" });
      }
    }
  );

  /**
   * POST /api/alerts-system/:id/trigger
   * Manually trigger an alert
   */
  app.post<{
    Params: { id: string };
    Body: z.infer<typeof TriggerAlertManuallySchema>;
  }>(
    "/api/alerts-system/:id/trigger",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: TriggerAlertManuallySchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { title, message, triggerReason, triggerData } = request.body;

      try {
        const result = await db.execute(sql`
          SELECT trigger_alert(
            ${id}::uuid,
            ${title},
            ${message},
            ${triggerReason},
            ${JSON.stringify(triggerData || {})}::jsonb
          ) as trigger_id
        `);

        const triggerId = result[0]?.trigger_id;

        if (!triggerId) {
          return reply.code(400).send({
            error: "Alert could not be triggered (cooldown, limits, or inactive)",
          });
        }

        return reply.send({
          success: true,
          triggerId,
          message: "Alert triggered successfully",
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({ error: "Failed to trigger alert" });
      }
    }
  );

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================

  /**
   * GET /api/alerts-system/notifications
   * Get user notifications
   */
  app.get<{
    Querystring: {
      userAddress: string;
      unreadOnly?: boolean;
      priority?: string;
      limit?: number;
    };
  }>(
    "/api/alerts-system/notifications",
    {
      schema: {
        querystring: z.object({
          userAddress: z.string(),
          unreadOnly: z.coerce.boolean().optional(),
          priority: z.string().optional(),
          limit: z.coerce.number().positive().default(50),
        }),
      },
    },
    async (request, reply) => {
      const { userAddress, unreadOnly, priority, limit } = request.query;

      try {
        let query = sql`
          SELECT 
            at.*,
            a.alert_type,
            a.alert_name,
            EXTRACT(EPOCH FROM (NOW() - at.triggered_at)) / 60 as minutes_ago
          FROM alert_triggers at
          JOIN alerts a ON at.alert_id = a.id
          WHERE at.user_address = ${userAddress}
        `;

        if (unreadOnly) {
          query = sql`${query} AND at.read_at IS NULL`;
        }

        if (priority) {
          query = sql`${query} AND at.priority = ${priority}`;
        }

        query = sql`${query}
          ORDER BY 
            CASE at.priority
              WHEN 'critical' THEN 1
              WHEN 'high' THEN 2
              WHEN 'medium' THEN 3
              WHEN 'low' THEN 4
            END,
            at.triggered_at DESC
          LIMIT ${limit}
        `;

        const result = await db.execute(query);

        const notifications = result.map((row: any) => ({
          id: row.id,
          alertId: row.alert_id,
          alertType: row.alert_type,
          alertName: row.alert_name,
          title: row.title,
          message: row.message,
          priority: row.priority,
          triggerReason: row.trigger_reason,
          triggerData: row.trigger_data,
          triggeredAt: row.triggered_at,
          minutesAgo: Math.floor(parseFloat(row.minutes_ago)),
          readAt: row.read_at,
          clickedAt: row.clicked_at,
          actionTaken: row.action_taken,
          isRead: row.read_at !== null,
        }));

        const unreadCount = await db.execute(sql`
          SELECT COUNT(*) as count
          FROM alert_triggers
          WHERE user_address = ${userAddress} AND read_at IS NULL
        `);

        return reply.send({
          notifications,
          total: notifications.length,
          unreadCount: parseInt(unreadCount[0].count as string),
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({ error: "Failed to fetch notifications" });
      }
    }
  );

  /**
   * POST /api/alerts-system/notifications/mark-read
   * Mark notifications as read
   */
  app.post<{
    Body: z.infer<typeof MarkReadSchema>;
    Querystring: { userAddress: string };
  }>(
    "/api/alerts-system/notifications/mark-read",
    {
      schema: {
        body: MarkReadSchema,
        querystring: z.object({ userAddress: z.string() }),
      },
    },
    async (request, reply) => {
      const { triggerIds } = request.body;
      const { userAddress } = request.query;

      try {
        const result = await db.execute(sql`
          UPDATE alert_triggers
          SET read_at = NOW()
          WHERE id = ANY(${`{${triggerIds.join(',')}}`}::uuid[])
            AND user_address = ${userAddress}
            AND read_at IS NULL
          RETURNING id
        `);

        return reply.send({
          success: true,
          markedCount: result.length,
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({ error: "Failed to mark as read" });
      }
    }
  );

  /**
   * POST /api/alerts-system/notifications/:id/feedback
   * Provide feedback on notification accuracy
   */
  app.post<{
    Params: { id: string };
    Body: z.infer<typeof FeedbackSchema>;
  }>(
    "/api/alerts-system/notifications/:id/feedback",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: FeedbackSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { wasAccurate, userRating, actionTaken } = request.body;

      try {
        const result = await db.execute(sql`
          UPDATE alert_triggers
          SET 
            was_accurate = ${wasAccurate},
            user_rating = ${userRating || null},
            action_taken = ${actionTaken || null}
          WHERE id = ${id}
          RETURNING alert_id
        `);

        if (result.length === 0) {
          return reply.code(404).send({ error: "Notification not found" });
        }

        return reply.send({
          success: true,
          message: "Feedback recorded",
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({ error: "Failed to record feedback" });
      }
    }
  );

  // ==========================================================================
  // PREFERENCES
  // ==========================================================================

  /**
   * GET /api/alerts-system/preferences
   * Get user notification preferences
   */
  app.get<{
    Querystring: { userAddress: string };
  }>(
    "/api/alerts-system/preferences",
    {
      schema: {
        querystring: z.object({ userAddress: z.string() }),
      },
    },
    async (request, reply) => {
      const { userAddress } = request.query;

      try {
        const result = await db.execute(sql`
          SELECT * FROM notification_preferences
          WHERE user_address = ${userAddress}
        `);

        if (result.length === 0) {
          // Return default preferences
          return reply.send({
            preferences: {
              notificationsEnabled: true,
              quietHoursEnabled: false,
              inAppEnabled: true,
              pushEnabled: false,
              emailEnabled: false,
              telegramEnabled: false,
              minPriority: 'low',
              maxAlertsPerHour: 20,
              maxAlertsPerDay: 100,
            },
          });
        }

        const prefs = result[0];

        return reply.send({
          preferences: {
            notificationsEnabled: prefs.notifications_enabled,
            quietHoursEnabled: prefs.quiet_hours_enabled,
            quietHoursStart: prefs.quiet_hours_start,
            quietHoursEnd: prefs.quiet_hours_end,
            inAppEnabled: prefs.in_app_enabled,
            pushEnabled: prefs.push_enabled,
            emailEnabled: prefs.email_enabled,
            telegramEnabled: prefs.telegram_enabled,
            emailAddress: prefs.email_address,
            telegramChatId: prefs.telegram_chat_id,
            minPriority: prefs.min_priority,
            criticalOnlyQuietHours: prefs.critical_only_quiet_hours,
            alertTypePreferences: prefs.alert_type_preferences,
            maxAlertsPerHour: parseInt(prefs.max_alerts_per_hour),
            maxAlertsPerDay: parseInt(prefs.max_alerts_per_day),
            dailyDigestEnabled: prefs.daily_digest_enabled,
            dailyDigestTime: prefs.daily_digest_time,
          },
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({ error: "Failed to fetch preferences" });
      }
    }
  );

  /**
   * PUT /api/alerts-system/preferences
   * Update notification preferences
   */
  app.put<{
    Body: z.infer<typeof NotificationPreferencesSchema> & { userAddress: string };
  }>(
    "/api/alerts-system/preferences",
    {
      schema: {
        body: NotificationPreferencesSchema.extend({ userAddress: z.string() }),
      },
    },
    async (request, reply) => {
      const { userAddress, ...prefs } = request.body;

      try {
        // Upsert preferences
        const result = await db.execute(sql`
          INSERT INTO notification_preferences (
            user_address,
            notifications_enabled,
            quiet_hours_enabled,
            quiet_hours_start,
            quiet_hours_end,
            in_app_enabled,
            push_enabled,
            email_enabled,
            telegram_enabled,
            email_address,
            telegram_chat_id,
            min_priority,
            critical_only_quiet_hours,
            alert_type_preferences,
            max_alerts_per_hour,
            max_alerts_per_day,
            daily_digest_enabled,
            daily_digest_time
          ) VALUES (
            ${userAddress},
            ${prefs.notificationsEnabled ?? true},
            ${prefs.quietHoursEnabled ?? false},
            ${prefs.quietHoursStart || '22:00:00'},
            ${prefs.quietHoursEnd || '08:00:00'},
            ${prefs.inAppEnabled ?? true},
            ${prefs.pushEnabled ?? false},
            ${prefs.emailEnabled ?? false},
            ${prefs.telegramEnabled ?? false},
            ${prefs.emailAddress || null},
            ${prefs.telegramChatId || null},
            ${prefs.minPriority || 'low'},
            ${prefs.criticalOnlyQuietHours ?? true},
            ${JSON.stringify(prefs.alertTypePreferences || {})},
            ${prefs.maxAlertsPerHour || 20},
            ${prefs.maxAlertsPerDay || 100},
            ${prefs.dailyDigestEnabled ?? false},
            ${prefs.dailyDigestTime || '09:00:00'}
          )
          ON CONFLICT (user_address) DO UPDATE SET
            notifications_enabled = EXCLUDED.notifications_enabled,
            quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
            in_app_enabled = EXCLUDED.in_app_enabled,
            telegram_enabled = EXCLUDED.telegram_enabled,
            min_priority = EXCLUDED.min_priority,
            updated_at = NOW()
          RETURNING *
        `);

        return reply.send({
          success: true,
          message: "Preferences updated successfully",
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({ error: "Failed to update preferences" });
      }
    }
  );

  /**
   * GET /api/alerts-system/performance/:alertId
   * Get alert performance metrics
   */
  app.get<{
    Params: { alertId: string };
  }>(
    "/api/alerts-system/performance/:alertId",
    {
      schema: {
        params: z.object({ alertId: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const { alertId } = request.params;

      try {
        const result = await db.execute(sql`
          SELECT * FROM alert_performance_summary
          WHERE alert_id = ${alertId}
        `);

        if (result.length === 0) {
          return reply.code(404).send({ error: "Alert not found" });
        }

        const perf = result[0];

        return reply.send({
          performance: {
            totalTriggers: parseInt(perf.total_triggers),
            readCount: parseInt(perf.read_count),
            clickCount: parseInt(perf.click_count),
            actionCount: parseInt(perf.action_count),
            readRate: parseFloat(perf.read_rate || 0),
            clickRate: parseFloat(perf.click_rate || 0),
            avgRating: perf.avg_rating ? parseFloat(perf.avg_rating) : null,
            lastTriggered: perf.last_triggered,
          },
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({ error: "Failed to fetch performance" });
      }
    }
  );
}
