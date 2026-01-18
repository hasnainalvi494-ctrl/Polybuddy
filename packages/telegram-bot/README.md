# PolyBuddy Telegram Alert Bot

Real-time alerts for Polymarket traders via Telegram.

## Features

- 📈 **Price Movement Alerts** - Get notified of significant price changes
- 💥 **Volume Spike Alerts** - Know when trading volume spikes
- ⚠️ **Dispute Alerts** - Be informed when markets are disputed
- ⏰ **Resolution Reminders** - Never miss a market resolution
- 🔄 **Flow Guard Updates** - Track market flow status changes

## Setup

### 1. Create Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` command
3. Follow the prompts to create your bot
4. Save the bot token (looks like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)
5. Save the bot username (e.g., `PolyBuddyBot`)

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_USERNAME=YourBotUsername
WEB_APP_URL=http://localhost:3000
```

### 3. Run the Bot

```bash
# Development
pnpm --filter @polybuddy/telegram-bot dev

# Production
pnpm --filter @polybuddy/telegram-bot build
pnpm --filter @polybuddy/telegram-bot start
```

## Bot Commands

### User Commands

- `/start` - Start the bot and see welcome message
- `/connect [email]` - Link your PolyBuddy account
- `/track [market_url]` - Start tracking a market
- `/myalerts` - List all your active alerts
- `/stop [market_url]` - Stop tracking a market
- `/settings` - View settings (redirects to web app)
- `/help` - Show help message

### Example Usage

```
/connect user@example.com
/track https://polymarket.com/event/will-trump-win-2024
/myalerts
/stop https://polymarket.com/event/will-trump-win-2024
```

## Alert Types

### Price Move
Triggered when price changes by more than the configured threshold (default: 5%)

### Volume Spike
Triggered when 24h volume exceeds 2x the average volume

### Market Dispute
Triggered when a market resolution is disputed via UMA Oracle

### Resolution Approaching
Triggered when a market is about to resolve (configurable timing)

### Flow Guard Change
Triggered when the Flow Guard status changes for a market

## Architecture

### Bot Service (`src/index.ts`)
- Handles all bot commands
- Manages user connections
- Creates alert subscriptions

### Alert Service (`src/alerts.ts`)
- Sends formatted alerts to users
- Manages alert delivery
- Handles different alert types

### Database Tables
- `telegram_connections` - Links users to Telegram accounts
- `telegram_alert_subscriptions` - Stores alert preferences

## Integration with Main App

The bot integrates with the main PolyBuddy application:

1. **User Authentication**: Links Telegram to user email
2. **Alert Subscriptions**: Stores preferences in shared database
3. **Real-time Alerts**: Triggered by market events in the main app

## Development

### Testing Locally

1. Create a test bot with BotFather
2. Set environment variables
3. Run `pnpm dev`
4. Open Telegram and search for your bot
5. Test commands

### Adding New Alert Types

1. Add alert type to `AlertType` in `src/alerts.ts`
2. Create handler method in `TelegramAlertService`
3. Update bot commands if needed
4. Add to frontend settings page

## Production Deployment

### Option 1: Run as Separate Service

```bash
# Build
pnpm build

# Run with PM2
pm2 start dist/index.js --name telegram-bot

# Or with systemd
sudo systemctl start polybuddy-telegram-bot
```

### Option 2: Run with Main API

Import and start the bot in your main API server:

```typescript
import "@polybuddy/telegram-bot";
```

## Troubleshooting

### Bot Not Responding

1. Check bot token is correct
2. Verify bot is running (`pm2 status`)
3. Check logs for errors
4. Ensure database connection is working

### Alerts Not Sending

1. Verify user is connected (`/myalerts`)
2. Check alert subscriptions in database
3. Verify market ID is correct
4. Check bot has permission to send messages

### Connection Issues

1. Ensure email matches registered user
2. Check database connection
3. Verify user exists in `users` table

## Security

- Bot token should be kept secret
- Never commit `.env` file
- Use environment variables in production
- Validate all user inputs
- Rate limit bot commands

## License

MIT


