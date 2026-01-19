# Vanilla Sandpack - Post-Merge Monitoring & Observability Plan

**Purpose**: Define metrics, alerts, and monitoring procedures for the 24-hour post-merge observation window

**Target Users**: On-call engineer, team lead, DevOps

---

## Quick Reference

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Artifact generation success rate | >95% | <92% | <85% |
| Error rate (Sentry) | <1% | >2% | >5% |
| Timeout rate (2s latency) | <1% | >1.5% | >2% |
| Generation latency (p50) | <1.5s | >2s | >3s |
| Generation latency (p99) | <3s | >4s | >5s |
| "Ask AI to Fix" invocation rate | <5% of generations | >10% | >15% |

---

## 1. Metrics Definitions

### 1.1 Artifact Generation Success Rate

**Definition**: Percentage of artifact generation requests that complete without error

**How to Calculate**:
```
Success Rate = (Successful Generations / Total Generations) * 100%
```

**Where to Find**:
- Sentry: Filter by `event.level = "error"` and `tags.artifact_system = "true"`
- Logs: `supabase functions logs --project-ref [project-id]`

**Target**: >95% (only 1 failure per 20 requests acceptable)

**Calculation Example**:
```
Total requests: 1000
Successful: 958
Failed: 42
Success rate: 95.8%  ✅ PASS (target: >95%)
```

### 1.2 Error Rate

**Definition**: Percentage of requests that generate exceptions or errors

**How to Calculate**:
```
Error Rate = (Requests with Errors / Total Requests) * 100%
```

**Categories of Errors**:
- Artifact generation timeout
- Package import failure
- Syntax error in generated code
- Sandpack compilation error
- API rate limit hit
- Gemini API failure

**Where to Find**:
- Sentry: All events with `event.level = "error"` or above
- Dashboard: Create issue-based alert

**Targets**:
- Warning: >2% (create warning in Slack)
- Critical: >5% (page on-call engineer immediately)

### 1.3 Timeout Rate

**Definition**: Percentage of generation requests that exceed 2 seconds

**How to Calculate**:
```
Timeout Rate = (Requests > 2s / Total Requests) * 100%
```

**Where to Find**:
- Edge Function logs: Look for `generation_latency_ms > 2000`
- Sentry: Performance monitoring / transactions

**Targets**:
- Warning: >1.5%
- Critical: >2%

**Expected Breakdown** (for 1000 requests):
```
<500ms:   250 requests (25%)
500-1000ms: 450 requests (45%)
1000-2000ms: 250 requests (25%)
>2000ms:   50 requests (5%)  ← Timeout rate: 5%
```

### 1.4 Generation Latency

**Definition**: Time from request to artifact delivery to client

**Metrics**:
- **p50 (median)**: 50% of requests complete in this time
- **p95**: 95% of requests complete in this time
- **p99**: 99% of requests complete in this time

**Where to Find**:
- Cloudflare Analytics: Page insights
- New Relic / APM: If configured
- Logs: Parse generation_latency_ms

**Targets**:
```
p50: <1.5s (most users won't notice)
p95: <3s    (acceptable 95% of time)
p99: <5s    (outliers, investigating needed)
```

### 1.5 "Ask AI to Fix" Invocation Rate

**Definition**: How often users click "Ask AI to Fix" button (indicates errors)

**How to Calculate**:
```
Invocation Rate = (Fix Requests / Total Artifacts) * 100%
```

**What It Indicates**:
- <5%: Normal (mostly user requests for improvements)
- 5-10%: Concerning (Gemini generating buggy code)
- >10%: Critical (systematic error in code generation)

**Where to Track**:
- Add analytics event in SimpleArtifactRenderer.tsx:
  ```typescript
  track('artifact_fix_requested', {
    artifact_type: type,
    error_message: error,
    timestamp: Date.now()
  });
  ```

---

## 2. Alert Configuration

### 2.1 Sentry Alert Rules

**Alert 1: High Error Rate**
```
Condition: artifact.error_rate > 5%
Severity: CRITICAL
Notify: Page on-call engineer immediately
Team: Deployments Slack channel

Message: "🚨 Artifact error rate exceeded 5% threshold"
```

**Alert 2: High Timeout Rate**
```
Condition: artifact.timeout_rate > 2%
Severity: WARNING
Notify: Slack #deployments channel
Action: Investigate latency causes

Message: "⚠️ Artifact timeout rate: {value}%"
```

**Alert 3: API Rate Limit Hit**
```
Condition: error.code = "RATE_LIMIT_EXCEEDED"
Severity: WARNING
Notify: Slack #deployments channel

Message: "⚠️ Gemini API rate limit hit - requests may fail"
Actions: Wait 30 min, or scale API quota
```

**Alert 4: Package Import Failures**
```
Condition: error.type = "IMPORT_ERROR" AND count > 10
Severity: WARNING
Notify: Slack #deployments channel

Message: "⚠️ Multiple package import failures detected"
Investigation: Check which packages failing
```

### 2.2 Dashboard Setup

Create Sentry dashboard with:

1. **Error Rate Trend** (24-hour graph)
   - Y-axis: Error rate %
   - X-axis: Time
   - Target line: 5% (critical), 2% (warning)

2. **Timeout Rate Trend** (24-hour graph)
   - Y-axis: Timeout rate %
   - Target line: 2% (critical), 1.5% (warning)

3. **Latency Distribution**
   - Histogram: p50, p95, p99
   - Target: <1.5s, <3s, <5s

4. **Error Type Breakdown**
   - Pie chart: Syntax errors, timeouts, API failures, etc.
   - Helps identify root causes

5. **Generation Success Rate**
   - Gauge or % metric
   - Target: >95%

---

## 3. Post-Merge Monitoring Schedule

### 3.1 First Hour (Critical Period)

**Time Window**: Immediately after merge until +1 hour

**Action Items**:

**Minute 0**: Deploy completes
```bash
# Verify deployment succeeded
gh workflow view deploy-edge-functions  # Check status
# Expected: "in progress" → "completed successfully"
```

**Minute 1-5**: Initial validation
```bash
# Test artifact generation manually
# 1. Open application in browser
# 2. Send message: "Create a simple counter in React"
# 3. Verify artifact renders without errors
# 4. Check browser console for errors
# 5. Test "Ask AI to Fix" if errors present
```

**Minute 5-15**: Sentry check
```bash
# Open Sentry dashboard
# 1. Check "Issues" tab for new errors
# 2. Expected: 0-2 errors in first 15 minutes (normal)
# 3. Look for error patterns
# 4. Check error rate on dashboard
```

**Minute 15-30**: Log review
```bash
# Check Edge Function logs
supabase functions logs --project-ref [project-id] --tail

# Expected patterns:
# - "Artifact generated successfully" (good)
# - "Generation completed in XXXms" (monitor latency)
# - No "error" messages

# Red flags:
# - "RATE_LIMIT_EXCEEDED"
# - "TIMEOUT"
# - "IMPORT_FAILED"
```

**Minute 30-60**: Monitoring setup
```bash
# 1. Ensure Sentry alerts are active
# 2. Set up dashboard autofresh (every 30 sec)
# 3. Join Slack #deployments channel
# 4. Brief team on monitoring window
# 5. Share on-call contact info
```

**Decision Point**: After 1 hour
- ✅ Error rate <1%: Continue monitoring
- ⚠️ Error rate 1-5%: Investigate root cause, keep watching
- 🚨 Error rate >5%: Execute rollback immediately

### 3.2 Hours 2-6 (Stability Period)

**Action Items** (every 30 minutes):

```bash
# Check Sentry dashboard
# 1. Error rate trend (should be stable)
# 2. No new critical issues
# 3. Latency p50 <1.5s

# Quick health check
# 1. Browser: Test artifact generation
# 2. Check error messages are helpful
# 3. Verify "Ask AI to Fix" works

# Check logs for anomalies
supabase functions logs --tail --follow
# (watch for patterns)
```

**Escalation**: If error rate increases:
- Set time-boxed investigation (15 minutes max)
- If root cause found and easy fix: Create hotfix PR
- If root cause unclear or complex: Execute rollback

### 3.3 Hours 6-24 (Final Assessment)

**Action Items** (every 4 hours):

```bash
# Daily monitoring
# 1. Morning check (6 hour mark)
# 2. Afternoon check (12 hour mark)
# 3. Evening check (24 hour mark)
```

**Metrics to Review**:
```
Hour 6 Checkpoint:
- Error rate (target: <1%)
- Timeout rate (target: <1%)
- Success rate (target: >95%)
- No user-reported issues

Hour 12 Checkpoint:
- Error trends (should be flat or decreasing)
- Artifact latency (stable?)
- "Ask AI to Fix" usage (normal?)

Hour 24 Final Assessment:
- Overall error rate: <2% ✅ PASS / ❌ FAIL
- Success rate: >95% ✅ PASS / ❌ FAIL
- No critical issues: ✅ PASS / ❌ FAIL
- Decision: KEEP or ROLLBACK?
```

---

## 4. Escalation & Rollback Procedures

### 4.1 When to Rollback

**Automatic Rollback Triggers**:

1. **Error Rate >5%**: Page on-call immediately
   ```
   Error count > 50 in last 10 minutes
   → Execute rollback within 5 minutes
   ```

2. **Complete Service Failure**:
   ```
   0% success rate for >5 minutes
   → Execute rollback immediately
   ```

3. **API Quota Exhausted**:
   ```
   Gemini API returning 429 (rate limit) for >15 minutes
   → Execute rollback (wait for quota reset if temporary)
   ```

**Discretionary Rollback Triggers**:

4. **Unfixable Bug Found** (>2%)
   ```
   Error rate 2-5% AND root cause unknown after 30 min investigation
   → Execute rollback to be safe
   ```

5. **Unacceptable Latency** (p99 >10s consistently)
   ```
   Generation latency degradation >2x baseline
   → Execute rollback and optimize
   ```

### 4.2 Rollback Execution

**Frontend Rollback** (Cloudflare Pages):

```bash
# Step 1: Open Cloudflare Dashboard
# https://dash.cloudflare.com

# Step 2: Navigate to Pages
# Pages → llm-chat-site (or your project name)

# Step 3: Go to Deployments tab
# Click "Deployments" in left sidebar

# Step 4: Find previous deployment
# Look for deployment BEFORE the refactor merge
# (Note the timestamp and commit hash)

# Step 5: Click "Rollback"
# Confirm: "Are you sure?"

# Step 6: Verify
# Wait 2-3 minutes for deployment
# Test site loads: https://your-domain.com
```

**Time**: <2 minutes

**Edge Functions Rollback**:

```bash
# Step 1: Create hotfix branch
git checkout main
git pull origin main
git checkout -b hotfix/revert-sandpack-refactor

# Step 2: Revert the merge commit
# Find the merge commit hash from the deployment
git log --oneline | head -10
# Find the commit: "Merge pull request #XXX: refactor: vanilla Sandpack"
git revert <merge-commit-hash> -m 1

# Step 3: Test locally
npm run test
npm run build
npm run test:integration  # If time permits

# Step 4: Create hotfix PR
gh pr create \
  --title "[HOTFIX] Revert vanilla Sandpack artifact refactor" \
  --body "Emergency rollback due to: [reason]" \
  --labels "hotfix,critical"

# Step 5: Get quick review
# Mark as urgent, @mention code owner
# Request fast-track approval

# Step 6: Merge
gh pr merge --auto  # Or merge manually via GitHub

# Step 7: Monitor deployment
# Watch Edge Functions deployment
# Verify functions rollback completes
```

**Time**: 5-10 minutes

**Total Rollback Time**: <15 minutes (both frontend + backend)

### 4.3 Post-Rollback Steps

After rollback executes:

1. **Verify Rollback Succeeded**:
   ```bash
   # Test site loads
   curl -I https://your-domain.com

   # Check Edge Functions are responsive
   # Send test artifact generation request

   # Confirm error rate dropped
   # Check Sentry: Error rate should drop immediately
   ```

2. **Root Cause Analysis**:
   ```bash
   # Sentry investigation
   # - Review error logs from failed deployment
   # - Identify which artifact type(s) failing
   # - Determine if code issue or config issue

   # Local reproduction
   # - Check out refactor branch
   # - Try to reproduce error locally
   # - Add debugging
   ```

3. **Communication**:
   ```bash
   # Notify team
   # - Slack: #deployments channel
   # - GitHub: Close original PR, add "rollback" label
   # - Create tracking issue: "Fix [issue] before retry"
   ```

4. **Fix & Retry** (if applicable):
   ```bash
   # After root cause fix:
   git checkout refactor/vanilla-sandpack-artifacts
   git pull origin refactor/vanilla-sandpack-artifacts

   # Make fix
   # Test locally
   # Push and update PR

   # Wait 24 hours before retry
   ```

---

## 5. Monitoring Tools Setup

### 5.1 Sentry Setup (Required)

**If not yet configured**:

```bash
# 1. Install Sentry SDK in frontend
npm install @sentry/react

# 2. Initialize in main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: "production",
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.Replay({ maskAllText: true }),
  ]
});

# 3. Set in Supabase secrets
supabase secrets set VITE_SENTRY_DSN --env-file supabase/functions/.env

# 4. Verify connection
# Generate test error and confirm appears in Sentry
```

### 5.2 Dashboard Setup

**Create Custom Dashboard**:

1. Sentry → Dashboards → New Dashboard
2. Add widgets:
   ```
   - Error Rate (24h trend)
   - Transaction Latency (p50, p95, p99)
   - Error Type Breakdown
   - Most Impactful Errors
   - Event Volume Over Time
   ```

3. Configure alerts (see section 2.1)

4. Share dashboard link with team

### 5.3 Slack Integration

**Set up Slack alerts**:

1. Sentry → Settings → Integrations → Slack
2. Connect workspace
3. Create alert rules that notify #deployments channel

**Example notifications**:
```
[ALERT] Error rate exceeded 5%
- Errors in last 10 min: 47
- Error rate: 5.2%
- Top issue: "Artifact generation timeout"
- Sentry link: [click to investigate]
```

### 5.4 Log Aggregation

**View Edge Function logs**:

```bash
# Real-time logs
supabase functions logs --project-ref [project-id] --tail

# Filter by function
supabase functions logs chat --project-ref [project-id] --tail

# Filter by error
supabase functions logs --project-ref [project-id] --tail | grep -i error
```

---

## 6. Quick Reference: Decision Tree

**First 1 hour after merge**:

```
┌─────────────────────────────────────────────┐
│ Artifact error rate in first hour?          │
├─────────────────────────────────────────────┤
│                                             │
│ <1% ──────────────────→ ✅ Continue         │
│  (Normal startup)       monitoring          │
│                                             │
│ 1-5% ─────────────────→ ⚠️  Investigate    │
│  (Watch closely)        root cause          │
│                                             │
│ >5% ──────────────────→ 🚨 ROLLBACK        │
│  (Critical)             IMMEDIATELY        │
│                                             │
└─────────────────────────────────────────────┘

IF INVESTIGATING (1-5% error):
  ├─ Root cause found & simple fix? → Create hotfix PR
  ├─ Root cause unclear? → Rollback to be safe
  └─ Error rate increasing? → Rollback immediately
```

**Hours 2-6**:

```
┌──────────────────────────────────────────┐
│ Error rate stable or decreasing?         │
├──────────────────────────────────────────┤
│                                          │
│ YES → Continue to hour 6 checkpoint      │
│                                          │
│ NO  → Investigate & consider rollback    │
│ (increasing trend)                       │
│                                          │
└──────────────────────────────────────────┘
```

**Hour 24 Final Decision**:

```
┌──────────────────────────────────────────┐
│ ALL metrics green for 24 hours?          │
├──────────────────────────────────────────┤
│                                          │
│ Error rate <2%       ✅                  │
│ Success rate >95%    ✅                  │
│ Latency p99 <5s      ✅                  │
│ No critical issues   ✅                  │
│                                          │
│ DECISION: ✅ KEEP REFACTOR               │
│           Artifact system stable!        │
│                                          │
└──────────────────────────────────────────┘

IF NOT ALL GREEN:
  ├─ Some issues but manageable? → KEEP (monitor longer)
  ├─ Systemic problems? → ROLLBACK (fix & retry)
  └─ Unclear? → KEEP (with extended monitoring)
```

---

## 7. Checklist for On-Call Engineer

**Before Going On-Call**:

- [ ] Understand rollback procedure
- [ ] Have Sentry dashboard link bookmarked
- [ ] Have Edge Functions logs command ready
- [ ] Know how to manually trigger hotfix PR
- [ ] Have team Slack channel open
- [ ] Know emergency contact for escalation

**During First Hour**:

- [ ] Minute 0: Verify deployment succeeded
- [ ] Minute 5: Manual artifact generation test
- [ ] Minute 15: Check Sentry for errors
- [ ] Minute 30: Review logs
- [ ] Minute 60: Report to team

**Hourly Checkpoints** (hours 2-24):

- [ ] Error rate trend normal?
- [ ] No new critical issues?
- [ ] Latency stable?
- [ ] No user complaints?

**Hour 24 Wrap-up**:

- [ ] Final metrics review
- [ ] Document findings
- [ ] Pass off to next engineer (if needed)
- [ ] Create any follow-up issues

---

## 8. Appendix: Metric Collection Queries

### 8.1 Sentry (if using)

**Error Rate Query**:
```
Environment: production
Release: [merge commit hash]
Timeframe: Last 24 hours

Events with level = "error" or "fatal"
/ Total events
= Error rate %
```

**Timeout Detection**:
```
If tracking generation_latency_ms:

Count events where generation_latency_ms > 2000
/ Total artifact generation requests
= Timeout rate %
```

### 8.2 Edge Function Logs

**Extract Latency**:
```bash
supabase functions logs --tail | grep "generation_latency"
# Look for: "generation_latency_ms: 1234"

# Calculate p50, p95, p99:
sort -t: -k2 -n | awk '{print $NF}'
# Output percentiles
```

**Count Success/Failure**:
```bash
supabase functions logs --tail | grep -c "SUCCESS"
supabase functions logs --tail | grep -c "ERROR"
# Calculate success rate
```

---

## 9. Sample Incident Response

### Scenario: Error Rate Spikes to 8% at Hour 1

**Timeline**:
- 10:00 AM: Merge completes, deploy starts
- 10:02 AM: Deployment succeeds, monitoring starts
- 10:08 AM: Manual test successful
- 10:15 AM: Sentry alert: Error rate 8% (threshold 5%)

**Response**:

```
10:15 AM: Alert received
├─ Action 1: Open Sentry dashboard
│  └─ Error type: Artifact generation timeout
│     Count: 67 errors in last 10 minutes
│     Error rate: 8.2%
│
├─ Action 2: Check logs
│  supabase functions logs --tail
│  └─ Pattern: "generation_latency_ms > 5000"
│     Consistent timeout across all requests
│
├─ Action 3: Check API quota
│  └─ Gemini API status: OK (not rate limited)
│     Responses slower than usual
│
├─ Action 4: Root cause hypothesis
│  └─ SimpleArtifactRenderer may be waiting for Sandpack
│     that's slower than expected
│     OR: New artifact code slower to compile
│
├─ Action 5: Decision point (15 min timeout)
│  └─ Can fix be deployed quickly? NO
│     → Execute rollback immediately
│
└─ Action 6: Execute rollback
   ├─ Cloudflare: Click rollback (2 min)
   ├─ Test site loads: ✅ Success
   ├─ Error rate drops: ✅ (to <1%)
   └─ Total time: 5 minutes
```

**Post-Incident**:
```
Investigation:
├─ Sandpack compilation for large artifacts slower than expected
├─ Error: "Component take too long to compile (>2s)"
├─ Root cause: artifactCode includes very large imports

Fix:
├─ Simplify system prompt to minimize imports
├─ Add generation latency tracking
├─ Test with large artifacts locally

Retry:
├─ Wait 24 hours
├─ Update refactor plan with findings
├─ Merge hotfix + retest
└─ Retry deployment next week
```

---

## 10. Success Metrics After 24 Hours

Refactor is **SUCCESSFUL** if:

```
✅ Error Rate
   Target: <1% average (accept <2% peak)
   Result: 0.8% ✅ PASS

✅ Success Rate
   Target: >95%
   Result: 97.2% ✅ PASS

✅ Generation Latency
   Target: p50 <1.5s, p99 <5s
   Result: p50 1.2s, p99 3.8s ✅ PASS

✅ Timeout Rate
   Target: <1%
   Result: 0.6% ✅ PASS

✅ Availability
   Target: 99.9%
   Result: 100% ✅ PASS

✅ No Critical Issues
   Target: Zero unplanned incidents
   Result: Zero ✅ PASS

✅ User Impact
   Target: No user-reported issues
   Result: No issues reported ✅ PASS
```

**Conclusion**: Refactor **APPROVED FOR PRODUCTION** ✅

