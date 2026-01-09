# Environment Variables for Production

## Frontend (Vercel)

Add these in **Vercel Dashboard → Settings → Environment Variables**:

```env
NEXT_PUBLIC_API_URL=https://your-api-url.railway.app
NEXT_PUBLIC_WS_URL=wss://your-api-url.railway.app/ws
```

## Backend (Railway/Render)

Add these in **Railway/Render Dashboard → Variables**:

```env
PORT=3001
DATABASE_URL=postgresql://user:password@host:5432/database
CORS_ORIGIN=https://your-app.vercel.app
COOKIE_SECRET=your-secure-random-string
NODE_ENV=production
```

### Generate Secure Cookie Secret

```bash
# On Mac/Linux:
openssl rand -base64 32

# Or use Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Important Notes

- ✅ Never commit `.env` files to git
- ✅ Use different values for staging and production
- ✅ Keep `DATABASE_URL` and `COOKIE_SECRET` secure
- ✅ Update `CORS_ORIGIN` with your actual Vercel URL
- ✅ Railway automatically sets `DATABASE_URL` if you add PostgreSQL

