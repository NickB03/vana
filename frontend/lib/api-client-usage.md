# Vana API Client - Production Implementation

## Overview

The Vana API client has been completely transformed from a mock implementation to a production-ready HTTP client with advanced features including authentication, caching, error handling, and real-time streaming capabilities.

## Key Features Implemented

### 1. **Complete Authentication Integration**
- All authentication endpoints from the FastAPI backend
- Automatic JWT token management with secure storage
- Token refresh handling
- User profile management

### 2. **Advanced Error Handling**
- Circuit breaker pattern for resilience
- Exponential backoff retry logic
- Comprehensive error classification (ApiError, NetworkError, TimeoutError)
- Request timeout management

### 3. **Response Caching System**
- TTL-based caching with automatic expiration
- Cache invalidation for data updates
- Configurable cache size and duration
- Memory-efficient LRU cache implementation

### 4. **Request/Response Interceptors**
- Request logging and performance monitoring
- Custom interceptor support for middleware
- Automatic request ID generation
- Security headers injection

### 5. **Server-Sent Events (SSE) Support**
- Enhanced SSE streaming for real-time updates
- Multi-agent research endpoint integration (`/api/run_sse`)
- Chat streaming with proper error handling

## Usage Examples

### Authentication
```typescript
import { apiService } from './lib/api-client';

// Login user
const authResponse = await apiService.login({
  email: 'user@example.com',
  password: 'securePassword'
});

// Register new user
const newUser = await apiService.register({
  email: 'new@example.com',
  username: 'newuser',
  first_name: 'John',
  last_name: 'Doe',
  password: 'securePassword'
});

// Get current user (cached for 5 minutes)
const user = await apiService.getCurrentUser();

// Refresh token
const newTokens = await apiService.refreshToken({
  refresh_token: 'existing_refresh_token'
});
```

### Multi-Agent Research
```typescript
// Start research session with SSE streaming
const sessionId = 'research_session_123';
const research = await apiService.startResearch(sessionId, {
  query: 'Latest developments in AI research',
  user_id: 'user123'
});

// Process streaming response
const reader = research.body?.getReader();
while (reader) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = new TextDecoder().decode(value);
  console.log('Research progress:', chunk);
}
```

### Caching and Performance
```typescript
// Cached request (5 minutes TTL)
const healthStatus = await apiService.healthCheck(); // Automatically cached

// Force refresh cache
apiClientUtils.clearCache('/health');

// Get cache statistics
const stats = apiClientUtils.getCacheStats();
console.log(`Cache: ${stats.size}/${stats.maxSize} entries`);

// Monitor circuit breaker
const cbStatus = apiClientUtils.getCircuitBreakerStatus();
console.log(`Circuit breaker: ${cbStatus.state}, failures: ${cbStatus.failures}`);
```

### Custom Interceptors
```typescript
import { apiClientUtils } from './lib/api-client';

// Add request interceptor for custom headers
apiClientUtils.addRequestInterceptor(async (config) => {
  config.headers = {
    ...config.headers,
    'X-Client-Version': '1.0.0',
    'X-Request-Source': 'web-app'
  };
  return config;
});

// Add response interceptor for metrics
apiClientUtils.addResponseInterceptor(async (response) => {
  // Track response metrics
  console.log(`Response time: ${response.headers.get('X-Response-Time')}`);
  return response;
});
```

## API Endpoints Supported

### Authentication Endpoints
- `POST /auth/login` - User login
- `POST /auth/register` - User registration  
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user
- `POST /auth/logout-all` - Logout from all devices
- `GET /auth/me` - Get current user info
- `PUT /auth/me` - Update current user
- `POST /auth/change-password` - Change password

### Chat & Research Endpoints
- `POST /chat/{chatId}/message` - Send chat message
- `GET /chat/{chatId}/stream` - Get chat stream
- `POST /api/run_sse/{sessionId}` - Start multi-agent research
- `GET /agent_network_sse/{sessionId}` - Agent network stream
- `GET /agent_network_history` - Get agent history

### System Endpoints
- `GET /health` - System health check

## Error Handling

The API client provides comprehensive error handling:

```typescript
try {
  const response = await apiService.login(credentials);
} catch (error) {
  if (error instanceof ApiError) {
    console.log(`API Error: ${error.message} (${error.statusCode})`);
  } else if (error instanceof NetworkError) {
    console.log('Network connectivity issue');
  } else if (error instanceof TimeoutError) {
    console.log('Request timed out');
  }
}
```

## Configuration

The API client is configured via environment variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_API_RETRY_ATTEMPTS=3
NEXT_PUBLIC_API_RETRY_DELAY=1000
NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH=true
```

## Security Features

1. **Secure Token Storage**: Integrates with the security module for encrypted token storage
2. **CSRF Protection**: Automatic CSRF token injection for state-changing requests
3. **Input Validation**: Automatic sanitization of chat messages and user input
4. **Request ID Tracking**: Unique request IDs for audit trails
5. **Security Headers**: Automatic injection of security headers

## Performance Optimizations

1. **Response Caching**: Reduces redundant API calls with intelligent caching
2. **Circuit Breaker**: Prevents cascade failures during service outages
3. **Connection Pooling**: Efficient HTTP connection management
4. **Request Deduplication**: Automatic prevention of duplicate requests
5. **Performance Monitoring**: Built-in request timing and metrics

## Next Steps

1. **Testing**: Comprehensive test suite with unit and integration tests
2. **Monitoring**: Integration with application monitoring tools
3. **Documentation**: Auto-generated API documentation
4. **Performance**: Further optimizations based on usage patterns

The API client is now production-ready and provides a robust foundation for all frontend-backend communication in the Vana platform.