# CDN Fallback Example

## How It Works

When bundling an artifact with npm dependencies, the system now automatically tries multiple CDNs in sequence until finding one that responds successfully.

## Example Scenario

### Request
```typescript
{
  dependencies: {
    "lodash": "4.17.21",
    "@radix-ui/react-dialog": "1.0.5",
    "axios": "1.4.0"
  }
}
```

### Fallback Flow (esm.sh is down)

**Package 1: lodash@4.17.21**
```
[req-abc123] Trying esm.sh for lodash@4.17.21...
[req-abc123] ✗ esm.sh failed for lodash
[req-abc123] Trying esm.run for lodash@4.17.21...
[req-abc123] ✓ esm.run works for lodash
[req-abc123] Using esm.run for lodash@4.17.21
```

**Package 2: @radix-ui/react-dialog@1.0.5**
```
[req-abc123] Trying esm.sh for @radix-ui/react-dialog@1.0.5...
[req-abc123] ✗ esm.sh failed for @radix-ui/react-dialog
[req-abc123] Trying esm.run for @radix-ui/react-dialog@1.0.5...
[req-abc123] ✗ esm.run failed for @radix-ui/react-dialog
[req-abc123] Trying jsdelivr for @radix-ui/react-dialog@1.0.5...
[req-abc123] ✓ jsdelivr works for @radix-ui/react-dialog
[req-abc123] Using jsdelivr for @radix-ui/react-dialog@1.0.5
```

**Package 3: axios@1.4.0**
```
[req-abc123] Trying esm.sh for axios@1.4.0...
[req-abc123] ✗ esm.sh failed for axios
[req-abc123] Trying esm.run for axios@1.4.0...
[req-abc123] ✓ esm.run works for axios
[req-abc123] Using esm.run for axios@1.4.0
```

### Generated Import Map

```javascript
{
  "imports": {
    // React shims (window globals)
    "react": "data:text/javascript,...",
    "react-dom": "data:text/javascript,...",

    // Dependencies with fallback CDNs
    "lodash": "https://esm.run/lodash@4.17.21",
    "@radix-ui/react-dialog": "https://cdn.jsdelivr.net/npm/@radix-ui/react-dialog@1.0.5/+esm",
    "axios": "https://esm.run/axios@1.4.0"
  }
}
```

## Code Reference

### Before (single CDN)
```typescript
for (const [pkg, version] of Object.entries(remaining)) {
  browserImportMap[pkg] = buildEsmUrl(pkg, version);
}
```

### After (multi-CDN fallback)
```typescript
for (const [pkg, version] of Object.entries(remaining)) {
  const cdnResult = await getWorkingCdnUrl(pkg, version, requestId);
  if (cdnResult) {
    browserImportMap[pkg] = cdnResult.url;
    console.log(`Using ${cdnResult.provider} for ${pkg}@${version}`);
  } else {
    // Last resort
    console.warn(`No CDN available, using esm.sh as fallback`);
    browserImportMap[pkg] = buildEsmUrl(pkg, version);
  }
}
```

## Performance Impact

| Scenario | Time Impact |
|----------|------------|
| All packages on esm.sh (healthy) | +100-200ms (HEAD requests) |
| First CDN fails, second succeeds | +3s per package (timeout) |
| All CDNs fail (worst case) | +9s per package (3s × 3 CDNs) |

**Optimization**: Prebuilt bundles bypass CDN verification entirely, so common packages (React, Radix UI) have zero overhead.

## Monitoring

### Success Case Logs
```
[req-123] Using esm.sh for lodash@4.17.21
[req-123] Using esm.sh for axios@1.4.0
[req-123] Bundle complete: 1234ms total
```

### Fallback Case Logs
```
[req-123] Trying esm.sh for lodash@4.17.21...
[req-123] ✗ esm.sh failed for lodash
[req-123] Trying esm.run for lodash@4.17.21...
[req-123] ✓ esm.run works for lodash
[req-123] Using esm.run for lodash@4.17.21
[req-123] Bundle complete: 4567ms total
```

### Complete Failure Logs
```
[req-123] Trying esm.sh for invalid-package@1.0.0...
[req-123] ✗ esm.sh failed for invalid-package
[req-123] Trying esm.run for invalid-package@1.0.0...
[req-123] ✗ esm.run failed for invalid-package
[req-123] Trying jsdelivr for invalid-package@1.0.0...
[req-123] ✗ jsdelivr failed for invalid-package
[req-123] All CDN providers failed for invalid-package@1.0.0
[req-123] No CDN available for invalid-package@1.0.0, using esm.sh as fallback
```

## Testing CDN Health

You can check all CDN providers' health status:

```typescript
import { getCdnHealthStatus } from '../_shared/cdn-fallback.ts';

const health = await getCdnHealthStatus(requestId);
// [
//   { provider: 'esm.sh', healthy: true },
//   { provider: 'esm.run', healthy: true },
//   { provider: 'jsdelivr', healthy: true }
// ]
```

## Browser Experience

From the user's perspective:

1. **esm.sh healthy**: No change, artifacts load as before
2. **esm.sh down, fallback works**: Slightly slower bundling, but artifact loads successfully
3. **All CDNs down**: Bundling succeeds, but artifact may fail to load in browser (runtime error)

The last case is handled by browser-side error handling that shows a user-friendly message:

```
Failed to load dependencies. Check your internet connection and refresh.
```
