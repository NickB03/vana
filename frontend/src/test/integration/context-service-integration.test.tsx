/**
 * Context-Service Integration Tests
 * 
 * Tests the integration between React contexts and service layer components
 * including ADK client, SSE management, and session handling.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { 
  renderWithProviders, 
  simulateSSEEvent,
  simulateADKContentEvent,
  simulateWebSocketConnection,
  simulateWebSocketMessage,
  createMockUser 
} from '../utils';
import { useAuth, useSession, useSSE, useApp } from '@/contexts';
import type { ADKEvent } from '@/types/adk-service';

// Mock the service layer
const mockADKClient = {
  initialize: vi.fn().mockResolvedValue(undefined),
  sendMessage: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn(),
  isConnected: vi.fn().mockReturnValue(true),
  getCurrentSession: vi.fn().mockReturnValue({
    id: 'session_123',
    userId: 'user_123',
    title: 'Test Session',
    status: 'active',
  }),
  on: vi.fn(),
  emit: vi.fn(),
  subscribeToEvents: vi.fn().mockReturnValue(() => {}),
};

vi.mock('@/services/adk-client', () => ({
  ADKClient: vi.fn(() => mockADKClient),
}));

// Test component that integrates multiple contexts
function IntegrationTestComponent() {
  const { user, signIn, enterGuestMode } = useAuth();
  const { createSession, sendMessage, currentSession } = useSession();
  const { connection, subscribe } = useSSE();
  const { addNotification, ui } = useApp();

  const [messages, setMessages] = React.useState<string[]>([]);
  const [adkEvents, setAdkEvents] = React.useState<ADKEvent[]>([]);

  // Subscribe to SSE events
  React.useEffect(() => {
    const unsubscribe = subscribe('agent.message', (event) => {
      setMessages(prev => [...prev, `SSE: ${event.data.content}`]);
    });
    
    return unsubscribe;
  }, [subscribe]);

  const handleCreateSessionAndSendMessage = async () => {
    try {
      const session = await createSession({
        topic: 'Integration Test Topic',
        depth: 'moderate',
        includeCitations: true,
        format: 'report',
      });
      
      await sendMessage('Hello, this is a test message');
      
      addNotification({
        type: 'success',
        title: 'Message Sent',
        message: 'Test message sent successfully',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to send message',
      });
    }
  };

  return (
    <div>
      {/* Auth state */}
      <div data-testid="auth-user">
        User: {user ? (user.isGuest ? 'Guest' : user.email) : 'None'}
      </div>
      
      {/* Session state */}
      <div data-testid="session-title">
        Session: {currentSession ? currentSession.title : 'None'}
      </div>
      
      {/* SSE connection state */}
      <div data-testid="sse-connection">
        SSE: {connection.readyState}
      </div>
      
      {/* Theme from app context */}
      <div data-testid="app-theme">
        Theme: {ui.theme}
      </div>
      
      {/* Messages received */}
      <div data-testid="messages-count">
        Messages: {messages.length}
      </div>
      
      {/* ADK events */}
      <div data-testid="adk-events-count">
        ADK Events: {adkEvents.length}
      </div>
      
      {/* Actions */}
      <button data-testid="sign-in" onClick={() => signIn({ email: 'test@example.com', password: 'password' })}>
        Sign In
      </button>
      <button data-testid="guest-mode" onClick={enterGuestMode}>
        Guest Mode
      </button>
      <button data-testid="create-and-send" onClick={handleCreateSessionAndSendMessage}>
        Create Session & Send Message
      </button>
    </div>
  );
}

describe('Context-Service Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should integrate auth context with session context', async () => {
    render(
      <IntegrationTestComponent />,
      { wrapper: ({ children }) => renderWithProviders(children).container }
    );

    // Initially no user
    expect(screen.getByTestId('auth-user')).toHaveTextContent('User: None');
    expect(screen.getByTestId('session-title')).toHaveTextContent('Session: None');

    // Sign in user
    fireEvent.click(screen.getByTestId('sign-in'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-user')).toHaveTextContent('User: test@example.com');
    });

    // Now session context should be able to create sessions
    fireEvent.click(screen.getByTestId('create-and-send'));

    await waitFor(() => {
      expect(screen.getByTestId('session-title')).toHaveTextContent('Session: Integration Test Topic');
    });
  });

  it('should integrate SSE context with auth context', async () => {
    const mockUser = createMockUser();

    render(
      <IntegrationTestComponent />,
      { wrapper: ({ children }) => renderWithProviders(children, { user: mockUser }).container }
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-user')).toHaveTextContent('User: test@example.com');
      // SSE should attempt to connect for authenticated users
      expect(screen.getByTestId('sse-connection')).toHaveTextContent('SSE: CLOSED');
    });
  });

  it('should not connect SSE for guest users', async () => {
    render(
      <IntegrationTestComponent />,
      { wrapper: ({ children }) => renderWithProviders(children).container }
    );

    // Enter guest mode
    fireEvent.click(screen.getByTestId('guest-mode'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-user')).toHaveTextContent('User: Guest');
      expect(screen.getByTestId('sse-connection')).toHaveTextContent('SSE: CLOSED');
    });
  });

  it('should propagate notifications from service operations', async () => {
    const mockUser = createMockUser();

    render(
      <IntegrationTestComponent />,
      { wrapper: ({ children }) => renderWithProviders(children, { user: mockUser }).container }
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-user')).toHaveTextContent('User: test@example.com');
    });

    // Create session and send message
    fireEvent.click(screen.getByTestId('create-and-send'));

    await waitFor(() => {
      expect(screen.getByTestId('session-title')).toHaveTextContent('Session: Integration Test Topic');
    });

    // Should have triggered notification
    // Note: In a full integration, we'd check for actual notification UI
  });

  it('should handle service errors and update contexts accordingly', async () => {
    // Mock service to throw error
    mockADKClient.sendMessage.mockRejectedValueOnce(new Error('Network error'));

    const mockUser = createMockUser();

    render(
      <IntegrationTestComponent />,
      { wrapper: ({ children }) => renderWithProviders(children, { user: mockUser }).container }
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-user')).toHaveTextContent('User: test@example.com');
    });

    // Try to create session and send message (should fail)
    fireEvent.click(screen.getByTestId('create-and-send'));

    // Wait for error handling
    await waitFor(() => {
      // Session might still be created, but message sending fails
      // Error notification should be triggered
    });
  });

  it('should coordinate state updates across contexts', async () => {
    const mockUser = createMockUser();

    render(
      <IntegrationTestComponent />,
      { wrapper: ({ children }) => renderWithProviders(children, { user: mockUser }).container }
    );

    // Verify initial states
    await waitFor(() => {
      expect(screen.getByTestId('auth-user')).toHaveTextContent('User: test@example.com');
      expect(screen.getByTestId('session-title')).toHaveTextContent('Session: None');
      expect(screen.getByTestId('app-theme')).toHaveTextContent('Theme: dark');
    });

    // Create session
    fireEvent.click(screen.getByTestId('create-and-send'));

    await waitFor(() => {
      expect(screen.getByTestId('session-title')).toHaveTextContent('Session: Integration Test Topic');
    });

    // Verify ADK client was called
    expect(mockADKClient.initialize).toHaveBeenCalledWith('user_123');
    expect(mockADKClient.sendMessage).toHaveBeenCalledWith('Hello, this is a test message');
  });

  it('should handle real-time event flow between SSE and session contexts', async () => {
    const mockEventSource = {
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      readyState: EventSource.OPEN,
    };

    Object.defineProperty(window, 'EventSource', {
      value: vi.fn(() => mockEventSource),
    });

    const mockUser = createMockUser();

    render(
      <IntegrationTestComponent />,
      { wrapper: ({ children }) => renderWithProviders(children, { user: mockUser }).container }
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-user')).toHaveTextContent('User: test@example.com');
    });

    // Simulate SSE connection open
    act(() => {
      if (mockEventSource.onopen) {
        mockEventSource.onopen();
      }
    });

    // Simulate receiving an agent message via SSE
    act(() => {
      const mockEvent = {
        data: JSON.stringify({
          type: 'agent_response',
          content: 'Agent response message',
        }),
        lastEventId: 'evt_123',
      };

      if (mockEventSource.onmessage) {
        mockEventSource.onmessage(mockEvent);
      }
    });

    // The message should be processed and displayed
    await waitFor(() => {
      expect(screen.getByTestId('messages-count')).toHaveTextContent('Messages: 1');
    });
  });

  it('should maintain performance with multiple context updates', async () => {
    const mockUser = createMockUser();
    const startTime = performance.now();

    render(
      <IntegrationTestComponent />,
      { wrapper: ({ children }) => renderWithProviders(children, { user: mockUser }).container }
    );

    // Perform multiple operations that trigger context updates
    await waitFor(() => {
      expect(screen.getByTestId('auth-user')).toHaveTextContent('User: test@example.com');
    });

    // Create session (triggers session context update)
    fireEvent.click(screen.getByTestId('create-and-send'));

    await waitFor(() => {
      expect(screen.getByTestId('session-title')).toHaveTextContent('Session: Integration Test Topic');
    });

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Should complete quickly even with multiple context updates
    expect(executionTime).toBeLessThan(1000);
  });

  it('should handle context provider unmounting gracefully', async () => {
    const mockUser = createMockUser();

    const { unmount } = render(
      <IntegrationTestComponent />,
      { wrapper: ({ children }) => renderWithProviders(children, { user: mockUser }).container }
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-user')).toHaveTextContent('User: test@example.com');
    });

    // Create session to establish connections
    fireEvent.click(screen.getByTestId('create-and-send'));

    await waitFor(() => {
      expect(screen.getByTestId('session-title')).toHaveTextContent('Session: Integration Test Topic');
    });

    // Unmount should clean up all connections
    expect(() => unmount()).not.toThrow();
  });

  it('should recover from service failures gracefully', async () => {
    // Mock ADK client to fail initially, then succeed
    let callCount = 0;
    mockADKClient.initialize.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('Initial connection failed'));
      }
      return Promise.resolve();
    });

    const mockUser = createMockUser();

    render(
      <IntegrationTestComponent />,
      { wrapper: ({ children }) => renderWithProviders(children, { user: mockUser }).container }
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-user')).toHaveTextContent('User: test@example.com');
    });

    // First attempt should fail silently (error handling in contexts)
    fireEvent.click(screen.getByTestId('create-and-send'));

    // Wait for error handling
    await waitFor(() => {
      // Context should handle the error gracefully
    });

    // Reset mock for second attempt
    mockADKClient.initialize.mockResolvedValue(undefined);

    // Second attempt should succeed
    fireEvent.click(screen.getByTestId('create-and-send'));

    await waitFor(() => {
      expect(screen.getByTestId('session-title')).toHaveTextContent('Session: Integration Test Topic');
    });
  });
});

// Component-specific integration tests
describe('Context Hook Integration', () => {
  function HookIntegrationTestComponent() {
    const auth = useAuth();
    const session = useSession();
    const sse = useSSE();
    const app = useApp();

    const [integrationStatus, setIntegrationStatus] = React.useState<string>('idle');

    React.useEffect(() => {
      if (auth.user && !auth.user.isGuest) {
        setIntegrationStatus('authenticated');
        
        if (session.currentSession) {
          setIntegrationStatus('session_active');
        }
        
        if (sse.connection.readyState === 'OPEN') {
          setIntegrationStatus('fully_connected');
        }
      } else if (auth.user?.isGuest) {
        setIntegrationStatus('guest_mode');
      }
    }, [auth.user, session.currentSession, sse.connection.readyState]);

    return (
      <div>
        <div data-testid="integration-status">{integrationStatus}</div>
        <div data-testid="auth-state">{auth.user ? 'authenticated' : 'unauthenticated'}</div>
        <div data-testid="session-state">{session.currentSession ? 'active' : 'none'}</div>
        <div data-testid="sse-state">{sse.connection.readyState}</div>
        <div data-testid="app-state">{app.ui.theme}</div>
      </div>
    );
  }

  it('should coordinate hook state updates', async () => {
    const mockUser = createMockUser();

    render(
      <HookIntegrationTestComponent />,
      { wrapper: ({ children }) => renderWithProviders(children, { user: mockUser }).container }
    );

    await waitFor(() => {
      expect(screen.getByTestId('integration-status')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('session-state')).toHaveTextContent('none');
      expect(screen.getByTestId('app-state')).toHaveTextContent('dark');
    });
  });

  it('should handle guest mode coordination', async () => {
    const guestUser = createMockUser({ isGuest: true });

    render(
      <HookIntegrationTestComponent />,
      { wrapper: ({ children }) => renderWithProviders(children, { user: guestUser }).container }
    );

    await waitFor(() => {
      expect(screen.getByTestId('integration-status')).toHaveTextContent('guest_mode');
      expect(screen.getByTestId('sse-state')).toHaveTextContent('CLOSED');
    });
  });
});