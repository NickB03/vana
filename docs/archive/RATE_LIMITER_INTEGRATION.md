# Rate Limiter Integration Guide

This document explains how to integrate the rate limiting system into your chat application.

## Overview

The rate limiter is a client-side utility that prevents API abuse by limiting the number of requests a user can make within a time window. It uses a sliding window algorithm and persists data to localStorage.

## Features

- **Sliding window algorithm** - More accurate than fixed windows
- **localStorage persistence** - Survives page refreshes
- **Memory fallback** - Works even if localStorage is unavailable
- **Multiple rate limit types** - Different limits for different operations
- **User-friendly feedback** - Detailed status information for UI
- **TypeScript type safety** - Full type definitions included
- **Automatic cleanup** - Removes expired entries automatically

## Files

- `/src/utils/rateLimiter.ts` - Main implementation
- `/src/utils/__tests__/rateLimiter.test.ts` - Comprehensive test suite (46 tests)
- `/src/utils/rateLimiter.integration.example.ts` - Integration examples

## Configuration

Default rate limits are defined in `rateLimiter.ts`:

```typescript
export const RATE_LIMITS = {
  chat_messages: {
    limit: 100,        // 100 requests
    window: 3600000,   // per hour
  },
  artifact_creation: {
    limit: 50,
    window: 3600000,
  },
  file_upload: {
    limit: 20,
    window: 3600000,
  },
};
```

You can adjust these values based on your needs.

## Integration Steps

### 1. Update `useChatMessages` Hook

Add rate limiting to the `streamChat` function in `/src/hooks/useChatMessages.tsx`:

```typescript
import {
  checkRateLimit,
  formatTimeUntilReset,
} from "@/utils/rateLimiter";
import { ensureValidSession } from "@/utils/authHelpers";

export function useChatMessages(sessionId: string | undefined) {
  const { toast } = useToast();
  // ... existing code ...

  const streamChat = async (
    userMessage: string,
    onDelta: (chunk: string, progress: StreamProgress) => void,
    onDone: () => void,
    currentArtifact?: { title: string; type: string; content: string }
  ) => {
    if (!sessionId) return;

    // Get user session for rate limiting
    const session = await ensureValidSession();
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please sign in to continue",
        variant: "destructive",
      });
      return;
    }

    // Check rate limit BEFORE processing
    const { allowed, status } = await checkRateLimit(
      session.user.id,
      "chat_messages"
    );

    if (!allowed) {
      const resetTime = formatTimeUntilReset(status.resetInMs);
      toast({
        title: "Rate limit exceeded",
        description: `You've sent ${status.limit} messages in the past hour. Please try again in ${resetTime}.`,
        variant: "destructive",
      });
      return;
    }

    // Optional: Warn when approaching limit
    if (status.remaining <= 10 && status.remaining > 0) {
      toast({
        title: "Approaching rate limit",
        description: `You have ${status.remaining} messages remaining this hour.`,
      });
    }

    setIsLoading(true);

    // Continue with existing streamChat implementation...
    try {
      await saveMessage("user", userMessage);
      // ... rest of implementation
    } catch (error: any) {
      // ... existing error handling
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    streamChat,
    saveMessage,
  };
}
```

### 2. Add Rate Limit Status Display (Optional)

Create a component to show users their current usage:

```typescript
// src/components/RateLimitStatus.tsx
import { rateLimiter, RATE_LIMITS } from "@/utils/rateLimiter";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

interface RateLimitStatusProps {
  userId: string;
}

export function RateLimitStatus({ userId }: RateLimitStatusProps) {
  const [status, setStatus] = useState(() =>
    rateLimiter.getStatus(
      userId,
      RATE_LIMITS.chat_messages.limit,
      RATE_LIMITS.chat_messages.window
    )
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(
        rateLimiter.getStatus(
          userId,
          RATE_LIMITS.chat_messages.limit,
          RATE_LIMITS.chat_messages.window
        )
      );
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [userId]);

  const percentage = (status.used / status.limit) * 100;

  return (
    <div className="p-3 border rounded-md">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-muted-foreground">Messages sent this hour</span>
        <span className="font-medium">
          {status.used} / {status.limit}
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
      {status.isLimited && (
        <p className="text-sm text-destructive mt-2">
          Rate limit reached. Resets in {formatTimeUntilReset(status.resetInMs)}
        </p>
      )}
    </div>
  );
}
```

Then use it in your chat interface:

```typescript
// In ChatInterface.tsx or ChatSidebar.tsx
import { RateLimitStatus } from "@/components/RateLimitStatus";

// Inside component:
const session = await ensureValidSession();

return (
  <div>
    {/* Existing UI */}
    {session && <RateLimitStatus userId={session.user.id} />}
  </div>
);
```

### 3. Add Rate Limiting to File Uploads (Optional)

If you have file upload functionality:

```typescript
// In your file upload handler
import { checkRateLimit, formatTimeUntilReset } from "@/utils/rateLimiter";

const handleFileUpload = async (file: File) => {
  const session = await ensureValidSession();
  if (!session) return;

  const { allowed, status } = await checkRateLimit(
    session.user.id,
    "file_upload"
  );

  if (!allowed) {
    toast({
      title: "Upload limit reached",
      description: `You can upload ${status.limit} files per hour. Try again in ${formatTimeUntilReset(status.resetInMs)}.`,
      variant: "destructive",
    });
    return;
  }

  // Continue with upload...
};
```

## Testing

Run the test suite:

```bash
npm test -- src/utils/__tests__/rateLimiter.test.ts
```

All 46 tests should pass:
- Basic rate limiting (allow/block)
- Sliding window algorithm
- Multiple users
- Cleanup and expiration
- Helper functions
- Edge cases

## API Reference

### Main Functions

#### `checkRateLimit(userId, limitType)`

Convenience function for checking rate limits with predefined configs.

```typescript
const { allowed, status } = await checkRateLimit(userId, "chat_messages");

if (!allowed) {
  // Handle rate limit exceeded
}
```

**Returns:**
- `allowed: boolean` - Whether request is allowed
- `status: object` - Detailed status information

#### `rateLimiter.checkLimit(userId, limit, windowMs)`

Low-level function for custom rate limit checking.

```typescript
const allowed = await rateLimiter.checkLimit(userId, 100, 3600000);
```

#### `rateLimiter.getStatus(userId, limit, windowMs)`

Get detailed rate limit status.

```typescript
const status = rateLimiter.getStatus(userId, 100, 3600000);
// {
//   limit: 100,
//   remaining: 75,
//   used: 25,
//   resetInMs: 1234567,
//   resetInSeconds: 1235,
//   resetAt: Date,
//   isLimited: false
// }
```

#### `formatTimeUntilReset(milliseconds)`

Format milliseconds into human-readable time.

```typescript
formatTimeUntilReset(65000);  // "1m 5s"
formatTimeUntilReset(3660000); // "1h 1m"
formatTimeUntilReset(500);     // "1s"
```

#### `rateLimiter.reset(userId)`

Reset rate limit for a specific user (useful for testing).

```typescript
rateLimiter.reset(userId);
```

#### `rateLimiter.resetAll()`

Reset all rate limits (useful for testing).

```typescript
rateLimiter.resetAll();
```

## Customization

### Adding New Rate Limit Types

1. Add to `RATE_LIMITS` constant:

```typescript
export const RATE_LIMITS = {
  // Existing limits...
  api_calls: {
    limit: 200,
    window: 3600000,
  },
};
```

2. Use with `checkRateLimit`:

```typescript
const { allowed, status } = await checkRateLimit(userId, "api_calls");
```

### Adjusting Existing Limits

Edit values in `RATE_LIMITS`:

```typescript
export const RATE_LIMITS = {
  chat_messages: {
    limit: 150,        // Increased from 100
    window: 3600000,
  },
};
```

### Custom Time Windows

Use different time windows for different operations:

```typescript
export const RATE_LIMITS = {
  quick_actions: {
    limit: 10,
    window: 60000,  // 1 minute
  },
  daily_export: {
    limit: 5,
    window: 86400000,  // 24 hours
  },
};
```

## Best Practices

### 1. Check Rate Limits Early

Check rate limits before expensive operations:

```typescript
// ✅ Good - check before processing
const { allowed } = await checkRateLimit(userId, "chat_messages");
if (!allowed) return;

await processExpensiveOperation();

// ❌ Bad - check after processing
await processExpensiveOperation();
const { allowed } = await checkRateLimit(userId, "chat_messages");
```

### 2. Provide Clear Feedback

Always tell users why they're blocked and when they can try again:

```typescript
if (!allowed) {
  toast({
    title: "Rate limit exceeded",
    description: `Please try again in ${formatTimeUntilReset(status.resetInMs)}`,
    variant: "destructive",
  });
}
```

### 3. Show Warnings

Warn users before they hit the limit:

```typescript
if (status.remaining <= 5) {
  toast({
    title: "Approaching limit",
    description: `${status.remaining} requests remaining`,
  });
}
```

### 4. Handle Auth Errors

Always check for valid session before rate limiting:

```typescript
const session = await ensureValidSession();
if (!session) {
  // Handle auth error first
  return;
}

const { allowed } = await checkRateLimit(session.user.id, "chat_messages");
```

### 5. Use Appropriate Limits

Different operations should have different limits:

- **Chat messages**: Higher limit (100/hour)
- **Artifact creation**: Medium limit (50/hour)
- **File uploads**: Lower limit (20/hour)
- **API-heavy operations**: Very low limit (10/hour)

## Troubleshooting

### Rate Limits Not Persisting

Check browser console for localStorage errors. The rate limiter will fallback to memory-only mode if localStorage fails.

### Rate Limits Too Strict/Loose

Adjust `RATE_LIMITS` values based on your usage patterns. Monitor in production and adjust accordingly.

### Testing Issues

Use `rateLimiter.resetAll()` in `beforeEach` hooks:

```typescript
beforeEach(() => {
  rateLimiter.resetAll();
});
```

### Debug Information

Use `getDebugInfo()` to inspect internal state:

```typescript
const debugInfo = rateLimiter.getDebugInfo(userId);
console.log('Request count:', debugInfo.count);
console.log('Timestamps:', debugInfo.timestamps);
```

## Migration Guide

If you're adding this to an existing app:

1. **Add the utility files** (already done)
2. **Update `useChatMessages` hook** (see step 1 above)
3. **Test in development** with low limits to verify behavior
4. **Deploy with monitoring** to track if limits are appropriate
5. **Adjust limits** based on real usage data
6. **Add UI indicators** (optional but recommended)

## Performance Considerations

- **Memory**: Minimal - only stores timestamps per user
- **localStorage**: < 1KB per user typically
- **CPU**: Cleanup runs every 5 minutes
- **Network**: Zero - purely client-side

The rate limiter is designed to be lightweight and has no impact on app performance.

## Security Notes

This is a **client-side** rate limiter. It:
- ✅ Prevents accidental spam and provides good UX
- ✅ Reduces unnecessary API calls
- ❌ Does NOT provide server-side security

For production apps, you should ALSO implement server-side rate limiting in your Edge Functions or API endpoints.

## Support

For issues or questions:
1. Check the test file for usage examples
2. Review integration examples in `rateLimiter.integration.example.ts`
3. Use `getDebugInfo()` to inspect internal state
4. Check browser console for errors

## License

Part of the llm-chat-site project.
