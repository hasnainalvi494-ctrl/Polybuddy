import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, telegramConnections, telegramAlertSubscriptions } from "@polybuddy/db";
import { eq, and } from "drizzle-orm";

// ============================================================================
// SCHEMAS
// ============================================================================

const TelegramConnectionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  telegramChatId: z.string(),
  telegramUsername: z.string().nullable(),
  connectedAt: z.string(),
  isActive: z.boolean(),
});

const TelegramSubscriptionSchema = z.object({
  id: z.string(),
  telegramConnectionId: z.string(),
  alertType: z.string(),
  marketId: z.string().nullable(),
  threshold: z.string().nullable(),
  createdAt: z.string(),
});

// ============================================================================
// ROUTES
// ============================================================================

export const telegramRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/telegram/connection - Get user's Telegram connection
  typedApp.get(
    "/connection",
    {
      schema: {
        description: "Get current user's Telegram connection",
        tags: ["telegram"],
        response: {
          200: z.object({
            connection: TelegramConnectionSchema.nullable(),
          }),
        },
      },
    },
    async (request, reply) => {
      // TODO: Get userId from authenticated session
      // For now, return null
      return { connection: null };
    }
  );

  // GET /api/telegram/subscriptions - Get user's alert subscriptions
  typedApp.get(
    "/subscriptions",
    {
      schema: {
        description: "Get current user's Telegram alert subscriptions",
        tags: ["telegram"],
        response: {
          200: z.object({
            subscriptions: z.array(TelegramSubscriptionSchema),
            count: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      // TODO: Get userId from authenticated session
      // For now, return empty array
      return { subscriptions: [], count: 0 };
    }
  );

  // DELETE /api/telegram/connection - Disconnect Telegram
  typedApp.delete(
    "/connection",
    {
      schema: {
        description: "Disconnect Telegram from account",
        tags: ["telegram"],
        response: {
          200: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      // TODO: Get userId from authenticated session
      // For now, return success
      return {
        success: true,
        message: "Telegram disconnected successfully",
      };
    }
  );

  // GET /api/telegram/bot-info - Get bot information
  typedApp.get(
    "/bot-info",
    {
      schema: {
        description: "Get Telegram bot information",
        tags: ["telegram"],
        response: {
          200: z.object({
            botUsername: z.string(),
            botUrl: z.string(),
            instructions: z.array(z.string()),
          }),
        },
      },
    },
    async (request, reply) => {
      const botUsername = process.env.TELEGRAM_BOT_USERNAME || "PolyBuddyBot";

      return {
        botUsername,
        botUrl: `https://t.me/${botUsername}`,
        instructions: [
          `1. Open Telegram and search for @${botUsername}`,
          "2. Start a chat with the bot",
          "3. Send /connect your@email.com",
          "4. You'll receive a confirmation message",
          "5. Start tracking markets with /track",
        ],
      };
    }
  );
};

