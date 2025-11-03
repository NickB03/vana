# Version Tracking System

This project includes a comprehensive version tracking system to verify code synchronization between GitHub and Lovable environments.

## Overview

The version tracking system provides three visibility points:
1. **Console logging** - Automatic on app load
2. **UI display** - Settings dialog with detailed version info
3. **Manual updates** - npm script for pre-commit updates

## Quick Start

### View Version Info

**In Console:**
Open browser DevTools Console when the app loads. You'll see:
```
🚀 AI Assistant App
Version: v1.1.0 (3076394)
Commit: 3076394 (main)
Message: Merge feature/workflow-documentation: Fix image display issues
Build: 2025-10-29 22:44:39 UTC
Environment: production

✨ Active Features:
  ✅ imageFixDeployed
  ✅ stableArtifactIds
  ✅ publicStorageUrls
```

**In UI:**
1. Open the app
2. Click Settings (gear icon)
3. Scroll to "Version Information" section
4. See full version details including commit hash, branch, build time

### Update Version Before Commit

**Manual update:**
```bash
npm run version:update
```

This will:
- Read current git information
- Update `src/version.ts` with latest commit hash, branch, and timestamp
- Preserve the semantic version number

**Recommended workflow:**
```bash
# 1. Make your changes
git add .

# 2. Update version info
npm run version:update

# 3. Stage the version file
git add src/version.ts

# 4. Commit everything
git commit -m "your commit message"

# 5. Push
git push
```

## Files

**Core files:**
- `src/version.ts` - Version information (auto-updated)
- `scripts/update-version.cjs` - Update script
- `package.json` - Contains `version:update` script

**Integration points:**
- `src/App.tsx` - Calls `logVersionInfo()` on app load
- `src/components/Settings.tsx` - Displays version UI

## Version File Structure

```typescript
export const APP_VERSION = {
  version: '1.1.0',        // Semantic version (manual)
  commit: {
    hash: '...',           // Full git hash (auto)
    short: '...',          // Short hash (auto)
    branch: '...',         // Git branch (auto)
    message: '...',        // Last commit message (auto)
  },
  build: {
    timestamp: '...',      // Build time (auto)
    date: Date,            // Build date object (auto)
  },
  environment: '...',      // 'development' | 'production'
  features: {              // Feature flags
    imageFixDeployed: true,
    stableArtifactIds: true,
    publicStorageUrls: true,
  },
};
```

## Semantic Versioning

The `version` field follows semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR** - Breaking changes
- **MINOR** - New features (backwards compatible)
- **PATCH** - Bug fixes

**To update semantic version:**
1. Edit `src/version.ts` manually
2. Change the `version` field
3. Run `npm run version:update` to update git info
4. Commit

Example:
```typescript
// In src/version.ts
version: '1.2.0',  // Changed from 1.1.0 for new feature
```

## Feature Flags

Feature flags help track which features are deployed:

```typescript
features: {
  imageFixDeployed: true,      // Image URL expiry fix
  stableArtifactIds: true,     // Stable artifact IDs
  publicStorageUrls: true,     // Public storage URLs
  // Add new flags as features are deployed
},
```

**When to add a feature flag:**
- Major bug fixes
- New capabilities
- Infrastructure changes
- Breaking changes

## Verifying Code Sync

### Problem
You push code to GitHub, but you're not sure if Lovable has pulled the latest changes.

### Solution
1. Check the commit hash in GitHub: `git log -1 --format='%h'`
2. Open the app in Lovable
3. Open DevTools Console or Settings
4. Compare commit hashes

**If hashes match:** ✅ Code is synced
**If hashes don't match:** ⚠️ Lovable needs to pull latest changes

### Troubleshooting

**Problem:** Version shows old commit after pushing
**Solution:**
- Lovable may cache builds
- Try forcing a rebuild in Lovable
- Wait a few minutes and refresh

**Problem:** Version script fails
**Solution:**
```bash
# Check if git is accessible
git status

# Manually run the script
node scripts/update-version.cjs

# Check for errors in the output
```

**Problem:** Console doesn't show version
**Solution:**
- Clear browser cache
- Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
- Check if app is in production mode

## Advanced Usage

### API Functions

**logVersionInfo()** - Logs to console
```typescript
import { logVersionInfo } from '@/version';
logVersionInfo();
```

**getVersionString()** - Returns "v1.1.0 (3076394)"
```typescript
import { getVersionString } from '@/version';
const version = getVersionString();
```

**isLatestVersion()** - Checks if on main branch
```typescript
import { isLatestVersion } from '@/version';
if (isLatestVersion()) {
  console.log('Running latest version');
}
```

### Customizing Feature Flags

Edit `src/version.ts` and `scripts/update-version.cjs`:

```typescript
// In both files, update the features object:
features: {
  imageFixDeployed: true,
  stableArtifactIds: true,
  publicStorageUrls: true,
  newFeature: true,  // Add your feature
},
```

### CI/CD Integration

For automated deployments, add to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Update version
  run: npm run version:update

- name: Commit version
  run: |
    git add src/version.ts
    git commit --amend --no-edit
```

## Best Practices

1. **Always update version before committing**
   ```bash
   npm run version:update && git add src/version.ts
   ```

2. **Check console on every deployment**
   - Verify commit hash matches GitHub
   - Confirm environment is correct
   - Review active features

3. **Update semantic version for releases**
   - Minor version for new features
   - Patch version for bug fixes
   - Major version for breaking changes

4. **Add feature flags for major changes**
   - Makes it easy to verify deployments
   - Helps with rollback decisions
   - Documents what's deployed

5. **Use in bug reports**
   - Include version string from Settings
   - Share commit hash
   - Note active features

## Example Workflow

### Daily Development
```bash
# 1. Start work
git checkout -b feature/new-feature

# 2. Make changes
# ... code changes ...

# 3. Before committing
npm run version:update
git add .
git commit -m "feat: add new feature"

# 4. Push and create PR
git push origin feature/new-feature
```

### Verifying Deployment
```bash
# 1. Check local commit
git log -1 --format='%h %s'
# Output: 3076394 Merge feature/workflow-documentation

# 2. Open app in browser
# 3. Check console or Settings
# 4. Compare commit hashes

# If they match: ✅ Deployed successfully
# If they don't: ⚠️ Need to pull/rebuild
```

### Adding New Features
```typescript
// 1. Update version.ts with new feature flag
features: {
  imageFixDeployed: true,
  stableArtifactIds: true,
  publicStorageUrls: true,
  myNewFeature: true,  // NEW
},

// 2. Also update scripts/update-version.cjs
// (search for "features:" and add the same line)

// 3. Commit
npm run version:update
git add src/version.ts scripts/update-version.cjs
git commit -m "feat: add myNewFeature flag"
```

## Support

If you encounter issues:
1. Check the console for errors
2. Run `npm run version:update` manually
3. Verify git is working: `git status`
4. Check build logs for TypeScript errors
5. Clear browser cache and rebuild

---

**Last Updated:** 2025-10-29
**Version:** 1.1.0
