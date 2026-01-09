# 🔧 Fix for Render Build Error

## The Problem:
Render is complaining about pnpm lockfile version mismatch.

## The Solution:
Update your **Build Command** in Render to bypass the frozen lockfile check.

---

## 📝 Steps to Fix:

### 1. Go to your Render Web Service
- Dashboard → `polybuddy-api` service

### 2. Click on "Settings" (left sidebar)

### 3. Scroll down to "Build & Deploy"

### 4. Update the **Build Command** to:

```bash
pnpm install --no-frozen-lockfile && pnpm --filter @polybuddy/api build
```

### 5. Click **"Save Changes"**

### 6. Go back to the main service page and click **"Manual Deploy"** → **"Deploy latest commit"**

---

## Alternative Solution (if above doesn't work):

If the build still fails, try this simpler build command:

```bash
npm install -g pnpm@9.15.4 && pnpm install --no-frozen-lockfile && pnpm --filter @polybuddy/api build
```

This ensures the exact pnpm version is used.

---

## 🎯 Expected Result:
The build should now succeed and your API will be deployed!

Let me know once you've updated the build command and I'll help you with the next step! 🚀

