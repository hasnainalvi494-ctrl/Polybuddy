import TelegramBot from "node-telegram-bot-api";
import { db, telegramConnections, telegramAlertSubscriptions, users } from "@polybuddy/db";
import { eq, and } from "drizzle-orm";

// ============================================================================
// CONFIGURATION
// ============================================================================

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || "http://localhost:3000";

if (!TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN environment variable is required");
  process.exit(1);
}

// ============================================================================
// BOT INITIALIZATION
// ============================================================================

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

console.log("🤖 PolyBuddy Telegram Bot started!");

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function findUserByEmail(email: string) {
  return await db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

async function findTelegramConnection(chatId: string) {
  return await db.query.telegramConnections.findFirst({
    where: eq(telegramConnections.telegramChatId, chatId),
    with: {
      user: true,
    },
  });
}

async function createTelegramConnection(userId: string, chatId: string, username?: string) {
  const [connection] = await db
    .insert(telegramConnections)
    .values({
      userId,
      telegramChatId: chatId,
      telegramUsername: username,
    })
    .returning();
  return connection;
}

function extractMarketIdFromUrl(url: string): string | null {
  // Extract market ID from Polymarket URL
  // Example: https://polymarket.com/event/will-trump-win-2024
  const match = url.match(/polymarket\.com\/event\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

// /start - Welcome message
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id.toString();
  const username = msg.from?.username;

  const connection = await findTelegramConnection(chatId);

  if (connection) {
    await bot.sendMessage(
      chatId,
      `👋 Welcome back, ${connection.user.name || "there"}!\n\n` +
        `Your account is already connected.\n\n` +
        `Use /myalerts to see your active alerts.`,
      {
        reply_markup: {
          keyboard: [
            [{ text: "📊 My Alerts" }, { text: "⚙️ Settings" }],
            [{ text: "📈 Track Market" }, { text: "🔔 Help" }],
          ],
          resize_keyboard: true,
        },
      }
    );
  } else {
    await bot.sendMessage(
      chatId,
      `🎉 Welcome to PolyBuddy Alert Bot!\n\n` +
        `I'll send you real-time alerts for:\n` +
        `• Price movements\n` +
        `• Volume spikes\n` +
        `• Market disputes\n` +
        `• Resolution approaching\n` +
        `• Flow Guard changes\n\n` +
        `To get started, connect your PolyBuddy account:\n` +
        `/connect your@email.com\n\n` +
        `Don't have an account? Sign up at ${WEB_APP_URL}`
    );
  }
});

// /connect [email] - Link PolyBuddy account
bot.onText(/\/connect (.+)/, async (msg, match) => {
  const chatId = msg.chat.id.toString();
  const username = msg.from?.username;
  const email = match?.[1]?.trim();

  if (!email) {
    await bot.sendMessage(chatId, "❌ Please provide your email:\n/connect your@email.com");
    return;
  }

  // Check if already connected
  const existing = await findTelegramConnection(chatId);
  if (existing) {
    await bot.sendMessage(
      chatId,
      `⚠️ You're already connected as ${existing.user.email}\n\n` +
        `To connect a different account, please disconnect first in the web app.`
    );
    return;
  }

  // Find user by email
  const user = await findUserByEmail(email);
  if (!user) {
    await bot.sendMessage(
      chatId,
      `❌ No account found with email: ${email}\n\n` +
        `Please sign up at ${WEB_APP_URL} first.`
    );
    return;
  }

  // Create connection
  await createTelegramConnection(user.id, chatId, username);

  await bot.sendMessage(
    chatId,
    `✅ Successfully connected!\n\n` +
      `Account: ${user.email}\n` +
      `Name: ${user.name || "Not set"}\n\n` +
      `You'll now receive alerts for your tracked markets.\n\n` +
      `Use /track to start tracking a market!`,
    {
      reply_markup: {
        keyboard: [
          [{ text: "📊 My Alerts" }, { text: "⚙️ Settings" }],
          [{ text: "📈 Track Market" }, { text: "🔔 Help" }],
        ],
        resize_keyboard: true,
      },
    }
  );
});

// /track [market_url] - Track a market
bot.onText(/\/track (.+)/, async (msg, match) => {
  const chatId = msg.chat.id.toString();
  const url = match?.[1]?.trim();

  if (!url) {
    await bot.sendMessage(
      chatId,
      "❌ Please provide a market URL:\n/track https://polymarket.com/event/..."
    );
    return;
  }

  // Check if connected
  const connection = await findTelegramConnection(chatId);
  if (!connection) {
    await bot.sendMessage(
      chatId,
      "❌ Please connect your account first:\n/connect your@email.com"
    );
    return;
  }

  // Extract market ID
  const marketId = extractMarketIdFromUrl(url);
  if (!marketId) {
    await bot.sendMessage(chatId, "❌ Invalid Polymarket URL. Please check and try again.");
    return;
  }

  // Create subscription for all alert types
  const alertTypes = [
    "price_move",
    "volume_spike",
    "market_dispute",
    "resolution_approaching",
    "flow_guard_change",
  ];

  for (const alertType of alertTypes) {
    await db.insert(telegramAlertSubscriptions).values({
      telegramConnectionId: connection.id,
      alertType,
      marketId,
      threshold: alertType === "price_move" ? "0.05" : null, // 5% default threshold
    });
  }

  await bot.sendMessage(
    chatId,
    `✅ Now tracking market!\n\n` +
      `Market ID: ${marketId}\n\n` +
      `You'll receive alerts for:\n` +
      `• Price moves >5%\n` +
      `• Volume spikes\n` +
      `• Disputes\n` +
      `• Resolution approaching\n` +
      `• Flow Guard changes\n\n` +
      `Use /myalerts to see all tracked markets.`
  );
});

// /myalerts - List subscriptions
bot.onText(/\/myalerts/, async (msg) => {
  const chatId = msg.chat.id.toString();

  const connection = await findTelegramConnection(chatId);
  if (!connection) {
    await bot.sendMessage(
      chatId,
      "❌ Please connect your account first:\n/connect your@email.com"
    );
    return;
  }

  const subscriptions = await db.query.telegramAlertSubscriptions.findMany({
    where: eq(telegramAlertSubscriptions.telegramConnectionId, connection.id),
  });

  if (subscriptions.length === 0) {
    await bot.sendMessage(
      chatId,
      "📭 You're not tracking any markets yet.\n\n" +
        "Use /track to start tracking a market!"
    );
    return;
  }

  // Group by market ID
  const marketGroups = subscriptions.reduce((acc, sub) => {
    if (!sub.marketId) return acc;
    if (!acc[sub.marketId]) {
      acc[sub.marketId] = [];
    }
    acc[sub.marketId].push(sub);
    return acc;
  }, {} as Record<string, typeof subscriptions>);

  let message = `📊 Your Active Alerts (${Object.keys(marketGroups).length} markets):\n\n`;

  for (const [marketId, subs] of Object.entries(marketGroups)) {
    message += `🔔 Market: ${marketId}\n`;
    message += `   Alert types: ${subs.length}\n`;
    message += `   /stop_${marketId.replace(/-/g, "_")}\n\n`;
  }

  message += `\nUse /settings to configure thresholds.`;

  await bot.sendMessage(chatId, message);
});

// /stop [market_url] - Stop tracking
bot.onText(/\/stop (.+)/, async (msg, match) => {
  const chatId = msg.chat.id.toString();
  const url = match?.[1]?.trim();

  if (!url) {
    await bot.sendMessage(
      chatId,
      "❌ Please provide a market URL:\n/stop https://polymarket.com/event/..."
    );
    return;
  }

  const connection = await findTelegramConnection(chatId);
  if (!connection) {
    await bot.sendMessage(
      chatId,
      "❌ Please connect your account first:\n/connect your@email.com"
    );
    return;
  }

  const marketId = extractMarketIdFromUrl(url);
  if (!marketId) {
    await bot.sendMessage(chatId, "❌ Invalid Polymarket URL. Please check and try again.");
    return;
  }

  // Delete all subscriptions for this market
  await db
    .delete(telegramAlertSubscriptions)
    .where(
      and(
        eq(telegramAlertSubscriptions.telegramConnectionId, connection.id),
        eq(telegramAlertSubscriptions.marketId, marketId)
      )
    );

  await bot.sendMessage(
    chatId,
    `✅ Stopped tracking market: ${marketId}\n\n` + `Use /myalerts to see remaining alerts.`
  );
});

// /settings - Configure thresholds
bot.onText(/\/settings/, async (msg) => {
  const chatId = msg.chat.id.toString();

  const connection = await findTelegramConnection(chatId);
  if (!connection) {
    await bot.sendMessage(
      chatId,
      "❌ Please connect your account first:\n/connect your@email.com"
    );
    return;
  }

  await bot.sendMessage(
    chatId,
    `⚙️ Settings\n\n` +
      `Configure your alert preferences in the web app:\n` +
      `${WEB_APP_URL}/settings\n\n` +
      `You can adjust:\n` +
      `• Price move thresholds\n` +
      `• Volume spike sensitivity\n` +
      `• Notification frequency\n` +
      `• Alert types per market`
  );
});

// /help - Show help
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id.toString();

  await bot.sendMessage(
    chatId,
    `🔔 PolyBuddy Alert Bot Commands:\n\n` +
      `/start - Start the bot\n` +
      `/connect [email] - Link your account\n` +
      `/track [url] - Track a market\n` +
      `/myalerts - List your alerts\n` +
      `/stop [url] - Stop tracking\n` +
      `/settings - Configure alerts\n` +
      `/help - Show this help\n\n` +
      `Need more help? Visit ${WEB_APP_URL}/help`
  );
});

// Handle keyboard buttons
bot.on("message", async (msg) => {
  if (!msg.text) return;

  const chatId = msg.chat.id.toString();
  const text = msg.text;

  // Handle custom keyboard buttons
  if (text === "📊 My Alerts") {
    bot.emit("text", msg, [/\/myalerts/]);
  } else if (text === "⚙️ Settings") {
    bot.emit("text", msg, [/\/settings/]);
  } else if (text === "📈 Track Market") {
    await bot.sendMessage(
      chatId,
      "📈 To track a market, send:\n/track https://polymarket.com/event/..."
    );
  } else if (text === "🔔 Help") {
    bot.emit("text", msg, [/\/help/]);
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

bot.on("polling_error", (error) => {
  console.error("[BOT] Polling error:", error);
});

bot.on("error", (error) => {
  console.error("[BOT] Error:", error);
});

// ============================================================================
// EXPORT FOR ALERT SENDING
// ============================================================================

export { bot };
export default bot;

