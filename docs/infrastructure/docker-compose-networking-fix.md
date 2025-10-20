# Docker Compose Network Routing Bypass - Critical Infrastructure Issue

**Status**: OPEN
**Priority**: HIGH - Security and Architecture Violation
**Owner**: DevOps Team
**Reviewers**: Security Team, Platform Architecture
**Date Identified**: 2025-10-19
**Identified By**: Codex Agent (Phase 3.3 Peer Review)

---

## Executive Summary

The current Docker Compose configuration (`docker-compose.yml`) creates a critical security and architectural vulnerability by mapping host port 8000 directly to the ADK runtime container port 8080, allowing the frontend to bypass the FastAPI middleware layer entirely. This violates the gateway pattern and exposes the system to security risks.

**Impact**: CRITICAL - Authentication, CSRF validation, logging, and monitoring are bypassed.

---

## Problem Description

### Current Configuration (INCORRECT)

**File**: `/Users/nick/Projects/vana/docker-compose.yml`

```yaml
# Line 9: Backend service port mapping
backend:
  ports:
    - "8000:8080"  # ❌ Maps host 8000 → container 8080 (ADK runtime)
```

```yaml
# Line 35-36: Frontend environment variables
frontend:
  environment:
    - NEXT_PUBLIC_VANA_BASE_URL=http://backend:8080  # ❌ Direct ADK access
    - VANA_BASE_URL=http://backend:8080              # ❌ Bypasses FastAPI
```

### Evidence Analysis

1. **Port Mapping Violation** (Line 9):
   - Host port 8000 maps to **container port 8080** (ADK runtime)
   - Expected: Host 8000 → Container 8000 (FastAPI)

2. **Direct ADK Access** (Lines 35-36):
   - Frontend connects to `backend:8080` (ADK runtime)
   - Expected: Frontend → `backend:8000` (FastAPI gateway)

3. **Architecture Bypass**:
   - FastAPI middleware layer (port 8000) is **never invoked**
   - All requests go directly to ADK runtime (port 8080)

### Architecture Diagram: Current vs. Expected

**Current (INCORRECT)**:
```
┌──────────┐
│ Frontend │
└────┬─────┘
     │ http://backend:8080
     ↓
┌────────────────────────────────┐
│ Backend Container              │
│                                │
│  ┌──────────────┐             │
│  │ ADK Runtime  │◄────────────┼─── Port 8080 (EXPOSED)
│  │ (Port 8080)  │             │
│  └──────────────┘             │
│                                │
│  ┌──────────────┐             │
│  │ FastAPI      │             │
│  │ (Port 8000)  │◄────────────┼─── Port 8000 (UNMAPPED)
│  │ MIDDLEWARE   │             │
│  │ NOT INVOKED! │             │
│  └──────────────┘             │
└────────────────────────────────┘
```

**Expected (CORRECT)**:
```
┌──────────┐
│ Frontend │
└────┬─────┘
     │ http://backend:8000
     ↓
┌────────────────────────────────┐
│ Backend Container              │
│                                │
│  ┌──────────────┐             │
│  │ FastAPI      │◄────────────┼─── Port 8000 (EXPOSED)
│  │ (Port 8000)  │             │
│  │ MIDDLEWARE   │             │
│  │ - CSRF       │             │
│  │ - Auth       │             │
│  │ - Logging    │             │
│  └──────┬───────┘             │
│         │ Proxy to ADK        │
│         ↓                     │
│  ┌──────────────┐             │
│  │ ADK Runtime  │             │
│  │ (Port 8080)  │◄────────────┼─── Port 8080 (INTERNAL ONLY)
│  │ INTERNAL     │             │
│  └──────────────┘             │
└────────────────────────────────┘
```

---

## Security Impact Analysis

### 1. CSRF Validation Bypassed
**Risk Level**: CRITICAL

- **Current**: Frontend connects directly to ADK (port 8080) → No CSRF checks
- **Impact**: Cross-site request forgery attacks possible
- **Affected Code**: `frontend/src/app/api/sse/run_sse/route.ts` lines 89-106 (CSRF validation never executed)

### 2. Authentication Bypassed
**Risk Level**: CRITICAL

- **Current**: JWT token validation in FastAPI middleware never invoked
- **Impact**: Unauthenticated access to ADK runtime
- **Affected Code**: Authentication middleware in `app/middleware/` (never executed)

### 3. Observability Bypassed
**Risk Level**: HIGH

- **Current**: FastAPI logging, metrics, and monitoring skipped
- **Impact**:
  - No request/response logging
  - No error tracking
  - No performance metrics
  - Blind spots in production monitoring

### 4. Rate Limiting Bypassed
**Risk Level**: HIGH

- **Current**: Rate limiting middleware never applied
- **Impact**: DDoS and abuse vectors exposed

### 5. Gateway Pattern Violation
**Risk Level**: HIGH

- **Current**: Direct backend access violates API gateway pattern
- **Impact**: Future middleware changes won't apply, architectural debt

---

## Recommended Fixes

### Option 1: Separate Port Mapping (Recommended for Clarity)

**Advantages**:
- Explicit port separation
- Easy to understand
- FastAPI becomes visible gateway
- ADK port 8080 stays internal-only

**Changes Required**:

**File**: `docker-compose.yml`
```yaml
# Line 9: Map host 8000 to FastAPI (container 8000)
backend:
  ports:
    - "8000:8000"  # ✅ FastAPI gateway
    # Port 8080 NOT exposed to host (internal only)

  # OPTIONAL: Expose ADK port for debugging (remove in production)
  # - "8080:8080"  # Only for local ADK debugging
```

**File**: `docker-compose.yml` (Frontend section)
```yaml
# Lines 35-36: Connect to FastAPI gateway
frontend:
  environment:
    - NEXT_PUBLIC_VANA_BASE_URL=http://backend:8000  # ✅ FastAPI
    - VANA_BASE_URL=http://backend:8000              # ✅ Gateway pattern
```

**Dockerfile Changes Required**:
Ensure FastAPI listens on port 8000 in container:
```dockerfile
# Dockerfile.local or Dockerfile
EXPOSE 8000
CMD ["uvicorn", "app.server:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

### Option 2: Network Policies with Single Port (Recommended for Production)

**Advantages**:
- Production-ready security
- Enforces network isolation
- Explicit service dependencies
- Prevents accidental ADK exposure

**Changes Required**:

**File**: `docker-compose.yml`
```yaml
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.local
    ports:
      - "8000:8000"  # ✅ Only expose FastAPI
    networks:
      - vana-network
    # ADK port 8080 is INTERNAL ONLY (no host mapping)
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]  # ✅ FastAPI health
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_VANA_BASE_URL=http://backend:8000  # ✅ FastAPI gateway
      - VANA_BASE_URL=http://backend:8000              # ✅ Enforced
    depends_on:
      - backend
    networks:
      - vana-network

networks:
  vana-network:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: vana0
      com.docker.network.bridge.enable_icc: "true"  # Inter-container communication
```

**Additional Security Layer** (Optional for production):
```yaml
# Add network policies to prevent direct ADK access
services:
  backend:
    networks:
      vana-network:
        aliases:
          - fastapi-gateway
    # Only FastAPI port accessible from other containers
```

---

## Testing Procedure

### Pre-Migration Testing Checklist

**1. Verify Current (Broken) Behavior**:
```bash
# Start services with current config
docker-compose up -d

# Verify frontend connects to ADK (port 8080)
docker-compose logs frontend | grep "VANA_BASE_URL"
# Expected: http://backend:8080 (INCORRECT)

# Verify FastAPI is unreachable from frontend
docker-compose exec frontend curl -v http://backend:8000/health
# Expected: Timeout or connection refused

# Verify ADK is reachable directly
docker-compose exec frontend curl -v http://backend:8080/health
# Expected: Success (SECURITY VIOLATION)
```

**2. Apply Fix (Option 1 or Option 2)**:
```bash
# Stop services
docker-compose down

# Edit docker-compose.yml (apply chosen fix)

# Rebuild containers
docker-compose build --no-cache backend frontend

# Start services
docker-compose up -d
```

**3. Verify Fixed Behavior**:
```bash
# Check FastAPI gateway is accessible
curl -v http://localhost:8000/health
# Expected: 200 OK from FastAPI

# Check ADK port is NOT exposed to host
curl -v http://localhost:8080/health
# Expected: Connection refused (CORRECT)

# Verify frontend connects to FastAPI (inside container network)
docker-compose exec frontend curl -v http://backend:8000/health
# Expected: 200 OK

# Verify middleware is invoked (check logs)
docker-compose logs backend | grep "FastAPI"
# Expected: FastAPI request logs appear

# Test CSRF validation works
curl -X POST http://localhost:8000/api/sse/run_sse \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test"}'
# Expected: 403 CSRF validation failed (CORRECT)

# Test authentication enforcement
curl -X POST http://localhost:3000/api/sse/run_sse \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test"}'
# Expected: 401 Unauthorized (if not localhost)
```

**4. End-to-End Testing**:
```bash
# Start full stack
docker-compose up -d

# Open browser to http://localhost:3000
# Verify chat functionality works through FastAPI gateway
# Check browser console for errors
# Verify SSE streams work correctly

# Check backend logs show FastAPI middleware execution
docker-compose logs -f backend
# Expected: Request logging, CSRF checks, auth validation
```

---

## Migration Plan

### Phase 1: Local Development Fix (Week 1)
- **Day 1-2**: Apply Option 1 fix to `docker-compose.yml`
- **Day 2-3**: Test locally with full regression suite
- **Day 3-4**: Update developer documentation
- **Day 5**: Team review and sign-off

### Phase 2: CI/CD Integration (Week 2)
- **Day 1-2**: Update CI/CD Docker configs
- **Day 3-4**: Test in staging environment
- **Day 5**: Deploy to staging, monitor for issues

### Phase 3: Production Deployment (Week 3)
- **Day 1-2**: Apply Option 2 (network policies) to production configs
- **Day 3**: Production deployment with rollback plan
- **Day 4-5**: Monitor production metrics, verify middleware invocation

### Rollback Plan
```bash
# If issues occur, immediate rollback:
git checkout HEAD~1 docker-compose.yml
docker-compose down
docker-compose up -d

# Verify rollback successful:
curl http://localhost:8000/health
docker-compose logs backend
```

---

## Success Criteria

### Technical Verification
- [ ] Host port 8000 maps to container port 8000 (FastAPI)
- [ ] ADK port 8080 NOT exposed to host
- [ ] Frontend connects to `backend:8000` (FastAPI)
- [ ] CSRF validation executes on POST requests
- [ ] JWT authentication enforced
- [ ] Request/response logging appears in backend logs
- [ ] Health check targets FastAPI endpoint

### Security Validation
- [ ] Direct ADK access from host BLOCKED (port 8080 unreachable)
- [ ] Middleware layer executes for all requests
- [ ] Authentication bypass ONLY works for localhost (dev mode)
- [ ] CSRF tokens validated on all POST endpoints
- [ ] Rate limiting applies to all API calls

### Observability Validation
- [ ] FastAPI request logs appear in monitoring
- [ ] Error tracking captures middleware errors
- [ ] Performance metrics collected at gateway layer
- [ ] No blind spots in request tracing

---

## Related Documentation

- **Architecture**: `/docs/architecture/gateway-pattern.md` (to be created)
- **Security**: `/docs/security/production-hardening-checklist.md`
- **Deployment**: `/docs/deployment/docker-compose-best-practices.md` (to be created)
- **ADK Integration**: `/docs/adk/fastapi-adk-integration.md` (to be created)

---

## Action Items

**Immediate (Week 1)**:
- [ ] **DevOps Lead**: Review and approve fix option (Option 1 vs Option 2)
- [ ] **Platform Engineer**: Apply chosen fix to `docker-compose.yml`
- [ ] **QA Engineer**: Execute testing procedure (Pre-Migration → Verification)
- [ ] **Security Team**: Audit fix and approve for deployment

**Short-Term (Week 2-3)**:
- [ ] **DevOps Team**: Update CI/CD configurations
- [ ] **Platform Team**: Deploy to staging and production
- [ ] **SRE Team**: Add monitoring alerts for middleware health
- [ ] **Tech Writer**: Update developer onboarding docs

**Long-Term (Month 2)**:
- [ ] **Architecture Team**: Create gateway pattern documentation
- [ ] **Security Team**: Conduct post-deployment audit
- [ ] **DevOps Team**: Add automated tests for network configuration
- [ ] **Platform Team**: Review all other Docker Compose configs for similar issues

---

## Appendix: FastAPI Proxy Configuration

**File**: `app/server.py` (excerpt showing ADK proxy)
```python
@app.post("/run_sse")
async def run_sse_endpoint(request: Request):
    """
    FastAPI gateway that proxies to ADK runtime (port 8080)
    CRITICAL: This endpoint MUST be invoked, not bypassed
    """
    # CSRF validation
    validate_csrf(request)

    # JWT authentication
    user = await get_current_user(request)

    # Logging
    logger.info(f"SSE request from user {user.id}")

    # Proxy to ADK runtime (internal port 8080)
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8080/adk/run_sse",  # Internal ADK
            headers=request.headers,
            json=await request.json()
        )

    return StreamingResponse(
        response.aiter_bytes(),
        media_type="text/event-stream"
    )
```

**Expected Flow**:
1. Frontend → `http://backend:8000/run_sse` (FastAPI)
2. FastAPI validates CSRF, Auth, Logging
3. FastAPI proxies to `http://localhost:8080/adk/run_sse` (ADK runtime, internal)
4. ADK processes request and streams response
5. FastAPI streams response back to frontend

---

**Document Version**: 1.0
**Last Updated**: 2025-10-19
**Next Review**: After implementation (Week 3)
