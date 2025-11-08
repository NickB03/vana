-- Verification Script for Security Fixes
-- Run this with: supabase db query --linked < scripts/verify-security-fixes.sql

\echo '============================================================================'
\echo 'VERIFICATION: Security Fixes Applied'
\echo '============================================================================'
\echo ''

\echo '1. Checking SECURITY DEFINER functions have search_path set...'
\echo '----------------------------------------------------------------'
SELECT
  p.proname AS function_name,
  CASE 
    WHEN proconfig IS NULL THEN '❌ NO search_path'
    WHEN proconfig::text LIKE '%search_path%' THEN '✅ search_path SET'
    ELSE '❌ NO search_path'
  END AS status,
  proconfig
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.prosecdef = true
ORDER BY p.proname;

\echo ''
\echo '2. Checking guest_rate_limits table exists...'
\echo '----------------------------------------------------------------'
SELECT
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'guest_rate_limits'
    ) THEN '✅ guest_rate_limits table EXISTS'
    ELSE '❌ guest_rate_limits table MISSING'
  END AS status;

\echo ''
\echo '3. Checking check_guest_rate_limit function exists...'
\echo '----------------------------------------------------------------'
SELECT
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' 
      AND p.proname = 'check_guest_rate_limit'
    ) THEN '✅ check_guest_rate_limit function EXISTS'
    ELSE '❌ check_guest_rate_limit function MISSING'
  END AS status;

\echo ''
\echo '4. Checking guest_rate_limits table structure...'
\echo '----------------------------------------------------------------'
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'guest_rate_limits'
ORDER BY ordinal_position;

\echo ''
\echo '5. Checking RLS is enabled on guest_rate_limits...'
\echo '----------------------------------------------------------------'
SELECT
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS ENABLED'
    ELSE '❌ RLS DISABLED'
  END AS rls_status
FROM pg_tables
WHERE tablename = 'guest_rate_limits';

\echo ''
\echo '============================================================================'
\echo 'VERIFICATION COMPLETE'
\echo '============================================================================'

