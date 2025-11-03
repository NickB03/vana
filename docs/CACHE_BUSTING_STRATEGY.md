# Cache-Busting Strategy for Production Deployments

This document describes the comprehensive cache-busting solution implemented to ensure visitors always see the latest updates after deployments.

## Overview

The cache-busting strategy uses multiple layers to guarantee fresh content delivery:

1. **Build-time hashing** - Unique hashes for all assets
2. **HTML cache headers** - Prevent index.html caching
3. **Service Worker updates** - Automatic SW updates with user notifications
4. **Version tracking** - Build hash detection and comparison
5. **Deployment verification** - Post-deployment validation

## Components

### 1. Build-Time Cache Busting

**File:** `vite.config.ts`

Vite is configured to generate unique hashes for all assets on each build:

```typescript
// Output configuration
output: {
  entryFileNames: `assets/[name]-[hash].js`,
  chunkFileNames: `assets/[name]-[hash].js`,
  assetFileNames: `assets/[name]-[hash][extname]`,
}
```

**Benefits:**
- Every build produces unique filenames
- Browsers automatically fetch new versions
- Old versions remain cached indefinitely (safe)
- No manual cache invalidation needed

**Example output:**
```
assets/main-a1b2c3d4.js
assets/vendor-react-e5f6g7h8.js
assets/styles-i9j0k1l2.m.css
```

### 2. HTML Cache Headers

**File:** `index.html`

The main HTML file includes strict cache-control headers:

```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate, max-age=0" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
```

**Why this matters:**
- Browsers check for new index.html on every visit
- Ensures users get the latest asset references
- Prevents stale asset URLs from being served

**Server-side headers (recommended):**
```
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

### 3. Build Hash Injection

**Files:** `vite.config.ts`, `index.html`, `src/version.ts`

A unique build hash is generated and injected into the HTML:

```html
<html lang="en" data-build-hash="a1b2c3d4">
```

**Usage:**
- Detect new deployments
- Compare versions across sessions
- Verify deployment success

### 4. Service Worker Updates

**File:** `src/hooks/useServiceWorkerUpdate.ts`

The service worker is configured for automatic updates:

```typescript
VitePWA({
  registerType: "autoUpdate",
  workbox: {
    clientsClaim: true,
    skipWaiting: true,
  }
})
```

**Features:**
- Checks for updates every 30 seconds
- Automatically activates new service worker
- Notifies users of available updates

### 5. Update Notification UI

**File:** `src/components/UpdateNotification.tsx`

When a new service worker is available, users see a notification:

```
┌─────────────────────────────────┐
│ 🔄 Update Available             │
│ A new version is ready. Reload  │
│ to get the latest features.     │
│                                 │
│ [Reload Now] [Later]            │
└─────────────────────────────────┘
```

**User experience:**
- Non-intrusive notification
- Users can reload immediately or dismiss
- Automatic reload after clicking "Reload Now"

### 6. Version Tracking

**File:** `src/utils/cacheBusting.ts`

Utilities for version management:

```typescript
// Store version on app load
storeVersionInfo();

// Check if new version available
isNewVersionAvailable();

// Get current version info
getCurrentVersionInfo();

// Clear caches if needed
clearAllCaches();
```

## Deployment Workflow

### Before Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Verify build artifacts:**
   ```bash
   node scripts/verify-deployment.cjs
   ```

   This checks:
   - ✅ Hashed asset files present
   - ✅ Build hash in index.html
   - ✅ Service worker present
   - ✅ Cache headers configured

### During Deployment

1. **Upload dist/ folder to server**
2. **Ensure proper cache headers are set** (see Server Configuration below)
3. **Verify service worker is accessible** at `/sw.js`

### After Deployment

1. **Verify remote deployment:**
   ```bash
   node scripts/verify-deployment.cjs https://your-app.com
   ```

2. **Test in browser:**
   - Open DevTools → Application tab
   - Check Service Workers section
   - Verify new SW is registered
   - Check Network tab for cache headers

3. **Monitor user updates:**
   - Check browser console for version logs
   - Verify update notifications appear
   - Confirm users can reload to new version

## Server Configuration

### Nginx

```nginx
# Don't cache index.html
location = /index.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}

# Cache assets forever (they have unique names)
location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}

# Cache service worker for 1 hour
location = /sw.js {
    add_header Cache-Control "public, max-age=3600";
}

# Cache manifest for 1 hour
location = /manifest.json {
    add_header Cache-Control "public, max-age=3600";
}
```

### Apache

```apache
# Don't cache index.html
<Files "index.html">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
</Files>

# Cache assets forever
<FilesMatch "\.(js|css)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>

# Cache service worker for 1 hour
<Files "sw.js">
    Header set Cache-Control "public, max-age=3600"
</Files>
```

### Cloudflare

1. Go to Caching → Cache Rules
2. Create rule for `path = "/index.html"`:
   - Cache Level: Bypass
   - Browser Cache TTL: Respect origin headers
3. Create rule for `path contains "/assets/"`:
   - Cache Level: Cache Everything
   - Browser Cache TTL: 1 year

## Troubleshooting

### Users still see old version

**Causes:**
- Browser cache not cleared
- CDN cache not purged
- Service worker not updated

**Solutions:**
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Purge CDN cache
4. Check service worker in DevTools

### Service worker not updating

**Check:**
1. Is `/sw.js` accessible?
2. Are cache headers correct?
3. Is service worker registration working?

**Debug:**
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => console.log(reg));
});
```

### Build hash not appearing

**Check:**
1. Is Vite build running in production mode?
2. Is `__BUILD_HASH__` defined in vite.config.ts?
3. Is index.html using `data-build-hash` attribute?

**Debug:**
```javascript
// In browser console
console.log(window.__BUILD_HASH__);
document.documentElement.getAttribute('data-build-hash');
```

## Monitoring

### Console Logs

The app logs cache-busting information on startup:

```
🚀 AI Assistant App
Version: 1.1.0
Commit: 79ec65f (main)
Build: 2025-10-30 01:50:29 UTC

🔄 Cache Busting Information
Version: 1.1.0
Commit: 79ec65f
Build Hash: a1b2c3d4
Build Time: 2025-10-30T01:50:29.000Z
Cache Stats: { totalCaches: 3, totalResources: 45 }
```

### Browser DevTools

**Application Tab:**
- Service Workers: Check registration and update status
- Cache Storage: View cached resources
- Manifest: Verify PWA manifest

**Network Tab:**
- Check `index.html` response headers
- Verify `Cache-Control` headers
- Monitor service worker requests

## Performance Impact

- **Build time:** +100ms (hash generation)
- **Bundle size:** No change (hashes are metadata)
- **Runtime:** Negligible (version checking is minimal)
- **Network:** Reduced (better cache utilization)

## Best Practices

1. ✅ Always run `npm run build` before deployment
2. ✅ Always verify deployment with `verify-deployment.cjs`
3. ✅ Set proper cache headers on server
4. ✅ Monitor service worker updates
5. ✅ Test in incognito/private mode
6. ✅ Check multiple browsers
7. ✅ Verify on mobile devices
8. ✅ Monitor user feedback for cache issues

## References

- [Vite Build Configuration](https://vitejs.dev/config/build.html)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Cache-Control Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)
- [Workbox Configuration](https://developers.google.com/web/tools/workbox/modules/workbox-build)

