-- Rollback script for long_term_memory table
-- This script safely removes the long_term_memory table and all associated indexes
-- WARNING: This will permanently delete all stored memories

-- Drop indexes first (order doesn't matter for indexes)
DROP INDEX IF EXISTS idx_ltm_user_id;
DROP INDEX IF EXISTS idx_ltm_namespace;
DROP INDEX IF EXISTS idx_ltm_user_namespace;
DROP INDEX IF EXISTS idx_ltm_importance;
DROP INDEX IF EXISTS idx_ltm_is_deleted;

-- Drop the table (foreign keys will be handled by CASCADE if configured)
DROP TABLE IF EXISTS long_term_memory;
