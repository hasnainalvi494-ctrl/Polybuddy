-- Add missing elite trader columns if they don't exist
ALTER TABLE wallet_performance 
ADD COLUMN IF NOT EXISTS avg_holding_time INTEGER,
ADD COLUMN IF NOT EXISTS longest_win_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS secondary_category TEXT,
ADD COLUMN IF NOT EXISTS category_specialization JSONB;

-- Now insert demo traders
INSERT INTO wallet_performance (
  wallet_address, total_profit, total_volume, win_rate, trade_count, roi_percent,
  primary_category, last_trade_at, profit_factor, sharpe_ratio, max_drawdown,
  consecutive_wins, avg_holding_time, market_timing_score, risk_adjusted_returns,
  risk_profile, category_distribution, total_loss, gross_profit, total_trades,
  winning_trades, losing_trades, average_profit_per_trade, average_loss_per_trade,
  max_profit, max_loss, std_dev_returns, elite_score, trader_tier, rank, elite_rank,
  longest_win_streak
) VALUES
('0x1111111111111111111111111111111111111111', 18500, 95000, 89.5, 150, 19.47, 'Crypto', NOW(), 4.85, 3.20, 8.30, 18, 90, 95, 4.20, 'conservative', '{"Crypto":75,"Business":25}'::jsonb, 4500, 23000, 150, 134, 16, 171.64, 281.25, 1200, -450, 0.12, 92.5, 'elite', 1, 1, 18),
('0x2222222222222222222222222222222222222222', 16200, 78000, 86.2, 128, 20.77, 'Sports', NOW(), 4.32, 2.95, 9.80, 15, 105, 91.5, 3.85, 'conservative', '{"Sports":85,"Entertainment":15}'::jsonb, 4100, 20300, 128, 110, 18, 184.55, 227.78, 1050, -380, 0.14, 90.3, 'elite', 2, 2, 15),
('0x3333333333333333333333333333333333333333', 14800, 72000, 84.1, 115, 20.56, 'Politics', NOW(), 3.95, 2.75, 11.20, 12, 135, 88, 3.50, 'moderate', '{"Politics":80,"Business":20}'::jsonb, 4200, 19000, 115, 97, 18, 195.88, 233.33, 950, -420, 0.16, 87.8, 'elite', 3, 3, 12),
('0x4444444444444444444444444444444444444444', 13200, 68000, 82.5, 105, 19.41, 'Business', NOW(), 3.68, 2.55, 12.50, 11, 150, 85.5, 3.25, 'moderate', '{"Business":70,"Crypto":30}'::jsonb, 4300, 17500, 105, 87, 18, 201.15, 238.89, 880, -390, 0.17, 85.2, 'elite', 4, 4, 11),
('0x5555555555555555555555555555555555555555', 11900, 62000, 81.3, 98, 19.19, 'Entertainment', NOW(), 3.42, 2.40, 13.80, 10, 165, 82, 3.00, 'moderate', '{"Entertainment":75,"Sports":25}'::jsonb, 4500, 16400, 98, 80, 18, 205.00, 250.00, 820, -410, 0.18, 82.6, 'elite', 5, 5, 10),
('0x6666666666666666666666666666666666666666', 9800, 55000, 76.4, 85, 17.82, 'Crypto', NOW(), 2.85, 2.10, 16.20, 8, 180, 78, 2.60, 'moderate', '{"Crypto":65,"Politics":35}'::jsonb, 5200, 15000, 85, 65, 20, 230.77, 260.00, 750, -480, 0.22, 76.8, 'strong', 6, NULL, 8),
('0x7777777777777777777777777777777777777777', 8600, 50000, 74.2, 78, 17.20, 'Sports', NOW(), 2.65, 1.95, 17.50, 7, 195, 74.5, 2.40, 'moderate', '{"Sports":70,"Entertainment":30}'::jsonb, 5400, 14000, 78, 58, 20, 241.38, 270.00, 680, -520, 0.24, 73.5, 'strong', 7, NULL, 7),
('0x8888888888888888888888888888888888888888', 7500, 46000, 72.8, 72, 16.30, 'Politics', NOW(), 2.48, 1.80, 18.80, 6, 210, 71, 2.20, 'moderate', '{"Politics":75,"Business":25}'::jsonb, 5600, 13100, 72, 52, 20, 251.92, 280.00, 620, -550, 0.26, 70.2, 'strong', 8, NULL, 6),
('0x9999999999999999999999999999999999999999', 6800, 42000, 70.5, 65, 16.19, 'Business', NOW(), 2.32, 1.68, 20.10, 6, 225, 68.5, 2.05, 'moderate', '{"Business":60,"Crypto":40}'::jsonb, 5800, 12600, 65, 46, 19, 273.91, 305.26, 580, -580, 0.28, 67.8, 'strong', 9, NULL, 6),
('0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 6200, 39000, 69.2, 60, 15.90, 'Entertainment', NOW(), 2.18, 1.55, 21.50, 5, 240, 66, 1.90, 'moderate', '{"Entertainment":70,"Sports":30}'::jsonb, 6000, 12200, 60, 42, 18, 290.48, 333.33, 540, -610, 0.30, 65.4, 'strong', 10, NULL, 5),
('0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', 5600, 36000, 67.8, 55, 15.56, 'Crypto', NOW(), 2.05, 1.42, 22.80, 5, 255, 63.5, 1.75, 'aggressive', '{"Crypto":80,"Business":20}'::jsonb, 6200, 11800, 55, 37, 18, 318.92, 344.44, 510, -640, 0.32, 63.2, 'strong', 11, NULL, 5),
('0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', 5100, 34000, 66.5, 52, 15.00, 'Sports', NOW(), 1.95, 1.32, 24.20, 4, 270, 61, 1.60, 'aggressive', '{"Sports":65,"Politics":35}'::jsonb, 6400, 11500, 52, 35, 17, 328.57, 376.47, 480, -670, 0.34, 61.5, 'strong', 12, NULL, 4),
('0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD', 4700, 32000, 65.2, 48, 14.69, 'Politics', NOW(), 1.86, 1.25, 25.50, 4, 285, 59, 1.48, 'aggressive', '{"Politics":70,"Entertainment":30}'::jsonb, 6600, 11300, 48, 31, 17, 364.52, 388.24, 460, -690, 0.36, 60.1, 'strong', 13, NULL, 4),
('0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE', 4200, 30000, 62.5, 45, 14.00, 'Business', NOW(), 1.68, 1.10, 27.80, 3, 300, 55, 1.30, 'aggressive', '{"Business":55,"Crypto":45}'::jsonb, 7000, 11200, 45, 28, 17, 400.00, 411.76, 430, -720, 0.38, 56.8, 'moderate', 14, NULL, 3),
('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', 3800, 28000, 60.8, 42, 13.57, 'Entertainment', NOW(), 1.58, 1.02, 29.50, 3, 315, 52.5, 1.18, 'aggressive', '{"Entertainment":60,"Sports":40}'::jsonb, 7200, 11000, 42, 26, 16, 423.08, 450.00, 400, -750, 0.40, 54.2, 'moderate', 15, NULL, 3),
('0x0000000000000000000000000000000000000001', 3400, 26000, 59.2, 38, 13.08, 'Crypto', NOW(), 1.48, 0.95, 31.20, 3, 330, 50, 1.05, 'aggressive', '{"Crypto":70,"Politics":30}'::jsonb, 7400, 10800, 38, 23, 15, 469.57, 493.33, 380, -780, 0.42, 51.9, 'moderate', 16, NULL, 3),
('0x0000000000000000000000000000000000000002', 3000, 24000, 57.8, 35, 12.50, 'Sports', NOW(), 1.40, 0.88, 32.80, 2, 345, 48, 0.95, 'aggressive', '{"Sports":75,"Entertainment":25}'::jsonb, 7600, 10600, 35, 20, 15, 530.00, 506.67, 360, -810, 0.44, 49.8, 'moderate', 17, NULL, 2),
('0x0000000000000000000000000000000000000003', 2600, 22000, 56.4, 32, 11.82, 'Politics', NOW(), 1.32, 0.82, 34.50, 2, 360, 46, 0.85, 'aggressive', '{"Politics":65,"Business":35}'::jsonb, 7800, 10400, 32, 18, 14, 577.78, 557.14, 340, -840, 0.46, 47.6, 'moderate', 18, NULL, 2),
('0x0000000000000000000000000000000000000004', 2300, 20000, 55.0, 30, 11.50, 'Business', NOW(), 1.26, 0.75, 36.20, 2, 375, 44, 0.78, 'aggressive', '{"Business":60,"Crypto":40}'::jsonb, 8000, 10300, 30, 17, 13, 605.88, 615.38, 320, -870, 0.48, 45.5, 'moderate', 19, NULL, 2),
('0x0000000000000000000000000000000000000005', 2000, 18000, 53.6, 28, 11.11, 'Entertainment', NOW(), 1.20, 0.70, 38.00, 2, 390, 42, 0.70, 'aggressive', '{"Entertainment":55,"Sports":45}'::jsonb, 8200, 10200, 28, 15, 13, 680.00, 630.77, 300, -900, 0.50, 43.8, 'moderate', 20, NULL, 2)

ON CONFLICT (wallet_address) DO UPDATE SET
  total_profit = EXCLUDED.total_profit,
  elite_score = EXCLUDED.elite_score,
  trader_tier = EXCLUDED.trader_tier,
  updated_at = NOW();

SELECT COUNT(*) as total_traders, 
       COUNT(*) FILTER (WHERE trader_tier = 'elite') as elite_count,
       COUNT(*) FILTER (WHERE trader_tier = 'strong') as strong_count
FROM wallet_performance 
WHERE elite_score IS NOT NULL;
