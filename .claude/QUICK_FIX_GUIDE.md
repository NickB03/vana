# Quick Fix Guide: Edge Function 500 Errors

## TL;DR - The Fix

**The edge functions are returning 500 errors because the `LOVABLE_API_KEY` environment variable is missing in Lovable Cloud.**

### Immediate Action Required:

1. **Go to Lovable Cloud Dashboard**
   - URL: https://lovable.dev (or your Lovable dashboard URL)
   
2. **Navigate to Environment Variables**
   - Project Settings → Environment Variables
   - OR Edge Functions → Settings → Environment Variables
   
3. **Add the Missing Variable**
   ```
   Name:  LOVABLE_API_KEY
   Value: [Your Lovable API key - get from Lovable dashboard]
   ```

4. **Redeploy** (may happen automatically)
   - Push a commit to trigger redeploy, or
   - Use Lovable's manual redeploy button

5. **Test**
   ```bash
   node scripts/test-edge-functions.js
   ```

---

## Why This Happens

Both `chat` and `generate-title` functions call the Lovable AI Gateway:
```typescript
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
if (!LOVABLE_API_KEY) {
  throw new Error("LOVABLE_API_KEY is not configured"); // ← This causes 500
}
```

Without this environment variable, the functions throw an error immediately, resulting in HTTP 500.

---

## How to Get Your LOVABLE_API_KEY

1. Log in to Lovable Cloud dashboard
2. Navigate to: **Settings** → **API Keys** (or similar section)
3. Generate a new API key if you don't have one
4. Copy the key value
5. Add it to your project's environment variables

---

## Testing the Fix

### Option 1: Use the Test Script
```bash
node scripts/test-edge-functions.js
```

This will test both functions and show detailed error messages.

### Option 2: Test from Browser
1. Open http://localhost:8080
2. Sign in (if required)
3. Send a message in the chat
4. Check browser console for errors
5. Check Network tab for function responses

### Option 3: Check Lovable Logs
1. Go to Lovable Cloud dashboard
2. Navigate to: **Edge Functions** → **chat** → **View Logs**
3. Look for error messages:
   - ❌ "LOVABLE_API_KEY is not configured" (still broken)
   - ✅ "Starting chat stream for session: ..." (working!)

---

## Expected Results After Fix

### ✅ generate-title function
```bash
Status: 200 OK
Content-Type: application/json
Response: { "title": "Generated Title" }
```

### ✅ chat function
```bash
Status: 200 OK
Content-Type: text/event-stream
Response: [Streaming AI responses]
```

---

## Still Not Working?

If you've added the `LOVABLE_API_KEY` and it's still failing:

### 1. Verify the API Key is Valid
- Test the key directly with Lovable AI Gateway
- Check if the key has expired or been revoked

### 2. Check Other Environment Variables
```bash
# These should be auto-provided by Lovable Cloud:
SUPABASE_URL=https://xfwlneedhqealtktaacv.supabase.co
SUPABASE_ANON_KEY=[auto-provided]
```

### 3. Check Edge Function Logs
Look for specific error messages in Lovable Cloud logs:
- "LOVABLE_API_KEY is not configured" → Key still missing
- "AI gateway error: 401" → Invalid API key
- "AI gateway error: 429" → Rate limit exceeded
- "AI gateway error: 402" → Payment required

### 4. Verify JWT Configuration
Check `supabase/config.toml`:
```toml
[functions.chat]
verify_jwt = true  # ← May need to be false for testing

[functions.generate-title]
verify_jwt = true  # ← May need to be false for testing
```

If you want to test without authentication, temporarily set these to `false`.

---

## Additional Resources

- **Full Diagnosis**: `.claude/EDGE_FUNCTION_500_DIAGNOSIS.md`
- **Test Script**: `scripts/test-edge-functions.js`
- **Edge Function Code**: 
  - `supabase/functions/chat/index.ts`
  - `supabase/functions/generate-title/index.ts`

---

## Contact Support

If the issue persists after adding the API key:
1. Check Lovable Cloud status page
2. Contact Lovable support with:
   - Project ID: `xfwlneedhqealtktaacv`
   - Error logs from edge functions
   - Test script output

