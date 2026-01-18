import type TelegramBot from "node-telegram-bot-api";
import { db, telegramAlertSubscriptions, telegramConnections } from "@polybuddy/db";
import { eq, and } from "drizzle-orm";

// ============================================================================
// ALERT TYPES
// ============================================================================

export type AlertType =
  | "price_move"
  | "volume_spike"
  | "market_dispute"
  | "resolution_approaching"
  | "flow_guard_change";

export interface AlertData {
  type: AlertType;
  marketId: string;
  marketQuestion: string;
  message: string;
  data?: Record<string, any>;
}

// ============================================================================
// ALERT NOTIFICATION SERVICE
// ============================================================================

export class TelegramAlertService {
  private bot: TelegramBot;

  constructor(bot: TelegramBot) {
    this.bot = bot;
  }

  /**
   * Send alert to all subscribers of a specific market and alert type
   */
  async sendAlert(alert: AlertData): Promise<void> {
    try {
      console.log(`[ALERT] Sending ${alert.type} alert for market ${alert.marketId}`);

      // Find all subscriptions for this alert type and market
      const subscriptions = await db.query.telegramAlertSubscriptions.findMany({
        where: and(
          eq(telegramAlertSubscriptions.alertType, alert.type),
          eq(telegramAlertSubscriptions.marketId, alert.marketId)
        ),
        with: {
          connection: true,
        },
      });

      if (subscriptions.length === 0) {
        console.log(`[ALERT] No subscribers for ${alert.type} on market ${alert.marketId}`);
        return;
      }

      // Send to each subscriber
      for (const subscription of subscriptions) {
        if (!subscription.connection.isActive) {
          continue;
        }

        try {
          const formattedMessage = this.formatAlertMessage(alert);
          await this.bot.sendMessage(subscription.connection.telegramChatId, formattedMessage, {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
          });

          console.log(
            `[ALERT] Sent to chat ${subscription.connection.telegramChatId}`
          );
        } catch (error) {
          console.error(
            `[ALERT] Failed to send to chat ${subscription.connection.telegramChatId}:`,
            error
          );
        }
      }

      console.log(`[ALERT] Sent ${alert.type} alert to ${subscriptions.length} subscribers`);
    } catch (error) {
      console.error("[ALERT] Error sending alert:", error);
    }
  }

  /**
   * Format alert message for Telegram
   */
  private formatAlertMessage(alert: AlertData): string {
    const emoji = this.getAlertEmoji(alert.type);
    const webUrl = process.env.WEB_APP_URL || "http://localhost:3000";

    let message = `${emoji} *${this.getAlertTitle(alert.type)}*\n\n`;
    message += `📊 *Market:* ${alert.marketQuestion}\n\n`;
    message += `${alert.message}\n\n`;

    // Add specific data based on alert type
    if (alert.data) {
      if (alert.type === "price_move" && alert.data.oldPrice && alert.data.newPrice) {
        const change = ((alert.data.newPrice - alert.data.oldPrice) / alert.data.oldPrice) * 100;
        message += `📈 Price: ${(alert.data.oldPrice * 100).toFixed(1)}% → ${(alert.data.newPrice * 100).toFixed(1)}%\n`;
        message += `📊 Change: ${change > 0 ? "+" : ""}${change.toFixed(2)}%\n\n`;
      }

      if (alert.type === "volume_spike" && alert.data.volume24h) {
        message += `💰 24h Volume: $${alert.data.volume24h.toLocaleString()}\n\n`;
      }

      if (alert.type === "resolution_approaching" && alert.data.hoursRemaining) {
        message += `⏰ Time remaining: ${alert.data.hoursRemaining}h\n\n`;
      }
    }

    message += `[View Market](${webUrl}/markets/${alert.marketId})`;

    return message;
  }

  /**
   * Get emoji for alert type
   */
  private getAlertEmoji(type: AlertType): string {
    const emojis: Record<AlertType, string> = {
      price_move: "📈",
      volume_spike: "💥",
      market_dispute: "⚠️",
      resolution_approaching: "⏰",
      flow_guard_change: "🔄",
    };
    return emojis[type] || "🔔";
  }

  /**
   * Get title for alert type
   */
  private getAlertTitle(type: AlertType): string {
    const titles: Record<AlertType, string> = {
      price_move: "Price Movement Alert",
      volume_spike: "Volume Spike Detected",
      market_dispute: "Market Dispute",
      resolution_approaching: "Resolution Approaching",
      flow_guard_change: "Flow Guard Status Changed",
    };
    return titles[type] || "Market Alert";
  }

  /**
   * Send price move alert
   */
  async sendPriceAlert(
    marketId: string,
    marketQuestion: string,
    oldPrice: number,
    newPrice: number
  ): Promise<void> {
    const change = Math.abs(((newPrice - oldPrice) / oldPrice) * 100);

    await this.sendAlert({
      type: "price_move",
      marketId,
      marketQuestion,
      message: `Price has moved significantly!`,
      data: { oldPrice, newPrice, change },
    });
  }

  /**
   * Send volume spike alert
   */
  async sendVolumeAlert(
    marketId: string,
    marketQuestion: string,
    volume24h: number,
    avgVolume: number
  ): Promise<void> {
    const multiplier = (volume24h / avgVolume).toFixed(1);

    await this.sendAlert({
      type: "volume_spike",
      marketId,
      marketQuestion,
      message: `Trading volume is ${multiplier}x higher than average!`,
      data: { volume24h, avgVolume, multiplier },
    });
  }

  /**
   * Send dispute alert
   */
  async sendDisputeAlert(
    marketId: string,
    marketQuestion: string,
    disputeStatus: string
  ): Promise<void> {
    await this.sendAlert({
      type: "market_dispute",
      marketId,
      marketQuestion,
      message: `This market's resolution is being disputed! Status: ${disputeStatus}`,
      data: { disputeStatus },
    });
  }

  /**
   * Send resolution approaching alert
   */
  async sendResolutionAlert(
    marketId: string,
    marketQuestion: string,
    hoursRemaining: number
  ): Promise<void> {
    await this.sendAlert({
      type: "resolution_approaching",
      marketId,
      marketQuestion,
      message: `Market resolves in ${hoursRemaining} hours!`,
      data: { hoursRemaining },
    });
  }

  /**
   * Send flow guard change alert
   */
  async sendFlowGuardAlert(
    marketId: string,
    marketQuestion: string,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    await this.sendAlert({
      type: "flow_guard_change",
      marketId,
      marketQuestion,
      message: `Flow Guard status changed from "${oldStatus}" to "${newStatus}"`,
      data: { oldStatus, newStatus },
    });
  }
}

/**
 * Create alert service instance
 */
export function createAlertService(bot: TelegramBot): TelegramAlertService {
  return new TelegramAlertService(bot);
}


