# Circuit Breaker Pattern

## Overview

The circuit breaker pattern prevents cascading failures and network stampedes during service outages by automatically blocking requests after repeated failures.

## Implementation

### Hook: `useCircuitBreaker`

Location: `src/hooks/useCircuitBreaker.ts`

The hook implements a three-state circuit breaker:

1. **Closed** (Normal): Requests flow normally
2. **Open** (Tripped): Requests blocked after max failures
3. **Half-Open** (Testing): Single test request allowed after timeout

### Configuration

```typescript
const {
  shouldAllowRequest,  // Check if request should proceed
  recordSuccess,       // Record successful request
  recordFailure,       // Record failed request
  state,              // Current circuit state
  getTimeUntilRetry,  // Time until retry (ms)
  reset               // Manual reset
} = useCircuitBreaker({
  maxFailures: 3,      // Failures before opening
  resetTimeout: 60000, // Wait time before retry (ms)
  onStateChange: (state) => {...} // State change callback
});
```

### Integration in BundledArtifactFrame

The circuit breaker is integrated into the artifact bundling system to prevent repeated failed requests during outages:

1. **Pre-Flight Check**: Before fetching bundle, check `shouldAllowRequest()`
2. **Success Tracking**: Call `recordSuccess()` on successful bundle fetch
3. **Failure Tracking**: Call `recordFailure()` for transient errors (429, 500, 502, 503, 504, network, timeout)
4. **User Feedback**: Display countdown timer when circuit is open

### Transient Error Detection

The circuit breaker only tracks transient errors that indicate service degradation:

- HTTP 429 (Rate Limit)
- HTTP 500 (Server Error)
- HTTP 502 (Bad Gateway)
- HTTP 503 (Service Unavailable)
- HTTP 504 (Gateway Timeout)
- Network errors
- Timeout errors

Permanent errors (e.g., 404, invalid bundle) do not trigger the circuit breaker.

## Benefits

1. **Prevents Network Stampedes**: Stops repeated requests during outages
2. **Faster User Feedback**: Fails fast instead of waiting for timeouts
3. **Service Protection**: Reduces load on struggling services
4. **Automatic Recovery**: Tests service health after cooldown
5. **User Communication**: Shows clear countdown to retry

## Testing

Comprehensive test suite covers:

- Initial state and configuration
- Failure tracking and circuit opening
- Timeout and half-open transitions
- Success/failure in half-open state
- Time calculations
- Manual reset
- Exponential backoff scenarios

Run tests:
```bash
npm run test -- useCircuitBreaker.test.ts
```

## Monitoring

Circuit breaker state changes are logged to:

1. **Console**: Debug logs with state transitions
2. **Sentry**: Breadcrumbs for circuit breaker events
3. **UI**: Visual feedback when circuit is open

## Future Enhancements

1. **Exponential Backoff**: Increase timeout after repeated failures
2. **Metrics Dashboard**: Track circuit breaker metrics
3. **Per-Service Circuits**: Separate circuits for different services
4. **Health Check Endpoint**: Dedicated health check before opening circuit
