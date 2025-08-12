import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: 'admin' | 'user' | 'guest'
}

export interface AppState {
  // User state
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // UI state
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
  
  // Error state
  error: string | null
  
  // Actions
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setError: (error: string | null) => void
  clearError: () => void
  reset: () => void
}

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  sidebarOpen: false,
  theme: 'dark' as const,
  error: null,
}

export const useAppStore = create<AppState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,
        
        setUser: (user) =>
          set((state) => {
            state.user = user
            state.isAuthenticated = !!user
          }),
          
        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading
          }),
          
        setSidebarOpen: (open) =>
          set((state) => {
            state.sidebarOpen = open
          }),
          
        setTheme: (theme) =>
          set((state) => {
            state.theme = theme
          }),
          
        setError: (error) =>
          set((state) => {
            state.error = error
          }),
          
        clearError: () =>
          set((state) => {
            state.error = null
          }),
          
        reset: () =>
          set((state) => {
            Object.assign(state, initialState)
          }),
      })),
      'app-store'
    )
  )
)

// Selectors for performance optimization
export const useUser = () => useAppStore((state) => state.user)
export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated)
export const useIsLoading = () => useAppStore((state) => state.isLoading)
export const useSidebarOpen = () => useAppStore((state) => state.sidebarOpen)
export const useTheme = () => useAppStore((state) => state.theme)
export const useError = () => useAppStore((state) => state.error)