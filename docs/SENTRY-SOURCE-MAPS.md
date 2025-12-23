# Sentry Source Map Configuration

This guide explains how to configure Sentry source map uploads for production builds deployed to Cloudflare Pages.

## Overview

Source maps allow Sentry to display readable stack traces for minified production code. The `@sentry/vite-plugin` automatically uploads source maps during production builds and removes them afterward to prevent exposing your source code publicly.

## Prerequisites

1. A Sentry account with a project created
2. Access to your Cloudflare Pages deployment settings
3. Build command: `npm run build`

## Setup Instructions

### 1. Generate a Sentry Auth Token

1. Go to https://sentry.io/settings/account/api/auth-tokens/
2. Click "Create New Token"
3. Configure the token:
   - **Name**: `Cloudflare Pages Source Maps`
   - **Scopes**: Select these permissions:
     - `project:releases` (read & write)
     - `project:write`
     - `org:read`
4. Copy the generated token (you'll only see it once!)

### 2. Configure Cloudflare Pages Environment Variables

Add these environment variables to your Cloudflare Pages project:

**Production Environment**:
```bash
SENTRY_AUTH_TOKEN=your-auth-token-from-step-1
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=your-project-slug
```

**How to find your org and project slugs**:
- Your Sentry URL structure: `https://sentry.io/organizations/{org-slug}/projects/{project-slug}/`
- Example: For `https://sentry.io/organizations/my-company/projects/vana-app/`
  - `SENTRY_ORG=my-company`
  - `SENTRY_PROJECT=vana-app`

**Setting environment variables in Cloudflare**:
1. Go to your Cloudflare Pages project
2. Navigate to **Settings** > **Environment variables**
3. Add the three variables above
4. Choose **Production** environment
5. Click "Save"

### 3. Verify Configuration

On your next production deployment, you should see:

```bash
vite build
✓ 5758 modules transformed.

Sentry CLI Plugin: Uploading sourcemaps...
> Analyzing 142 sources
> Rewriting sources
> Adding source map references
> Bundled 142 files for upload
> Uploaded 142 files (142 sourcemaps)
> File upload complete
```

## How It Works

### Build Configuration

The Vite configuration (`vite.config.ts`) includes:

```typescript
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig(({ mode }) => ({
  plugins: [
    // Only runs in production builds with auth token present
    mode === "production" && process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        assets: './dist/**',
        filesToDeleteAfterUpload: ['**/*.js.map', '**/*.mjs.map'],
      },
      telemetry: false,
      silent: false,
      debug: false,
    })
  ],
  build: {
    // Generate hidden source maps (not referenced in production files)
    sourcemap: mode === "production" ? "hidden" : true,
  }
}));
```

### Key Features

1. **Conditional Execution**: Plugin only runs when:
   - Building in production mode (`npm run build`)
   - `SENTRY_AUTH_TOKEN` environment variable is set

2. **Hidden Source Maps**: Source maps are generated with `sourcemap: "hidden"`:
   - Maps are created during build
   - No `//# sourceMappingURL` comment is added to production files
   - Maps are uploaded to Sentry
   - Maps are deleted from `dist/` after upload

3. **Local Development**: Plugin is inactive during:
   - Development server (`npm run dev`)
   - Builds without auth token
   - This prevents breaking local builds

## Troubleshooting

### Source Maps Not Uploading

**Check environment variables are set**:
```bash
# In Cloudflare Pages build logs, you should see:
Sentry CLI Plugin: Uploading sourcemaps...
```

If you don't see this, verify:
1. `SENTRY_AUTH_TOKEN` is set in Cloudflare Pages
2. Environment is set to "Production"
3. Build command is `npm run build` (not `npm run build:dev`)

### Authentication Errors

```
Error: Could not authenticate with Sentry
```

**Solutions**:
- Regenerate auth token with correct scopes
- Verify token is correctly copied (no extra spaces)
- Check token hasn't expired

### Incorrect Org/Project

```
Error: Project not found
```

**Solutions**:
- Double-check `SENTRY_ORG` and `SENTRY_PROJECT` match your Sentry URL
- Ensure org slug is the organization name, not the display name
- Verify your auth token has access to the specified project

### Build Failing

If builds fail after adding the plugin:

1. **Check auth token exists in production**:
   - Plugin should gracefully skip if token is missing
   - Verify conditional logic: `mode === "production" && process.env.SENTRY_AUTH_TOKEN`

2. **Test locally with auth token**:
   ```bash
   # Set env vars temporarily
   export SENTRY_AUTH_TOKEN=your-token
   export SENTRY_ORG=your-org
   export SENTRY_PROJECT=your-project

   # Run production build
   npm run build
   ```

3. **Verify source maps are generated**:
   ```bash
   # After build, check for .map files
   ls -la dist/assets/*.map
   ```

## Security Considerations

### Best Practices

1. **Never commit auth tokens**: Always use environment variables
2. **Use hidden source maps**: Prevents exposing source code to end users
3. **Delete maps after upload**: Configured via `filesToDeleteAfterUpload`
4. **Scope tokens appropriately**: Only grant required permissions
5. **Rotate tokens regularly**: Update tokens every 90 days

### Environment Separation

Configure Sentry project for production:

**Production** (`main` branch):
```bash
SENTRY_PROJECT=vana-production
```

Preview deployments also use the production Sentry project.

## Verification

### Test Source Map Upload

1. Deploy to production
2. Check Cloudflare Pages build logs for:
   ```
   Sentry CLI Plugin: Uploading sourcemaps...
   > Uploaded X files (X sourcemaps)
   ```

3. Verify in Sentry:
   - Go to **Settings** > **Projects** > Your Project > **Source Maps**
   - You should see uploaded artifacts for each release
   - Release name typically matches the git commit SHA or build hash

### Test Error Reporting

1. Trigger an error in production
2. Check Sentry issue detail page
3. Stack trace should show:
   - Original file names (e.g., `ChatInterface.tsx`)
   - Original line numbers
   - Readable source code context

If you see minified code instead, source maps aren't being applied correctly.

## Related Documentation

- [Sentry Vite Plugin Docs](https://docs.sentry.io/platforms/javascript/guides/react/sourcemaps/uploading/vite/)
- [Cloudflare Pages Environment Variables](https://developers.cloudflare.com/pages/platform/build-configuration/#environment-variables)
- [SENTRY.md](./SENTRY.md) - Sentry integration guide
- [CLAUDE.md](../../CLAUDE.md) - Project overview

## Support

For issues with:
- **Sentry configuration**: [Sentry Support](https://sentry.io/support/)
- **Cloudflare Pages**: [Cloudflare Community](https://community.cloudflare.com/)
- **Build failures**: Check Cloudflare Pages build logs
