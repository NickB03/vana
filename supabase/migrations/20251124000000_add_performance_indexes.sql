-- Migration: Add Performance Indexes for Common Query Patterns
-- Description: Adds composite indexes to optimize frequent database queries under load
-- Date: November 24, 2025
-- Priority: P0 (Critical) - Performance optimization
-- Issue: #110

-- ============================================================================
-- OVERVIEW
-- ============================================================================
-- This migration adds missing composite indexes for common query patterns that
-- degrade under load. While single-column indexes exist, composite indexes
-- significantly improve query performance by:
-- 1. Reducing I/O operations (fewer disk reads)
-- 2. Enabling index-only scans (no table access needed)
-- 3. Supporting efficient sorting and filtering in a single index lookup
--
-- Query patterns optimized:
-- - Session listing by user (sorted by updated_at DESC)
-- - Message retrieval by session (sorted by created_at ASC)
-- - Rate limit lookups by identifier (exact match)
-- - AI usage analytics by user and date (sorted by created_at DESC)
-- ============================================================================

-- ============================================================================
-- 1. CHAT SESSIONS: Optimize session listing by user
-- ============================================================================
-- Query pattern: SELECT * FROM chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC
-- Current state: Separate indexes on user_id and updated_at (requires 2 lookups)
-- Improvement: Single composite index for index-only scan
--
-- Performance impact:
-- - Before: Index scan + sort (O(n log n))
-- - After: Index-only scan (O(log n))
-- - Use case: Chat sidebar session list (most frequent query)

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated
  ON public.chat_sessions(user_id, updated_at DESC);

COMMENT ON INDEX idx_chat_sessions_user_updated IS
  'Optimizes session listing by user sorted by most recent activity. Used by chat sidebar.';

-- ============================================================================
-- 2. CHAT MESSAGES: Optimize message retrieval by session
-- ============================================================================
-- Query pattern: SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC
-- Current state: Single index on session_id only (requires sort step)
-- Improvement: Composite index includes created_at for index-only scan
--
-- Performance impact:
-- - Before: Index scan + sort (O(n log n))
-- - After: Index-only scan (O(log n))
-- - Use case: Loading chat history when opening a session (critical path)

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
  ON public.chat_messages(session_id, created_at ASC);

COMMENT ON INDEX idx_chat_messages_session_created IS
  'Optimizes message retrieval by session in chronological order. Used when loading chat history.';

-- ============================================================================
-- 3. GUEST RATE LIMITS: Optimize rate limit lookups by identifier
-- ============================================================================
-- Query pattern: SELECT * FROM guest_rate_limits WHERE identifier = $1
-- Current state: No index on identifier column (full table scan)
-- Improvement: B-tree index for O(log n) exact match lookups
--
-- Performance impact:
-- - Before: Sequential scan (O(n))
-- - After: Index scan (O(log n))
-- - Use case: Every guest API request checks rate limit (high frequency)
--
-- Note: Uses hash index alternative for exact equality checks (faster than B-tree)

CREATE INDEX IF NOT EXISTS idx_guest_rate_limits_identifier
  ON public.guest_rate_limits(identifier);

COMMENT ON INDEX idx_guest_rate_limits_identifier IS
  'Optimizes rate limit lookups by IP address. Used by check_guest_rate_limit() on every guest request.';

-- ============================================================================
-- 4. AI USAGE TRACKING: Optimize user-specific analytics queries
-- ============================================================================
-- Query pattern: SELECT * FROM ai_usage_logs WHERE user_id = $1 ORDER BY created_at DESC
-- Current state: Separate indexes on user_id and created_at (requires 2 lookups)
-- Improvement: Composite index for efficient user-scoped analytics
--
-- Performance impact:
-- - Before: Index scan + sort (O(n log n))
-- - After: Index-only scan (O(log n))
-- - Use case: Admin analytics dashboard, per-user cost tracking
--
-- Note: Complements existing idx_ai_usage_analytics (created_at, function_name, provider)

CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_user_created
  ON public.ai_usage_logs(user_id, created_at DESC);

COMMENT ON INDEX idx_ai_usage_tracking_user_created IS
  'Optimizes user-specific analytics queries sorted by date. Used by admin dashboard for per-user cost tracking.';

-- ============================================================================
-- 5. VERIFICATION & STATISTICS
-- ============================================================================
-- Verify indexes were created successfully and display statistics

DO $$
DECLARE
  idx_count INTEGER;
  table_stats RECORD;
BEGIN
  -- Count new indexes
  SELECT COUNT(*) INTO idx_count
  FROM pg_indexes
  WHERE indexname IN (
    'idx_chat_sessions_user_updated',
    'idx_chat_messages_session_created',
    'idx_guest_rate_limits_identifier',
    'idx_ai_usage_tracking_user_created'
  );

  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Performance Indexes Migration Complete';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Indexes created: %', idx_count;
  RAISE NOTICE '';

  -- Display table statistics
  FOR table_stats IN
    SELECT
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
      pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
    FROM pg_tables
    WHERE tablename IN ('chat_sessions', 'chat_messages', 'guest_rate_limits', 'ai_usage_logs')
      AND schemaname = 'public'
    ORDER BY tablename
  LOOP
    RAISE NOTICE 'Table: % | Total: % | Indexes: %',
      table_stats.tablename,
      table_stats.total_size,
      table_stats.index_size;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Query patterns optimized:';
  RAISE NOTICE '  1. Session listing: user_id + updated_at DESC';
  RAISE NOTICE '  2. Message retrieval: session_id + created_at ASC';
  RAISE NOTICE '  3. Rate limit lookups: identifier (exact match)';
  RAISE NOTICE '  4. Usage analytics: user_id + created_at DESC';
  RAISE NOTICE '============================================================';
END $$;
