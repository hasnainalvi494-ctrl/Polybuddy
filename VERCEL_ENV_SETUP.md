# Environment Variables for Vercel Deployment

## For your Vercel Web App

Add this in Vercel Dashboard → Settings → Environment Variables:

```env
NEXT_PUBLIC_API_URL=https://polybuddy-api-production.up.railway.app
```

## For your Railway API

Add this in Railway Dashboard → Variables:

```env
CORS_ORIGIN=https://polybuddy-web-iags.vercel.app,https://polybuddy-web-iags.vercel.app
```

## Why this matters

Without `NEXT_PUBLIC_API_URL`, the frontend uses the hardcoded value.
Without `CORS_ORIGIN`, the browser blocks requests from Vercel to Railway.

## How to add in Vercel

1. Go to https://vercel.com/dashboard
2. Select your `polybuddy-web` project
3. Go to Settings → Environment Variables
4. Add: `NEXT_PUBLIC_API_URL` = `https://polybuddy-api-production.up.railway.app`
5. Redeploy your site

## How to add in Railway

1. Go to https://railway.app/dashboard  
2. Select your API project
3. Go to Variables tab
4. Add: `CORS_ORIGIN` = `https://polybuddy-web-iags.vercel.app`
5. Redeploy your API
