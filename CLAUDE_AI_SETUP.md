# 🤖 Claude AI Analysis Setup

## Overview

Your PolyBuddy app now uses **real Claude AI** to analyze prediction markets! This provides intelligent, data-driven insights for each market.

## What Changed

✅ **Real Claude API Integration** - No more mock data!
✅ **Automatic Fallback** - If API key is missing or there's an error, falls back to mock analysis
✅ **Smart Caching** - Analysis is cached for 1 hour to save API costs

## How to Enable Real AI Analysis

### Step 1: Get a Claude API Key

1. Go to [https://console.anthropic.com/](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to "API Keys"
4. Create a new API key
5. Copy the key (starts with `sk-ant-...`)

### Step 2: Add API Key to Railway

1. Go to your Railway dashboard
2. Click on the **polybuddy-api** service
3. Go to **Variables** tab
4. Add a new variable:
   - **Name**: `CLAUDE_API_KEY`
   - **Value**: Your API key (e.g., `sk-ant-api03-...`)
5. Click **Deploy** or wait for auto-deploy

### Step 3: Add API Key Locally (Optional)

For local development:

1. Open `apps/api/.env`
2. Add this line:
   ```
   CLAUDE_API_KEY=sk-ant-your-key-here
   ```
3. Restart your local API server

## How It Works

When a user views a market's AI analysis:

1. **API receives request** at `/api/markets/:id/analysis`
2. **Fetches market data** (question, current price)
3. **Calls Claude API** with a structured prompt
4. **Claude analyzes** the market and returns:
   - Probability estimate
   - Confidence level
   - Thesis (bullish case)
   - Counter-thesis (bearish case)
   - 5 key factors to watch
   - 5 potential risks
5. **Returns structured JSON** to the frontend
6. **Caches for 1 hour** to save API costs

## API Usage & Costs

**Claude 3.5 Sonnet Pricing:**
- Input: $3 per million tokens (~$0.003 per request)
- Output: $15 per million tokens (~$0.015 per request)
- **Average cost per analysis: ~$0.02**

**With caching (1 hour):**
- If you have 100 active markets
- Each viewed once per hour
- Cost: ~$2/hour or ~$50/day

**Optimization:**
- Increase cache time if needed (currently 1 hour)
- Only generate analysis when user clicks "AI Analysis" tab
- Consider using Claude 3 Haiku ($0.25/$1.25 per million) for lower costs

## Testing

Once deployed, test the AI analysis:

```bash
# Test with a real market
curl https://polybuddy-api-production.up.railway.app/api/markets/YOUR_MARKET_ID/analysis
```

You should see a response like:

```json
{
  "marketId": "...",
  "generatedAt": "2024-01-18T...",
  "probability_estimate": 0.65,
  "confidence": "Medium",
  "thesis": "Current polling data shows...",
  "counter_thesis": "However, historical patterns suggest...",
  "key_factors": [
    "Factor 1",
    "Factor 2",
    ...
  ],
  "what_could_go_wrong": [
    "Risk 1",
    "Risk 2",
    ...
  ]
}
```

## Troubleshooting

### "Using mock analysis" in logs
- Your `CLAUDE_API_KEY` environment variable is not set
- Add it to Railway variables

### "Claude API error" in logs
- Invalid API key
- API key doesn't have sufficient credits
- Rate limit exceeded
- Check Railway logs for detailed error

### Still showing mock data after adding key
- Railway may not have redeployed
- Check Railway dashboard → Deployments
- Manually trigger a redeploy if needed
- Clear browser cache

## Monitoring

Check your Claude API usage:
1. Go to [https://console.anthropic.com/](https://console.anthropic.com/)
2. Navigate to "Usage"
3. Monitor daily costs and request counts

## Future Enhancements

Potential improvements:
- Add news API integration for real-time context
- Implement streaming responses for faster UX
- Add sentiment analysis from social media
- Cache analysis in database for longer periods
- Add user feedback to improve analysis quality

---

**Status**: ✅ Implemented and ready to use!
**Next Step**: Add your `CLAUDE_API_KEY` to Railway
