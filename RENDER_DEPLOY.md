# 🚀 Deploy Polybuddy to Render (Easy Guide)

## What We're Doing:
- **Frontend**: Vercel (you already connected this!)
- **API + Database**: Render (free tier)

---

## 📋 Step-by-Step Instructions

### STEP 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub (easiest way)
3. Authorize Render to access your repositories

---

### STEP 2: Create PostgreSQL Database

1. In Render Dashboard, click **"New +"** button (top right)
2. Select **"PostgreSQL"**
3. Fill in:
   - **Name**: `polybuddy-db`
   - **Database**: `polybuddy`
   - **User**: `polybuddy`
   - **Region**: Choose closest to you (e.g., Oregon for US West)
   - **PostgreSQL Version**: 16 (default)
   - **Plan**: **Free** ⬅️ Important!
4. Click **"Create Database"**
5. Wait 2-3 minutes for it to spin up
6. **COPY the "Internal Database URL"** (looks like: `postgresql://polybuddy:xxxxx@dpg-xxxxx/polybuddy`)
   - You'll find this in the database info page
   - Save it somewhere safe!

---

### STEP 3: Run Database Migration (I'll help you!)

Once you have the database URL, tell me and I'll run the migration for you!

---

### STEP 4: Create Web Service (API)

1. In Render Dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository:
   - Click **"Connect account"** if needed
   - Find and select your `polybuddy` repository
3. Fill in settings:
   - **Name**: `polybuddy-api`
   - **Region**: **Same as your database!** ⬅️ Important!
   - **Branch**: `main` (or `master`)
   - **Root Directory**: Leave **blank**
   - **Runtime**: **Node**
   - **Build Command**: 
     ```
     pnpm install && pnpm --filter @polybuddy/api build
     ```
   - **Start Command**: 
     ```
     pnpm --filter @polybuddy/api start
     ```
   - **Plan**: **Free** ⬅️ Important!

4. Click **"Advanced"** to add environment variables:
   - Click **"Add Environment Variable"**
   - Add these one by one:

   ```
   DATABASE_URL = [paste your Internal Database URL from Step 2]
   PORT = 10000
   NODE_ENV = production
   CORS_ORIGIN = https://YOUR-VERCEL-APP.vercel.app
   COOKIE_SECRET = polybuddy-secret-key-change-in-production-2026
   ```

5. Click **"Create Web Service"**
6. Wait 5-10 minutes for first deployment
7. **COPY your Render API URL** (looks like: `https://polybuddy-api.onrender.com`)

---

### STEP 5: Update Vercel Environment Variable

1. Go to your Vercel Dashboard
2. Select your `polybuddy` project
3. Go to **Settings** → **Environment Variables**
4. Add or update:
   ```
   NEXT_PUBLIC_API_URL = https://polybuddy-api.onrender.com
   ```
5. Click **"Save"**
6. Go to **Deployments** tab
7. Click **"Redeploy"** on the latest deployment

---

### STEP 6: Test Your App! 🎉

1. Open your Vercel URL: `https://your-app.vercel.app`
2. The app should load and connect to your Render API
3. First request might take 30-60 seconds (free tier cold start)

---

## ⚠️ Important Notes:

- **Cold Starts**: Render free tier spins down after 15 minutes of inactivity. First request will be slow.
- **Database Expiry**: Free PostgreSQL expires after 90 days. You'll need to migrate or upgrade.
- **No Credit Card**: Render free tier doesn't require a credit card!

---

## 🆘 Need Help?

Just tell me which step you're on and I'll guide you through it!

---

## 📝 Quick Checklist:

- [ ] Render account created
- [ ] PostgreSQL database created
- [ ] Database URL copied
- [ ] Database migration run
- [ ] Web service created
- [ ] Environment variables added
- [ ] Render API URL copied
- [ ] Vercel environment variable updated
- [ ] Vercel redeployed
- [ ] App tested and working!

