/**
 * Authentication Store - JWT-based auth with Google OAuth
 * Handles user authentication, token management, and automatic refresh
 */

import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { AuthStore, User, AuthTokens } from '@/types'

// Mock API client - will be replaced with actual implementation
const authApi = {
  async googleLogin(idToken: string): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    console.log('Google login (mock):', idToken)
    return {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        preferences: {
          theme: 'dark',
          language: 'en',
          notifications: true
        }
      }
    }
  },

  async login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    console.log('Email login (mock):', { email, password })
    return this.googleLogin('mock-id-token')
  },

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    console.log('Refresh tokens (mock):', refreshToken)
    return {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token'
    }
  },

  async updateUser(updates: Partial<User>): Promise<User> {
    console.log('Update user (mock):', updates)
    return {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      createdAt: new Date().toISOString(),
      ...updates
    }
  }
}

export const useAuthStore = create<AuthStore>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Initial state
        isAuthenticated: false,
        user: null,
        tokens: null,
        isLoading: false,
        error: null,

        // Actions
        login: async (email: string, password: string) => {
          set(state => {
            state.isLoading = true
            state.error = null
          })

          try {
            const response = await authApi.login(email, password)
            const expiresAt = Date.now() + (60 * 60 * 1000) // 1 hour

            set(state => {
              state.isAuthenticated = true
              state.user = response.user
              state.tokens = {
                accessToken: response.accessToken,
                refreshToken: response.refreshToken,
                expiresAt
              }
              state.isLoading = false
            })

            // Start token refresh timer
            get().startTokenRefresh()
          } catch (error) {
            set(state => {
              state.error = error instanceof Error ? error.message : 'Login failed'
              state.isLoading = false
            })
            throw error
          }
        },

        googleLogin: async (idToken: string) => {
          set(state => {
            state.isLoading = true
            state.error = null
          })

          try {
            const response = await authApi.googleLogin(idToken)
            const expiresAt = Date.now() + (60 * 60 * 1000) // 1 hour

            set(state => {
              state.isAuthenticated = true
              state.user = response.user
              state.tokens = {
                accessToken: response.accessToken,
                refreshToken: response.refreshToken,
                expiresAt
              }
              state.isLoading = false
            })

            // Start token refresh timer
            get().startTokenRefresh()
          } catch (error) {
            set(state => {
              state.error = error instanceof Error ? error.message : 'Google login failed'
              state.isLoading = false
            })
            throw error
          }
        },

        logout: () => {
          set(state => {
            state.isAuthenticated = false
            state.user = null
            state.tokens = null
            state.error = null
          })

          // Clear any running refresh timers
          if (tokenRefreshTimer) {
            clearTimeout(tokenRefreshTimer)
            tokenRefreshTimer = null
          }
        },

        refreshTokens: async () => {
          const state = get()
          if (!state.tokens?.refreshToken) {
            throw new Error('No refresh token available')
          }

          try {
            const response = await authApi.refreshTokens(state.tokens.refreshToken)
            const expiresAt = Date.now() + (60 * 60 * 1000) // 1 hour

            set(draft => {
              if (draft.tokens) {
                draft.tokens.accessToken = response.accessToken
                draft.tokens.refreshToken = response.refreshToken
                draft.tokens.expiresAt = expiresAt
              }
            })
          } catch (error) {
            console.error('Token refresh failed:', error)
            // If refresh fails, logout the user
            get().logout()
            throw error
          }
        },

        updateUser: async (updates: Partial<User>) => {
          const state = get()
          if (!state.user) return

          set(draft => {
            draft.isLoading = true
            draft.error = null
          })

          try {
            const updatedUser = await authApi.updateUser(updates)

            set(draft => {
              draft.user = updatedUser
              draft.isLoading = false
            })
          } catch (error) {
            set(draft => {
              draft.error = error instanceof Error ? error.message : 'Failed to update user'
              draft.isLoading = false
            })
            throw error
          }
        },

        clearError: () => {
          set(state => {
            state.error = null
          })
        },

        // Token refresh management
        startTokenRefresh: () => {
          const state = get()
          if (!state.tokens) return

          const timeUntilExpiry = state.tokens.expiresAt - Date.now()
          const refreshTime = timeUntilExpiry - (5 * 60 * 1000) // Refresh 5 minutes before expiry

          if (refreshTime > 0) {
            tokenRefreshTimer = setTimeout(() => {
              get().refreshTokens().catch(console.error)
            }, refreshTime)
          }
        }
      })),
      {
        name: 'vana-auth-storage',
        partialize: (state) => ({
          isAuthenticated: state.isAuthenticated,
          user: state.user,
          tokens: state.tokens
        })
      }
    )
  )
)

// Token refresh timer
let tokenRefreshTimer: NodeJS.Timeout | null = null

// Auto-start token refresh on store hydration
useAuthStore.subscribe(
  (state) => state.tokens,
  (tokens) => {
    if (tokens && tokens.expiresAt > Date.now()) {
      useAuthStore.getState().startTokenRefresh()
    }
  }
)

// Selectors for common auth checks
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated)
export const useCurrentUser = () => useAuthStore(state => state.user)
export const useAuthLoading = () => useAuthStore(state => state.isLoading)
export const useAuthError = () => useAuthStore(state => state.error)