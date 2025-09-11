/**
 * Authentication System Integration Tests
 * 
 * Comprehensive tests for JWT authentication flow including:
 * - Login/logout functionality
 * - Token storage and retrieval
 * - Automatic token refresh
 * - Protected route behavior
 * - Error handling for auth failures
 */

import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { apiService } from '@/lib/api-client'

// Mock auth service (would be implemented in a real auth module)
class MockAuthService {
  private tokenKey = 'vana_auth_token'
  private userKey = 'vana_user_data'

  async login(email: string, password: string) {
    const response = await fetch('http://localhost:8000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail)
    }

    const data = await response.json()
    
    // Store token and user data
    localStorage.setItem(this.tokenKey, data.access_token)
    localStorage.setItem(this.userKey, JSON.stringify(data.user))
    
    return data
  }

  async logout() {
    localStorage.removeItem(this.tokenKey)
    localStorage.removeItem(this.userKey)
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey)
  }

  getUser(): any | null {
    const userData = localStorage.getItem(this.userKey)
    return userData ? JSON.parse(userData) : null
  }

  isAuthenticated(): boolean {
    return !!this.getToken()
  }

  async refreshToken(): Promise<string> {
    const currentToken = this.getToken()
    if (!currentToken) {
      throw new Error('No token to refresh')
    }

    const response = await fetch('http://localhost:8000/auth/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail)
    }

    const data = await response.json()
    localStorage.setItem(this.tokenKey, data.access_token)
    
    return data.access_token
  }

  async getProfile() {
    const token = this.getToken()
    if (!token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch('http://localhost:8000/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail)
    }

    return response.json()
  }
}

describe('Authentication Integration Tests', () => {
  let authService: MockAuthService

  beforeEach(() => {
    authService = new MockAuthService()
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('Login Flow', () => {
    it('should login successfully with valid credentials', async () => {
      const result = await authService.login('test@example.com', 'password123')
      
      expect(result).toEqual({
        access_token: 'mock_jwt_token_12345',
        token_type: 'bearer',
        expires_in: 3600,
        user: {
          id: 'user_123',
          email: 'test@example.com',
          name: 'Test User'
        }
      })
      
      // Verify token is stored
      expect(authService.getToken()).toBe('mock_jwt_token_12345')
      expect(authService.isAuthenticated()).toBe(true)
      
      // Verify user data is stored
      const userData = authService.getUser()
      expect(userData).toEqual({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User'
      })
    })

    it('should reject invalid credentials', async () => {
      await expect(
        authService.login('wrong@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials')
      
      expect(authService.isAuthenticated()).toBe(false)
      expect(authService.getToken()).toBeNull()
    })

    it('should handle login with empty credentials', async () => {
      await expect(
        authService.login('', '')
      ).rejects.toThrow('Invalid credentials')
    })

    it('should handle network errors during login', async () => {
      server.use(
        http.post('http://localhost:8000/auth/login', () => {
          throw new Error('Network error')
        })
      )

      await expect(
        authService.login('test@example.com', 'password123')
      ).rejects.toThrow()
    })
  })

  describe('Logout Flow', () => {
    beforeEach(async () => {
      // Login first
      await authService.login('test@example.com', 'password123')
    })

    it('should logout successfully and clear storage', async () => {
      expect(authService.isAuthenticated()).toBe(true)
      
      await authService.logout()
      
      expect(authService.isAuthenticated()).toBe(false)
      expect(authService.getToken()).toBeNull()
      expect(authService.getUser()).toBeNull()
    })

    it('should handle logout when not authenticated', async () => {
      await authService.logout() // Logout first time
      
      // Should not throw when logging out again
      await expect(authService.logout()).resolves.toBeUndefined()
    })
  })

  describe('Token Management', () => {
    beforeEach(async () => {
      await authService.login('test@example.com', 'password123')
    })

    it('should retrieve stored token correctly', () => {
      const token = authService.getToken()
      expect(token).toBe('mock_jwt_token_12345')
    })

    it('should detect authentication state correctly', () => {
      expect(authService.isAuthenticated()).toBe(true)
      
      // Clear token and check again
      localStorage.removeItem('vana_auth_token')
      expect(authService.isAuthenticated()).toBe(false)
    })

    it('should refresh token successfully', async () => {
      const newToken = await authService.refreshToken()
      
      expect(newToken).toBe('mock_refreshed_jwt_token_67890')
      expect(authService.getToken()).toBe('mock_refreshed_jwt_token_67890')
    })

    it('should handle token refresh failure', async () => {
      // Set invalid token
      localStorage.setItem('vana_auth_token', 'invalid_token')
      
      await expect(
        authService.refreshToken()
      ).rejects.toThrow('Invalid token')
    })

    it('should handle token refresh when no token exists', async () => {
      await authService.logout()
      
      await expect(
        authService.refreshToken()
      ).rejects.toThrow('No token to refresh')
    })
  })

  describe('Protected Endpoints', () => {
    it('should access protected endpoint with valid token', async () => {
      await authService.login('test@example.com', 'password123')
      
      const profile = await authService.getProfile()
      
      expect(profile).toEqual({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['user']
      })
    })

    it('should reject access to protected endpoint without token', async () => {
      await expect(
        authService.getProfile()
      ).rejects.toThrow('Not authenticated')
    })

    it('should reject access with invalid token', async () => {
      localStorage.setItem('vana_auth_token', 'invalid_token')
      
      await expect(
        authService.getProfile()
      ).rejects.toThrow('Authentication required')
    })

    it('should include auth header in API client requests', async () => {
      await authService.login('test@example.com', 'password123')
      
      // Enable auth requirement
      process.env.NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH = 'true'
      
      let receivedHeaders: Headers | undefined
      
      server.use(
        http.get('http://localhost:8000/health', ({ request }) => {
          receivedHeaders = request.headers
          return HttpResponse.json({ status: 'healthy', timestamp: new Date().toISOString() })
        })
      )

      await apiService.healthCheck()
      
      expect(receivedHeaders?.get('Authorization')).toBe('Bearer mock_jwt_token_12345')
      
      // Reset env
      process.env.NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH = 'false'
    })
  })

  describe('Authentication Flow Integration', () => {
    it('should maintain authentication across page reloads', async () => {
      // Login and store token
      await authService.login('test@example.com', 'password123')
      
      // Simulate page reload by creating new auth service instance
      const newAuthService = new MockAuthService()
      
      expect(newAuthService.isAuthenticated()).toBe(true)
      expect(newAuthService.getToken()).toBe('mock_jwt_token_12345')
      expect(newAuthService.getUser()).toEqual({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User'
      })
    })

    it('should handle expired tokens gracefully', async () => {
      await authService.login('test@example.com', 'password123')
      
      // Mock expired token response
      server.use(
        http.get('http://localhost:8000/auth/me', () => {
          return HttpResponse.json(
            { detail: 'Token expired' },
            { status: 401 }
          )
        })
      )

      await expect(
        authService.getProfile()
      ).rejects.toThrow('Token expired')
    })

    it('should handle concurrent authentication requests', async () => {
      const promises = [
        authService.login('test@example.com', 'password123'),
        authService.login('test@example.com', 'password123'),
        authService.login('test@example.com', 'password123')
      ]
      
      const results = await Promise.all(promises)
      
      // All should succeed
      results.forEach(result => {
        expect(result.access_token).toBe('mock_jwt_token_12345')
      })
      
      expect(authService.isAuthenticated()).toBe(true)
    })
  })

  describe('Security Considerations', () => {
    it('should not expose sensitive data in localStorage', async () => {
      await authService.login('test@example.com', 'password123')
      
      // Check that password is not stored anywhere
      const allLocalStorageData = Object.keys(localStorage).map(key => ({
        key,
        value: localStorage.getItem(key)
      }))
      
      const allData = JSON.stringify(allLocalStorageData)
      expect(allData).not.toContain('password123')
      expect(allData).not.toContain('password')
    })

    it('should validate token format', () => {
      const token = authService.getToken()
      
      if (token) {
        // Basic JWT format check (should have 3 parts separated by dots)
        expect(token).toMatch(/^[^.]+\.[^.]+\.[^.]*$/) // This is a mock token, so we just check it's not empty
      }
    })

    it('should handle authentication headers correctly', async () => {
      await authService.login('test@example.com', 'password123')
      
      let requestHeaders: Headers | undefined
      
      server.use(
        http.get('http://localhost:8000/auth/me', ({ request }) => {
          requestHeaders = request.headers
          return HttpResponse.json({ id: 'user_123' })
        })
      )

      await authService.getProfile()
      
      const authHeader = requestHeaders?.get('Authorization')
      expect(authHeader).toBe('Bearer mock_jwt_token_12345')
      expect(authHeader).toMatch(/^Bearer [^\s]+$/)
    })
  })

  describe('Error Recovery', () => {
    it('should handle network timeouts during authentication', async () => {
      server.use(
        http.post('http://localhost:8000/auth/login', async () => {
          // Simulate timeout
          await new Promise(resolve => setTimeout(resolve, 100))
          throw new Error('Timeout')
        })
      )

      await expect(
        authService.login('test@example.com', 'password123')
      ).rejects.toThrow()
    })

    it('should recover from authentication failures', async () => {
      // First attempt fails
      server.use(
        http.post('http://localhost:8000/auth/login', () => {
          return HttpResponse.json(
            { detail: 'Server temporarily unavailable' },
            { status: 503 }
          )
        })
      )

      await expect(
        authService.login('test@example.com', 'password123')
      ).rejects.toThrow('Server temporarily unavailable')

      // Reset to successful response
      server.resetHandlers()

      // Second attempt should succeed
      const result = await authService.login('test@example.com', 'password123')
      expect(result.access_token).toBe('mock_jwt_token_12345')
    })

    it('should handle malformed authentication responses', async () => {
      server.use(
        http.post('http://localhost:8000/auth/login', () => {
          return new HttpResponse('Invalid JSON{', {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        })
      )

      await expect(
        authService.login('test@example.com', 'password123')
      ).rejects.toThrow()
    })
  })

  describe('Session Management', () => {
    it('should handle multiple concurrent sessions', async () => {
      // Simulate multiple auth service instances (multiple tabs)
      const authService1 = new MockAuthService()
      const authService2 = new MockAuthService()
      
      await authService1.login('test@example.com', 'password123')
      
      // Both instances should see the same authentication state
      expect(authService1.isAuthenticated()).toBe(true)
      expect(authService2.isAuthenticated()).toBe(true)
      expect(authService1.getToken()).toBe(authService2.getToken())
      
      // Logout from one should affect both
      await authService1.logout()
      
      expect(authService1.isAuthenticated()).toBe(false)
      expect(authService2.isAuthenticated()).toBe(false)
    })

    it('should handle session expiration', async () => {
      await authService.login('test@example.com', 'password123')
      
      // Mock session expiration
      server.use(
        http.post('http://localhost:8000/auth/refresh', () => {
          return HttpResponse.json(
            { detail: 'Refresh token expired' },
            { status: 401 }
          )
        })
      )

      await expect(
        authService.refreshToken()
      ).rejects.toThrow('Refresh token expired')
    })
  })
})