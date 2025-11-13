# AI Elements Quick Reference

Quick reference guide for ai-elements components (`Artifact` and `WebPreview`) used in the application.

---

## Table of Contents

1. [Artifact Component API](#artifact-component-api)
2. [WebPreview Component API](#webpreview-component-api)
3. [Common Patterns](#common-patterns)
4. [Integration Points](#integration-points)
5. [Debugging Guide](#debugging-guide)

---

## Artifact Component API

### Component Hierarchy

```
Artifact (container)
├── ArtifactHeader
│   ├── ArtifactTitle
│   ├── ArtifactDescription (optional)
│   └── ArtifactActions
│       ├── ArtifactAction (buttons with tooltips)
│       └── ArtifactClose (close button)
└── ArtifactContent
    └── (your content here)
```

### Artifact (Root Container)

**Props:** Extends `HTMLAttributes<HTMLDivElement>`

```tsx
<Artifact className="optional-classes">
  {children}
</Artifact>
```

**Default Styles:**
- `flex flex-col overflow-hidden rounded-lg border bg-background shadow-sm`
- Can be overridden with `className` prop

**Usage:**
```tsx
// Basic
<Artifact>...</Artifact>

// Maximized
<Artifact className="fixed inset-4 z-50">...</Artifact>

// Custom styling
<Artifact className="min-h-[600px] max-w-4xl">...</Artifact>
```

### ArtifactHeader

**Props:** Extends `HTMLAttributes<HTMLDivElement>`

```tsx
<ArtifactHeader className="optional-classes">
  {children}
</ArtifactHeader>
```

**Default Styles:**
- `flex items-center justify-between border-b bg-muted/50 px-4 py-3`

**Usage:**
```tsx
<ArtifactHeader>
  <ArtifactTitle>My Title</ArtifactTitle>
  <ArtifactActions>{/* buttons */}</ArtifactActions>
</ArtifactHeader>
```

### ArtifactTitle

**Props:** Extends `HTMLAttributes<HTMLParagraphElement>`

```tsx
<ArtifactTitle className="optional-classes">
  {children}
</ArtifactTitle>
```

**Default Styles:**
- `font-medium text-foreground text-sm`

**Usage:**
```tsx
<ArtifactTitle>Interactive Chart</ArtifactTitle>
<ArtifactTitle className="text-lg">Large Title</ArtifactTitle>
```

### ArtifactDescription

**Props:** Extends `HTMLAttributes<HTMLParagraphElement>`

```tsx
<ArtifactDescription className="optional-classes">
  {children}
</ArtifactDescription>
```

**Default Styles:**
- `text-muted-foreground text-sm`

**Usage:**
```tsx
<ArtifactDescription>
  A visualization of sales data using Chart.js
</ArtifactDescription>
```

### ArtifactActions

**Props:** Extends `HTMLAttributes<HTMLDivElement>`

```tsx
<ArtifactActions className="optional-classes">
  {children}
</ArtifactActions>
```

**Default Styles:**
- `flex items-center gap-1`

**Usage:**
```tsx
<ArtifactActions>
  <ArtifactAction icon={Copy} tooltip="Copy" onClick={handleCopy} />
  <ArtifactAction icon={Download} tooltip="Download" onClick={handleDownload} />
  <ArtifactClose onClick={handleClose} />
</ArtifactActions>
```

### ArtifactAction (Button with Tooltip)

**Props:** Extends `ComponentProps<typeof Button>`

```tsx
interface ArtifactActionProps {
  tooltip?: string;        // Tooltip text
  label?: string;          // Accessible label (sr-only)
  icon?: LucideIcon;       // Icon component from lucide-react
  onClick?: () => void;    // Click handler
  // ...plus all Button props (variant, size, disabled, etc.)
}
```

**Default Styles:**
- `size-8 p-0 text-muted-foreground hover:text-foreground`
- `size="sm"` and `variant="ghost"` by default

**Usage:**
```tsx
// With icon
<ArtifactAction
  icon={Copy}
  tooltip="Copy to clipboard"
  onClick={handleCopy}
/>

// With custom children
<ArtifactAction
  tooltip="Custom action"
  onClick={handleAction}
>
  <CustomIcon className="size-4" />
</ArtifactAction>

// Without tooltip (just button)
<ArtifactAction
  icon={Download}
  label="Download file"
  onClick={handleDownload}
/>

// Disabled state
<ArtifactAction
  icon={Edit}
  tooltip="Edit (locked)"
  disabled={true}
/>
```

**Tooltip Behavior:**
- If `tooltip` prop provided: Wraps button in TooltipProvider
- If no tooltip: Renders plain button
- `label` or `tooltip` used for accessible sr-only text

### ArtifactClose (Close Button)

**Props:** Extends `ComponentProps<typeof Button>`

```tsx
<ArtifactClose
  onClick={handleClose}
  className="optional-classes"
/>
```

**Default Styles:**
- `size-8 p-0 text-muted-foreground hover:text-foreground`
- `size="sm"` and `variant="ghost"` by default
- Default icon: `<XIcon className="size-4" />`

**Usage:**
```tsx
// Basic
<ArtifactClose onClick={onClose} />

// Conditional rendering
{onClose && <ArtifactClose onClick={onClose} />}

// Custom icon
<ArtifactClose onClick={onClose}>
  <CustomCloseIcon />
</ArtifactClose>
```

### ArtifactContent

**Props:** Extends `HTMLAttributes<HTMLDivElement>`

```tsx
<ArtifactContent className="optional-classes">
  {children}
</ArtifactContent>
```

**Default Styles:**
- `flex-1 overflow-auto p-4`

**Usage:**
```tsx
// Basic
<ArtifactContent>
  <div>Your content here</div>
</ArtifactContent>

// No padding (for full-width content)
<ArtifactContent className="p-0">
  <Tabs>...</Tabs>
</ArtifactContent>

// Custom overflow
<ArtifactContent className="overflow-hidden">
  <iframe />
</ArtifactContent>
```

---

## WebPreview Component API

### Component Hierarchy

```
WebPreview (container with context)
├── WebPreviewNavigation
│   ├── WebPreviewNavigationButton (action buttons)
│   └── WebPreviewUrl (URL input)
├── WebPreviewBody (iframe)
└── WebPreviewConsole (optional, collapsible)
```

### WebPreview (Root Container + Context)

**Props:** Extends `ComponentProps<"div">`

```tsx
interface WebPreviewProps {
  defaultUrl?: string;                    // Initial URL (default: "")
  onUrlChange?: (url: string) => void;    // Callback when URL changes
  className?: string;
  children?: ReactNode;
}
```

**Context Provided:**
```tsx
interface WebPreviewContextValue {
  url: string;                  // Current URL
  setUrl: (url: string) => void;  // Update URL
  consoleOpen: boolean;         // Console panel state
  setConsoleOpen: (open: boolean) => void;  // Toggle console
}
```

**Default Styles:**
- `flex size-full flex-col rounded-lg border bg-card`

**Usage:**
```tsx
// Basic
<WebPreview defaultUrl="about:blank">
  {children}
</WebPreview>

// With URL change callback
<WebPreview
  defaultUrl="https://example.com"
  onUrlChange={(url) => console.log('URL changed:', url)}
>
  {children}
</WebPreview>

// With key for forced remount (theme changes)
<WebPreview
  defaultUrl="about:blank"
  key={`webpreview-${themeRefreshKey}`}
>
  {children}
</WebPreview>
```

**Important:** All child components must be inside WebPreview to access context

### WebPreviewNavigation

**Props:** Extends `ComponentProps<"div">`

```tsx
<WebPreviewNavigation className="optional-classes">
  {children}
</WebPreviewNavigation>
```

**Default Styles:**
- `flex items-center gap-1 border-b p-2`

**Usage:**
```tsx
<WebPreviewNavigation>
  <WebPreviewNavigationButton tooltip="Refresh" onClick={handleRefresh}>
    <RefreshCw className="h-4 w-4" />
  </WebPreviewNavigationButton>
  <WebPreviewUrl />
  <WebPreviewNavigationButton tooltip="Full screen" onClick={handleFullScreen}>
    <Maximize2 className="h-4 w-4" />
  </WebPreviewNavigationButton>
</WebPreviewNavigation>
```

### WebPreviewNavigationButton

**Props:** Extends `ComponentProps<typeof Button>`

```tsx
interface WebPreviewNavigationButtonProps {
  tooltip?: string;    // Tooltip text
  onClick?: () => void;
  disabled?: boolean;
  children?: ReactNode;
}
```

**Default Styles:**
- `h-8 w-8 p-0 hover:text-foreground`
- `size="sm"` and `variant="ghost"` by default

**Usage:**
```tsx
// Basic button
<WebPreviewNavigationButton
  tooltip="Refresh preview"
  onClick={handleRefresh}
>
  <RefreshCw className="h-4 w-4" />
</WebPreviewNavigationButton>

// Disabled state
<WebPreviewNavigationButton
  tooltip="Back (disabled)"
  onClick={handleBack}
  disabled={true}
>
  <ArrowLeft className="h-4 w-4" />
</WebPreviewNavigationButton>

// Without tooltip
<WebPreviewNavigationButton onClick={handleAction}>
  <Icon />
</WebPreviewNavigationButton>
```

### WebPreviewUrl

**Props:** Extends `ComponentProps<typeof Input>`

```tsx
interface WebPreviewUrlProps {
  value?: string;       // Controlled value
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  // ...plus all Input props
}
```

**Default Styles:**
- `h-8 flex-1 text-sm`

**Behavior:**
- Displays current URL from context (if not controlled)
- Press Enter to update URL in context
- Automatically syncs with context URL changes

**Usage:**
```tsx
// Basic (uncontrolled, uses context)
<WebPreviewUrl />

// Controlled
<WebPreviewUrl
  value={customUrl}
  onChange={handleUrlChange}
  onKeyDown={handleKeyDown}
/>

// With placeholder
<WebPreviewUrl placeholder="Enter URL..." />

// Read-only
<WebPreviewUrl readOnly />
```

**Context Integration:**
```tsx
// Inside WebPreview, URL state is managed by context
const { url, setUrl } = useWebPreview();

// User types and presses Enter:
setUrl(newUrlValue);  // Updates context

// URL updates automatically in WebPreviewUrl component
```

### WebPreviewBody (Iframe)

**Props:** Extends `ComponentProps<"iframe">`

```tsx
interface WebPreviewBodyProps {
  loading?: ReactNode;  // Loading state component
  src?: string;         // External URL
  srcDoc?: string;      // Inline HTML
  sandbox?: string;     // Sandbox attributes
  className?: string;
  // ...plus all iframe props
}
```

**Default Styles:**
- `size-full` (100% width and height)

**Sandbox Attributes:**
- `allow-scripts allow-same-origin allow-forms allow-popups allow-presentation`

**Usage:**
```tsx
// With inline HTML (srcDoc)
<WebPreviewBody
  srcDoc={htmlContent}
  sandbox="allow-scripts allow-same-origin"
/>

// With external URL (src)
<WebPreviewBody
  src={url}
  sandbox="allow-scripts"
/>

// With loading state
<WebPreviewBody
  srcDoc={htmlContent}
  loading={isLoading ? <Spinner /> : undefined}
/>

// With title
<WebPreviewBody
  srcDoc={htmlContent}
  title="Artifact Preview"
/>
```

**Notes:**
- `srcDoc` has priority over `src` from context
- `src` prop overrides context URL if provided
- Loading component rendered in parent container (not inside iframe)

### WebPreviewConsole (Optional)

**Props:** Extends `ComponentProps<"div">`

```tsx
interface WebPreviewConsoleProps {
  logs?: Array<{
    level: "log" | "warn" | "error";
    message: string;
    timestamp: Date;
  }>;
  children?: ReactNode;
  className?: string;
}
```

**Default Styles:**
- `border-t bg-muted/50 font-mono text-sm`
- Collapsible with animation

**Usage:**
```tsx
// Basic
<WebPreviewConsole logs={consoleLogs} />

// With custom logs
<WebPreviewConsole
  logs={[
    { level: 'log', message: 'Hello', timestamp: new Date() },
    { level: 'error', message: 'Error!', timestamp: new Date() },
  ]}
/>

// Empty state
<WebPreviewConsole logs={[]} />
// Shows: "No console output"
```

**State Management:**
```tsx
const [consoleLogs, setConsoleLogs] = useState([]);

// Capture logs via postMessage
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
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

**Not Currently Integrated:** See `.claude/AI_ELEMENTS_INTEGRATION_FINAL.md` for implementation guide

---

## Common Patterns

### Pattern 1: Basic Artifact Container

```tsx
import { Artifact, ArtifactHeader, ArtifactTitle, ArtifactContent, ArtifactActions, ArtifactAction, ArtifactClose } from '@/components/ai-elements/artifact';
import { Copy, Download } from 'lucide-react';

<Artifact>
  <ArtifactHeader>
    <ArtifactTitle>My Component</ArtifactTitle>
    <ArtifactActions>
      <ArtifactAction icon={Copy} tooltip="Copy code" onClick={handleCopy} />
      <ArtifactAction icon={Download} tooltip="Download" onClick={handleDownload} />
      <ArtifactClose onClick={onClose} />
    </ArtifactActions>
  </ArtifactHeader>
  <ArtifactContent>
    <div>Your content here</div>
  </ArtifactContent>
</Artifact>
```

### Pattern 2: HTML Artifact with WebPreview

```tsx
import { WebPreview, WebPreviewBody, WebPreviewNavigation, WebPreviewUrl, WebPreviewNavigationButton } from '@/components/ai-elements/web-preview';
import { RefreshCw, Maximize2 } from 'lucide-react';

const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <title>My Page</title>
  </head>
  <body>
    <h1>Hello World</h1>
  </body>
</html>`;

<WebPreview defaultUrl="about:blank" key={`webpreview-${refreshKey}`}>
  <WebPreviewNavigation>
    <WebPreviewNavigationButton tooltip="Refresh preview" onClick={handleRefresh}>
      <RefreshCw className="h-4 w-4" />
    </WebPreviewNavigationButton>
    <WebPreviewUrl />
    <WebPreviewNavigationButton tooltip="Full screen" onClick={handleFullScreen}>
      <Maximize2 className="h-4 w-4" />
    </WebPreviewNavigationButton>
  </WebPreviewNavigation>
  <WebPreviewBody
    srcDoc={htmlContent}
    sandbox="allow-scripts allow-same-origin"
    loading={isLoading ? <Skeleton /> : undefined}
  />
</WebPreview>
```

### Pattern 3: Maximizable Artifact

```tsx
const [isMaximized, setIsMaximized] = useState(false);

<Artifact className={isMaximized ? "fixed inset-4 z-50" : "h-full"}>
  <ArtifactHeader>
    <ArtifactTitle>Chart</ArtifactTitle>
    <ArtifactActions>
      <ArtifactAction
        icon={isMaximized ? Minimize2 : Maximize2}
        tooltip={isMaximized ? "Minimize" : "Maximize"}
        onClick={() => setIsMaximized(!isMaximized)}
      />
    </ArtifactActions>
  </ArtifactHeader>
  <ArtifactContent>{/* content */}</ArtifactContent>
</Artifact>
```

### Pattern 4: Theme-Aware WebPreview

```tsx
const [themeRefreshKey, setThemeRefreshKey] = useState(0);

// Watch for theme changes
useEffect(() => {
  const observer = new MutationObserver(() => {
    setThemeRefreshKey(prev => prev + 1);
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });
  return () => observer.disconnect();
}, []);

// Force remount on theme change
<WebPreview key={`webpreview-${themeRefreshKey}`}>
  <WebPreviewBody srcDoc={htmlContent} />
</WebPreview>
```

### Pattern 5: Conditional Action Buttons

```tsx
<ArtifactActions>
  {canCopy && (
    <ArtifactAction icon={Copy} tooltip="Copy" onClick={handleCopy} />
  )}
  {canDownload && (
    <ArtifactAction icon={Download} tooltip="Download" onClick={handleDownload} />
  )}
  {canEdit && (
    <ArtifactAction icon={Edit} tooltip="Edit" onClick={handleEdit} />
  )}
  {onClose && <ArtifactClose onClick={onClose} />}
</ArtifactActions>
```

### Pattern 6: Error Handling in WebPreview

```tsx
const [previewError, setPreviewError] = useState<string | null>(null);

useEffect(() => {
  const handleIframeMessage = (e: MessageEvent) => {
    if (e.data?.type === 'artifact-error') {
      setPreviewError(e.data.message);
    }
  };
  window.addEventListener('message', handleIframeMessage);
  return () => window.removeEventListener('message', handleIframeMessage);
}, []);

// Inject error capture into HTML
const htmlWithErrorCapture = `
  <script>
    window.addEventListener('error', (e) => {
      window.parent.postMessage({
        type: 'artifact-error',
        message: e.message
      }, '*');
    });
  </script>
  ${userHtml}
`;

<div className="relative">
  {previewError && (
    <div className="absolute top-2 left-2 right-2 bg-destructive/10 text-destructive p-2 rounded z-10">
      Error: {previewError}
    </div>
  )}
  <WebPreview>
    <WebPreviewBody srcDoc={htmlWithErrorCapture} />
  </WebPreview>
</div>
```

---

## Integration Points

### File Locations

**Component Files:**
- `src/components/ai-elements/artifact.tsx` (144 lines)
- `src/components/ai-elements/web-preview.tsx` (263 lines)

**Usage Locations:**
- `src/components/ArtifactContainer.tsx` (primary integration)
  - Lines 1-19: Imports
  - Lines 232-240: Helper functions (handleRefresh, handleFullScreen)
  - Lines 528-558: HTML artifact WebPreview
  - Lines 845-933: React artifact WebPreview
  - Lines 993-1042: Artifact container composition

**Dependencies:**
- `@/components/ui/button` (shadcn/ui Button)
- `@/components/ui/tooltip` (shadcn/ui Tooltip)
- `@/components/ui/input` (shadcn/ui Input)
- `@/components/ui/collapsible` (shadcn/ui Collapsible)
- `lucide-react` (icons)
- `@/lib/utils` (cn utility)

### Import Statements

```tsx
// Artifact components
import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactContent,
  ArtifactActions,
  ArtifactAction,
  ArtifactClose
} from '@/components/ai-elements/artifact';

// WebPreview components
import {
  WebPreview,
  WebPreviewBody,
  WebPreviewNavigation,
  WebPreviewUrl,
  WebPreviewNavigationButton,
  WebPreviewConsole
} from '@/components/ai-elements/web-preview';

// Icons
import { Copy, Download, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
```

### State Management

**ArtifactContainer State (9 useState hooks):**
```tsx
const [isMaximized, setIsMaximized] = useState(false);
const [previewError, setPreviewError] = useState<string | null>(null);
const [errorCategory, setErrorCategory] = useState<'syntax' | 'runtime' | 'import' | 'unknown'>('unknown');
const [isLoading, setIsLoading] = useState(true);
const [validation, setValidation] = useState<ValidationResult | null>(null);
const [injectedCDNs, setInjectedCDNs] = useState<string>('');
const [isEditingCode, setIsEditingCode] = useState(false);
const [editedContent, setEditedContent] = useState(artifact.content);
const [themeRefreshKey, setThemeRefreshKey] = useState(0);
```

**WebPreview Context (internal):**
```tsx
// Context created inside WebPreview component
const [url, setUrl] = useState(defaultUrl);
const [consoleOpen, setConsoleOpen] = useState(false);
```

---

## Debugging Guide

### Common Issues

#### Issue 1: "useWebPreview must be used within a WebPreview"

**Cause:** WebPreview child components (WebPreviewUrl, WebPreviewNavigation, etc.) used outside WebPreview context

**Solution:**
```tsx
// ❌ Wrong
<div>
  <WebPreviewUrl />
</div>

// ✅ Correct
<WebPreview>
  <WebPreviewUrl />
</WebPreview>
```

#### Issue 2: Artifact not rendering

**Checklist:**
1. Verify all required sub-components present (ArtifactHeader, ArtifactContent)
2. Check console for TypeScript errors
3. Ensure proper nesting structure
4. Verify imports are correct

**Debug:**
```tsx
console.log('Artifact rendering:', {
  title: artifact.title,
  type: artifact.type,
  contentLength: artifact.content?.length
});
```

#### Issue 3: WebPreview iframe not loading

**Checklist:**
1. Verify `srcDoc` or `src` prop is set
2. Check `sandbox` attributes are correct
3. Look for console errors in browser DevTools (F12)
4. Check if content is valid HTML
5. Verify loading state is clearing

**Debug:**
```tsx
console.log('WebPreview debug:', {
  hasSrcDoc: !!srcDoc,
  srcDocLength: srcDoc?.length,
  sandbox: sandboxAttributes,
  isLoading
});
```

#### Issue 4: Navigation buttons not working

**Checklist:**
1. Verify `onClick` handlers are defined and not undefined
2. Check handler functions are in scope
3. Ensure state updates are triggering
4. Look for errors in console
5. Test with simple console.log in handler

**Debug:**
```tsx
const handleRefresh = useCallback(() => {
  console.log('Refresh clicked');
  setThemeRefreshKey(prev => {
    console.log('Old key:', prev, 'New key:', prev + 1);
    return prev + 1;
  });
  toast.success("Preview refreshed");
}, []);
```

#### Issue 5: Theme not updating in preview

**Checklist:**
1. Verify MutationObserver is running
2. Check `themeRefreshKey` is incrementing
3. Ensure WebPreview has `key` prop
4. Verify theme CSS variables are defined
5. Check if HTML includes theme styles

**Debug:**
```tsx
useEffect(() => {
  console.log('Theme observer registered');
  const observer = new MutationObserver((mutations) => {
    console.log('Theme changed, mutations:', mutations);
    setThemeRefreshKey(prev => prev + 1);
  });
  // ...
}, []);
```

#### Issue 6: Tooltip not appearing

**Checklist:**
1. Verify `tooltip` prop is provided
2. Check shadcn/ui Tooltip component is installed
3. Ensure TooltipProvider is not missing
4. Test hover behavior
5. Check z-index conflicts

**Debug:**
```tsx
<ArtifactAction
  icon={Copy}
  tooltip={tooltip || "No tooltip provided"} // Debug undefined tooltip
  onClick={() => console.log('Button clicked')}
/>
```

### Performance Debugging

**Bundle Size:**
```bash
# Check ai-elements component sizes
npm run build
# Check dist/ folder for artifact.*.js and web-preview.*.js

# Analyze bundle
npx vite-bundle-visualizer
```

**Render Performance:**
```tsx
// Measure render time
const renderStart = performance.now();
const result = renderPreview();
const renderEnd = performance.now();
console.log('Render time:', renderEnd - renderStart, 'ms');
```

**Memory Leaks:**
```tsx
// Check for unmounted setState calls
useEffect(() => {
  let mounted = true;

  const fetchData = async () => {
    const data = await getData();
    if (mounted) {
      setState(data); // Only update if still mounted
    }
  };

  fetchData();

  return () => {
    mounted = false; // Cleanup
  };
}, []);
```

### Browser DevTools

**Check Console:**
```javascript
// Open DevTools (F12) and check for:
- React errors
- TypeScript type errors
- Network request failures
- Unhandled promise rejections
```

**React DevTools:**
```bash
# Install extension
# Chrome: https://chrome.google.com/webstore -> React Developer Tools
# Firefox: https://addons.mozilla.org -> React Developer Tools

# Inspect component tree:
- Find Artifact or WebPreview component
- Check props and state
- Verify context values
- Profile render performance
```

**Network Tab:**
```javascript
// Check if CDN libraries are loading:
- Filter by "Fetch/XHR"
- Look for unpkg.com or cdn.jsdelivr.net requests
- Verify 200 status codes
- Check timing for slow loads
```

---

## Additional Resources

**Full Documentation:**
- `.claude/AI_ELEMENTS_INTEGRATION_FINAL.md` - Complete integration history
- `.claude/WEBPREVIEW_INTEGRATION_GUIDE.md` - Implementation guide
- `.claude/artifacts.md` - Usage patterns and examples

**Source Code:**
- `src/components/ai-elements/artifact.tsx` - Component implementation
- `src/components/ai-elements/web-preview.tsx` - Component implementation
- `src/components/ArtifactContainer.tsx` - Usage example

**Related Guides:**
- shadcn/ui Button: https://ui.shadcn.com/docs/components/button
- shadcn/ui Tooltip: https://ui.shadcn.com/docs/components/tooltip
- Radix UI Primitives: https://www.radix-ui.com/primitives

---

*Last Updated: November 13, 2025*
*Quick Reference Version: 1.0*
