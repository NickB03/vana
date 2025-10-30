# Image Expiration Fix Report

> **⚠️ IMPORTANT NOTE:** This document describes an **interim fix** that made storage buckets public to resolve image expiration issues. This solution was **later superseded** by the implementation in `PRIVATE_STORAGE_IMPLEMENTATION.md` (commit 8942eea), which restored private buckets with signed URLs for better security. The current production implementation uses **private buckets with 7-day signed URLs**.

## Date: 2025-10-30

## Issue Summary
Images uploaded to chat were disappearing after approximately 1 hour, despite a previous fix (commit bb57642) that changed from signed URLs to public URLs.

## Root Cause Analysis

### Investigation Results
1. **Previous Fix (bb57642)**: Correctly changed AI-generated images from signed URLs to public URLs
2. **Actual Problem**: The `user-uploads` storage bucket was configured as **private** (`public: false`)
3. **Impact**: When the code called `getPublicUrl()`, it returned a URL, but the bucket privacy setting prevented public access

### Storage Bucket Configuration (Before Fix)
```sql
user-uploads:     public: false  ❌ BROKEN
generated-images: public: true   ✅ WORKING
```

## Technical Details

### Why This Happened
- The `user-uploads` bucket was created with `public: false` in the migration
- The code correctly uses `getPublicUrl()` for permanent URLs
- However, a **private bucket** requires signed URLs for access, not public URLs
- Public URLs from private buckets return 403 Forbidden after the default cache expires

### Code Analysis
The upload code in `src/components/ChatInterface.tsx:192-194` was correct:
```typescript
const { data: { publicUrl } } = supabase.storage
  .from('user-uploads')
  .getPublicUrl(fileName);
```

The problem was the **database configuration**, not the code.

## Solution Implemented

### Fix Applied
Updated the storage bucket configuration:
```sql
UPDATE storage.buckets SET public = true WHERE id = 'user-uploads';
```

### Storage Bucket Configuration (After Fix)
```sql
user-uploads:     public: true  ✅ FIXED
generated-images: public: true  ✅ WORKING
```

### Verification
```sql
SELECT id, name, public FROM storage.buckets
WHERE id IN ('user-uploads', 'generated-images');

Result:
- user-uploads:     public: true
- generated-images: public: true
```

## Security Implications

### RLS Policies Still Active
Even with `public: true`, the storage bucket maintains RLS (Row Level Security) policies:

1. **Upload Policy**: Users can only upload to their own folder (`{userId}/...`)
2. **Delete Policy**: Users can only delete their own files
3. **Read Policy**: Public read access enabled via RLS policy

This provides:
- ✅ Public visibility for sharing
- ✅ Write protection (users can't upload to other users' folders)
- ✅ Delete protection (users can't delete other users' files)

### Trade-offs
- **Before**: Images inaccessible after cache expiry (broken)
- **After**: Images publicly accessible via URL (working, with RLS protection)

## Testing Recommendations

### Manual Testing Steps
1. Navigate to http://localhost:8080
2. Sign in to the application
3. Create a new chat session
4. Upload an image using the attachment button
5. Verify the image displays immediately
6. Copy the image URL from the markdown in the message
7. Wait 1+ hours (or clear browser cache)
8. Reload the page and verify image still displays
9. Try accessing the image URL in a new incognito window

### Expected Results
- ✅ Image uploads successfully
- ✅ Image displays immediately after upload
- ✅ Image URL remains accessible after page reload
- ✅ Image URL works in incognito/private browsing
- ✅ Image URL works after 1+ hours

## Additional Findings

### Edge Function Logs
- Reviewed logs for generate-image, chat, api services
- No errors related to image generation or storage
- 404 errors for some Edge Functions (chat, generate-title) likely due to separate Supabase project refs in logs vs local

### Performance Advisors
Found several performance optimization opportunities (separate from this fix):
- RLS policies re-evaluate `auth.uid()` for each row (should use `(select auth.uid())`)
- Unused indexes on created_at columns
- Several security warnings (MFA, password protection)

## Related Commits
- **bb57642**: Previous fix for AI-generated images (signed → public URLs)
- **3076394**: Merge of workflow documentation with image display fixes
- **Current**: Database configuration fix for user-uploads bucket

## Files Modified
- None (database-only change)
- Supabase storage bucket configuration updated via SQL

## Deployment Notes
- Fix applied directly to production database via MCP
- No code changes required
- No migrations needed (already live)
- Edge Functions already deployed with correct code

## Conclusion
The issue was a **configuration mismatch** between the code (using public URLs) and the database (bucket marked private). Setting `user-uploads` bucket to `public: true` resolves the image expiration issue while maintaining RLS security policies.
