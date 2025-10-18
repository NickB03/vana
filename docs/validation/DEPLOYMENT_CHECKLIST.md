# Phase 3 Deployment Checklist

**Phase:** ADK Canonical Streaming Implementation
**Status:** APPROVED for gradual rollout
**Risk Level:** LOW
**Rollback Time:** <5 minutes

---

## Pre-Deployment Checklist

### ☐ Environment Validation

```bash
# 1. Verify all services are running
pm2 list
# Expected: vana-backend (8000), vana-adk (8080), vana-frontend (3000) - all online

# 2. Check backend health
curl http://localhost:8000/health | jq '.status, .environment, .dependencies'
# Expected: status="healthy", dependencies all true

# 3. Verify feature flag configuration
cat .env.local | grep ENABLE_ADK_CANONICAL_STREAM
cat frontend/.env.local | grep NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM
# Expected: Both should be present (set to true or false)

# 4. Test chat functionality
# Navigate to http://localhost:3000
# Send test message: "test"
# Verify response appears in <10 seconds

# 5. Check SSE connection
# Browser DevTools → Network tab
# Filter: eventsource
# Expected: One connection, status 200, events flowing
```

### ☐ Baseline Metrics Collection

Before enabling canonical streaming, collect baseline metrics:

```bash
# 1. SSE connection success rate (last 24h)
# Log query: SELECT COUNT(*) WHERE sse_status=200 / total_sse_attempts
# Target baseline: >99%

# 2. Average response latency (last 24h)
# Log query: SELECT PERCENTILE(response_time_ms, 95)
# Target baseline: <500ms

# 3. Error rate (last 24h)
# Log query: SELECT COUNT(*) WHERE status>=500 / total_requests
# Target baseline: <1%

# 4. Chat completion rate (last 24h)
# Log query: SELECT COUNT(research_complete) / COUNT(user_messages)
# Target baseline: >98%
```

**Store baselines in:** `/tmp/phase3_baseline_metrics.json`

---

## Deployment: Week 0 (Staging)

### ☐ Day 1: Staging Deployment

```bash
# 1. Deploy to staging with flags DISABLED
export ENABLE_ADK_CANONICAL_STREAM=false
export NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=false

# 2. Restart services
pm2 restart all

# 3. Verify legacy mode
curl http://staging.vana.com/health | jq '.environment.migration_complete'
# Expected: false

# 4. Run smoke tests
npm run test:e2e -- --env=staging

# 5. Manual testing
# - Send 10 different test messages
# - Verify all receive responses
# - Check browser console for errors
# - Verify network tab shows SSE 200 OK
```

### ☐ Day 2-3: Staging Validation

```bash
# 1. Monitor staging metrics (48 hours)
# - SSE connection success: Should be >99%
# - Response latency p95: Should be <500ms
# - Error rate: Should be <1%
# - Zero chat failures

# 2. Load testing (optional)
# artillery run tests/load/sse_streaming.yml

# 3. Security scan
# npm run security:scan
```

### ☐ Sign-off for Production

- [ ] Staging metrics green for 48 hours
- [ ] Zero critical bugs found
- [ ] Smoke tests passing
- [ ] Team reviewed validation report
- [ ] Rollback procedure tested in staging

**If all checked, proceed to production rollout.**

---

## Deployment: Week 1 (Production Rollout)

### ☐ Day 1: 5% Traffic

```bash
# 1. Enable flags on 5% of backend instances
# In load balancer or feature flag service:
# set_feature_flag("adk_canonical_stream", 0.05)

# Backend instances (5%):
export ENABLE_ADK_CANONICAL_STREAM=true

# Frontend build (all instances):
export NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=true
npm run build && pm2 restart vana-frontend

# 2. Verify flag propagation
curl http://localhost:8000/health | jq '.environment.phase'
# Expected: "in_progress" or shows canonical enabled

# 3. Monitor for 1 hour (immediate issues)
# Watch dashboards:
# - SSE connection success rate
# - Error rate
# - Response latency
```

**Alerts to monitor:**
- SSE connection failures spike >5%
- Response timeout rate >10%
- Backend 5xx errors >1%

**If any alert fires: Execute rollback immediately**

### ☐ Day 2: Monitor 24h (5% traffic)

```bash
# 1. Compare metrics: 5% canonical vs 95% legacy
# - SSE success rate: Should be equal (>99%)
# - Response latency: Should be equal (<500ms p95)
# - Error rate: Should be equal (<1%)

# 2. Check logs for new error patterns
grep "canonical" /var/log/vana/*.log | grep ERROR

# 3. User feedback review
# Check support tickets for SSE-related issues
# Expected: Zero new reports

# 4. Decision checkpoint
# GREEN (continue to 25%): Metrics equal to baseline
# YELLOW (investigate): Metrics 5-10% worse than baseline
# RED (rollback): Metrics >10% worse OR critical errors
```

### ☐ Day 3: 25% Traffic (if green)

```bash
# 1. Scale to 25% of instances
# set_feature_flag("adk_canonical_stream", 0.25)

# 2. Monitor for 4 hours

# 3. Compare metrics: 25% canonical vs 75% legacy
# Same targets as Day 2
```

### ☐ Day 5: 50% Traffic (if green)

```bash
# 1. Scale to 50% of instances
# set_feature_flag("adk_canonical_stream", 0.50)

# 2. Monitor for 24 hours

# 3. Peak load testing
# Run during business hours to test under real load
```

### ☐ Day 7: 100% Traffic (if green)

```bash
# 1. Enable on all instances
# set_feature_flag("adk_canonical_stream", 1.0)

export ENABLE_ADK_CANONICAL_STREAM=true
pm2 restart vana-backend

# 2. Monitor for 48 hours

# 3. Final validation
# - All metrics at baseline or better
# - Zero critical errors
# - No user-reported issues
```

---

## Rollback Procedure

### Trigger Conditions (Execute immediately if ANY occur)

- [ ] SSE connection success rate < 95%
- [ ] User-reported chat failures > 10/hour
- [ ] Backend 5xx error rate > 5%
- [ ] Response latency p95 > 5000ms

### Rollback Steps (5 minutes)

```bash
# Step 1: Disable backend flag (30 seconds)
export ENABLE_ADK_CANONICAL_STREAM=false
# Or: set_feature_flag("adk_canonical_stream", 0.0)

# Step 2: Disable frontend flag (30 seconds)
export NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=false

# Step 3: Rebuild frontend (90 seconds)
npm --prefix frontend run build

# Step 4: Restart all services (2 minutes)
pm2 restart all

# Step 5: Verify rollback (30 seconds)
curl http://localhost:8000/health | jq '.environment.migration_complete'
# Expected: false

# Step 6: Check metrics recovery (90 seconds)
# Watch dashboard:
# - SSE success rate should return to >99%
# - Error rate should drop to <1%
# - Response latency should return to <500ms
```

### Post-Rollback Actions

- [ ] Notify team in Slack/incident channel
- [ ] Create incident report with metrics
- [ ] Schedule post-mortem meeting
- [ ] Analyze logs for root cause
- [ ] Update Phase 3 implementation if needed
- [ ] Re-validate in staging before retry

**Communication Template:**
```
INCIDENT: Phase 3 canonical streaming rollback

Time: {timestamp}
Trigger: {condition that fired}
Action: Feature flags disabled, system returned to legacy mode
Impact: None - legacy mode operational
Status: Services healthy, metrics returning to baseline

Next steps:
- Post-mortem: {date/time}
- Root cause analysis in progress
- Retry timeline: TBD after fixes
```

---

## Post-Deployment (Week 2+)

### ☐ Migration Complete Validation

```bash
# 1. Verify 100% traffic on canonical streaming
curl http://localhost:8000/health | jq '.environment.migration_complete'
# Expected: true (once legacy code removed)

# 2. Final metrics report (7 days at 100%)
# - SSE success rate: Should be ≥99%
# - Response latency p95: Should be ≤500ms
# - Error rate: Should be ≤1%
# - Chat completion rate: Should be ≥98%
```

### ☐ Code Cleanup

```bash
# 1. Remove legacy event parsing code
# git rm frontend/src/hooks/legacy_event_parser.ts

# 2. Deprecate old endpoints
# Add deprecation warnings to /agent_network_sse/{sessionId}

# 3. Update documentation
# docs/api/streaming.md - document final architecture

# 4. Remove feature flags
# Delete ENABLE_ADK_CANONICAL_STREAM from codebase
# Make canonical streaming the default
```

### ☐ Final Documentation

- [ ] Update API documentation with canonical streaming
- [ ] Create architecture diagram (SSE flow)
- [ ] Document monitoring dashboards
- [ ] Create runbook for SSE debugging
- [ ] Update deployment guide

---

## Dashboard URLs

**Production Monitoring:**
- Main dashboard: `https://monitoring.vana.com/phase3`
- SSE metrics: `https://monitoring.vana.com/sse`
- Error logs: `https://logging.vana.com/errors`
- User feedback: `https://support.vana.com/tickets`

**Key Metrics:**
- SSE Connection Success Rate (real-time)
- Response Latency Percentiles (p50, p95, p99)
- Error Rate by Endpoint
- Chat Completion Rate
- Feature Flag Adoption (% traffic on canonical)

---

## Success Criteria

### Week 1 (Gradual Rollout)
- [ ] No rollbacks required
- [ ] SSE success rate ≥99% at all traffic levels
- [ ] Zero critical errors
- [ ] No user-reported issues

### Week 2 (100% Traffic)
- [ ] All metrics at baseline or better
- [ ] 7 days stable at 100% traffic
- [ ] Team confidence: HIGH
- [ ] Ready for code cleanup

### Week 3+ (Migration Complete)
- [ ] Legacy code removed
- [ ] Documentation updated
- [ ] Monitoring established
- [ ] Phase 3 marked COMPLETE

---

## Contacts

**Escalation:**
- On-call engineer: `@oncall-vana`
- Team lead: `@vana-lead`
- DevOps: `@devops-team`

**Incident channel:** `#vana-incidents`
**Deployment updates:** `#vana-deployments`

---

**Checklist Owner:** DevOps Team
**Last Updated:** 2025-10-18
**Review Date:** Before each deployment phase
