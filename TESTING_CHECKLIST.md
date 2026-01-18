# 🚀 Quick Test Guide - PolyBuddy API Integration

## ✅ Servers Running

The application is now running with:
- **API Server**: http://localhost:3001
- **Web App**: http://localhost:3000
- **Database**: PostgreSQL with 20 demo traders

---

## 🧪 Test Checklist

### 1. **Homepage - Best Bets Banner** ⭐
**URL**: `http://localhost:3000`

**What to check**:
- [ ] Massive yellow "BEST BETS" banner at the very top
- [ ] Three stat cards showing:
  - 20+ Elite Traders
  - 85%+ Win Rate  
  - $500K+ Profits Tracked
- [ ] Two large CTA buttons:
  - 🎯 BEST BETS (yellow/gold)
  - 🏆 ELITE TRADERS (green)
- [ ] Three feature cards below:
  - ⚡ Elite Signals
  - 🎯 Copy Trading
  - 📊 Real-Time Data

---

### 2. **Elite Traders Page** 🏆
**URL**: `http://localhost:3000/elite-traders`

**What to check**:
- [ ] Page loads without errors
- [ ] Shows leaderboard table with traders
- [ ] Data includes:
  - Wallet addresses
  - Elite scores (0-100)
  - Win rates
  - Profit factors
  - Total profits
  - Trader tiers (Elite, Strong, etc.)
- [ ] Filter controls work
- [ ] Tier badges display correctly

---

### 3. **Best Bets Page** 🎯
**URL**: `http://localhost:3000/best-bets`

**What to check**:
- [ ] Page loads
- [ ] Shows Best Bets structure
- [ ] Ready for market integration

---

### 4. **Navigation** 🧭
**Check all pages**:
- [ ] "Best Bets" link visible in main navigation
- [ ] "Elite Traders" link visible in main navigation
- [ ] Both links work and navigate correctly
- [ ] Navigation is consistent across pages

---

### 5. **API Endpoints** 🔌

Open a new terminal and test these:

```bash
# Test 1: Get system stats
curl http://localhost:3001/api/admin/stats

# Expected: JSON with totalTraders, eliteTraders, avgEliteScore, etc.
```

```bash
# Test 2: Get all elite traders
curl http://localhost:3001/api/elite-traders

# Expected: Array of traders with scores, metrics, rankings
```

```bash
# Test 3: Get only elite tier traders
curl "http://localhost:3001/api/elite-traders?tier=elite&limit=5"

# Expected: Top 5 elite traders (score 80+)
```

```bash
# Test 4: Get specific trader
curl http://localhost:3001/api/elite-traders/0x1111111111111111111111111111111111111111

# Expected: Full details for trader #1 (Elite, score ~92.5)
```

```bash
# Test 5: Refresh data
curl -X POST http://localhost:3001/api/admin/refresh-demo-data

# Expected: {"success":true,"message":"Demo data refreshed successfully","tradersCount":20}
```

---

## 📸 What Success Looks Like

### Homepage Should Show:
```
====================================
🎯 BEST BETS 🎯
Copy Elite Traders • Get AI Signals • Win More Bets

[20+]        [85%+]       [$500K+]
Elite        Win Rate     Profits
Traders                   Tracked

[🎯 BEST BETS] [🏆 ELITE TRADERS]
====================================
```

### Elite Traders Page Should Show:
```
┌──────────────────────────────────────────────┐
│ Elite Traders Leaderboard                    │
├──────────────────────────────────────────────┤
│ Rank │ Address │ Score │ Win% │ Profit │ Tier│
├──────────────────────────────────────────────┤
│  1   │ 0x1111  │ 92.5  │ 89.5%│$18.5K │Elite│
│  2   │ 0x2222  │ 90.3  │ 86.2%│$16.2K │Elite│
│  3   │ 0x3333  │ 87.8  │ 84.1%│$14.8K │Elite│
│  ... │   ...   │  ...  │  ... │  ...  │ ... │
└──────────────────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### Issue: Can't see Best Bets banner
**Solution**:
1. Hard refresh: `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)
2. Check browser console for errors (F12)
3. Verify web server is running: `http://localhost:3000`

### Issue: Elite Traders page is empty
**Solution**:
1. Check API server is running: `curl http://localhost:3001/api/elite-traders`
2. Verify database has data: 
   ```bash
   docker exec -it polybuddy-db-1 psql -U polybuddy -d polybuddy -c "SELECT COUNT(*) FROM wallet_performance;"
   ```
3. If count is 0, run: 
   ```bash
   docker exec -i polybuddy-db-1 psql -U polybuddy -d polybuddy < setup-elite-traders.sql
   ```

### Issue: API returns 500 errors
**Solution**:
1. Check API terminal window for error messages
2. Verify `.env` has `DATABASE_URL=postgresql://polybuddy:polybuddy@localhost:5432/polybuddy`
3. Restart API server:
   ```bash
   cd d:\pb\polybuddy\polybuddy
   pnpm --filter @polybuddy/api dev
   ```

### Issue: Pages load slowly
**Solution**:
- This is normal for dev mode on first load
- Subsequent loads should be faster
- Production build will be much faster

---

## 📊 Demo Data Overview

**20 Traders** with realistic performance:

| Tier | Count | Score Range | Win Rate Range |
|------|-------|-------------|----------------|
| Elite | 5 | 82-92 | 80-90% |
| Strong | 7 | 60-78 | 63-78% |
| Moderate | 6 | 46-60 | 45-60% |
| Limited | 2 | 35-38 | 35-39% |

**Top 5 Elite Traders**:
1. `0x1111...` - Score: 92.5, Win: 89.5%, Profit: $18,500
2. `0x2222...` - Score: 90.3, Win: 86.2%, Profit: $16,200
3. `0x3333...` - Score: 87.8, Win: 84.1%, Profit: $14,800
4. `0x4444...` - Score: 85.2, Win: 82.5%, Profit: $13,500
5. `0x5555...` - Score: 82.6, Win: 81.3%, Profit: $12,100

---

## ✅ Success Criteria

**All tests pass if**:
- ✅ Homepage shows Best Bets banner prominently
- ✅ Elite Traders page loads with 20 traders
- ✅ Navigation links work correctly
- ✅ All API endpoints return valid JSON
- ✅ No console errors in browser
- ✅ Data matches expected demo values

---

## 🎉 Next Steps

Once testing is complete, you can:

1. **Add Real Data**: Configure Polymarket API keys
2. **Run Sync Job**: Fetch real trader data
3. **Deploy**: Build for production
4. **Customize**: Adjust scoring thresholds, UI styling, etc.

---

**Status**: ✅ READY TO TEST  
**Last Updated**: 2026-01-11  
**Test Duration**: ~5 minutes
