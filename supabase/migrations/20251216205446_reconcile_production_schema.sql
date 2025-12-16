-- ============================================================================
-- RECONCILIATION MIGRATION: Sync Production with Local Schema
-- ============================================================================
-- Date: 2025-12-16
-- Purpose: Ensure production has all required policies, functions, and indexes
-- Safety: All statements are IDEMPOTENT (safe to run multiple times)
--
-- Root Cause: Production database was manually modified, removing critical
-- service_role policies that Edge Functions require to operate.
--
-- This migration ensures ALL required components exist regardless of
-- current production state.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: CRITICAL SERVICE_ROLE POLICIES
-- ============================================================================
-- These policies allow Edge Functions (using service_role key) to bypass RLS
-- Without these, ALL Edge Functions return 403 Forbidden

-- 1.1 chat_messages - service_role access
DO $$
BEGIN
  -- Drop any existing service_role policies (handle naming variations)
  DROP POLICY IF EXISTS "service_role_all_messages" ON public.chat_messages;
  DROP POLICY IF EXISTS "Service role can manage chat messages" ON public.chat_messages;

  -- Create the canonical policy
  CREATE POLICY "service_role_all_messages"
    ON public.chat_messages
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

  RAISE NOTICE 'Created service_role policy on chat_messages';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'service_role policy on chat_messages already exists';
END $$;

-- 1.2 chat_sessions - service_role access
DO $$
BEGIN
  DROP POLICY IF EXISTS "service_role_all_sessions" ON public.chat_sessions;
  DROP POLICY IF EXISTS "Service role can manage chat sessions" ON public.chat_sessions;

  CREATE POLICY "service_role_all_sessions"
    ON public.chat_sessions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

  RAISE NOTICE 'Created service_role policy on chat_sessions';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'service_role policy on chat_sessions already exists';
END $$;

-- 1.3 artifact_versions - service_role access
DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role can manage artifact versions" ON public.artifact_versions;
  DROP POLICY IF EXISTS "service_role_all_artifact_versions" ON public.artifact_versions;

  CREATE POLICY "Service role can manage artifact versions"
    ON public.artifact_versions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

  RAISE NOTICE 'Created service_role policy on artifact_versions';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'service_role policy on artifact_versions already exists';
END $$;

-- 1.4 guest_rate_limits - service_role access
DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role can manage guest rate limits" ON public.guest_rate_limits;
  DROP POLICY IF EXISTS "service_role_all_guest_rate_limits" ON public.guest_rate_limits;

  CREATE POLICY "Service role can manage guest rate limits"
    ON public.guest_rate_limits
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

  RAISE NOTICE 'Created service_role policy on guest_rate_limits';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'service_role policy on guest_rate_limits already exists';
END $$;

-- 1.5 user_rate_limits - service_role access (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_rate_limits' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Service role can manage user rate limits" ON public.user_rate_limits;
    DROP POLICY IF EXISTS "service_role_all_user_rate_limits" ON public.user_rate_limits;

    CREATE POLICY "Service role can manage user rate limits"
      ON public.user_rate_limits
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    RAISE NOTICE 'Created service_role policy on user_rate_limits';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'service_role policy on user_rate_limits already exists';
END $$;

-- 1.6 api_throttle - service_role access (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_throttle' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Service role can manage api throttle" ON public.api_throttle;
    DROP POLICY IF EXISTS "service_role_all_api_throttle" ON public.api_throttle;

    CREATE POLICY "Service role can manage api throttle"
      ON public.api_throttle
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    RAISE NOTICE 'Created service_role policy on api_throttle';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'service_role policy on api_throttle already exists';
END $$;

-- 1.7 ai_usage_logs - service_role access (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_usage_logs' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Service role can insert usage logs" ON public.ai_usage_logs;
    DROP POLICY IF EXISTS "service_role_insert_ai_usage_logs" ON public.ai_usage_logs;

    CREATE POLICY "Service role can insert usage logs"
      ON public.ai_usage_logs
      FOR INSERT
      TO service_role
      WITH CHECK (true);

    RAISE NOTICE 'Created service_role INSERT policy on ai_usage_logs';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'service_role policy on ai_usage_logs already exists';
END $$;

-- 1.8 app_settings - service_role access (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_settings' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Service role can manage app settings" ON public.app_settings;

    CREATE POLICY "Service role can manage app settings"
      ON public.app_settings
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    RAISE NOTICE 'Created service_role policy on app_settings';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'service_role policy on app_settings already exists';
END $$;

-- ============================================================================
-- SECTION 2: USER-FACING POLICIES (Ensure complete set exists)
-- ============================================================================
-- These allow authenticated users to access their own data

-- 2.1 chat_sessions user policies
DO $$
BEGIN
  -- Ensure user can view own sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chat_sessions'
    AND policyname IN ('allow_select_own_sessions', 'Users can view own chat sessions', 'Users can view their own chat sessions')
  ) THEN
    CREATE POLICY "Users can view own chat sessions"
      ON public.chat_sessions FOR SELECT
      USING (auth.uid() = user_id);
    RAISE NOTICE 'Created SELECT policy on chat_sessions';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chat_sessions'
    AND policyname IN ('allow_insert_own_sessions', 'Users can insert own chat sessions', 'Users can create their own chat sessions')
  ) THEN
    CREATE POLICY "Users can insert own chat sessions"
      ON public.chat_sessions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
    RAISE NOTICE 'Created INSERT policy on chat_sessions';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chat_sessions'
    AND policyname IN ('allow_update_own_sessions', 'Users can update own chat sessions', 'Users can update their own chat sessions')
  ) THEN
    CREATE POLICY "Users can update own chat sessions"
      ON public.chat_sessions FOR UPDATE
      USING (auth.uid() = user_id);
    RAISE NOTICE 'Created UPDATE policy on chat_sessions';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chat_sessions'
    AND policyname IN ('allow_delete_own_sessions', 'Users can delete own chat sessions', 'Users can delete their own chat sessions')
  ) THEN
    CREATE POLICY "Users can delete own chat sessions"
      ON public.chat_sessions FOR DELETE
      USING (auth.uid() = user_id);
    RAISE NOTICE 'Created DELETE policy on chat_sessions';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2.2 chat_messages user policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chat_messages'
    AND policyname IN ('allow_select_own_messages', 'Users can view messages in own sessions', 'Users can view messages from their sessions')
  ) THEN
    CREATE POLICY "Users can view messages in own sessions"
      ON public.chat_messages FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.chat_sessions
        WHERE chat_sessions.id = chat_messages.session_id
        AND chat_sessions.user_id = auth.uid()
      ));
    RAISE NOTICE 'Created SELECT policy on chat_messages';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chat_messages'
    AND policyname IN ('allow_insert_own_messages', 'Users can insert messages in own sessions', 'Users can create messages in their sessions')
  ) THEN
    CREATE POLICY "Users can insert messages in own sessions"
      ON public.chat_messages FOR INSERT
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.chat_sessions
        WHERE chat_sessions.id = chat_messages.session_id
        AND chat_sessions.user_id = auth.uid()
      ));
    RAISE NOTICE 'Created INSERT policy on chat_messages';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2.3 artifact_versions user policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'artifact_versions'
    AND policyname IN ('Users can view artifact versions for their sessions', 'Users can view versions from own messages')
  ) THEN
    CREATE POLICY "Users can view versions from own messages"
      ON public.artifact_versions FOR SELECT
      USING (message_id IN (
        SELECT cm.id FROM public.chat_messages cm
        JOIN public.chat_sessions cs ON cm.session_id = cs.id
        WHERE cs.user_id = auth.uid()
      ));
    RAISE NOTICE 'Created SELECT policy on artifact_versions';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- SECTION 3: REQUIRED FUNCTIONS (with SECURITY DEFINER)
-- ============================================================================

-- 3.1 update_updated_at_column trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 3.2 cleanup_old_artifact_versions function
CREATE OR REPLACE FUNCTION public.cleanup_old_artifact_versions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH versions_to_keep AS (
    SELECT id
    FROM (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY artifact_id
               ORDER BY version_number DESC
             ) as rn
      FROM artifact_versions
    ) t
    WHERE rn <= 20
  )
  DELETE FROM artifact_versions
  WHERE id NOT IN (SELECT id FROM versions_to_keep);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 3.3 cleanup_old_guest_rate_limits function
CREATE OR REPLACE FUNCTION public.cleanup_old_guest_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM guest_rate_limits
  WHERE last_request < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 3.4 reload_postgrest_schema_cache function
CREATE OR REPLACE FUNCTION public.reload_postgrest_schema_cache()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
  NOTIFY pgrst, 'reload config';
  RAISE NOTICE 'PostgREST schema cache reload requested at %', NOW();
END;
$$;

-- ============================================================================
-- SECTION 4: ENSURE TRIGGERS EXIST
-- ============================================================================

-- 4.1 chat_sessions updated_at trigger
DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4.2 user_preferences updated_at trigger (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences' AND table_schema = 'public') THEN
    DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
    CREATE TRIGGER update_user_preferences_updated_at
      BEFORE UPDATE ON public.user_preferences
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- SECTION 5: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  service_role_count INTEGER;
BEGIN
  -- Count total policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  -- Count service_role policies
  SELECT COUNT(*) INTO service_role_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND roles @> ARRAY['service_role']::name[];

  RAISE NOTICE '============================================';
  RAISE NOTICE 'RECONCILIATION COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total RLS policies: %', policy_count;
  RAISE NOTICE 'service_role policies: %', service_role_count;

  IF service_role_count < 6 THEN
    RAISE WARNING 'Expected at least 6 service_role policies, found %', service_role_count;
  ELSE
    RAISE NOTICE 'All critical service_role policies present';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION: Notify PostgREST to reload schema
-- ============================================================================
SELECT public.reload_postgrest_schema_cache();
