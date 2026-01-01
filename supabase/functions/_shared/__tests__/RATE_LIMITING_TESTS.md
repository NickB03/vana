# Rate Limiting Integration Tests

## Overview

The `rate-limiting-integration.test.ts` file contains comprehensive integration tests for the rate limiting RPC functions at the **database layer**. These tests verify that the PostgreSQL functions work correctly with real database calls.

## What This Tests

### Database Layer (RPC Functions)
- ✅ `check_guest_rate_limit()` - Guest IP-based rate limiting
- ✅ `check_user_rate_limit()` - Authenticated user rate limiting
- ✅ `check_api_throttle()` - API request throttling
- ✅ `get_user_rate_limit_status()` - Read-only status checks

### Test Coverage

| Test | Function | Description |
|------|----------|-------------|
| 1 | `check_guest_rate_limit` | First request allowed (within limit) |
| 2 | `check_guest_rate_limit` | Blocks after exceeding limit |
| 3 | `check_guest_rate_limit` | Window resets after expiry |
| 4 | `check_user_rate_limit` | First request allowed (authenticated) |
| 5 | `check_user_rate_limit` | Blocks after exceeding limit |
| 6 | `get_user_rate_limit_status` | Read-only check (no increment) |
| 7 | `check_api_throttle` | First request allowed (API throttle) |
| 8 | `check_api_throttle` | Blocks after exceeding RPM |
| 9 | `check_api_throttle` | Window resets after expiry |
| 10 | `check_api_throttle` | Different APIs are isolated |

## Prerequisites

### 1. Local Supabase Running

```bash
supabase start
```

This starts the local PostgreSQL database with all migrations applied.

### 2. Environment Variables

Get your local service role key:

```bash
# Get local Supabase credentials
supabase status

# Look for:
# service_role key: eyJhbGci...
# API URL: http://127.0.0.1:54321
```

### 3. Migration Applied

The tests require the comprehensive rate limiting migration:

```bash
# Verify migration is applied
supabase db diff

# If missing, apply it:
supabase db reset
```

Migration file: `supabase/migrations/20251108000001_comprehensive_rate_limiting.sql`

## Running the Tests

### Full Test Suite

```bash
cd supabase/functions/_shared/__tests__

SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
deno test --allow-net --allow-env rate-limiting-integration.test.ts
```

### Single Test

```bash
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
deno test --allow-net --allow-env --filter "Guest: First request" rate-limiting-integration.test.ts
```

### With Verbose Output

```bash
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
deno test --allow-net --allow-env rate-limiting-integration.test.ts -- --verbose
```

## Test Isolation

Each test uses unique identifiers to avoid cross-contamination:

- **Guest tests**: `guest_first_1234567890_abc123`
- **User tests**: Creates temporary users with unique emails
- **API tests**: `api_first_1234567890_abc123`

All tests clean up their data in the `finally` block to prevent pollution.

## Expected Output

```
=======================================================================
Rate Limiting Integration Tests
=======================================================================
These tests verify REAL database RPC calls to rate limiting functions
Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
=======================================================================

🔒 Testing guest rate limit - first request...
✓ First request allowed
  Remaining: 19/20
  Reset at: 2025-12-31T20:00:00.000Z

🔒 Testing guest rate limit - exceeding limit...
✓ Rate limit enforced after max requests
  Blocked at: 3/3

🔒 Testing guest rate limit - window reset...
✓ Window reset works correctly
  Counter reset from 19 to 19

🔐 Testing user rate limit - first request...
✓ User first request allowed
  User ID: 12345678-1234-1234-1234-123456789012
  Remaining: 99/100

🔐 Testing user rate limit - exceeding limit...
✓ User rate limit enforced
  Blocked at: 3/3

🔐 Testing user rate limit - read-only status...
✓ Read-only status check works
  Used: 2, Remaining: 98

⚡ Testing API throttle - first request...
✓ API throttle first request allowed
  API: api_first_1234567890_abc123
  Remaining: 14/15

⚡ Testing API throttle - exceeding RPM...
✓ API throttle enforced
  Blocked at: 3/3
  Retry after: 60s

⚡ Testing API throttle - window reset...
✓ API throttle window reset works
  Counter reset from 14 to 14

⚡ Testing API throttle - isolation between APIs...
✓ API throttle isolation works
  api_isolation_1_1234567890_abc123: 14/15
  api_isolation_2_1234567890_abc123: 14/15

test result: ok. 10 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

## Common Issues

### Test Skipped (ignore: true)

If you see all tests skipped:

```
test result: ok. 0 passed; 0 failed; 10 ignored
```

**Cause**: Missing `SUPABASE_SERVICE_ROLE_KEY` environment variable.

**Fix**: Export the service role key:

```bash
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
deno test --allow-net --allow-env rate-limiting-integration.test.ts
```

### Connection Refused

```
error: TypeError: fetch failed
    cause: ConnectError: Connection refused
```

**Cause**: Local Supabase not running.

**Fix**:

```bash
supabase start
```

### Function Does Not Exist

```
error: function check_guest_rate_limit(text, integer, integer) does not exist
```

**Cause**: Migration not applied.

**Fix**:

```bash
supabase db reset
```

### Test User Creation Fails

```
error: Failed to create test user
```

**Cause**: Insufficient permissions or local auth disabled.

**Fix**: Ensure service role key is correct and local auth is enabled.

## Integration with CI/CD

### GitHub Actions

Add to `.github/workflows/test-edge-functions.yml`:

```yaml
- name: Run Rate Limiting Integration Tests
  run: |
    cd supabase/functions/_shared/__tests__
    SUPABASE_URL=http://127.0.0.1:54321 \
    SUPABASE_SERVICE_ROLE_KEY=${{ secrets.SUPABASE_SERVICE_ROLE_KEY_LOCAL }} \
    deno test --allow-net --allow-env rate-limiting-integration.test.ts
```

### Skip in CI (Optional)

If you only want to run these locally:

```typescript
Deno.test({
  name: "Rate Limiting - Guest: First request allowed",
  ignore: !SUPABASE_SERVICE_ROLE_KEY || Deno.env.get("CI") === "true",
  async fn() { ... }
});
```

## Related Files

- **RPC Functions**: `supabase/migrations/20251108000001_comprehensive_rate_limiting.sql`
- **Rate Limits Config**: `supabase/functions/_shared/config.ts` (RATE_LIMITS)
- **Rate Limiter Class**: `supabase/functions/_shared/rate-limiter.ts` (API layer)
- **Unit Tests**: `supabase/functions/_shared/__tests__/rate-limiter.test.ts` (class tests)

## What's NOT Tested Here

These tests focus on the **database layer** (RPC functions). They do NOT test:

- ❌ Rate limiter class logic (`RateLimiter` in `rate-limiter.ts`)
- ❌ Edge Function integration (actual HTTP endpoints)
- ❌ IP extraction and validation
- ❌ Error handling in API layer

For API layer testing, see:
- `rate-limiter.test.ts` - Unit tests for RateLimiter class
- `chat-endpoint-integration.test.ts` - Full Edge Function testing

## Cost

These tests use the **local Supabase database** only. No external API calls are made.

- **Cost**: $0.00 (local database)
- **Time**: ~2-3 seconds for full suite
- **Resources**: PostgreSQL queries only

## Debugging

### Enable SQL Logging

```bash
# In postgres container
docker exec -it supabase_db_llm-chat-site psql -U postgres

-- Enable query logging
ALTER DATABASE postgres SET log_statement = 'all';
ALTER DATABASE postgres SET log_duration = on;
```

### View Test Data

```sql
-- Check guest rate limits
SELECT * FROM guest_rate_limits WHERE identifier LIKE 'guest_%';

-- Check user rate limits
SELECT * FROM user_rate_limits;

-- Check API throttle state
SELECT * FROM api_throttle_state WHERE api_name LIKE 'api_%';
```

### Cleanup Test Data

```bash
# Run cleanup functions
supabase db execute "SELECT cleanup_old_user_rate_limits();"
supabase db execute "SELECT cleanup_old_api_throttle_state();"

# Manual cleanup
supabase db execute "DELETE FROM guest_rate_limits WHERE identifier LIKE 'guest_%';"
```

## Contributing

When adding new rate limiting features:

1. Update migration in `supabase/migrations/`
2. Add corresponding test to `rate-limiting-integration.test.ts`
3. Update `config.ts` with new limits
4. Update this documentation

## License

Same as project (see root LICENSE file).
