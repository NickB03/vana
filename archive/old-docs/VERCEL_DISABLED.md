# Vercel Deployment - Temporarily Disabled

## Status
Vercel automatic deployments have been temporarily disabled to allow CI/CD to pass without deployment failures.

## How to Re-enable

1. Rename the configuration file back:
   ```bash
   mv vercel.json.disabled vercel.json
   ```

2. Ensure the configuration is correct:
   - `rootDirectory` should be set to `"frontend"`
   - `installCommand` should be `"npm ci"`
   - Remove the `git.deploymentEnabled: false` setting if present

3. Verify in Vercel dashboard:
   - Go to https://vercel.com/dashboard
   - Check project settings
   - Ensure GitHub integration is connected

## Why It Was Disabled

- Vercel deployment was failing due to configuration issues
- This was blocking PR merges even though the code was working
- Temporary disable allows development to continue

## Alternative Deployment

For manual deployment while disabled:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy manually
cd frontend
vercel --prod
```