# PolyBuddy Deployment Guide

## Deploying to Vercel

### Prerequisites
- GitHub account
- Vercel account (sign up at [vercel.com](https://vercel.com))
- PostgreSQL database (for production)

### Step 1: Prepare Your Repository

1. **Commit all changes:**
```bash
git add -A
git commit -m "chore: prepare for deployment"
```

2. **Push to GitHub:**
```bash
git push origin main
```

If you haven't set up a GitHub repository yet:
```bash
# Create a new repository on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/polybuddy.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy Frontend to Vercel

1. **Go to [vercel.com](https://vercel.com) and sign in**

2. **Click "New Project"**

3. **Import your GitHub repository**
   - Select "polybuddy" from your repositories
   - Click "Import"

4. **Configure Project Settings:**
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/web`
   - **Build Command:** `pnpm run build` (or leave default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `pnpm install`

5. **Add Environment Variables:**
   Click "Environment Variables" and add:
   
   ```
   NEXT_PUBLIC_API_URL=https://your-api-url.com
   ```
   
   *Note: You'll need to deploy your API first (see below) or use a temporary value*

6. **Click "Deploy"**
   - Vercel will build and deploy your app
   - You'll get a URL like: `https://polybuddy-xyz.vercel.app`

### Step 3: Deploy API Server

The API needs to be deployed separately. Here are your options:

#### Option A: Railway (Recommended for API + Database)

1. **Go to [railway.app](https://railway.app)**

2. **Create New Project → Deploy from GitHub**

3. **Select your repository**

4. **Configure:**
   - Root Directory: `apps/api`
   - Build Command: `pnpm run build`
   - Start Command: `pnpm run start`

5. **Add PostgreSQL:**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway will automatically set `DATABASE_URL`

6. **Add Environment Variables:**
   ```
   PORT=3001
   DATABASE_URL=(automatically set by Railway)
   CORS_ORIGIN=https://your-vercel-url.vercel.app
   COOKIE_SECRET=your-secret-key-here
   ```

7. **Get your API URL:**
   - Railway will give you a URL like: `https://polybuddy-api.railway.app`

8. **Update Vercel Environment Variable:**
   - Go back to Vercel dashboard
   - Settings → Environment Variables
   - Update `NEXT_PUBLIC_API_URL` to your Railway API URL
   - Redeploy

#### Option B: Render

1. **Go to [render.com](https://render.com)**

2. **New → Web Service**

3. **Connect your repository**

4. **Configure:**
   - Root Directory: `apps/api`
   - Build Command: `pnpm install && pnpm run build`
   - Start Command: `pnpm run start`

5. **Add PostgreSQL:**
   - New → PostgreSQL
   - Copy the connection string

6. **Add Environment Variables** (same as Railway)

#### Option C: Vercel Serverless Functions (Limited)

*Note: This approach has limitations for WebSocket and long-running processes*

### Step 4: Set Up Production Database

#### Option A: Railway PostgreSQL (Easiest)
- Automatically provisioned with Railway deployment
- Free tier: 512MB storage

#### Option B: Supabase
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Get connection string from Settings → Database
4. Run migrations:
   ```bash
   DATABASE_URL="your-supabase-url" pnpm run db:push
   ```

#### Option C: Neon
1. Go to [neon.tech](https://neon.tech)
2. Create new project
3. Get connection string
4. Run migrations

### Step 5: Run Database Migrations

Once your database is set up:

```bash
# Set your production database URL
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# Push schema
pnpm run db:push

# Or run migrations manually
psql $DATABASE_URL < packages/db/migrations/*.sql
```

### Step 6: Verify Deployment

1. **Visit your Vercel URL:** `https://polybuddy-xyz.vercel.app`
2. **Check API health:** `https://your-api-url.com/health`
3. **Test functionality:**
   - Markets loading
   - Leaderboard
   - Whale activity
   - Charts rendering

### Environment Variables Reference

#### Frontend (Vercel)
```env
NEXT_PUBLIC_API_URL=https://your-api-url.com
NEXT_PUBLIC_WS_URL=wss://your-api-url.com/ws
```

#### Backend (Railway/Render)
```env
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/dbname
CORS_ORIGIN=https://your-vercel-url.vercel.app,https://polybuddy.com
COOKIE_SECRET=generate-a-secure-random-string
NODE_ENV=production
```

### Continuous Deployment

Once set up, Vercel and Railway will automatically deploy when you push to GitHub:

```bash
git add -A
git commit -m "feat: new feature"
git push origin main
# Automatic deployment triggered!
```

### Custom Domain (Optional)

#### On Vercel:
1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `polybuddy.com`)
3. Follow DNS configuration instructions

#### On Railway:
1. Go to Settings → Domains
2. Add custom domain for API (e.g., `api.polybuddy.com`)
3. Update Vercel environment variable

### Troubleshooting

#### Build Fails on Vercel
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify environment variables are set

#### API Not Connecting
- Check CORS settings in API
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check API logs in Railway/Render

#### Database Connection Issues
- Verify `DATABASE_URL` format
- Check database is running
- Ensure IP allowlist includes Railway/Render IPs

### Monitoring

- **Vercel Analytics:** Built-in performance monitoring
- **Railway Logs:** Real-time API logs
- **Sentry:** Add for error tracking (optional)

### Cost Estimate

**Free Tier:**
- Vercel: Free (hobby plan)
- Railway: $5/month credit (enough for small apps)
- Render: Free tier available
- Database: Free tier on Railway/Supabase/Neon

**Total: $0-5/month for starting out**

### Next Steps After Deployment

1. Set up monitoring and alerts
2. Configure custom domain
3. Enable analytics
4. Set up error tracking
5. Configure backup strategy for database
6. Set up staging environment

---

## Quick Deploy Checklist

- [ ] Push code to GitHub
- [ ] Deploy frontend to Vercel
- [ ] Deploy API to Railway/Render
- [ ] Set up PostgreSQL database
- [ ] Run database migrations
- [ ] Configure environment variables
- [ ] Update CORS settings
- [ ] Test all functionality
- [ ] Set up custom domain (optional)
- [ ] Enable monitoring

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs

