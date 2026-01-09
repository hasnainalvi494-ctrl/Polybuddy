# 🚀 Quick Deploy Guide - You're Almost Done!

## ✅ What's Already Done

- ✅ Code pushed to GitHub
- ✅ Vercel connected
- ✅ Deployment configs created

## 🎯 What You Need to Do (5-10 minutes)

### Step 1: Get Your Vercel URL

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Find your "Polybuddy" project
3. Copy the deployment URL (looks like: `https://polybuddy-xyz.vercel.app`)
4. **Keep this URL handy!** 📋

### Step 2: Deploy API on Railway

1. **Go to Railway:** https://railway.app

2. **Sign in with GitHub**

3. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose "Polybuddy" from the list
   - Click "Deploy Now"

4. **Add PostgreSQL:**
   - In your project, click "New"
   - Select "Database" → "Add PostgreSQL"
   - Wait for it to provision (~30 seconds)

5. **Configure Your API Service:**
   - Click on your main service (not the database)
   - Click "Variables" tab
   - Add these variables:

   ```
   PORT = 3001
   NODE_ENV = production
   CORS_ORIGIN = https://your-vercel-url.vercel.app
   COOKIE_SECRET = [generate below]
   ```

   **To generate COOKIE_SECRET:**
   - Open PowerShell and run:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   - Copy the output and paste it as the value

6. **Generate Public URL:**
   - Click "Settings" tab
   - Scroll to "Networking"
   - Click "Generate Domain"
   - Copy the URL (looks like: `https://polybuddy-production.up.railway.app`)
   - **Keep this URL handy!** 📋

### Step 3: Run Database Migrations

1. **Get Database URL from Railway:**
   - Click on your PostgreSQL database
   - Click "Variables" tab
   - Copy the `DATABASE_URL` value

2. **Run migrations locally:**
   ```powershell
   # In your project directory
   $env:DATABASE_URL="paste-your-railway-database-url-here"
   pnpm run db:push
   ```

   You should see: "✓ Schema pushed successfully"

### Step 4: Connect Frontend to API

1. **Go back to Vercel:** https://vercel.com/dashboard

2. **Open your Polybuddy project**

3. **Go to Settings → Environment Variables**

4. **Find `NEXT_PUBLIC_API_URL`** and update it:
   - Delete the old value
   - Add your Railway URL: `https://polybuddy-production.up.railway.app`
   - Click "Save"

5. **Redeploy:**
   - Go to "Deployments" tab
   - Click the "..." menu on the latest deployment
   - Click "Redeploy"
   - Wait 1-2 minutes

### Step 5: Test It! 🎉

1. **Visit your Vercel URL:** `https://your-app.vercel.app`

2. **Check if everything works:**
   - Markets should load
   - Charts should display
   - No errors in browser console (F12)

3. **Test API directly:**
   - Visit: `https://your-railway-url.railway.app/health`
   - Should show: `{"status":"ok","timestamp":"..."}`

---

## 🎊 You're Live!

Once you complete these steps, your app will be live and accessible to anyone!

**Share your URL:** Just give people your Vercel URL!

---

## ⚠️ Troubleshooting

### "Markets not loading"
- Check Vercel logs: Project → Deployments → Click deployment → "Logs"
- Make sure `NEXT_PUBLIC_API_URL` is correct
- Make sure you redeployed after changing env vars

### "API not responding"
- Check Railway logs: Click service → "Logs" tab
- Verify database migrations ran successfully
- Check `CORS_ORIGIN` includes your Vercel URL

### "Database connection error"
- Make sure you ran `pnpm run db:push`
- Verify `DATABASE_URL` is set in Railway (should be automatic)

---

## 📞 Need Help?

If you get stuck:
1. Check the error message in Railway logs or Vercel logs
2. Share the error with me and I'll help debug
3. Make sure all environment variables are set correctly

---

## 💰 Cost

- **Vercel:** Free (Hobby plan)
- **Railway:** $5/month credit (free to start)
- **Total:** $0 to start, ~$5/month after credit runs out

---

## 🔄 Future Deployments

Once set up, it's automatic:
```bash
git add -A
git commit -m "new feature"
git push origin main
```
Both Vercel and Railway will auto-deploy! 🚀

