# Migration Workflow Authentication Fix - Summary

## Problem Diagnosed

The Deploy Database Migrations workflow on the `main` branch was failing with:

```
failed to connect as temp role: failed to connect to host=aws-1-us-east-2.pooler.supabase.com
user=cli_login_postgres.*** database=postgres: failed SASL auth
(FATAL: password authentication failed for user "cli_login_postgres" (SQLSTATE 28P01))
```

After multiple retries:
```
Circuit breaker open: Too many authentication errors
```

## Root Cause

The workflow was missing the `SUPABASE_DB_PASSWORD` environment variable. The Supabase CLI requires TWO credentials:

1. **SUPABASE_ACCESS_TOKEN** - For API operations (already configured)
2. **SUPABASE_DB_PASSWORD** - For direct database connections (MISSING)

The workflow had the access token but was missing the database password, causing all database connection attempts to fail.

## Fix Applied

### 1. Updated Workflow File

Modified `.github/workflows/deploy-migrations.yml` to add `SUPABASE_DB_PASSWORD` to all database-connecting steps:

- `Check Migration Status` (line 42)
- `Apply Migrations (Dry Run)` (line 51)
- `Apply Migrations to Production` (line 60)
- `Verify Migration Status` (line 69)

**Changes**:
```diff
       - name: Check Migration Status
         env:
           SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
+          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
         run: |
           echo "📋 Checking pending migrations..."
           supabase migration list
```

### 2. Documentation Created

Created `MIGRATION_WORKFLOW_SETUP.md` with:
- Step-by-step instructions to get the database password from Supabase Dashboard
- Guide to add the secret to GitHub Actions
- Troubleshooting steps
- Testing procedures

## Next Steps Required

**ACTION REQUIRED**: You need to add the `SUPABASE_DB_PASSWORD` secret to GitHub Actions:

1. **Get the password**:
   - Go to https://supabase.com/dashboard
   - Select project: `vana-dev` (reference: `vznhbocnuykdmjvujaka`)
   - Navigate to Settings → Database
   - Find the database password in the Connection string section

2. **Add to GitHub**:
   ```bash
   gh secret set SUPABASE_DB_PASSWORD --repo NickB03/llm-chat-site
   # Then paste the password when prompted
   ```

   Or via GitHub UI:
   - Go to repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `SUPABASE_DB_PASSWORD`
   - Value: [paste password]

3. **Verify the fix**:
   ```bash
   # Test with dry run first
   gh workflow run deploy-migrations.yml -f dry_run=true

   # Monitor the run
   gh run watch
   ```

## Files Changed

1. `.github/workflows/deploy-migrations.yml` - Added SUPABASE_DB_PASSWORD env var to 4 steps
2. `MIGRATION_WORKFLOW_SETUP.md` - Complete setup guide (NEW)
3. `MIGRATION_FIX_SUMMARY.md` - This summary document (NEW)

## Verification Checklist

After adding the secret, verify:
- [ ] Secret appears in `gh secret list --repo NickB03/llm-chat-site`
- [ ] Workflow can connect to database without authentication errors
- [ ] `supabase migration list` command succeeds
- [ ] No "Circuit breaker open" errors
- [ ] Migrations can be deployed successfully

## Testing Strategy

1. **Dry run test** (recommended first):
   ```bash
   gh workflow run deploy-migrations.yml -f dry_run=true
   ```
   This will connect to the database and show SQL without applying changes.

2. **Full test** (after dry run succeeds):
   - Make a trivial migration change
   - Push to main
   - Watch workflow execute successfully

## Expected Outcome

After adding the secret, the workflow will:
1. Successfully authenticate to the Supabase database
2. List pending migrations
3. Apply migrations to production (or show SQL in dry run mode)
4. Verify all migrations are applied
5. Complete without authentication errors

## Related Issues

- GitHub Actions workflow run: 21016553007 (FAILED - authentication error)
- Supabase project: vana-dev (vznhbocnuykdmjvujaka)
- Region: East US (Ohio) / aws-1-us-east-2

## Additional Notes

- The database password is NOT the same as your Supabase account password
- The password is project-specific and can be found in the Supabase dashboard
- GitHub Actions secrets are encrypted and masked in logs
- The workflow only triggers on changes to `supabase/migrations/**` or manual dispatch
