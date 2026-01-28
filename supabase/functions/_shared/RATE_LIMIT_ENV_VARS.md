# Rate Limit Environment Variables

## Overview

All rate limits in the Edge Functions are now configurable via environment variables. This allows for dynamic adjustment of limits without redeployment, which is critical for:

- **DDoS Mitigation**: Quickly tighten limits during attacks
- **Abuse Response**: Temporarily restrict specific user types
- **Capacity Management**: Scale limits up/down based on infrastructure
- **A/B Testing**: Experiment with different rate limit configurations

## Quick Reference

### Base Rate Limits

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `RATE_LIMIT_GUEST_MAX` | 20 | Max requests for guest users |
| `RATE_LIMIT_GUEST_WINDOW` | 5 | Window in hours for guest limits |
| `RATE_LIMIT_AUTH_MAX` | 100 | Max requests for authenticated users |
| `RATE_LIMIT_AUTH_WINDOW` | 5 | Window in hours for authenticated limits |

### API Throttle Limits

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `RATE_LIMIT_API_THROTTLE_RPM` | 15 | API requests per minute |
| `RATE_LIMIT_API_THROTTLE_WINDOW` | 60 | Window in seconds for API throttle |

### Artifact Generation Limits

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `RATE_LIMIT_ARTIFACT_API_MAX` | 10 | Max artifact API requests |
| `RATE_LIMIT_ARTIFACT_API_WINDOW` | 60 | Window in seconds for artifact API throttle |
| `RATE_LIMIT_ARTIFACT_GUEST_MAX` | 5 | Max artifacts for guest users |
| `RATE_LIMIT_ARTIFACT_GUEST_WINDOW` | 5 | Window in hours for artifact guest limits |
| `RATE_LIMIT_ARTIFACT_AUTH_MAX` | 50 | Max artifacts for authenticated users |
| `RATE_LIMIT_ARTIFACT_AUTH_WINDOW` | 5 | Window in hours for artifact auth limits |

### Image Generation Limits

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `RATE_LIMIT_IMAGE_API_MAX` | 15 | Max image API requests |
| `RATE_LIMIT_IMAGE_API_WINDOW` | 60 | Window in seconds for image API throttle |
| `RATE_LIMIT_IMAGE_GUEST_MAX` | 20 | Max images for guest users |
| `RATE_LIMIT_IMAGE_GUEST_WINDOW` | 5 | Window in hours for image guest limits |
| `RATE_LIMIT_IMAGE_AUTH_MAX` | 50 | Max images for authenticated users |
| `RATE_LIMIT_IMAGE_AUTH_WINDOW` | 5 | Window in hours for image auth limits |

### Tavily Web Search Limits

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `RATE_LIMIT_TAVILY_API_MAX` | 10 | Max Tavily API requests |
| `RATE_LIMIT_TAVILY_API_WINDOW` | 60 | Window in seconds for Tavily API throttle |
| `RATE_LIMIT_TAVILY_GUEST_MAX` | 10 | Max searches for guest users |
| `RATE_LIMIT_TAVILY_GUEST_WINDOW` | 5 | Window in hours for Tavily guest limits |
| `RATE_LIMIT_TAVILY_AUTH_MAX` | 50 | Max searches for authenticated users |
| `RATE_LIMIT_TAVILY_AUTH_WINDOW` | 5 | Window in hours for Tavily auth limits |

## Usage Examples

### Setting Environment Variables

Using Supabase CLI (recommended for production):

```bash
# Set a single variable
supabase secrets set RATE_LIMIT_GUEST_MAX=30

# Set multiple variables
supabase secrets set \
  RATE_LIMIT_GUEST_MAX=30 \
  RATE_LIMIT_GUEST_WINDOW=3 \
  RATE_LIMIT_AUTH_MAX=200
```

For local development, create a `.env` file in `supabase/functions/`:

```bash
RATE_LIMIT_GUEST_MAX=30
RATE_LIMIT_GUEST_WINDOW=3
RATE_LIMIT_AUTH_MAX=200
```

### Common Scenarios

#### 1. DDoS Mitigation (Emergency Tightening)

```bash
# Severely restrict guest users during attack
supabase secrets set \
  RATE_LIMIT_GUEST_MAX=5 \
  RATE_LIMIT_GUEST_WINDOW=1 \
  RATE_LIMIT_ARTIFACT_GUEST_MAX=1 \
  RATE_LIMIT_IMAGE_GUEST_MAX=2 \
  RATE_LIMIT_TAVILY_GUEST_MAX=1

# Changes take effect immediately (no redeployment needed!)
```

#### 2. Cost Control (Reduce API Usage)

```bash
# Reduce external API calls to save costs
supabase secrets set \
  RATE_LIMIT_API_THROTTLE_RPM=5 \
  RATE_LIMIT_ARTIFACT_API_MAX=3 \
  RATE_LIMIT_IMAGE_API_MAX=5 \
  RATE_LIMIT_TAVILY_API_MAX=2
```

#### 3. Capacity Expansion (Increase Limits)

```bash
# Increase limits for authenticated users after infrastructure upgrade
supabase secrets set \
  RATE_LIMIT_AUTH_MAX=500 \
  RATE_LIMIT_ARTIFACT_AUTH_MAX=200 \
  RATE_LIMIT_IMAGE_AUTH_MAX=150 \
  RATE_LIMIT_TAVILY_AUTH_MAX=100
```

#### 4. A/B Testing (Gradual Rollout)

```bash
# Week 1: Test slightly higher guest limits
supabase secrets set RATE_LIMIT_GUEST_MAX=30

# Week 2: If metrics look good, increase further
supabase secrets set RATE_LIMIT_GUEST_MAX=40

# Week 3: Revert if abuse increases
supabase secrets set RATE_LIMIT_GUEST_MAX=20
```

#### 5. Reset to Defaults

```bash
# Remove all custom overrides (uses defaults from config.ts)
supabase secrets unset \
  RATE_LIMIT_GUEST_MAX \
  RATE_LIMIT_GUEST_WINDOW \
  RATE_LIMIT_AUTH_MAX \
  RATE_LIMIT_AUTH_WINDOW
  # ... add all other variables you want to reset
```

## Validation Rules

The `getEnvInt()` helper function enforces these validation rules:

1. **Type Validation**: Must be a valid integer (non-numeric values fall back to default)
2. **Minimum Value**: All rate limits have a minimum value of 1
3. **Negative Values**: Rejected (falls back to default)
4. **Zero Values**: Rejected (falls back to default)
5. **Floating Point**: Automatically truncated to integer (e.g., "25.7" → 25)

### Examples

```bash
# ✅ Valid - uses value
RATE_LIMIT_GUEST_MAX=50

# ✅ Valid - minimum of 1 accepted
RATE_LIMIT_GUEST_MAX=1

# ❌ Invalid - falls back to default (20)
RATE_LIMIT_GUEST_MAX=0

# ❌ Invalid - falls back to default (20)
RATE_LIMIT_GUEST_MAX=-5

# ❌ Invalid - falls back to default (20)
RATE_LIMIT_GUEST_MAX=invalid

# ✅ Valid - truncates to 25
RATE_LIMIT_GUEST_MAX=25.7

# ✅ Valid - very large values accepted
RATE_LIMIT_GUEST_MAX=999999
```

## Monitoring Rate Limit Changes

After changing rate limits, monitor these metrics:

1. **Edge Function Logs**: Check for rate limit warnings
   ```bash
   supabase functions logs chat
   supabase functions logs generate-artifact
   ```

2. **X-RateLimit-* Headers**: Client responses include rate limit info
   - `X-RateLimit-Limit`: Total requests allowed
   - `X-RateLimit-Remaining`: Requests remaining
   - `X-RateLimit-Reset`: Unix timestamp when limit resets

3. **Database Tables**: Query rate limit tables directly
   ```sql
   SELECT * FROM guest_rate_limits ORDER BY last_request_at DESC LIMIT 10;
   SELECT * FROM user_rate_limits ORDER BY last_request_at DESC LIMIT 10;
   ```

## Security Considerations

1. **Never Set Limits to 0**: Minimum value is 1 to prevent service disruption
2. **Test in Staging First**: Verify new limits don't break functionality
3. **Document Changes**: Keep a changelog of rate limit adjustments
4. **Alert on Anomalies**: Monitor for sudden spikes in rate limit violations
5. **Have Rollback Plan**: Know how to quickly revert changes

## Troubleshooting

### Environment Variable Not Taking Effect

1. **Check Variable Name**: Ensure exact spelling (case-sensitive)
2. **Verify Secret Set**: Run `supabase secrets list` to confirm
3. **Check Logs**: Look for validation warnings in function logs
4. **Wait for Propagation**: Changes may take 1-2 minutes to propagate

### Rate Limit Too Restrictive

If you accidentally set limits too low:

```bash
# Immediate fix - unset variable to use defaults
supabase secrets unset RATE_LIMIT_GUEST_MAX

# Or set to a higher value
supabase secrets set RATE_LIMIT_GUEST_MAX=50
```

### Rate Limit Too Permissive

If abuse increases after raising limits:

```bash
# Quickly tighten limits
supabase secrets set RATE_LIMIT_GUEST_MAX=10

# Monitor logs for continued abuse
supabase functions logs chat --tail
```

## Implementation Details

### Code Location

- **Configuration**: `/supabase/functions/_shared/config.ts`
- **Helper Function**: `getEnvInt()` in `config.ts`
- **Rate Limiter**: `/supabase/functions/_shared/rate-limiter.ts`
- **Tests**: `/supabase/functions/_shared/__tests__/config.test.ts`
- **Env Tests**: `/supabase/functions/_shared/__tests__/config-env.test.ts`

### getEnvInt() Function

```typescript
function getEnvInt(key: string, defaultValue: number, min: number = 0): number {
  const value = Deno.env.get(key);
  if (!value) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);

  // Validate parsed value is a valid number and meets minimum requirement
  if (isNaN(parsed) || parsed < min) {
    console.warn(
      `[config] Invalid value for ${key}="${value}". Using default: ${defaultValue}`
    );
    return defaultValue;
  }

  return parsed;
}
```

### Usage in Edge Functions

All Edge Functions automatically pick up the new configuration:

```typescript
import { RATE_LIMITS } from '../_shared/config.ts';

// Example: Check guest rate limit
const result = await supabaseClient.rpc('check_guest_rate_limit', {
  p_identifier: clientIp,
  p_max_requests: RATE_LIMITS.GUEST.MAX_REQUESTS,  // ← Uses env var or default
  p_window_hours: RATE_LIMITS.GUEST.WINDOW_HOURS   // ← Uses env var or default
});
```

## Testing

### Unit Tests

```bash
# Run all config tests
cd supabase/functions && deno task test _shared/__tests__/config.test.ts

# Run environment variable tests
cd supabase/functions && deno task test _shared/__tests__/config-env.test.ts
```

### Manual Testing

1. **Set Test Variable**:
   ```bash
   supabase secrets set RATE_LIMIT_GUEST_MAX=5
   ```

2. **Trigger Rate Limit**:
   - Make 6 chat requests as a guest
   - 6th request should be rate limited

3. **Verify Headers**:
   ```bash
   curl -I https://your-project.supabase.co/functions/v1/chat
   # Check X-RateLimit-Limit: 5
   ```

4. **Cleanup**:
   ```bash
   supabase secrets unset RATE_LIMIT_GUEST_MAX
   ```

## Best Practices

1. **Start Conservative**: Set lower limits initially, increase as needed
2. **Monitor Metrics**: Track rate limit violations and API costs
3. **Document Changes**: Keep a log of when and why limits were changed
4. **Test in Staging**: Verify changes don't break user experience
5. **Have Rollback Plan**: Know how to quickly revert to previous values
6. **Use Alerting**: Set up alerts for high rate limit violation rates
7. **Regular Review**: Periodically review and adjust limits based on usage patterns

## Related Files

- `config.ts` - Main configuration file with `getEnvInt()` helper
- `rate-limiter.ts` - Rate limiting service using `RATE_LIMITS`
- `config.test.ts` - Unit tests for configuration
- `config-env.test.ts` - Environment variable override tests
- Edge Functions (chat, generate-artifact, etc.) - Consumers of `RATE_LIMITS`

## Support

For questions or issues:
1. Check function logs: `supabase functions logs [function-name]`
2. Review this documentation
3. Test with environment variable overrides
4. Check Supabase Dashboard for rate limit tables
