# 🚀 Deployment Checklist

## ✅ Completed
- [x] Code pushed to GitHub
- [x] Vercel connected
- [x] Railway configuration files created

## 📋 Your Action Items

### 1️⃣ Get Your Vercel URL (1 minute)
- [ ] Go to https://vercel.com/dashboard
- [ ] Find "Polybuddy" project
- [ ] Copy the URL (e.g., `https://polybuddy-xyz.vercel.app`)
- [ ] Write it here: `_________________________________`

### 2️⃣ Deploy API on Railway (5 minutes)
- [ ] Go to https://railway.app and sign in with GitHub
- [ ] Click "New Project" → "Deploy from GitHub repo"
- [ ] Select "Polybuddy" repository
- [ ] Click "Deploy Now"
- [ ] Click "New" → "Database" → "Add PostgreSQL"
- [ ] Wait for database to provision

### 3️⃣ Configure Railway Environment Variables
- [ ] Click on your service (not database)
- [ ] Click "Variables" tab
- [ ] Add these variables:
  ```
  PORT = 3001
  NODE_ENV = production
  CORS_ORIGIN = [paste your Vercel URL here]
  COOKIE_SECRET = [generate using command below]
  ```
- [ ] Generate COOKIE_SECRET:
  ```powershell
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```

### 4️⃣ Get Railway API URL
- [ ] In Railway, click "Settings" → "Networking"
- [ ] Click "Generate Domain"
- [ ] Copy the URL (e.g., `https://polybuddy-production.up.railway.app`)
- [ ] Write it here: `_________________________________`

### 5️⃣ Run Database Migrations
- [ ] In Railway, click on PostgreSQL database
- [ ] Click "Variables" tab
- [ ] Copy the `DATABASE_URL`
- [ ] Run in your terminal:
  ```powershell
  $env:DATABASE_URL="[paste DATABASE_URL here]"
  pnpm run db:push
  ```
- [ ] Verify you see: "✓ Schema pushed successfully"

### 6️⃣ Connect Vercel to Railway
- [ ] Go to Vercel dashboard
- [ ] Open Polybuddy project
- [ ] Go to Settings → Environment Variables
- [ ] Update `NEXT_PUBLIC_API_URL` to your Railway URL
- [ ] Click "Save"
- [ ] Go to Deployments → Click "..." → "Redeploy"

### 7️⃣ Test Your Deployment
- [ ] Visit your Vercel URL
- [ ] Check if markets load
- [ ] Check if charts display
- [ ] Open browser console (F12) - should have no errors
- [ ] Visit `[your-railway-url]/health` - should show status OK

---

## 🎉 Success!

Once all checkboxes are checked, your app is live!

**Your URLs:**
- Frontend: `_________________________________`
- API: `_________________________________`

**Share your app:** Just share your Vercel URL!

---

## ⏱️ Time Estimate
- Total: 10-15 minutes
- Most time is waiting for deployments

---

## 🆘 Need Help?

If you get stuck on any step:
1. Check the error message in Railway/Vercel logs
2. Let me know which step you're on
3. Share any error messages you see

I'm here to help! 🙂

