-- Bundle Caching Tables Migration
-- Created: 2026-01-10
-- PR: #509 (Bundle Artifact Improvements Phase 2)
--
-- Purpose:
-- - Enable content-addressed caching for bundle artifacts (2-5s → instant on cache hit)
-- - Add CDN package URL caching with 24-hour TTL (reduce esm.sh/jsdelivr requests)
-- - Track bundle metrics for KPI monitoring (cache hit rate, bundle time)
--
-- Tables added:
-- 1. bundle_cache - SHA-256 content hash → storage path/URL mapping (4-week TTL)
-- 2. cdn_package_cache - Package/version → CDN URL mapping (24-hour TTL, is_bundle dimension)
-- 3. artifact_bundle_metrics - Analytics for bundle operations (cache hits, timing)
--
-- Security:
-- - All tables have RLS enabled (RLS ENABLED)
-- - Service role bypasses RLS for Edge Function access
-- - CHECK constraints prevent invalid data (positive sizes, valid providers)
--
-- Cleanup:
-- - cleanup_expired_caches() function removes entries older than TTL
-- - Can be scheduled with pg_cron (commented example at bottom)
-- - Keeps 90 days of metrics for trend analysis
--
-- Dependencies:
-- - Requires STORAGE bucket named "artifact-bundles" to exist
-- - Uses auth.uid() for RLS policies (requires authenticated requests)

-- ============================================================================
-- CDN Package Cache
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cdn_package_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_name TEXT NOT NULL,
  version TEXT NOT NULL,
  is_bundle BOOLEAN NOT NULL DEFAULT FALSE,
  cdn_url TEXT NOT NULL,
  cdn_provider TEXT NOT NULL CHECK (cdn_provider IN ('esm.sh', 'esm.run', 'jsdelivr')),
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(package_name, version, is_bundle)
);

CREATE INDEX idx_cdn_package_lookup ON public.cdn_package_cache(package_name, version, is_bundle);
CREATE INDEX idx_cdn_cache_cleanup ON public.cdn_package_cache(cached_at);

-- Enable RLS (service_role bypasses by default - no policies needed)
ALTER TABLE public.cdn_package_cache ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.cdn_package_cache IS 'Caches verified CDN URLs for npm packages with 24-hour TTL';

-- ============================================================================
-- Bundle Cache (single content_hash instead of split hashes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bundle_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Single SHA-256 hash of (code + sorted dependencies)
  content_hash TEXT NOT NULL UNIQUE,

  -- Storage reference
  storage_path TEXT NOT NULL,
  bundle_url TEXT NOT NULL,

  -- Metadata
  bundle_size INTEGER NOT NULL CHECK (bundle_size > 0),
  dependency_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Analytics
  hit_count INTEGER DEFAULT 0 CHECK (hit_count >= 0)
);

CREATE INDEX idx_bundle_cache_expires ON public.bundle_cache(expires_at);

ALTER TABLE public.bundle_cache ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.bundle_cache IS 'Hash-based bundle caching. Single content_hash = SHA-256(code + sorted deps)';
COMMENT ON COLUMN public.bundle_cache.content_hash IS 'SHA-256 hash via crypto.subtle.digest()';

-- ============================================================================
-- Bundle Metrics
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.artifact_bundle_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id TEXT NOT NULL,
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  bundle_time_ms INTEGER NOT NULL CHECK (bundle_time_ms >= 0),
  cache_hit BOOLEAN DEFAULT FALSE,
  cdn_provider TEXT,
  bundle_size INTEGER CHECK (bundle_size >= 0),
  fallback_used BOOLEAN DEFAULT FALSE,
  dependency_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bundle_metrics_created ON public.artifact_bundle_metrics(created_at);

ALTER TABLE public.artifact_bundle_metrics ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.artifact_bundle_metrics IS 'Analytics for bundle performance monitoring';

-- ============================================================================
-- Cleanup Function (includes SET search_path per CLAUDE.md rule 5)
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_caches()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count integer := 0;
  cdn_deleted integer;
  bundle_deleted integer;
  metrics_deleted integer;
BEGIN
  -- Clean expired CDN cache (24-hour TTL)
  DELETE FROM public.cdn_package_cache
  WHERE cached_at < NOW() - INTERVAL '24 hours';
  GET DIAGNOSTICS cdn_deleted = ROW_COUNT;

  -- Clean expired bundles
  DELETE FROM public.bundle_cache
  WHERE expires_at < NOW();
  GET DIAGNOSTICS bundle_deleted = ROW_COUNT;

  -- Clean old metrics (keep 90 days)
  DELETE FROM public.artifact_bundle_metrics
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS metrics_deleted = ROW_COUNT;

  deleted_count := cdn_deleted + bundle_deleted + metrics_deleted;
  RAISE NOTICE 'Cleaned up % CDN entries, % bundle entries, % metrics entries',
    cdn_deleted, bundle_deleted, metrics_deleted;
  RETURN deleted_count;
END;
$$;

-- To schedule with pg_cron (if available):
-- SELECT cron.schedule('cleanup-caches', '0 3 * * *', $$SELECT cleanup_expired_caches()$$);
