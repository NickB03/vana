import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { AuthPage } from '@/pages/auth'
import { ChatPage } from '@/pages/chat'
import { useAuth } from '@/hooks/useAuth'
import type { User } from 'firebase/auth'

// Mock Firebase Auth
const mockAuth = {
  currentUser: null,
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  getIdToken: vi.fn()
}

const mockGoogleProvider = {
  setCustomParameters: vi.fn(),
  addScope: vi.fn()
}

vi.mock('firebase/auth', () => ({
  getAuth: () => mockAuth,
  GoogleAuthProvider: vi.fn(() => mockGoogleProvider),
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn()
}))

// Mock router navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Navigate: ({ to }: { to: string }) => <div data-testid={`navigate-to-${to.replace('/', '')}`} />
  }
})

// Test wrapper with auth context
const AuthTestWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  )
}

// Mock user object
const mockUser: Partial<User> = {
  uid: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/photo.jpg',
  getIdToken: vi.fn().mockResolvedValue('mock-id-token'),
  getIdTokenResult: vi.fn().mockResolvedValue({
    token: 'mock-id-token',
    claims: {},
    expirationTime: new Date(Date.now() + 3600000).toISOString()
  })
}

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.currentUser = null
    mockNavigate.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication Page', () => {
    it('should render login and register tabs', async () => {
      render(
        <AuthTestWrapper>
          <AuthPage />
        </AuthTestWrapper>
      )

      expect(screen.getByText('Welcome to Vana')).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /login/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /register/i })).toBeInTheDocument()
      expect(screen.getByText('Continue with Google')).toBeInTheDocument()
    })

    it('should switch between login and register forms', async () => {
      const user = userEvent.setup()
      
      render(
        <AuthTestWrapper>
          <AuthPage />
        </AuthTestWrapper>
      )

      // Start on login tab
      expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(/login/i)
      expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
      expect(screen.queryByPlaceholderText(/confirm password/i)).not.toBeInTheDocument()

      // Switch to register tab
      await user.click(screen.getByRole('tab', { name: /register/i }))
      
      expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(/register/i)
      expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/confirm password/i)).toBeInTheDocument()
    })
  })

  describe('Google OAuth Authentication', () => {
    it('should sign in with Google successfully', async () => {
      const user = userEvent.setup()
      
      // Mock successful Google sign in
      mockAuth.signInWithPopup.mockResolvedValue({
        user: mockUser,
        credential: {
          accessToken: 'google-access-token'
        }
      })

      render(
        <AuthTestWrapper>
          <AuthPage />
        </AuthTestWrapper>
      )

      const googleButton = screen.getByText('Continue with Google')
      await user.click(googleButton)

      await waitFor(() => {
        expect(mockAuth.signInWithPopup).toHaveBeenCalledWith(
          mockAuth,
          mockGoogleProvider
        )
      })

      // Should navigate to chat page after successful auth
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/chat')
      })
    })

    it('should handle Google sign in errors', async () => {
      const user = userEvent.setup()
      
      // Mock Google sign in error
      mockAuth.signInWithPopup.mockRejectedValue(new Error('Google sign in failed'))

      render(
        <AuthTestWrapper>
          <AuthPage />
        </AuthTestWrapper>
      )

      const googleButton = screen.getByText('Continue with Google')
      await user.click(googleButton)

      await waitFor(() => {
        expect(screen.getByText(/sign in failed/i)).toBeInTheDocument()
      })

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('should handle Google sign in cancellation', async () => {
      const user = userEvent.setup()
      
      // Mock user cancelling Google sign in
      const cancelError = new Error('Sign in cancelled')
      cancelError.name = 'auth/popup-closed-by-user'
      mockAuth.signInWithPopup.mockRejectedValue(cancelError)

      render(
        <AuthTestWrapper>
          <AuthPage />
        </AuthTestWrapper>
      )

      const googleButton = screen.getByText('Continue with Google')
      await user.click(googleButton)

      // Should not show error for cancellation
      await waitFor(() => {
        expect(screen.queryByText(/sign in failed/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Email/Password Authentication', () => {
    it('should sign in with email and password', async () => {
      const user = userEvent.setup()
      
      mockAuth.signInWithEmailAndPassword.mockResolvedValue({
        user: mockUser
      })

      render(
        <AuthTestWrapper>
          <AuthPage />
        </AuthTestWrapper>
      )

      // Fill in login form
      await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
      await user.type(screen.getByPlaceholderText(/password/i), 'password123')
      
      const signInButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(signInButton)

      await waitFor(() => {
        expect(mockAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
          mockAuth,
          'test@example.com',
          'password123'
        )
      })

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/chat')
      })
    })

    it('should register with email and password', async () => {
      const user = userEvent.setup()
      
      mockAuth.createUserWithEmailAndPassword.mockResolvedValue({
        user: mockUser
      })

      render(
        <AuthTestWrapper>
          <AuthPage />
        </AuthTestWrapper>
      )

      // Switch to register tab
      await user.click(screen.getByRole('tab', { name: /register/i }))

      // Fill in register form
      await user.type(screen.getByPlaceholderText(/email/i), 'newuser@example.com')
      await user.type(screen.getAllByPlaceholderText(/password/i)[0], 'newpassword123')
      await user.type(screen.getByPlaceholderText(/confirm password/i), 'newpassword123')
      
      const registerButton = screen.getByRole('button', { name: /register/i })
      await user.click(registerButton)

      await waitFor(() => {
        expect(mockAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
          mockAuth,
          'newuser@example.com',
          'newpassword123'
        )
      })

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/chat')
      })
    })

    it('should validate password confirmation', async () => {
      const user = userEvent.setup()

      render(
        <AuthTestWrapper>
          <AuthPage />
        </AuthTestWrapper>
      )

      await user.click(screen.getByRole('tab', { name: /register/i }))

      await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
      await user.type(screen.getAllByPlaceholderText(/password/i)[0], 'password123')
      await user.type(screen.getByPlaceholderText(/confirm password/i), 'differentpassword')
      
      const registerButton = screen.getByRole('button', { name: /register/i })
      await user.click(registerButton)

      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      expect(mockAuth.createUserWithEmailAndPassword).not.toHaveBeenCalled()
    })

    it('should handle email/password sign in errors', async () => {
      const user = userEvent.setup()
      
      const authError = new Error('Invalid credentials')
      authError.name = 'auth/invalid-email'
      mockAuth.signInWithEmailAndPassword.mockRejectedValue(authError)

      render(
        <AuthTestWrapper>
          <AuthPage />
        </AuthTestWrapper>
      )

      await user.type(screen.getByPlaceholderText(/email/i), 'invalid@email')
      await user.type(screen.getByPlaceholderText(/password/i), 'wrongpassword')
      
      const signInButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(signInButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
      })
    })
  })

  describe('Authentication State Management', () => {
    it('should persist authentication state', async () => {
      // Mock user is already signed in
      mockAuth.currentUser = mockUser as User
      
      let authStateCallback: (user: User | null) => void = () => {}
      mockAuth.onAuthStateChanged.mockImplementation((callback) => {
        authStateCallback = callback
        return () => {} // unsubscribe function
      })

      const TestComponent = () => {
        const { user, loading } = useAuth()
        
        if (loading) return <div>Loading...</div>
        if (user) return <div>Welcome {user.displayName}</div>
        return <div>Not signed in</div>
      }

      render(
        <AuthTestWrapper>
          <TestComponent />
        </AuthTestWrapper>
      )

      // Initially loading
      expect(screen.getByText('Loading...')).toBeInTheDocument()

      // Simulate auth state change
      act(() => {
        authStateCallback(mockUser as User)
      })

      await waitFor(() => {
        expect(screen.getByText('Welcome Test User')).toBeInTheDocument()
      })
    })

    it('should handle sign out', async () => {
      const user = userEvent.setup()
      
      mockAuth.currentUser = mockUser as User
      mockAuth.signOut.mockResolvedValue(undefined)

      const TestComponent = () => {
        const { user, signOut } = useAuth()
        
        if (user) {
          return (
            <div>
              <span>Signed in as {user.displayName}</span>
              <button onClick={signOut}>Sign Out</button>
            </div>
          )
        }
        return <div>Not signed in</div>
      }

      render(
        <AuthTestWrapper>
          <TestComponent />
        </AuthTestWrapper>
      )

      // Initially signed in
      expect(screen.getByText('Signed in as Test User')).toBeInTheDocument()

      const signOutButton = screen.getByText('Sign Out')
      await user.click(signOutButton)

      await waitFor(() => {
        expect(mockAuth.signOut).toHaveBeenCalled()
      })

      // Should navigate to auth page after sign out
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/auth')
      })
    })

    it('should refresh token automatically', async () => {
      mockAuth.currentUser = {
        ...mockUser,
        getIdToken: vi.fn()
          .mockResolvedValueOnce('expired-token')
          .mockResolvedValueOnce('fresh-token')
      } as any

      const TestComponent = () => {
        const { getToken } = useAuth()
        const [token, setToken] = React.useState<string | null>(null)
        
        React.useEffect(() => {
          getToken().then(setToken)
        }, [])
        
        return <div>Token: {token}</div>
      }

      render(
        <AuthTestWrapper>
          <TestComponent />
        </AuthTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/Token: expired-token/)).toBeInTheDocument()
      })

      // Simulate token refresh after expiration
      act(() => {
        vi.advanceTimersByTime(3600000) // 1 hour
      })

      await waitFor(() => {
        expect(mockAuth.currentUser.getIdToken).toHaveBeenCalledWith(true) // force refresh
      })
    })
  })

  describe('Route Protection', () => {
    it('should redirect unauthenticated users to auth page', async () => {
      mockAuth.currentUser = null

      render(
        <AuthTestWrapper>
          <ChatPage />
        </AuthTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('navigate-to-auth')).toBeInTheDocument()
      })
    })

    it('should allow authenticated users to access protected routes', async () => {
      mockAuth.currentUser = mockUser as User

      const TestProtectedPage = () => {
        const { user } = useAuth()
        
        if (!user) return <div>Redirecting...</div>
        return <div>Protected content for {user.displayName}</div>
      }

      render(
        <AuthTestWrapper>
          <TestProtectedPage />
        </AuthTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Protected content for Test User')).toBeInTheDocument()
      })
    })

    it('should redirect authenticated users away from auth page', async () => {
      mockAuth.currentUser = mockUser as User

      render(
        <AuthTestWrapper>
          <AuthPage />
        </AuthTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('navigate-to-chat')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States and Error Handling', () => {
    it('should show loading state during authentication', async () => {
      const user = userEvent.setup()
      
      // Mock slow Google sign in
      mockAuth.signInWithPopup.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ user: mockUser }), 1000))
      )

      render(
        <AuthTestWrapper>
          <AuthPage />
        </AuthTestWrapper>
      )

      const googleButton = screen.getByText('Continue with Google')
      await user.click(googleButton)

      // Should show loading state
      expect(screen.getByText(/signing in/i)).toBeInTheDocument()
      expect(googleButton).toBeDisabled()
    })

    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup()
      
      const networkError = new Error('Network error')
      networkError.name = 'auth/network-request-failed'
      mockAuth.signInWithPopup.mockRejectedValue(networkError)

      render(
        <AuthTestWrapper>
          <AuthPage />
        </AuthTestWrapper>
      )

      const googleButton = screen.getByText('Continue with Google')
      await user.click(googleButton)

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })

      // Should show retry button
      expect(screen.getByText(/retry/i)).toBeInTheDocument()
    })

    it('should clear errors when switching auth methods', async () => {
      const user = userEvent.setup()
      
      // First attempt with email fails
      mockAuth.signInWithEmailAndPassword.mockRejectedValue(new Error('Invalid email'))

      render(
        <AuthTestWrapper>
          <AuthPage />
        </AuthTestWrapper>
      )

      await user.type(screen.getByPlaceholderText(/email/i), 'invalid@email')
      await user.type(screen.getByPlaceholderText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
      })

      // Switch to Google sign in - error should clear
      const googleButton = screen.getByText('Continue with Google')
      await user.click(googleButton)

      expect(screen.queryByText(/invalid email/i)).not.toBeInTheDocument()
    })
  })
})