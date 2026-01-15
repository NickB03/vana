# Deploy Database Migrations Workflow Setup

## Issue Fixed

The Deploy Database Migrations workflow was failing with authentication errors:
```
failed to connect as temp role: failed to connect to host=aws-1-us-east-2.pooler.supabase.com user=cli_login_postgres.*** database=postgres: failed SASL auth (FATAL: password authentication failed for user "cli_login_postgres" (SQLSTATE 28P01))
```

**Root Cause**: Missing `SUPABASE_DB_PASSWORD` environment variable in GitHub Actions workflow.

## Solution

### 1. Get Database Password from Supabase Dashboard

The database password is required for the Supabase CLI to connect to the production database. Follow these steps to retrieve it:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `vana-dev` (reference: `vznhbocnuykdmjvujaka`)
3. Navigate to **Settings** → **Database**
4. Scroll to the **Connection string** section
5. Click on **Connection pooling** tab
6. The password is shown in the connection string (or click "Reset database password" if you need a new one)
7. Copy the database password

**Important**: The database password is different from your Supabase access token. You need BOTH:
- `SUPABASE_ACCESS_TOKEN` - For Supabase CLI authentication (API operations)
- `SUPABASE_DB_PASSWORD` - For direct database connections (migration operations)

### 2. Add Secret to GitHub Actions

1. Go to your GitHub repository: https://github.com/NickB03/llm-chat-site
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `SUPABASE_DB_PASSWORD`
5. Value: Paste the database password from step 1
6. Click **Add secret**

### 3. Verify the Fix

After adding the secret, the workflow will automatically use it. You can verify by:

1. Triggering the workflow manually:
   ```bash
   gh workflow run deploy-migrations.yml
   ```

2. Or wait for the next push to `main` that modifies files in `supabase/migrations/`

3. Monitor the workflow run:
   ```bash
   gh run watch
   ```

The workflow should now successfully:
- Connect to the database
- List pending migrations
- Apply migrations to production
- Verify migration status

## Workflow Changes Made

Updated `.github/workflows/deploy-migrations.yml` to include `SUPABASE_DB_PASSWORD` in all steps that connect to the database:

- `Check Migration Status` step
- `Apply Migrations (Dry Run)` step
- `Apply Migrations to Production` step
- `Verify Migration Status` step

## Security Notes

- Never commit the database password to the repository
- The password is stored securely in GitHub Actions secrets
- It's only available to workflows running on the `main` branch
- The password is masked in workflow logs

## Testing

To test the workflow without applying migrations:

```bash
gh workflow run deploy-migrations.yml -f dry_run=true
```

This will:
1. Connect to the database
2. Check migration status
3. Show the SQL that would be applied (without executing it)

## Troubleshooting

### If you still see authentication errors:

1. Verify the secret is set correctly:
   ```bash
   gh secret list --repo NickB03/llm-chat-site | grep SUPABASE_DB_PASSWORD
   ```

2. Check if the password is correct by testing locally:
   ```bash
   export SUPABASE_DB_PASSWORD="your-password-here"
   supabase link --project-ref vznhbocnuykdmjvujaka
   supabase migration list
   ```

3. If the password is incorrect, reset it in the Supabase dashboard and update the GitHub secret

### If you see "Circuit breaker open" errors:

This happens after multiple failed authentication attempts. Wait 5-10 minutes for the circuit breaker to reset, then try again with the correct password.

## Related Documentation

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Database Migrations Guide](./.claude/DATABASE_SCHEMA.md)
