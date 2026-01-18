-- Create timing_windows table for market timing analysis
CREATE TABLE IF NOT EXISTS timing_windows (
  id SERIAL PRIMARY KEY,
  market_id TEXT NOT NULL,
  window_type TEXT NOT NULL CHECK (window_type IN ('dead_zone', 'danger_window', 'final_positioning', 'opportunity_window')),
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  reason TEXT NOT NULL,
  retail_guidance TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_timing_windows_market ON timing_windows(market_id);
CREATE INDEX IF NOT EXISTS idx_timing_windows_time ON timing_windows(starts_at, ends_at);


