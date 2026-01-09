# 🚀 Quick Start - Get Your Public Link in 10 Minutes!

## Current Status
- ✅ **API**: Deployed and running at `https://polybuddy-api.onrender.com`
- ✅ **Database**: PostgreSQL on Render (16 tables created)
- ⏳ **Frontend**: Ready to deploy!

---

## 🎯 Deploy Frontend to Vercel (10 minutes)

### 1. Go to Vercel
Visit: **https://vercel.com/dashboard**

### 2. Import Your Project
1. Click **"Add New..."** → **"Project"**
2. Find your repo: `hasnainalvi494-ctrl/Polybuddy`
3. Click **"Import"**

### 3. Configure Settings

**Root Directory**: 
```
apps/web
```

**Environment Variables** - Add this ONE variable:
```
Name:  NEXT_PUBLIC_API_URL
Value: https://polybuddy-api.onrender.com
```

### 4. Deploy!
Click **"Deploy"** and wait 2-3 minutes.

You'll get a URL like: `https://polybuddy-abc123.vercel.app` ✨

---

## 🔧 Final Step: Update CORS

After you get your Vercel URL:

1. Go to **Render Dashboard**: https://dashboard.render.com
2. Click **"polybuddy-api"**
3. Go to **"Environment"** tab
4. Find **`CORS_ORIGIN`**
5. Click **"Edit"** → Change to your Vercel URL (e.g., `https://polybuddy-abc123.vercel.app`)
6. **Save** (Render will auto-redeploy in 1-2 mins)

---

## 🎉 Done!

**Your public link**: `https://polybuddy-abc123.vercel.app`

Share it with anyone - your app is live on the internet! 🌍

---

## 📱 What Your Users Will See

- **Home Page**: Market overview and signals
- **Markets**: Browse prediction markets
- **Signals**: Trading signals and insights
- **Watchlists**: Save favorite markets
- **Portfolio**: Track positions (requires login)
- **Alerts**: Set price alerts (requires login)

---

## 🐛 If Something Goes Wrong

### Vercel Build Fails
- Make sure **Root Directory** is set to `apps/web`
- Check that `NEXT_PUBLIC_API_URL` is set correctly

### App Loads But No Data
- Wait for Render API to wake up (first request takes 50 seconds on free tier)
- Check that `CORS_ORIGIN` in Render matches your Vercel URL exactly

### Need Help?
Share the error message and I'll help you fix it! 👍

---

## 💡 Pro Tips

1. **First Load is Slow**: Render free tier spins down after 15 mins. First visit takes 50+ seconds.
2. **Keep It Alive**: Visit your site regularly to keep it active
3. **Custom Domain**: You can add a custom domain in Vercel settings later
4. **Monitor**: Check Render logs if API issues occur

---

## 🔗 Your Deployment URLs

- **Frontend**: `https://your-app.vercel.app` (you'll get this after deploying)
- **API**: `https://polybuddy-api.onrender.com`
- **Render Dashboard**: https://dashboard.render.com
- **Vercel Dashboard**: https://vercel.com/dashboard

---

**Ready? Let's deploy! 🚀**

Follow the steps above and you'll have your public link in 10 minutes!

