-- Create outcome_patterns table for historical pattern analysis
CREATE TABLE IF NOT EXISTS outcome_patterns (
  id SERIAL PRIMARY KEY,
  cluster_type TEXT NOT NULL,
  pattern_name TEXT NOT NULL,
  frequency_percent DECIMAL(5, 2) NOT NULL,
  description TEXT NOT NULL,
  retail_implication TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_outcome_patterns_cluster ON outcome_patterns(cluster_type);

-- Insert sample outcome patterns for different market types
INSERT INTO outcome_patterns (cluster_type, pattern_name, frequency_percent, description, retail_implication) VALUES
  -- Election markets
  ('election', 'Late Surge', 23.5, 'Price remains stable until final 48 hours, then sharp movement as polls close', 'Retail often exits early, missing final volatility and profit opportunity'),
  ('election', 'Polling Whipsaw', 18.2, 'Price oscillates with each major poll release, creating false signals', 'Retail gets shaken out by volatility, while smart money accumulates on dips'),
  ('election', 'Incumbent Fade', 15.7, 'Incumbent-favored markets slowly decline as election approaches', 'Retail holds too long based on name recognition, ignoring momentum shift'),
  ('election', 'Underdog Rally', 12.3, 'Underdog odds improve steadily in final weeks despite early pessimism', 'Retail dismisses early, missing 3-5x return as narrative shifts'),
  
  -- Economic/Fed markets
  ('economic', 'Data-Driven Stairs', 31.2, 'Price moves in discrete steps following each economic data release', 'Retail chases after moves instead of positioning before announcements'),
  ('economic', 'Fed Pivot Anticipation', 22.8, 'Market prices in policy change weeks before official announcement', 'Retail waits for confirmation, entering after smart money has exited'),
  ('economic', 'Inflation Surprise', 19.4, 'Sudden repricing when CPI/PCE differs from consensus by >0.2%', 'Retail anchors to old price, slow to update beliefs with new data'),
  ('economic', 'Soft Landing Premium', 14.1, 'Markets overprice optimistic scenarios, then correct sharply', 'Retail buys the dream, holds through correction, exits at bottom'),
  
  -- Crypto markets
  ('crypto', 'Halving Hype Cycle', 28.9, 'Price peaks 2-3 months before event, then sells off despite bullish narrative', 'Retail buys the hype at peak, holds through -40% drawdown post-event'),
  ('crypto', 'Regulatory Whipsaw', 24.3, 'Extreme volatility around regulatory announcements, often reversing within days', 'Retail panic sells bottoms and FOMO buys tops on same news cycle'),
  ('crypto', 'ETF Approval Run', 21.6, 'Steady grind higher for months leading to approval, then immediate selloff', 'Retail enters late in run-up, becomes exit liquidity for early buyers'),
  ('crypto', 'Correlation Break', 16.8, 'Crypto decouples from traditional markets during risk-off events', 'Retail expects correlation to hold, gets caught wrong-sided'),
  
  -- Sports markets
  ('sports', 'Injury Overreaction', 26.4, 'Market overreacts to star player injury news, then gradually corrects', 'Retail panics on injury news, smart money fades the overreaction'),
  ('sports', 'Home Field Premium', 22.1, 'Home team consistently overvalued by 3-5% vs historical win rates', 'Retail overweights home advantage, creating value on road teams'),
  ('sports', 'Playoff Momentum Myth', 19.7, 'Recent form has minimal predictive power, but market overweights it', 'Retail chases hot teams, ignoring regression to mean'),
  ('sports', 'Underdog Playoff Value', 18.3, 'Underdogs cover spread 55%+ in playoff games vs 50% regular season', 'Retail backs favorites, creating systematic value on underdogs'),
  
  -- Geopolitical markets
  ('geopolitical', 'Crisis Fade', 29.3, 'Initial panic pricing reverses as crisis becomes normalized', 'Retail sells at panic lows, missing recovery as attention shifts'),
  ('geopolitical', 'Escalation Ladder', 24.7, 'Markets price each escalation step, then stabilize until next level', 'Retail extrapolates linearly, missing that markets adapt to new normal'),
  ('geopolitical', 'Diplomatic Theater', 21.2, 'Announcements move markets, but actual policy changes lag by months', 'Retail trades headlines, ignores that implementation takes time'),
  ('geopolitical', 'Sanction Anticipation', 17.9, 'Markets price sanctions before official announcement based on leaks', 'Retail waits for official news, entering after move is complete'),
  
  -- Tech/Product markets
  ('tech', 'Launch Hype Cycle', 32.1, 'Product launches priced optimistically, then reality-check correction', 'Retail buys the vision, holds through disappointing adoption data'),
  ('tech', 'Earnings Surprise Pattern', 25.8, 'Tech companies consistently beat/miss in predictable quarterly patterns', 'Retail ignores seasonal patterns, surprised by recurring outcomes'),
  ('tech', 'Regulatory Overhang', 19.4, 'Markets discount heavily for potential regulation that rarely materializes', 'Retail avoids regulatory risk, missing value in overdiscounted scenarios'),
  ('tech', 'Adoption S-Curve', 15.2, 'Technology adoption follows S-curve, but market prices linearly', 'Retail misses inflection point where adoption accelerates');

