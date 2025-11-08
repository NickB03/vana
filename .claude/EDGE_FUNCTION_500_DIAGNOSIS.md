# Edge Function 500 Error Diagnosis

## Problem Summary
Both `chat` and `generate-title` edge functions are returning HTTP 500 errors when called from the frontend, despite being deployed and showing as "Active" in Lovable Cloud dashboard.

## Root Cause Analysis

### **UPDATE: Test Results Show 401 Unauthorized**

When testing the edge functions with the anon key, we get **401 Unauthorized** instead of 500. This means:
- ✅ The functions are deployed and responding
- ✅ JWT verification is working (`verify_jwt = true` in config.toml)
- ❌ The functions require a valid user authentication token

**However, you reported 500 errors from the browser, which suggests a different issue when called with a valid user token.**

### **PRIMARY ISSUE: Missing Environment Variables in Lovable Cloud**

Both edge functions require environment variables that are **NOT** automatically available in Lovable Cloud:

#### Required Environment Variables:
1. **`LOVABLE_API_KEY`** - Required by both functions
   - Used to authenticate with `https://ai.gateway.lovable.dev/v1/chat/completions`
   - **This is the most likely cause of 500 errors**
   
2. **`SUPABASE_URL`** - Auto-provided by Lovable Cloud ✅
3. **`SUPABASE_ANON_KEY`** - Auto-provided by Lovable Cloud ✅

#### Code References:
**chat/index.ts (lines 125-128):**
```typescript
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
if (!LOVABLE_API_KEY) {
  throw new Error("LOVABLE_API_KEY is not configured");
}
```

**generate-title/index.ts (lines 62-65):**
```typescript
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
if (!LOVABLE_API_KEY) {
  throw new Error("LOVABLE_API_KEY is not configured");
}
```

When this environment variable is missing, the function throws an error, which results in a 500 response.

---

## How to Fix

### Step 1: Set Environment Variables in Lovable Cloud

You need to add the `LOVABLE_API_KEY` to your Lovable Cloud project:

1. **Go to Lovable Cloud Dashboard**
2. **Navigate to**: Project Settings → Environment Variables (or Edge Functions → Settings)
3. **Add the following variable**:
   - **Name**: `LOVABLE_API_KEY`
   - **Value**: Your Lovable API key (obtain from Lovable dashboard)

### Step 2: Verify Environment Variables

After setting the environment variable, you can verify it's available by:

1. **Check Lovable Cloud logs** for the edge functions
2. **Look for the error message**: `"LOVABLE_API_KEY is not configured"`
3. **If you see this error**, the environment variable is not set correctly

### Step 3: Redeploy Edge Functions

After adding environment variables:
1. Lovable Cloud may auto-redeploy, or
2. You may need to manually trigger a redeploy by pushing a commit to main branch

---

## Secondary Potential Issues

### 1. JWT Verification Configuration
Your `supabase/config.toml` has `verify_jwt = true` for all functions. This means:
- Functions expect a valid JWT token in the Authorization header
- If the token is malformed or expired, the function will return 401 (not 500)
- **This is likely NOT the cause of 500 errors**

### 2. Helper Module Imports
The chat function imports three helper modules:
- `intent-detector.ts` ✅ (verified complete)
- `artifact-validator.ts` ✅ (verified complete)
- `artifact-transformer.ts` ✅ (verified complete)

All helper modules are properly exported and should not cause issues.

### 3. Missing Dependencies
Both functions use standard Deno libraries:
- `https://deno.land/std@0.168.0/http/server.ts` ✅
- `https://esm.sh/@supabase/supabase-js@2.75.1` ✅

These are publicly available and should not cause issues.

---

## Debugging Steps

### 1. Check Browser Console for Actual Error
Since the test script shows 401 (not 500), but you're seeing 500 in the browser, we need to check the actual error:

1. Open http://localhost:8080 in Chrome
2. Open DevTools (F12) → Console tab
3. Try to send a message
4. Look for the actual error message in console
5. Check Network tab → Find the failed request → Click on it → Response tab

**Look for these specific errors:**
- `"LOVABLE_API_KEY is not configured"` → Missing API key
- `"AI gateway error"` → Problem with Lovable AI Gateway
- `"Unauthorized"` → Authentication issue
- Any other error message

### 2. Check Edge Function Logs in Lovable Cloud
```bash
# In Lovable Cloud dashboard:
# Navigate to: Edge Functions → chat → View Logs
# Look for:
# - "LOVABLE_API_KEY is not configured" (if still missing)
# - "Starting chat stream for session: ..." (if working)
# - Any error stack traces
```

### 2. Test from Frontend
```javascript
// Open browser console on http://localhost:8080
// Try sending a message
// Check Network tab for:
// - Request to /functions/v1/chat
// - Response status (should be 200, not 500)
```

### 3. Check Console Errors
```javascript
// Browser console should show:
// - No "500" errors
// - Successful streaming responses
```

---

## Expected Behavior After Fix

✅ **generate-title function**:
- Returns HTTP 200
- Response body: `{ "title": "Generated Title" }`

✅ **chat function**:
- Returns HTTP 200
- Content-Type: `text/event-stream`
- Streams AI responses in real-time

---

## Additional Notes

### Where to Get LOVABLE_API_KEY
1. Log in to Lovable Cloud dashboard
2. Navigate to: Settings → API Keys (or similar)
3. Generate a new API key if needed
4. Copy the key value

### Environment Variable Scope
- Environment variables set in Lovable Cloud are available to ALL edge functions
- They are NOT committed to Git (secure)
- They persist across deployments

### Testing Locally
If you want to test edge functions locally:
```bash
# Create supabase/.env.local
LOVABLE_API_KEY=your_key_here
SUPABASE_URL=https://xfwlneedhqealtktaacv.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here

# Run Supabase locally
supabase start
supabase functions serve
```

---

## Summary

**The 500 errors are almost certainly caused by the missing `LOVABLE_API_KEY` environment variable in Lovable Cloud.**

**Action Required:**
1. Add `LOVABLE_API_KEY` to Lovable Cloud environment variables
2. Redeploy edge functions (may happen automatically)
3. Test from frontend
4. Check logs to confirm the error is resolved

