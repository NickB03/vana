-- Helper function to get usage overview for admin dashboard

CREATE OR REPLACE FUNCTION get_usage_overview(p_days integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'totalRequests', (
      SELECT COUNT(*) FROM ai_usage_logs
      WHERE created_at >= NOW() - (p_days || ' days')::interval
    ),
    'totalCost', (
      SELECT COALESCE(SUM(estimated_cost), 0)::decimal(10,2) FROM ai_usage_logs
      WHERE created_at >= NOW() - (p_days || ' days')::interval
    ),
    'successRate', (
      SELECT COALESCE(
        COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300)::decimal / NULLIF(COUNT(*), 0),
        0
      )::decimal(4,3)
      FROM ai_usage_logs
      WHERE created_at >= NOW() - (p_days || ' days')::interval
    ),
    'avgLatency', (
      SELECT COALESCE(AVG(latency_ms), 0)::integer FROM ai_usage_logs
      WHERE created_at >= NOW() - (p_days || ' days')::interval
      AND status_code >= 200 AND status_code < 300
    ),
    'todayCost', (
      SELECT COALESCE(SUM(estimated_cost), 0)::decimal(10,2) FROM ai_usage_logs
      WHERE created_at >= CURRENT_DATE
    ),
    'todayRequests', (
      SELECT COUNT(*) FROM ai_usage_logs
      WHERE created_at >= CURRENT_DATE
    ),
    'byProvider', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          provider,
          COUNT(*) as requests,
          SUM(estimated_cost)::decimal(10,2) as cost
        FROM ai_usage_logs
        WHERE created_at >= NOW() - (p_days || ' days')::interval
        GROUP BY provider
        ORDER BY cost DESC
      ) t
    ),
    'byFunction', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          function_name,
          COUNT(*) as requests,
          SUM(estimated_cost)::decimal(10,2) as cost,
          AVG(latency_ms)::integer as avg_latency
        FROM ai_usage_logs
        WHERE created_at >= NOW() - (p_days || ' days')::interval
        GROUP BY function_name
        ORDER BY cost DESC
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_usage_overview IS 'Get comprehensive usage overview for admin dashboard';
