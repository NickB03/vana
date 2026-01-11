/**
 * Bundle Metrics Recording
 *
 * Records bundle performance metrics for analytics.
 * Fire-and-forget pattern - never blocks the main response.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

export interface BundleMetric {
  artifactId: string;
  sessionId: string;
  bundleTimeMs: number;
  cacheHit: boolean;
  cdnProvider?: string;
  bundleSize?: number;
  fallbackUsed: boolean;
  dependencyCount: number;
}

/**
 * Record bundle metrics (fire-and-forget).
 * Never throws - errors are logged but don't affect the caller.
 */
export async function recordBundleMetrics(
  metrics: BundleMetric,
  requestId: string
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from('artifact_bundle_metrics')
      .insert({
        artifact_id: metrics.artifactId,
        session_id: metrics.sessionId,
        bundle_time_ms: metrics.bundleTimeMs,
        cache_hit: metrics.cacheHit,
        cdn_provider: metrics.cdnProvider,
        bundle_size: metrics.bundleSize,
        fallback_used: metrics.fallbackUsed,
        dependency_count: metrics.dependencyCount
      });

    if (error) {
      console.error(`[${requestId}] Metrics recording failed:`, error.message);
    } else {
      console.log(`[${requestId}] Metrics recorded: ${metrics.bundleTimeMs}ms, cache=${metrics.cacheHit}`);
    }
  } catch (error) {
    console.error(`[${requestId}] Metrics error:`, error);
  }
}
