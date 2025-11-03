# Cache-Busting Quick Start Guide

## TL;DR - Deployment Checklist

```bash
# 1. Build the application
npm run build

# 2. Verify build artifacts
node scripts/verify-deployment.cjs

# 3. Deploy dist/ folder to your server

# 4. Verify remote deployment (optional)
node scripts/verify-deployment.cjs https://your-app.com

# 5. Test in browser
# - Open DevTools → Application tab
# - Check Service Workers section
# - Verify new SW is registered
```

## What's Implemented

### ✅ Build-Time Hashing
- Every asset gets a unique hash: `main-a1b2c3d4.js`
- Browsers automatically fetch new versions
- Old versions remain cached indefinitely

### ✅ HTML Cache Headers
- `index.html` is never cached
- Browsers check for updates on every visit
- Ensures users get latest asset references

### ✅ Service Worker Updates
- Checks for updates every 30 seconds
- Automatically activates new service worker
- Shows update notification to users

### ✅ Update Notifications
- Users see "Update Available" notification
- Can reload immediately or dismiss
- Non-intrusive UI component

### ✅ Version Tracking
- Build hash injected into HTML
- Version info logged to console
- Deployment verification script

## How It Works

### On Each Build
1. Vite generates unique hashes for all assets
2. Build hash is injected into `index.html`
3. Service worker is regenerated
4. All files are compressed (Brotli + Gzip)

### On User Visit
1. Browser fetches `index.html` (never cached)
2. Gets latest asset references with new hashes
3. Fetches new assets (old ones remain cached)
4. Service worker checks for updates every 30 seconds

### When Update Available
1. New service worker is detected
2. Update notification appears
3. User can reload to activate new version
4. Page reloads with latest code

## Monitoring

### Console Logs
Check browser console on app startup:
```
🚀 AI Assistant App
Version: 1.1.0
Commit: 79ec65f (main)
Build: 2025-10-30 01:50:29 UTC

🔄 Cache Busting Information
Version: 1.1.0
Build Hash: c2e90d8d
Cache Stats: { totalCaches: 3, totalResources: 45 }
```

### DevTools Checks
1. **Application Tab → Service Workers**
   - Verify new SW is registered
   - Check update status

2. **Application Tab → Cache Storage**
   - View cached resources
   - Check cache sizes

3. **Network Tab**
   - Verify `index.html` has `no-cache` headers
   - Check asset cache headers

## Server Configuration

### Nginx (Recommended)
```nginx
# Don't cache index.html
location = /index.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}

# Cache assets forever (unique names)
location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}

# Cache service worker for 1 hour
location = /sw.js {
    add_header Cache-Control "public, max-age=3600";
}
```

### Cloudflare
1. Go to Caching → Cache Rules
2. Create rule for `/index.html`:
   - Cache Level: Bypass
3. Create rule for `/assets/*`:
   - Cache Level: Cache Everything
   - Browser Cache TTL: 1 year

## Troubleshooting

### Users still see old version
```bash
# Hard refresh in browser
Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

# Or clear browser cache manually
```

### Service worker not updating
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => console.log(reg));
});
```

### Check build hash
```javascript
// In browser console
console.log(window.__BUILD_HASH__);
document.documentElement.getAttribute('data-build-hash');
```

## Files Modified/Created

### New Files
- `src/hooks/useServiceWorkerUpdate.ts` - SW update detection
- `src/components/UpdateNotification.tsx` - Update UI
- `src/utils/cacheBusting.ts` - Cache utilities
- `scripts/verify-deployment.cjs` - Deployment verification
- `docs/CACHE_BUSTING_STRATEGY.md` - Full documentation

### Modified Files
- `vite.config.ts` - Build hash injection, asset hashing
- `index.html` - Cache headers, build hash attribute
- `src/version.ts` - Build hash support
- `src/App.tsx` - Update notification integration

## Performance Impact

- **Build time:** +100ms (hash generation)
- **Bundle size:** No change
- **Runtime:** Negligible
- **Network:** Reduced (better cache utilization)

## Best Practices

1. ✅ Always run `npm run build` before deployment
2. ✅ Always verify with `verify-deployment.cjs`
3. ✅ Set proper cache headers on server
4. ✅ Monitor service worker updates
5. ✅ Test in incognito/private mode
6. ✅ Check multiple browsers
7. ✅ Verify on mobile devices

## Testing Cache-Busting

### Local Testing
```bash
# Build and verify
npm run build
node scripts/verify-deployment.cjs

# Start dev server
npm run dev

# Open http://localhost:8080
# Check DevTools → Application tab
```

### Production Testing
```bash
# After deployment
node scripts/verify-deployment.cjs https://your-app.com

# Manual testing
# 1. Open app in browser
# 2. Check console for version info
# 3. Make a change and redeploy
# 4. Refresh page - should see update notification
# 5. Click "Reload Now"
# 6. Verify new version is loaded
```

## Support

For issues or questions:
1. Check `docs/CACHE_BUSTING_STRATEGY.md` for detailed info
2. Review browser console logs
3. Check DevTools Application tab
4. Run `verify-deployment.cjs` to diagnose issues

