# Health Check Endpoint - Deployment Guide

## Pre-Deployment Checklist

- [x] Function implemented at `supabase/functions/health/index.ts`
- [x] CORS headers configured via `_shared/cors-config.ts`
- [x] Database connectivity check implemented
- [x] OpenRouter API availability check implemented
- [x] Storage availability check implemented
- [x] Proper HTTP status codes (200/503)
- [x] Latency measurement included
- [x] Request ID tracking for observability
- [x] Comprehensive error handling
- [x] Documentation (README.md) created
- [x] Tests created (health.test.ts)

## Environment Variables Required

The health endpoint uses existing environment variables:

```bash
SUPABASE_URL=https://vznhbocnuykdmjvujaka.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
OPENROUTER_GEMINI_FLASH_KEY=<openrouter_key>
ALLOWED_ORIGINS=https://yourdomain.com
```

No additional environment variables needed.

## Deployment Steps

### Option 1: Deploy with Simple Script (Recommended)

**Staging:**
```bash
cd /Users/nick/Projects/llm-chat-site
./scripts/deploy-simple.sh staging
```

**Production:**
```bash
cd /Users/nick/Projects/llm-chat-site
./scripts/deploy-simple.sh prod
```

### Option 2: Deploy Individual Function

**Staging:**
```bash
supabase functions deploy health --project-ref <staging-ref>
```

**Production:**
```bash
supabase functions deploy health --project-ref vznhbocnuykdmjvujaka
```

## Post-Deployment Verification

### 1. Test Health Endpoint

**Staging:**
```bash
curl -v https://<staging-ref>.supabase.co/functions/v1/health
```

**Production:**
```bash
curl -v https://vznhbocnuykdmjvujaka.supabase.co/functions/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-24T...",
  "latency": 142,
  "services": {
    "database": "connected",
    "openrouter": "available",
    "storage": "available"
  },
  "version": "2025-11-24"
}
```

### 2. Verify HTTP Status Code

```bash
curl -I https://vznhbocnuykdmjvujaka.supabase.co/functions/v1/health

# Expected: HTTP/2 200 (if healthy)
# Expected: HTTP/2 503 (if degraded/unhealthy)
```

### 3. Check CORS Headers

```bash
curl -v -H "Origin: https://yourdomain.com" \
  https://vznhbocnuykdmjvujaka.supabase.co/functions/v1/health

# Expected headers:
# Access-Control-Allow-Origin: https://yourdomain.com
# Access-Control-Allow-Methods: POST, GET, OPTIONS
```

### 4. Test Individual Service Checks

The response includes individual service statuses:
```json
{
  "services": {
    "database": "connected" | "error" | "timeout",
    "openrouter": "available" | "error" | "timeout",
    "storage": "available" | "error" | "timeout"
  }
}
```

### 5. Verify Latency

Normal latency: 100-300ms
- Database check: 20-100ms
- OpenRouter check: 50-200ms
- Storage check: 30-100ms

If latency > 500ms, investigate individual service performance.

## Integration with Monitoring

### Uptime Robot Setup

1. Log in to Uptime Robot
2. Add New Monitor
3. Settings:
   - Monitor Type: HTTP(S)
   - Friendly Name: Vana Health Check
   - URL: `https://vznhbocnuykdmjvujaka.supabase.co/functions/v1/health`
   - Monitoring Interval: 5 minutes
   - Monitor Timeout: 10 seconds
4. Alert Contacts: Set up email/SMS alerts
5. Expected Keywords: `"status":"healthy"`
6. Save Monitor

### Datadog Setup

1. Create `datadog-health-check.yaml`:
```yaml
init_config:

instances:
  - name: vana-health-check
    url: https://vznhbocnuykdmjvujaka.supabase.co/functions/v1/health
    method: GET
    timeout: 10
    http_response_status_code: 200
    check_certificate_expiration: true
    days_warning: 30
    days_critical: 7
```

2. Deploy to Datadog Agent
3. Verify checks are running: `datadog-agent status`

### Custom Monitoring Script

Create `/scripts/health-check-monitor.sh`:
```bash
#!/bin/bash
HEALTH_URL="https://vznhbocnuykdmjvujaka.supabase.co/functions/v1/health"
ALERT_EMAIL="devops@example.com"

response=$(curl -s -w "\n%{http_code}" "$HEALTH_URL")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -ne 200 ]; then
  echo "❌ Health check failed with status $http_code"
  echo "$body" | jq '.'

  # Send alert email
  echo "$body" | mail -s "Vana Health Check Failed" "$ALERT_EMAIL"
  exit 1
fi

echo "✅ System healthy (latency: $(echo "$body" | jq -r '.latency')ms)"
```

Make executable:
```bash
chmod +x /scripts/health-check-monitor.sh
```

Add to crontab (check every 5 minutes):
```bash
crontab -e
# Add line:
*/5 * * * * /path/to/scripts/health-check-monitor.sh
```

## Troubleshooting

### Health Check Returns 503

**Symptoms:**
```json
{
  "status": "unhealthy",
  "services": {
    "database": "error",
    "openrouter": "available",
    "storage": "available"
  }
}
```

**Resolution:**
1. Check Supabase logs: `supabase functions logs health --project-ref vznhbocnuykdmjvujaka`
2. Verify database connectivity from Edge Function
3. Check RLS policies on `chat_sessions` table
4. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct

### High Latency (> 1 second)

**Symptoms:**
```json
{
  "latency": 1250,
  "services": { ... }
}
```

**Resolution:**
1. Check individual service latencies in logs
2. Database slow: Check PostgreSQL performance
3. OpenRouter slow: Check API status
4. Storage slow: Check Supabase status page

### CORS Errors in Browser

**Symptoms:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Resolution:**
1. Verify `ALLOWED_ORIGINS` environment variable includes your domain
2. Check origin is in allowed list: `supabase secrets list --project-ref vznhbocnuykdmjvujaka`
3. Update origins: `supabase secrets set ALLOWED_ORIGINS=https://yourdomain.com`
4. Redeploy: `supabase functions deploy health`

## Rollback Procedure

If health endpoint causes issues:

1. **List deployments:**
```bash
supabase functions list --project-ref vznhbocnuykdmjvujaka
```

2. **Get previous version ID:**
```bash
supabase functions get health --project-ref vznhbocnuykdmjvujaka
```

3. **Deploy previous version:**
```bash
# Not directly supported - redeploy from git history
git checkout <previous-commit>
supabase functions deploy health --project-ref vznhbocnuykdmjvujaka
git checkout main
```

4. **Emergency disable:**
```bash
# Remove function (stops all health checks)
supabase functions delete health --project-ref vznhbocnuykdmjvujaka
```

## Performance Monitoring

### Latency Benchmarks

Track these metrics over time:

- **P50 Latency**: Should be < 200ms
- **P95 Latency**: Should be < 500ms
- **P99 Latency**: Should be < 1000ms

### Error Rate

Track health check failures:

- **Target**: 99.9% success rate
- **Alert Threshold**: < 99% over 5-minute window

### Service Availability

Track individual service statuses:

- **Database**: 99.95% uptime target
- **OpenRouter**: 99% uptime target (external dependency)
- **Storage**: 99.95% uptime target

## Maintenance

### Version Updates

Update `APP_VERSION` in `index.ts` after significant changes:

```typescript
const APP_VERSION = '2025-11-24'; // Update this
```

### Adding New Service Checks

1. Create check function (follow existing patterns)
2. Add to parallel check array in `serve()` handler
3. Update `services` interface
4. Update `determineHealthStatus()` logic
5. Update README.md documentation
6. Deploy and verify

## Related Documentation

- [Health Check README](./README.md)
- [Supabase Functions Deployment](https://supabase.com/docs/guides/functions/deploy)
- [Edge Functions Monitoring](https://supabase.com/docs/guides/functions/metrics)
- [Issue #116](https://github.com/yourusername/repo/issues/116) - Original requirement
