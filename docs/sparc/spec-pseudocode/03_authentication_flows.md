# Authentication & Session Management Flows

## Authentication Architecture Overview

The frontend integrates with Vana's multi-provider authentication system supporting OAuth2/JWT, Firebase Auth, API keys, and development mode, ensuring secure access to the research platform.

## Authentication Providers

### Primary Providers
1. **OAuth2/JWT** - Industry standard token-based authentication (Primary)
2. **Local JWT** - Direct username/password with JWT tokens (Secondary)

### Development & API Access
3. **Development Mode** - Optional auth bypass for local development
4. **API Keys** - Simple key-based access for programmatic clients (Future)

### Provider Selection Logic
```typescript
interface AuthConfig {
  preferredProvider: 'oauth2' | 'jwt' | 'dev'
  fallbackProviders: string[]
  environment: 'development' | 'staging' | 'production'
}

// Authentication provider selection
function selectAuthProvider(config: AuthConfig): AuthProvider {
  if (config.environment === 'development' && config.preferredProvider === 'dev') {
    return new DevAuthProvider()
  }
  
  switch (config.preferredProvider) {
    case 'oauth2': return new OAuth2Provider()
    case 'jwt': return new JWTAuthProvider()
    default: return new OAuth2Provider() // Default fallback
  }
}
```

## Authentication State Management

### Auth State Structure
```typescript
interface AuthState {
  // User information
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Token management
  tokens: {
    accessToken: string | null
    refreshToken: string | null
    expiresAt: number | null
  }
  
  // Provider information
  provider: AuthProvider | null
  providerType: 'oauth2' | 'firebase' | 'apikey' | 'dev'
  
  // Error handling
  error: AuthError | null
  retryCount: number
  
  // Session management
  sessionId: string | null
  sessionExpiry: number | null
}
```

### Auth Actions
```typescript
interface AuthActions {
  // Login flow
  login: (credentials: Credentials) => Promise<void>
  loginWithProvider: (provider: string) => Promise<void>
  
  // Logout flow
  logout: () => Promise<void>
  logoutFromAllDevices: () => Promise<void>
  
  // Token management
  refreshToken: () => Promise<void>
  validateToken: () => Promise<boolean>
  
  // Session management
  initializeSession: () => Promise<void>
  clearSession: () => void
  
  // Error handling
  clearError: () => void
  retry: () => Promise<void>
}
```

## Authentication Flows

### OAuth2/JWT Flow
```
1. User clicks "Login" button
   ├── Redirect to OAuth2 provider (Google, GitHub, etc.)
   ├── User completes authentication
   └── Provider redirects with authorization code

2. Authorization code exchange
   ├── Frontend receives auth code in URL
   ├── POST /auth/login with authorization code
   ├── Backend validates code with provider
   └── Backend returns JWT tokens

3. Token storage and validation
   ├── Store tokens in secure storage (memory + httpOnly cookie)
   ├── Set up automatic token refresh
   ├── Validate token format and expiry
   └── Update auth state to authenticated

4. Session initialization
   ├── Fetch user profile information
   ├── Initialize user preferences
   ├── Set up API interceptors with token
   └── Navigate to main application
```

### JWT Authentication Flow
```
1. Direct login form
   ├── User enters email/password credentials
   ├── Client-side validation and sanitization
   └── Prepare login request

2. Backend authentication
   ├── POST /auth/login with credentials
   ├── Backend validates against user database
   ├── Backend generates JWT access/refresh tokens
   └── Backend returns tokens and user data

3. Token management
   ├── Store access token in memory
   ├── Store refresh token in httpOnly cookie
   ├── Set up automatic token refresh
   └── Configure API request interceptors

4. Session establishment
   ├── Update auth state with user data
   ├── Initialize chat session
   ├── Load user preferences and settings
   └── Navigate to main chat interface
```

### API Key Flow
```
1. API key input
   ├── User enters API key in form
   ├── Validate key format (length, prefix)
   ├── Show loading state during validation
   └── Handle validation errors

2. Key validation
   ├── POST /auth/api-key with key
   ├── Backend validates key against database
   ├── Backend returns user context and permissions
   └── Handle invalid key errors

3. Session creation
   ├── Store API key securely
   ├── Set up API request headers
   ├── Fetch user permissions and limits
   └── Navigate to restricted interface
```

### Development Mode Flow
```
1. Development environment detection
   ├── Check environment variables
   ├── Verify development mode is enabled
   └── Show development mode warning

2. Bypass authentication
   ├── Create mock user object
   ├── Generate temporary session ID
   ├── Set development mode flags
   └── Skip all authentication steps

3. Mock session initialization
   ├── Use test user credentials
   ├── Enable all features for testing
   ├── Show development mode indicator
   └── Allow quick user switching
```

## Session Management

### Session Lifecycle
```typescript
interface Session {
  id: string
  userId: string
  createdAt: Date
  lastActiveAt: Date
  expiresAt: Date
  deviceInfo: DeviceInfo
  metadata: SessionMetadata
}

interface SessionManager {
  createSession(): Promise<Session>
  refreshSession(sessionId: string): Promise<Session>
  destroySession(sessionId: string): Promise<void>
  getActiveSessions(): Promise<Session[]>
  validateSession(sessionId: string): Promise<boolean>
}
```

### Session Persistence Strategy
```
1. Session Creation
   ├── Generate unique session ID
   ├── Store session in backend (Google Cloud Storage)
   ├── Cache session data locally (IndexedDB)
   └── Set session expiry (configurable)

2. Session Restoration
   ├── Check for existing session on app load
   ├── Validate session with backend
   ├── Restore user state and preferences
   └── Handle expired sessions gracefully

3. Session Synchronization
   ├── Sync session data across browser tabs
   ├── Handle concurrent session modifications
   ├── Merge session state on focus/visibility change
   └── Resolve session conflicts

4. Session Cleanup
   ├── Clear expired sessions automatically
   ├── Clean up local storage on logout
   ├── Revoke backend session tokens
   └── Clear sensitive data from memory
```

### Chat Session Integration
```typescript
interface ChatSession {
  sessionId: string
  title: string
  messages: ChatMessage[]
  agentProgress: AgentProgress[]
  status: 'active' | 'idle' | 'processing' | 'completed' | 'error'
  createdAt: Date
  updatedAt: Date
  lastMessageAt: Date
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    citations?: Citation[]
    agentId?: string
    tokens?: number
  }
}

// Chat session management
class ChatSessionManager {
  async createChatSession(): Promise<ChatSession>
  async resumeChatSession(sessionId: string): Promise<ChatSession>
  async saveChatMessage(sessionId: string, message: ChatMessage): Promise<void>
  async updateSessionTitle(sessionId: string, title: string): Promise<void>
  async listUserSessions(userId: string): Promise<ChatSession[]>
}
```

## Security Implementation

### Token Security
```typescript
// Secure token storage
class TokenManager {
  private memoryStorage: Map<string, string> = new Map()
  
  // Store sensitive tokens in memory only
  storeAccessToken(token: string): void {
    this.memoryStorage.set('access_token', token)
    // Never store in localStorage for security
  }
  
  // Store refresh token in httpOnly cookie
  storeRefreshToken(token: string): void {
    // Backend sets httpOnly cookie
    // Frontend cannot access directly
  }
  
  // Automatic token refresh
  async refreshTokens(): Promise<void> {
    const response = await fetch('/auth/refresh', {
      method: 'POST',
      credentials: 'include' // Include httpOnly cookie
    })
    
    if (response.ok) {
      const { accessToken } = await response.json()
      this.storeAccessToken(accessToken)
    } else {
      this.handleTokenRefreshFailure()
    }
  }
}
```

### Request Interceptors
```typescript
// API request interceptor for authentication
class ApiClient {
  private tokenManager: TokenManager
  
  constructor() {
    this.setupRequestInterceptor()
    this.setupResponseInterceptor()
  }
  
  private setupRequestInterceptor(): void {
    this.client.interceptors.request.use((config) => {
      const token = this.tokenManager.getAccessToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })
  }
  
  private setupResponseInterceptor(): void {
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          try {
            await this.tokenManager.refreshTokens()
            return this.client.request(error.config)
          } catch (refreshError) {
            this.handleAuthenticationFailure()
            throw refreshError
          }
        }
        throw error
      }
    )
  }
}
```

### CSRF Protection
```typescript
// CSRF token management
class CSRFManager {
  private csrfToken: string | null = null
  
  async getCSRFToken(): Promise<string> {
    if (!this.csrfToken) {
      const response = await fetch('/auth/csrf-token')
      const { token } = await response.json()
      this.csrfToken = token
    }
    return this.csrfToken
  }
  
  async addCSRFHeaders(headers: Record<string, string>): Promise<Record<string, string>> {
    const token = await this.getCSRFToken()
    return {
      ...headers,
      'X-CSRF-Token': token
    }
  }
}
```

## Error Handling

### Authentication Errors
```typescript
enum AuthErrorType {
  INVALID_CREDENTIALS = 'invalid_credentials',
  TOKEN_EXPIRED = 'token_expired',
  PROVIDER_ERROR = 'provider_error',
  NETWORK_ERROR = 'network_error',
  RATE_LIMITED = 'rate_limited',
  ACCOUNT_LOCKED = 'account_locked'
}

class AuthErrorHandler {
  handleError(error: AuthError): void {
    switch (error.type) {
      case AuthErrorType.INVALID_CREDENTIALS:
        this.showLoginError('Invalid username or password')
        break
        
      case AuthErrorType.TOKEN_EXPIRED:
        this.attemptTokenRefresh()
        break
        
      case AuthErrorType.PROVIDER_ERROR:
        this.showProviderError(error.providerError)
        break
        
      case AuthErrorType.NETWORK_ERROR:
        this.showNetworkError()
        this.scheduleRetry()
        break
        
      case AuthErrorType.RATE_LIMITED:
        this.showRateLimitError(error.retryAfter)
        break
        
      case AuthErrorType.ACCOUNT_LOCKED:
        this.showAccountLockedError()
        this.redirectToSupport()
        break
    }
  }
}
```

### Session Recovery
```typescript
class SessionRecoveryManager {
  async recoverSession(): Promise<boolean> {
    try {
      // Try to restore from local storage
      const sessionData = this.getStoredSessionData()
      if (sessionData && !this.isSessionExpired(sessionData)) {
        await this.validateSessionWithBackend(sessionData.sessionId)
        this.restoreUserState(sessionData)
        return true
      }
      
      // Try to refresh tokens
      const refreshSuccess = await this.attemptTokenRefresh()
      if (refreshSuccess) {
        await this.initializeNewSession()
        return true
      }
      
      // Fall back to re-authentication
      this.redirectToLogin()
      return false
      
    } catch (error) {
      console.error('Session recovery failed:', error)
      this.clearAllSessionData()
      this.redirectToLogin()
      return false
    }
  }
}
```

## Mobile Considerations

### Authentication Component Dependencies

**Required npm packages for authentication components:**
```bash
# Core dependencies (auto-installed with shadcn components)
npm install @radix-ui/react-alert-dialog
npm install @radix-ui/react-avatar
npm install @radix-ui/react-toast
npm install class-variance-authority
npm install clsx
npm install tailwind-merge

# Authentication-specific dependencies
npm install @auth0/nextjs-auth0  # If using Auth0
npm install next-auth            # If using NextAuth.js
npm install jose                 # For JWT handling
```

### Mobile Authentication UX
- **Touch-friendly login forms** with large tap targets
- **Biometric authentication** where available (Face ID, Touch ID)
- **Social login optimization** for mobile browsers
- **App-to-app authentication** for native mobile apps

### Mobile Session Management
- **Background session refresh** when app becomes active
- **Offline session caching** for temporary network loss
- **Battery-efficient token management** to minimize background activity
- **Deep link authentication** for email verification links

## Authentication Component Setup

### Required Components Installation

**Core Authentication UI Components:**
```bash
# Install form components for authentication
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add card
npx shadcn@latest add alert
npx shadcn@latest add toast
npx shadcn@latest add dialog
npx shadcn@latest add spinner

# Install layout components
npx shadcn@latest add separator
npx shadcn@latest add avatar
npx shadcn@latest add badge
```

**Prompt-Kit Components for Chat Interface (Post-Auth):**
```bash
# Install chat components for authenticated users
npx shadcn@latest add "https://www.prompt-kit.com/c/prompt-input.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/chat-container.json"
npx shadcn@latest add "https://www.prompt-kit.com/c/message.json"
```

### Component Validation for Authentication

```bash
# Verify authentication components are installed
ls components/ui/ | grep -E "(button|input|card|alert|toast|dialog)"

# Test authentication component imports
node -e "console.log('Testing imports...');
try {
  require('./components/ui/button');
  require('./components/ui/input');
  require('./components/ui/card');
  console.log('✅ All auth components imported successfully');
} catch(e) {
  console.log('❌ Import failed:', e.message);
}"
```

## Testing Strategy

### Authentication Testing
```typescript
// Unit tests for auth flows
describe('Authentication', () => {
  test('OAuth2 login flow completes successfully')
  test('Token refresh works when token expires')
  test('Logout clears all authentication data')
  test('Invalid credentials show appropriate error')
  test('Network errors trigger retry mechanism')
})

// Integration tests with backend
describe('Auth Integration', () => {
  test('End-to-end OAuth2 flow with real provider')
  test('Session persistence across browser refreshes')
  test('Multiple tab session synchronization')
  test('Concurrent login/logout scenarios')
})

// E2E tests for user flows
describe('Auth E2E', () => {
  test('Complete user journey from login to research')
  test('Session recovery after browser crash')
  test('Multi-device session management')
  test('Authentication error recovery flows')
})
```