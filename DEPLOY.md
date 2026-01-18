# PolyBuddy Deployment Guide

Deploy PolyBuddy to share with friends using **Vercel** (frontend) + **Railway** (API + Database).

## 🚀 Quick Deploy (15 minutes)

### Step 1: Push to GitHub

1. Create a new GitHub repository
2. Push your code:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/polybuddy.git
git push -u origin main
```

---

### Step 2: Deploy Database + API on Railway

1. Go to [railway.app](https://railway.app) and sign up (use GitHub)

2. Click **"New Project"** → **"Deploy from GitHub repo"**

3. Select your `polybuddy` repository

4. Railway will auto-detect the monorepo. Click on your service and:
   - Go to **Settings** → **Root Directory** → Set to `/`
   - Go to **Settings** → **Build Command** → Set to:
     ```
     pnpm install && pnpm --filter @polybuddy/db build && pnpm --filter @polybuddy/analytics build && pnpm --filter @polybuddy/api build
     ```
   - Go to **Settings** → **Start Command** → Set to:
     ```
     cd apps/api && node --experimental-specifier-resolution=node dist/index.js
     ```

5. **Add PostgreSQL Database:**
   - Click **"+ New"** → **"Database"** → **"PostgreSQL"**
   - Railway auto-connects it. Copy the `DATABASE_URL` from Variables tab.

6. **Set Environment Variables** (in your API service → Variables tab):
   ```
   DATABASE_URL=<auto-filled by Railway>
   NODE_ENV=production
   PORT=3001
   CORS_ORIGIN=https://your-app.vercel.app
   JWT_SECRET=generate-a-random-32-char-string
   ```

7. Click **Deploy** and wait for it to finish

8. Copy your Railway API URL (looks like `https://polybuddy-api-production.up.railway.app`)

---

### Step 3: Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up (use GitHub)

2. Click **"Add New..."** → **"Project"**

3. Import your `polybuddy` repository

4. Configure the project:
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/web`
   - **Build Command:** `cd ../.. && pnpm install && pnpm --filter @polybuddy/web build`
   - **Output Directory:** `.next`

5. **Add Environment Variable:**
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-api-url.up.railway.app
   ```
   (Use the Railway URL from Step 2.8)

6. Click **Deploy**

7. Once deployed, copy your Vercel URL (e.g., `https://polybuddy.vercel.app`)

---

### Step 4: Update CORS (Important!)

1. Go back to Railway → Your API service → Variables

2. Update `CORS_ORIGIN` to your Vercel URL:
   ```
   CORS_ORIGIN=https://polybuddy.vercel.app
   ```

3. Redeploy the API service

---

## ✅ You're Done!

Share your Vercel URL with friends: `https://polybuddy.vercel.app`

---

## 🔧 Troubleshooting

### API not connecting?
- Check Railway logs for errors
- Verify `NEXT_PUBLIC_API_URL` in Vercel matches your Railway URL
- Make sure `CORS_ORIGIN` in Railway matches your Vercel URL

### Database errors?
- Railway PostgreSQL should auto-connect
- Run migrations: In Railway, go to your API service → Settings → Run command:
  ```
  pnpm db:migrate
  ```

### Build failing?
- Check that all packages are listed in `package.json`
- Verify Node.js version is 20+

---

## 📊 Costs

- **Railway:** Free tier includes $5/month credit (enough for testing)
- **Vercel:** Free tier (hobby) is plenty for sharing with friends
- **Total:** $0/month for small-scale testing

---

## 🔄 Updating

After pushing changes to GitHub:
- **Vercel:** Auto-deploys on push
- **Railway:** Auto-deploys on push

Just `git push` and both will update!
