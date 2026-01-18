-- Fixed function
CREATE OR REPLACE FUNCTION calculate_copy_performance(
    user_addr TEXT,
    period TEXT DEFAULT 'all_time'
) RETURNS TABLE (
    copied_trades INT,
    copied_roi DECIMAL,
    manual_trades INT,
    manual_roi DECIMAL,
    advantage DECIMAL,
    better_strat TEXT
) AS $$
DECLARE
    start_date TIMESTAMP;
BEGIN
    start_date := CASE period
        WHEN 'daily' THEN NOW() - INTERVAL '1 day'
        WHEN 'weekly' THEN NOW() - INTERVAL '7 days'
        WHEN 'monthly' THEN NOW() - INTERVAL '30 days'
        ELSE '1970-01-01'::TIMESTAMP
    END;
    
    RETURN QUERY
    SELECT 
        COUNT(CASE WHEN cp.is_manual = false THEN 1 END)::INT as copied_trades,
        COALESCE(AVG(CASE WHEN cp.is_manual = false THEN cp.roi_percentage END), 0)::DECIMAL as copied_roi,
        COUNT(CASE WHEN cp.is_manual = true THEN 1 END)::INT as manual_trades,
        COALESCE(AVG(CASE WHEN cp.is_manual = true THEN cp.roi_percentage END), 0)::DECIMAL as manual_roi,
        (COALESCE(AVG(CASE WHEN cp.is_manual = false THEN cp.roi_percentage END), 0) - 
         COALESCE(AVG(CASE WHEN cp.is_manual = true THEN cp.roi_percentage END), 0))::DECIMAL as advantage,
        CASE 
            WHEN AVG(CASE WHEN cp.is_manual = false THEN cp.roi_percentage END) > 
                 AVG(CASE WHEN cp.is_manual = true THEN cp.roi_percentage END) THEN 'copied'
            WHEN AVG(CASE WHEN cp.is_manual = true THEN cp.roi_percentage END) > 
                 AVG(CASE WHEN cp.is_manual = false THEN cp.roi_percentage END) THEN 'manual'
            ELSE 'equal'
        END::TEXT as better_strat
    FROM copied_positions cp
    WHERE cp.user_address = user_addr
        AND cp.status IN ('closed', 'stopped_out', 'target_hit')
        AND cp.closed_at >= start_date;
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Function fixed!' as status;
