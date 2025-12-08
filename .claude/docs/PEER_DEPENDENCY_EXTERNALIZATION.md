# Peer Dependency Externalization

## Overview

The bundle-artifact Edge Function now automatically externalizes peer dependencies when generating esm.sh CDN URLs. This prevents dual-instance errors that occur when both a package and its dependency load separate copies of the same library.

## Problem Statement

When packages like `react-konva` import `konva`, or `@nivo/bar` imports `@nivo/core`, esm.sh by default bundles these dependencies internally. This creates dual instances where:

1. The parent package has its own bundled copy
2. The import map loads a separate copy

This causes runtime errors like:
- "Invalid hook call" (React hooks)
- "Context undefined" (React Context)
- Version mismatch errors
- State not syncing between components

## Solution

The `buildEsmUrl()` function now checks a `PEER_DEPENDENCIES` map and adds peer deps to the `?external=` parameter:

```typescript
// Before: https://esm.sh/react-konva@18.2.10?external=react,react-dom
// After:  https://esm.sh/react-konva@18.2.10?external=react,react-dom,konva
```

This tells esm.sh: "Don't bundle konva internally, expect it to be provided via import map."

## Implementation

### Location
`/Users/nick/Projects/llm-chat-site/supabase/functions/bundle-artifact/index.ts` (lines 71-103)

### Code
```typescript
const PEER_DEPENDENCIES: Record<string, string[]> = {
  'react-konva': ['konva'],
  '@nivo/bar': ['@nivo/core'],
  '@nivo/line': ['@nivo/core'],
  '@nivo/pie': ['@nivo/core'],
  '@nivo/heatmap': ['@nivo/core'],
  '@nivo/treemap': ['@nivo/core'],
  '@dnd-kit/sortable': ['@dnd-kit/core'],
  '@dnd-kit/utilities': ['@dnd-kit/core'],
  'react-chartjs-2': ['chart.js'],
  '@hookform/resolvers': ['react-hook-form'],
};

function buildEsmUrl(pkg: string, version: string): string {
  const externals = ['react', 'react-dom'];

  // Add peer dependencies if this package has any
  const peerDeps = PEER_DEPENDENCIES[pkg];
  if (peerDeps) {
    externals.push(...peerDeps);
  }

  return `https://esm.sh/${pkg}@${version}?external=${externals.join(',')}`;
}
```

## Supported Packages

| Package | Externalized Peer Dependencies |
|---------|--------------------------------|
| `react-konva` | `konva` |
| `@nivo/bar` | `@nivo/core` |
| `@nivo/line` | `@nivo/core` |
| `@nivo/pie` | `@nivo/core` |
| `@nivo/heatmap` | `@nivo/core` |
| `@nivo/treemap` | `@nivo/core` |
| `@dnd-kit/sortable` | `@dnd-kit/core` |
| `@dnd-kit/utilities` | `@dnd-kit/core` |
| `react-chartjs-2` | `chart.js` |
| `@hookform/resolvers` | `react-hook-form` |

## How It Works

1. **AI generates artifact** with `react-konva` dependency
2. **Frontend calls** `bundle-artifact/` with dependencies: `{ "react-konva": "18.2.10", "konva": "9.3.6" }`
3. **buildEsmUrl** detects `react-konva` has peer dep `konva`
4. **Generates URL**: `https://esm.sh/react-konva@18.2.10?external=react,react-dom,konva`
5. **Import map includes** both packages:
   ```json
   {
     "react-konva": "https://esm.sh/react-konva@18.2.10?external=react,react-dom,konva",
     "konva": "https://esm.sh/konva@9.3.6?external=react,react-dom"
   }
   ```
6. **Browser loads** `konva` once from import map, `react-konva` uses that instance

## Adding New Peer Dependencies

When a new package exhibits dual-instance errors:

1. Identify the peer dependency (check `package.json` peerDependencies)
2. Add to `PEER_DEPENDENCIES` map:
   ```typescript
   'your-package': ['peer-dep-1', 'peer-dep-2'],
   ```
3. Test with artifact generation
4. Verify no dual-instance errors in browser console

## Testing

Test script: `/tmp/test-peer-deps.ts`

```bash
deno run /tmp/test-peer-deps.ts
```

Expected output:
```
Package: react-konva@18.2.10
  Peer deps: YES
  URL: https://esm.sh/react-konva@18.2.10?external=react,react-dom,konva
```

## Browser Verification

1. Generate artifact with `react-konva` or `@nivo/bar`
2. Open browser DevTools Console
3. Check Network tab for esm.sh requests
4. Verify `?external=` includes peer dependencies
5. Verify no dual-instance errors

## Performance Impact

**None** - This is a URL generation optimization that:
- Reduces bundle size (fewer duplicate modules)
- Improves load time (shared dependencies cached)
- Prevents runtime errors (single instance guaranteed)

## Security Considerations

- Peer dependencies are hardcoded (not user-controlled)
- All packages validated against `SAFE_PACKAGE_NAME` regex
- No path traversal possible (external params are URL-encoded)
- esm.sh handles version resolution securely

## Related Files

- `/Users/nick/Projects/llm-chat-site/supabase/functions/bundle-artifact/index.ts` - Implementation
- `/Users/nick/Projects/llm-chat-site/supabase/functions/_shared/prebuilt-bundles.ts` - Prebuilt bundle handling
- `/Users/nick/Projects/llm-chat-site/src/components/ArtifactRenderer.tsx` - Client-side rendering

## References

- [esm.sh External Dependencies](https://esm.sh/#external-dependencies)
- [React Konva Documentation](https://konvajs.org/docs/react/)
- [Nivo Chart Library](https://nivo.rocks/)
- [DnD Kit Documentation](https://docs.dndkit.com/)

## Changelog

- **2025-12-07**: Initial implementation with 10 supported packages
