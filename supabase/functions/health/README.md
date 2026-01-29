# Health Check Endpoint

## Overview

Provides system-wide health status monitoring for the Edge Functions infrastructure. This endpoint checks connectivity to critical dependencies and returns appropriate status codes for monitoring tools.

## Endpoint Details

- **URL**: `/functions/v1/health`
- **Method**: `GET`
- **Authentication**: None (public endpoint)
- **CORS**: Enabled

## Response Format

```json
{
  "status": "healthy",
  "timestamp": "2025-11-24T03:00:00.000Z",
  "latency": 142,
  "services": {
    "database": "connected",
    "openrouter": "available",
    "storage": "available"
  },
  "version": "2025-11-24"
}
```

## Status Values

### Overall Status
- `healthy` - All services operational
- `degraded` - Non-critical services experiencing issues
- `unhealthy` - Critical services (database) down

### Service Status
- `connected` - Database is accessible
- `available` - API/Storage is accessible
- `error` - Service check failed
- `timeout` - Service check timed out (5 seconds)

## HTTP Status Codes

- **200 OK**: All services healthy
- **503 Service Unavailable**: One or more services degraded/unhealthy

## Health Checks

### 1. Database Connectivity
- Verifies PostgreSQL connection via Supabase client
- Executes lightweight query: `SELECT id FROM chat_sessions LIMIT 1`
- Timeout: 5 seconds
- **Critical**: System cannot function without database

### 2. OpenRouter API Availability
- Verifies API connectivity via HEAD request to `/models` endpoint
- Uses Gemini Flash API key for authentication
- Timeout: 5 seconds
- **Non-critical**: Degrades but doesn't break core functionality

### 3. Supabase Storage Availability
- Verifies storage bucket accessibility
- Checks `generated-images` bucket listing
- Timeout: 5 seconds
- **Non-critical**: Affects image generation only

## Usage Examples

### Basic Health Check
```bash
curl https://your-project.supabase.co/functions/v1/health
```

### With Status Code Check
```bash
curl -f https://your-project.supabase.co/functions/v1/health || echo "Health check failed"
```

### Monitoring Script
```bash
#!/bin/bash
HEALTH_URL="https://your-project.supabase.co/functions/v1/health"

response=$(curl -s -w "\n%{http_code}" "$HEALTH_URL")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
  echo "✅ System healthy"
  echo "$body" | jq '.latency'
else
  echo "❌ System degraded/unhealthy"
  echo "$body" | jq '.services'
  exit 1
fi
```

## Integration with Monitoring Tools

### Uptime Robot
- Monitor URL: `https://your-project.supabase.co/functions/v1/health`
- Monitor Type: HTTP(S)
- Expected Status: 200
- Alert when status code ≠ 200

### Datadog
```yaml
init_config:

instances:
  - name: vana-health-check
    url: https://your-project.supabase.co/functions/v1/health
    method: GET
    timeout: 10
    http_response_status_code: 200
```

### Prometheus
```yaml
- job_name: 'vana-health'
  metrics_path: /functions/v1/health
  scheme: https
  static_configs:
    - targets: ['<project-ref>.supabase.co']
```

## Performance Characteristics

- **Latency**: 100-300ms typical (parallel checks)
- **Timeout**: 5 seconds per service check
- **Max Response Time**: ~15 seconds (all checks timeout)
- **No Database Writes**: Read-only operations
- **Lightweight**: Minimal resource consumption

## Deployment

**⚠️ CRITICAL**: All production deployments go through PR process.

### Production Deployment

```bash
# Create feature branch
git checkout -b feat/update-health-function

# Test locally
supabase functions serve health
curl http://localhost:54321/functions/v1/health

# Run full test suite
npm run test
npm run test:integration
npm run build

# Create PR
gh pr create --title "Update health function" --body "Description"

# After CI passes and review → Merge → Auto-deploy
```

See `/docs/CI_CD.md` for full deployment workflow.

## Security Considerations

- **No Authentication Required**: Public endpoint for monitoring
- **No Sensitive Data**: Does not expose API keys or credentials
- **CORS Enabled**: Accessible from monitoring dashboards
- **Rate Limiting**: Consider implementing if abused (not currently applied)

## Troubleshooting

### Database Check Fails
- Verify `SUPABASE_URL` environment variable
- Verify `SUPABASE_SERVICE_ROLE_KEY` environment variable
- Check RLS policies on `chat_sessions` table
- Verify PostgreSQL connection limits

### OpenRouter Check Fails
- Verify `OPENROUTER_GEMINI_FLASH_KEY` environment variable
- Check API key validity at https://openrouter.ai/keys
- Verify API quota has not been exceeded
- Check OpenRouter status page

### Storage Check Fails
- Verify `generated-images` bucket exists
- Check bucket permissions (should be readable by service role)
- Verify Supabase project storage quota

### High Latency
- Check individual service latencies in response
- Database latency > 1s: Check PostgreSQL performance
- OpenRouter latency > 2s: Network or API issues
- Storage latency > 1s: Check Supabase storage status

## Maintenance

### Version Updates
Update `APP_VERSION` constant in `index.ts` when deploying significant changes:

```typescript
const APP_VERSION = '2025-11-24';
```

### Adding New Checks
1. Create new check function following existing patterns
2. Add to `services` object in response type
3. Update `determineHealthStatus()` logic if critical
4. Update this README with new check details

## Related Files

- `/supabase/functions/health/index.ts` - Main implementation
- `/supabase/functions/_shared/cors-config.ts` - CORS configuration
- `/supabase/functions/_shared/config.ts` - Shared constants
- `/docs/CI_CD.md` - Deployment workflow (PR-based)

## References

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [OpenRouter API Documentation](https://openrouter.ai/docs)
- [Health Check Best Practices](https://cloud.google.com/blog/products/containers-kubernetes/kubernetes-best-practices-setting-up-health-checks-with-readiness-and-liveness-probes)
