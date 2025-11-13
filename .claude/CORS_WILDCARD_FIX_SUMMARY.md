# CORS Wildcard Security Fix - Summary

**Date:** 2025-11-13
**Priority:** HIGH (CRITICAL before production deployment)
**CWE:** CWE-942 (Permissive Cross-domain Policy)
**CVSS Score:** 5.3 (Medium)
**Status:** ✅ FIXED

## Overview

Fixed a CORS security vulnerability in `error-handler.ts` where the `ErrorResponseBuilder.create()` method used a wildcard (`*`) fallback for the `Access-Control-Allow-Origin` header when the origin was null or missing.

## Security Issue

**File:** `/Users/nick/Projects/llm-chat-site/supabase/functions/_shared/error-handler.ts`
**Lines:** 52-62 (before fix)
**Vulnerability:** When `origin` was `null` or missing, code fell back to wildcard `*`

### Before (Vulnerable Code)
```typescript
static create(origin: string | null, requestId: string): ErrorResponseBuilder {
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin || "*",  // ⚠️ SECURITY ISSUE
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
  };
  return new ErrorResponseBuilder(corsHeaders, requestId);
}
```

### Why This Was Dangerous
- Allowed requests from ANY domain
- Violated project's documented security policy (CLAUDE.md line 8)
- Enabled potential cross-origin attacks and data exfiltration
- Could allow malicious sites to make authenticated requests on behalf of users

## Solution Implemented

Implemented CORS origin whitelist validation matching the approach used in `cors-config.ts`:

### After (Secure Code)
```typescript
static create(origin: string | null, requestId: string): ErrorResponseBuilder {
  // Get allowed origins from environment variable
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");

  const allowedOrigins = envOrigins
    ? envOrigins.split(",").map(o => o.trim()).filter(Boolean)
    : [
        // Development defaults - include common Vite ports for development flexibility
        "http://localhost:8080",
        "http://localhost:8081",
        // ... (all localhost ports for dev)
      ];

  // Validate origin against whitelist - use first allowed origin as secure fallback
  const corsOrigin = origin && allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0];

  const corsHeaders = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
  };

  return new ErrorResponseBuilder(corsHeaders, requestId);
}
```

## Implementation Details

### 1. Origin Validation Logic
- **Valid origin from whitelist:** Uses the provided origin
- **Invalid origin:** Falls back to first allowed origin (NOT wildcard)
- **Null origin:** Falls back to first allowed origin (NOT wildcard)

### 2. Environment Configuration
- **Production:** Set `ALLOWED_ORIGINS` environment variable
  ```bash
  ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
  ```
- **Development:** Uses localhost defaults (ports 8080-8090, 5173)

### 3. Consistency with Existing Code
The fix matches the secure implementation already used in `cors-config.ts`:
```typescript
// cors-config.ts (existing secure pattern)
const allowedOrigin = isOriginAllowed(requestOrigin)
  ? requestOrigin
  : ALLOWED_ORIGINS[0];
```

## Files Modified

1. **`supabase/functions/_shared/error-handler.ts`**
   - Lines 52-98: Updated `ErrorResponseBuilder.create()` method
   - Removed wildcard (`*`) fallback
   - Added origin whitelist validation
   - Added development defaults for localhost

2. **`supabase/functions/cache-manager/index.ts`**
   - Lines 1-30: Replaced static `corsHeaders` with `getCorsHeaders()` function
   - Lines 94-96: Added origin extraction and validation
   - Removed wildcard (`*`) CORS header
   - Implemented same secure origin validation pattern

3. **`supabase/functions/_shared/__tests__/error-handler.test.ts`**
   - Lines 35-41: Updated test case description and comment
   - Changed from "with wildcard" to "with secure fallback"

4. **`.env.example`**
   - Lines 7-11: Added `ALLOWED_ORIGINS` documentation
   - Included security warning about wildcards

## Verification

### Build Verification
```bash
npm run build
# ✅ Build completed successfully with no errors
```

### Security Checks
- ✅ No wildcard (`*`) CORS headers found in error-handler.ts
- ✅ Implementation matches secure pattern in cors-config.ts
- ✅ All error responses use whitelisted origins
- ✅ Proper fallback behavior for null/invalid origins

### Test Cases
Created test script (`test-error-handler-cors.ts`) demonstrating:
1. ✅ Valid origin accepted
2. ✅ Invalid origin falls back to first allowed origin
3. ✅ Null origin falls back to first allowed origin
4. ✅ Development environment uses localhost fallback

## Security Benefits

1. **Prevents Cross-Origin Attacks**
   - Only whitelisted domains can make requests
   - Protects against data exfiltration
   - Prevents unauthorized API access

2. **Compliance with Security Policy**
   - Aligns with documented policy in CLAUDE.md
   - Follows principle of least privilege
   - Implements defense-in-depth

3. **Consistent Security Posture**
   - Matches existing secure implementation in cors-config.ts
   - No security gaps in error handling paths
   - Unified CORS validation approach

## Production Deployment Checklist

Before deploying to production:

- [ ] Set `ALLOWED_ORIGINS` environment variable in Supabase Edge Functions
  ```bash
  supabase secrets set ALLOWED_ORIGINS=https://yourdomain.com
  ```
- [ ] Verify no wildcard CORS in any edge function
  ```bash
  grep -r "Access-Control-Allow-Origin.*\*" supabase/functions/
  ```
- [ ] Test error responses return correct CORS headers
- [ ] Verify authenticated requests work with whitelisted origins
- [ ] Monitor for any CORS-related errors in production logs

## Related Files

- **Security Policy:** `CLAUDE.md` (line 8 - CORS security requirement)
- **CORS Config:** `supabase/functions/_shared/cors-config.ts` (reference implementation)
- **Test Script:** `supabase/functions/_shared/test-error-handler-cors.ts` (verification)
- **Unit Tests:** `supabase/functions/_shared/__tests__/error-handler.test.ts` (updated)

## References

- **CWE-942:** https://cwe.mitre.org/data/definitions/942.html
- **OWASP CORS:** https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny
- **MDN CORS:** https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

---

**Fixed By:** Claude Code (Security Auditor)
**Verified:** Build passed, no wildcard CORS detected
**Risk Level Before Fix:** HIGH
**Risk Level After Fix:** LOW (secure origin validation)
