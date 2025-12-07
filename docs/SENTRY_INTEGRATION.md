# Sentry Error Monitoring Integration

This document explains how Sentry error monitoring works in Vana and how to configure it.

## Overview

Sentry is an error monitoring platform that helps track, diagnose, and fix production errors in real-time. Vana uses `@sentry/react` (v10.29.0) to capture:

- **Unhandled exceptions** — JavaScript errors that crash components
- **Validation failures** — Malformed data from AI responses
- **Performance traces** — Slow operations (sampled at 10%)

## How It Works

### 1. Initialization (`src/main.tsx`)

Sentry initializes **only in production** when `VITE_SENTRY_DSN` is set:

```typescript
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,  // Sample 10% of transactions
    enabled: import.meta.env.PROD,
    // ... filters and tags
  });
}
```

### 2. Error Boundaries

Three React Error Boundaries capture component-level errors and report them to Sentry:

| Error Boundary | Location | Severity | Catches |
|----------------|----------|----------|---------|
| `ArtifactErrorBoundary` | `src/components/ArtifactErrorBoundary.tsx` | `critical` | Artifact rendering failures (iframe, bundling, React compilation) |
| `MessageErrorBoundary` | `src/components/MessageErrorBoundary.tsx` | `low` | Message parsing errors (malformed artifacts, markdown) |
| `ReasoningErrorBoundary` | `src/components/ReasoningErrorBoundary.tsx` | `medium` | Reasoning display failures (AI response parsing) |

Each error boundary:
1. Catches errors via `componentDidCatch`
2. Logs to console for local debugging
3. Reports to Sentry with structured context
4. Shows a user-friendly fallback UI

### 3. Validation Error Reporting

The reasoning parser (`src/types/reasoning.ts`) reports Zod validation failures:

```typescript
Sentry.captureMessage('Invalid reasoning steps', {
  level: 'warning',
  tags: { component: 'ReasoningParser', errorType: 'validation_failure' },
  extra: { zodErrors: error.errors, dataKeys: Object.keys(data) },
});
```

This helps identify when AI models produce malformed responses.

## Error Filtering

Sentry is configured to filter out expected/handled errors to reduce noise:

```typescript
beforeSend(event) {
  // Network errors (handled by UI with retry buttons)
  if (event.exception?.values?.[0]?.value?.includes('NetworkError')) {
    return null;
  }
  // Aborted requests (user cancelled)
  if (event.exception?.values?.[0]?.value?.includes('AbortError')) {
    return null;
  }
  return event;
}
```

## Error Context & Tags

All errors include structured metadata for easier debugging:

### Tags (Indexed, Searchable)
| Tag | Values | Purpose |
|-----|--------|---------|
| `component` | `ArtifactErrorBoundary`, `MessageErrorBoundary`, `ReasoningErrorBoundary`, `ReasoningParser` | Which component caught the error |
| `severity` | `critical`, `medium`, `low` | Prioritization |
| `errorType` | `artifact_render_failure`, `message_render_failure`, `reasoning_display_failure`, `validation_failure` | Error classification |
| `app` | `vana` | Application identifier |
| `version` | App version or `unknown` | Release tracking |

### Contexts (Detailed, Non-Indexed)
| Context | Content |
|---------|---------|
| `react.componentStack` | Full React component tree at time of error |
| `extra.zodErrors` | Validation error details (for parser errors) |
| `extra.dataKeys` | Shape of invalid data (for debugging) |

## Configuration

### Environment Variables

Add to your Cloudflare Pages environment (or `.env.local` for testing):

```bash
# Required for Sentry to work
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Optional: Version tagging for release tracking
VITE_APP_VERSION=1.0.0
```

### Getting Your DSN

1. Go to [sentry.io](https://sentry.io) and create an account/project
2. Navigate to **Settings → Projects → [Your Project] → Client Keys (DSN)**
3. Copy the DSN (looks like `https://abc123@o123456.ingest.sentry.io/1234567`)
4. Set as `VITE_SENTRY_DSN` in Cloudflare Pages environment variables

## Severity Levels

| Level | Used For | Example |
|-------|----------|---------|
| `error` | Critical failures that break functionality | Artifact won't render |
| `warning` | Recoverable issues, validation failures | Malformed AI response, message parse error |
| `info` | Informational events | (not currently used) |

## Testing Sentry Locally

Sentry is **disabled in development** by default. To test locally:

1. Add `VITE_SENTRY_DSN` to `.env.local`
2. Temporarily modify `src/main.tsx`:
   ```typescript
   // Change this:
   if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
   // To this:
   if (import.meta.env.VITE_SENTRY_DSN) {
   ```
3. Trigger an error (e.g., break an artifact's code)
4. Check Sentry dashboard for the error
5. **Revert the change before committing**

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        React App                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   App Component                      │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │           MessageErrorBoundary              │    │   │
│  │  │  ┌───────────────────────────────────────┐  │    │   │
│  │  │  │        ArtifactErrorBoundary          │  │    │   │
│  │  │  │  ┌─────────────────────────────────┐  │  │    │   │
│  │  │  │  │    ReasoningErrorBoundary       │  │  │    │   │
│  │  │  │  │  ┌───────────────────────────┐  │  │  │    │   │
│  │  │  │  │  │      Chat Components      │  │  │  │    │   │
│  │  │  │  │  │  - ReasoningDisplay       │  │  │  │    │   │
│  │  │  │  │  │  - ArtifactContainer      │  │  │  │    │   │
│  │  │  │  │  │  - MessageContent         │  │  │  │    │   │
│  │  │  │  │  └───────────────────────────┘  │  │  │    │   │
│  │  │  │  └──────────────┬──────────────────┘  │  │    │   │
│  │  │  └─────────────────┼─────────────────────┘  │    │   │
│  │  └────────────────────┼────────────────────────┘    │   │
│  └───────────────────────┼─────────────────────────────┘   │
└──────────────────────────┼─────────────────────────────────┘
                           │
                           ▼ componentDidCatch / captureMessage
                    ┌──────────────┐
                    │    Sentry    │
                    │   Dashboard  │
                    └──────────────┘
```

## Best Practices

### When to Add Sentry Reporting

Add `Sentry.captureException()` or `Sentry.captureMessage()` when:
- ✅ An unexpected error occurs that users might not report
- ✅ Data validation fails (AI returned malformed response)
- ✅ A critical feature fails silently

Don't add Sentry reporting when:
- ❌ The error is expected/handled (network retry, user cancellation)
- ❌ The error is already caught by an Error Boundary
- ❌ It would create too much noise (e.g., every validation check)

### Adding New Error Boundaries

When creating a new error boundary, follow this pattern:

```typescript
import * as Sentry from "@sentry/react";

componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  // 1. Log locally for debugging
  console.error("[YourBoundary] Error:", error, errorInfo);

  // 2. Report to Sentry with context
  Sentry.captureException(error, {
    contexts: {
      react: { componentStack: errorInfo.componentStack },
    },
    tags: {
      component: 'YourBoundary',
      severity: 'medium',  // critical | medium | low
      errorType: 'your_error_type',
    },
    level: 'error',  // error | warning
  });

  // 3. Update state for fallback UI
  this.setState({ error, errorInfo });
}
```

## Sentry Dashboard Tips

### Useful Searches
- `component:ArtifactErrorBoundary` — All artifact rendering failures
- `severity:critical` — High-priority issues
- `errorType:validation_failure` — AI response parsing issues
- `environment:production` — Only production errors

### Setting Up Alerts
1. Go to **Alerts → Create Alert Rule**
2. Set conditions (e.g., "When error count > 10 in 1 hour")
3. Choose notification channel (email, Slack, etc.)

## Files Reference

| File | Purpose |
|------|---------|
| `src/main.tsx` | Sentry initialization |
| `src/components/ArtifactErrorBoundary.tsx` | Artifact error handling |
| `src/components/MessageErrorBoundary.tsx` | Message error handling |
| `src/components/ReasoningErrorBoundary.tsx` | Reasoning display error handling |
| `src/types/reasoning.ts` | Validation error reporting |
| `.env.example` | Environment variable documentation |

## Troubleshooting

### Errors Not Appearing in Sentry
1. Verify `VITE_SENTRY_DSN` is set correctly
2. Check you're in production mode (`npm run build && npm run preview`)
3. Verify DSN in browser DevTools: `localStorage.getItem('sentry...')`
4. Check Sentry project's rate limits haven't been exceeded

### Too Many Errors
1. Add more filters in `beforeSend`
2. Check if errors are being thrown in loops
3. Use `Sentry.captureMessage` with `level: 'warning'` for non-critical issues

### Missing Context
1. Ensure `componentStack` is passed from `errorInfo`
2. Add relevant data to `extra` object
3. Use consistent `tags` for searchability
