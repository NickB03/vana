# WebPreview Integration Guide

**Quick Start:** Replace basic iframe with ai-elements WebPreview component

**Estimated Time:** 2-3 hours for basic integration, 6-8 hours with console logging

---

## Step 1: Update Imports

**File:** `src/components/ArtifactContainer.tsx`

**Add these imports:**
```tsx
import { 
  WebPreview, 
  WebPreviewBody, 
  WebPreviewNavigation, 
  WebPreviewUrl,
  WebPreviewNavigationButton 
} from '@/components/ai-elements/web-preview';
import { RefreshCw, Maximize2 } from 'lucide-react';
```

---

## Step 2: Find Current Iframe Rendering

**Current code (around line 400-500):**
```tsx
// Look for this pattern
{artifact.type === 'html' || artifact.type === 'react' ? (
  <iframe
    srcDoc={previewContent}
    className="w-full h-full border-0"
    sandbox="allow-scripts allow-same-origin"
    key={themeRefreshKey}
  />
) : (
  // Other artifact types...
)}
```

---

## Step 3: Replace with WebPreview

**New code:**
```tsx
{artifact.type === 'html' || artifact.type === 'react' ? (
  <WebPreview defaultUrl={getPreviewUrl()}>
    <WebPreviewNavigation>
      {/* Refresh button */}
      <WebPreviewNavigationButton 
        tooltip="Refresh preview"
        onClick={handleRefresh}
      >
        <RefreshCw className="h-4 w-4" />
      </WebPreviewNavigationButton>
      
      {/* URL bar */}
      <WebPreviewUrl />
      
      {/* Full-screen button */}
      <WebPreviewNavigationButton 
        tooltip="Full screen"
        onClick={handleFullScreen}
      >
        <Maximize2 className="h-4 w-4" />
      </WebPreviewNavigationButton>
    </WebPreviewNavigation>
    
    {/* Preview body */}
    <WebPreviewBody 
      src={getPreviewUrl()} 
      key={themeRefreshKey}
      loading={isLoading ? <ArtifactSkeleton type={artifact.type} /> : undefined}
    />
  </WebPreview>
) : (
  // Keep existing rendering for other types
  renderOtherArtifactTypes()
)}
```

---

## Step 4: Add Helper Functions

**Add these functions to ArtifactContainer component:**

```tsx
// Generate preview URL (blob or data URL)
const getPreviewUrl = useCallback(() => {
  if (!previewContent) return '';
  
  // For HTML/React artifacts, create blob URL
  const blob = new Blob([previewContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  // Cleanup on unmount
  return url;
}, [previewContent]);

// Handle refresh
const handleRefresh = useCallback(() => {
  setThemeRefreshKey(prev => prev + 1);
}, []);

// Handle full-screen
const handleFullScreen = useCallback(() => {
  setIsMaximized(true);
}, []);

// Cleanup blob URLs
useEffect(() => {
  return () => {
    // Revoke blob URLs to prevent memory leaks
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
  };
}, [previewUrl]);
```

---

## Step 5: Test Basic Integration

**Manual Testing Checklist:**
- [ ] Generate HTML artifact → displays in WebPreview
- [ ] Generate React artifact → displays in WebPreview
- [ ] Refresh button works
- [ ] URL bar displays blob URL
- [ ] Full-screen button works
- [ ] Theme switching refreshes preview
- [ ] Mobile layout works correctly

**Chrome DevTools Verification:**
```typescript
// Navigate to app
await browser.navigate({ url: "http://localhost:8080" });

// Generate artifact
await browser.fillInput({ selector: 'textarea', value: 'Create a simple HTML page' });
await browser.click({ selector: 'button[type="submit"]' });

// Wait for artifact
await browser.waitFor({ text: 'artifact' });

// Take screenshot
await browser.screenshot({ filename: 'webpreview-test.png' });

// Check for errors
const errors = await browser.getConsoleMessages({ onlyErrors: true });
console.log('Errors:', errors);
```

---

## Step 6: Add Console Logging (Optional)

**Add state for console logs:**
```tsx
const [consoleLogs, setConsoleLogs] = useState<Array<{
  level: 'log' | 'warn' | 'error';
  message: string;
  timestamp: Date;
}>>([]);
```

**Add message listener:**
```tsx
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    // Only accept messages from our iframe
    if (event.data.type === 'console') {
      setConsoleLogs(prev => [...prev, {
        level: event.data.level,
        message: event.data.message,
        timestamp: new Date()
      }]);
    }
  };
  
  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);
```

**Inject console capture into preview:**
```tsx
const getPreviewContentWithConsole = useCallback(() => {
  const consoleScript = `
    <script>
      // Capture console messages
      ['log', 'warn', 'error'].forEach(level => {
        const original = console[level];
        console[level] = function(...args) {
          // Call original
          original.apply(console, args);
          
          // Send to parent
          window.parent.postMessage({
            type: 'console',
            level: level,
            message: args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ')
          }, '*');
        };
      });
    </script>
  `;
  
  // Inject script into HTML
  return previewContent.replace('</head>', `${consoleScript}</head>`);
}, [previewContent]);
```

**Add console panel:**
```tsx
import { WebPreviewConsole } from '@/components/ai-elements/web-preview';

// Add below WebPreviewBody
<WebPreviewConsole 
  logs={consoleLogs}
  onClear={() => setConsoleLogs([])}
/>
```

---

## Step 7: Handle Edge Cases

### Edge Case 1: No `<head>` tag in HTML
```tsx
const injectConsoleScript = (html: string) => {
  const consoleScript = `<script>/* console capture */</script>`;
  
  if (html.includes('</head>')) {
    return html.replace('</head>', `${consoleScript}</head>`);
  } else if (html.includes('<body>')) {
    return html.replace('<body>', `${consoleScript}<body>`);
  } else {
    return `${consoleScript}${html}`;
  }
};
```

### Edge Case 2: React artifacts (JSX)
```tsx
// React artifacts need to be wrapped in HTML
const wrapReactArtifact = (jsx: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
        <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
        ${getConsoleScript()}
      </head>
      <body>
        <div id="root"></div>
        <script type="text/babel">
          ${jsx}
          
          const root = ReactDOM.createRoot(document.getElementById('root'));
          root.render(<App />);
        </script>
      </body>
    </html>
  `;
};
```

### Edge Case 3: Sandpack artifacts
```tsx
// If using Sandpack, don't use WebPreview
{artifact.type === 'react' && hasSandpackImports ? (
  <SandpackArtifactRenderer artifact={artifact} />
) : artifact.type === 'html' || artifact.type === 'react' ? (
  <WebPreview defaultUrl={getPreviewUrl()}>
    {/* WebPreview content */}
  </WebPreview>
) : (
  // Other types
)}
```

---

## Step 8: Verify with Chrome DevTools MCP

**Full verification script:**
```bash
# Start Chrome MCP
chrome-mcp start

# Run verification
npm run dev

# In Claude Code:
/chrome-status
```

**Verification steps:**
1. Navigate to http://localhost:8080
2. Generate HTML artifact
3. Verify WebPreview renders
4. Click refresh button
5. Check URL bar
6. Generate console.log in artifact
7. Verify console panel shows logs
8. Take screenshot
9. Check for errors

---

## Rollback Plan

If issues occur:

```bash
# Revert changes
git checkout HEAD -- src/components/ArtifactContainer.tsx

# Or manually restore iframe
{artifact.type === 'html' || artifact.type === 'react' ? (
  <iframe
    srcDoc={previewContent}
    className="w-full h-full border-0"
    sandbox="allow-scripts allow-same-origin"
    key={themeRefreshKey}
  />
) : (
  // Other types
)}
```

---

## Success Criteria

- ✅ HTML artifacts display in WebPreview
- ✅ React artifacts display in WebPreview
- ✅ Navigation controls functional
- ✅ URL bar displays correctly
- ✅ Refresh button works
- ✅ Console logging captures messages (optional)
- ✅ No regressions in other artifact types
- ✅ Mobile responsive
- ✅ No console errors
- ✅ Performance acceptable (< 1s to render)

---

## Next Steps

After WebPreview integration:
1. Add device mode switching (desktop/tablet/mobile)
2. Add back/forward navigation (if needed)
3. Implement streaming artifacts (see ARTIFACT_FIXES_IMPLEMENTATION_PLAN.md Phase 2)
4. Add unit tests for WebPreview integration

---

**Estimated Time:**
- Basic integration: 2-3 hours
- With console logging: 6-8 hours
- With full testing: 8-10 hours
