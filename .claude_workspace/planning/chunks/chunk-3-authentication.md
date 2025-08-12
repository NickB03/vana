# Chunk 3: Authentication System (Lines 271-299)

## 🔐 CRITICAL: Security foundation - get this wrong and everything breaks

### Extracted PRD Content (Lines 271-299)

```
## 5. Authentication System

### 5.1 Implementation Overview

**Backend Reality**: JWT-based authentication with Google OAuth via backend endpoint (not Firebase directly)

### 5.2 Authentication Flow

```typescript
// lib/auth/google-auth.ts
export const googleLogin = async (googleUser: any) => {
  // Get ID token from Google Sign-In
  const idToken = googleUser.getAuthResponse().id_token
  
  // Send to backend for verification and JWT creation
  const response = await fetch('/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken })
  })
  
  const { access_token, refresh_token } = await response.json()
  
  // Store tokens securely
  authStore.setTokens(access_token, refresh_token)
  
  // Start refresh timer
  startTokenRefresh()
}
```

### 5.3 Token Management

```typescript
// Automatic token refresh every 25 minutes (before 30min expiry)
const startTokenRefresh = () => {
  setInterval(async () => {
    const newTokens = await refreshTokens()
    authStore.setTokens(newTokens.access_token, newTokens.refresh_token)
  }, 25 * 60 * 1000)
}
```

### 5.4 UI Component

```tsx
<Card className="w-[400px]">
  <CardHeader>
    <CardTitle>Welcome to Vana</CardTitle>
    <CardDescription>Sign in to continue</CardDescription>
  </CardHeader>
  <CardContent>
    <Tabs defaultValue="login">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="register">Register</TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleGoogleSignIn}
        >
          <Icons.google className="mr-2 h-4 w-4" />
          Continue with Google
        </Button>
      </TabsContent>
    </Tabs>
  </CardContent>
</Card>
```
```

## Critical Requirements & Guardrails

### 🔴 ABSOLUTE REQUIREMENTS
1. **BACKEND JWT ONLY**: No Firebase Auth on frontend - use backend `/auth/google` endpoint
2. **TOKEN SECURITY**: Access tokens in memory only, refresh tokens in httpOnly cookies
3. **AUTO REFRESH**: Tokens refresh every 25 minutes automatically
4. **ROUTE PROTECTION**: All chat routes require authentication
5. **GOOGLE OAUTH**: Only authentication method - no email/password
6. **ERROR HANDLING**: Robust error states for all auth failures

### 🟡 CRITICAL GUARDRAILS
- Never store access tokens in localStorage
- Always use HTTPS for token transmission
- Implement proper CSRF protection
- Handle token expiry gracefully
- Log out users on security errors
- Clear all state on logout

### 🟢 SUCCESS CRITERIA
- Login flow completes in under 3 seconds
- Token refresh is invisible to users
- Route protection works correctly
- Logout clears all user data
- Error messages are user-friendly

## Step-by-Step Implementation Guide

### Phase 1: Auth Store Setup (45 minutes)

1. **Create Auth Store**
   ```typescript
   // stores/authStore.ts
   import { create } from 'zustand'
   import { persist } from 'zustand/middleware'
   import { immer } from 'zustand/middleware/immer'
   
   interface User {
     id: string
     email: string
     name: string
     picture?: string
     verified: boolean
   }
   
   interface AuthState {
     // State
     user: User | null
     accessToken: string | null
     isAuthenticated: boolean
     isLoading: boolean
     error: string | null
     
     // Actions
     setUser: (user: User) => void
     setTokens: (accessToken: string, refreshToken: string) => void
     clearAuth: () => void
     setLoading: (loading: boolean) => void
     setError: (error: string | null) => void
     refreshTokens: () => Promise<void>
     logout: () => Promise<void>
   }
   
   export const useAuthStore = create<AuthState>()(
     persist(
       immer((set, get) => ({
         user: null,
         accessToken: null,
         isAuthenticated: false,
         isLoading: false,
         error: null,
   
         setUser: (user) => {
           set(state => {
             state.user = user
             state.isAuthenticated = true
             state.error = null
           })
         },
   
         setTokens: (accessToken, refreshToken) => {
           set(state => {
             state.accessToken = accessToken
             state.isAuthenticated = true
             state.error = null
           })
           
           // Store refresh token in httpOnly cookie via API
           fetch('/api/auth/set-refresh-cookie', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ refreshToken }),
             credentials: 'include'
           })
         },
   
         clearAuth: () => {
           set(state => {
             state.user = null
             state.accessToken = null
             state.isAuthenticated = false
             state.error = null
           })
         },
   
         setLoading: (loading) => {
           set(state => {
             state.isLoading = loading
           })
         },
   
         setError: (error) => {
           set(state => {
             state.error = error
             state.isLoading = false
           })
         },
   
         refreshTokens: async () => {
           try {
             const response = await fetch('/api/auth/refresh', {
               method: 'POST',
               credentials: 'include'
             })
   
             if (!response.ok) {
               throw new Error('Token refresh failed')
             }
   
             const { access_token, user } = await response.json()
             
             set(state => {
               state.accessToken = access_token
               state.user = user
               state.isAuthenticated = true
               state.error = null
             })
           } catch (error) {
             console.error('Token refresh failed:', error)
             get().logout()
           }
         },
   
         logout: async () => {
           try {
             await fetch('/api/auth/logout', {
               method: 'POST',
               credentials: 'include'
             })
           } catch (error) {
             console.error('Logout request failed:', error)
           } finally {
             get().clearAuth()
             
             // Clear all other stores
             window.location.href = '/auth'
           }
         }
       })),
       {
         name: 'auth-storage',
         partialize: (state) => ({
           // Only persist user info, not tokens
           user: state.user,
           isAuthenticated: state.isAuthenticated
         })
       }
     )
   )
   ```

2. **Create API Client Integration**
   ```typescript
   // lib/api/client.ts
   import { useAuthStore } from '@/stores/authStore'
   
   class VanaAPIClient {
     private baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
   
     private async request(path: string, options: RequestInit = {}) {
       const { accessToken, refreshTokens, logout } = useAuthStore.getState()
   
       const response = await fetch(`${this.baseURL}${path}`, {
         ...options,
         headers: {
           ...options.headers,
           'Content-Type': 'application/json',
           ...(accessToken && { Authorization: `Bearer ${accessToken}` })
         },
         credentials: 'include'
       })
   
       // Handle token expiry
       if (response.status === 401) {
         try {
           await refreshTokens()
           // Retry with new token
           const retryResponse = await fetch(`${this.baseURL}${path}`, {
             ...options,
             headers: {
               ...options.headers,
               'Content-Type': 'application/json',
               Authorization: `Bearer ${useAuthStore.getState().accessToken}`
             },
             credentials: 'include'
           })
           
           if (!retryResponse.ok) {
             throw new Error('Request failed after token refresh')
           }
           
           return retryResponse.json()
         } catch (error) {
           logout()
           throw new Error('Authentication failed')
         }
       }
   
       if (!response.ok) {
         throw new Error(`API request failed: ${response.statusText}`)
       }
   
       return response.json()
     }
   
     async googleLogin(idToken: string) {
       return this.request('/auth/google', {
         method: 'POST',
         body: JSON.stringify({ id_token: idToken })
       })
     }
   }
   
   export const apiClient = new VanaAPIClient()
   ```

### Phase 2: Google OAuth Integration (60 minutes)

3. **Install Google OAuth**
   ```bash
   npm install @google-cloud/auth-library
   npm install -D @types/google.accounts
   ```

4. **Google OAuth Service**
   ```typescript
   // lib/auth/google-oauth.ts
   interface GoogleAuthResponse {
     credential: string
     select_by: string
   }
   
   interface GoogleUser {
     id: string
     email: string
     name: string
     picture: string
     verified_email: boolean
   }
   
   export class GoogleOAuthService {
     private clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!
   
     initialize() {
       if (typeof window === 'undefined') return
   
       // Load Google Identity Services
       const script = document.createElement('script')
       script.src = 'https://accounts.google.com/gsi/client'
       script.async = true
       script.defer = true
       document.head.appendChild(script)
   
       script.onload = () => {
         window.google?.accounts.id.initialize({
           client_id: this.clientId,
           callback: this.handleCredentialResponse
         })
       }
     }
   
     private handleCredentialResponse = async (response: GoogleAuthResponse) => {
       const { setLoading, setError, setUser, setTokens } = useAuthStore.getState()
       
       try {
         setLoading(true)
         setError(null)
   
         // Send credential to backend
         const result = await apiClient.googleLogin(response.credential)
         
         const { access_token, refresh_token, user } = result
         
         // Store tokens and user info
         setTokens(access_token, refresh_token)
         setUser(user)
         
         // Start auto-refresh
         this.startTokenRefresh()
         
         // Redirect to app
         window.location.href = '/'
         
       } catch (error) {
         console.error('Google login failed:', error)
         setError('Login failed. Please try again.')
       } finally {
         setLoading(false)
       }
     }
   
     signIn() {
       if (typeof window !== 'undefined' && window.google) {
         window.google.accounts.id.prompt()
       }
     }
   
     renderButton(element: HTMLElement) {
       if (typeof window !== 'undefined' && window.google) {
         window.google.accounts.id.renderButton(element, {
           theme: 'filled_black',
           size: 'large',
           text: 'continue_with',
           width: '100%'
         })
       }
     }
   
     private startTokenRefresh() {
       // Refresh tokens every 25 minutes
       setInterval(async () => {
         const { refreshTokens } = useAuthStore.getState()
         await refreshTokens()
       }, 25 * 60 * 1000)
     }
   }
   
   export const googleAuth = new GoogleOAuthService()
   ```

5. **Add Google Types**
   ```typescript
   // types/google.d.ts
   declare global {
     interface Window {
       google?: {
         accounts: {
           id: {
             initialize: (config: any) => void
             prompt: () => void
             renderButton: (element: HTMLElement, config: any) => void
           }
         }
       }
     }
   }
   
   export {}
   ```

### Phase 3: Auth Pages (45 minutes)

6. **Auth Page Layout**
   ```typescript
   // app/auth/page.tsx
   import { AuthForm } from '@/components/auth/AuthForm'
   import { Suspense } from 'react'
   
   export default function AuthPage() {
     return (
       <div className="min-h-screen flex items-center justify-center bg-background">
         <div className="w-full max-w-md">
           <Suspense fallback={<div>Loading...</div>}>
             <AuthForm />
           </Suspense>
         </div>
       </div>
     )
   }
   ```

7. **Auth Form Component**
   ```typescript
   // components/auth/AuthForm.tsx
   'use client'
   
   import { useEffect, useRef, useState } from 'react'
   import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
   import { Button } from '@/components/ui/button'
   import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
   import { Alert, AlertDescription } from '@/components/ui/alert'
   import { Loader2 } from 'lucide-react'
   import { useAuthStore } from '@/stores/authStore'
   import { googleAuth } from '@/lib/auth/google-oauth'
   import { useRouter } from 'next/navigation'
   
   export const AuthForm = () => {
     const router = useRouter()
     const googleButtonRef = useRef<HTMLDivElement>(null)
     const [activeTab, setActiveTab] = useState('login')
     const { isLoading, error, isAuthenticated, setError } = useAuthStore()
   
     useEffect(() => {
       // Initialize Google OAuth
       googleAuth.initialize()
   
       // Render Google button after initialization
       setTimeout(() => {
         if (googleButtonRef.current) {
           googleAuth.renderButton(googleButtonRef.current)
         }
       }, 1000)
     }, [])
   
     useEffect(() => {
       // Redirect if already authenticated
       if (isAuthenticated) {
         router.push('/')
       }
     }, [isAuthenticated, router])
   
     const handleGoogleSignIn = () => {
       setError(null)
       googleAuth.signIn()
     }
   
     if (isAuthenticated) {
       return (
         <Card className="w-[400px]">
           <CardContent className="pt-6">
             <div className="flex items-center justify-center">
               <Loader2 className="h-6 w-6 animate-spin" />
               <span className="ml-2">Redirecting...</span>
             </div>
           </CardContent>
         </Card>
       )
     }
   
     return (
       <Card className="w-[400px]">
         <CardHeader className="text-center">
           <CardTitle className="text-2xl">Welcome to Vana</CardTitle>
           <CardDescription>
             Multi-agent AI platform built on Google ADK
           </CardDescription>
         </CardHeader>
         <CardContent>
           <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
             <TabsList className="grid w-full grid-cols-2">
               <TabsTrigger value="login">Login</TabsTrigger>
               <TabsTrigger value="register">Register</TabsTrigger>
             </TabsList>
             
             <TabsContent value="login" className="space-y-4">
               <div className="space-y-4">
                 {error && (
                   <Alert variant="destructive">
                     <AlertDescription>{error}</AlertDescription>
                   </Alert>
                 )}
                 
                 <Button 
                   variant="outline" 
                   className="w-full h-12"
                   onClick={handleGoogleSignIn}
                   disabled={isLoading}
                 >
                   {isLoading ? (
                     <Loader2 className="h-4 w-4 animate-spin mr-2" />
                   ) : (
                     <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                       <path
                         fill="currentColor"
                         d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                       />
                       <path
                         fill="currentColor"
                         d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                       />
                       <path
                         fill="currentColor"
                         d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                       />
                       <path
                         fill="currentColor"
                         d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                       />
                     </svg>
                   )}
                   Continue with Google
                 </Button>
                 
                 <div ref={googleButtonRef} className="w-full" />
               </div>
             </TabsContent>
             
             <TabsContent value="register" className="space-y-4">
               <div className="text-center text-sm text-muted-foreground">
                 Registration is handled through Google OAuth. Click "Continue with Google" to create your account.
               </div>
               
               <Button 
                 variant="outline" 
                 className="w-full h-12"
                 onClick={handleGoogleSignIn}
                 disabled={isLoading}
               >
                 {isLoading ? (
                   <Loader2 className="h-4 w-4 animate-spin mr-2" />
                 ) : (
                   <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                     {/* Google icon paths */}
                   </svg>
                 )}
                 Create account with Google
               </Button>
             </TabsContent>
           </Tabs>
           
           <div className="mt-6 text-center text-xs text-muted-foreground">
             By continuing, you agree to our Terms of Service and Privacy Policy
           </div>
         </CardContent>
       </Card>
     )
   }
   ```

### Phase 4: Route Protection (30 minutes)

8. **Auth Middleware**
   ```typescript
   // middleware.ts
   import { NextResponse } from 'next/server'
   import type { NextRequest } from 'next/server'
   
   export function middleware(request: NextRequest) {
     const { pathname } = request.nextUrl
     
     // Public routes that don't require authentication
     const publicRoutes = ['/auth', '/api/auth']
     
     if (publicRoutes.some(route => pathname.startsWith(route))) {
       return NextResponse.next()
     }
   
     // Check for authentication
     const authCookie = request.cookies.get('auth-storage')
     
     if (!authCookie) {
       return NextResponse.redirect(new URL('/auth', request.url))
     }
   
     try {
       const authData = JSON.parse(authCookie.value)
       
       if (!authData.state?.isAuthenticated) {
         return NextResponse.redirect(new URL('/auth', request.url))
       }
     } catch (error) {
       return NextResponse.redirect(new URL('/auth', request.url))
     }
   
     return NextResponse.next()
   }
   
   export const config = {
     matcher: [
       /*
        * Match all request paths except for the ones starting with:
        * - api (API routes)
        * - _next/static (static files)
        * - _next/image (image optimization files)
        * - favicon.ico (favicon file)
        */
       '/((?!api|_next/static|_next/image|favicon.ico).*)',
     ],
   }
   ```

9. **Auth Guard Hook**
   ```typescript
   // lib/hooks/useAuthGuard.ts
   import { useEffect } from 'react'
   import { useRouter } from 'next/navigation'
   import { useAuthStore } from '@/stores/authStore'
   
   export const useAuthGuard = () => {
     const router = useRouter()
     const { isAuthenticated, isLoading, refreshTokens } = useAuthStore()
   
     useEffect(() => {
       const checkAuth = async () => {
         if (!isAuthenticated && !isLoading) {
           try {
             // Try to refresh tokens from cookie
             await refreshTokens()
           } catch (error) {
             // Redirect to auth if refresh fails
             router.push('/auth')
           }
         }
       }
   
       checkAuth()
     }, [isAuthenticated, isLoading, refreshTokens, router])
   
     return { isAuthenticated, isLoading }
   }
   ```

## 🧠 THINK HARD Instructions

Before implementing ANY auth component:

1. **Security First**: Is this secure against XSS and CSRF attacks?
2. **Token Storage**: Are tokens stored safely and not exposed?
3. **Error Handling**: What happens when authentication fails?
4. **User Experience**: Is the auth flow smooth and intuitive?
5. **Backend Integration**: Does this work with the actual backend endpoints?
6. **Route Protection**: Are all protected routes actually protected?
7. **Token Refresh**: Is token refresh invisible to users?

### Extended Reasoning Prompts:
- "What happens if Google OAuth is down?"
- "How does this handle concurrent login attempts?"
- "What security vulnerabilities could exist in this implementation?"
- "How does this perform on slow mobile connections?"
- "What happens if the backend auth endpoint changes?"

## EXACT shadcn/ui Components for Chunk 3

### Required Components:
```bash
card         # Auth form container
button       # Login/logout buttons
tabs         # Login/register tabs
alert        # Error messages
```

### New Components to Install:
```bash
npx shadcn-ui@latest add alert
```

### Forbidden Components:
- Form libraries like react-hook-form (keep it simple)
- Custom OAuth libraries
- Social login libraries other than Google

## Real Validation Tests

### Test 1: Google OAuth Flow
```bash
# Test complete OAuth flow
# 1. Click "Continue with Google"
# 2. Complete Google login
# 3. Should redirect to homepage
# 4. Should store tokens correctly
# 5. Should maintain login state
```

### Test 2: Token Refresh Test
```typescript
// Test automatic token refresh
// 1. Login successfully
// 2. Wait 25+ minutes or manually trigger refresh
// 3. Should refresh tokens without user action
// 4. Should maintain session state
```

### Test 3: Route Protection Test
```bash
# Test protected routes
# 1. Navigate to /chat without login
# 2. Should redirect to /auth
# 3. Login and navigate to /chat
# 4. Should access successfully
```

### Test 4: Logout Test
```bash
# Test logout functionality
# 1. Login successfully
# 2. Click logout
# 3. Should clear all tokens
# 4. Should redirect to /auth
# 5. Should not be able to access protected routes
```

### Test 5: Error Handling Test
```bash
# Test various error scenarios
# 1. Network error during login
# 2. Invalid token response
# 3. Backend unavailable
# 4. Should show appropriate error messages
```

## What NOT to Do

### 🚫 FORBIDDEN ACTIONS:
1. **NO** storing access tokens in localStorage
2. **NO** client-side JWT verification
3. **NO** hardcoded Google Client IDs
4. **NO** custom OAuth implementations
5. **NO** email/password authentication
6. **NO** missing CSRF protection
7. **NO** exposing refresh tokens to JavaScript
8. **NO** missing error boundaries
9. **NO** synchronous authentication checks
10. **NO** missing loading states

### 🚫 COMMON MISTAKES:
- Not handling network errors properly
- Missing token expiry handling
- Not clearing state on logout
- Hardcoding API endpoints
- Missing accessibility attributes
- Not implementing proper HTTPS checks
- Forgetting to handle concurrent auth requests

### 🚫 ANTI-PATTERNS:
- Storing sensitive data in browser storage
- Making authentication synchronous
- Not implementing proper error recovery
- Missing security headers
- Not validating tokens properly
- Creating custom OAuth flows

## Success Completion Criteria

✅ **Authentication is complete when:**
1. Google OAuth login works flawlessly
2. Tokens are stored securely
3. Automatic token refresh is implemented
4. Route protection works correctly
5. Logout clears all user data
6. Error handling covers all scenarios
7. Auth state persists across sessions
8. No security vulnerabilities exist
9. Loading states are implemented
10. All auth flows are tested

---

**Remember**: Authentication is the security foundation of the entire application. Any security flaw here compromises everything. Take extra time to verify security measures and test all edge cases.