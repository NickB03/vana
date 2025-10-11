-- Migration: Add long_term_memory table
-- Created: 2025-10-11
-- Description: Adds long-term memory storage for AI agent personalization

-- Create long_term_memory table
CREATE TABLE IF NOT EXISTS long_term_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    namespace VARCHAR(50) NOT NULL,
    key VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    tags JSON,
    importance REAL NOT NULL DEFAULT 0.5,
    access_count INTEGER NOT NULL DEFAULT 0,
    last_accessed_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE (user_id, namespace, key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ltm_user_id ON long_term_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_ltm_namespace ON long_term_memory(namespace);
CREATE INDEX IF NOT EXISTS idx_ltm_user_namespace ON long_term_memory(user_id, namespace);
CREATE INDEX IF NOT EXISTS idx_ltm_importance ON long_term_memory(importance);
CREATE INDEX IF NOT EXISTS idx_ltm_is_deleted ON long_term_memory(is_deleted);

-- PostgreSQL version (comment out SQLite version above and use this)
-- CREATE TABLE IF NOT EXISTS long_term_memory (
--     id SERIAL PRIMARY KEY,
--     user_id INTEGER NOT NULL,
--     namespace VARCHAR(50) NOT NULL,
--     key VARCHAR(255) NOT NULL,
--     content TEXT NOT NULL,
--     tags JSONB,
--     importance REAL NOT NULL DEFAULT 0.5,
--     access_count INTEGER NOT NULL DEFAULT 0,
--     last_accessed_at TIMESTAMP WITH TIME ZONE,
--     expires_at TIMESTAMP WITH TIME ZONE,
--     is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
--     created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id),
--     CONSTRAINT uq_user_namespace_key UNIQUE (user_id, namespace, key)
-- );

-- CREATE INDEX IF NOT EXISTS idx_ltm_user_namespace ON long_term_memory(user_id, namespace);
-- CREATE INDEX IF NOT EXISTS idx_ltm_importance ON long_term_memory(importance) USING btree;
-- CREATE INDEX IF NOT EXISTS idx_ltm_tags ON long_term_memory USING GIN(tags);
