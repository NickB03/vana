# Supabase MCP Integration Guide

Complete guide to database operations and Edge Functions with Supabase MCP.

## Quick Reference

```typescript
// DDL Operations (Schema Changes)
await apply_migration({
  name: "add_user_settings",
  query: "CREATE TABLE user_settings (id uuid PRIMARY KEY, ...)"
});

// DML Operations (Data Queries)
await execute_sql({
  query: "SELECT * FROM chat_sessions WHERE user_id = $1"
});

// Security Check (After DDL)
await get_advisors({ type: "security" });
```

## Available MCP Functions

### Database Operations
- `list_tables` - List all tables in schemas
- `list_extensions` - Show installed Postgres extensions
- `list_migrations` - View migration history
- `apply_migration` - Apply DDL changes (CREATE, ALTER, DROP)
- `execute_sql` - Run DML queries (SELECT, INSERT, UPDATE, DELETE)
- `generate_typescript_types` - Generate types from schema

### Debugging & Monitoring
- `get_logs` - Fetch service logs (api, postgres, auth, storage, realtime)
- `get_advisors` - Security/performance recommendations

### Edge Functions
- `list_edge_functions` - List all functions
- `get_edge_function` - Retrieve function code
- `deploy_edge_function` - Deploy or update functions

### Project Info
- `get_project_url` - Get API URL
- `get_anon_key` - Get anonymous API key

### Development Branches
- `create_branch` - Create dev branch
- `list_branches` - Show all branches
- `merge_branch` - Merge to production
- `delete_branch` - Remove branch

## Critical Patterns

### Schema Changes (DDL)
```typescript
// ALWAYS use apply_migration for DDL
await apply_migration({
  name: "add_user_preferences",
  query: `
    CREATE TABLE user_preferences (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
      theme text DEFAULT 'light',
      auto_approve_libraries boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    );

    -- CRITICAL: Add RLS policies
    ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view own preferences"
      ON user_preferences FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can update own preferences"
      ON user_preferences FOR UPDATE
      USING (auth.uid() = user_id);
  `
});

// ALWAYS check for security issues after DDL
const advisors = await get_advisors({ type: "security" });
advisors.forEach(issue => {
  if (issue.severity === "high") {
    console.error(`CRITICAL: ${issue.title}`);
  }
});
```

### Data Operations (DML)
```typescript
// For SELECT, INSERT, UPDATE, DELETE - use execute_sql
const sessions = await execute_sql({
  query: `
    SELECT s.*, COUNT(m.id) as message_count
    FROM chat_sessions s
    LEFT JOIN chat_messages m ON s.id = m.session_id
    WHERE s.user_id = auth.uid()
    GROUP BY s.id
    ORDER BY s.updated_at DESC
    LIMIT 10
  `
});
```

### Type Generation
```typescript
// After schema changes, regenerate types
const types = await generate_typescript_types();

// Update src/integrations/supabase/types.ts
await write({
  file_path: "/src/integrations/supabase/types.ts",
  content: types
});
```

## Common Workflows

### Adding a New Table
```typescript
// 1. Create migration
await apply_migration({
  name: "create_notifications_table",
  query: `
    CREATE TABLE notifications (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
      title text NOT NULL,
      message text,
      read boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    );

    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users see own notifications"
      ON notifications FOR ALL
      USING (auth.uid() = user_id);

    CREATE INDEX idx_notifications_user_created
      ON notifications(user_id, created_at DESC);
  `
});

// 2. Check security
await get_advisors({ type: "security" });

// 3. Generate types
const types = await generate_typescript_types();

// 4. Test with sample data
await execute_sql({
  query: `
    INSERT INTO notifications (user_id, title, message)
    VALUES (auth.uid(), 'Welcome', 'Thanks for joining!')
  `
});
```

### Debugging Issues
```typescript
// 1. Check API logs
const apiLogs = await get_logs({ service: "api" });
// Look for 4xx/5xx errors

// 2. Check Postgres logs
const dbLogs = await get_logs({ service: "postgres" });
// Look for query errors, RLS violations

// 3. Check auth logs
const authLogs = await get_logs({ service: "auth" });
// Look for token issues, login failures

// 4. Run security check
const security = await get_advisors({ type: "security" });
// Fix any HIGH severity issues immediately

// 5. Run performance check
const perf = await get_advisors({ type: "performance" });
// Optimize slow queries, add indexes
```

### Deploying Edge Functions
```typescript
// 1. Create function
await deploy_edge_function({
  name: "send-email",
  entrypoint_path: "index.ts",
  files: [{
    name: "index.ts",
    content: `
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { to, subject, body } = await req.json();

  // Function logic here

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { "Content-Type": "application/json" } }
  );
});
    `
  }]
});

// 2. List to verify
const functions = await list_edge_functions();

// 3. Test the function
const projectUrl = await get_project_url();
const anonKey = await get_anon_key();
// Use these to test: POST to {projectUrl}/functions/v1/send-email
```

## RLS (Row Level Security) Patterns

### User-Scoped Access
```sql
-- Users can only see their own data
CREATE POLICY "user_isolation"
  ON table_name FOR ALL
  USING (auth.uid() = user_id);
```

### Public Read, Authenticated Write
```sql
-- Anyone can read, only authenticated can write
CREATE POLICY "public_read"
  ON table_name FOR SELECT
  USING (true);

CREATE POLICY "auth_write"
  ON table_name FOR INSERT
  USING (auth.uid() IS NOT NULL);
```

### Role-Based Access
```sql
-- Admins can do everything
CREATE POLICY "admin_all"
  ON table_name FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
```

## Performance Optimization

### Add Indexes
```typescript
await apply_migration({
  name: "add_performance_indexes",
  query: `
    -- For frequent lookups
    CREATE INDEX idx_messages_session_created
      ON chat_messages(session_id, created_at DESC);

    -- For full-text search
    CREATE INDEX idx_messages_content_search
      ON chat_messages USING gin(to_tsvector('english', content));

    -- For JSON queries
    CREATE INDEX idx_preferences_settings
      ON user_preferences USING gin(settings);
  `
});
```

### Query Optimization
```typescript
// Check slow queries
const perf = await get_advisors({ type: "performance" });

// Example: Optimize N+1 query
// BAD: Multiple queries
for (const session of sessions) {
  const messages = await execute_sql({
    query: `SELECT * FROM chat_messages WHERE session_id = $1`,
    params: [session.id]
  });
}

// GOOD: Single query with JOIN
const data = await execute_sql({
  query: `
    SELECT s.*, json_agg(m.*) as messages
    FROM chat_sessions s
    LEFT JOIN chat_messages m ON s.id = m.session_id
    GROUP BY s.id
  `
});
```

## Development Branches

### Creating a Test Branch
```typescript
// 1. Create branch (costs money - requires confirmation)
await create_branch({
  name: "feature-testing",
  confirm_cost_id: "xxx"  // From cost confirmation
});

// 2. List branches
const branches = await list_branches();
const testBranch = branches.find(b => b.name === "feature-testing");

// 3. Apply migrations to branch
// Use branch's project_ref for operations

// 4. Test on branch
// All operations work the same, just different project_ref

// 5. Merge when ready
await merge_branch({ branch_id: testBranch.id });

// 6. Or delete if not needed
await delete_branch({ branch_id: testBranch.id });
```

## Common Issues & Solutions

### "Permission denied for table"
```typescript
// Missing RLS policy - check with:
await get_advisors({ type: "security" });
// Add appropriate policy
```

### "Column does not exist"
```typescript
// Check actual schema
await execute_sql({
  query: `SELECT column_name FROM information_schema.columns
          WHERE table_name = 'your_table'`
});
```

### "Foreign key violation"
```typescript
// Check referenced data exists
await execute_sql({
  query: `SELECT * FROM parent_table WHERE id = $1`,
  params: [referenced_id]
});
```

### Migration Failed
```typescript
// Check migration history
const migrations = await list_migrations();
// Look for failed status

// Rollback if needed (create inverse migration)
await apply_migration({
  name: "rollback_failed_migration",
  query: "DROP TABLE IF EXISTS problematic_table;"
});
```

## Best Practices

1. **ALWAYS enable RLS** on user-facing tables
2. **Check advisors** after every DDL change
3. **Use migrations** for schema changes, not execute_sql
4. **Add indexes** for frequent query patterns
5. **Test on branches** before production changes
6. **Monitor logs** when debugging issues
7. **Generate types** after schema updates
8. **Use prepared statements** to prevent SQL injection
9. **Batch operations** when possible
10. **Document migrations** with clear naming