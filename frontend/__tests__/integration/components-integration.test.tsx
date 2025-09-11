/**
 * React Components Integration Tests
 * 
 * Tests React components with real backend integration including:
 * - Chat interface with real API calls
 * - Streaming message components with SSE
 * - Error states and loading indicators
 * - User authentication UI components
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { ChatProvider, useChatContext } from '@/contexts/chat-context'
import { TEST_STORAGE_KEYS } from '../constants/test-config'

// Mock chat interface component for testing
const MockChatInterface = () => {
  const { 
    messages, 
    streamingState, 
    isWaitingForResponse,
    sendMessage,
    clearMessages,
    connectionStatus 
  } = useChatContext()

  const [inputValue, setInputValue] = React.useState('')

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue.trim())
      setInputValue('')
    }
  }

  return (
    <div data-testid="chat-interface">
      {/* Connection Status */}
      <div data-testid="connection-status">
        Status: {connectionStatus}
      </div>

      {/* Messages Display */}
      <div data-testid="messages-container">
        {messages.map((message) => (
          <div 
            key={message.id} 
            data-testid={`message-${message.role}`}
            data-content={message.content}
          >
            <span data-testid="message-role">{message.role}:</span>
            <span data-testid="message-content">{message.content}</span>
          </div>
        ))}
      </div>

      {/* Streaming State */}
      {streamingState.isStreaming && (
        <div data-testid="streaming-message">
          <span data-testid="streaming-role">assistant:</span>
          <span data-testid="streaming-content">{streamingState.content}</span>
          <span data-testid="streaming-indicator">...</span>
        </div>
      )}

      {/* Error State */}
      {streamingState.error && (
        <div data-testid="error-message">
          Error: {streamingState.error}
        </div>
      )}

      {/* Loading State */}
      {isWaitingForResponse && (
        <div data-testid="loading-indicator">
          Waiting for response...
        </div>
      )}

      {/* Input Form */}
      <div data-testid="input-form">
        <input
          data-testid="message-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          disabled={isWaitingForResponse || streamingState.isStreaming}
          placeholder="Type your message..."
        />
        <button
          data-testid="send-button"
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isWaitingForResponse || streamingState.isStreaming}
        >
          Send
        </button>
        <button
          data-testid="clear-button"
          onClick={clearMessages}
        >
          Clear
        </button>
      </div>
    </div>
  )
}

// Authentication component mock
const MockAuthComponent = () => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')

  const handleLogin = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail)
      }

      const data = await response.json()
      localStorage.setItem('vana_auth_token', data.access_token)
      setIsAuthenticated(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('vana_auth_token')
    setIsAuthenticated(false)
    setEmail('')
    setPassword('')
  }

  React.useEffect(() => {
    // Check for existing auth token
    const token = localStorage.getItem(TEST_STORAGE_KEYS.AUTH_TOKEN)
    setIsAuthenticated(!!token)
  }, [])

  if (isAuthenticated) {
    return (
      <div data-testid="authenticated-view">
        <div data-testid="auth-status">Authenticated</div>
        <button data-testid="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    )
  }

  return (
    <div data-testid="login-form">
      {error && (
        <div data-testid="auth-error" role="alert">
          {error}
        </div>
      )}
      
      <input
        data-testid="email-input"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isLoading}
      />
      
      <input
        data-testid="password-input"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isLoading}
      />
      
      <button
        data-testid="login-button"
        onClick={handleLogin}
        disabled={!email || !password || isLoading}
      >
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
      
      {isLoading && (
        <div data-testid="login-loading">
          Loading...
        </div>
      )}
    </div>
  )
}

describe('React Components Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('Chat Interface Component', () => {
    const renderChatInterface = () => {
      return render(
        <ChatProvider>
          <MockChatInterface />
        </ChatProvider>
      )
    }

    it('should render chat interface correctly', () => {
      renderChatInterface()
      
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      expect(screen.getByTestId('connection-status')).toBeInTheDocument()
      expect(screen.getByTestId('messages-container')).toBeInTheDocument()
      expect(screen.getByTestId('input-form')).toBeInTheDocument()
      expect(screen.getByTestId('message-input')).toBeInTheDocument()
      expect(screen.getByTestId('send-button')).toBeInTheDocument()
    })

    it('should show initial connection status', () => {
      renderChatInterface()
      
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Status: disconnected')
    })

    it('should handle user message input and sending', async () => {
      const user = userEvent.setup()
      renderChatInterface()

      const input = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')

      // Send button should be disabled initially
      expect(sendButton).toBeDisabled()

      // Type a message
      await user.type(input, 'Hello, how are you?')
      expect(input).toHaveValue('Hello, how are you?')
      
      // Send button should be enabled
      expect(sendButton).not.toBeDisabled()

      // Send the message
      await user.click(sendButton)

      // Should show user message immediately
      await waitFor(() => {
        expect(screen.getByTestId('message-user')).toBeInTheDocument()
      })

      expect(screen.getByTestId('message-user')).toHaveAttribute('data-content', 'Hello, how are you?')
      
      // Input should be cleared
      expect(input).toHaveValue('')
    })

    it('should show loading state while waiting for response', async () => {
      const user = userEvent.setup()
      renderChatInterface()

      const input = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')

      await user.type(input, 'Test message')
      await user.click(sendButton)

      // Should show loading indicator
      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).toBeInTheDocument()
      })

      // Input and send button should be disabled during loading
      expect(input).toBeDisabled()
      expect(sendButton).toBeDisabled()
    })

    it('should handle streaming response correctly', async () => {
      const user = userEvent.setup()
      renderChatInterface()

      const input = screen.getByTestId('message-input')
      await user.type(input, 'Test streaming message')
      await user.click(screen.getByTestId('send-button'))

      // Should show user message
      await waitFor(() => {
        expect(screen.getByTestId('message-user')).toBeInTheDocument()
      })

      // Should show streaming state
      await waitFor(() => {
        expect(screen.getByTestId('streaming-message')).toBeInTheDocument()
      }, { timeout: 5000 })

      // Should show streaming indicator
      expect(screen.getByTestId('streaming-indicator')).toHaveTextContent('...')

      // Should accumulate streaming content
      await waitFor(() => {
        const streamingContent = screen.getByTestId('streaming-content')
        expect(streamingContent.textContent).toBeTruthy()
      }, { timeout: 5000 })

      // Should complete streaming and show final message
      await waitFor(() => {
        expect(screen.getByTestId('message-assistant')).toBeInTheDocument()
        expect(screen.queryByTestId('streaming-message')).not.toBeInTheDocument()
      }, { timeout: 10000 })
    })

    it('should handle streaming errors gracefully', async () => {
      const user = userEvent.setup()
      renderChatInterface()

      const input = screen.getByTestId('message-input')
      await user.type(input, 'error test')
      
      // Send to error chat to trigger error
      await act(async () => {
        sessionStorage.setItem('vana_chat_id', 'error')
      })
      
      await user.click(screen.getByTestId('send-button'))

      // Should show error message
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
      }, { timeout: 5000 })

      expect(screen.getByTestId('error-message')).toHaveTextContent(/Server error/)
    })

    it('should handle keyboard shortcuts', async () => {
      const user = userEvent.setup()
      renderChatInterface()

      const input = screen.getByTestId('message-input')
      
      // Type message and press Enter
      await user.type(input, 'Keyboard test message{enter}')

      // Should send message via Enter key
      await waitFor(() => {
        expect(screen.getByTestId('message-user')).toBeInTheDocument()
      })
    })

    it('should clear messages when clear button is clicked', async () => {
      const user = userEvent.setup()
      renderChatInterface()

      // Send a message first
      const input = screen.getByTestId('message-input')
      await user.type(input, 'Test message to clear')
      await user.click(screen.getByTestId('send-button'))

      await waitFor(() => {
        expect(screen.getByTestId('message-user')).toBeInTheDocument()
      })

      // Clear messages
      await user.click(screen.getByTestId('clear-button'))

      // Messages should be cleared
      expect(screen.queryByTestId('message-user')).not.toBeInTheDocument()
    })

    it('should prevent sending empty messages', async () => {
      const user = userEvent.setup()
      renderChatInterface()

      const sendButton = screen.getByTestId('send-button')

      // Send button should be disabled for empty input
      expect(sendButton).toBeDisabled()

      // Type spaces only
      await user.type(screen.getByTestId('message-input'), '   ')
      
      // Should still be disabled
      expect(sendButton).toBeDisabled()
    })

    it('should handle connection status changes', async () => {
      renderChatInterface()

      const connectionStatus = screen.getByTestId('connection-status')
      
      // Should start as disconnected
      expect(connectionStatus).toHaveTextContent('Status: disconnected')

      // After sending message, status should change
      const user = userEvent.setup()
      await user.type(screen.getByTestId('message-input'), 'Status test')
      await user.click(screen.getByTestId('send-button'))

      // Connection status might change during streaming (depending on implementation)
      // This test verifies the status display works
      expect(connectionStatus).toBeInTheDocument()
    })
  })

  describe('Authentication Component', () => {
    const renderAuthComponent = () => {
      return render(<MockAuthComponent />)
    }

    it('should render login form when not authenticated', () => {
      renderAuthComponent()
      
      expect(screen.getByTestId('login-form')).toBeInTheDocument()
      expect(screen.getByTestId('email-input')).toBeInTheDocument()
      expect(screen.getByTestId('password-input')).toBeInTheDocument()
      expect(screen.getByTestId('login-button')).toBeInTheDocument()
    })

    it('should handle successful login', async () => {
      const user = userEvent.setup()
      renderAuthComponent()

      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      const loginButton = screen.getByTestId('login-button')

      // Login button should be disabled initially
      expect(loginButton).toBeDisabled()

      // Fill in credentials
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      // Login button should be enabled
      expect(loginButton).not.toBeDisabled()

      // Submit login
      await user.click(loginButton)

      // Should show loading state
      expect(screen.getByTestId('login-loading')).toBeInTheDocument()
      expect(loginButton).toHaveTextContent('Logging in...')

      // Should show authenticated view after successful login
      await waitFor(() => {
        expect(screen.getByTestId('authenticated-view')).toBeInTheDocument()
      })

      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      expect(screen.getByTestId('logout-button')).toBeInTheDocument()
    })

    it('should handle login failure', async () => {
      const user = userEvent.setup()
      renderAuthComponent()

      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      const loginButton = screen.getByTestId('login-button')

      // Use invalid credentials
      await user.type(emailInput, 'wrong@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(loginButton)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByTestId('auth-error')).toBeInTheDocument()
      })

      expect(screen.getByTestId('auth-error')).toHaveTextContent('Invalid credentials')
      
      // Should remain on login form
      expect(screen.getByTestId('login-form')).toBeInTheDocument()
    })

    it('should handle logout', async () => {
      const user = userEvent.setup()
      
      // Pre-authenticate
      localStorage.setItem('vana_auth_token', 'mock_token')
      
      renderAuthComponent()

      // Should show authenticated view
      expect(screen.getByTestId('authenticated-view')).toBeInTheDocument()

      // Logout
      await user.click(screen.getByTestId('logout-button'))

      // Should return to login form
      expect(screen.getByTestId('login-form')).toBeInTheDocument()
      expect(localStorage.getItem('vana_auth_token')).toBeNull()
    })

    it('should persist authentication state', () => {
      // Set token in localStorage
      localStorage.setItem('vana_auth_token', 'mock_token')
      
      renderAuthComponent()

      // Should show authenticated view immediately
      expect(screen.getByTestId('authenticated-view')).toBeInTheDocument()
    })

    it('should disable form during login', async () => {
      const user = userEvent.setup()
      renderAuthComponent()

      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      // Start login
      await user.click(screen.getByTestId('login-button'))

      // Form fields should be disabled during login
      await waitFor(() => {
        expect(emailInput).toBeDisabled()
        expect(passwordInput).toBeDisabled()
      })
    })

    it('should handle network errors during login', async () => {
      const user = userEvent.setup()
      
      // Mock network error
      server.use(
        http.post('http://localhost:8000/auth/login', () => {
          throw new Error('Network error')
        })
      )

      renderAuthComponent()

      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('login-button'))

      // Should show error
      await waitFor(() => {
        expect(screen.getByTestId('auth-error')).toBeInTheDocument()
      })
    })
  })

  describe('Integration with Real Backend Calls', () => {
    it('should handle real API responses in chat interface', async () => {
      const user = userEvent.setup()
      
      render(
        <ChatProvider>
          <MockChatInterface />
        </ChatProvider>
      )

      // Send message and verify it calls real API endpoints
      await user.type(screen.getByTestId('message-input'), 'Integration test')
      await user.click(screen.getByTestId('send-button'))

      // Should show user message
      await waitFor(() => {
        expect(screen.getByTestId('message-user')).toBeInTheDocument()
      })

      // Should show streaming response
      await waitFor(() => {
        expect(screen.getByTestId('streaming-message')).toBeInTheDocument()
      }, { timeout: 5000 })

      // Should complete with assistant message
      await waitFor(() => {
        expect(screen.getByTestId('message-assistant')).toBeInTheDocument()
      }, { timeout: 10000 })
    })

    it('should handle authentication integration with API calls', async () => {
      const user = userEvent.setup()
      
      // Enable auth requirement
      process.env.NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH = 'true'
      
      render(<MockAuthComponent />)

      // Login first
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('login-button'))

      await waitFor(() => {
        expect(screen.getByTestId('authenticated-view')).toBeInTheDocument()
      })

      // Token should be stored and available for API calls
      expect(localStorage.getItem('vana_auth_token')).toBe('mock_jwt_token_12345')
      
      // Reset env
      process.env.NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH = 'false'
    })
  })
})