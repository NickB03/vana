# Sandpack Offline Support - Technical Explanation

## TL;DR

**Question:** Does Sandpack work offline?  
**Answer:** **Partially** - Initial load requires internet, but subsequent loads can work offline with browser caching.

---

## How Sandpack Handles Dependencies

### 1. Initial Load (Requires Internet)

When a Sandpack artifact loads for the **first time**:

```
User opens React artifact with npm imports
    ↓
Sandpack detects: import { LineChart } from 'recharts'
    ↓
Sandpack fetches from unpkg.com CDN:
  - https://unpkg.com/recharts@2.10.0/dist/recharts.min.js
  - All transitive dependencies
    ↓
Browser downloads and caches files
    ↓
Artifact renders
```

**Network Required:** ✅ Yes (first time only)

---

### 2. Subsequent Loads (Can Work Offline)

After the initial load, if the user:
- Closes the artifact
- Refreshes the page
- Opens a similar artifact with the same packages

**Network Required:** ❌ No (uses browser cache)

**How it works:**
1. Browser checks HTTP cache for `unpkg.com` resources
2. If cached and not expired, uses local copy
3. If cache expired or missing, fetches from network

---

## Browser Caching Behavior

### Cache Headers from unpkg.com

```http
Cache-Control: public, max-age=31536000, immutable
```

**Translation:**
- `max-age=31536000` = Cache for 1 year
- `immutable` = Never revalidate (file won't change)

**Result:** Once downloaded, packages stay cached for 1 year.

---

### Service Worker Caching (Your App)

Your app has a service worker (`src/service-worker.ts`) that can enhance caching:

```typescript
// Current service worker strategy
registerRoute(
  ({ url }) => url.origin === 'https://unpkg.com',
  new CacheFirst({
    cacheName: 'npm-packages',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);
```

**This means:**
- First request: Fetch from network, store in cache
- Subsequent requests: Serve from cache (even offline)
- Cache expires after 30 days

---

## Offline Scenarios

### ✅ Scenario 1: User Has Visited Before

**Setup:**
1. User opens artifact with Recharts (online)
2. Recharts downloads and caches
3. User goes offline

**Result:**
- ✅ Same artifact works offline
- ✅ New artifacts with Recharts work offline
- ❌ New artifacts with different packages fail

---

### ❌ Scenario 2: First-Time User (Offline)

**Setup:**
1. User visits site for first time (offline)
2. Tries to open artifact with Recharts

**Result:**
- ❌ Artifact fails to load
- Error: "Failed to fetch package from unpkg.com"

---

### ⚠️ Scenario 3: Partial Cache

**Setup:**
1. User has Recharts cached
2. Opens artifact with Recharts + Framer Motion (offline)

**Result:**
- ✅ Recharts loads from cache
- ❌ Framer Motion fails to fetch
- ⚠️ Artifact may partially work or crash

---

## Improving Offline Support

### Option 1: Pre-cache Common Packages (Recommended)

Add to your service worker to pre-cache popular packages:

```typescript
// src/service-worker.ts
const COMMON_PACKAGES = [
  'https://unpkg.com/recharts@2.10.0/dist/recharts.min.js',
  'https://unpkg.com/framer-motion@11.0.0/dist/framer-motion.min.js',
  'https://unpkg.com/lucide-react@0.344.0/dist/esm/lucide-react.js',
  'https://unpkg.com/lodash@4.17.21/lodash.min.js',
  'https://unpkg.com/date-fns@3.0.0/index.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('npm-packages-v1').then((cache) => {
      return cache.addAll(COMMON_PACKAGES);
    })
  );
});
```

**Pros:**
- Common packages work offline immediately
- Better UX for offline users

**Cons:**
- Increases initial download size (~2-5MB)
- Need to maintain package list

---

### Option 2: Fallback to Iframe (Implemented)

Your current implementation already does this:

```typescript
// If Sandpack fails, fall back to iframe with CDN libraries
if (artifact.type === "react" && needsSandpack) {
  return <SandpackArtifactRenderer 
    onError={() => {
      // Fallback to iframe rendering
      setNeedsSandpack(false);
    }}
  />;
}
```

**Pros:**
- Graceful degradation
- Simple artifacts still work offline

**Cons:**
- Complex artifacts with npm imports won't work

---

### Option 3: Offline Detection + Warning

Show a warning when user is offline:

```typescript
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);

// In render:
{!isOnline && needsSandpack && (
  <Alert variant="warning">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      You're offline. This artifact requires npm packages that may not be cached.
    </AlertDescription>
  </Alert>
)}
```

---

## Sandpack's Built-in Caching

Sandpack **automatically handles caching** via:

1. **Browser HTTP Cache**
   - Respects `Cache-Control` headers from unpkg.com
   - No configuration needed

2. **IndexedDB Cache**
   - Sandpack stores bundled modules in IndexedDB
   - Persists across sessions
   - Cleared when browser cache is cleared

3. **Memory Cache**
   - Keeps recently used packages in memory
   - Faster than disk cache
   - Lost on page refresh

**You don't need to implement anything** - Sandpack handles this automatically.

---

## Testing Offline Support

### Test 1: Verify Browser Cache

```bash
# 1. Open artifact with Recharts (online)
# 2. Open DevTools > Network tab
# 3. Refresh page
# 4. Look for "from disk cache" or "from memory cache"
```

### Test 2: Simulate Offline

```bash
# 1. Open artifact with Recharts (online)
# 2. DevTools > Network tab > Throttling > Offline
# 3. Refresh page
# 4. Artifact should still work
```

### Test 3: New Package Offline

```bash
# 1. Clear browser cache
# 2. DevTools > Network tab > Throttling > Offline
# 3. Open artifact with Recharts
# 4. Should fail with network error
```

---

## Recommendations

### For Your Implementation

1. **✅ Keep current approach** - Sandpack with automatic caching
2. **✅ Add offline detection** - Warn users when offline
3. **⚠️ Consider pre-caching** - Only if offline support is critical
4. **✅ Document limitation** - Let users know first load requires internet

### For Users

**Best Practice:**
- Open artifacts with npm packages while online
- Browser will cache packages automatically
- Subsequent loads work offline

**If offline:**
- Simple React artifacts (no npm imports) work via iframe
- Complex artifacts with npm imports may fail

---

## Summary Table

| Scenario | First Load | Subsequent Loads | Solution |
|----------|-----------|------------------|----------|
| Online | ✅ Works | ✅ Works | None needed |
| Offline (cached) | ❌ Fails | ✅ Works | Pre-cache packages |
| Offline (not cached) | ❌ Fails | ❌ Fails | Show warning |
| Partial cache | ⚠️ May fail | ⚠️ May fail | Fallback to iframe |

---

## Conclusion

**Offline support is automatic but limited:**

- ✅ **Automatic caching** - Sandpack + browser handle this
- ✅ **Works offline after first load** - Cached packages persist
- ❌ **First load requires internet** - Can't download packages offline
- ⚠️ **Partial support** - Only cached packages work offline

**No implementation needed** - Sandpack's built-in caching is sufficient for most use cases.

**Optional enhancements:**
1. Pre-cache common packages (improves offline UX)
2. Show offline warning (better user communication)
3. Fallback to iframe (graceful degradation)

---

**Last Updated:** 2025-01-05  
**Sandpack Version:** 2.x  
**Browser Support:** All modern browsers with Service Worker support

