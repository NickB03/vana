# Security Hardening Task Guide

This document gives AI coding agents a step‑by‑step plan to close critical security gaps before showcasing or deploying Vana. Each section explains why the change matters, where to edit, sample code, and how to test safely. Follow the phases sequentially; verify after every milestone.

---

## 0. Summary of Required Fixes

| Priority | Area | Issue |
| --- | --- | --- |
| High | Cookie security | Auth cookies never set `secure=True` in production (`app/auth/cookie_routes.py`) |
| High | CSRF coverage | CSRF middleware exempts ADK session routes, allowing cross-site POST abuse |
| Medium | CSRF cookie deployment | CSRF cookie always uses `secure=True`, which fails on non-HTTPS staging |
| Medium | SSE proxy bypass | `ALLOW_UNAUTHENTICATED_SSE` can disable auth if misconfigured |
| Medium | CSP policy | Frontend CSP still includes `'unsafe-inline' 'unsafe-eval'` (acceptable for dev, but note) |

Before making changes, ensure tests are green: `poetry run pytest` and `npm run test`.

---

## 1. Secure Auth Cookies in Production

**Why:** Cookies with `secure=False` can be intercepted on public networks. For portfolio demos or future deployments, set `secure=True` when `ENVIRONMENT` is production.  
**Files:** `app/auth/cookie_routes.py`

### 1.1 Update `set-tokens`

**Current snippet (insecure):**
```python
is_production = False  # TODO: Set based on environment config
cookie_options = {
    "httponly": True,
    "secure": is_production,
    "samesite": "lax",
    "path": "/",
}
```

**Replace with:**
```python
env = os.getenv("ENVIRONMENT", "development")
is_production = env.lower() == "production"
cookie_options = {
    "httponly": True,
    "secure": is_production,
    "samesite": "lax",
    "path": "/",
}
```

**Implementation tips:**
- Import `os` at top of file if not already present.
- Use the same logic in `clear-tokens`.
- Optional: add warning log when running without HTTPS (`ENVIRONMENT != "production"`).

### 1.2 Testing
1. Unit: `poetry run pytest tests/unit/test_cookie_routes.py` (add tests verifying secure flag if missing).
2. Manual: set `ENVIRONMENT=production`, hit `/api/auth/set-tokens`, confirm `Secure` flag in response headers (e.g., `curl -I`).
3. Ensure this also works in dev (cookies should still be set even when `secure=False`).

---

## 2. Restore CSRF Protection for ADK Session Routes

**Why:** `/apps/{app}/users/{user}/sessions/{session}/run` currently bypasses CSRF checks (`app/middleware/csrf_middleware.py`), enabling attackers to trigger runs via cross-site POST if cookies are present.

### 2.1 Modify CSRF middleware

Locate:
```python
# Skip CSRF validation for ADK session endpoints
if "/apps/" in request.url.path and "/sessions/" in request.url.path:
    response = await call_next(request)
    return self._ensure_csrf_cookie(request, response)
```

**Action:** Remove this block. If certain routes genuinely need exemption, replace with stricter logic (e.g., `if request.method == "GET" and ...`).

### 2.2 Ensure Frontend Sends CSRF Token

Confirm that frontend requests include the `X-CSRF-Token` header:
- `frontend/src/hooks/useSSE.ts` already calls `getCsrfToken()`.
- For other POST/PUT routes (intent dispatcher, etc.), ensure `addCsrfHeader` in `frontend/src/lib/csrf.ts` is used.

### 2.3 Testing
1. Unit: add regression test (`tests/unit/test_csrf_middleware.py`) to assert that POST to `/apps/.../run` without header fails (403).
2. Integration: simulate legitimate request with both cookie and header -> should pass.
3. Manual: run UI, send message, ensure research still starts (CSRF header must propagate).

---

## 3. Handle CSRF Cookie Secure Flag per Environment

**Why:** `secure=True` on the CSRF cookie prevents it from being set on non-HTTPS staging/public environments. For local dev, browsers ignore the flag; for non-HTTPS servers, you need flexibility.

### 3.1 Update `_ensure_csrf_cookie`

Current code (`app/middleware/csrf_middleware.py:185-193`):
```python
response.set_cookie(
    key=CSRF_TOKEN_COOKIE,
    value=csrf_token,
    httponly=False,
    secure=True,
    samesite="lax",
    max_age=60 * 60 * 24,
    path="/",
)
```

**Suggested update:**
```python
env = os.getenv("ENVIRONMENT", "development")
secure_cookie = env.lower() == "production"
response.set_cookie(
    key=CSRF_TOKEN_COOKIE,
    value=csrf_token,
    httponly=False,
    secure=secure_cookie,
    samesite="lax",
    max_age=60 * 60 * 24,
    path="/",
)
```

**Note:** For portfolio deployments using HTTPS (recommended), set `ENVIRONMENT=production`.

### 3.2 Testing
1. Unit test to verify secure flag toggles by env value.
2. Manual check in staging: set `ENVIRONMENT=staging` and confirm cookie sets properly.

---

## 4. SSE Proxy Allowlist Safety

**Why:** `ALLOW_UNAUTHENTICATED_SSE` (used in `frontend/src/app/api/sse/[...route]/route.ts`) lets you bypass auth for certain hosts. This is fine for local testing, but must remain empty in production or it becomes a public stream.

### 4.1 Documentation & Guard Rails
1. Update `.env.example` or README to clarify this variable is for dev only.
2. In the proxy handler, add a warning log if the env var is set in production:
   ```ts
   if (process.env.NODE_ENV === 'production' && ALLOWED_UNAUTHENTICATED_HOSTS.length) {
     console.warn('[SSE Proxy] WARNING: ALLOW_UNAUTHENTICATED_SSE set in production');
   }
   ```
3. Optional: fail fast in production when allowlist is non-empty.

### 4.2 Testing
- Verify SSE still works locally with allowlist entries.
- Confirm there’s log output in production mode when the variable is improperly set.

---

## 5. CSP Hardening (Optional Follow-Up)

The current CSP includes `'unsafe-inline' 'unsafe-eval'` for the web UI portion (needed for some Next.js tooling). For portfolio use, understanding the trade-off is sufficient. Once the frontend is stable:
- Move toward hashed or nonced scripts to drop `'unsafe-inline'`.
- Review `app/middleware/security.py` and adjust `_get_csp_policy_for_path`.
- Test by loading the frontend and ensuring no CSP violations are triggered.

---

## 6. Validation Checklist

1. `poetry run pytest` (backend tests)
2. `npm run test` (frontend unit tests)
3. `npm run test:e2e` if applicable
4. Manual checks:
   - Cookies set with `Secure` flag on HTTPS environment
   - CSRF token required for `/apps/.../run`
   - SSE streaming still functions
   - No console warnings related to auth/CSRF

5. Update documentation:
   - `README.md` secure deployment notes
   - Any environment config files or CLAUDE.md instructions

---

## 7. Rollout Strategy

1. Implement each phase on a separate branch; land with tests.
2. Deploy to staging (or local HTTPS via mkcert) to verify secure cookies and CSRF.
3. After successful verification, merge to main and update CLAUDE.md with “Bringup complete” notes (remove WIP comments).

---

## Appendix – Useful Commands

```bash
# Run targeted backend tests
poetry run pytest tests/unit/test_csrf_middleware.py

# Add debug logging to check cookie flags (Python REPL)
python - <<'PY'
from fastapi.testclient import TestClient
from app.server import app
c = TestClient(app)
resp = c.post("/api/auth/set-tokens", json={"access_token": "a", "refresh_token": "b", "expires_in": 60})
print(resp.cookies)
PY

# Inspect response headers with curl
curl -I -H "Origin: https://example.com" https://yourhost/api/auth/set-tokens
```

---

**End of Guide.** Follow the phases in order. Document each change, keep feature flags/environment variables under control, and rerun tests after every modification. When everything is merged, remember to update CLAUDE.md to remove WIP notes about SSE migration and security hardening.
