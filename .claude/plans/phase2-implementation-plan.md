# Phase 2 Implementation Plan: Reliability Improvements

**Created**: 2025-12-01
**Status**: Ready for Implementation
**Estimated Effort**: 3 hours
**Dependencies**: Phase 1 (Complete)

---

## Overview

Phase 2 focuses on **reliability improvements** that enhance the user experience by:
1. Synchronizing "Done" state with actual artifact rendering
2. Adding structured error recovery with automatic fallbacks
3. Verifying CSP configuration for data URL shims

---

## Task 2.1: Add Artifact Rendered Signal

**Problem**: `ReasoningDisplay` shows "Done" before the artifact actually renders in the iframe, causing a confusing UX where users see completion but no visible artifact.

**Root Cause**: The reasoning stream completes when the SSE connection closes, but the iframe may still be loading dependencies, executing JavaScript, and mounting React components.

### Implementation Steps

#### Step 1: Add postMessage Signal to Server Bundle Template

**File**: `supabase/functions/bundle-artifact/index.ts`

Add after the React component renders in the HTML template:

```html
<script type="module">
  // ... existing code ...

  // After successful render, notify parent
  if (rootElement && typeof App !== 'undefined') {
    const root = ReactDOM.createRoot(rootElement);
    root.render(React.createElement(App));
    console.log('Component rendered successfully');

    // NEW: Signal parent that artifact is fully rendered
    try {
      window.parent.postMessage({
        type: 'artifact-rendered',
        success: true,
        artifactId: '${artifactId}'  // Inject artifact ID
      }, '*');
    } catch (e) {
      console.warn('Could not notify parent of render completion');
    }
  }
</script>
```

Also add error reporting:
```javascript
} catch (error) {
  console.error('Failed to load artifact:', error);
  // NEW: Signal parent about render failure
  try {
    window.parent.postMessage({
      type: 'artifact-rendered',
      success: false,
      error: error.message
    }, '*');
  } catch (e) {}
  // ... existing error handling ...
}
```

#### Step 2: Add postMessage Signal to Client-Side Babel Renderer

**File**: `src/components/ArtifactRenderer.tsx`

In the `BabelArtifactFrame` component, add the same postMessage after successful render:

```typescript
// In the iframe content generation, after ReactDOM render
const iframeContent = `
  // ... existing code ...
  try {
    ReactDOM.createRoot(document.getElementById('root')).render(
      React.createElement(App)
    );
    // Signal parent
    window.parent.postMessage({ type: 'artifact-rendered', success: true }, '*');
  } catch (error) {
    window.parent.postMessage({ type: 'artifact-rendered', success: false, error: error.message }, '*');
    // ... existing error handling ...
  }
`;
```

#### Step 3: Listen for Render Signal in useChatMessages

**File**: `src/hooks/useChatMessages.tsx`

Add state and listener for artifact render completion:

```typescript
// New state
const [artifactRenderStatus, setArtifactRenderStatus] = useState<Record<string, boolean>>({});

// Add message listener in useEffect
useEffect(() => {
  const handleArtifactMessage = (event: MessageEvent) => {
    if (event.data?.type === 'artifact-rendered') {
      const { success, artifactId, error } = event.data;
      setArtifactRenderStatus(prev => ({
        ...prev,
        [artifactId || 'current']: success
      }));

      if (!success && error) {
        console.warn('Artifact render failed:', error);
      }
    }
  };

  window.addEventListener('message', handleArtifactMessage);
  return () => window.removeEventListener('message', handleArtifactMessage);
}, []);
```

#### Step 4: Update ReasoningDisplay to Wait for Render Signal

**File**: `src/components/ReasoningDisplay.tsx`

```typescript
interface ReasoningDisplayProps {
  // ... existing props ...
  artifactRendered?: boolean;  // NEW
}

// Update completion logic
const isFullyComplete = useMemo(() => {
  // Stream must be complete AND artifact must be rendered
  return isComplete && (artifactRendered ?? true);
}, [isComplete, artifactRendered]);

// Use isFullyComplete for "Done" state display
```

### Testing Checklist

- [ ] Generate complex artifact (Recharts + Radix)
- [ ] Verify "Thinking..." shows until artifact visible
- [ ] Check postMessage received in console
- [ ] Test error case - malformed code shows error state
- [ ] Test timeout case - slow bundle still waits correctly
- [ ] Verify no "flash of Done" before artifact appears

### Acceptance Criteria

- [ ] `artifact-rendered` message sent from both bundle and Babel iframes
- [ ] ReasoningDisplay waits for this signal before showing final state
- [ ] Error cases also send signal (with success: false)
- [ ] No regression in existing functionality

---

## Task 2.2: Improve Error Recovery with Structured Fallbacks

**Problem**: When artifacts fail to render, users see error messages but there's no automatic recovery. The system could intelligently try alternative rendering methods.

### Implementation Steps

#### Step 1: Create Error Classification System

**File**: `src/utils/artifactErrorRecovery.ts` (NEW FILE)

```typescript
/**
 * Artifact Error Recovery System
 *
 * Classifies errors and determines appropriate recovery strategies.
 * Supports automatic fallback to different renderers and AI-powered fixes.
 */

export type ErrorType = 'syntax' | 'runtime' | 'import' | 'bundling' | 'timeout' | 'react' | 'unknown';
export type FallbackRenderer = 'sandpack' | 'babel' | 'static-preview';
export type RetryStrategy = 'immediate' | 'with-fix' | 'different-renderer' | 'none';

export interface ArtifactError {
  type: ErrorType;
  message: string;
  originalError: string;
  suggestedFix?: string;
  canAutoFix: boolean;
  fallbackRenderer?: FallbackRenderer;
  retryStrategy: RetryStrategy;
  userMessage: string;  // User-friendly message
}

/**
 * Error patterns and their classifications
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  type: ErrorType;
  canAutoFix: boolean;
  fallbackRenderer?: FallbackRenderer;
  retryStrategy: RetryStrategy;
  userMessage: string;
  suggestedFix?: string;
}> = [
  // Syntax errors - AI can often fix these
  {
    pattern: /SyntaxError|Unexpected token|Unexpected end of input/i,
    type: 'syntax',
    canAutoFix: true,
    retryStrategy: 'with-fix',
    userMessage: 'There\'s a syntax error in the code. Attempting to fix...',
    suggestedFix: 'AI will analyze and fix syntax issues'
  },

  // Import/Module errors - try Sandpack for better npm support
  {
    pattern: /Failed to resolve|Module not found|Cannot find module|Failed to fetch dynamically imported/i,
    type: 'import',
    canAutoFix: false,
    fallbackRenderer: 'sandpack',
    retryStrategy: 'different-renderer',
    userMessage: 'Some dependencies couldn\'t be loaded. Trying alternative renderer...'
  },

  // React-specific errors - often fixable
  {
    pattern: /Cannot read properties of null.*useRef|Invalid hook call|Rendered fewer hooks/i,
    type: 'react',
    canAutoFix: true,
    retryStrategy: 'with-fix',
    userMessage: 'React hook issue detected. Attempting to fix...',
    suggestedFix: 'Check hook usage and component structure'
  },

  // Bundling timeout - fall back to client-side
  {
    pattern: /timeout|Bundle timeout|Request timeout/i,
    type: 'timeout',
    canAutoFix: false,
    fallbackRenderer: 'babel',
    retryStrategy: 'different-renderer',
    userMessage: 'Server bundling took too long. Using client-side rendering...'
  },

  // Runtime errors - may be fixable
  {
    pattern: /TypeError|ReferenceError|is not defined|is not a function/i,
    type: 'runtime',
    canAutoFix: true,
    retryStrategy: 'with-fix',
    userMessage: 'Runtime error encountered. Attempting to fix...'
  }
];

/**
 * Classify an error and determine recovery strategy
 */
export function classifyError(errorMessage: string): ArtifactError {
  const normalizedError = errorMessage.toLowerCase();

  for (const pattern of ERROR_PATTERNS) {
    if (pattern.pattern.test(errorMessage)) {
      return {
        type: pattern.type,
        message: pattern.userMessage,
        originalError: errorMessage,
        suggestedFix: pattern.suggestedFix,
        canAutoFix: pattern.canAutoFix,
        fallbackRenderer: pattern.fallbackRenderer,
        retryStrategy: pattern.retryStrategy,
        userMessage: pattern.userMessage
      };
    }
  }

  // Default classification
  return {
    type: 'unknown',
    message: 'An unexpected error occurred',
    originalError: errorMessage,
    canAutoFix: true,  // Try AI fix for unknown errors
    retryStrategy: 'with-fix',
    userMessage: 'Something went wrong. Attempting to recover...'
  };
}

/**
 * Determine if we should attempt automatic recovery
 */
export function shouldAttemptRecovery(
  error: ArtifactError,
  previousAttempts: number,
  maxAttempts: number = 2
): boolean {
  if (previousAttempts >= maxAttempts) {
    return false;
  }

  // Always try recovery for these error types
  if (error.type === 'import' || error.type === 'timeout') {
    return true;
  }

  // Try auto-fix for fixable errors on first attempt
  if (error.canAutoFix && previousAttempts === 0) {
    return true;
  }

  return false;
}

/**
 * Get appropriate fallback renderer based on error type
 */
export function getFallbackRenderer(error: ArtifactError, currentRenderer: string): FallbackRenderer | null {
  if (!error.fallbackRenderer) {
    return null;
  }

  // Don't suggest the same renderer we're already using
  if (error.fallbackRenderer === currentRenderer) {
    return null;
  }

  return error.fallbackRenderer;
}

/**
 * Generate user-friendly error display with recovery options
 */
export function generateErrorDisplay(error: ArtifactError, isRecovering: boolean): {
  title: string;
  message: string;
  showRetry: boolean;
  showFallback: boolean;
} {
  if (isRecovering) {
    return {
      title: 'Recovering...',
      message: error.userMessage,
      showRetry: false,
      showFallback: false
    };
  }

  return {
    title: error.type === 'unknown' ? 'Error' : `${capitalize(error.type)} Error`,
    message: error.userMessage,
    showRetry: error.canAutoFix,
    showFallback: !!error.fallbackRenderer
  };
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
```

#### Step 2: Integrate Recovery System into ArtifactRenderer

**File**: `src/components/ArtifactRenderer.tsx`

Add error recovery logic:

```typescript
import { classifyError, shouldAttemptRecovery, getFallbackRenderer, type ArtifactError } from '@/utils/artifactErrorRecovery';

// In component
const [recoveryState, setRecoveryState] = useState<{
  attempts: number;
  currentError: ArtifactError | null;
  isRecovering: boolean;
}>({ attempts: 0, currentError: null, isRecovering: false });

const handleArtifactError = useCallback((errorMessage: string) => {
  const classifiedError = classifyError(errorMessage);

  if (shouldAttemptRecovery(classifiedError, recoveryState.attempts)) {
    setRecoveryState(prev => ({
      ...prev,
      attempts: prev.attempts + 1,
      currentError: classifiedError,
      isRecovering: true
    }));

    // Attempt recovery based on error type
    if (classifiedError.fallbackRenderer) {
      // Switch to fallback renderer
      setCurrentRenderer(classifiedError.fallbackRenderer);
    } else if (classifiedError.canAutoFix && onRequestFix) {
      // Request AI fix
      onRequestFix(artifactCode, errorMessage);
    }
  } else {
    // Show final error state
    setRecoveryState(prev => ({
      ...prev,
      currentError: classifiedError,
      isRecovering: false
    }));
  }
}, [recoveryState.attempts, onRequestFix, artifactCode]);
```

#### Step 3: Add Recovery UI Component

**File**: `src/components/ArtifactErrorRecovery.tsx` (NEW FILE)

```typescript
import React from 'react';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { type ArtifactError, generateErrorDisplay } from '@/utils/artifactErrorRecovery';
import { Button } from '@/components/ui/button';

interface ArtifactErrorRecoveryProps {
  error: ArtifactError;
  isRecovering: boolean;
  onRetry: () => void;
  onUseFallback: () => void;
}

export function ArtifactErrorRecovery({
  error,
  isRecovering,
  onRetry,
  onUseFallback
}: ArtifactErrorRecoveryProps) {
  const display = generateErrorDisplay(error, isRecovering);

  if (isRecovering) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-muted-foreground">{display.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4 bg-destructive/10 rounded-lg">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <h3 className="font-semibold">{display.title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        {display.message}
      </p>

      <div className="flex gap-2">
        {display.showRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
        {display.showFallback && error.fallbackRenderer && (
          <Button variant="default" size="sm" onClick={onUseFallback}>
            Use {error.fallbackRenderer === 'sandpack' ? 'Sandpack' : 'Alternative'} Renderer
          </Button>
        )}
      </div>

      {error.originalError && (
        <details className="text-xs text-muted-foreground mt-4">
          <summary className="cursor-pointer">Technical Details</summary>
          <pre className="mt-2 p-2 bg-muted rounded text-left overflow-auto max-w-md">
            {error.originalError}
          </pre>
        </details>
      )}
    </div>
  );
}
```

### Testing Checklist

- [ ] Trigger syntax error - verify AI fix attempted
- [ ] Trigger import error - verify Sandpack fallback offered
- [ ] Trigger timeout - verify client-side fallback used
- [ ] Trigger React hook error - verify AI fix attempted
- [ ] Verify max 2 recovery attempts
- [ ] Verify user-friendly error messages displayed
- [ ] Verify "Technical Details" expandable section works

### Acceptance Criteria

- [ ] All errors classified with recovery strategy
- [ ] Automatic fallback to Sandpack for import errors
- [ ] Automatic fallback to Babel for timeout errors
- [ ] AI fix requested for syntax/runtime errors
- [ ] Clear user messaging about recovery attempts
- [ ] Max 2 recovery attempts before showing final error

---

## Task 2.3: Verify CSP for Data URLs

**Problem**: Server bundles may have CSP issues with `data:` URLs used for import map shims.

**Status**: Pre-verified in Phase 1 - CSP already includes `data:` in script-src.

### Verification Steps

#### Step 1: Confirm Current CSP Configuration

**File**: `supabase/functions/bundle-artifact/index.ts`

Verify the CSP meta tag includes `data:` in `script-src`:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com https://esm.sh blob: data:;
               ...">
```

✅ Already present in the current implementation.

#### Step 2: Add Test for CSP Compliance

**File**: `src/components/__tests__/ArtifactRenderer.test.tsx` (or new test file)

```typescript
describe('CSP Compliance', () => {
  it('should allow data: URLs in script-src', async () => {
    // Generate test artifact
    const html = generateBundleHtml({ code: 'function App() { return null; }', dependencies: {} });

    // Parse CSP from HTML
    const cspMatch = html.match(/Content-Security-Policy".*?content="([^"]+)"/);
    expect(cspMatch).toBeTruthy();

    const csp = cspMatch![1];
    expect(csp).toContain("script-src");
    expect(csp).toContain("data:");
  });
});
```

### Testing Checklist

- [ ] View source of generated bundle HTML
- [ ] Confirm CSP includes `data:` in script-src
- [ ] Test import map shim loading in browser
- [ ] Check console for CSP violation warnings
- [ ] Test in Chrome, Firefox, Safari

### Acceptance Criteria

- [ ] CSP includes `data:` in script-src directive
- [ ] No CSP violations in browser console
- [ ] Import map data URLs load successfully

---

## Implementation Order

1. **Task 2.3** (15 min) - Quick verification, no code changes expected
2. **Task 2.2** (1.5 hours) - Create error recovery system
3. **Task 2.1** (1 hour) - Add render signaling
4. **Testing** (30 min) - End-to-end testing of all changes

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/utils/artifactErrorRecovery.ts` | Error classification and recovery logic |
| `src/components/ArtifactErrorRecovery.tsx` | Recovery UI component |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/bundle-artifact/index.ts` | Add postMessage for render completion |
| `src/components/ArtifactRenderer.tsx` | Add postMessage + integrate recovery system |
| `src/hooks/useChatMessages.tsx` | Listen for artifact-rendered events |
| `src/components/ReasoningDisplay.tsx` | Wait for render signal before "Done" |

---

## Rollback Plan

Phase 2 changes are independently rollback-safe:

1. **Render signaling**: Remove message listener, ReasoningDisplay shows "Done" on stream completion (current behavior)
2. **Error recovery**: Remove recovery system, errors display as before
3. **CSP verification**: No code changes, verification only

---

## Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| "Done" shown before artifact visible | Common | Never |
| Error recovery rate | 0% (manual only) | ~60% (auto-recovery) |
| User-facing error clarity | Technical messages | Friendly messages |
| CSP violations | Potential | None |

---

## Chrome DevTools MCP Test Script

```typescript
// Test render signaling
await browser.navigate({ url: "http://localhost:8080" });

// Generate complex artifact
// ... send prompt for Radix UI component ...

// Verify no premature "Done"
const snapshot1 = await browser.take_snapshot();
// Check ReasoningDisplay still shows "Thinking..."

// Wait for artifact to load
await browser.wait(10000);

const snapshot2 = await browser.take_snapshot();
// Check ReasoningDisplay shows "Done" AND artifact visible

// Check for postMessage in console
const logs = await browser.list_console_messages({ types: ['log'] });
// Should see "artifact-rendered" message
```
