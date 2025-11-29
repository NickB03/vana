# Local Supabase Development Guide

This guide explains how to use the local Supabase development environment for Vana.

## Quick Reference

| Command | Description |
|---------|-------------|
| `supabase start` | Start local Supabase (Docker) |
| `supabase stop` | Stop local Supabase |
| `supabase status` | Check running status & get URLs |
| `supabase db reset` | Wipe & rebuild DB from migrations |
| `supabase migration new <name>` | Create new migration file |
| `supabase db push` | Push migrations to remote |

## Local Development URLs

After running `supabase start`:

| Service | URL |
|---------|-----|
| **API** | http://127.0.0.1:54321 |
| **Database** | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| **Studio** | http://127.0.0.1:54323 |
| **Mailpit** (email testing) | http://127.0.0.1:54324 |

## Setup Steps

### 1. Start Local Supabase

```bash
# Ensure Docker Desktop is running, then:
supabase start
```

This will:
- Pull required Docker images (first time only)
- Apply all migrations from `supabase/migrations/`
- Start all Supabase services

### 2. Switch to Local Environment

The `.env.local` file is already configured for local development:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
```

Vite automatically loads `.env.local` over `.env`, so just run:

```bash
npm run dev
```

### 3. Access Local Studio

Open http://127.0.0.1:54323 to:
- Browse tables and data
- Run SQL queries
- Test RLS policies
- Manage auth users

## Migration Workflow

### Creating a New Migration

```bash
# Create migration file
supabase migration new add_user_preferences

# Edit the file
code supabase/migrations/<timestamp>_add_user_preferences.sql

# Test locally by resetting
supabase db reset

# When ready, push to remote
supabase db push --dry-run  # Preview first
supabase db push            # Apply to remote
```

### Testing Schema Changes Safely

```bash
# Make changes to migration files
# Then reset local DB to test
supabase db reset

# This will:
# 1. Drop all tables
# 2. Re-apply all migrations in order
# 3. Re-seed data (if supabase/seed.sql exists)
```

## Environment Switching

### Local Development
```bash
# Start local Supabase
supabase start

# Run app (uses .env.local automatically)
npm run dev

# App connects to http://127.0.0.1:54321
```

### Remote Development (vana-dev)
```bash
# Stop local Supabase
supabase stop

# Remove or rename .env.local
mv .env.local .env.local.backup

# Run app (uses .env)
npm run dev

# App connects to https://vznhbocnuykdmjvujaka.supabase.co
```

## Edge Functions (Local)

Edge Functions require a different approach for local testing:

```bash
# Serve functions locally (hot reload)
supabase functions serve

# Test a specific function
supabase functions serve chat

# Functions will be available at:
# http://127.0.0.1:54321/functions/v1/<function-name>
```

**Note:** Local Edge Functions need environment variables:

```bash
# Create supabase/.env for local function secrets
echo "OPENROUTER_GEMINI_FLASH_KEY=your-key" >> supabase/.env
echo "GLM_API_KEY=your-key" >> supabase/.env
```

## Troubleshooting

### Docker Not Running
```
Error: cannot connect to Docker daemon
```
**Fix:** Start Docker Desktop

### Port Already in Use
```
Error: port 54321 already in use
```
**Fix:** `supabase stop` or kill the process using the port

### Migration Failed
```
Error: migration failed at <migration-name>
```
**Fix:** Check the migration SQL for errors, fix, then `supabase db reset`

### Database Connection Refused
```
Error: connection refused on port 54322
```
**Fix:** Wait for `supabase start` to complete fully, or run `supabase status`

## Best Practices

1. **Always develop locally first** - Don't experiment on remote DB
2. **Test migrations with `db reset`** - Ensures they work from scratch
3. **Use `--dry-run` before pushing** - Preview changes before applying
4. **Commit migration files** - They're the source of truth for schema
5. **Don't modify applied migrations** - Create new ones to alter schema

## Files Created/Modified

| File | Purpose |
|------|---------|
| `.env.local` | Local Supabase connection config |
| `supabase/config.toml` | Supabase project config |
| `supabase/migrations/` | Database migrations |
| `supabase/.env` | Local Edge Function secrets (gitignored) |
