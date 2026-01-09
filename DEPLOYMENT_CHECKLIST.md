# ✅ Deployment Checklist

## 🎯 Current Status: Database Migration Complete! ✅

### What's Done:
- ✅ Code is complete and working locally
- ✅ GitHub repository is set up
- ✅ Vercel is connected (frontend)
- ✅ Configuration files created
- ✅ Render account created
- ✅ PostgreSQL database created on Render
- ✅ **Database migration completed successfully!** (16 tables created)
- ✅ Changes pushed to GitHub

### Next Steps:

## 📋 Render Web Service Deployment

### Step 4: Create Web Service (API) - **YOU ARE HERE** 👈

1. Go to your Render Dashboard: https://dashboard.render.com
2. Click **"New +"** button → Select **"Web Service"**
3. Connect your GitHub repository:
   - If not connected, click **"Connect account"**
   - Find and select: `hasnainalvi494-ctrl/Polybuddy`
4. Fill in the settings:
   
   **Basic Settings:**
   - **Name**: `polybuddy-api`
   - **Region**: **Singapore** (same as your database!)
   - **Branch**: `main`
   - **Root Directory**: Leave **blank**
   - **Runtime**: **Node**
   
   **Build & Start Commands:**
   - **Build Command**: 
     ```
     pnpm install && pnpm --filter @polybuddy/api build
     ```
   - **Start Command**: 
     ```
     pnpm --filter @polybuddy/api start
     ```
   
   **Plan:**
   - Select: **Free** ⬅️ Important!

5. Click **"Advanced"** to add Environment Variables:
   
   Click **"Add Environment Variable"** and add these **one by one**:
   
   ```
   Key: DATABASE_URL
   Value: postgresql://polybuddy:JXCvpMoBsBm14SFOZu8PxlBcYYY8fipa@dpg-d5gfc76uk2gs739h0gbg-a.singapore-postgres.render.com/polybuddy?sslmode=require
   
   Key: PORT
   Value: 10000
   
   Key: NODE_ENV
   Value: production
   
   Key: CORS_ORIGIN
   Value: https://YOUR-VERCEL-APP.vercel.app
   
   Key: COOKIE_SECRET
   Value: polybuddy-secret-key-change-in-production-2026
   ```
   
   **Note**: Replace `YOUR-VERCEL-APP` with your actual Vercel app name!

6. Click **"Create Web Service"**

7. Wait 5-10 minutes for the first deployment to complete

8. Once deployed, **COPY your Render API URL** (e.g., `https://polybuddy-api.onrender.com`)

---

### Step 5: Update Vercel Environment Variable

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Select your `polybuddy` project
3. Go to **Settings** → **Environment Variables**
4. Add or update:
   ```
   Key: NEXT_PUBLIC_API_URL
   Value: https://polybuddy-api.onrender.com
   ```
   (Use your actual Render API URL from Step 4)
5. Click **"Save"**
6. Go to **Deployments** tab
7. Click the **"..."** menu on the latest deployment → **"Redeploy"**

---

### Step 6: Test Your App! 🎉

1. Wait for Vercel redeploy to finish
2. Open your Vercel URL: `https://YOUR-APP.vercel.app`
3. The app should load and connect to your Render API
4. **Note**: First API request might take 30-60 seconds (free tier cold start)

---

## 🎊 You're Almost Done!

Just follow Step 4 above to create your Web Service on Render, then update Vercel!

**Need help?** Just ask! 😊
