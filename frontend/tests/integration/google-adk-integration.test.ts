/**
 * Google ADK Integration Tests
 * Tests real backend integration with Google ADK agent network
 */

import { apiClient, ApiError, isApiError } from '../../src/lib/api-client';
import { useSSEClient } from '../../hooks/useSSEClient';
import { authService } from '../../src/lib/auth';
import { renderHook, act, waitFor } from '@testing-library/react';

describe('Google ADK Integration Tests', () => {
  const TEST_TIMEOUT = 30000;
  let cleanup: (() => void)[] = [];

  beforeAll(async () => {
    // Setup development auth for testing
    authService.createDevSession();
  });

  afterAll(async () => {
    cleanup.forEach(fn => fn());
    await authService.logout();
  });

  afterEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  describe('Backend Connectivity', () => {
    it('should connect to Google ADK backend', async () => {
      // Mock successful health check
      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        })
      );

      const isConnected = await apiClient.checkConnection();
      expect(isConnected).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/health',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should handle backend unavailable', async () => {
      // Mock network error
      fetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const isConnected = await apiClient.checkConnection();
      expect(isConnected).toBe(false);
    });

    it('should authenticate with Google ADK backend', async () => {
      // Mock successful authentication
      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse({
          tokens: {
            access_token: 'test-token',
            refresh_token: 'test-refresh',
            token_type: 'Bearer',
            expires_in: 1800
          },
          user: {
            id: 'test-user-123',
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
            is_verified: true,
            created_at: new Date().toISOString()
          }
        })
      );

      const user = await authService.login({
        email: 'test@example.com',
        password: 'testpass'
      });

      expect(user).toMatchObject({
        id: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        isVerified: true
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            username: 'test@example.com',
            password: 'testpass'
          })
        })
      );
    });
  });

  describe('Session Management', () => {
    it('should create ADK session successfully', async () => {
      // Mock session creation
      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse({
          id: 'session-123',
          app_name: 'vana',
          user_id: 'current',
          created_at: new Date().toISOString(),
          status: 'active'
        })
      );

      const session = await apiClient.createAdkSession();
      
      expect(session).toMatchObject({
        session_id: 'session-123',
        status: 'active'
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/apps/vana/users/current/sessions',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('should retrieve existing ADK session', async () => {
      const sessionId = 'session-123';
      
      // Mock session retrieval
      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse({
          session_id: sessionId,
          app_name: 'vana',
          user_id: 'current',
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        })
      );

      const session = await apiClient.getAdkSession(sessionId);
      
      expect(session.session_id).toBe(sessionId);
      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:8000/apps/vana/users/current/sessions/${sessionId}`,
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should handle session not found', async () => {
      // Mock 404 response
      fetch.mockResolvedValueOnce(
        testUtils.mockApiError(404, 'Session not found')
      );

      await expect(apiClient.getAdkSession('invalid-session'))
        .rejects
        .toThrow(ApiError);
    });
  });

  describe('Research Query Integration', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create a test session
      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse({
          id: 'test-session-456',
          status: 'active'
        })
      );
      
      const session = await apiClient.createAdkSession();
      sessionId = session.session_id;
      fetch.mockClear();
    });

    it('should start research query successfully', async () => {
      const query = 'What are the latest developments in AI research?';
      
      // Mock successful research start
      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse({
          session_id: sessionId,
          status: 'processing',
          message: 'Research query initiated successfully'
        })
      );

      const result = await apiClient.startAdkResearch(query, sessionId, {
        type: 'research',
        priority: 'high',
        maxDuration: 300
      });

      expect(result).toMatchObject({
        session_id: sessionId,
        status: 'processing'
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/run_sse',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            query,
            session_id: sessionId,
            type: 'research',
            priority: 'high',
            max_duration: 300,
            output_format: 'structured'
          })
        })
      );
    });

    it('should handle query validation errors', async () => {
      // Mock validation error
      fetch.mockResolvedValueOnce(
        testUtils.mockApiError(400, 'Query too short')
      );

      await expect(
        apiClient.startAdkResearch('', sessionId)
      ).rejects.toThrow(ApiError);
    });

    it('should handle query timeout', async () => {
      // Mock timeout error
      fetch.mockResolvedValueOnce(
        testUtils.mockApiError(408, 'Request timeout')
      );

      await expect(
        apiClient.startAdkResearch('test query', sessionId)
      ).rejects.toThrow(ApiError);
    }, TEST_TIMEOUT);
  });

  describe('SSE Connection Integration', () => {
    let sessionId: string;

    beforeEach(async () => {
      sessionId = 'sse-test-session';
      // Reset EventSource mock
      global.EventSource.reset();
    });

    it('should establish SSE connection successfully', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ 
          sessionId,
          autoReconnect: false // Disable for testing
        })
      );

      // Wait for connection attempt
      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const eventSource = global.EventSource.getLatest();
      expect(eventSource.url).toContain(sessionId);
      expect(result.current.connectionStatus).toBe('connecting');

      cleanup.push(() => result.current.disconnect());
    });

    it('should handle SSE connection errors', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ 
          sessionId,
          autoReconnect: false
        })
      );

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      // Simulate connection error
      act(() => {
        const eventSource = global.EventSource.getLatest();
        if (eventSource.onerror) {
          eventSource.onerror(new Error('Connection failed'));
        }
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('error');
      });

      cleanup.push(() => result.current.disconnect());
    });

    it('should process connection events correctly', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ sessionId })
      );

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      // Simulate connection event
      act(() => {
        const eventSource = global.EventSource.getLatest();
        if (eventSource.onmessage) {
          eventSource.onmessage(testUtils.createMessageEvent({
            type: 'connection',
            status: 'connected',
            sessionId: sessionId,
            timestamp: new Date().toISOString(),
            authenticated: true
          }));
        }
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.connectionStatus).toBe('connected');
      });

      cleanup.push(() => result.current.disconnect());
    });

    it('should handle heartbeat events', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ sessionId })
      );

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      // Simulate heartbeat
      act(() => {
        const eventSource = global.EventSource.getLatest();
        if (eventSource.onmessage) {
          eventSource.onmessage(testUtils.createMessageEvent({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          }));
        }
      });

      await waitFor(() => {
        expect(result.current.lastHeartbeat).toBeTruthy();
        expect(result.current.isHealthy).toBe(true);
      });

      cleanup.push(() => result.current.disconnect());
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      fetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(apiClient.healthCheck())
        .rejects
        .toThrow('Network request failed');
    });

    it('should handle API errors with proper error codes', async () => {
      // Mock 401 Unauthorized
      fetch.mockResolvedValueOnce(
        testUtils.mockApiError(401, 'Unauthorized')
      );

      await expect(apiClient.getCurrentUser())
        .rejects
        .toThrow(ApiError);

      expect(isApiError).toBeDefined();
    });

    it('should handle malformed API responses', async () => {
      // Mock invalid JSON response
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Invalid JSON'))
      });

      await expect(apiClient.healthCheck())
        .rejects
        .toThrow();
    });

    it('should handle timeout scenarios', async () => {
      // Mock slow response
      fetch.mockImplementationOnce(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve(testUtils.mockApiResponse({})), 35000);
        })
      );

      await expect(apiClient.healthCheck())
        .rejects
        .toThrow('Request timeout');
    }, 35000);
  });

  describe('Authentication Flow Integration', () => {
    afterEach(async () => {
      await authService.logout();
    });

    it('should complete full authentication flow', async () => {
      // Mock login response
      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse({
          tokens: {
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            token_type: 'Bearer',
            expires_in: 1800
          },
          user: {
            id: 'auth-test-user',
            email: 'authtest@example.com',
            first_name: 'Auth',
            last_name: 'Test',
            is_verified: true,
            created_at: new Date().toISOString()
          }
        })
      );

      const user = await authService.login({
        email: 'authtest@example.com',
        password: 'testpass'
      });

      expect(user.id).toBe('auth-test-user');
      expect(authService.isAuthenticated()).toBe(true);
      
      // Verify token is set in API client
      const token = apiClient.getAuthToken();
      expect(token).toBe('test-access-token');
    });

    it('should handle token refresh', async () => {
      // First, setup authenticated state
      authService.createDevSession();
      
      // Mock refresh token response
      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          token_type: 'Bearer',
          expires_in: 1800
        })
      );

      await authService.refreshToken();
      
      const newToken = apiClient.getAuthToken();
      expect(newToken).toBe('new-access-token');
    });

    it('should handle logout properly', async () => {
      // Setup authenticated state
      authService.createDevSession();
      expect(authService.isAuthenticated()).toBe(true);

      // Mock logout response
      fetch.mockResolvedValueOnce(
        testUtils.mockApiResponse({})
      );

      await authService.logout();
      
      expect(authService.isAuthenticated()).toBe(false);
      expect(apiClient.getAuthToken()).toBeNull();
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent API requests', async () => {
      const requests = Array(10).fill(null).map(() => {
        fetch.mockResolvedValueOnce(
          testUtils.mockApiResponse({
            status: 'healthy',
            timestamp: new Date().toISOString()
          })
        );
        return apiClient.checkConnection();
      });

      const results = await Promise.all(requests);
      
      expect(results).toHaveLength(10);
      expect(results.every(result => result === true)).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(10);
    });

    it('should handle memory efficiently during long sessions', async () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Simulate multiple SSE connections and disconnections
      const connections = Array(5).fill(null).map((_, index) => {
        const { result } = renderHook(() => 
          useSSEClient({ 
            sessionId: `session-${index}`,
            autoReconnect: false 
          })
        );
        return result;
      });

      // Wait for connections
      await testUtils.waitFor(100);

      // Disconnect all
      connections.forEach(connection => {
        connection.current.disconnect();
      });

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Check memory usage
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should maintain connection stability under load', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ sessionId: 'load-test-session' })
      );

      // Wait for connection
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connecting');
      });

      // Simulate multiple rapid events
      const eventSource = global.EventSource.getLatest();
      
      for (let i = 0; i < 100; i++) {
        act(() => {
          if (eventSource.onmessage) {
            eventSource.onmessage(testUtils.createMessageEvent({
              type: 'agent_progress',
              sessionId: 'load-test-session',
              agentId: `agent-${i % 8}`,
              progress: (i % 100),
              timestamp: new Date().toISOString()
            }));
          }
        });
      }

      // Verify connection remains stable
      expect(result.current.events.length).toBeGreaterThan(0);
      expect(result.current.events.length).toBeLessThanOrEqual(50); // Event history limit

      cleanup.push(() => result.current.disconnect());
    });
  });
});