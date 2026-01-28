-- Migration: Restore Schema Grants (Security-Hardened)
-- Issue: #273 - Fix signup 401 errors caused by missing PostgreSQL schema grants
-- Date: 2025-12-13
-- Security Review: Passed (least-privilege principle applied)
--
-- Problem: The anon, authenticated, and service_role roles lack USAGE permission
-- on the public schema, causing signup failures with 401 errors.
--
-- Solution: Grant minimal necessary schema access following principle of least privilege.
-- The anon role gets USAGE + SELECT only. RLS policies provide row-level restrictions.

-- ============================================================================
-- SCHEMA ACCESS
-- ============================================================================

-- Grant USAGE on public schema to all Supabase roles
-- This is required for the PostgREST API to access objects in the schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ============================================================================
-- TABLE PERMISSIONS
-- ============================================================================

-- anon (unauthenticated): SELECT only - RLS policies restrict which rows
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- authenticated (logged in users): Full DML - RLS policies restrict which rows
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- service_role: Full access - bypasses RLS (for server-side operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- ============================================================================
-- SEQUENCE PERMISSIONS
-- ============================================================================

-- Sequences needed for INSERT operations (auto-increment IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- ============================================================================
-- ROUTINE/FUNCTION PERMISSIONS
-- ============================================================================

-- authenticated + service_role can execute all functions
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;

-- anon: Only grant EXECUTE on specific public-facing functions
-- (Individual grants should be added in the migrations that create those functions)

-- ============================================================================
-- DEFAULT PRIVILEGES FOR FUTURE OBJECTS
-- ============================================================================

-- Future tables
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;

-- Future sequences
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;

-- Future routines
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON ROUTINES TO authenticated, service_role;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- To revert this migration, run:
--
-- REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon;
-- REVOKE SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM authenticated;
-- REVOKE ALL ON ALL TABLES IN SCHEMA public FROM service_role;
-- REVOKE USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public FROM authenticated, service_role;
-- REVOKE EXECUTE ON ALL ROUTINES IN SCHEMA public FROM authenticated, service_role;
-- REVOKE USAGE ON SCHEMA public FROM anon, authenticated, service_role;
--
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
--   REVOKE SELECT ON TABLES FROM anon;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
--   REVOKE ALL ON TABLES FROM service_role;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
--   REVOKE USAGE, SELECT ON SEQUENCES FROM authenticated, service_role;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
--   REVOKE EXECUTE ON ROUTINES FROM authenticated, service_role;
