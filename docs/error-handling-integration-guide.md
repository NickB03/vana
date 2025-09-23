# Error Handling Integration Guide

## Overview

This guide provides step-by-step instructions for integrating the enhanced error handling and logging system across the Vana codebase. The improvements provide consistent error responses, security-aware logging, and robust SSE connection management.

## 🎯 Key Improvements

### 1. **Standardized Error Response Format**
- Consistent JSON error responses across all endpoints
- Security-aware error message sanitization
- Request tracking with correlation IDs
- Categorized error types for better debugging

### 2. **Enhanced Logging System**
- Structured logging with context
- Severity-based error classification
- Memory and performance metrics
- Cross-request correlation tracking

### 3. **SSE Error Boundaries**
- Automatic reconnection with exponential backoff
- Circuit breaker pattern for persistent failures
- User-friendly error messages and recovery options
- Connection health monitoring

### 4. **Security Improvements**
- No sensitive information leakage in production
- Environment-aware error detail exposure
- Proper error categorization for audit trails
- Rate limiting and abuse prevention

## 🔧 Integration Steps

### Step 1: Update Server Middleware

Replace the existing middleware in `app/server.py`:

```python
# Add to imports
from app.middleware.error_middleware import (
    GlobalErrorHandlingMiddleware,
    http_exception_handler,
    validation_exception_handler
)
from app.utils.error_handling import (
    ErrorHandler,
    SSEErrorBoundary,
    enhanced_logger
)

# Replace existing middleware setup with:
app.add_middleware(GlobalErrorHandlingMiddleware)

# Add exception handlers
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(ValueError, validation_exception_handler)
```

### Step 2: Update SSE Endpoints

Enhance the SSE endpoints in `app/server.py`:

```python
@app.get("/agent_network_sse/{session_id}")
async def agent_network_sse(
    session_id: str, current_user: User = current_active_user_dep
) -> StreamingResponse:
    """Enhanced SSE endpoint with comprehensive error handling."""
    
    # Create SSE error boundary for this session
    error_boundary = SSEErrorBoundary(session_id)
    
    async def event_generator() -> AsyncGenerator[str, None]:
        async with error_boundary.handle_stream_errors():
            broadcaster = get_sse_broadcaster()
            queue = await broadcaster.add_subscriber(session_id)
            
            try:
                # Send initial connection event
                connection_data = {
                    "type": "connection",
                    "status": "connected",
                    "sessionId": session_id,
                    "timestamp": datetime.now().isoformat(),
                }
                yield f"data: {json.dumps(connection_data)}\n\n"
                
                while True:
                    try:
                        event = await asyncio.wait_for(queue.get(), timeout=30)
                        yield event.to_sse_format() if hasattr(event, "to_sse_format") else str(event)
                    except asyncio.TimeoutError:
                        # Send heartbeat
                        yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': datetime.now().isoformat()})}\n\n"
                        
            except Exception as e:
                # Handle errors through error boundary
                error_event = await handle_sse_stream_error(e, session_id)
                yield error_event
            finally:
                await broadcaster.remove_subscriber(session_id, queue)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
```

### Step 3: Update Frontend SSE Usage

Replace existing SSE hooks with the enhanced version:

```typescript
// In your React components
import { useSSEWithErrorHandling } from '@/hooks/useSSEWithErrorHandling'
import SSEErrorBoundary from '@/components/sse/sse-error-boundary'

function ChatComponent({ sessionId }: { sessionId: string }) {
  const sse = useSSEWithErrorHandling(`/api/sse/agent_network_sse/${sessionId}`, {
    maxRetries: 5,
    retryDelay: 2000,
    onError: (error) => {
      console.error('SSE Error:', error)
    },
    onReconnect: () => {
      console.log('SSE Reconnected')
    }
  })

  return (
    <SSEErrorBoundary onRetry={sse.retryConnection}>
      <div>
        <div>Status: {sse.getConnectionStatus()}</div>
        <div>Health: {sse.connectionHealth}</div>
        
        {sse.messages.map(message => (
          <div key={message.id}>{JSON.stringify(message.data)}</div>
        ))}
      </div>
    </SSEErrorBoundary>
  )
}
```

### Step 4: Update API Routes

Enhance API routes to use standardized error responses:

```python
from app.utils.error_handling import (
    create_auth_error_response,
    create_validation_error_response,
    error_handler
)

@app.post("/api/run_sse/{session_id}")
async def run_research_sse(
    session_id: str,
    request: dict = Body(...),
    current_user: User = current_active_user_dep,
) -> dict:
    try:
        research_query = request.get("query") or request.get("message", "")
        if not research_query:
            return create_validation_error_response([{
                "field": "query",
                "message": "Research query is required",
                "type": "missing"
            }])
        
        # ... rest of implementation
        
    except Exception as e:
        return error_handler.create_error_response(
            error=e,
            status_code=500,
            error_code="RESEARCH_START_ERROR",
            user_message="Failed to start research session",
            context={"session_id": session_id}
        )
```

## 🚀 Benefits

### For Users
- **Clear error messages**: Users see helpful, actionable error messages
- **Automatic recovery**: SSE connections automatically reconnect when possible
- **Better feedback**: Real-time connection status and health indicators
- **Graceful degradation**: Features continue to work even with connection issues

### For Developers  
- **Consistent debugging**: All errors follow the same format with correlation IDs
- **Better monitoring**: Structured logs with context and metrics
- **Security**: No sensitive information leakage in production
- **Maintainability**: Centralized error handling reduces code duplication

### For Operations
- **Better observability**: Structured logs with correlation tracking
- **Performance insights**: Memory and latency metrics included
- **Security monitoring**: Error categorization helps identify attacks
- **Easier troubleshooting**: Request correlation across services

## 📊 Error Categories

The system categorizes errors for better handling:

- **Authentication**: Login, token, session errors
- **Authorization**: Permission and access control errors  
- **Validation**: Input validation and format errors
- **Network**: Connection, timeout, and proxy errors
- **Database**: Data persistence and query errors
- **External API**: Third-party service integration errors
- **SSE Connection**: Real-time connection specific errors
- **Internal**: Unexpected application errors
- **Rate Limit**: API usage limit exceeded
- **Configuration**: Setup and environment errors

## 🔍 Monitoring and Alerting

### Key Metrics to Monitor

1. **Error Rates by Category**
   - Track error frequency by type
   - Set alerts for critical error spikes

2. **SSE Connection Health**
   - Monitor reconnection rates
   - Alert on high failure rates

3. **Response Times**
   - Track API endpoint performance
   - Monitor error response latency

4. **User Experience**
   - Monitor client-side error rates
   - Track recovery success rates

### Example Monitoring Query

```sql
-- Monitor error rates by category (if using SQL-based logging)
SELECT 
  error_category,
  COUNT(*) as error_count,
  AVG(response_time_ms) as avg_response_time
FROM error_logs 
WHERE timestamp > NOW() - INTERVAL 1 HOUR
GROUP BY error_category
ORDER BY error_count DESC;
```

## 🧪 Testing the Implementation

### Backend Testing

```python
import pytest
from fastapi.testclient import TestClient

def test_error_response_format(client: TestClient):
    """Test that errors follow standardized format"""
    response = client.get("/api/nonexistent")
    
    assert response.status_code == 404
    data = response.json()
    
    # Check required fields
    assert "error" in data
    assert "error_code" in data
    assert "message" in data
    assert "timestamp" in data
    assert "request_id" in data
    
    assert data["error"] is True
```

### Frontend Testing

```typescript
import { render, screen } from '@testing-library/react'
import { SSEErrorBoundary } from '@/components/sse/sse-error-boundary'

test('SSE error boundary handles connection errors', async () => {
  const ThrowError = () => {
    throw new Error('Connection failed')
  }
  
  render(
    <SSEErrorBoundary>
      <ThrowError />
    </SSEErrorBoundary>
  )
  
  expect(screen.getByText(/connection error/i)).toBeInTheDocument()
  expect(screen.getByText(/retry connection/i)).toBeInTheDocument()
})
```

## 🔐 Security Considerations

1. **Error Message Sanitization**
   - Production errors never expose internal details
   - Stack traces only in development
   - Sensitive data filtering

2. **Rate Limiting**
   - Error responses respect rate limits
   - Prevents error-based enumeration attacks
   - Protects against abuse

3. **Audit Logging**
   - All errors logged with context
   - User actions tracked with correlation IDs
   - Security events properly categorized

## 📝 Migration Checklist

- [ ] Add error handling middleware to server
- [ ] Update SSE endpoints with error boundaries
- [ ] Replace frontend SSE hooks
- [ ] Update API routes to use standardized responses
- [ ] Configure monitoring and alerting
- [ ] Test error scenarios thoroughly
- [ ] Update documentation and runbooks
- [ ] Train team on new error formats

## 🎯 Next Steps

1. **Gradual Migration**: Start with critical endpoints
2. **Monitor Impact**: Watch error rates and user feedback
3. **Iterate**: Refine based on real-world usage
4. **Documentation**: Keep error codes and messages updated
5. **Training**: Ensure team understands new patterns