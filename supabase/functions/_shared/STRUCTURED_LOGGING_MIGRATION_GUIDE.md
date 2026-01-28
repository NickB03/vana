# Structured Logging Migration Guide

This guide shows how to migrate Edge Functions from `console.log`/`console.error` to structured logging.

## Implementation Pattern

### 1. Import the Logger

```typescript
import { createLogger } from "../_shared/logger.ts";
```

### 2. Initialize Logger at Request Start

```typescript
serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  // Generate requestId and create logger IMMEDIATELY after CORS check
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  const logger = createLogger({
    requestId,
    functionName: 'your-function-name'  // e.g., 'chat', 'generate-artifact'
  });

  try {
    // Log incoming request
    logger.request(req.method, '/your-endpoint');

    // Your function logic...
```

### 3. Replace console.log with Structured Logging

#### Before (Old Pattern):
```typescript
console.log(`[${requestId}] Processing request for session:`, sessionId);
console.log(`[${requestId}] Request body:`, JSON.stringify({
  messages: messages?.length,
  sessionId,
  isGuest
}));
```

#### After (Structured Pattern):
```typescript
logger.info('request_processing', {
  sessionId,
  messageCount: messages?.length,
  isGuest
});
```

### 4. Replace Validation Errors

#### Before:
```typescript
console.error(`[${requestId}] Invalid messages format`);
return new Response(
  JSON.stringify({ error: "Invalid messages format", requestId }),
  { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
);
```

#### After:
```typescript
logger.validationError('messages', 'invalid_format', {
  expectedType: 'array',
  receivedType: typeof messages
});
return new Response(
  JSON.stringify({ error: "Invalid messages format", requestId }),
  { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-ID": requestId } }
);
```

### 5. Add User Context with Child Logger

After authenticating the user:

```typescript
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  // Create child logger with user context
  const userLogger = logger.child({ userId: user.id });
  userLogger.info('user_authenticated', {
    userEmail: user.email // Be careful with PII
  });

  // Use userLogger for the rest of the request
}
```

### 6. Log AI Model Calls

```typescript
const apiStartTime = Date.now();
userLogger.aiCall('openrouter', 'gemini-flash', {
  messageCount: messages.length,
  temperature: 0.7,
  maxTokens: 8000
});

const response = await callGeminiFlashWithRetry(messages, options);
const apiDuration = Date.now() - apiStartTime;

userLogger.externalApi('openrouter', '/chat/completions', response.status, apiDuration, {
  success: response.ok,
  retries: retryCount
});
```

### 7. Log Database Operations

```typescript
const dbStartTime = Date.now();
const { data, error } = await supabase
  .from('chat_sessions')
  .select('*')
  .eq('id', sessionId)
  .single();

const dbDuration = Date.now() - dbStartTime;
userLogger.dbQuery('chat_sessions', 'SELECT', dbDuration, {
  sessionId,
  found: !!data
});
```

### 8. Log Rate Limit Checks

```typescript
if (rateLimitResult && !rateLimitResult.allowed) {
  logger.rateLimit(
    true, // exceeded
    rateLimitResult.remaining,
    rateLimitResult.total,
    { userType: isGuest ? 'guest' : 'authenticated' }
  );
  return errors.rateLimited(...);
}

// Rate limit not exceeded
logger.rateLimit(
  false,
  rateLimitResult.remaining,
  rateLimitResult.total,
  { userType: isGuest ? 'guest' : 'authenticated' }
);
```

### 9. Log Response Completion

Before returning the final response:

```typescript
const totalDuration = Date.now() - startTime;
userLogger.response(200, totalDuration, {
  responseSize: content.length,
  artifactType: 'react',
  cached: false
});

return new Response(content, {
  headers: { ...corsHeaders, "X-Request-ID": requestId }
});
```

### 10. Error Handling

Replace `console.error` in catch blocks:

#### Before:
```typescript
catch (e) {
  console.error(`[${requestId}] ❌ Chat function error:`, e);
  console.error(`[${requestId}] Error name:`, e?.name);
  console.error(`[${requestId}] Error stack:`, e?.stack);

  return new Response(
    JSON.stringify({ error: "An error occurred", requestId }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

#### After:
```typescript
catch (e) {
  logger.error('function_execution_failed', e as Error, {
    functionName: 'chat',
    hasSession: !!sessionId,
    messageCount: messages?.length
  });

  const totalDuration = Date.now() - startTime;
  logger.response(500, totalDuration);

  return new Response(
    JSON.stringify({ error: "An error occurred", requestId }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-ID": requestId } }
  );
}
```

## Logging Best Practices

### Message Naming Convention

Use **snake_case** for log messages to enable easy querying:

- ✅ `request_received`
- ✅ `user_authenticated`
- ✅ `artifact_generated`
- ✅ `rate_limit_exceeded`
- ❌ `Request Received` (spaces)
- ❌ `requestReceived` (camelCase)

### Data to Include

**Always include:**
- Operation identifiers (sessionId, userId, artifactId)
- Performance metrics (durationMs, latency)
- Status indicators (success, retries, attempts)

**Be careful with:**
- PII (Personally Identifiable Information)
- API keys or secrets
- Full message content (truncate to first 100 chars)

**Example:**
```typescript
logger.info('message_processed', {
  sessionId,
  messageLength: message.length,
  messagePreview: message.substring(0, 100), // Truncated
  durationMs: processingTime
  // ❌ DON'T: fullMessage: message (could be sensitive)
  // ❌ DON'T: apiKey: API_KEY (never log secrets)
});
```

### Log Levels

- **debug**: Development-only logs, internal state
- **info**: Normal operations (requests, completions, state changes)
- **warn**: Recoverable issues (validation failures, degraded mode)
- **error**: Unrecoverable errors (exceptions, service failures)

## Benefits of Structured Logging

1. **Queryable**: Filter logs by requestId, userId, sessionId
2. **Correlatable**: Track a request across multiple operations
3. **Parseable**: JSON format allows automated analysis
4. **Standardized**: Consistent format across all Edge Functions
5. **Performance-ready**: Track latency, identify bottlenecks
6. **Production-safe**: Terser won't strip these (console.log format)

## Example: Complete Migration

See `/Users/nick/Projects/llm-chat-site/supabase/functions/generate-title/index.ts` for a complete example of a migrated Edge Function with:

- Request logging
- Validation error logging
- Authentication logging
- AI call logging
- External API logging
- Response logging
- Error handling

## Query Examples

Once deployed, you can query logs using Supabase Dashboard:

```bash
# Get all errors for a specific requestId
supabase functions logs generate-artifact | grep "req-abc-123" | grep '"level":"error"'

# Get all AI calls that took > 5 seconds
supabase functions logs chat | jq 'select(.message == "external_api_call" and .data.durationMs > 5000)'

# Track a user's session across all functions
supabase functions logs | jq 'select(.userId == "user-123" and .sessionId == "session-456")'
```

## Migration Checklist

For each Edge Function:

- [ ] Import `createLogger` from `_shared/logger.ts`
- [ ] Generate `requestId` immediately after CORS check
- [ ] Create logger with `requestId` and `functionName`
- [ ] Replace all `console.log` with `logger.info/debug`
- [ ] Replace all `console.error` with `logger.error`
- [ ] Add `X-Request-ID` header to all responses
- [ ] Use child logger with `userId` after authentication
- [ ] Log request start with `logger.request()`
- [ ] Log response completion with `logger.response()`
- [ ] Log AI calls with `logger.aiCall()`
- [ ] Log external APIs with `logger.externalApi()`
- [ ] Log database queries with `logger.dbQuery()`
- [ ] Log rate limits with `logger.rateLimit()`
- [ ] Log validation errors with `logger.validationError()`
- [ ] Include `requestId` in all error responses
- [ ] Test that logs are valid JSON format
