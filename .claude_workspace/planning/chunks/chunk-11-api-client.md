# Chunk 11: API Client

## PRD Section: 13.1 API Client

### Critical Requirements

1. **JWT Authentication**: Automatic token attachment and refresh handling
2. **Error Handling**: Comprehensive error types with retry logic
3. **Type Safety**: Full TypeScript coverage for all API endpoints
4. **Request/Response**: Consistent data formatting and validation
5. **Health Monitoring**: Built-in health checks and status monitoring

### Implementation Guide

#### Core Architecture
```typescript
// lib/api/client.ts - Main API client class
- Base HTTP client with authentication
- Automatic token refresh on 401 errors
- Comprehensive error handling and retries
- Request/response interceptors
- Health check and status monitoring

// lib/api/types.ts - API type definitions
- Request/response interfaces for all endpoints
- Error type definitions and status codes
- Authentication token structures
- File upload and SSE event types

// lib/api/endpoints.ts - Endpoint definitions
- Centralized endpoint URL management
- Environment-specific base URLs
- Parameterized endpoint builders
- Request method and header configurations
```

#### Client Implementation
```typescript
class VanaAPIClient {
  private baseURL: string
  private token: string | null = null
  
  // Authentication methods
  async googleLogin(idToken: string): Promise<AuthResponse>
  async refreshToken(refresh: string): Promise<AuthResponse>
  
  // Session management
  async createSession(prompt: string, files?: File[]): Promise<Session>
  async getSession(id: string): Promise<Session>
  
  // Health and monitoring
  async health(): Promise<HealthResponse>
}
```

### Real Validation Tests

1. **Token Refresh**: 401 error → Automatic token refresh and retry
2. **File Upload**: Send files with session → Proper FormData encoding
3. **Error Handling**: Network error → Exponential backoff retry
4. **Type Safety**: Invalid request → TypeScript compile error
5. **Health Check**: Backend down → Proper error state and recovery

### THINK HARD

- How do you handle concurrent requests when token refresh is needed?
- What's the optimal retry strategy for different types of failures?
- How do you manage request cancellation for component unmounting?
- What authentication flows need special handling (logout, session expiry)?
- How do you validate response data matches expected TypeScript types?

### Component Specifications

#### VanaAPIClient Class
```typescript
interface VanaAPIClientConfig {
  baseURL: string
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
}

// Features:
- Configurable base URL and timeouts
- Automatic JWT token management
- Request/response interceptors
- Error classification and handling
- Request cancellation support
```

#### Error Handling System
```typescript
interface ApiError {
  type: 'NETWORK' | 'AUTH' | 'VALIDATION' | 'SERVER' | 'RATE_LIMIT'
  status: number
  message: string
  retryable: boolean
  retryAfter?: number
}

// Features:
- Structured error classification
- Automatic retry logic for retryable errors
- Rate limit handling with backoff
- User-friendly error messages
- Error reporting and logging
```

#### Request Interceptors
```typescript
interface RequestInterceptor {
  onRequest: (config: RequestConfig) => RequestConfig
  onResponse: (response: Response) => Response
  onError: (error: ApiError) => Promise<Response | void>
}

// Features:
- Automatic authentication header injection
- Request/response logging for debugging
- Response data validation
- Error transformation and enhancement
- Performance timing and metrics
```

### What NOT to Do

❌ Don't hardcode API URLs or configuration values
❌ Don't ignore response type validation and assume data structure
❌ Don't retry non-retryable errors (400 Bad Request, etc.)
❌ Don't store sensitive data in localStorage or client state
❌ Don't forget to handle request cancellation and cleanup
❌ Don't expose internal error details to end users

### Integration Points

- **Auth Store**: Token management and refresh logic
- **Error Recovery**: Global error handling and user feedback
- **SSE Connection**: Coordinate with streaming connections
- **Upload Store**: File upload progress and error handling

---

*Implementation Priority: High - Core infrastructure component*