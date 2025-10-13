# CSRF Protection Implementation

## Overview

This document describes the CSRF (Cross-Site Request Forgery) protection implementation for the Vana application, which uses HttpOnly cookies for authentication.

## Why CSRF Protection is Required

When using HttpOnly cookies for authentication, CSRF protection is **mandatory** to prevent session hijacking attacks. Unlike bearer tokens sent in Authorization headers, cookies are automatically included in all requests to a domain, making them vulnerable to CSRF attacks.

### CSRF Attack Example

Without protection, a malicious website could:
1. User logs into `vana.com` and receives auth cookie
2. User visits malicious website `evil.com`
3. `evil.com` makes POST request to `vana.com/api/delete-account`
4. Browser automatically includes `vana.com` auth cookie
5. Request succeeds because server sees valid cookie

## Implementation: Double-Submit Cookie Pattern

We use the industry-standard **double-submit cookie pattern** for CSRF protection.

### How It Works

1. **Server sets CSRF token cookie**
   - Random cryptographic token generated
   - Stored as non-HttpOnly cookie (JavaScript can read)
   - 24-hour expiration

2. **Client reads cookie and sets header**
   - JavaScript reads CSRF token from cookie
   - Includes token in `X-CSRF-Token` request header
   - Only same-origin requests can read cookies (SOP)

3. **Server validates token match**
   - Compares cookie value with header value
   - Uses constant-time comparison (timing attack protection)
   - Rejects request if mismatch or missing

### Why This Prevents CSRF

Attackers cannot execute CSRF attacks because:
- They cannot read cookies from other domains (Same-Origin Policy)
- They cannot set the correct `X-CSRF-Token` header value
- Even if they guess a token, constant-time comparison prevents timing attacks

## Security Properties

### Cryptographic Security
- **Token Generation**: `secrets.token_hex(32)` - 256 bits of entropy
- **Token Comparison**: `secrets.compare_digest()` - constant-time comparison
- **Token Format**: 64-character hex string (unpredictable)

### Cookie Security
```http
Set-Cookie: csrf_token=abc123...;
  Max-Age=86400;
  Path=/;
  SameSite=lax;
  Secure;
  HttpOnly=false
```

- `Max-Age=86400`: 24-hour expiration
- `Path=/`: Available to entire application
- `SameSite=lax`: Allows same-site requests, blocks cross-site
- `Secure`: HTTPS only (production)
- `HttpOnly=false`: JavaScript must read value for header

## Usage

### Backend (Python/FastAPI)

The middleware is automatically applied to all routes:

```python
from app.middleware.csrf_middleware import CSRFMiddleware

app.add_middleware(CSRFMiddleware)
```

**Protected Methods**: POST, PUT, DELETE, PATCH
**Excluded Methods**: GET, HEAD, OPTIONS (safe by HTTP semantics)

**Public Endpoints** (no CSRF required):
```python
PUBLIC_ENDPOINTS = {
    "/health",
    "/api/auth/login",
    "/api/auth/register",
    "/auth/google",
    "/auth/google/callback",
}
```

### Frontend (TypeScript/React)

The API client automatically includes CSRF tokens:

```typescript
import { addCsrfHeader } from '@/lib/csrf';

// Automatic usage via API client
await apiClient.post('/api/resource', { data });

// Manual usage for custom requests
fetch('/api/resource', {
  method: 'POST',
  headers: addCsrfHeader({
    'Content-Type': 'application/json'
  }),
  body: JSON.stringify(data),
  credentials: 'include'  // Required for cookies
});
```

### Utility Functions

```typescript
// Get current CSRF token
const token = getCsrfToken();

// Check if token exists
if (hasCsrfToken()) {
  console.log('CSRF protection active');
}

// Wait for token to be available
await waitForCsrfToken(5000);  // 5 second timeout
```

## Testing

Comprehensive test suite covers:
- ✅ Token validation (valid, invalid, missing, mismatched)
- ✅ HTTP method handling (safe vs state-changing)
- ✅ Public endpoint exclusions
- ✅ Cookie security attributes
- ✅ Token format and entropy
- ✅ Constant-time comparison
- ✅ Cross-origin attack prevention
- ✅ Edge cases (empty, whitespace, case sensitivity)

Run tests:
```bash
uv run pytest tests/middleware/test_csrf_middleware.py -v
```

## Error Responses

### Missing or Invalid CSRF Token

```json
HTTP/1.1 403 Forbidden
{
  "detail": "CSRF validation failed. Please refresh the page and try again."
}
```

**Client Handling**:
1. Display error message to user
2. Refresh page to get new token
3. Retry request

## Security Considerations

### Why Not HttpOnly for CSRF Cookie?

The CSRF token cookie **cannot** be HttpOnly because:
- JavaScript needs to read the value
- Value must be included in request header
- This is safe because token is only useful when paired with cookie

### Token Rotation

Tokens have 24-hour expiration for balance between:
- **Security**: Regular rotation limits token lifetime
- **Usability**: Doesn't require constant re-authentication
- **Performance**: Reduces server-side token management

### SameSite Cookie Attribute

We use `SameSite=lax` because:
- Blocks cross-site POST requests (CSRF protection)
- Allows same-site navigation with cookies (usability)
- Compatible with modern browsers

## Compliance

This implementation follows:
- **OWASP CSRF Prevention Cheat Sheet**: Double-submit cookie pattern
- **NIST SP 800-63B**: Token-based session management
- **PCI DSS 6.5.9**: CSRF protection requirement

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [RFC 6265 - HTTP State Management (Cookies)](https://datatracker.ietf.org/doc/html/rfc6265)
- [Same-Origin Policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)

## Troubleshooting

### CSRF Validation Fails

**Symptoms**: 403 errors on POST/PUT/DELETE requests

**Common Causes**:
1. Cookies disabled in browser
2. CORS misconfiguration (credentials not included)
3. Token expired (>24 hours)
4. Different domain (cross-origin request)

**Solutions**:
1. Verify cookies enabled: `document.cookie`
2. Check `credentials: 'include'` in fetch requests
3. Refresh page to get new token
4. Use same domain for API requests

### Token Not Set

**Symptoms**: Missing CSRF cookie after GET request

**Causes**:
1. Middleware not registered
2. Response modified by other middleware
3. Browser rejecting cookie

**Solutions**:
1. Check middleware order in `app/server.py`
2. Verify cookie in browser DevTools
3. Check browser console for cookie warnings
