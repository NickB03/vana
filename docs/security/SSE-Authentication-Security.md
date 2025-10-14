# SSE Authentication & CSRF Security

## Overview

This document describes the comprehensive security protections implemented for the SSE proxy endpoint, including authentication bypass prevention (P0-003) and CSRF protection (P1-008).

## Vulnerability (P0-003)

**Issue:** Authentication could be bypassed by setting `NODE_ENV=development` in production environments.

**Risk Level:** HIGH - Allowed unauthorized access to SSE streams

**Original Code:**
```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

if (!isDevelopment && !accessToken) {
  return new NextResponse('Unauthorized', { status: 401 });
}
```

## Security Fix

### Implementation

The fix replaces the `NODE_ENV` check with an explicit allowlist system that:

1. **Always allows localhost**: Local development hosts (`localhost`, `127.0.0.1`) are automatically allowed
2. **Explicit allowlist**: Additional hosts must be explicitly configured via `ALLOW_UNAUTHENTICATED_SSE`
3. **Production-safe**: No authentication bypass in production unless explicitly configured

### Code Changes

**File:** `frontend/src/app/api/sse/[...route]/route.ts`

```typescript
// Security Configuration: Allowlist for unauthenticated SSE access
const ALLOWED_UNAUTHENTICATED_HOSTS =
  process.env.ALLOW_UNAUTHENTICATED_SSE?.split(',').map(h => h.trim()).filter(Boolean) || [];

// Security: Check if authentication can be bypassed
const requestHost = request.headers.get('host') || '';

// Local development check: Only allow localhost/127.0.0.1
const isLocalDevelopment =
  requestHost.startsWith('localhost:') ||
  requestHost.startsWith('127.0.0.1:') ||
  requestHost === 'localhost' ||
  requestHost === '127.0.0.1';

// Explicit allowlist check
const isAllowedHost = ALLOWED_UNAUTHENTICATED_HOSTS.includes(requestHost);

// Enforce authentication unless explicitly bypassed
if (!isLocalDevelopment && !isAllowedHost && !accessToken) {
  console.warn('[SSE Proxy Security] Blocked unauthenticated request from:', requestHost);
  return new NextResponse('Unauthorized: Authentication required', {
    status: 401,
    headers: {
      'Content-Type': 'text/plain',
      'WWW-Authenticate': 'Bearer realm="SSE Proxy"',
    }
  });
}
```

## Configuration

### Environment Variable

**Variable:** `ALLOW_UNAUTHENTICATED_SSE`

**Format:** Comma-separated list of `host:port` combinations

**Example:**
```bash
ALLOW_UNAUTHENTICATED_SSE=dev.example.com:3000,staging.example.com:3000
```

### Security Guidelines

#### ✅ DO:
- Use only for development/testing environments
- Keep the allowlist minimal and specific
- Document which hosts are allowlisted and why
- Remove from production `.env` files
- Use proper authentication in production

#### ❌ DON'T:
- Set this variable in production
- Use wildcard patterns
- Add public-facing production domains
- Leave it undefined for production (enforces auth)

### Default Behavior

| Environment | Host | Authentication Required? |
|------------|------|-------------------------|
| Any | `localhost`, `localhost:*` | ❌ No (auto-allowed) |
| Any | `127.0.0.1`, `127.0.0.1:*` | ❌ No (auto-allowed) |
| Any | Allowlisted host | ❌ No (explicitly allowed) |
| Production | Any other host | ✅ Yes (required) |

## Testing

### Security Test Suite

**File:** `frontend/src/app/api/sse/__tests__/auth-security.test.ts`

Test coverage includes:
- ✅ Localhost development access (allowed)
- ✅ Production unauthorized blocking (blocked)
- ✅ Explicit allowlist functionality
- ✅ Edge cases (malformed hosts, missing headers)
- ✅ Security logging

### Running Tests

```bash
# Run security tests
cd frontend
npm test -- auth-security.test.ts

# Run with coverage
npm test -- --coverage auth-security.test.ts
```

## Security Logging

The SSE proxy logs all authentication checks for security auditing:

```typescript
console.log('[SSE Proxy Security] Host:', requestHost);
console.log('[SSE Proxy Security] Is local development:', isLocalDevelopment);
console.log('[SSE Proxy Security] Is allowlisted host:', isAllowedHost);
console.log('[SSE Proxy Security] Has access token:', !!accessToken);

// Blocked requests
console.warn('[SSE Proxy Security] Blocked unauthenticated request from:', requestHost);

// Allowed bypass
console.warn('[SSE Proxy Security] Allowing unauthenticated access for:', requestHost);
console.warn('[SSE Proxy Security] Reason:', reason);
```

### Log Monitoring

Monitor these logs in production:
- **Warning:** Blocked unauthenticated requests (potential attack)
- **Warning:** Allowed unauthenticated access (should only happen in dev/staging)
- **Error:** Missing or invalid authentication tokens

## Security Best Practices

### 1. Production Deployment

```bash
# Production .env should NOT have ALLOW_UNAUTHENTICATED_SSE
# Authentication is always enforced

# .env.production
NEXT_PUBLIC_API_URL=https://api.example.com
# ALLOW_UNAUTHENTICATED_SSE is NOT set (authentication required)
```

### 2. Staging Environment

```bash
# Staging can use allowlist for testing
# .env.staging
NEXT_PUBLIC_API_URL=https://staging-api.example.com
ALLOW_UNAUTHENTICATED_SSE=staging.example.com:3000
```

### 3. Local Development

```bash
# Local development automatically allowed (no config needed)
# .env.local
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
# ALLOW_UNAUTHENTICATED_SSE not needed for localhost
```

## Attack Prevention

### Prevented Attack Vectors

1. **NODE_ENV Manipulation**
   - ❌ Old: Attacker sets `NODE_ENV=development` in production
   - ✅ New: Environment variable ignored, host-based checking

2. **Domain Spoofing**
   - ❌ Old: Could potentially bypass with domain manipulation
   - ✅ New: Explicit allowlist, no wildcards, strict host matching

3. **Production Bypass**
   - ❌ Old: Any production deployment with dev environment bypassed auth
   - ✅ New: Production requires authentication unless explicitly allowlisted

### Security Layers

1. **Host Validation**: Check request host header
2. **Localhost Detection**: Auto-allow only `localhost`/`127.0.0.1`
3. **Allowlist Check**: Explicit configuration required
4. **Authentication**: JWT token validation (when not bypassed)
5. **Logging**: All security decisions logged

## CSRF Protection (P1-008)

### Overview

The SSE proxy implements comprehensive CSRF (Cross-Site Request Forgery) protection using the **double-submit cookie pattern** to prevent unauthorized cross-origin requests.

### Implementation

**File:** `frontend/src/app/api/sse/[...route]/route.ts` (Lines 47-60)

```typescript
// SECURITY CHECK 1: CSRF Token Validation
const csrfValid = validateCsrfToken(request);
logCsrfAttempt(request, csrfValid);

if (!csrfValid) {
  console.warn('[SSE Proxy] CSRF validation failed');
  return new NextResponse('CSRF validation failed. Please refresh the page and try again.', {
    status: 403,
    headers: {
      'Content-Type': 'text/plain',
    }
  });
}
```

### Double-Submit Cookie Pattern

The CSRF protection works in two layers:

1. **Server sets CSRF token** as a non-HttpOnly cookie (`csrf_token`)
2. **Client reads cookie** and includes value in `X-CSRF-Token` header
3. **Server validates** header matches cookie using constant-time comparison
4. **Attack fails** because attacker cannot read cookie value cross-origin

### Client-Side Integration

**File:** `frontend/src/hooks/useSSE.ts` (Lines 284-297)

```typescript
// SECURITY: Add CSRF token for CSRF protection
const csrfToken = getCsrfToken();
const headers: HeadersInit = {
  'Accept': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

// Add CSRF token if available
if (csrfToken) {
  headers['X-CSRF-Token'] = csrfToken;
  console.log('[useSSE] Added CSRF token to request headers');
} else {
  console.warn('[useSSE] No CSRF token available - request may fail in production');
}
```

### Security Features

#### 1. Constant-Time Comparison
Prevents timing attacks by comparing tokens in constant time:

```typescript
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
```

#### 2. Token Format Validation
- Must be exactly 64 characters (32 bytes hex-encoded)
- Must match regex pattern: `/^[0-9a-f]+$/i`
- Provides 256 bits of entropy

#### 3. Development Mode Support
- CSRF validation skipped in `NODE_ENV=development`
- Allows local testing without token setup
- Production always enforces validation

### Attack Prevention

The CSRF protection blocks these attack vectors:

1. **Cookie Theft Attack**
   - Attacker steals cookie but cannot set custom headers
   - ❌ Blocked: Missing `X-CSRF-Token` header

2. **Header Guessing Attack**
   - Attacker guesses header but has no cookie access
   - ❌ Blocked: Missing cookie value

3. **Token Mismatch Attack**
   - Attacker has both but values don't match
   - ❌ Blocked: Constant-time comparison fails

4. **Cross-Origin Attack**
   - Attacker makes cross-origin request
   - ❌ Blocked: Cannot read cookie value from different origin

### Testing

**File:** `frontend/src/app/api/sse/__tests__/csrf-protection.test.ts`

Test coverage includes:
- ✅ Missing CSRF token (blocked)
- ✅ Invalid CSRF token (blocked)
- ✅ Valid CSRF token (allowed)
- ✅ Token format validation (length, hex pattern)
- ✅ Attack scenarios (stolen cookie, guessed header, mismatched tokens)
- ✅ Development mode bypass
- ✅ Production enforcement
- ✅ Security logging

### Running Tests

```bash
cd frontend
npm test -- csrf-protection.test.ts
```

### CSRF Token Lifecycle

1. **Token Generation** (Backend)
   - Server generates 32-byte random token
   - Sets as non-HttpOnly cookie: `csrf_token`
   - Token valid for session duration

2. **Token Usage** (Client)
   - Client reads `csrf_token` cookie via `getCsrfToken()`
   - Includes token in `X-CSRF-Token` header for all SSE requests
   - Token automatically refreshed on new sessions

3. **Token Validation** (Server)
   - Extract token from both cookie and header
   - Validate format (64 hex characters)
   - Compare using constant-time algorithm
   - Log all validation attempts

### Monitoring & Logging

CSRF validation is logged for security monitoring:

```typescript
console.warn('[CSRF] Missing token:', {
  hasHeader: !!tokenHeader,
  hasCookie: !!tokenCookie,
});

console.warn('[CSRF] Invalid token length:', {
  headerLength: tokenHeader.length,
  cookieLength: tokenCookie.length,
  expectedLength: 64,
});

console.warn('[CSRF] Token mismatch');
```

### Production Deployment

#### ✅ Security Checklist

- [ ] `NODE_ENV=production` set in production
- [ ] CSRF tokens generated with cryptographically secure RNG
- [ ] HttpOnly cookies enabled for authentication
- [ ] SameSite=Strict or Lax set on cookies
- [ ] HTTPS enforced for all connections
- [ ] CORS properly configured (no wildcards in production)
- [ ] Security headers enabled (CSP, X-Frame-Options, etc.)

#### Configuration

Production `.env` should include:

```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.example.com
# No ALLOW_UNAUTHENTICATED_SSE (enforces auth + CSRF)
```

## Compliance

This implementation addresses:
- ✅ OWASP A01:2021 – Broken Access Control
- ✅ OWASP A07:2021 – Identification and Authentication Failures
- ✅ CWE-306: Missing Authentication for Critical Function
- ✅ CWE-352: Cross-Site Request Forgery (CSRF)
- ✅ OWASP CSRF Prevention Cheat Sheet

## Related Documentation

- [CSRF Client-Side Implementation](../frontend/src/lib/csrf.ts)
- [CSRF Server-Side Validation](../frontend/src/lib/csrf-server.ts)
- [SSE Connection Hook](../frontend/src/hooks/useSSE.ts)
- [Authentication Flow](./Authentication-Flow.md)
- [Environment Configuration](../deployment/Environment-Configuration.md)

## Support

For security concerns or questions:
- Security issues: Report privately to security team
- Configuration questions: See `.env.example`
- Test failures: Check `auth-security.test.ts` and `csrf-protection.test.ts`
- CSRF issues: Verify cookie and header are present in browser DevTools
