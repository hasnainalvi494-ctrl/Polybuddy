# 🔌 Elite Traders API Documentation

## Base URL
```
http://localhost:3001
```

---

## Endpoints

### 1. Get All Elite Traders

**GET** `/api/elite-traders`

Fetch a list of elite traders with filtering and pagination.

#### Query Parameters:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `tier` | enum | - | Filter by tier: `elite`, `strong`, `moderate`, `developing`, `limited` |
| `minScore` | number | - | Minimum elite score (0-100) |
| `category` | string | - | Filter by primary category |
| `limit` | number | 20 | Number of results (1-100) |
| `offset` | number | 0 | Pagination offset |

#### Response:
```json
{
  "traders": [
    {
      "walletAddress": "0x1234...",
      "eliteScore": 88.5,
      "traderTier": "elite",
      "riskProfile": "conservative",
      "winRate": 87.5,
      "profitFactor": 4.2,
      "sharpeRatio": 2.8,
      "maxDrawdown": 10.5,
      "totalProfit": 15000,
      "totalVolume": 80000,
      "tradeCount": 120,
      "rank": 1,
      "eliteRank": 1,
      "primaryCategory": "Crypto",
      "categorySpecialization": { "Crypto": 70, "Business": 30 },
      "strengths": ["Exceptional win rate", "Outstanding profit factor"],
      "warnings": [],
      "isRecommended": true
    }
  ],
  "total": 50,
  "eliteCount": 5,
  "strongCount": 12
}
```

#### Example Requests:
```bash
# Get top 10 elite tier traders
curl "http://localhost:3001/api/elite-traders?tier=elite&limit=10"

# Get traders with score above 70
curl "http://localhost:3001/api/elite-traders?minScore=70"

# Get crypto specialists
curl "http://localhost:3001/api/elite-traders?category=Crypto"
```

---

### 2. Get Single Trader Details

**GET** `/api/elite-traders/:address`

Get detailed information for a specific trader.

#### Path Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | string | Wallet address |

#### Response:
```json
{
  "walletAddress": "0x1234...",
  "eliteScore": 88.5,
  "traderTier": "elite",
  "riskProfile": "conservative",
  "winRate": 87.5,
  "profitFactor": 4.2,
  "sharpeRatio": 2.8,
  "maxDrawdown": 10.5,
  "totalProfit": 15000,
  "totalVolume": 80000,
  "tradeCount": 120,
  "rank": 1,
  "eliteRank": 1,
  "primaryCategory": "Crypto",
  "categorySpecialization": { "Crypto": 70, "Business": 30 },
  "strengths": ["Exceptional win rate"],
  "warnings": [],
  "isRecommended": true
}
```

#### Example Request:
```bash
curl "http://localhost:3001/api/elite-traders/0x1234567890abcdef1234567890abcdef12345678"
```

---

### 3. Get Elite Traders Leaderboard

**GET** `/api/elite-traders/leaderboard`

Get the leaderboard of top traders.

#### Query Parameters:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `eliteOnly` | boolean | true | Show only elite tier traders |
| `limit` | number | 50 | Number of results (1-100) |

#### Response:
```json
{
  "leaderboard": [
    {
      "walletAddress": "0x1234...",
      "eliteScore": 92.3,
      "traderTier": "elite",
      "riskProfile": "conservative",
      "winRate": 89.2,
      "profitFactor": 5.1,
      "sharpeRatio": 3.2,
      "maxDrawdown": 8.5,
      "totalProfit": 25000,
      "totalVolume": 120000,
      "tradeCount": 200,
      "rank": 1,
      "eliteRank": 1,
      "primaryCategory": "Crypto",
      "categorySpecialization": { "Crypto": 80, "Sports": 20 },
      "strengths": ["Exceptional win rate", "Outstanding profit factor", "Excellent risk-adjusted returns"],
      "warnings": [],
      "isRecommended": true
    }
  ]
}
```

#### Example Requests:
```bash
# Top 10 elite traders
curl "http://localhost:3001/api/elite-traders/leaderboard?limit=10"

# All top traders (not just elite)
curl "http://localhost:3001/api/elite-traders/leaderboard?eliteOnly=false&limit=50"
```

---

### 4. Get Best Bets Recommendations

**GET** `/api/best-bets`

Get market recommendations based on elite trader activity.

#### Query Parameters:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category` | string | - | Filter by market category |
| `minConfidence` | number | 50 | Minimum confidence score (0-100) |
| `minEliteTraders` | number | 2 | Minimum number of elite traders |
| `trending` | boolean | false | Show only trending markets |
| `limit` | number | 10 | Number of results (1-50) |

#### Response:
```json
{
  "bestBets": [
    {
      "marketId": "market-123",
      "marketQuestion": "Will Bitcoin reach $100K by end of 2026?",
      "marketCategory": "Crypto",
      "eliteTraderCount": 5,
      "avgEliteScore": 88.5,
      "totalEliteVolume": 50000,
      "eliteConsensus": "bullish",
      "consensusStrength": 85,
      "recommendationStrength": "strong",
      "recommendedSide": "yes",
      "confidenceScore": 92,
      "currentPrice": 0.68,
      "avgEliteEntryPrice": 0.65,
      "potentialReturn": 47,
      "riskLevel": "low",
      "topTraders": [
        {
          "address": "0x1234...",
          "eliteScore": 92.3,
          "position": "yes",
          "confidence": 95
        }
      ],
      "lastEliteActivity": "2026-01-11T10:30:00Z",
      "activityTrend": "increasing"
    }
  ],
  "total": 5
}
```

#### Example Requests:
```bash
# Top 5 best bets with high confidence
curl "http://localhost:3001/api/best-bets?minConfidence=80&limit=5"

# Trending crypto markets
curl "http://localhost:3001/api/best-bets?category=Crypto&trending=true"

# Markets with 3+ elite traders
curl "http://localhost:3001/api/best-bets?minEliteTraders=3"
```

---

## Data Models

### Trader Tier Enum
```typescript
type TraderTier = "elite" | "strong" | "moderate" | "developing" | "limited"
```

- **elite**: Score 80-100, proven track record
- **strong**: Score 60-79, solid performance
- **moderate**: Score 40-59, decent performance
- **developing**: Score 20-39, building track record
- **limited**: Score 0-19, insufficient data

### Risk Profile Enum
```typescript
type RiskProfile = "conservative" | "moderate" | "aggressive"
```

### Elite Consensus Enum
```typescript
type Consensus = "bullish" | "bearish" | "mixed"
```

### Recommendation Strength Enum
```typescript
type RecommendationStrength = "strong" | "moderate" | "weak"
```

### Activity Trend Enum
```typescript
type ActivityTrend = "increasing" | "stable" | "decreasing"
```

---

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": "Error message description"
}
```

**Common Status Codes:**
- `200`: Success
- `404`: Resource not found
- `500`: Internal server error

---

## Frontend Integration Examples

### React/Next.js

#### Fetch Elite Traders:
```typescript
const fetchEliteTraders = async () => {
  const response = await fetch(
    'http://localhost:3001/api/elite-traders?tier=elite&limit=20'
  );
  const data = await response.json();
  return data.traders;
};
```

#### Fetch Best Bets:
```typescript
const fetchBestBets = async () => {
  const response = await fetch(
    'http://localhost:3001/api/best-bets?minConfidence=75&limit=10'
  );
  const data = await response.json();
  return data.bestBets;
};
```

#### Fetch Single Trader:
```typescript
const fetchTraderProfile = async (address: string) => {
  const response = await fetch(
    `http://localhost:3001/api/elite-traders/${address}`
  );
  if (response.ok) {
    return await response.json();
  } else {
    throw new Error('Trader not found');
  }
};
```

---

## Testing the API

### Using cURL:

```bash
# Test basic connectivity
curl http://localhost:3001/api/elite-traders

# Test with filters
curl "http://localhost:3001/api/elite-traders?tier=elite&limit=5"

# Test specific trader
curl http://localhost:3001/api/elite-traders/0x1234567890abcdef1234567890abcdef12345678

# Test leaderboard
curl http://localhost:3001/api/elite-traders/leaderboard?limit=10

# Test best bets
curl http://localhost:3001/api/best-bets?minConfidence=80
```

### Using Browser:

Simply open these URLs in your browser:
- http://localhost:3001/api/elite-traders
- http://localhost:3001/api/elite-traders/leaderboard
- http://localhost:3001/api/best-bets

---

## Performance Notes

- **Caching**: Consider implementing Redis caching for frequently accessed endpoints
- **Rate Limiting**: No rate limiting currently implemented
- **Pagination**: Use `limit` and `offset` for large datasets
- **Indexing**: Database has indexes on `elite_score`, `trader_tier`, and `win_rate`

---

## Future Enhancements

Planned improvements:
- [ ] Real-time WebSocket updates for Best Bets
- [ ] Historical trader performance charts
- [ ] Trader comparison endpoint
- [ ] Custom scoring weights
- [ ] Market-specific trader recommendations
- [ ] Copy trading automation endpoints

---

**API Version:** 1.0.0  
**Last Updated:** January 11, 2026
