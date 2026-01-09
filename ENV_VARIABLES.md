# 🔧 Environment Variables Configuration

## Vercel Environment Variables

### Required for Frontend Deployment

Add these environment variables in your Vercel project settings:

| Variable | Value | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://polybuddy-api.onrender.com` | Your Render API URL |

### How to Add Environment Variables in Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Click "Add New"
3. Add the variables listed above
4. Click "Save"

## Render Environment Variables

### Required for API Deployment

These should already be configured in your Render service:

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `PORT` | `10000` | Port for the API server |
| `NODE_ENV` | `production` | Environment mode |
| `CORS_ORIGIN` | `https://your-vercel-app.vercel.app` | Your Vercel frontend URL |
| `COOKIE_SECRET` | `your-secret-key-here` | Secret key for cookies |

## Local Development

For local development, create a `.env.local` file in the `apps/web` directory:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Verification

After deployment, test that:
- Frontend loads correctly
- API calls work (check browser network tab)
- No CORS errors in console
- Environment variables are accessible in your app