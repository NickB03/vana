# Production Security Hardening Checklist - Phase 3.3 SSE Authentication

**Status**: OPEN
**Priority**: MEDIUM - Security hardening required before production launch
**Owner**: Security Team
**Reviewers**: DevOps, Platform Engineering, Compliance
**Date Identified**: 2025-10-19
**Identified By**: Codex Agent (Phase 3.3 Peer Review)

---

## Executive Summary

The Phase 3.3 SSE implementation includes development-mode authentication bypass mechanisms (`ALLOW_UNAUTHENTICATED_SSE`, `ALLOW_UNAUTHENTICATED_HOSTS`) designed for local testing. These environment variables **MUST** be properly configured in production to prevent security vulnerabilities. This checklist ensures production deployments enforce authentication and meet security compliance requirements.

**Impact**: MEDIUM - Misconfigured production could allow unauthenticated SSE access, violating security policies.

---

## Problem Description

### Development Authentication Bypass

**File**: `/Users/nick/Projects/vana/frontend/src/app/api/sse/run_sse/route.ts`

```typescript
// Lines 46-47: Authentication bypass allowlist
const ALLOWED_UNAUTHENTICATED_HOSTS =
  process.env.ALLOW_UNAUTHENTICATED_SSE?.split(',').map(h => h.trim()).filter(Boolean) || [];
```

**Usage in Code**:
```typescript
// Line 82: Check if host is in allowlist
const isAllowedHost = ALLOWED_UNAUTHENTICATED_HOSTS.includes(requestHost);

// Line 115: Bypass authentication for allowlisted hosts
if (!isLocalDevelopment && !isAllowedHost && !accessToken) {
  return new NextResponse('Unauthorized: Authentication required', { status: 401 });
}

// Line 127: Log warning when authentication bypassed
if (!accessToken && (isLocalDevelopment || isAllowedHost)) {
  console.warn('[SSE Proxy] Allowing unauthenticated access for:', requestHost);
}
```

### Security Risk Analysis

**Risk Scenario 1: Accidental Production Bypass**
```bash
# ❌ INCORRECT: Developer accidentally sets allowlist in production
export ALLOW_UNAUTHENTICATED_SSE="app.vana.com:443"

# Result: Production SSE streams accessible without authentication
curl -X POST https://app.vana.com/api/sse/run_sse \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test"}'
# Expected: 401 Unauthorized
# Actual: 200 OK (SECURITY BREACH)
```

**Risk Scenario 2: Leaked Environment Variable**
```bash
# ❌ INCORRECT: Allowlist set in production .env file
# production.env
ALLOW_UNAUTHENTICATED_SSE=staging.vana.com:3000,app.vana.com:443

# Impact: Any request from allowlisted hosts bypasses authentication
# Compliance violation: GDPR, SOC2, HIPAA
```

**Risk Scenario 3: Misconfigured Cloud Run Service**
```yaml
# ❌ INCORRECT: Cloud Run environment with allowlist
apiVersion: serving.knative.dev/v1
kind: Service
spec:
  template:
    spec:
      containers:
        - env:
            - name: ALLOW_UNAUTHENTICATED_SSE
              value: "app.vana.com:443"  # CRITICAL SECURITY ISSUE
```

---

## Critical Environment Variables

### ❌ MUST BE EMPTY OR UNSET IN PRODUCTION

#### `ALLOW_UNAUTHENTICATED_SSE`
- **Purpose**: Comma-separated list of hosts allowed to bypass authentication
- **Development Usage**: `localhost:3000,dev.example.com:3000`
- **Production Requirement**: **EMPTY STRING OR UNSET**
- **Validation**: Must be empty when `ENVIRONMENT=production`

```bash
# ✅ CORRECT (Production)
ALLOW_UNAUTHENTICATED_SSE=

# OR: Completely unset
# (no ALLOW_UNAUTHENTICATED_SSE variable)

# ❌ INCORRECT (Production)
ALLOW_UNAUTHENTICATED_SSE=app.vana.com:443
ALLOW_UNAUTHENTICATED_SSE=staging.vana.com:3000
```

#### `ALLOW_UNAUTHENTICATED_HOSTS`
- **Purpose**: Legacy alias for `ALLOW_UNAUTHENTICATED_SSE`
- **Production Requirement**: **MUST NOT EXIST**
- **Validation**: Variable should not be defined

---

### ✅ MUST BE SET IN PRODUCTION

#### `JWT_SECRET_KEY`
- **Purpose**: Secret key for JWT token signing/validation
- **Development**: Can use default/weak key
- **Production Requirement**: **STRONG RANDOM VALUE (NOT DEFAULT)**
- **Validation**: Minimum 32 characters, cryptographically random

```bash
# ❌ INCORRECT (Production)
JWT_SECRET_KEY=local-development-secret-key-not-for-production
JWT_SECRET_KEY=secret123

# ✅ CORRECT (Production)
JWT_SECRET_KEY=9f8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3e2d1c0b9a8f7e6d5c4b3a2e1d0c9b8a7f
# Generated with: openssl rand -hex 32
```

#### `ENVIRONMENT`
- **Purpose**: Determines security settings (secure cookies, CSRF enforcement)
- **Development**: `local`, `development`
- **Production Requirement**: **`production`**
- **Impact**: Enables secure cookies, strict CORS, enhanced logging

```bash
# ❌ INCORRECT (Production)
ENVIRONMENT=development
ENVIRONMENT=local

# ✅ CORRECT (Production)
ENVIRONMENT=production
```

#### `AUTH_REQUIRE_SSE_AUTH`
- **Purpose**: Explicit SSE authentication enforcement
- **Development**: Can be `false` for testing
- **Production Requirement**: **`true`**
- **Validation**: Must be string "true" (not just truthy)

```bash
# ❌ INCORRECT (Production)
AUTH_REQUIRE_SSE_AUTH=false
# (unset)

# ✅ CORRECT (Production)
AUTH_REQUIRE_SSE_AUTH=true
```

---

## Pre-Deployment Verification

### Step 1: Environment Variable Audit

**Script**: `scripts/pre-deployment-security-check.sh` (create)
```bash
#!/bin/bash
# Production Security Pre-Deployment Check
# Exit code 0 = PASS, Exit code 1 = FAIL

set -e

echo "========================================="
echo "Vana Production Security Verification"
echo "========================================="
echo ""

# Check ALLOW_UNAUTHENTICATED_SSE is empty/unset
if [ -n "$ALLOW_UNAUTHENTICATED_SSE" ]; then
  echo "❌ FAIL: ALLOW_UNAUTHENTICATED_SSE must be empty in production"
  echo "   Current value: $ALLOW_UNAUTHENTICATED_SSE"
  exit 1
else
  echo "✅ PASS: ALLOW_UNAUTHENTICATED_SSE is empty/unset"
fi

# Check ALLOW_UNAUTHENTICATED_HOSTS doesn't exist
if [ -n "$ALLOW_UNAUTHENTICATED_HOSTS" ]; then
  echo "❌ FAIL: ALLOW_UNAUTHENTICATED_HOSTS must not exist in production"
  echo "   Current value: $ALLOW_UNAUTHENTICATED_HOSTS"
  exit 1
else
  echo "✅ PASS: ALLOW_UNAUTHENTICATED_HOSTS not set"
fi

# Check JWT_SECRET_KEY is set and not default
if [ -z "$JWT_SECRET_KEY" ]; then
  echo "❌ FAIL: JWT_SECRET_KEY must be set in production"
  exit 1
elif [[ "$JWT_SECRET_KEY" == *"local-development"* ]] || [[ "$JWT_SECRET_KEY" == "secret123" ]]; then
  echo "❌ FAIL: JWT_SECRET_KEY appears to be a default/weak value"
  exit 1
elif [ ${#JWT_SECRET_KEY} -lt 32 ]; then
  echo "❌ FAIL: JWT_SECRET_KEY must be at least 32 characters (current: ${#JWT_SECRET_KEY})"
  exit 1
else
  echo "✅ PASS: JWT_SECRET_KEY is set and appears strong"
fi

# Check ENVIRONMENT is production
if [ "$ENVIRONMENT" != "production" ]; then
  echo "❌ FAIL: ENVIRONMENT must be 'production' (current: $ENVIRONMENT)"
  exit 1
else
  echo "✅ PASS: ENVIRONMENT is production"
fi

# Check AUTH_REQUIRE_SSE_AUTH is true
if [ "$AUTH_REQUIRE_SSE_AUTH" != "true" ]; then
  echo "❌ FAIL: AUTH_REQUIRE_SSE_AUTH must be 'true' (current: $AUTH_REQUIRE_SSE_AUTH)"
  exit 1
else
  echo "✅ PASS: AUTH_REQUIRE_SSE_AUTH is true"
fi

echo ""
echo "========================================="
echo "✅ ALL SECURITY CHECKS PASSED"
echo "========================================="
exit 0
```

**Usage**:
```bash
# Before production deployment
chmod +x scripts/pre-deployment-security-check.sh

# Load production environment
source production.env

# Run verification
./scripts/pre-deployment-security-check.sh

# Expected output:
# ✅ ALL SECURITY CHECKS PASSED
# Exit code: 0
```

---

### Step 2: Endpoint Authentication Testing

**Test 1: Unauthenticated Request (Should Fail)**
```bash
# ❌ Request without JWT token
curl -X POST https://app.vana.com/api/sse/run_sse \
  -H "Content-Type: application/json" \
  -d '{
    "appName": "vana",
    "userId": "test",
    "sessionId": "test123",
    "newMessage": {
      "parts": [{"text": "Hello"}],
      "role": "user"
    }
  }' \
  -v

# Expected response: 401 Unauthorized
# Response body: "Unauthorized: Authentication required"
# ✅ PASS if status code is 401
# ❌ FAIL if status code is 200 or 2xx
```

**Test 2: Authenticated Request (Should Succeed)**
```bash
# ✅ Request with valid JWT token
curl -X POST https://app.vana.com/api/sse/run_sse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VALID_JWT_TOKEN" \
  -H "Cookie: accessToken=$VALID_JWT_TOKEN" \
  -d '{
    "appName": "vana",
    "userId": "test",
    "sessionId": "test123",
    "newMessage": {
      "parts": [{"text": "Hello"}],
      "role": "user"
    }
  }' \
  -v

# Expected response: 200 OK (SSE stream starts)
# Content-Type: text/event-stream
# ✅ PASS if status code is 200 and SSE stream received
# ❌ FAIL if status code is 401 or 4xx
```

**Test 3: CSRF Validation (Should Require Token)**
```bash
# ❌ POST request without CSRF token
curl -X POST https://app.vana.com/api/sse/run_sse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VALID_JWT_TOKEN" \
  -d '{"sessionId":"test"}' \
  -v

# Expected response: 403 Forbidden
# Response body: "CSRF validation failed"
# ✅ PASS if CSRF validation is enforced
# ❌ FAIL if request succeeds without CSRF token (unless localhost)
```

**Test 4: Localhost Bypass (Development Only)**
```bash
# ✅ Localhost should bypass auth in development
curl -X POST http://localhost:3000/api/sse/run_sse \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test"}' \
  -v

# Expected (Development): 200 OK (auth bypassed)
# Expected (Production): 401 Unauthorized (localhost not exposed)
```

---

### Step 3: Cloud Run Environment Configuration Validation

**Google Cloud Run Environment Variables** (staging vs production)

**File**: `deployment/terraform/staging.env`
```bash
# Staging environment (authentication bypass allowed)
ENVIRONMENT=staging
ALLOW_UNAUTHENTICATED_SSE=staging.vana.com:3000
AUTH_REQUIRE_SSE_AUTH=false
JWT_SECRET_KEY=staging-secret-key-change-in-production
```

**File**: `deployment/terraform/production.env`
```bash
# Production environment (STRICT SECURITY)
ENVIRONMENT=production

# ✅ CRITICAL: Authentication bypass DISABLED
ALLOW_UNAUTHENTICATED_SSE=
# (or completely omit variable)

# ✅ CRITICAL: Authentication enforcement ENABLED
AUTH_REQUIRE_SSE_AUTH=true

# ✅ CRITICAL: Strong JWT secret from Secret Manager
JWT_SECRET_KEY=${JWT_SECRET_FROM_SECRET_MANAGER}

# Additional security settings
CORS_ALLOWED_ORIGINS=https://app.vana.com
CSRF_ENABLED=true
SECURE_COOKIES=true
LOG_LEVEL=INFO
```

**Cloud Run Deployment Validation**:
```bash
# Check production Cloud Run environment variables
gcloud run services describe vana \
  --region=us-central1 \
  --project=vana-production \
  --format="table(spec.template.spec.containers[0].env[].name, spec.template.spec.containers[0].env[].value)"

# Expected output:
# NAME                          VALUE
# ENVIRONMENT                   production
# AUTH_REQUIRE_SSE_AUTH         true
# ALLOW_UNAUTHENTICATED_SSE     (empty or not listed)
# JWT_SECRET_KEY                (should show as redacted/secret reference)

# ❌ FAIL if ALLOW_UNAUTHENTICATED_SSE has a value
# ❌ FAIL if AUTH_REQUIRE_SSE_AUTH is false or unset
# ❌ FAIL if JWT_SECRET_KEY shows plaintext weak value
```

---

## Security Review Checklist

### Phase 1: Pre-Deployment Configuration Review

**Environment Variables**:
- [ ] `ALLOW_UNAUTHENTICATED_SSE` is empty or unset in production
- [ ] `ALLOW_UNAUTHENTICATED_HOSTS` does NOT exist in production
- [ ] `JWT_SECRET_KEY` is set to strong random value (not default)
- [ ] `JWT_SECRET_KEY` stored in Secret Manager (not plaintext)
- [ ] `ENVIRONMENT=production` is set correctly
- [ ] `AUTH_REQUIRE_SSE_AUTH=true` is enforced

**Authentication Configuration**:
- [ ] JWT token expiry configured (recommended: 1 hour)
- [ ] Refresh token mechanism implemented
- [ ] Session timeout configured (recommended: 24 hours)
- [ ] Token revocation mechanism tested

**CORS Configuration**:
- [ ] CORS origins NOT set to `*` in production
- [ ] Only production domains in `CORS_ALLOWED_ORIGINS`
- [ ] CORS credentials enabled for authenticated requests

---

### Phase 2: Endpoint Security Testing

**SSE Endpoint (`/api/sse/run_sse`)**:
- [ ] Unauthenticated requests return 401 Unauthorized
- [ ] Authenticated requests with valid JWT succeed
- [ ] Expired JWT tokens return 401 Unauthorized
- [ ] Invalid JWT tokens return 401 Unauthorized
- [ ] CSRF validation enforced on POST requests
- [ ] CSRF token mismatch returns 403 Forbidden

**Legacy Endpoints** (if still active):
- [ ] `/api/sse/apps/{app}/users/{user}/sessions/{session}/run` requires authentication
- [ ] `/api/sse/agent_network_sse/{sessionId}` requires authentication (or deprecated)
- [ ] All SSE endpoints enforce same security model

---

### Phase 3: Logging and Monitoring

**Authentication Logging**:
- [ ] Failed authentication attempts logged
- [ ] Authentication bypass warnings logged (should NOT occur in production)
- [ ] JWT validation failures logged with details
- [ ] CSRF validation failures logged

**Security Monitoring**:
- [ ] Alerts configured for authentication bypass warnings
- [ ] Alerts configured for 401/403 spike (potential attack)
- [ ] Alerts configured for unauthenticated SSE access attempts
- [ ] Dashboard shows authentication success/failure rates

**Audit Trail**:
- [ ] All SSE requests logged with user ID and session ID
- [ ] Request origin (host, IP) logged for security analysis
- [ ] Token issuance and expiry logged
- [ ] Anomalous access patterns detected and alerted

---

### Phase 4: Infrastructure Security

**Network Security**:
- [ ] Cloud Run ingress set to `INGRESS_TRAFFIC_ALL` (or restricted if applicable)
- [ ] Load balancer SSL/TLS termination configured
- [ ] HTTP requests redirect to HTTPS
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)

**Secret Management**:
- [ ] `JWT_SECRET_KEY` stored in Google Secret Manager
- [ ] Secret rotation policy defined (recommended: 90 days)
- [ ] Service account has minimal permissions (principle of least privilege)
- [ ] Secrets NOT committed to Git

**Container Security**:
- [ ] Container image scanned for vulnerabilities
- [ ] No secrets baked into container image
- [ ] Runtime security policies enforced (Binary Authorization)
- [ ] Non-root user configured in container

---

### Phase 5: Compliance Validation

**GDPR Compliance**:
- [ ] User consent recorded before SSE data collection
- [ ] Data retention policies enforced
- [ ] User data deletion mechanism implemented
- [ ] Privacy policy updated with SSE data handling

**SOC2 Compliance**:
- [ ] Access controls documented and enforced
- [ ] Security incident response plan documented
- [ ] Change management process followed
- [ ] Audit logs retained per policy (recommended: 1 year)

**HIPAA Compliance** (if applicable):
- [ ] PHI data encrypted in transit (TLS 1.3)
- [ ] PHI data encrypted at rest
- [ ] Access audit logs enabled
- [ ] Business Associate Agreement (BAA) in place with cloud provider

---

## Automated Security Checks (CI/CD Integration)

### GitHub Actions Workflow

**File**: `.github/workflows/security-checks.yml`
```yaml
name: Production Security Checks

on:
  push:
    branches: [main, production]
  pull_request:
    branches: [main, production]

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Security Environment Check
        run: |
          # Fail if ALLOW_UNAUTHENTICATED_SSE found in production config
          if grep -r "ALLOW_UNAUTHENTICATED_SSE" deployment/terraform/production.env 2>/dev/null | grep -v "^#" | grep -v "=\$"; then
            echo "❌ FAIL: ALLOW_UNAUTHENTICATED_SSE found in production config"
            exit 1
          fi

          # Fail if weak JWT secrets found
          if grep -r "local-development-secret" deployment/terraform/production.env 2>/dev/null; then
            echo "❌ FAIL: Weak JWT secret found in production config"
            exit 1
          fi

          echo "✅ PASS: Production config security check passed"

      - name: Secret Scanning
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD

      - name: SAST Security Scan
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/secrets
            p/owasp-top-ten

      - name: Container Vulnerability Scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'vana-backend:latest'
          format: 'sarif'
          output: 'trivy-results.sarif'
```

---

## Monitoring and Alerting Setup

### Google Cloud Monitoring Alerts

**Alert 1: Authentication Bypass Warning**
```yaml
# Alert if authentication bypass log appears in production
displayName: Production Auth Bypass Warning
conditions:
  - displayName: Auth bypass detected
    conditionThreshold:
      filter: |
        resource.type="cloud_run_revision"
        resource.labels.service_name="vana"
        severity="WARNING"
        jsonPayload.message=~"Allowing unauthenticated access"
      comparison: COMPARISON_GT
      thresholdValue: 0
      duration: 60s
notificationChannels:
  - projects/PROJECT_ID/notificationChannels/CHANNEL_ID
alertStrategy:
  autoClose: 86400s  # 24 hours
```

**Alert 2: 401 Unauthorized Spike**
```yaml
# Alert if 401 errors exceed threshold (potential attack)
displayName: Unauthorized Access Spike
conditions:
  - displayName: 401 rate exceeded
    conditionThreshold:
      filter: |
        resource.type="cloud_run_revision"
        resource.labels.service_name="vana"
        httpRequest.status=401
      comparison: COMPARISON_GT
      thresholdValue: 100  # More than 100 failures per minute
      duration: 60s
      aggregations:
        - alignmentPeriod: 60s
          perSeriesAligner: ALIGN_RATE
```

**Alert 3: CSRF Validation Failure**
```yaml
# Alert if CSRF failures indicate attack
displayName: CSRF Attack Detected
conditions:
  - displayName: CSRF validation failures
    conditionThreshold:
      filter: |
        resource.type="cloud_run_revision"
        resource.labels.service_name="vana"
        httpRequest.status=403
        jsonPayload.message=~"CSRF validation failed"
      comparison: COMPARISON_GT
      thresholdValue: 50  # More than 50 failures per minute
      duration: 60s
```

---

## Troubleshooting Guide

### Issue 1: Production SSE Works Without Authentication

**Symptoms**:
- SSE requests succeed without JWT token
- Logs show "Allowing unauthenticated access" warnings

**Diagnosis**:
```bash
# Check Cloud Run environment
gcloud run services describe vana \
  --region=us-central1 \
  --project=vana-production \
  --format="value(spec.template.spec.containers[0].env[])"

# Look for ALLOW_UNAUTHENTICATED_SSE with a value
```

**Resolution**:
```bash
# Update Cloud Run service to remove allowlist
gcloud run services update vana \
  --update-env-vars ALLOW_UNAUTHENTICATED_SSE= \
  --region=us-central1 \
  --project=vana-production

# OR: Remove variable entirely
gcloud run services update vana \
  --remove-env-vars ALLOW_UNAUTHENTICATED_SSE \
  --region=us-central1 \
  --project=vana-production
```

---

### Issue 2: Authenticated Requests Still Fail (401)

**Symptoms**:
- Valid JWT tokens rejected
- All requests return 401 Unauthorized

**Diagnosis**:
```bash
# Check JWT_SECRET_KEY matches between auth service and SSE proxy
# Verify token is not expired
jwt_decode() {
  echo "$1" | cut -d. -f2 | base64 -d 2>/dev/null | jq
}

jwt_decode "$JWT_TOKEN"
# Check "exp" (expiry) field
```

**Resolution**:
```bash
# Verify JWT secret is correctly set
gcloud run services describe vana \
  --region=us-central1 \
  --format="value(spec.template.spec.containers[0].env[])" | \
  grep JWT_SECRET_KEY

# Update if incorrect
gcloud run services update vana \
  --update-secrets JWT_SECRET_KEY=JWT_SECRET:latest \
  --region=us-central1
```

---

### Issue 3: CSRF Validation Always Fails

**Symptoms**:
- All POST requests return 403 Forbidden
- "CSRF validation failed" in logs

**Diagnosis**:
```bash
# Check if CSRF token is being sent
curl -X POST https://app.vana.com/api/sse/run_sse \
  -H "X-CSRF-Token: TOKEN_HERE" \
  -v

# Check frontend sends CSRF token header
```

**Resolution**:
- Ensure frontend sends `X-CSRF-Token` header on POST requests
- Verify CSRF token is fetched from `/api/csrf-token`
- Check cookie settings (SameSite, Secure flags)

---

## Related Documentation

- **Infrastructure**: `/docs/infrastructure/docker-compose-networking-fix.md`
- **Deployment**: `/docs/deployment/terraform-image-management.md`
- **Authentication**: `/docs/AUTHENTICATION_STRATEGY.md`
- **Phase 3.3**: `/docs/plans/phase3_3_execution_plan.md`

---

## Action Items

**Immediate (Pre-Deployment)**:
- [ ] **Security Team**: Review and approve this checklist
- [ ] **DevOps Team**: Run pre-deployment verification script
- [ ] **Platform Team**: Test authentication enforcement in staging
- [ ] **QA Team**: Execute security testing procedure

**Short-Term (Week 1)**:
- [ ] **DevOps Team**: Implement automated security checks in CI/CD
- [ ] **SRE Team**: Configure monitoring alerts
- [ ] **Security Team**: Conduct penetration testing
- [ ] **Compliance Team**: Review GDPR/SOC2 requirements

**Long-Term (Month 1-2)**:
- [ ] **Security Team**: Schedule quarterly security audits
- [ ] **DevOps Team**: Implement secret rotation automation
- [ ] **Platform Team**: Add security scanning to container build
- [ ] **Leadership**: Review and sign off on security posture

---

**Document Version**: 1.0
**Last Updated**: 2025-10-19
**Next Review**: Before production deployment + quarterly thereafter
