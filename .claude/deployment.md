# Deployment & Cache-Busting Guide

Comprehensive deployment procedures with cache-busting verification.

## Quick Deployment

```bash
# 1. Build with cache-busting
npm run build

# 2. Verify local build
node scripts/verify-deployment.cjs

# 3. Deploy (platform-specific)
# ... deployment command ...

# 4. Verify remote deployment
node scripts/verify-deployment.cjs https://your-domain.com
```

## Cache-Busting Architecture

### How It Works

1. **Build Hash Generation** (vite.config.ts:10-14)
   - Unique 8-char hash per build
   - Injected as `data-build-hash` in HTML
   - Available as `window.__BUILD_HASH__`

2. **Asset Hashing**
   - All JS/CSS get unique hashes: `[name]-[hash].js`
   - Pattern ensures new files on changes

3. **HTML Headers** (Never Cached)
   ```html
   <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate, max-age=0">
   <meta http-equiv="Pragma" content="no-cache">
   <meta http-equiv="Expires" content="0">
   ```

4. **Service Worker Updates**
   - Polls every 30 seconds
   - Immediate activation: `skipWaiting: true`
   - User notification with reload button

## Deployment Verification Script

### Local Verification
```bash
node scripts/verify-deployment.cjs

# Expected output:
# ✅ Cache-Control headers present in index.html
# ✅ Build hash found: abc12345
# ✅ 47 files with hashes (JS: 23, CSS: 24)
# ✅ Service worker (sw.js) found
# ✅ All checks passed!
```

### Remote Verification
```bash
node scripts/verify-deployment.cjs https://production.com

# Checks:
# ✅ Server returning 200 OK
# ✅ Cache-Control headers: no-cache, no-store
# ✅ Build hash present: def67890
# ✅ Service worker registration found
```

## Platform-Specific Deployment

### Vercel
```bash
# Build handled automatically
vercel --prod

# Verify after deployment
node scripts/verify-deployment.cjs https://your-app.vercel.app
```

### Netlify
```bash
# netlify.toml configuration
[[headers]]
  for = "/index.html"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"

# Deploy
netlify deploy --prod

# Verify
node scripts/verify-deployment.cjs https://your-app.netlify.app
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/dist;

    # Never cache index.html
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Cache assets forever (immutable)
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        gzip_static on;
        brotli_static on;
    }

    # Service worker - short cache
    location = /sw.js {
        add_header Cache-Control "public, max-age=3600";
        add_header Service-Worker-Allowed "/";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

```bash
# Build and run
docker build -t app .
docker run -p 80:80 app

# Verify
node scripts/verify-deployment.cjs http://localhost
```

## CDN Configuration

### Cloudflare
```javascript
// Page Rules
1. URL: /*
   Cache Level: Standard
   Edge Cache TTL: Respect Existing Headers

2. URL: /index.html
   Cache Level: Bypass
   Browser Cache TTL: 0

3. URL: /assets/*
   Cache Level: Cache Everything
   Edge Cache TTL: 1 month
   Browser Cache TTL: 1 year
```

### AWS CloudFront
```json
{
  "Behaviors": [
    {
      "PathPattern": "/index.html",
      "CachePolicyId": "DISABLED",
      "ResponseHeadersPolicyId": "no-cache-policy"
    },
    {
      "PathPattern": "/assets/*",
      "CachePolicyId": "IMMUTABLE",
      "TTL": {
        "DefaultTTL": 31536000,
        "MaxTTL": 31536000
      }
    }
  ]
}
```

## Browser Verification

After deployment, ALWAYS verify in browser:

```typescript
// Using Chrome DevTools MCP
await browser.navigate({ url: "https://production.com" });

// 1. Check build hash
const buildHash = await browser.evaluate_script({
  function: "() => document.documentElement.dataset.buildHash"
});
console.log("Build hash:", buildHash);

// 2. Verify service worker
const swStatus = await browser.evaluate_script({
  function: "() => navigator.serviceWorker.controller !== null"
});
console.log("Service worker active:", swStatus);

// 3. Check for console errors
const errors = await browser.get_console_messages({
  onlyErrors: true
});

// 4. Test cache headers
const requests = await browser.list_network_requests();
const indexHtml = requests.nodes.find(r => r.url.endsWith('/'));
console.log("Index cache:", indexHtml.responseHeaders['cache-control']);

// 5. Screenshot for visual verification
await browser.screenshot({
  fullPage: true,
  filename: "production-deployed.png"
});
```

## Version Tracking

The app tracks versions automatically:

```typescript
// src/version.ts
export const VERSION = {
  build: __BUILD_HASH__,
  time: __BUILD_TIME__,
  env: import.meta.env.MODE
};

// Logged to console on app start
console.log(`App Version: ${VERSION.build} built at ${VERSION.time}`);
```

Check version in DevTools console:
```javascript
window.__BUILD_HASH__  // Current build hash
localStorage.getItem('app-version')  // Stored version
```

## Update Notification System

Users see notification when new version deployed:

1. **Service worker detects update** (polls every 30s)
2. **UpdateNotification component appears**
3. **User clicks "Reload Now"**
4. **New version loads immediately**

Test the flow:
```bash
# 1. Deploy v1
npm run build && deploy

# 2. Make changes
echo "// test" >> src/App.tsx

# 3. Deploy v2
npm run build && deploy

# 4. Users on v1 see update notification within 30s
```

## Troubleshooting Deployment

### Users Still Seeing Old Version

1. **Check HTML caching**
   ```bash
   curl -I https://your-domain.com | grep -i cache-control
   # Should show: no-cache, no-store, must-revalidate
   ```

2. **Verify build hash changed**
   ```bash
   # Local
   grep 'data-build-hash' dist/index.html

   # Remote
   curl https://your-domain.com | grep 'data-build-hash'
   ```

3. **Clear CDN cache**
   - Cloudflare: Purge Everything
   - CloudFront: Create Invalidation for /*
   - Netlify: Clear cache and deploy

4. **Check service worker**
   ```javascript
   // In browser console
   navigator.serviceWorker.getRegistration().then(r => {
     r.update();  // Force update check
   });
   ```

### Service Worker Not Updating

1. **Verify skipWaiting config**
   ```typescript
   // vite.config.ts should have:
   workbox: {
     clientsClaim: true,
     skipWaiting: true
   }
   ```

2. **Check SW cache time**
   ```bash
   curl -I https://your-domain.com/sw.js | grep -i cache-control
   # Should be max-age=3600 or less
   ```

3. **Manual unregister (dev only)**
   ```javascript
   navigator.serviceWorker.getRegistrations().then(regs => {
     regs.forEach(r => r.unregister());
   });
   ```

### Build Hash Not Changing

1. **Clean build**
   ```bash
   rm -rf dist
   rm -rf node_modules/.vite
   npm run build
   ```

2. **Verify hash generation**
   ```bash
   # Check vite.config.ts has buildHash logic
   grep -A 5 'buildHash' vite.config.ts
   ```

3. **Check plugin order**
   - inject-build-hash plugin must be last

## Performance After Deployment

### Verify Core Web Vitals
```typescript
await browser.performance_start_trace({ reload: true });
await browser.navigate({ url: "https://production.com" });
await browser.wait_for({ text: "AI Assistant" });
const metrics = await browser.performance_stop_trace();

// Target metrics:
// LCP < 2.5s (Largest Contentful Paint)
// FID < 100ms (First Input Delay)
// CLS < 0.1 (Cumulative Layout Shift)
// TTI < 3.8s (Time to Interactive)
```

### Bundle Analysis
```bash
# Analyze bundle size
npm run build
npx vite-bundle-visualizer

# Check sizes
ls -lah dist/assets/*.js | sort -k5 -h

# Verify compression
ls dist/assets/*.br  # Brotli files should exist
ls dist/assets/*.gz  # Gzip fallback
```

## Rollback Procedure

If deployment fails:

1. **Quick Rollback**
   ```bash
   # Revert to previous build
   git checkout HEAD~1
   npm run build
   # Deploy previous version
   ```

2. **With verification**
   ```bash
   # Tag before deployment
   git tag -a v1.0.0 -m "Stable release"

   # If issues, rollback
   git checkout v1.0.0
   npm ci
   npm run build
   node scripts/verify-deployment.cjs
   # Deploy
   ```

3. **Clear all caches**
   - CDN cache purge
   - Service worker update
   - Browser hard refresh: Ctrl+Shift+R

## Deployment Checklist

Before deployment:
- [ ] Run tests: `npm run test`
- [ ] Build locally: `npm run build`
- [ ] Verify build: `node scripts/verify-deployment.cjs`
- [ ] Check bundle size: `ls -lah dist/assets`
- [ ] Test in browser locally

During deployment:
- [ ] Monitor deployment logs
- [ ] Watch for build errors
- [ ] Verify environment variables set

After deployment:
- [ ] Run remote verification script
- [ ] Test in Chrome DevTools MCP
- [ ] Check Core Web Vitals
- [ ] Verify in multiple browsers
- [ ] Test critical user flows
- [ ] Monitor error tracking (if configured)