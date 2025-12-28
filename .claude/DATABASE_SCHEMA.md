# Database Schema

## Overview

Vana uses Supabase (PostgreSQL) for data persistence, authentication, and real-time features. All tables have Row Level Security (RLS) enabled for multi-tenant isolation.

## Core Tables

### chat_sessions

Stores chat conversation sessions with smart context management.

**Columns**:
- `id` (UUID, PK) — Session identifier
- `user_id` (UUID, FK → auth.users) — Session owner
- `title` (TEXT) — Auto-generated session title
- `first_message` (TEXT) — First user message (for context)
- `conversation_summary` (TEXT) — AI-generated summary when context exceeds limit
- `summary_checkpoint` (INT) — Message count at last summarization
- `last_summarized_at` (TIMESTAMPTZ) — Timestamp of last summary
- `created_at` (TIMESTAMPTZ) — Session creation time
- `updated_at` (TIMESTAMPTZ) — Last activity timestamp

**RLS Policies**:
- Users can only access their own sessions
- Service role has full access

### chat_messages

Stores individual messages within sessions.

**Columns**:
- `id` (UUID, PK) — Message identifier
- `session_id` (UUID, FK → chat_sessions) — Parent session
- `role` (TEXT) — `user` | `assistant` | `system`
- `content` (TEXT) — Message text content
- `reasoning` (TEXT, nullable) — GLM-4.6 thinking/reasoning output
- `reasoning_steps` (JSONB, nullable) — Structured reasoning steps
- `search_results` (JSONB, nullable) — Tavily web search results
- `token_count` (INT) — Token count for context management
- `artifact_ids` (TEXT[], nullable) — Array of artifact IDs in this message
- `created_at` (TIMESTAMPTZ) — Message timestamp

**RLS Policies**:
- Users can only access messages from their own sessions

### artifact_versions

Tracks versioning history for artifacts.

**Columns**:
- `id` (UUID, PK) — Version identifier
- `message_id` (UUID, FK → chat_messages) — Parent message
- `artifact_id` (TEXT) — Artifact identifier (stable across versions)
- `version_number` (INT) — Incremental version number
- `artifact_type` (TEXT) — Type: `react`, `html`, `svg`, `mermaid`, etc.
- `artifact_title` (TEXT) — User-friendly title
- `artifact_content` (TEXT) — Artifact source code
- `content_hash` (TEXT) — SHA-256 hash for deduplication
- `created_at` (TIMESTAMPTZ) — Version creation time

**RLS Policies**:
- Users can only access artifacts from their own sessions

## Rate Limiting Tables

### guest_rate_limits

Tracks rate limits for unauthenticated users (IP-based).

**Columns**:
- `id` (UUID, PK) — Record identifier
- `identifier` (TEXT, UNIQUE) — IP address or fingerprint
- `request_count` (INT) — Requests in current window
- `window_start` (TIMESTAMPTZ) — Window start timestamp
- `last_request` (TIMESTAMPTZ) — Last request timestamp
- `first_request_at` (TIMESTAMPTZ) — First ever request

**RLS Policies**:
- No RLS (accessed by service role only)

### user_rate_limits

Tracks global rate limits for authenticated users.

**Columns**:
- `id` (UUID, PK) — Record identifier
- `user_id` (UUID, FK → auth.users, UNIQUE) — User identifier
- `request_count` (INT) — Requests in current window
- `window_start` (TIMESTAMPTZ) — Window start timestamp
- `last_request` (TIMESTAMPTZ) — Last request timestamp
- `created_at` (TIMESTAMPTZ) — First request timestamp

**RLS Policies**:
- Users can view own rate limit status

### user_tool_rate_limits

**Purpose**: Tool-specific rate limits for authenticated users (Issue #340 Phase 0)

**Columns**:
- `id` (UUID, PK) — Record identifier
- `user_id` (UUID, FK → auth.users) — User identifier
- `tool_name` (TEXT) — Tool name: `generate_artifact`, `generate_image`, `browser.search`
- `request_count` (INT) — Requests in current window
- `window_start` (TIMESTAMPTZ) — Window start timestamp
- `last_request` (TIMESTAMPTZ) — Last request timestamp
- `created_at` (TIMESTAMPTZ) — First request timestamp
- **UNIQUE** (`user_id`, `tool_name`) — One record per user-tool pair

**Indexes**:
- `idx_user_tool_rate_limits_lookup` on (`user_id`, `tool_name`, `window_start`)

**RLS Policies**:
- Users can view own tool rate limits

### api_throttle

Tracks global API throttling (prevents abuse of external APIs).

**Columns**:
- `id` (UUID, PK) — Record identifier
- `api_name` (TEXT, UNIQUE) — API name: `openrouter`, `glm`, `tavily`
- `request_count` (INT) — Requests in current window
- `window_start` (TIMESTAMPTZ) — Window start timestamp
- `last_request` (TIMESTAMPTZ) — Last request timestamp
- `created_at` (TIMESTAMPTZ) — First request timestamp

**RLS Policies**:
- No RLS (service role only)

## Analytics Tables

### ai_usage_logs

Comprehensive logging of all AI API calls for analytics and cost tracking.

**Columns**:
- `id` (UUID, PK) — Log identifier
- `request_id` (TEXT) — Request correlation ID
- `function_name` (TEXT) — Edge Function name
- `provider` (TEXT) — `openrouter`, `z.ai`
- `model` (TEXT) — Model identifier
- `user_id` (UUID, nullable) — User ID (if authenticated)
- `is_guest` (BOOLEAN) — Guest user flag
- `input_tokens` (INT) — Prompt tokens
- `output_tokens` (INT) — Completion tokens
- `total_tokens` (INT) — Total tokens
- `latency_ms` (INT) — Response latency in milliseconds
- `status_code` (INT) — HTTP status code
- `estimated_cost` (NUMERIC) — Estimated API cost in USD
- `error_message` (TEXT, nullable) — Error details (if failed)
- `retry_count` (INT) — Number of retries
- `prompt_preview` (TEXT, nullable) — First 100 chars of prompt
- `response_length` (INT, nullable) — Response length in chars
- `created_at` (TIMESTAMPTZ) — Log timestamp

**RLS Policies**:
- Admin-only access (not exposed to regular users)

### message_feedback

Tracks user feedback (thumbs up/down) on assistant messages.

**Columns**:
- `id` (UUID, PK) — Feedback identifier
- `message_id` (UUID, FK → chat_messages) — Rated message
- `session_id` (UUID, FK → chat_sessions) — Parent session
- `feedback_type` (TEXT) — `positive` | `negative`
- `created_at` (TIMESTAMPTZ) — Feedback timestamp

**RLS Policies**:
- Users can only submit feedback for their own messages

## RPC Functions

### check_user_tool_rate_limit

**Purpose**: Atomically check and update tool-specific rate limits for authenticated users

**Signature**:
```sql
check_user_tool_rate_limit(
  p_user_id UUID,
  p_tool_name TEXT,
  p_max_requests INTEGER,
  p_window_hours INTEGER
) RETURNS JSONB
```

**Returns**:
```json
{
  "allowed": true,
  "remaining": 45,
  "reset_at": "2025-12-27T15:30:00Z",
  "current_count": 5,
  "limit": 50
}
```

**Security**: `SECURITY DEFINER` with `SET search_path = public, pg_temp`

**Permissions**: Granted to `authenticated` and `service_role`

**Usage** (from Edge Functions):
```typescript
const { data } = await supabase.rpc('check_user_tool_rate_limit', {
  p_user_id: session.user.id,
  p_tool_name: 'generate_artifact',
  p_max_requests: 50,
  p_window_hours: 5
});

if (!data.allowed) {
  throw new Error(`Rate limit exceeded. Resets at ${data.reset_at}`);
}
```

### update_app_setting

**Purpose**: Update global app settings (admin only)

**Signature**:
```sql
update_app_setting(
  setting_key TEXT,
  setting_value JSONB
) RETURNS VOID
```

**Security**: `SECURITY DEFINER` with admin role check

**Usage**:
```typescript
await supabase.rpc('update_app_setting', {
  setting_key: 'landing_page_enabled',
  setting_value: { enabled: true }
});
```

## Security

### Row Level Security (RLS)

All tables have RLS enabled. Policies enforce:
- **User Isolation**: Users can only access their own data
- **Service Role Override**: Edge Functions bypass RLS with service role
- **Admin Access**: Special policies for admin dashboard

### SECURITY DEFINER Functions

All functions that bypass RLS use:
```sql
SET search_path = public, pg_temp
```

This prevents schema injection attacks (CVE-compliant).

### JWT Authentication

- Frontend uses `VITE_SUPABASE_PUBLISHABLE_KEY` (public, safe to expose)
- Edge Functions use service role key (secret, never exposed)
- Row-level auth via `auth.uid()` function

## Migrations

**Location**: `supabase/migrations/`

**Naming Convention**: `<timestamp>_<description>.sql`

**CI/CD**:
- Migrations auto-apply on push to `main` (if `supabase/migrations/**` changed)
- Workflow: `.github/workflows/deploy-migrations.yml`

**Local Development**:
```bash
supabase migration new <description>  # Create new migration
supabase db reset                     # Reset local DB
supabase db push --linked             # Apply to production
```

## Indexes

**Performance-Critical Indexes**:

```sql
-- Chat messages by session (frequently queried)
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id, created_at DESC);

-- Rate limits by user/tool
CREATE INDEX idx_user_tool_rate_limits_lookup ON user_tool_rate_limits(user_id, tool_name, window_start);

-- Artifact versions by message
CREATE INDEX idx_artifact_versions_message_id ON artifact_versions(message_id, version_number DESC);

-- AI usage logs by user (admin analytics)
CREATE INDEX idx_ai_usage_logs_user_id ON ai_usage_logs(user_id, created_at DESC);
```

## Backup & Recovery

**Automatic Backups**:
- Daily snapshots (Supabase managed)
- Point-in-time recovery (PITR) available for production

**Manual Backup**:
```bash
# Export schema and data
pg_dump -h <host> -U postgres -d postgres > backup.sql

# Restore
psql -h <host> -U postgres -d postgres < backup.sql
```

## References

- **Supabase RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL Functions**: https://www.postgresql.org/docs/current/sql-createfunction.html
- **Migration Workflow**: `.github/workflows/deploy-migrations.yml`
- **Schema Files**: `supabase/migrations/`
