# Artifact Version Control System

---
⚠️ **IMPLEMENTATION STATUS: BACKEND ONLY**

The artifact version control system is fully implemented at the database and hook layers, but **NOT YET integrated into the UI**. Users cannot currently access versioning features through the application interface.

**Current State:**
- ✅ Database schema with RLS policies
- ✅ React hook (`useArtifactVersions`)
- ✅ UI components (`ArtifactVersionSelector`, `ArtifactDiffViewer`)
- ❌ UI integration (components not imported in `ArtifactContainer.tsx` or `ChatInterface.tsx`)
- ❌ User-accessible features

This documentation describes the technical implementation. UI integration work is tracked in the project roadmap.

---

## Overview

The artifact version control system provides Git-like versioning for AI-generated artifacts (code, React components, diagrams, etc.). It enables users to:

- Track changes to artifacts over time
- Revert to previous versions
- Compare versions (diff)
- Automatic deduplication (no duplicate versions for identical content)
- Row-level security (RLS) to ensure users only access their own versions

## Architecture

### Database Layer

**Table: `artifact_versions`**
```sql
CREATE TABLE artifact_versions (
  id UUID PRIMARY KEY,
  message_id UUID REFERENCES chat_messages(id),
  artifact_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  artifact_type TEXT NOT NULL,
  artifact_title TEXT NOT NULL,
  artifact_content TEXT NOT NULL,
  artifact_language TEXT,
  content_hash TEXT NOT NULL,  -- SHA-256 for deduplication
  created_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(artifact_id, version_number)
);
```

**Key Features:**
- Atomic version numbering via `create_artifact_version_atomic()` function
- Content deduplication via SHA-256 hashing
- Foreign key cascade delete (versions deleted when message is deleted)
- RLS policies restrict access to user's own messages

**Database Functions:**
1. `create_artifact_version_atomic()` - Atomic version creation with deduplication
2. `get_artifact_version_history()` - Fetch all versions for an artifact
3. `cleanup_old_artifact_versions()` - Retention policy (keep last 20 versions)

**RLS Policies:**
- SELECT: Users can only view versions from their own chat sessions
- INSERT: Users can only create versions in their own messages

### React Hook Layer

**Hook: `useArtifactVersions(artifactId: string)`**

**Returns:**
```typescript
{
  // Data
  versions: ArtifactVersion[];
  currentVersion: ArtifactVersion | undefined;
  versionCount: number;

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;

  // Actions
  createVersion: (artifact: ArtifactData, messageId: string) => Promise<void>;
  revertToVersion: (versionNumber: number) => ArtifactVersion | null;
  getVersionDiff: (from: number, to: number) => DiffResult | null;
  getVersion: (versionNumber: number) => ArtifactVersion | undefined;
  hasContentChanged: (content: string) => Promise<boolean>;
  refetch: () => void;
}
```

**Key Features:**
- React Query integration (automatic caching, refetching, error handling)
- Optimistic updates
- Automatic cache invalidation on mutations
- RLS-aware error handling
- Retry logic (no retries for permission errors)
- SHA-256 hashing via Web Crypto API (no external dependencies)

### Content Hashing

Uses Web Crypto API for SHA-256 hashing:
```typescript
async function computeSHA256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
```

**Benefits:**
- No external library dependencies (bcrypt, crypto-js, etc.)
- Browser-native, secure, performant
- Prevents duplicate versions for identical content

## Usage Examples

### Basic Version Control

```tsx
import { useArtifactVersions } from "@/hooks/useArtifactVersions";

function ArtifactViewer({ artifact, messageId }) {
  const {
    versions,
    currentVersion,
    versionCount,
    createVersion,
    revertToVersion
  } = useArtifactVersions(artifact.id);

  const handleSave = async () => {
    await createVersion(artifact, messageId);
  };

  const handleRevert = (versionNum: number) => {
    const version = revertToVersion(versionNum);
    if (version) {
      // Update artifact with reverted content
      artifact.content = version.artifact_content;
    }
  };

  return (
    <div>
      <h3>{artifact.title} (v{currentVersion?.version_number})</h3>
      <button onClick={handleSave}>Save Version</button>

      <h4>History ({versionCount} versions)</h4>
      {versions.map(v => (
        <div key={v.id}>
          v{v.version_number} - {new Date(v.created_at).toLocaleString()}
          <button onClick={() => handleRevert(v.version_number)}>
            Revert
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Auto-save on Content Change

```tsx
function AutoSaveArtifact({ artifact, messageId }) {
  const { createVersion, hasContentChanged } = useArtifactVersions(artifact.id);

  const handleSave = async (newContent: string) => {
    // Check if content actually changed before saving
    if (await hasContentChanged(newContent)) {
      await createVersion({ ...artifact, content: newContent }, messageId);
    }
  };

  return <textarea onBlur={(e) => handleSave(e.target.value)} />;
}
```

### Version Diff Viewer

```tsx
function DiffViewer({ artifactId }) {
  const { versions, getVersionDiff } = useArtifactVersions(artifactId);

  const diff = getVersionDiff(1, 3); // Compare v1 vs v3

  if (diff) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <pre>{diff.oldContent}</pre>
        <pre>{diff.newContent}</pre>
      </div>
    );
  }
}
```

### Batch Version Counts

```tsx
import { useArtifactVersionCounts } from "@/hooks/useArtifactVersions";

function ArtifactList({ artifacts }) {
  const artifactIds = artifacts.map(a => a.id);
  const { data: versionCounts } = useArtifactVersionCounts(artifactIds);

  return artifacts.map(artifact => (
    <div key={artifact.id}>
      {artifact.title} - {versionCounts?.[artifact.id] || 0} versions
    </div>
  ));
}
```

## Error Handling

The hook provides comprehensive error handling:

### RLS Errors
```typescript
// User tries to access someone else's versions
error: "You don't have permission to view these versions"

// User tries to create version in someone else's message
error: "You don't have permission to create versions for this artifact"
```

### Authentication Errors
```typescript
// No valid session
error: "Authentication required"
```

### Foreign Key Errors
```typescript
// Message was deleted
error: "Invalid message ID - message may have been deleted"
```

### Network Errors
```typescript
// Generic errors
error: "Network error" | "Failed to fetch versions"
```

## Performance Considerations

### Caching Strategy
- **Stale Time**: 5 minutes (versions don't change frequently)
- **GC Time**: 10 minutes (keep in cache for background refetches)
- **Retry Policy**: Max 2 retries for transient errors, no retries for RLS errors

### Indexes
```sql
CREATE INDEX idx_artifact_versions_artifact ON artifact_versions(artifact_id);
CREATE INDEX idx_artifact_versions_message ON artifact_versions(message_id);
CREATE INDEX idx_artifact_versions_hash ON artifact_versions(content_hash);
CREATE INDEX idx_artifact_versions_created ON artifact_versions(created_at DESC);
```

### Retention Policy
- Keep last 20 versions per artifact
- Manual cleanup via `cleanup_old_artifact_versions()` function
- Can be automated with pg_cron or cron job

## Security

### Row-Level Security (RLS)
All queries are subject to RLS policies:

```sql
-- Users can only SELECT versions from their own messages
CREATE POLICY "Users can view versions from own messages"
  ON artifact_versions FOR SELECT
  USING (
    message_id IN (
      SELECT cm.id FROM chat_messages cm
      JOIN chat_sessions cs ON cm.session_id = cs.id
      WHERE cs.user_id = auth.uid()
    )
  );

-- Users can only INSERT versions in their own messages
CREATE POLICY "Users can create versions in own messages"
  ON artifact_versions FOR INSERT
  WITH CHECK (
    message_id IN (
      SELECT cm.id FROM chat_messages cm
      JOIN chat_sessions cs ON cm.session_id = cs.id
      WHERE cs.user_id = auth.uid()
    )
  );
```

### Content Hash Security
- SHA-256 hashing prevents hash collisions
- Content integrity verification
- Deduplication at database level

## Testing

Comprehensive test suite covers:
- ✅ Version fetching with RLS
- ✅ Version creation with deduplication
- ✅ Authentication errors
- ✅ RLS policy violations
- ✅ Foreign key constraint errors
- ✅ Revert functionality
- ✅ Diff generation
- ✅ Content change detection
- ✅ Empty version history
- ✅ Retry logic

**Run tests:**
```bash
npm test -- useArtifactVersions
```

## Files

**Core Implementation:**
- `/Users/nick/Projects/llm-chat-site/src/hooks/useArtifactVersions.ts` - React hook
- `/Users/nick/Projects/llm-chat-site/supabase/migrations/20251102000001_artifact_versions_with_rls.sql` - Database migration

**Documentation & Examples:**
- `/Users/nick/Projects/llm-chat-site/src/hooks/useArtifactVersions.example.tsx` - Usage examples
- `/Users/nick/Projects/llm-chat-site/src/hooks/__tests__/useArtifactVersions.test.ts` - Test suite
- `/Users/nick/Projects/llm-chat-site/docs/ARTIFACT_VERSIONING.md` - This document

## Future Enhancements

### Potential Features
1. **Branching**: Create alternate versions from any point
2. **Tagging**: Tag specific versions (v1.0, stable, etc.)
3. **Merge Conflicts**: Handle merging of divergent versions
4. **Diff Algorithm**: Integrate proper diff library (diff-match-patch)
5. **Visual Diff**: Syntax-highlighted side-by-side comparison
6. **Auto-versioning**: Create version on every artifact edit
7. **Collaborative Editing**: Conflict resolution for multi-user edits
8. **Export/Import**: Export version history as JSON/ZIP
9. **Compression**: Store deltas instead of full content for large artifacts
10. **Analytics**: Track which versions are most accessed/reverted

### Performance Optimizations
1. **Delta Storage**: Store diffs instead of full content
2. **Compression**: gzip/brotli compression for large artifacts
3. **Lazy Loading**: Fetch content on-demand, not in list view
4. **Pagination**: Paginate version history for artifacts with 100+ versions

## Migration Guide

### Applying the Migration

**Local Development:**
```bash
# Apply migration
supabase db push

# Or via Supabase CLI
supabase migration up
```

**Production:**
```bash
# Via Supabase Dashboard
# Database > Migrations > Run migration

# Or via CLI
supabase --project-ref xfwlneedhqealtktaacv db push
```

### Rollback (if needed)

```sql
-- Drop everything in reverse order
DROP FUNCTION IF EXISTS cleanup_old_artifact_versions();
DROP FUNCTION IF EXISTS get_artifact_version_history(TEXT);
DROP FUNCTION IF EXISTS create_artifact_version_atomic(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP TABLE IF EXISTS artifact_versions CASCADE;
ALTER TABLE chat_messages DROP COLUMN IF EXISTS artifact_ids;
```

## Monitoring

### Check Version Counts
```sql
SELECT artifact_id, COUNT(*) as version_count
FROM artifact_versions
GROUP BY artifact_id
ORDER BY version_count DESC
LIMIT 10;
```

### Check Storage Size
```sql
SELECT
  pg_size_pretty(pg_total_relation_size('artifact_versions')) as total_size,
  COUNT(*) as total_versions,
  AVG(length(artifact_content)) as avg_content_size
FROM artifact_versions;
```

### Check RLS Policy Hits
```sql
-- Check if RLS is active
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'artifact_versions';
```

## Support

For issues or questions:
1. Check the test suite for usage examples
2. Review the example file for integration patterns
3. Check database logs for RLS policy violations
4. Verify user authentication before operations

---

**Last Updated:** November 2, 2025
**Migration Version:** 20251102000001
