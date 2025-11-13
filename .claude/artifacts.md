# Artifact System Documentation

Comprehensive guide to the artifact rendering system and available libraries.

## Artifact Types & Formats

| Type | XML Type Attribute | Description | Sandbox |
|------|-------------------|-------------|---------|
| Code | `application/vnd.ant.code` | Syntax-highlighted code | No |
| HTML | `text/html` | Interactive HTML with JS | Yes |
| React | `application/vnd.ant.react` | React components | Yes |
| SVG | `image/svg+xml` | Vector graphics | No |
| Mermaid | `application/vnd.ant.mermaid` | Diagrams | No |
| Markdown | `text/markdown` | Formatted text | No |

## Creating Artifacts

```xml
<artifact type="application/vnd.ant.react" title="Interactive Button">
import { useState } from 'react';

export default function Component() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Clicked {count} times
    </button>
  );
}
</artifact>
```

## Auto-Injected Libraries

### HTML/JavaScript Artifacts (27 Libraries)

**Visualization & Charts**
- `chart.js` (3.9.1) - Canvas-based charts
- `d3` (7.8.5) - Data visualization
- `plotly` (2.26.0) - Scientific charts

**3D Graphics**
- `three.js` (0.157.0) - 3D rendering

**Animation**
- `gsap` (3.12.2) - Professional animation
- `anime` (3.2.1) - Lightweight animations
- `framer-motion` (10.16.4) - React animations
- `animate.css` (4.1.1) - CSS animations

**Creative Coding**
- `p5` (1.7.0) - Processing-like creative coding
- `particles.js` (2.0.0) - Particle effects
- `lottie-web` (5.12.2) - After Effects animations

**Canvas & Graphics**
- `fabric.js` (5.3.0) - Canvas manipulation
- `konva` (9.2.1) - 2D canvas library
- `pixi.js` (7.3.1) - WebGL renderer

**Maps**
- `leaflet` (1.9.4) - Interactive maps

**Icons**
- `feather-icons` (4.29.1) - Simple icons
- `heroicons` (2.0.18) - Tailwind icons
- `phosphor-icons` (2.0.2) - Flexible icon family

**UI Components (Radix UI)**
- `@radix-ui/react-dialog` - Modal dialogs
- `@radix-ui/react-dropdown-menu` - Dropdown menus
- `@radix-ui/react-popover` - Popovers

**UI Utilities**
- `alpinejs` (3.13.1) - Lightweight reactivity
- `sortablejs` (1.15.0) - Drag & drop
- `@formkit/auto-animate` (0.8.0) - Automatic animations

**Utilities**
- `moment` (2.29.4) - Date manipulation
- `axios` (1.5.1) - HTTP client
- `marked` (9.1.0) - Markdown parser
- `highlight.js` (11.9.0) - Syntax highlighting
- `qrcode` (1.5.3) - QR code generator

### React Artifacts (25+ Libraries)

**Pre-loaded in React environment:**
- React, ReactDOM (always available)
- All HTML artifact libraries (above)
- Plus React-specific:
  - `lucide-react` - Icons
  - `recharts` - React charts
  - `react-hook-form` - Forms
  - `zustand` - State management
  - `@radix-ui/*` - All Radix primitives
  - `date-fns` - Date utilities
  - `lodash` - Utility functions
  - `uuid` - ID generation
  - `DOMPurify` - HTML sanitization

**Always Available:**
- Tailwind CSS (configured)
- TypeScript (if needed)

## Library Detection & Auto-Loading

The system automatically detects library usage and loads them:

```javascript
// These trigger auto-loading:
import * as d3 from 'd3';           // Loads D3
const chart = new Chart(...);       // Loads Chart.js
const scene = new THREE.Scene();    // Loads Three.js
L.map('map').setView(...);         // Loads Leaflet
```

## Important Limitations

### Cannot Use in Artifacts
- ❌ `@/components/ui/*` - Local imports unavailable
- ❌ Local file imports - No access to project files
- ❌ Node.js APIs - Browser environment only
- ❌ shadcn/ui components - Use Radix UI instead

### Workaround for shadcn/ui
```jsx
// Instead of shadcn/ui Button:
import * as Dialog from '@radix-ui/react-dialog';

// Build your own with Radix + Tailwind:
<Dialog.Root>
  <Dialog.Trigger className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
    Open
  </Dialog.Trigger>
  <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center">
    {/* Dialog content */}
  </Dialog.Content>
</Dialog.Root>
```

## Error Handling

Artifacts validate through `artifactValidator.ts`:

1. **Syntax Validation** - Checks for parse errors
2. **Security Scan** - Prevents XSS/injection
3. **Library Compatibility** - Ensures dependencies exist
4. **Sandbox Constraints** - Validates browser APIs only

Common errors:
- `Cannot find module '@/components/ui/button'` - Use Radix UI
- `THREE is not defined` - Will auto-load on first render
- `fs is not defined` - Node.js APIs unavailable

## WebPreview Integration (Nov 2025)

### Overview

HTML and React artifacts now render inside **WebPreview** components from ai-elements library, providing a professional browser-like interface with navigation controls.

### What is WebPreview?

WebPreview wraps iframe elements with browser-style UI chrome:
- Navigation bar with action buttons
- URL bar (displays current URL or "about:blank")
- Refresh and full-screen controls
- Optional console panel (not currently implemented)

### Usage in HTML Artifacts

**Implementation:** `src/components/ArtifactContainer.tsx` (lines 528-558)

```tsx
<WebPreview defaultUrl="about:blank" key={`webpreview-${themeRefreshKey}`}>
  <WebPreviewNavigation>
    {/* Refresh button */}
    <WebPreviewNavigationButton tooltip="Refresh preview" onClick={handleRefresh}>
      <RefreshCw className="h-4 w-4" />
    </WebPreviewNavigationButton>

    {/* URL bar */}
    <WebPreviewUrl />

    {/* Full-screen button */}
    <WebPreviewNavigationButton tooltip="Full screen" onClick={handleFullScreen}>
      <Maximize2 className="h-4 w-4" />
    </WebPreviewNavigationButton>
  </WebPreviewNavigation>

  {/* Iframe content */}
  <WebPreviewBody
    srcDoc={previewContent}
    sandbox="allow-scripts allow-same-origin allow-downloads allow-popups"
    loading={isLoading ? <ArtifactSkeleton type="html" /> : undefined}
  />
</WebPreview>
```

**Key Features:**
- Uses `srcDoc` for inline HTML (no blob URL memory leaks)
- Preserves security sandbox attributes
- Shows loading skeleton during render
- Theme-aware via `themeRefreshKey`

### Usage in React Artifacts

**Implementation:** `src/components/ArtifactContainer.tsx` (lines 895-926)

Same structure as HTML artifacts, but uses `reactPreviewContent` which includes:
- React UMD libraries (React, ReactDOM)
- Babel standalone for JSX transformation
- Lucide-react icons
- Recharts for data visualization
- Framer Motion for animations
- Tailwind CSS

```tsx
const reactPreviewContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide-react@0.263.1/dist/umd/lucide-react.js"></script>
  <!-- Other CDN libraries auto-injected -->
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${processedCode}
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<Component />);
  </script>
</body>
</html>`;

<WebPreview defaultUrl="about:blank">
  {/* Same navigation as HTML */}
  <WebPreviewBody srcDoc={reactPreviewContent} />
</WebPreview>
```

### CDN Library Injection

WebPreview works seamlessly with automatic CDN library detection:

**How it works:**
1. `detectAndInjectLibraries(artifact.content)` scans code for library usage
2. Returns CDN `<script>` tags for detected libraries
3. Tags are injected into `<head>` before rendering
4. Libraries available globally in iframe

**Example:**
```javascript
// If artifact contains:
const chart = new Chart(ctx, {...});

// detectAndInjectLibraries() returns:
<script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1"></script>

// Final HTML:
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1"></script>
  <!-- ... -->
</head>
<body>
  <canvas id="chart"></canvas>
  <script>
    const chart = new Chart(ctx, {...}); // Chart.js now available
  </script>
</body>
</html>
```

**Supported Libraries:** See "Auto-Injected Libraries" section above (27+ libraries)

### Navigation Controls

**Refresh Button:**
- Increments `themeRefreshKey` to force component remount
- Shows toast notification: "Preview refreshed"
- Useful for theme changes or manual reload

**Full-Screen Button:**
- Sets `isMaximized` state to `true`
- Artifact expands to `fixed inset-4 z-50`
- Press again to restore normal size

**URL Bar:**
- Displays current iframe source URL
- For `srcDoc` content, shows "about:blank"
- Non-editable (read-only display)

### Theme Synchronization

WebPreview respects system theme changes:

```tsx
// Theme observer
useEffect(() => {
  const observer = new MutationObserver(() => {
    setThemeRefreshKey(prev => prev + 1); // Force remount
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'] // Watch for dark/light class changes
  });
  return () => observer.disconnect();
}, []);

// WebPreview key forces remount on theme change
<WebPreview key={`webpreview-${themeRefreshKey}`}>
```

**Result:** Artifacts automatically update styles when user toggles dark/light mode

### Error Handling

Errors from iframe are captured and displayed above preview:

```tsx
// Inject error capture script
<script>
  window.addEventListener('error', (e) => {
    window.parent.postMessage({
      type: 'artifact-error',
      message: e.message + ' at ' + e.filename + ':' + e.lineno
    }, '*');
  });
</script>

// Listen in parent
useEffect(() => {
  const handleIframeMessage = (e: MessageEvent) => {
    if (e.data?.type === 'artifact-error') {
      setPreviewError(e.data.message);
      setErrorCategory(categorizeError(e.data.message).category);
    }
  };
  window.addEventListener('message', handleIframeMessage);
  return () => window.removeEventListener('message', handleIframeMessage);
}, []);
```

**Error Display:**
- Color-coded by severity (syntax: red, runtime: orange, import: yellow)
- Shows error message with line number
- Provides AI fix button
- Suggests workarounds based on error type

### Security Considerations

**Sandbox Attributes:**
```tsx
sandbox="allow-scripts allow-same-origin allow-downloads allow-popups"
```

**What's Allowed:**
- ✅ JavaScript execution (`allow-scripts`)
- ✅ Same-origin access for CDN libraries (`allow-same-origin`)
- ✅ File downloads (`allow-downloads`)
- ✅ Modal windows (`allow-popups`)

**What's Blocked:**
- ❌ Form submission
- ❌ Top-level navigation
- ❌ Pointer lock
- ❌ Presentation API

**Note:** For untrusted user-generated content, remove `allow-same-origin` to prevent DOM access.

### Known Limitations

1. **Console Logging Not Available**
   - WebPreviewConsole component exists but not integrated
   - Use browser DevTools (F12) to see console output
   - Future enhancement: Capture console.log/warn/error via postMessage

2. **URL Bar Shows "about:blank"**
   - Inline HTML via `srcDoc` has no real URL
   - Could show artifact title instead (future enhancement)

3. **No Back/Forward Navigation**
   - Artifacts are single-page experiences
   - Navigation buttons not needed for current use case

4. **No Device Mode Switching**
   - Cannot toggle between desktop/tablet/mobile viewport sizes
   - Manual browser resize required for responsive testing
   - Future enhancement: Add device mode selector

### Troubleshooting

**Problem:** Artifact not rendering in WebPreview

**Solutions:**
1. Check console for errors (F12)
2. Verify `srcDoc` content is valid HTML
3. Ensure `sandbox` attributes are correct
4. Check if `themeRefreshKey` is incrementing
5. Verify loading state is clearing

**Problem:** Navigation buttons not working

**Solutions:**
1. Check `onClick` handlers are defined
2. Verify state updates are triggering
3. Look for console errors
4. Test in incognito mode (cache issues)

**Problem:** Theme not updating in preview

**Solutions:**
1. Check MutationObserver is running
2. Verify `themeRefreshKey` is incrementing
3. Ensure WebPreview has `key` prop
4. Check theme CSS variables are defined

### Migration from Basic Iframe

**Before:**
```tsx
<iframe
  srcDoc={previewContent}
  className="w-full h-full border-0"
  sandbox="allow-scripts allow-same-origin"
  key={themeRefreshKey}
/>
```

**After:**
```tsx
<WebPreview defaultUrl="about:blank" key={`webpreview-${themeRefreshKey}`}>
  <WebPreviewNavigation>
    <WebPreviewNavigationButton tooltip="Refresh" onClick={handleRefresh}>
      <RefreshCw className="h-4 w-4" />
    </WebPreviewNavigationButton>
    <WebPreviewUrl />
    <WebPreviewNavigationButton tooltip="Full screen" onClick={handleFullScreen}>
      <Maximize2 className="h-4 w-4" />
    </WebPreviewNavigationButton>
  </WebPreviewNavigation>
  <WebPreviewBody
    srcDoc={previewContent}
    sandbox="allow-scripts allow-same-origin"
  />
</WebPreview>
```

**Benefits:**
- Professional browser-style UI
- Navigation controls for better UX
- URL bar for context
- Composable structure for future enhancements
- Consistent with ai-elements design system

### Future Enhancements

**Priority 1: Console Logging**
- Capture console.log/warn/error from artifacts
- Display in WebPreviewConsole panel
- Add clear button and filtering
- Estimated effort: 2-3 hours

**Priority 2: Device Mode Switching**
- Add desktop/tablet/mobile presets
- Apply width constraints to WebPreviewBody
- Add device frame chrome
- Estimated effort: 3-4 hours

**Priority 3: Custom URL Display**
- Show artifact title in URL bar
- Or show "Preview: {title}"
- Better than generic "about:blank"
- Estimated effort: 30 minutes

See `.claude/AI_ELEMENTS_INTEGRATION_FINAL.md` for complete enhancement roadmap.

## Best Practices

1. **Keep artifacts focused** - Single purpose per artifact
2. **Use available libraries** - Don't reinvent the wheel
3. **Test in sandbox** - Verify rendering before delivery
4. **Include all code** - Artifacts must be self-contained
5. **Handle errors gracefully** - Add try-catch blocks
6. **Use WebPreview for interactive content** - HTML/React artifacts benefit from navigation controls
7. **Test theme switching** - Ensure artifacts work in light and dark modes

## Examples

### Interactive Chart
```html
<artifact type="text/html" title="Sales Dashboard">
<canvas id="chart"></canvas>
<script>
  const ctx = document.getElementById('chart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar'],
      datasets: [{
        label: 'Sales',
        data: [12, 19, 8]
      }]
    }
  });
</script>
</artifact>
```

### React Component with Animation
```jsx
<artifact type="application/vnd.ant.react" title="Animated Card">
import { motion } from 'framer-motion';

export default function Component() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-white rounded-lg shadow-lg"
    >
      <h2 className="text-2xl font-bold">Hello World</h2>
    </motion.div>
  );
}
</artifact>
```