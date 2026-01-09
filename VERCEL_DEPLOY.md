# 🚀 Deploy Frontend to Vercel

## Quick Steps to Get Your Public Link

### Step 1: Deploy to Vercel (5 minutes)

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Click "Add New..."** → Select **"Project"**
3. **Import your GitHub repository**:
   - If not connected, click "Import Git Repository"
   - Search for: `hasnainalvi494-ctrl/Polybuddy`
   - Click **"Import"**

4. **Configure Project Settings**:

   **Framework Preset**: Next.js (should auto-detect)
   
   **Root Directory**: Click **"Edit"** → Enter: `apps/web`
   
   **Build Settings** (should auto-detect):
   - Build Command: `pnpm run build`
   - Output Directory: `.next`
   - Install Command: `pnpm install`
   
   **Environment Variables**: Click **"Add"** and add:
   
   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_API_URL` | `https://polybuddy-api.onrender.com` |

5. **Click "Deploy"** 🚀

### Step 2: Wait for Deployment (2-3 minutes)

Vercel will:
- Install dependencies
- Build your Next.js app
- Deploy to their CDN
- Give you a public URL like: `https://polybuddy-xyz123.vercel.app`

### Step 3: Update API CORS Settings

Once you get your Vercel URL (e.g., `https://polybuddy-xyz123.vercel.app`):

1. Go to **Render Dashboard**: https://dashboard.render.com
2. Click on **"polybuddy-api"** service
3. Go to **"Environment"** tab
4. Find **`CORS_ORIGIN`** variable
5. Click **"Edit"** and change value to your Vercel URL
6. Click **"Save Changes"**
7. Render will automatically redeploy (takes 1-2 minutes)

### Step 4: Test Your App! 🎉

Visit your Vercel URL and you should see your Polybuddy app running!

---

## 🎯 What You'll Have After This:

- ✅ **Frontend**: `https://your-app.vercel.app` (public link you can share!)
- ✅ **API**: `https://polybuddy-api.onrender.com`
- ✅ **Database**: PostgreSQL on Render

---

## 🐛 Troubleshooting

### If Vercel build fails:

**Error: "Cannot find workspace"**
- Make sure Root Directory is set to `apps/web`

**Error: "pnpm not found"**
- Vercel should auto-detect pnpm from `pnpm-lock.yaml`
- If not, go to Project Settings → General → Package Manager → Select "pnpm"

**Error: "Build failed"**
- Check the build logs in Vercel dashboard
- Share the error message and I'll help fix it

### If the app loads but API calls fail:

**Check CORS settings:**
- Make sure `CORS_ORIGIN` in Render matches your Vercel URL exactly
- No trailing slash in the URL

**Check API URL:**
- Make sure `NEXT_PUBLIC_API_URL` in Vercel is set correctly
- Should be: `https://polybuddy-api.onrender.com`

---

## 📝 Optional: Custom Domain

Once everything works, you can add a custom domain:

1. Go to Vercel Project Settings → Domains
2. Add your domain (e.g., `polybuddy.com`)
3. Follow Vercel's DNS setup instructions
4. Update `CORS_ORIGIN` in Render to your custom domain

---

## 🎊 You're Done!

After completing these steps, you'll have a fully deployed app that you can share with anyone! 🚀

**Your public link will be**: `https://your-app-name.vercel.app`

Share this link with friends, investors, or users - it's live on the internet! 🌍

