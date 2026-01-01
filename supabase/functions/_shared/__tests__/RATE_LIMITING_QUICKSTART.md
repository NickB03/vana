# Rate Limiting Tests - Quick Start Guide

## TL;DR - Run Tests Now

```bash
# 1. Start Supabase (if not running)
supabase start

# 2. Get service role key
export SUPABASE_SERVICE_ROLE_KEY=$(supabase status | grep "service_role key:" | awk '{print $3}')

# 3. Run tests
cd supabase/functions/_shared/__tests__
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
deno test --allow-net --allow-env rate-limiting-integration.test.ts
```

## One-Liner

```bash
cd supabase/functions/_shared/__tests__ && \
export SUPABASE_SERVICE_ROLE_KEY=$(supabase status | grep "service_role key:" | awk '{print $3}') && \
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
deno test --allow-net --allow-env rate-limiting-integration.test.ts
```

## What Gets Tested

| # | Test | What It Does |
|---|------|--------------|
| 1 | Guest - First Request | ✅ Allows first request, returns 19/20 remaining |
| 2 | Guest - Exceeds Limit | 🚫 Blocks after hitting max requests |
| 3 | Guest - Window Reset | 🔄 Resets counter after time window expires |
| 4 | User - First Request | ✅ Allows authenticated user's first request |
| 5 | User - Exceeds Limit | 🚫 Blocks authenticated user after max requests |
| 6 | User - Status Check | 📊 Read-only check doesn't increment counter |
| 7 | API - First Request | ✅ Allows API's first request |
| 8 | API - Exceeds RPM | 🚫 Blocks API after hitting RPM limit |
| 9 | API - Window Reset | 🔄 Resets API counter after time window |
| 10 | API - Isolation | 🔒 Different APIs have separate counters |

## Expected Result

```
test result: ok. 10 passed; 0 failed; 0 ignored
```

## Troubleshooting

### All Tests Skipped (0 passed; 10 ignored)

**Problem**: Missing service role key.

**Fix**:
```bash
supabase status  # Get the key manually
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### Connection Refused Error

**Problem**: Supabase not running.

**Fix**:
```bash
supabase start
```

### Function Does Not Exist

**Problem**: Migration not applied.

**Fix**:
```bash
supabase db reset
```

## Test Isolation

All tests use unique identifiers and clean up after themselves:

- Guest tests: `guest_first_1735689012_xyz789`
- User tests: `test_user_1735689012@example.com` (auto-deleted)
- API tests: `api_first_1735689012_xyz789`

No manual cleanup needed!

## Full Documentation

See `RATE_LIMITING_TESTS.md` for comprehensive documentation.

## Related Commands

```bash
# View test coverage
deno test --coverage=cov_profile rate-limiting-integration.test.ts
deno coverage cov_profile

# Run single test
deno test --allow-net --allow-env --filter "Guest: First" rate-limiting-integration.test.ts

# Verbose output
deno test --allow-net --allow-env rate-limiting-integration.test.ts -- --verbose
```

## CI/CD Integration

Add to GitHub Actions workflow:

```yaml
- name: Run Rate Limiting Tests
  run: |
    supabase start
    cd supabase/functions/_shared/__tests__
    export KEY=$(supabase status | grep "service_role key:" | awk '{print $3}')
    SUPABASE_URL=http://127.0.0.1:54321 \
    SUPABASE_SERVICE_ROLE_KEY=$KEY \
    deno test --allow-net --allow-env rate-limiting-integration.test.ts
```

## Performance

- **Duration**: ~2-3 seconds for full suite
- **Cost**: $0.00 (local database only)
- **Network**: None (all local PostgreSQL)

## Files Created

1. `/supabase/functions/_shared/__tests__/rate-limiting-integration.test.ts` (611 lines)
   - 10 comprehensive integration tests
   - Tests all 3 RPC functions + status check
   - Full cleanup and isolation

2. `/supabase/functions/_shared/__tests__/RATE_LIMITING_TESTS.md` (324 lines)
   - Comprehensive documentation
   - Troubleshooting guide
   - CI/CD integration examples

3. `/supabase/functions/_shared/__tests__/RATE_LIMITING_QUICKSTART.md` (This file)
   - Quick start commands
   - TL;DR reference

## Database Functions Tested

- `check_guest_rate_limit(p_identifier, p_max_requests, p_window_hours)`
- `check_user_rate_limit(p_user_id, p_max_requests, p_window_hours)`
- `check_api_throttle(p_api_name, p_max_requests, p_window_seconds)`
- `get_user_rate_limit_status(p_user_id, p_max_requests, p_window_hours)`

All defined in: `supabase/migrations/20251108000001_comprehensive_rate_limiting.sql`

## Quick Reference - Default Limits

| Type | Limit | Window | Config Source |
|------|-------|--------|---------------|
| Guest | 20 requests | 5 hours | `RATE_LIMITS.GUEST` |
| Authenticated | 100 requests | 5 hours | `RATE_LIMITS.AUTHENTICATED` |
| API (Gemini) | 15 requests | 1 minute | `RATE_LIMITS.API_THROTTLE` |
| Artifact (Guest) | 5 requests | 5 hours | `RATE_LIMITS.ARTIFACT.GUEST` |
| Artifact (Auth) | 50 requests | 5 hours | `RATE_LIMITS.ARTIFACT.AUTHENTICATED` |

Config file: `supabase/functions/_shared/config.ts`
