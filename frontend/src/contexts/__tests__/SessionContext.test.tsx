/**
 * SessionContext tests
 * 
 * Tests for session management, WebSocket communication, and state management
 * including context splitting for performance optimization.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SessionProvider, useSession, useSessionState, useSessionActions } from '../SessionContext';
import { AuthProvider } from '../AuthContext';
import React from 'react';
import type { ResearchConfig, AgentMessage, TimelineEvent } from '@/types/session';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock WebSocket
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  readyState: WebSocket.OPEN,
  CONNECTING: WebSocket.CONNECTING,
  OPEN: WebSocket.OPEN,
  CLOSED: WebSocket.CLOSED,
  onopen: null as any,
  onmessage: null as any,
  onclose: null as any,
  onerror: null as any,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

Object.defineProperty(window, 'WebSocket', {
  value: vi.fn(() => mockWebSocket),
});

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    DEV: true,
  },
});

// Test component to access session context
function TestSessionComponent() {
  const { 
    currentSession, 
    sessions, 
    isLoading, 
    isProcessing, 
    connection,
    error,
    createSession, 
    loadSession,
    sendMessage,
    startResearch,
    clearError 
  } = useSession();
  
  const handleCreateSession = async () => {
    try {
      const config: ResearchConfig = {
        topic: 'Test Research Topic',
        depth: 'moderate',
        includeCitations: true,
        format: 'report',
      };
      await createSession(config);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleSendMessage = async () => {
    try {
      await sendMessage('Test message content');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div>
      {/* Session state */}
      <div data-testid="current-session">
        {currentSession ? currentSession.title : 'No session'}
      </div>
      <div data-testid="sessions-count">
        Sessions: {sessions.length}
      </div>
      <div data-testid="loading-state">
        Loading: {isLoading ? 'true' : 'false'}
      </div>
      <div data-testid="processing-state">
        Processing: {isProcessing ? 'true' : 'false'}
      </div>
      <div data-testid="connection-state">
        Connected: {connection.isConnected ? 'true' : 'false'}
      </div>
      <div data-testid="error-state">
        Error: {error || 'none'}
      </div>
      
      {/* Messages */}
      <div data-testid="messages-count">
        Messages: {currentSession?.messages.length || 0}
      </div>
      
      {/* Timeline */}
      <div data-testid="timeline-count">
        Timeline: {currentSession?.timeline.length || 0}
      </div>
      
      {/* Actions */}
      <button data-testid="create-session" onClick={handleCreateSession}>
        Create Session
      </button>
      <button 
        data-testid="load-session" 
        onClick={() => loadSession('session_123')}
      >
        Load Session
      </button>
      <button data-testid="send-message" onClick={handleSendMessage}>
        Send Message
      </button>
      <button data-testid="start-research" onClick={startResearch}>
        Start Research
      </button>
      <button data-testid="clear-error" onClick={clearError}>
        Clear Error
      </button>
    </div>
  );
}

// Test component to check context splitting
function TestSessionSplitContext() {
  const state = useSessionState();
  const actions = useSessionActions();
  
  return (
    <div>
      <div data-testid="split-session">
        {state.currentSession ? state.currentSession.title : 'No session'}
      </div>
      <button 
        data-testid="split-create" 
        onClick={() => actions.createSession({
          topic: 'Split Test Topic',
          depth: 'deep',
          includeCitations: false,
          format: 'summary',
        })}
      >
        Split Create
      </button>
    </div>
  );
}

// Test wrapper with authentication
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SessionProvider>
        {children}
      </SessionProvider>
    </AuthProvider>
  );
}

describe('SessionContext', () => {
  let mockUser: any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Mock authenticated user
    mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      displayName: 'Test User',
      isGuest: false,
    };
    
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'vana_user') {
        return JSON.stringify(mockUser);
      }
      return null;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should provide initial session state', async () => {
    render(
      <TestWrapper>
        <TestSessionComponent />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-session')).toHaveTextContent('No session');
      expect(screen.getByTestId('sessions-count')).toHaveTextContent('Sessions: 0');
      expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading: false');
      expect(screen.getByTestId('processing-state')).toHaveTextContent('Processing: false');
      expect(screen.getByTestId('error-state')).toHaveTextContent('Error: none');
    });
  });

  it('should handle session creation', async () => {
    render(
      <TestWrapper>
        <TestSessionComponent />
      </TestWrapper>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('current-session')).toHaveTextContent('No session');
    });

    // Create session
    fireEvent.click(screen.getByTestId('create-session'));

    // Should show loading state briefly
    expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading: true');

    // Wait for session creation
    await waitFor(() => {
      expect(screen.getByTestId('current-session')).toHaveTextContent('Test Research Topic');
      expect(screen.getByTestId('sessions-count')).toHaveTextContent('Sessions: 1');
      expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading: false');
    });
  });

  it('should handle message sending', async () => {
    render(
      <TestWrapper>
        <TestSessionComponent />
      </TestWrapper>
    );

    // First create a session
    fireEvent.click(screen.getByTestId('create-session'));
    
    await waitFor(() => {
      expect(screen.getByTestId('current-session')).toHaveTextContent('Test Research Topic');
    });

    // Send message
    fireEvent.click(screen.getByTestId('send-message'));

    await waitFor(() => {
      expect(screen.getByTestId('messages-count')).toHaveTextContent('Messages: 1');
    });

    // Verify WebSocket send was called
    expect(mockWebSocket.send).toHaveBeenCalledWith(
      expect.stringContaining('user_message')
    );
  });

  it('should handle WebSocket connection for authenticated users', async () => {
    render(
      <TestWrapper>
        <TestSessionComponent />
      </TestWrapper>
    );

    // Wait for WebSocket connection attempt
    await waitFor(() => {
      expect(window.WebSocket).toHaveBeenCalledWith('ws://localhost:8081/ws');
    });

    // Simulate WebSocket open event
    act(() => {
      mockWebSocket.onopen();
    });

    await waitFor(() => {
      expect(screen.getByTestId('connection-state')).toHaveTextContent('Connected: true');
    });
  });

  it('should handle WebSocket messages', async () => {
    render(
      <TestWrapper>
        <TestSessionComponent />
      </TestWrapper>
    );

    // Create session first
    fireEvent.click(screen.getByTestId('create-session'));
    
    await waitFor(() => {
      expect(screen.getByTestId('current-session')).toHaveTextContent('Test Research Topic');
    });

    // Simulate WebSocket connection
    act(() => {
      mockWebSocket.onopen();
    });

    // Simulate incoming message
    const mockMessage: AgentMessage = {
      id: 'msg_456',
      content: 'Agent response',
      role: 'assistant',
      timestamp: new Date().toISOString(),
    };

    act(() => {
      mockWebSocket.onmessage({
        data: JSON.stringify({
          type: 'message',
          payload: mockMessage,
        }),
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('messages-count')).toHaveTextContent('Messages: 1');
    });
  });

  it('should handle timeline events', async () => {
    render(
      <TestWrapper>
        <TestSessionComponent />
      </TestWrapper>
    );

    // Create session
    fireEvent.click(screen.getByTestId('create-session'));
    
    await waitFor(() => {
      expect(screen.getByTestId('current-session')).toHaveTextContent('Test Research Topic');
    });

    // Simulate timeline event
    const mockTimelineEvent: TimelineEvent = {
      id: 'event_123',
      type: 'planning_started',
      title: 'Research Planning Started',
      timestamp: new Date().toISOString(),
      status: 'in_progress',
    };

    act(() => {
      mockWebSocket.onmessage({
        data: JSON.stringify({
          type: 'timeline_event',
          payload: mockTimelineEvent,
        }),
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('timeline-count')).toHaveTextContent('Timeline: 1');
    });
  });

  it('should handle research start', async () => {
    render(
      <TestWrapper>
        <TestSessionComponent />
      </TestWrapper>
    );

    // Create session
    fireEvent.click(screen.getByTestId('create-session'));
    
    await waitFor(() => {
      expect(screen.getByTestId('current-session')).toHaveTextContent('Test Research Topic');
    });

    // Start research
    fireEvent.click(screen.getByTestId('start-research'));

    // Should show processing state briefly
    expect(screen.getByTestId('processing-state')).toHaveTextContent('Processing: true');

    await waitFor(() => {
      expect(screen.getByTestId('processing-state')).toHaveTextContent('Processing: false');
    });

    // Verify WebSocket send was called
    expect(mockWebSocket.send).toHaveBeenCalledWith(
      expect.stringContaining('start_research')
    );
  });

  it('should handle errors gracefully', async () => {
    render(
      <TestWrapper>
        <TestSessionComponent />
      </TestWrapper>
    );

    // Simulate WebSocket error
    act(() => {
      mockWebSocket.onmessage({
        data: JSON.stringify({
          type: 'error',
          payload: { message: 'Test error message' },
        }),
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toHaveTextContent('Error: Test error message');
    });

    // Clear error
    fireEvent.click(screen.getByTestId('clear-error'));

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toHaveTextContent('Error: none');
    });
  });

  it('should handle WebSocket reconnection', async () => {
    render(
      <TestWrapper>
        <TestSessionComponent />
      </TestWrapper>
    );

    // Simulate WebSocket connection and then disconnect
    act(() => {
      mockWebSocket.onopen();
    });

    await waitFor(() => {
      expect(screen.getByTestId('connection-state')).toHaveTextContent('Connected: true');
    });

    // Simulate disconnect (non-intentional)
    act(() => {
      mockWebSocket.onclose({ code: 1006, reason: 'Connection lost' });
    });

    await waitFor(() => {
      expect(screen.getByTestId('connection-state')).toHaveTextContent('Connected: false');
    });
  });

  it('should support context splitting for performance', async () => {
    render(
      <TestWrapper>
        <TestSessionSplitContext />
      </TestWrapper>
    );

    expect(screen.getByTestId('split-session')).toHaveTextContent('No session');

    fireEvent.click(screen.getByTestId('split-create'));

    await waitFor(() => {
      expect(screen.getByTestId('split-session')).toHaveTextContent('Split Test Topic');
    });
  });

  it('should not connect WebSocket for guest users', async () => {
    // Mock guest user
    const guestUser = {
      id: 'guest_123',
      email: null,
      isGuest: true,
    };
    
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'vana_user') {
        return JSON.stringify(guestUser);
      }
      if (key === 'vana_guest_mode') {
        return 'true';
      }
      return null;
    });

    render(
      <TestWrapper>
        <TestSessionComponent />
      </TestWrapper>
    );

    // Wait a bit to ensure no WebSocket connection is attempted
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(window.WebSocket).not.toHaveBeenCalled();
    expect(screen.getByTestId('connection-state')).toHaveTextContent('Connected: false');
  });

  it('should cleanup WebSocket on unmount', async () => {
    const { unmount } = render(
      <TestWrapper>
        <TestSessionComponent />
      </TestWrapper>
    );

    // Wait for WebSocket creation
    await waitFor(() => {
      expect(window.WebSocket).toHaveBeenCalled();
    });

    // Unmount component
    unmount();

    // Verify WebSocket close was called
    expect(mockWebSocket.close).toHaveBeenCalledWith(1000, 'Component unmounting');
  });

  it('should throw error when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    function ComponentUsingSession() {
      useSession();
      return <div>Should not render</div>;
    }

    expect(() => {
      render(<ComponentUsingSession />);
    }).toThrow('useSessionState must be used within a SessionProvider');
    
    consoleSpy.mockRestore();
  });

  it('should handle session loading error', async () => {
    render(
      <TestWrapper>
        <TestSessionComponent />
      </TestWrapper>
    );

    // Try to load non-existent session
    fireEvent.click(screen.getByTestId('load-session'));

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toHaveTextContent('Error: Session not found');
      expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading: false');
    });
  });

  it('should handle ping/pong for connection health', async () => {
    vi.useFakeTimers();
    
    render(
      <TestWrapper>
        <TestSessionComponent />
      </TestWrapper>
    );

    // Simulate WebSocket connection
    act(() => {
      mockWebSocket.onopen();
    });

    await waitFor(() => {
      expect(screen.getByTestId('connection-state')).toHaveTextContent('Connected: true');
    });

    // Fast-forward time to trigger ping
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(mockWebSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'ping' })
    );

    vi.useRealTimers();
  });
});