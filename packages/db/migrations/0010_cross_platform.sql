-- Create cross_platform_markets table
CREATE TABLE IF NOT EXISTS cross_platform_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  polymarket_id TEXT,
  kalshi_id TEXT,
  limitless_id TEXT,
  match_confidence DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create cross_platform_prices table
CREATE TABLE IF NOT EXISTS cross_platform_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cross_platform_market_id UUID REFERENCES cross_platform_markets(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('polymarket', 'kalshi', 'limitless')),
  yes_price DECIMAL(10, 4),
  no_price DECIMAL(10, 4),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_cross_platform_markets_polymarket ON cross_platform_markets(polymarket_id);
CREATE INDEX IF NOT EXISTS idx_cross_platform_markets_kalshi ON cross_platform_markets(kalshi_id);
CREATE INDEX IF NOT EXISTS idx_cross_platform_markets_limitless ON cross_platform_markets(limitless_id);
CREATE INDEX IF NOT EXISTS idx_cross_platform_prices_market ON cross_platform_prices(cross_platform_market_id);
CREATE INDEX IF NOT EXISTS idx_cross_platform_prices_timestamp ON cross_platform_prices(timestamp);

-- Insert some mock cross-platform market mappings for demo
INSERT INTO cross_platform_markets (polymarket_id, kalshi_id, limitless_id, match_confidence) VALUES
  ('will-trump-win-2024', 'PRES-2024-TRUMP', 'trump-2024', 95.5),
  ('fed-rate-cut-march', 'FED-RATE-MAR', 'fed-march-cut', 92.0),
  ('bitcoin-100k-2024', 'BTC-100K-2024', 'btc-100k', 88.5);

-- Insert mock price data for demo
INSERT INTO cross_platform_prices (cross_platform_market_id, platform, yes_price, no_price, timestamp)
SELECT 
  id,
  'polymarket',
  0.6520,
  0.3510,
  NOW()
FROM cross_platform_markets WHERE polymarket_id = 'will-trump-win-2024';

INSERT INTO cross_platform_prices (cross_platform_market_id, platform, yes_price, no_price, timestamp)
SELECT 
  id,
  'kalshi',
  0.6300,
  0.3700,
  NOW()
FROM cross_platform_markets WHERE polymarket_id = 'will-trump-win-2024';

INSERT INTO cross_platform_prices (cross_platform_market_id, platform, yes_price, no_price, timestamp)
SELECT 
  id,
  'limitless',
  0.6610,
  0.3420,
  NOW()
FROM cross_platform_markets WHERE polymarket_id = 'will-trump-win-2024';

