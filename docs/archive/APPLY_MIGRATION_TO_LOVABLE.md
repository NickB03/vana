# Apply Migration to Lovable Cloud Instance

## Problem
The `artifact_ids` column migration was applied to the wrong Supabase instance (`vznhbocnuykdmjvujaka` - vana-dev) instead of the lovable cloud instance (`xfwlneedhqealtktaacv`) that your local development uses.

## Solution
Apply the migration to the correct lovable cloud instance.

### Option 1: Via Supabase Dashboard (Recommended - Fastest)

1. Go to: https://supabase.com/dashboard/project/xfwlneedhqealtktaacv/sql/new

2. Copy and paste this SQL:
```sql
-- Add artifact_ids column to chat_messages table
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS artifact_ids text[] DEFAULT '{}';

-- Add GIN index for efficient array queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_artifact_ids
ON chat_messages USING GIN (artifact_ids);

-- Add column comment
COMMENT ON COLUMN chat_messages.artifact_ids IS 'Array of artifact IDs referenced in this message';

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
```

3. Click "Run" or press `Cmd+Enter`

4. Wait 5-10 seconds for PostgREST cache to refresh

5. Test by submitting a chat message at http://localhost:8080
   - Should see NO schema cache warnings in console
   - artifact_ids should be saved successfully

### Option 2: Via Supabase CLI

1. Link to lovable cloud project:
```bash
supabase link --project-ref xfwlneedhqealtktaacv
```

2. Apply the migration:
```bash
supabase db push
```

### Verification

After applying the migration, test in browser:

1. Open http://localhost:8080
2. Submit a simple message
3. Check browser console - should see NO "PostgREST schema cache stale" warnings
4. Message should save successfully

### Cleanup (After Migration Works)

Once verified, you can optionally remove the fallback code from:
- File: `src/hooks/useChatMessages.tsx`
- Lines: 94-114 (the PGRST204/42703 error handling)

**Note:** Keeping the fallback code is actually best practice for production resilience and zero-downtime deployments.

## Current Status

- ✅ Migration file created: `supabase/migrations/20251103000001_add_artifact_ids_column.sql`
- ✅ App works with fallback code (messages save successfully)
- ⏳ Waiting for migration to be applied to lovable cloud instance
- ⏳ Once applied, `artifact_ids` will be tracked properly
