# Structured Logger for Edge Functions

Production-ready structured logging utility for Supabase Edge Functions.

## Quick Start

```typescript
import { createLogger } from "../_shared/logger.ts";

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger({ requestId, functionName: 'chat' });

  try {
    logger.request(req.method, '/chat');

    // Your function logic
    logger.info('message_processed', { sessionId, messageCount: 42 });

    logger.response(200, Date.now() - startTime);
    return new Response(...);
  } catch (error) {
    logger.error('function_failed', error as Error);
    return new Response(...);
  }
});
```

## Features

### Automatic Context Injection

Every log includes:
- `timestamp`: ISO 8601 format
- `level`: debug | info | warn | error
- `message`: Event name (snake_case)
- `requestId`: Request correlation ID
- `userId`: User ID (if set)
- `sessionId`: Session ID (if set)
- `functionName`: Edge Function name

### Child Loggers

Inherit parent context and add new fields:

```typescript
const logger = createLogger({ requestId });
const userLogger = logger.child({ userId: user.id });
const sessionLogger = userLogger.child({ sessionId: session.id });

// All three loggers maintain their own context
sessionLogger.info('message_sent'); // Has requestId + userId + sessionId
```

### Specialized Methods

```typescript
// Request/Response tracking
logger.request('POST', '/chat', { body: 'test' });
logger.response(200, 150, { bytes: 1024 });

// AI model calls
logger.aiCall('openrouter', 'gemini-flash', {
  inputTokens: 100,
  outputTokens: 200
});

// External API calls
logger.externalApi('openrouter', '/chat/completions', 200, 350, {
  retries: 1
});

// Database queries
logger.dbQuery('chat_messages', 'INSERT', 50, { rows: 1 });

// Rate limiting
logger.rateLimit(false, 95, 100, { userType: 'authenticated' });

// Validation errors
logger.validationError('email', 'invalid_format', { value: 'bad' });
```

## Log Levels

### debug
Development-only logs, internal state tracking.

```typescript
logger.debug('cache_hit', { key: 'session:123' });
```

**When to use**: Debugging, development, verbose state

### info
Normal operations, state changes, completions.

```typescript
logger.info('title_generated', { title: 'New Chat', durationMs: 150 });
```

**When to use**: Requests, completions, successful operations

### warn
Recoverable issues, degraded mode, validation failures.

```typescript
logger.warn('authentication_failed', { reason: 'invalid_token' });
```

**When to use**: Validation errors, recoverable failures, warnings

### error
Unrecoverable errors, exceptions, service failures.

```typescript
logger.error('ai_call_failed', error as Error, { model: 'gemini-flash' });
```

**When to use**: Exceptions, critical failures, service errors

## Best Practices

### Message Naming

Use **snake_case** for log messages:

✅ **Good**:
- `request_received`
- `user_authenticated`
- `artifact_generated`
- `rate_limit_exceeded`

❌ **Bad**:
- `Request Received` (spaces)
- `requestReceived` (camelCase)
- `Artifact-Generated` (kebab-case)

### Data to Include

**Always include**:
- Operation identifiers (sessionId, userId, artifactId)
- Performance metrics (durationMs, latency)
- Status indicators (success, retries, attempts)

**Be careful with**:
- PII (Personally Identifiable Information)
- API keys or secrets
- Full message content (truncate to first 100 chars)

```typescript
// ✅ Good
logger.info('message_processed', {
  sessionId,
  messageLength: message.length,
  messagePreview: message.substring(0, 100),
  durationMs: 150
});

// ❌ Bad
logger.info('message_processed', {
  fullMessage: message, // Could contain PII
  apiKey: API_KEY, // Never log secrets
  userId: user.email // Email is PII
});
```

### Performance Tracking

Always measure and log operation duration:

```typescript
const startTime = Date.now();

// ... operation ...

const durationMs = Date.now() - startTime;
logger.info('operation_completed', {
  operation: 'image_generation',
  durationMs,
  success: true
});
```

## Output Format

All logs are JSON formatted:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "ai_call",
  "requestId": "req-abc-123",
  "userId": "user-456",
  "sessionId": "session-789",
  "functionName": "chat",
  "data": {
    "provider": "openrouter",
    "model": "gemini-flash",
    "inputTokens": 100,
    "outputTokens": 200,
    "durationMs": 350
  }
}
```

Error logs include full stack traces:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "error",
  "message": "artifact_validation_failed",
  "requestId": "req-abc-123",
  "error": {
    "name": "ValidationError",
    "message": "Invalid import detected",
    "stack": "ValidationError: Invalid import detected\n  at validateArtifact ..."
  },
  "data": {
    "artifactType": "react",
    "retries": 3
  }
}
```

## Querying Logs

### Supabase CLI

```bash
# Get all logs for a function
supabase functions logs chat

# Get logs for the last hour
supabase functions logs chat --since=1h

# Filter by log level
supabase functions logs chat | jq 'select(.level == "error")'

# Track a specific request
supabase functions logs | jq 'select(.requestId == "req-abc-123")'

# Find slow operations
supabase functions logs | jq 'select(.data.durationMs > 5000)'

# Monitor rate limits
supabase functions logs | jq 'select(.message == "rate_limit_check")'
```

### Supabase Dashboard

1. Go to **Functions** → **Edge Functions**
2. Select your function
3. Click **Logs** tab
4. Use the search/filter interface

## Testing

Run the test suite:

```bash
cd supabase/functions
deno test _shared/__tests__/logger.test.ts
```

Test coverage:
- ✅ 30+ test cases
- ✅ All log levels
- ✅ Context injection
- ✅ Child loggers
- ✅ Specialized methods
- ✅ JSON format validation
- ✅ Timestamp format
- ✅ Error handling

## Migration Guide

See `STRUCTURED_LOGGING_MIGRATION_GUIDE.md` for:
- Step-by-step migration instructions
- Before/after examples
- Complete checklist
- Query examples

## API Reference

### `createLogger(context)`

Create a logger instance with initial context.

**Parameters**:
- `context.requestId?` - Request correlation ID
- `context.userId?` - User ID
- `context.sessionId?` - Session ID
- `context.functionName?` - Edge Function name

**Returns**: `Logger` instance

### `logger.child(additionalContext)`

Create a child logger with inherited + additional context.

**Parameters**:
- `additionalContext` - Partial context to merge

**Returns**: New `Logger` instance

### `logger.debug(message, data?)`

Log debug-level message.

### `logger.info(message, data?)`

Log info-level message.

### `logger.warn(message, data?)`

Log warning-level message.

### `logger.error(message, error, data?)`

Log error-level message with error object.

### `logger.request(method, path?, data?)`

Log incoming request.

### `logger.response(status, durationMs, data?)`

Log response completion with duration.

### `logger.aiCall(provider, model, data?)`

Log AI model invocation.

### `logger.externalApi(service, endpoint, status, durationMs, data?)`

Log external API call.

### `logger.dbQuery(table, operation, durationMs?, data?)`

Log database operation.

### `logger.rateLimit(exceeded, remaining, total, data?)`

Log rate limit check.

### `logger.validationError(field, reason, data?)`

Log validation failure.

## Performance

- **Overhead**: ~1-2ms per log (JSON.stringify)
- **Blocking**: None (console.log is async)
- **Memory**: Minimal (~1KB per log entry)
- **Network**: None (local logging only)

## Production Considerations

- Logs are retained by Supabase (7-30 days depending on plan)
- No additional storage costs
- Terser-safe (won't be stripped in production)
- Compatible with Supabase log aggregation
- Queryable via Supabase CLI and Dashboard

## Examples

See:
- `generate-title/index.ts` - Complete reference implementation
- `STRUCTURED_LOGGING_MIGRATION_GUIDE.md` - Migration patterns
- `__tests__/logger.test.ts` - Test examples

## Support

- **Migration guide**: `_shared/STRUCTURED_LOGGING_MIGRATION_GUIDE.md`
- **Issue tracking**: GitHub Issue #113
- **Tests**: `__tests__/logger.test.ts`
