# Phase 3.3 Production Deployment Checklist

**Phase:** Canonical ADK Streaming
**Status:** ⏳ PENDING FINAL APPROVAL (signatures in progress)
**Peer Review Score:** 9.6/10 (Browser E2E Final Review)
**Date Created:** 2025-10-19
**Last Updated:** 2025-10-19

---

## Executive Summary

This checklist provides step-by-step procedures for deploying Phase 3.3 (Canonical ADK Streaming) to production. The implementation has been validated through comprehensive browser E2E testing with Chrome DevTools MCP and approved by peer review with a 9.6/10 score.

**Deployment Strategy:** Staged rollout with feature flags
**Rollback Time:** < 5 minutes (feature flag toggle)
**Zero Downtime:** ✅ Yes (backward compatible)

---

## Pre-Deployment Verification

### ✅ 1. Code Quality Gates (15/15 Passed)

**Backend Gates:**
- [x] Session creation endpoint returns 201 + sessionId
- [x] ADK session exists after creation
- [x] Session cleanup task scheduled
- [x] CSRF middleware allows legitimate requests
- [x] Backend validation before SSE streaming

**Frontend Gates:**
- [x] apiClient.createSession() works
- [x] Store creates session on mount
- [x] Chat component initializes session
- [x] Message handler uses existing sessionId

**Browser Gates:**
- [x] POST /apps/.../sessions called on mount
- [x] POST /api/sse/run_sse with sessionId in body
- [x] No "connect() aborting" errors
- [x] Messages stream successfully

**Code Quality Gates:**
- [x] TypeScript: Zero compilation errors
- [x] Peer Review: 9.6/10 (exceeds 8.5 minimum)

### ✅ 2. Documentation Review

**Required Documents:**
- [x] Phase 3.3 SPARC Final Handoff (`docs/plans/phase3_3_sparc_final_handoff.md`)
- [x] Architecture Diagrams (`docs/architecture/phase3_3_architecture_diagrams.md`)
- [x] Browser E2E Test Results (`docs/fixes/phase3_3_browser_e2e_production_readiness_report.md`)
- [x] Final Peer Review (`docs/reviews/phase3_3_browser_e2e_final_peer_review.md`)

### ✅ 3. Environment Configuration

**Backend `.env.production`:**
```bash
# Phase 3.3 Feature Flags
ENABLE_ADK_CANONICAL_STREAM=true  # Enable canonical mode

# Session Management
SESSION_CLEANUP_INTERVAL_MINUTES=30
SESSION_CLEANUP_TTL_MINUTES=30

# CSRF Configuration
CSRF_BYPASS_PATHS="/csrf-token,/health,/run_sse,/apps"

# ADK Configuration
ADK_BASE_URL=http://localhost:8080  # Update for production
```

**Frontend `.env.production`:**
```bash
# Phase 3.3 Feature Flags
NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=true  # Use POST SSE

# API Configuration
API_URL=https://api.vana.com  # Server-side proxy base URL
NEXT_PUBLIC_API_URL=https://api.vana.com  # Browser-facing URL (mirrors API_URL)
NEXT_PUBLIC_ADK_APP_NAME=vana
NEXT_PUBLIC_ADK_DEFAULT_USER=default

# Environment
ENVIRONMENT=production  # Enables secure cookies
```

---

## Deployment Procedure

### Stage 0: Pre-Deployment Preparation (1 hour)

#### 0.1 Backup Current State
```bash
# Database snapshot
gcloud sql backups create --instance=vana-production

# Configuration backup
kubectl get configmap vana-config -o yaml > backup-config.yaml

# Document current metrics
kubectl top pods -n vana > baseline-metrics.txt
```

#### 0.2 Verify Rollback Capability
```bash
# Test feature flag toggle
curl -X POST https://api.vana.com/admin/feature-flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"ENABLE_ADK_CANONICAL_STREAM": false}'

# Verify legacy mode still works
curl -X GET https://api.vana.com/apps/vana/users/test/sessions/test123/run
# Should return 200 OK (legacy endpoint)
```

#### 0.3 Staging Environment Validation
```bash
# Deploy to staging first
kubectl apply -f k8s/staging/phase3-3-config.yaml

# Run smoke tests
npm run test:e2e -- --env=staging

# Browser verification with Chrome DevTools MCP
# (See Browser Verification section below)
```

### Stage 1: Initial Deployment (30 minutes)

#### 1.1 Deploy Backend Changes
```bash
# Update backend configuration
kubectl apply -f k8s/production/backend-config.yaml

# Deploy new backend image
kubectl set image deployment/vana-backend \
  backend=gcr.io/vana-project/backend:phase3-3-v1.0.0

# Wait for rollout
kubectl rollout status deployment/vana-backend
```

#### 1.2 Deploy Frontend Changes
```bash
# Build production frontend
cd frontend
npm run build

# Deploy to Cloud Run / Vercel / etc.
gcloud run deploy vana-frontend \
  --image gcr.io/vana-project/frontend:phase3-3-v1.0.0 \
  --platform managed \
  --region us-central1

# Verify deployment
curl https://vana.com/health
```

#### 1.3 Verify Services Health
```bash
# Backend health check
curl https://api.vana.com/health
# Expected: {"status": "healthy", "features": {"canonical_stream": true}}

# Frontend health check
curl https://vana.com/api/health
# Expected: 200 OK

# ADK health check
curl http://localhost:8080/health
# Expected: 200 OK
```

### Stage 2: Feature Flag Rollout (Gradual - 2 weeks)

#### Week 1: 10% Traffic (Days 1-7)

**2.1 Enable for 10% of Users**
```bash
# Update feature flag service
curl -X POST https://api.vana.com/admin/feature-flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "ENABLE_ADK_CANONICAL_STREAM": true,
    "rollout_percentage": 10,
    "rollout_strategy": "user_hash"
  }'
```

**2.2 Monitor Metrics (First 24 Hours)**
```bash
# Session creation success rate
SELECT COUNT(*) as total,
       COUNT(CASE WHEN status='success' THEN 1 END) as successful
FROM session_creation_events
WHERE timestamp > NOW() - INTERVAL 24 HOUR;
# Target: >99% success rate

# SSE connection success rate
SELECT COUNT(*) as total,
       COUNT(CASE WHEN status_code=200 THEN 1 END) as successful
FROM sse_connection_events
WHERE timestamp > NOW() - INTERVAL 24 HOUR;
# Target: >99% success rate

# Error rate
SELECT error_type, COUNT(*) as count
FROM application_errors
WHERE timestamp > NOW() - INTERVAL 24 HOUR
GROUP BY error_type;
# Target: No increase in errors
```

**2.3 Browser Behavior Verification**
```bash
# Check for console errors
gcloud logging read "resource.type=cloud_run_revision \
  AND jsonPayload.message=~'console.error'" \
  --limit 100 \
  --format json

# Check for 400/403 errors
gcloud logging read "httpRequest.status>=400" \
  --limit 100 \
  --format json
```

#### Week 2: 50% Traffic (Days 8-14)

**2.4 Increase to 50%**
```bash
# Increase rollout percentage
curl -X POST https://api.vana.com/admin/feature-flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "ENABLE_ADK_CANONICAL_STREAM": true,
    "rollout_percentage": 50,
    "rollout_strategy": "user_hash"
  }'
```

**2.5 Monitor for 48 Hours**
- Session creation rate
- SSE connection stability
- Error rates
- User-reported issues
- Performance metrics (P50, P95, P99 latency)

#### Week 3: 100% Traffic (Days 15+)

**2.6 Full Rollout**
```bash
# Enable for all users
curl -X POST https://api.vana.com/admin/feature-flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "ENABLE_ADK_CANONICAL_STREAM": true,
    "rollout_percentage": 100
  }'
```

**2.7 Final Validation**
- All quality gates still passing
- No regressions in legacy mode
- Performance metrics stable
- Zero critical errors

### Stage 3: Cleanup & Documentation (1 week post-rollout)

#### 3.1 Remove Legacy Code Paths (Optional - Future)
```bash
# This is OPTIONAL and should only be done after:
# 1. 100% rollout stable for 1+ month
# 2. No rollback incidents
# 3. Business approval obtained

# DO NOT remove legacy endpoints immediately
# Keep for at least 3-6 months for gradual deprecation
```

#### 3.2 Update Documentation
```bash
# Update production runbooks
git add docs/runbooks/canonical-streaming-runbook.md

# Update monitoring dashboards
# Add new metrics for canonical mode

# Update troubleshooting guides
git add docs/troubleshooting/canonical-stream-issues.md
```

---

## Browser Verification Procedure (Chrome DevTools MCP)

### Critical: Always Verify in Live Browser

**Why Required:** Tests can pass while browser has console errors, network failures, or UI bugs.

### Verification Steps

#### 1. Navigate to Application
```javascript
mcp__chrome-devtools__new_page({
  url: "https://vana.com"
})
```

#### 2. Take Initial Snapshot
```javascript
mcp__chrome-devtools__take_snapshot()
// Verify UI renders correctly
```

#### 3. Test Session Creation Flow
```javascript
// Check network for session creation
mcp__chrome-devtools__list_network_requests({
  resourceTypes: ["xhr", "fetch"],
  pageSize: 50
})
// Expected: POST /apps/vana/users/.../sessions → 201 Created

// Check console for errors
mcp__chrome-devtools__list_console_messages()
// Expected: No errors, session creation logs present
```

#### 4. Test Message Send Flow
```javascript
// Fill message input
mcp__chrome-devtools__fill({
  uid: "message-input-id",  // Get from snapshot
  value: "Test message for canonical streaming"
})

// Click send button
mcp__chrome-devtools__click({
  uid: "send-button-id"  // Get from snapshot
})

// Wait for response
mcp__chrome-devtools__wait_for({
  text: "Test message",
  timeout: 5000
})
```

#### 5. Verify SSE Streaming
```javascript
// Check network for SSE request
mcp__chrome-devtools__list_network_requests({
  resourceTypes: ["fetch"],
  pageSize: 20
})
// Expected: POST /api/sse/run_sse → 200 OK

// Check for streaming events
mcp__chrome-devtools__list_console_messages()
// Expected: "[ADK Event] task_started", "[ADK Event] content", etc.
```

#### 6. Check for Errors
```javascript
// Console errors
mcp__chrome-devtools__list_console_messages()
// Expected: Zero errors

// Network errors
mcp__chrome-devtools__list_network_requests({
  resourceTypes: ["xhr", "fetch"]
})
// Expected: All status codes 200-299
```

#### 7. Performance Verification
```javascript
// Start performance trace
mcp__chrome-devtools__performance_start_trace({
  reload: true,
  autoStop: false
})

// Perform user actions...

// Stop and analyze
mcp__chrome-devtools__performance_stop_trace()
// Expected: No performance regressions
```

### Success Criteria
- ✅ Zero console errors
- ✅ POST /apps/.../sessions returns 201
- ✅ POST /api/sse/run_sse returns 200
- ✅ Messages stream successfully
- ✅ UI updates in real-time
- ✅ No "connect() aborting" errors
- ✅ No 400/403/404 errors

---

## Monitoring & Alerting

### Key Metrics to Monitor

#### Session Creation Metrics
```sql
-- Session creation success rate (target: >99%)
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as total_attempts,
  COUNT(CASE WHEN status='success' THEN 1 END) as successful,
  ROUND(COUNT(CASE WHEN status='success' THEN 1 END)::float / COUNT(*) * 100, 2) as success_rate
FROM session_creation_events
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Average session creation latency (target: <500ms)
SELECT
  AVG(duration_ms) as avg_latency,
  MAX(duration_ms) as max_latency,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_latency
FROM session_creation_events
WHERE timestamp > NOW() - INTERVAL '1 hour';
```

#### SSE Connection Metrics
```sql
-- SSE connection success rate (target: >99%)
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as total_connections,
  COUNT(CASE WHEN status_code=200 THEN 1 END) as successful,
  ROUND(COUNT(CASE WHEN status_code=200 THEN 1 END)::float / COUNT(*) * 100, 2) as success_rate
FROM sse_connection_events
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- SSE stream duration (target: <30s for typical queries)
SELECT
  AVG(stream_duration_seconds) as avg_duration,
  MAX(stream_duration_seconds) as max_duration,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY stream_duration_seconds) as p95_duration
FROM sse_connection_events
WHERE timestamp > NOW() - INTERVAL '1 hour'
  AND status='completed';
```

#### Error Metrics
```sql
-- Error rates by type (target: <0.1% overall error rate)
SELECT
  error_type,
  COUNT(*) as error_count,
  ROUND(COUNT(*)::float / (SELECT COUNT(*) FROM requests WHERE timestamp > NOW() - INTERVAL '1 hour') * 100, 4) as error_percentage
FROM application_errors
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY error_type
ORDER BY error_count DESC;

-- CSRF validation errors (target: 0)
SELECT COUNT(*) as csrf_errors
FROM application_errors
WHERE error_type = 'CSRF_VALIDATION_FAILED'
  AND timestamp > NOW() - INTERVAL '1 hour';
```

#### Session Cleanup Metrics
```sql
-- Empty sessions cleaned up (indicates pre-creation working)
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as sessions_cleaned,
  AVG(session_age_minutes) as avg_session_age
FROM session_cleanup_events
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Active sessions count (monitor for accumulation)
SELECT COUNT(*) as active_sessions
FROM sessions
WHERE status = 'active';
```

### Alert Configuration

#### Critical Alerts (Page On-Call)
```yaml
# Alert: High session creation failure rate
- alert: SessionCreationFailureHigh
  expr: |
    (sum(rate(session_creation_errors[5m])) / sum(rate(session_creation_total[5m]))) > 0.05
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Session creation failure rate >5%"
    description: "{{ $value | humanizePercentage }} of sessions failing to create"

# Alert: High SSE connection failure rate
- alert: SSEConnectionFailureHigh
  expr: |
    (sum(rate(sse_connection_errors[5m])) / sum(rate(sse_connection_total[5m]))) > 0.05
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "SSE connection failure rate >5%"
    description: "{{ $value | humanizePercentage }} of SSE connections failing"

# Alert: CSRF validation errors
- alert: CSRFValidationErrors
  expr: sum(rate(csrf_validation_errors[5m])) > 1
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "CSRF validation errors detected"
    description: "{{ $value }} CSRF errors per second"
```

#### Warning Alerts (Slack Notification)
```yaml
# Alert: Elevated session creation latency
- alert: SessionCreationLatencyHigh
  expr: histogram_quantile(0.95, session_creation_duration_seconds) > 1.0
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "P95 session creation latency >1s"
    description: "Session creation taking {{ $value }}s at P95"

# Alert: SSE stream duration elevated
- alert: SSEStreamDurationHigh
  expr: histogram_quantile(0.95, sse_stream_duration_seconds) > 45
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "P95 SSE stream duration >45s"
    description: "SSE streams taking {{ $value }}s at P95"

# Alert: Session accumulation
- alert: SessionAccumulationHigh
  expr: active_sessions_count > 10000
  for: 30m
  labels:
    severity: warning
  annotations:
    summary: "Active sessions count >10k"
    description: "{{ $value }} active sessions (possible cleanup issue)"
```

### Dashboard Configuration

#### Grafana Dashboard Panels

**Panel 1: Session Creation Rate**
```promql
# Query: Session creation success rate over time
sum(rate(session_creation_success[5m])) / sum(rate(session_creation_total[5m]))
```

**Panel 2: SSE Connection Rate**
```promql
# Query: SSE connection success rate over time
sum(rate(sse_connection_success[5m])) / sum(rate(sse_connection_total[5m]))
```

**Panel 3: Error Rate by Type**
```promql
# Query: Error rate by type
sum(rate(application_errors[5m])) by (error_type)
```

**Panel 4: Latency Distribution**
```promql
# Query: Session creation latency percentiles
histogram_quantile(0.50, session_creation_duration_seconds) # P50
histogram_quantile(0.95, session_creation_duration_seconds) # P95
histogram_quantile(0.99, session_creation_duration_seconds) # P99
```

---

## Rollback Procedure

### Immediate Rollback (< 5 minutes)

**Trigger Conditions:**
- Session creation success rate <95%
- SSE connection success rate <95%
- Error rate increase >500%
- P95 latency >5 seconds
- Critical security issue discovered

**Rollback Steps:**

#### 1. Disable Canonical Mode (Fastest)
```bash
# Backend: Disable feature flag
curl -X POST https://api.vana.com/admin/feature-flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"ENABLE_ADK_CANONICAL_STREAM": false}'

# Frontend: Disable feature flag
curl -X POST https://vana.com/api/admin/feature-flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM": false}'

# Verify rollback
curl https://api.vana.com/health
# Expected: {"features": {"canonical_stream": false}}
```

#### 2. Monitor Recovery
```bash
# Check error rates dropping
watch -n 5 'curl -s https://api.vana.com/metrics | grep error_rate'

# Check success rates recovering
watch -n 5 'curl -s https://api.vana.com/metrics | grep success_rate'
```

#### 3. Verify Legacy Mode Working
```bash
# Test legacy GET-based SSE
curl -X GET "https://api.vana.com/apps/vana/users/test/sessions/test123/run"
# Expected: 200 OK with SSE stream

# Browser verification
# Use Chrome DevTools MCP to verify legacy mode
```

### Full Rollback (If Feature Flag Rollback Insufficient)

#### 1. Revert Code Deployment
```bash
# Rollback backend to previous version
kubectl rollout undo deployment/vana-backend

# Rollback frontend to previous version
gcloud run deploy vana-frontend \
  --image gcr.io/vana-project/frontend:previous-stable \
  --platform managed \
  --region us-central1
```

#### 2. Restore Configuration
```bash
# Restore previous configuration
kubectl apply -f backup-config.yaml

# Restart services
kubectl rollout restart deployment/vana-backend
kubectl rollout restart deployment/vana-frontend
```

#### 3. Verify Full Recovery
```bash
# All health checks passing
curl https://api.vana.com/health
curl https://vana.com/health

# No errors in logs
kubectl logs -f deployment/vana-backend --tail=100

# Browser verification
# Use Chrome DevTools MCP to verify all functionality
```

---

## Post-Deployment Validation

### Day 1 Validation Checklist

**Hour 1-4: Immediate Monitoring**
- [ ] Session creation success rate >99%
- [ ] SSE connection success rate >99%
- [ ] Zero CSRF validation errors
- [ ] Zero "connect() aborting" errors
- [ ] P95 latency <1 second
- [ ] Error rate unchanged from baseline

**Hour 4-24: Extended Monitoring**
- [ ] Session cleanup running every 30 minutes
- [ ] Empty sessions being cleaned up (TTL working)
- [ ] No session accumulation issues
- [ ] Performance metrics stable
- [ ] User-reported issues = 0

**Browser Verification (Chrome DevTools MCP):**
- [ ] Console shows zero errors
- [ ] Network shows all 200 responses
- [ ] Messages stream successfully
- [ ] UI updates in real-time
- [ ] No visual regressions

### Week 1 Validation Checklist

**Metrics Review:**
- [ ] Daily session creation success rate >99%
- [ ] Daily SSE connection success rate >99%
- [ ] Zero critical errors in logs
- [ ] P95 latency trend stable or improving
- [ ] Session cleanup metrics healthy

**User Experience:**
- [ ] User-reported issues reviewed and addressed
- [ ] Customer support tickets reviewed
- [ ] No increase in chat-related complaints

**Infrastructure:**
- [ ] Resource utilization within normal limits
- [ ] Database performance stable
- [ ] ADK service health stable

### Month 1 Validation Checklist

**Production Readiness:**
- [ ] All metrics green for 30+ days
- [ ] Zero rollback incidents
- [ ] Performance benchmarks met or exceeded
- [ ] Documentation updated and accurate
- [ ] Runbooks tested and validated

**Optimization Opportunities:**
- [ ] Session cleanup optimization (if needed)
- [ ] Response normalization refactor (if desired)
- [ ] Backend route handler improvement (if desired)

---

## Troubleshooting Guide

### Issue 1: Session Creation Failing (400 Bad Request)

**Symptoms:**
- POST /apps/.../sessions returns 400
- Console error: "Session creation failed"

**Diagnosis:**
```bash
# Check backend logs
kubectl logs -f deployment/vana-backend | grep "session creation"

# Check ADK connectivity
curl http://localhost:8080/health
```

**Resolution:**
1. Verify ADK service is running and healthy
2. Check network connectivity between backend and ADK
3. Verify session creation endpoint configuration
4. Check for request body validation errors

### Issue 2: SSE Connection Failing (400 Bad Request)

**Symptoms:**
- POST /api/sse/run_sse returns 400
- Console error: "Empty request body"

**Diagnosis:**
```bash
# Check browser console (Chrome DevTools MCP)
mcp__chrome-devtools__list_console_messages()
# Look for: "POST method but no requestBodyRef.current"

# Check network request body
mcp__chrome-devtools__get_network_request({
  url: "/api/sse/run_sse"
})
```

**Resolution:**
1. Verify session pre-creation completed before SSE connect
2. Check updateRequestBody() was called with sessionId
3. Verify auto-connect is disabled for POST mode
4. Check hook dependency array for stale references

### Issue 3: CSRF Validation Errors (403 Forbidden)

**Symptoms:**
- POST /run_sse returns 403
- Backend logs: "CSRF validation failed"

**Diagnosis:**
```bash
# Check CSRF bypass configuration
kubectl exec -it deployment/vana-backend -- \
  cat /app/middleware/csrf_middleware.py | grep CSRF_EXEMPT_PATHS

# Check CSRF token in request headers
mcp__chrome-devtools__list_network_requests({
  resourceTypes: ["fetch"]
})
# Look for: X-CSRF-Token header
```

**Resolution:**
1. Verify `/run_sse` in CSRF_EXEMPT_PATHS
2. Verify CSRF token forwarding in Next.js proxy
3. Check CSRF token generation endpoint working
4. Verify client sends token in header

### Issue 4: Empty Sessions Accumulating

**Symptoms:**
- Database shows thousands of empty sessions
- Session count growing rapidly

**Diagnosis:**
```sql
-- Check empty session count
SELECT COUNT(*) as empty_sessions
FROM sessions
WHERE message_count = 0
  AND created_at < NOW() - INTERVAL '30 minutes';

-- Check cleanup task status
SELECT * FROM scheduled_tasks
WHERE task_name = 'session_cleanup'
ORDER BY last_run DESC
LIMIT 10;
```

**Resolution:**
1. Verify session cleanup background task is running
2. Check TTL configuration (default 30 minutes)
3. Verify cleanup task has database permissions
4. Manually trigger cleanup if needed:
```bash
curl -X POST https://api.vana.com/admin/cleanup/sessions \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Issue 5: Messages Not Streaming

**Symptoms:**
- SSE connection established (200 OK)
- No messages appearing in UI
- Browser console shows no ADK events

**Diagnosis:**
```bash
# Check ADK event parsing
mcp__chrome-devtools__list_console_messages()
# Look for: "[ADK Event] ..." logs

# Check SSE stream content
mcp__chrome-devtools__evaluate_script({
  function: `() => {
    return window.__DEBUG_SSE_EVENTS__ || [];
  }`
})
```

**Resolution:**
1. Verify `ENABLE_ADK_CANONICAL_STREAM=true` on frontend
2. Check ADK event format matches expected structure
3. Verify event parsing logic handles all ADK event types
4. Check for JavaScript errors in event handlers

---

## Success Metrics

### Immediate Success (Day 1)
- ✅ Session creation success rate >99%
- ✅ SSE connection success rate >99%
- ✅ Zero critical errors
- ✅ P95 latency <1 second
- ✅ Zero rollback incidents

### Short-Term Success (Week 1)
- ✅ User-reported issues = 0
- ✅ All monitoring metrics green
- ✅ Performance stable or improved
- ✅ Session cleanup working correctly

### Long-Term Success (Month 1)
- ✅ 100% traffic on canonical mode
- ✅ Zero rollback incidents
- ✅ Documentation complete and accurate
- ✅ Team confident in new system
- ✅ Ready to deprecate legacy endpoints

---

## Communication Plan

### Pre-Deployment
**Audience:** Engineering team, operations, QA, customer support
**Timeline:** 1 week before deployment
**Content:**
- Phase 3.3 overview and benefits
- Deployment timeline and strategy
- Monitoring dashboards and alerts
- Rollback procedures
- On-call expectations

### During Deployment
**Audience:** All stakeholders
**Timeline:** Real-time during staged rollout
**Content:**
- Deployment progress updates (10% → 50% → 100%)
- Metrics snapshots (success rates, error rates, latency)
- Any issues encountered and resolutions
- ETA for next stage

### Post-Deployment
**Audience:** All stakeholders
**Timeline:** Day 1, Week 1, Month 1
**Content:**
- Success metrics summary
- User feedback summary
- Lessons learned
- Future optimization opportunities

---

## Appendix

### A. Feature Flag Configuration

**Backend Feature Flags:**
```python
# app/config.py
ENABLE_ADK_CANONICAL_STREAM = os.getenv("ENABLE_ADK_CANONICAL_STREAM", "false").lower() == "true"
SESSION_CLEANUP_INTERVAL_MINUTES = int(os.getenv("SESSION_CLEANUP_INTERVAL_MINUTES", "30"))
SESSION_CLEANUP_TTL_MINUTES = int(os.getenv("SESSION_CLEANUP_TTL_MINUTES", "30"))
```

**Frontend Feature Flags:**
```typescript
// frontend/src/lib/config.ts
export const ENABLE_ADK_CANONICAL_STREAM =
  process.env.NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM === 'true';
```

### B. Environment Variables Reference

**Backend Required:**
- `ENABLE_ADK_CANONICAL_STREAM` - Enable canonical streaming (default: false)
- `ADK_BASE_URL` - ADK service URL (default: http://localhost:8080)
- `SESSION_CLEANUP_INTERVAL_MINUTES` - Cleanup task interval (default: 30)
- `SESSION_CLEANUP_TTL_MINUTES` - Empty session TTL (default: 30)

**Frontend / Proxy Required:**
- `API_URL` - Server-side Next.js proxy base URL (required)
- `NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM` - Use POST SSE (default: false)
- `NEXT_PUBLIC_API_URL` - Browser-facing API URL (should match `API_URL`)
- `ENVIRONMENT` - Environment name (production/staging/development)

### C. Related Documentation

**Implementation Documents:**
- [Phase 3.3 SPARC Final Handoff](../plans/phase3_3_sparc_final_handoff.md)
- [Architecture Diagrams](../architecture/phase3_3_architecture_diagrams.md)
- [Browser E2E Test Results](../fixes/phase3_3_browser_e2e_production_readiness_report.md)
- [Final Peer Review](../reviews/phase3_3_browser_e2e_final_peer_review.md)

**Operational Documents:**
- [Phase 3.3 Production Issues Handoff](../handoff/phase3_3_production_issues_handoff.md)
- [Phase 3.3 Final Handoff Packet](../handoff/PHASE_3_3_FINAL_HANDOFF.md)
- [Session Cleanup Verification Script](../plans/VERIFY_PHASE_3_3_SESSION_CLEANUP.sh)

Outstanding runbooks are tracked in [PHASE_3_3_FOLLOW_UP_TASKS](PHASE_3_3_FOLLOW_UP_TASKS.md) and must be published before the production window opens.

### D. Contact Information

**On-Call Escalation:**
- Primary: Priya Desai (Engineering On-Call Lead) — Slack #eng-oncall, priyadesai@vana.com, PagerDuty `vana-eng-oncall`
- Secondary: Caleb Morgan (DevOps Manager) — Slack @caleb.morgan, caleb.morgan@vana.com, +1-555-0184
- Escalation: Lena Ortega (VP Engineering) — lena.ortega@vana.com, +1-555-0199

**Deployment Lead:**
- Name: Nick Bennett
- Role: Senior Software Engineer
- Contact: nick.bennett@vana.com | Slack @nickb | +1-555-0142
- Responsibilities: Deployment execution, production monitoring, rollback decisions

---

## Approval Signatures

**Implementation Complete:** ✅ YES (2025-10-19)
**Peer Review Score:** 9.6/10 (APPROVED FOR PRODUCTION)
**Browser E2E Testing:** ✅ PASSED (All quality gates)
**Documentation Complete:** ✅ YES (18 comprehensive documents)

**Approved By (signatures pending):**
- [ ] Engineering Lead: Priya Desai — Date: __________
- [ ] DevOps Lead: Caleb Morgan — Date: __________
- [ ] QA Lead: Jordan Fields — Date: __________
- [ ] Product Manager: Amara Singh — Date: __________

---

**Document Version:** 1.0
**Last Updated:** 2025-10-19
**Next Review:** Post-deployment retrospective (1 week after 100% rollout)

---

**Generated for Phase 3.3 Canonical ADK Streaming**
**Production Deployment Ready**
**Zero Breaking Changes - Backward Compatible**
