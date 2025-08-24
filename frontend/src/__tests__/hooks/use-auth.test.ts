import { renderHook, act } from '@testing-library/react'
import { useAuth } from '@/hooks/use-auth'

// Mock the auth store
jest.mock('@/store/auth-store', () => ({
  useAuthStore: jest.fn(),
}))

describe('useAuth Hook', () => {
  const mockAuthStore = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: jest.fn(),
    logout: jest.fn(),
    clearError: jest.fn(),
  }

  beforeEach(() => {
    const { useAuthStore } = require('@/store/auth-store')
    useAuthStore.mockReturnValue(mockAuthStore)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('returns initial auth state', () => {
    const { result } = renderHook(() => useAuth())
    
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  test('handles login', async () => {
    mockAuthStore.login.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' }
    })

    const { result } = renderHook(() => useAuth())
    
    await act(async () => {
      await result.current.login('test@example.com', 'password')
    })
    
    expect(mockAuthStore.login).toHaveBeenCalledWith('test@example.com', 'password')
  })

  test('handles logout', async () => {
    const { result } = renderHook(() => useAuth())
    
    await act(async () => {
      await result.current.logout()
    })
    
    expect(mockAuthStore.logout).toHaveBeenCalled()
  })

  test('handles authentication errors', () => {
    mockAuthStore.error = 'Invalid credentials'
    
    const { result } = renderHook(() => useAuth())
    
    expect(result.current.error).toBe('Invalid credentials')
  })

  test('clears errors', () => {
    const { result } = renderHook(() => useAuth())
    
    act(() => {
      result.current.clearError()
    })
    
    expect(mockAuthStore.clearError).toHaveBeenCalled()
  })
})