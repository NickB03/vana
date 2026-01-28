-- Analytics Views for AI Usage Dashboard
-- Pre-computed aggregations for fast dashboard loading

-- Daily usage summary
CREATE OR REPLACE VIEW ai_usage_daily_summary AS
SELECT
  date_trunc('day', created_at) AS day,
  function_name,
  provider,
  model,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300) AS successful_requests,
  COUNT(*) FILTER (WHERE status_code >= 400) AS failed_requests,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  SUM(total_tokens) AS total_tokens,
  SUM(estimated_cost) AS total_cost,
  AVG(latency_ms) AS avg_latency_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms) AS median_latency_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_latency_ms,
  AVG(retry_count) AS avg_retry_count
FROM ai_usage_logs
GROUP BY day, function_name, provider, model
ORDER BY day DESC;

COMMENT ON VIEW ai_usage_daily_summary IS 'Daily aggregated AI usage metrics for dashboard';

-- Hourly usage summary (last 7 days only for performance)
CREATE OR REPLACE VIEW ai_usage_hourly_summary AS
SELECT
  date_trunc('hour', created_at) AS hour,
  function_name,
  provider,
  COUNT(*) AS total_requests,
  SUM(estimated_cost) AS total_cost,
  COUNT(*) FILTER (WHERE status_code >= 400) AS error_count
FROM ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY hour, function_name, provider
ORDER BY hour DESC;

COMMENT ON VIEW ai_usage_hourly_summary IS 'Hourly usage for real-time monitoring (last 7 days)';

-- Cost breakdown by function
CREATE OR REPLACE VIEW ai_cost_by_function AS
SELECT
  function_name,
  provider,
  model,
  COUNT(*) AS request_count,
  SUM(estimated_cost) AS total_cost,
  AVG(estimated_cost) AS avg_cost_per_request,
  SUM(estimated_cost) / NULLIF(COUNT(*), 0) AS cost_per_request
FROM ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY function_name, provider, model
ORDER BY total_cost DESC;

COMMENT ON VIEW ai_cost_by_function IS 'Cost breakdown by function for budget analysis (last 30 days)';

-- Error rate analysis
CREATE OR REPLACE VIEW ai_error_analysis AS
SELECT
  date_trunc('hour', created_at) AS hour,
  function_name,
  status_code,
  COUNT(*) AS error_count,
  array_agg(DISTINCT error_message) FILTER (WHERE error_message IS NOT NULL) AS error_messages
FROM ai_usage_logs
WHERE status_code >= 400
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY hour, function_name, status_code
ORDER BY hour DESC, error_count DESC;

COMMENT ON VIEW ai_error_analysis IS 'Error patterns for debugging (last 7 days)';

-- Performance trends
CREATE OR REPLACE VIEW ai_performance_trends AS
SELECT
  date_trunc('hour', created_at) AS hour,
  function_name,
  provider,
  COUNT(*) AS request_count,
  AVG(latency_ms) AS avg_latency,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_latency,
  AVG(response_length) AS avg_response_length
FROM ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY hour, function_name, provider
ORDER BY hour DESC;

COMMENT ON VIEW ai_performance_trends IS 'Performance metrics over time (last 7 days)';

-- Grant access to authenticated users (RLS will still apply)
GRANT SELECT ON ai_usage_daily_summary TO authenticated;
GRANT SELECT ON ai_usage_hourly_summary TO authenticated;
GRANT SELECT ON ai_cost_by_function TO authenticated;
GRANT SELECT ON ai_error_analysis TO authenticated;
GRANT SELECT ON ai_performance_trends TO authenticated;
