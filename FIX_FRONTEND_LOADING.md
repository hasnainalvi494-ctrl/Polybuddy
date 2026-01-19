# URGENT: Fix Frontend Data Loading

## The Issue
Your API is working perfectly and has data, but your Vercel frontend can't reach it!

## The Fix (5 minutes)

### Step 1: Set Environment Variable on Vercel

1. Go to: https://vercel.com/dashboard
2. Click your **"polybuddy-web"** project
3. Click **"Settings"** tab (top)
4. Click **"Environment Variables"** in the left sidebar
5. Add this variable:

```
Name: NEXT_PUBLIC_API_URL
Value: https://polybuddy-api-production.up.railway.app
```

6. Check ALL three boxes:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

7. Click **"Save"**

### Step 2: Redeploy

1. Go to **"Deployments"** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Select **"Use existing Build Cache"** (faster)
5. Click **"Redeploy"**

### Step 3: Wait 2 Minutes

The build will take about 1-2 minutes. Once it says "Ready", refresh your site:
https://polybuddy-web-iags.vercel.app

## What This Does

- Tells your frontend where to find the API
- Currently it's probably trying to fetch from `undefined` or wrong URL
- This connects Vercel → Railway properly

## Verification

After redeployment:
1. Open your site
2. Press F12 (Developer Tools)
3. Go to "Console" tab
4. You should see logs like: `[API] Fetching: https://polybuddy-api-production.up.railway.app/api/best-bets-signals`
5. Data should appear on the homepage!

---

## Need Help?

If it still doesn't work after redeployment, open browser console (F12) and screenshot any errors you see.
