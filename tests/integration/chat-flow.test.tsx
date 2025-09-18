import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, createMockChatState, createMockCapabilitySuggestion, mockAPIResponses } from '../utils/testing-utils'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import React from 'react'

// Mock the complete chat flow components integration
const MockVanaApp = ({ initialRoute = '/' }: { initialRoute?: string }) => {
  const [currentRoute, setCurrentRoute] = React.useState(initialRoute)
  const [chatState, setChatState] = React.useState(createMockChatState())
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  
  const navigateToChat = (sessionId?: string) => {
    setCurrentRoute('/chat')
    setChatState(prev => ({
      ...prev,
      isActive: true,
      currentSession: sessionId || `session-${Date.now()}`
    }))
  }
  
  const navigateHome = () => {
    setCurrentRoute('/')
    setChatState(prev => ({
      ...prev,
      isActive: false,
      currentSession: null,
      messages: []
    }))
  }
  
  const handleCapabilityClick = (capability: any) => {
    // Simulate API call to create session
    const sessionId = `session-${Date.now()}`
    navigateToChat(sessionId)
    
    // Add initial system message
    setTimeout(() => {
      setChatState(prev => ({
        ...prev,
        messages: [{
          id: 'msg-1',
          content: `I'll help you with ${capability.title}. What specific task would you like me to assist with?`,
          role: 'assistant',
          timestamp: new Date()
        }]
      }))
    }, 100)
  }
  
  const handlePromptSubmit = (prompt: string) => {
    // Simulate API call to create session with custom prompt
    const sessionId = `session-${Date.now()}`
    navigateToChat(sessionId)
    
    // Add initial messages
    setTimeout(() => {
      setChatState(prev => ({
        ...prev,
        messages: [
          {
            id: 'msg-1',
            content: prompt,
            role: 'user',
            timestamp: new Date()
          },
          {
            id: 'msg-2',
            content: `I understand you want to: "${prompt}". Let me start working on this for you.`,
            role: 'assistant',
            timestamp: new Date()
          }
        ]
      }))
    }, 100)
  }
  
  const handleSendMessage = (message: string) => {
    const userMessage = {
      id: `msg-${Date.now()}`,
      content: message,
      role: 'user' as const,
      timestamp: new Date()
    }
    
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isStreaming: true
    }))
    
    // Simulate AI response
    setTimeout(() => {
      const aiMessage = {
        id: `msg-${Date.now() + 1}`,
        content: `I'll help you with: "${message}". Let me analyze this and provide a comprehensive response.`,
        role: 'assistant' as const,
        timestamp: new Date()
      }
      
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, aiMessage],
        isStreaming: false
      }))
    }, 200)
  }
  
  const handleSidebarConversationSelect = (conversationId: string) => {
    navigateToChat(conversationId)
    setSidebarOpen(false)
    
    // Load conversation history
    setTimeout(() => {
      setChatState(prev => ({
        ...prev,
        messages: [
          {
            id: 'msg-1',
            content: 'Previous conversation loaded',
            role: 'assistant',
            timestamp: new Date()
          }
        ]
      }))
    }, 100)
  }
  
  // Render appropriate component based on route
  if (currentRoute === '/') {
    return (
      <div data-testid="app-container">
        {/* Mock Sidebar - always present but conditionally visible */}
        <MockSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onConversationSelect={handleSidebarConversationSelect}
          onNewChat={() => navigateToChat()}
        />
        
        {/* Home Page */}
        <MockHomePage
          onCapabilityClick={handleCapabilityClick}
          onPromptSubmit={handlePromptSubmit}
        />
      </div>
    )
  }
  
  if (currentRoute === '/chat') {
    return (
      <div data-testid="app-container">
        {/* Mock Sidebar */}
        <MockSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onConversationSelect={handleSidebarConversationSelect}
          onNewChat={() => navigateToChat()}
        />
        
        {/* Chat Interface */}
        <MockChatInterface
          chatState={chatState}
          onSendMessage={handleSendMessage}
          onEndSession={navigateHome}
        />
      </div>
    )
  }
  
  return <div>404 - Page not found</div>
}

const MockHomePage = ({ onCapabilityClick, onPromptSubmit }: any) => {
  const [prompt, setPrompt] = React.useState('')
  
  const capabilities = [
    createMockCapabilitySuggestion({
      id: 'research',
      title: 'Research Analysis',
      description: 'Analyze research papers'
    }),
    createMockCapabilitySuggestion({
      id: 'data',
      title: 'Data Processing',
      description: 'Process datasets'
    })
  ]
  
  return (
    <main data-testid="home-page">
      <h1>Welcome to Vana</h1>
      
      <section data-testid="capabilities">
        <h2>Capabilities</h2>
        {capabilities.map(cap => (
          <button
            key={cap.id}
            data-testid={`capability-${cap.id}`}
            onClick={() => onCapabilityClick(cap)}
          >
            {cap.title}
          </button>
        ))}
      </section>
      
      <section data-testid="custom-prompt">
        <h2>Custom Prompt</h2>
        <textarea
          data-testid="prompt-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt..."
        />
        <button
          data-testid="submit-prompt"
          onClick={() => prompt.trim() && onPromptSubmit(prompt)}
          disabled={!prompt.trim()}
        >
          Submit
        </button>
      </section>
    </main>
  )
}

const MockChatInterface = ({ chatState, onSendMessage, onEndSession }: any) => {
  const [inputValue, setInputValue] = React.useState('')
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !chatState.isStreaming) {
      onSendMessage(inputValue)
      setInputValue('')
    }
  }
  
  return (
    <main data-testid="chat-interface">
      <header>
        <h1>Chat Session: {chatState.currentSession}</h1>
        <button data-testid="end-session" onClick={onEndSession}>
          End Session
        </button>
      </header>
      
      <div data-testid="messages" role="log">
        {chatState.messages.map((message: any) => (
          <div
            key={message.id}
            data-testid={`message-${message.id}`}
            data-role={message.role}
          >
            <strong>{message.role}:</strong> {message.content}
          </div>
        ))}
        
        {chatState.isStreaming && (
          <div data-testid="streaming-indicator">AI is typing...</div>
        )}
      </div>
      
      <form onSubmit={handleSubmit}>
        <input
          data-testid="message-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message..."
          disabled={chatState.isStreaming}
        />
        <button
          data-testid="send-button"
          type="submit"
          disabled={!inputValue.trim() || chatState.isStreaming}
        >
          Send
        </button>
      </form>
    </main>
  )
}

const MockSidebar = ({ isOpen, onToggle, onConversationSelect, onNewChat }: any) => {
  const conversations = [
    { id: 'conv-1', title: 'Research Discussion', date: '2024-01-15' },
    { id: 'conv-2', title: 'Data Analysis', date: '2024-01-14' }
  ]
  
  return (
    <aside data-testid="sidebar" data-open={isOpen}>
      <button data-testid="sidebar-toggle" onClick={onToggle}>
        {isOpen ? 'Close' : 'Open'}
      </button>
      
      {isOpen && (
        <div data-testid="sidebar-content">
          <button data-testid="new-chat" onClick={onNewChat}>
            New Chat
          </button>
          
          <div data-testid="conversations-list">
            {conversations.map(conv => (
              <button
                key={conv.id}
                data-testid={`conversation-${conv.id}`}
                onClick={() => onConversationSelect(conv.id)}
              >
                {conv.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}

// Mock API server
const server = setupServer(
  http.post('/api/chat/sessions', () => {
    return HttpResponse.json(mockAPIResponses.createSession())
  }),
  
  http.post('/api/chat/sessions/:sessionId/messages', () => {
    return HttpResponse.json(mockAPIResponses.sendMessage())
  }),
  
  http.get('/api/chat/conversations', () => {
    return HttpResponse.json(mockAPIResponses.getConversations())
  })
)

describe('Chat Flow Integration Tests', () => {
  const user = userEvent.setup()
  
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'error' })
    vi.clearAllMocks()
  })
  
  afterEach(() => {
    server.resetHandlers()
  })
  
  describe('Home to Chat Navigation Flow', () => {
    it('navigates from home page to chat via capability selection', async () => {
      render(<MockVanaApp initialRoute="/" />)
      
      // Verify we're on home page
      expect(screen.getByTestId('home-page')).toBeInTheDocument()
      expect(screen.getByText('Welcome to Vana')).toBeInTheDocument()
      
      // Click on research capability
      const researchButton = screen.getByTestId('capability-research')
      await user.click(researchButton)
      
      // Should navigate to chat interface
      await waitFor(() => {
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      })
      
      // Should show session information
      expect(screen.getByText(/Chat Session: session-/)).toBeInTheDocument()
      
      // Should receive initial AI message
      await waitFor(() => {
        expect(screen.getByText(/I'll help you with Research Analysis/)).toBeInTheDocument()
      })
    })
    
    it('navigates from home page to chat via custom prompt', async () => {
      render(<MockVanaApp initialRoute="/" />)
      
      // Enter custom prompt
      const promptInput = screen.getByTestId('prompt-input')
      const submitButton = screen.getByTestId('submit-prompt')
      
      await user.type(promptInput, 'Analyze the impact of AI on education')
      await user.click(submitButton)
      
      // Should navigate to chat
      await waitFor(() => {
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      })
      
      // Should show user's prompt and AI response
      await waitFor(() => {
        expect(screen.getByText('user: Analyze the impact of AI on education')).toBeInTheDocument()
        expect(screen.getByText(/I understand you want to/)).toBeInTheDocument()
      })
    })
    
    it('maintains state during navigation', async () => {
      render(<MockVanaApp initialRoute="/" />)
      
      // Start from capability click
      await user.click(screen.getByTestId('capability-research'))
      
      await waitFor(() => {
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      })
      
      // Send a message
      const messageInput = screen.getByTestId('message-input')
      await user.type(messageInput, 'Tell me more about research methods')
      await user.click(screen.getByTestId('send-button'))
      
      // Should see both initial and new messages
      await waitFor(() => {
        expect(screen.getByText('user: Tell me more about research methods')).toBeInTheDocument()
      })
      
      // Message history should be preserved
      expect(screen.getByText(/I'll help you with Research Analysis/)).toBeInTheDocument()
    })
  })
  
  describe('Chat Session Management', () => {
    it('creates and manages chat session correctly', async () => {
      render(<MockVanaApp initialRoute="/" />)
      
      // Start chat session
      await user.click(screen.getByTestId('capability-data'))
      
      await waitFor(() => {
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      })
      
      const sessionHeader = screen.getByText(/Chat Session: session-/)
      expect(sessionHeader).toBeInTheDocument()
      
      // Extract session ID from header
      const sessionId = sessionHeader.textContent?.match(/session-(\d+)/)?.[0]
      expect(sessionId).toBeTruthy()
    })
    
    it('handles message sending and receiving', async () => {
      render(<MockVanaApp initialRoute="/chat" />)
      
      // Wait for initial setup
      await waitFor(() => {
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      })
      
      const messageInput = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')
      
      // Send first message
      await user.type(messageInput, 'Hello, can you help me?')
      await user.click(sendButton)
      
      // Should show user message immediately
      expect(screen.getByText('user: Hello, can you help me?')).toBeInTheDocument()
      
      // Should show streaming indicator
      expect(screen.getByTestId('streaming-indicator')).toBeInTheDocument()
      
      // Should receive AI response
      await waitFor(() => {
        expect(screen.getByText(/I'll help you with: "Hello, can you help me?"/)).toBeInTheDocument()
      })
      
      // Streaming indicator should disappear
      expect(screen.queryByTestId('streaming-indicator')).not.toBeInTheDocument()
      
      // Input should be cleared and enabled
      expect(messageInput).toHaveValue('')
      expect(messageInput).toBeEnabled()
      expect(sendButton).toBeEnabled()
    })
    
    it('prevents multiple simultaneous message sends', async () => {
      render(<MockVanaApp initialRoute="/chat" />)
      
      await waitFor(() => {
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      })
      
      const messageInput = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')
      
      // Send message
      await user.type(messageInput, 'First message')
      await user.click(sendButton)
      
      // While streaming, input should be disabled
      expect(screen.getByTestId('streaming-indicator')).toBeInTheDocument()
      expect(messageInput).toBeDisabled()
      expect(sendButton).toBeDisabled()
      
      // Wait for response to complete
      await waitFor(() => {
        expect(screen.queryByTestId('streaming-indicator')).not.toBeInTheDocument()
      })
      
      // Should be enabled again
      expect(messageInput).toBeEnabled()
      expect(sendButton).toBeEnabled()
    })
    
    it('ends chat session and returns to home', async () => {
      render(<MockVanaApp initialRoute="/chat" />)
      
      await waitFor(() => {
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      })
      
      // End session
      await user.click(screen.getByTestId('end-session'))
      
      // Should return to home page
      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument()
      })
      
      expect(screen.getByText('Welcome to Vana')).toBeInTheDocument()
    })
  })
  
  describe('Sidebar Integration', () => {
    it('toggles sidebar visibility', async () => {
      render(<MockVanaApp initialRoute="/" />)
      
      const sidebar = screen.getByTestId('sidebar')
      const toggleButton = screen.getByTestId('sidebar-toggle')
      
      // Initially closed
      expect(sidebar).toHaveAttribute('data-open', 'false')
      expect(screen.queryByTestId('sidebar-content')).not.toBeInTheDocument()
      
      // Open sidebar
      await user.click(toggleButton)
      
      expect(sidebar).toHaveAttribute('data-open', 'true')
      expect(screen.getByTestId('sidebar-content')).toBeInTheDocument()
      
      // Close sidebar
      await user.click(toggleButton)
      
      expect(sidebar).toHaveAttribute('data-open', 'false')
    })
    
    it('starts new chat from sidebar', async () => {
      render(<MockVanaApp initialRoute="/" />)
      
      // Open sidebar
      await user.click(screen.getByTestId('sidebar-toggle'))
      
      // Click new chat
      await user.click(screen.getByTestId('new-chat'))
      
      // Should navigate to chat interface
      await waitFor(() => {
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      })
      
      // Sidebar should close
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'false')
    })
    
    it('loads existing conversation from sidebar', async () => {
      render(<MockVanaApp initialRoute="/" />)
      
      // Open sidebar
      await user.click(screen.getByTestId('sidebar-toggle'))
      
      // Click on existing conversation
      await user.click(screen.getByTestId('conversation-conv-1'))
      
      // Should navigate to chat
      await waitFor(() => {
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      })
      
      // Should load conversation history
      await waitFor(() => {
        expect(screen.getByText('assistant: Previous conversation loaded')).toBeInTheDocument()
      })
      
      // Sidebar should close
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'false')
    })
  })
  
  describe('Layout Persistence', () => {
    it('maintains sidebar state across navigation', async () => {
      render(<MockVanaApp initialRoute="/" />)
      
      // Open sidebar on home page
      await user.click(screen.getByTestId('sidebar-toggle'))
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'true')
      
      // Navigate to chat
      await user.click(screen.getByTestId('capability-research'))
      
      await waitFor(() => {
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      })
      
      // Sidebar should still be available
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    })
    
    it('handles rapid navigation without state corruption', async () => {
      render(<MockVanaApp initialRoute="/" />)
      
      // Rapid navigation sequence
      await user.click(screen.getByTestId('capability-research'))
      
      await waitFor(() => {
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      })
      
      await user.click(screen.getByTestId('end-session'))
      
      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument()
      })
      
      await user.click(screen.getByTestId('capability-data'))
      
      await waitFor(() => {
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      })
      
      // Should have clean state for new session
      await waitFor(() => {
        expect(screen.getByText(/I'll help you with Data Processing/)).toBeInTheDocument()
      })
    })
  })
  
  describe('Error Handling and Edge Cases', () => {
    it('handles empty prompt submission gracefully', async () => {
      render(<MockVanaApp initialRoute="/" />)
      
      const submitButton = screen.getByTestId('submit-prompt')
      
      // Button should be disabled for empty input
      expect(submitButton).toBeDisabled()
      
      // Try clicking anyway
      await user.click(submitButton)
      
      // Should remain on home page
      expect(screen.getByTestId('home-page')).toBeInTheDocument()
    })
    
    it('handles empty message sending in chat', async () => {
      render(<MockVanaApp initialRoute="/chat" />)
      
      await waitFor(() => {
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      })
      
      const sendButton = screen.getByTestId('send-button')
      
      // Button should be disabled for empty input
      expect(sendButton).toBeDisabled()
      
      // Try submitting empty message
      const messageInput = screen.getByTestId('message-input')
      await user.type(messageInput, '   ') // Just whitespace
      
      // Should still be disabled
      expect(sendButton).toBeDisabled()
    })
    
    it('handles session state consistency', async () => {
      render(<MockVanaApp initialRoute="/" />)
      
      // Start session via capability
      await user.click(screen.getByTestId('capability-research'))
      
      await waitFor(() => {
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      })
      
      const sessionId1 = screen.getByText(/Chat Session: session-/)?.textContent
      
      // Go back home and start new session
      await user.click(screen.getByTestId('end-session'))
      
      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument()
      })
      
      await user.click(screen.getByTestId('capability-data'))
      
      await waitFor(() => {
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      })
      
      const sessionId2 = screen.getByText(/Chat Session: session-/)?.textContent
      
      // Should have different session IDs
      expect(sessionId1).not.toBe(sessionId2)
      
      // Should have different initial messages
      await waitFor(() => {
        expect(screen.getByText(/I'll help you with Data Processing/)).toBeInTheDocument()
      })
      
      // Should not have research-related messages
      expect(screen.queryByText(/Research Analysis/)).not.toBeInTheDocument()
    })
  })
  
  describe('Performance and Responsiveness', () => {
    it('renders transitions smoothly', async () => {
      const startTime = performance.now()
      
      render(<MockVanaApp initialRoute="/" />)
      
      await user.click(screen.getByTestId('capability-research'))
      
      await waitFor(() => {
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      })
      
      const transitionTime = performance.now() - startTime
      
      // Should transition within reasonable time
      expect(transitionTime).toBeLessThan(500) // 500ms
    })
    
    it('handles multiple rapid interactions', async () => {
      render(<MockVanaApp initialRoute="/" />)
      
      const toggleButton = screen.getByTestId('sidebar-toggle')
      
      // Rapid toggle operations
      for (let i = 0; i < 5; i++) {
        await user.click(toggleButton)
      }
      
      // Should end in consistent state
      const sidebar = screen.getByTestId('sidebar')
      const isOpen = sidebar.getAttribute('data-open') === 'true'
      
      if (isOpen) {
        expect(screen.getByTestId('sidebar-content')).toBeInTheDocument()
      } else {
        expect(screen.queryByTestId('sidebar-content')).not.toBeInTheDocument()
      }
    })
  })
})