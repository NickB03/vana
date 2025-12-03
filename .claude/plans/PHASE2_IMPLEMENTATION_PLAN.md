# Phase 2: Reliability Improvements - Detailed Implementation Plan

**Created**: 2025-12-01
**Status**: Ready for Implementation
**Estimated Effort**: 4-6 hours
**Dependencies**: Phase 1 Complete ✅

---

## Executive Summary

Phase 2 focuses on **reliability improvements** that enhance the artifact generation experience after Phase 1's critical React instance fixes. The three main objectives are:

1. **Artifact Rendered Signal** - Ensure "Done" state only shows after artifact is visibly rendered
2. **Structured Error Recovery** - Intelligent fallback system with automatic retry strategies
3. **CSP Verification & Hardening** - Confirm data: URLs work correctly for import map shims

---

## Pre-Implementation Checklist

Before starting Phase 2, verify Phase 1 is deployed and working:

- [ ] Phase 1 PR merged to main
- [ ] Deployed to staging: `./scripts/deploy-simple.sh staging`
- [ ] Test: Generate Radix UI artifact → no dual React errors
- [ ] Test: Check Network tab shows `?external=react,react-dom` in esm.sh URLs
- [ ] Test: Bundle timeout allows 60s for complex dependency trees

---

## Task 2.1: Artifact Rendered Signal

### Problem Statement

Currently, `ReasoningDisplay` shows completion state ("Thought process" with final status) when SSE streaming ends. However, the artifact iframe may still be:
- Loading bundle from Supabase Storage
- Parsing and executing JavaScript
- Rendering React component tree
- Mounting to DOM

This creates a jarring UX where the reasoning pill says "Done" but the artifact area shows a blank frame or skeleton.

### Solution Architecture

Implement bidirectional postMessage communication between artifact iframe and parent:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Parent Window                           │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │  ReasoningDisplay   │    │     ArtifactRenderer            │ │
│  │  ───────────────────│    │  ─────────────────────────────  │ │
│  │  isComplete =       │◄───│  artifactRenderedComplete       │ │
│  │  reasoningComplete  │    │       ▲                         │ │
│  │  && artRendered     │    │       │ postMessage             │ │
│  └─────────────────────┘    │  ┌────┴───────────────────────┐ │ │
│                              │  │       Iframe (blob:)        │ │ │
│                              │  │  window.parent.postMessage( │ │ │
│                              │  │    { type: 'artifact-       │ │ │
│                              │  │      rendered-complete' },  │ │ │
│                              │  │    '*'                      │ │ │
│                              │  │  )                          │ │ │
│                              │  └─────────────────────────────┘ │ │
│                              └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Steps

#### Step 2.1.1: Server-Side - Add Rendered Signal to Bundle Template

**File**: `supabase/functions/bundle-artifact/index.ts`
**Location**: HTML template section (around line 500-550)

**Add to the `<script>` section of the generated HTML**:

```typescript
// Add after the Tailwind CDN and React UMD scripts, before the component module
const renderedSignalScript = `
  <script>
    // Notify parent when artifact is fully rendered
    (function() {
      // Track if we've already sent the signal
      let signalSent = false;

      function sendRenderedSignal() {
        if (signalSent) return;
        signalSent = true;

        try {
          window.parent.postMessage({
            type: 'artifact-rendered-complete',
            timestamp: Date.now()
          }, '*');
          console.log('[Artifact] Rendered signal sent to parent');
        } catch (e) {
          console.warn('[Artifact] Failed to send rendered signal:', e);
        }
      }

      // Strategy 1: MutationObserver for React mount
      const rootEl = document.getElementById('root');
      if (rootEl) {
        const observer = new MutationObserver((mutations, obs) => {
          // Check if root has meaningful content (not just whitespace)
          if (rootEl.children.length > 0 || rootEl.textContent.trim().length > 0) {
            sendRenderedSignal();
            obs.disconnect();
          }
        });
        observer.observe(rootEl, { childList: true, subtree: true });

        // Fallback timeout if observer doesn't trigger
        setTimeout(() => {
          if (!signalSent) {
            console.log('[Artifact] Fallback timeout - sending signal');
            sendRenderedSignal();
          }
        }, 5000);
      }

      // Strategy 2: Load event as backup
      window.addEventListener('load', () => {
        // Give React a frame to mount
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            sendRenderedSignal();
          });
        });
      });

      // Strategy 3: Error handling - still send signal so UI doesn't hang
      window.addEventListener('error', (e) => {
        console.error('[Artifact] Error occurred:', e.message);
        // Send signal even on error so ReasoningDisplay doesn't hang
        setTimeout(sendRenderedSignal, 100);
      });
    })();
  </script>
`;
```

**Insert Location**: After the import map script, before the component module script.

#### Step 2.1.2: Client-Side Babel Renderer - Add Same Signal

**File**: `src/components/ArtifactRenderer.tsx`
**Location**: `ReactArtifactFrame` component's HTML generation (around line 350-400)

Add the same rendered signal script to client-side Babel-transpiled artifacts for consistency.

#### Step 2.1.3: Create Message Handler Hook

**File**: `src/hooks/useArtifactRenderedSignal.ts` (NEW FILE)

```typescript
import { useState, useEffect, useCallback } from 'react';

interface ArtifactRenderedSignal {
  type: 'artifact-rendered-complete';
  timestamp: number;
}

interface UseArtifactRenderedSignalOptions {
  /** Session ID to track signals for specific session */
  sessionId?: string;
  /** Timeout in ms before auto-complete (prevents hanging) */
  timeoutMs?: number;
}

interface UseArtifactRenderedSignalReturn {
  /** Whether the artifact has signaled complete render */
  isArtifactRendered: boolean;
  /** Reset the signal state (for new artifacts) */
  reset: () => void;
  /** Manually mark as rendered (for fallback) */
  markRendered: () => void;
}

/**
 * Hook to track artifact iframe rendered signals
 *
 * Listens for postMessage from artifact iframes indicating they've
 * completed rendering. Includes timeout fallback to prevent hanging.
 */
export function useArtifactRenderedSignal(
  options: UseArtifactRenderedSignalOptions = {}
): UseArtifactRenderedSignalReturn {
  const { timeoutMs = 10000 } = options;
  const [isArtifactRendered, setIsArtifactRendered] = useState(false);

  const reset = useCallback(() => {
    setIsArtifactRendered(false);
  }, []);

  const markRendered = useCallback(() => {
    setIsArtifactRendered(true);
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleMessage = (event: MessageEvent) => {
      // Validate message structure
      if (
        event.data &&
        typeof event.data === 'object' &&
        event.data.type === 'artifact-rendered-complete'
      ) {
        console.log('[useArtifactRenderedSignal] Received rendered signal');
        setIsArtifactRendered(true);

        // Clear timeout since we got the signal
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    // Listen for postMessage from iframes
    window.addEventListener('message', handleMessage);

    // Fallback timeout to prevent indefinite waiting
    timeoutId = setTimeout(() => {
      if (!isArtifactRendered) {
        console.log('[useArtifactRenderedSignal] Timeout - marking as rendered');
        setIsArtifactRendered(true);
      }
    }, timeoutMs);

    return () => {
      window.removeEventListener('message', handleMessage);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [timeoutMs, isArtifactRendered]);

  return { isArtifactRendered, reset, markRendered };
}
```

#### Step 2.1.4: Integrate with useChatMessages

**File**: `src/hooks/useChatMessages.tsx`
**Location**: Near the streaming state management

Add new state and props:

```typescript
// Add to StreamProgress interface
export interface StreamProgress {
  // ... existing fields ...
  artifactRendered?: boolean; // NEW: Track artifact render completion
}

// In the hook, add:
const [artifactRenderedComplete, setArtifactRenderedComplete] = useState(false);

// In the message event listener (EventSource handler):
// Add a new case for artifact-rendered-complete messages from postMessage
// This will be handled via the useArtifactRenderedSignal hook in the component
```

#### Step 2.1.5: Update ReasoningDisplay Integration

**File**: `src/components/ReasoningDisplay.tsx` or parent component that uses it

The component that renders `ReasoningDisplay` needs to pass the artifact rendered state:

```typescript
// In the parent component (e.g., ChatMessage or MessageWithArtifacts)
const { isArtifactRendered, reset } = useArtifactRenderedSignal();

// Reset when a new message starts streaming
useEffect(() => {
  if (isStreaming) {
    reset();
  }
}, [isStreaming, reset]);

// Pass to ReasoningDisplay
<ReasoningDisplay
  isStreaming={isStreaming}
  reasoningComplete={!isStreaming && hasReasoning}
  artifactRenderedComplete={isArtifactRendered || !hasArtifact}
  // ... other props
/>
```

Update `ReasoningDisplay` to accept and use the new prop:

```typescript
interface ReasoningDisplayProps {
  // ... existing props ...
  /** Whether the artifact iframe has signaled render complete */
  artifactRenderedComplete?: boolean;
}

// In the component:
const isComplete = !isStreaming && (!hasArtifact || artifactRenderedComplete);
```

### Testing Checklist for 2.1

- [ ] Generate simple React artifact → verify signal received
- [ ] Generate complex Radix UI artifact → verify signal after React mount
- [ ] Trigger bundle error → verify signal still sent (fallback)
- [ ] Check console for "[Artifact] Rendered signal sent" log
- [ ] Verify ReasoningDisplay shows spinner until artifact visible
- [ ] Test 10s timeout fallback if signal never received

---

## Task 2.2: Structured Error Recovery System

### Problem Statement

Current error handling shows error messages but doesn't:
- Classify errors by type
- Suggest recovery actions
- Automatically attempt fallbacks
- Track error patterns for debugging

### Solution Architecture

Create an error classification and recovery system:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Error Recovery Pipeline                       │
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │ Error       │───►│ Classifier  │───►│ Recovery Strategy   │  │
│  │ Caught      │    │             │    │                     │  │
│  └─────────────┘    │ • Syntax    │    │ • Auto-fix (AI)     │  │
│                      │ • Import    │    │ • Fallback renderer │  │
│                      │ • Runtime   │    │ • Retry with changes│  │
│                      │ • Bundling  │    │ • User action       │  │
│                      │ • Timeout   │    │                     │  │
│                      └─────────────┘    └─────────────────────┘  │
│                                                 │                │
│                                                 ▼                │
│                              ┌───────────────────────────────┐   │
│                              │ Execute Recovery              │   │
│                              │ • Sandpack fallback           │   │
│                              │ • Babel client-side           │   │
│                              │ • Request AI fix              │   │
│                              │ • Show user guidance          │   │
│                              └───────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Steps

#### Step 2.2.1: Create Error Recovery Module

**File**: `src/utils/artifactErrorRecovery.ts` (NEW FILE)

```typescript
/**
 * Artifact Error Recovery System
 *
 * Classifies errors and provides structured recovery strategies.
 * Enables automatic fallbacks and user-friendly error messages.
 */

export type ErrorType =
  | 'syntax'      // Invalid JavaScript/TypeScript syntax
  | 'import'      // Module resolution failures
  | 'runtime'     // React runtime errors (hooks, state, etc.)
  | 'bundling'    // esm.sh or bundle-artifact failures
  | 'timeout'     // Bundle or render timeout
  | 'network'     // Network failures
  | 'csp'         // Content Security Policy violations
  | 'unknown';    // Unclassified errors

export type FallbackRenderer = 'sandpack' | 'babel' | 'static-preview' | 'none';

export type RetryStrategy =
  | 'immediate'           // Retry same operation immediately
  | 'with-ai-fix'         // Request AI to fix the code
  | 'different-renderer'  // Try alternative render method
  | 'simplified'          // Remove problematic dependencies
  | 'none';               // No automatic retry

export interface ArtifactError {
  /** Error classification */
  type: ErrorType;
  /** Original error message */
  message: string;
  /** Stack trace if available */
  stack?: string;
  /** User-friendly explanation */
  userMessage: string;
  /** Suggested fix description */
  suggestedFix?: string;
  /** Whether automatic recovery is possible */
  canAutoRecover: boolean;
  /** Recommended fallback renderer */
  fallbackRenderer: FallbackRenderer;
  /** Recommended retry strategy */
  retryStrategy: RetryStrategy;
  /** Maximum retry attempts for this error type */
  maxRetries: number;
  /** Confidence score (0-1) for classification */
  confidence: number;
  /** Additional context for debugging */
  context?: Record<string, unknown>;
}

/**
 * Error classification patterns
 */
const ERROR_PATTERNS = {
  syntax: [
    /Unexpected token/i,
    /SyntaxError/i,
    /Missing semicolon/i,
    /Unterminated string/i,
    /Invalid left-hand side/i,
    /Unexpected identifier/i,
    /Babel/i,
  ],
  import: [
    /Failed to resolve/i,
    /Module not found/i,
    /Cannot find module/i,
    /Failed to fetch/i,
    /import.*from.*failed/i,
    /esm\.sh.*error/i,
  ],
  runtime: [
    /Cannot read properties of null.*useRef/i,
    /Cannot read properties of null.*useState/i,
    /Invalid hook call/i,
    /Rendered more hooks/i,
    /Maximum update depth exceeded/i,
    /Objects are not valid as a React child/i,
  ],
  bundling: [
    /Bundle.*error/i,
    /Failed to bundle/i,
    /esm\.sh.*timeout/i,
    /Storage.*error/i,
    /blob:.*failed/i,
  ],
  timeout: [
    /timeout/i,
    /timed out/i,
    /took too long/i,
    /AbortError/i,
  ],
  network: [
    /NetworkError/i,
    /fetch failed/i,
    /net::ERR/i,
    /CORS/i,
    /Failed to load/i,
  ],
  csp: [
    /Content Security Policy/i,
    /violates directive/i,
    /refused to execute/i,
    /blocked by CSP/i,
  ],
};

/**
 * Recovery strategies by error type
 */
const RECOVERY_STRATEGIES: Record<ErrorType, Partial<ArtifactError>> = {
  syntax: {
    userMessage: 'The generated code has a syntax error.',
    suggestedFix: 'AI will attempt to fix the syntax issue.',
    canAutoRecover: true,
    fallbackRenderer: 'sandpack', // Sandpack has better error highlighting
    retryStrategy: 'with-ai-fix',
    maxRetries: 2,
  },
  import: {
    userMessage: 'Failed to load a required package.',
    suggestedFix: 'Trying alternative rendering method with better package support.',
    canAutoRecover: true,
    fallbackRenderer: 'sandpack',
    retryStrategy: 'different-renderer',
    maxRetries: 1,
  },
  runtime: {
    userMessage: 'A React runtime error occurred.',
    suggestedFix: 'AI will analyze and fix the component structure.',
    canAutoRecover: true,
    fallbackRenderer: 'none', // Usually code issue, not renderer
    retryStrategy: 'with-ai-fix',
    maxRetries: 2,
  },
  bundling: {
    userMessage: 'Failed to bundle dependencies.',
    suggestedFix: 'Using client-side rendering instead.',
    canAutoRecover: true,
    fallbackRenderer: 'babel',
    retryStrategy: 'different-renderer',
    maxRetries: 1,
  },
  timeout: {
    userMessage: 'The operation timed out.',
    suggestedFix: 'Retrying with simplified approach.',
    canAutoRecover: true,
    fallbackRenderer: 'babel',
    retryStrategy: 'simplified',
    maxRetries: 1,
  },
  network: {
    userMessage: 'Network error occurred.',
    suggestedFix: 'Please check your connection and try again.',
    canAutoRecover: false,
    fallbackRenderer: 'none',
    retryStrategy: 'immediate',
    maxRetries: 2,
  },
  csp: {
    userMessage: 'Security policy blocked the operation.',
    suggestedFix: 'This is a browser security restriction.',
    canAutoRecover: false,
    fallbackRenderer: 'sandpack',
    retryStrategy: 'different-renderer',
    maxRetries: 1,
  },
  unknown: {
    userMessage: 'An unexpected error occurred.',
    suggestedFix: 'Please try regenerating the artifact.',
    canAutoRecover: false,
    fallbackRenderer: 'none',
    retryStrategy: 'none',
    maxRetries: 0,
  },
};

/**
 * Classify an error and return recovery strategy
 */
export function classifyError(
  error: string | Error,
  artifactCode?: string
): ArtifactError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'object' ? error.stack : undefined;

  // Find matching error type
  let matchedType: ErrorType = 'unknown';
  let confidence = 0;

  for (const [type, patterns] of Object.entries(ERROR_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(errorMessage)) {
        matchedType = type as ErrorType;
        confidence = 0.8; // Base confidence for pattern match
        break;
      }
    }
    if (matchedType !== 'unknown') break;
  }

  // Special case: Dual React instance detection
  if (/Cannot read properties of null.*useRef/i.test(errorMessage)) {
    matchedType = 'runtime';
    confidence = 0.95; // Very confident - this is the known dual React issue
  }

  // Get recovery strategy
  const strategy = RECOVERY_STRATEGIES[matchedType];

  return {
    type: matchedType,
    message: errorMessage,
    stack: errorStack,
    confidence,
    context: artifactCode ? { codeLength: artifactCode.length } : undefined,
    ...strategy,
  } as ArtifactError;
}

/**
 * Determine if error is recoverable via automatic fallback
 */
export function canAutoRecover(error: ArtifactError): boolean {
  return error.canAutoRecover && error.maxRetries > 0;
}

/**
 * Get user-friendly error message with action
 */
export function getErrorDisplay(error: ArtifactError): {
  title: string;
  description: string;
  actionLabel?: string;
} {
  return {
    title: error.userMessage,
    description: error.suggestedFix || 'Please try again.',
    actionLabel: error.canAutoRecover
      ? 'Attempting recovery...'
      : 'Try Again',
  };
}

/**
 * Log error for debugging and analytics
 */
export function logArtifactError(
  error: ArtifactError,
  sessionId?: string,
  artifactId?: string
): void {
  console.error('[ArtifactError]', {
    type: error.type,
    message: error.message,
    confidence: error.confidence,
    recovery: {
      canAutoRecover: error.canAutoRecover,
      fallbackRenderer: error.fallbackRenderer,
      retryStrategy: error.retryStrategy,
    },
    context: {
      sessionId,
      artifactId,
      ...error.context,
    },
  });
}
```

#### Step 2.2.2: Integrate Error Recovery into ArtifactRenderer

**File**: `src/components/ArtifactRenderer.tsx`

Add error recovery logic:

```typescript
import {
  classifyError,
  canAutoRecover,
  getErrorDisplay,
  logArtifactError,
  ArtifactError,
  FallbackRenderer
} from '@/utils/artifactErrorRecovery';

// Add state for tracking recovery attempts
const [recoveryAttempts, setRecoveryAttempts] = useState(0);
const [currentFallback, setCurrentFallback] = useState<FallbackRenderer>('none');
const [classifiedError, setClassifiedError] = useState<ArtifactError | null>(null);

// Error handler with classification
const handleArtifactError = useCallback((error: string | Error) => {
  const classified = classifyError(error, artifactCode);
  logArtifactError(classified, sessionId, artifactId);
  setClassifiedError(classified);

  if (canAutoRecover(classified) && recoveryAttempts < classified.maxRetries) {
    setRecoveryAttempts(prev => prev + 1);

    // Execute fallback strategy
    if (classified.fallbackRenderer !== 'none') {
      setCurrentFallback(classified.fallbackRenderer);
      // Trigger re-render with fallback
    } else if (classified.retryStrategy === 'with-ai-fix') {
      // Trigger AI fix request
      onRequestFix?.(classified.message);
    }
  }
}, [artifactCode, recoveryAttempts, sessionId, artifactId, onRequestFix]);
```

#### Step 2.2.3: Update ArtifactContainer with Fallback Logic

**File**: `src/components/ArtifactContainer.tsx`

Add automatic fallback rendering:

```typescript
// In the render logic
const renderArtifact = useMemo(() => {
  // If we have a fallback set, use it
  if (currentFallback === 'sandpack') {
    return (
      <Suspense fallback={<ArtifactSkeleton />}>
        <SandpackArtifactRenderer code={artifact.code} />
      </Suspense>
    );
  }

  if (currentFallback === 'babel') {
    return <ReactArtifactFrame code={artifact.code} />;
  }

  // Default: Use bundled or Babel based on npm imports
  // ... existing logic
}, [currentFallback, artifact.code]);
```

### Testing Checklist for 2.2

- [ ] Trigger syntax error → verify "with-ai-fix" strategy
- [ ] Trigger import error → verify Sandpack fallback
- [ ] Trigger timeout → verify Babel fallback
- [ ] Trigger dual React error → verify high confidence classification
- [ ] Test max retry limit → verify recovery stops after max
- [ ] Verify error logs include classification data

---

## Task 2.3: CSP Verification & Hardening

### Problem Statement

Server bundles use `data:` URLs for import map shims. These require `data:` to be allowed in the Content Security Policy's `script-src` directive. Need to verify this is working and add any missing CSP entries.

### Implementation Steps

#### Step 2.3.1: Verify Current CSP in bundle-artifact

**File**: `supabase/functions/bundle-artifact/index.ts`

Check existing CSP (around line 488-495):

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com https://esm.sh blob: data:;
               style-src 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com;
               font-src https://fonts.gstatic.com;
               img-src 'self' data: blob: https:;
               connect-src 'self' https: wss:;">
```

**Verification**:
1. Confirm `data:` is in `script-src` ✅
2. Confirm `blob:` is in `script-src` (for bundle URL) ✅

#### Step 2.3.2: Add CSP Violation Reporting (Optional Enhancement)

**File**: `supabase/functions/bundle-artifact/index.ts`

Add CSP violation reporting script for debugging:

```typescript
const cspReportingScript = `
  <script>
    // Report CSP violations for debugging
    document.addEventListener('securitypolicyviolation', (e) => {
      console.error('[CSP Violation]', {
        directive: e.violatedDirective,
        blockedURI: e.blockedURI,
        sourceFile: e.sourceFile,
        lineNumber: e.lineNumber
      });

      // Optionally report to parent
      try {
        window.parent.postMessage({
          type: 'csp-violation',
          directive: e.violatedDirective,
          blockedURI: e.blockedURI
        }, '*');
      } catch (err) {}
    });
  </script>
`;
```

#### Step 2.3.3: Client-Side CSP Violation Handling

**File**: `src/components/ArtifactRenderer.tsx`

Add listener for CSP violations from iframes:

```typescript
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'csp-violation') {
      console.error('[Parent] CSP violation in artifact:', event.data);
      // Could trigger error recovery here
    }
  };

  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);
```

### Testing Checklist for 2.3

- [ ] View page source of generated bundle → verify CSP includes `data:`
- [ ] Generate artifact with import map shims → no CSP console errors
- [ ] Test CSP violation reporting (intentionally violate CSP)
- [ ] Verify parent receives CSP violation messages

---

## Files Summary

### Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useArtifactRenderedSignal.ts` | Hook for tracking artifact render completion |
| `src/utils/artifactErrorRecovery.ts` | Error classification and recovery strategies |

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/bundle-artifact/index.ts` | Add rendered signal script, CSP reporting |
| `src/components/ArtifactRenderer.tsx` | Add error recovery integration, rendered signal handling |
| `src/components/ArtifactContainer.tsx` | Add fallback renderer logic |
| `src/components/ReasoningDisplay.tsx` | Accept `artifactRenderedComplete` prop |
| `src/hooks/useChatMessages.tsx` | Add artifact render state tracking |
| `src/components/MessageWithArtifacts.tsx` | Integrate `useArtifactRenderedSignal` hook |

---

## Testing Strategy

### Unit Tests

```typescript
// src/utils/__tests__/artifactErrorRecovery.test.ts
describe('artifactErrorRecovery', () => {
  describe('classifyError', () => {
    it('classifies useRef null error as runtime with high confidence', () => {
      const error = new Error("Cannot read properties of null (reading 'useRef')");
      const result = classifyError(error);
      expect(result.type).toBe('runtime');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('classifies import errors with Sandpack fallback', () => {
      const error = new Error('Failed to resolve module @radix-ui/react-dialog');
      const result = classifyError(error);
      expect(result.type).toBe('import');
      expect(result.fallbackRenderer).toBe('sandpack');
    });

    it('classifies timeout errors with Babel fallback', () => {
      const error = new Error('Bundle operation timed out after 60s');
      const result = classifyError(error);
      expect(result.type).toBe('timeout');
      expect(result.fallbackRenderer).toBe('babel');
    });
  });
});
```

### Integration Tests

```typescript
// src/hooks/__tests__/useArtifactRenderedSignal.test.ts
describe('useArtifactRenderedSignal', () => {
  it('sets isArtifactRendered true when receiving postMessage', () => {
    const { result } = renderHook(() => useArtifactRenderedSignal());

    act(() => {
      window.postMessage({ type: 'artifact-rendered-complete' }, '*');
    });

    expect(result.current.isArtifactRendered).toBe(true);
  });

  it('falls back to rendered after timeout', async () => {
    const { result } = renderHook(() =>
      useArtifactRenderedSignal({ timeoutMs: 100 })
    );

    await waitFor(() => {
      expect(result.current.isArtifactRendered).toBe(true);
    });
  });
});
```

### E2E Tests (Chrome DevTools MCP)

```typescript
// Test artifact rendered signal
await browser.navigate({ url: 'http://localhost:8080' });
// Generate artifact
// Verify console shows "[Artifact] Rendered signal sent"
// Verify ReasoningDisplay updates after artifact visible

// Test error recovery
// Generate artifact that will fail (e.g., invalid import)
// Verify Sandpack fallback triggers
// Verify error is classified correctly
```

---

## Deployment Plan

### Local Testing

```bash
# Start Supabase
supabase start

# Deploy bundle-artifact locally
supabase functions serve bundle-artifact

# Start frontend
npm run dev

# Run tests
npm run test -- src/utils/__tests__/artifactErrorRecovery.test.ts
npm run test -- src/hooks/__tests__/useArtifactRenderedSignal.test.ts
```

### Staging Deployment

```bash
# Deploy to staging
./scripts/deploy-simple.sh staging

# Test on staging environment
# 1. Generate simple artifact → verify rendered signal
# 2. Generate Radix UI artifact → verify no errors
# 3. Force error → verify recovery fallback
```

### Production Deployment

```bash
# After staging verification
./scripts/deploy-simple.sh prod
```

---

## Rollback Plan

Phase 2 is fully backward-compatible:

1. **Rendered Signal**: Removing the script just means ReasoningDisplay shows "Done" earlier (existing behavior)
2. **Error Recovery**: Removing classification just means errors show raw messages (existing behavior)
3. **CSP**: No breaking changes, just better debugging

To rollback:
```bash
git checkout HEAD~1 supabase/functions/bundle-artifact/index.ts
git checkout HEAD~1 src/utils/artifactErrorRecovery.ts
# etc.
supabase functions deploy bundle-artifact --project-ref <ref>
```

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Premature "Done" display | Common | Never |
| Error recovery rate | 0% (no auto-fallback) | 50%+ |
| User-reported render issues | Unknown | -30% |
| CSP violations | Unknown | 0 |

---

## Open Questions

1. **Retry UX**: Should we show retry count to users? ("Attempting fix 1 of 2...")
2. **Error Analytics**: Should we track error types to a backend for monitoring?
3. **Sandpack Integration**: Does the lazy-loaded Sandpack work reliably as fallback?
4. **Timeout Tuning**: Is 10s the right timeout for rendered signal fallback?

---

## Phase 2 Completion Criteria

- [ ] Artifact rendered signal works end-to-end
- [ ] Error recovery system classifies all error types
- [ ] Sandpack fallback works for import errors
- [ ] Babel fallback works for timeout errors
- [ ] CSP includes data: and no violations occur
- [ ] Unit tests pass for new modules
- [ ] Integration tests verify message passing
- [ ] Deployed to staging and verified
- [ ] No regressions in existing functionality
