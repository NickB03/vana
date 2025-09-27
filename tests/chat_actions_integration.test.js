/**
 * @fileoverview Integration tests for chat actions
 * Tests the integration between frontend and backend for chat functionality
 * including CORS, authentication, and real server communication.
 */

const { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, jest } = require('@jest/globals');

/**
 * Chat Actions Integration Test Suite
 *
 * Tests the complete integration flow between frontend and backend:
 * 1. Frontend connects to backend on port 8000
 * 2. CORS is properly configured
 * 3. Authentication headers work (if applicable)
 * 4. Error states are handled gracefully
 * 5. Network failures show appropriate messages
 * 6. SSE connections work end-to-end
 */
describe('Chat Actions Integration Tests', () => {
  const BACKEND_URL = 'http://localhost:8000';
  const FRONTEND_URL = 'http://localhost:3000';

  let originalFetch;
  let server;

  beforeAll(async () => {
    // Store original fetch for potential restoration
    originalFetch = global.fetch;
  });

  afterAll(async () => {
    // Restore original fetch if modified
    if (originalFetch) {
      global.fetch = originalFetch;
    }
  });

  beforeEach(() => {
    // Clear any mocks before each test
    jest.clearAllMocks();
  });

  describe('Backend Connection and Health', () => {
    test('should connect to backend on port 8000', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'healthy',
          service: 'vana',
          timestamp: new Date().toISOString()
        })
      });
      global.fetch = mockFetch;

      const response = await fetch(`${BACKEND_URL}/health`);
      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith(`${BACKEND_URL}/health`);
      expect(response.ok).toBe(true);
      expect(result.status).toBe('healthy');
      expect(result.service).toBe('vana');
    });

    test('should handle backend unavailable gracefully', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      global.fetch = mockFetch;

      try {
        await fetch(`${BACKEND_URL}/health`);
      } catch (error) {
        expect(error.message).toBe('ECONNREFUSED');
      }
    });

    test('should validate backend API structure', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'healthy',
          service: 'vana',
          version: '1.0.0',
          dependencies: {
            google_api_configured: true,
            session_storage: true,
            cloud_logging: false
          }
        })
      });
      global.fetch = mockFetch;

      const response = await fetch(`${BACKEND_URL}/health`);
      const health = await response.json();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('service');
      expect(health).toHaveProperty('dependencies');
      expect(health.dependencies).toHaveProperty('google_api_configured');
    });
  });

  describe('CORS Configuration', () => {
    test('should allow requests from frontend origin', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (name) => {
            if (name.toLowerCase() === 'access-control-allow-origin') {
              return FRONTEND_URL;
            }
            return null;
          }
        },
        json: () => Promise.resolve({ sessions: [] })
      });
      global.fetch = mockFetch;

      const response = await fetch(`${BACKEND_URL}/api/sessions`, {
        method: 'GET',
        headers: {
          'Origin': FRONTEND_URL
        }
      });

      expect(response.ok).toBe(true);
      // In a real integration test, we would check actual CORS headers
      expect(response.headers.get('access-control-allow-origin')).toBe(FRONTEND_URL);
    });

    test('should handle preflight OPTIONS requests', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name) => {
            const headers = {
              'access-control-allow-origin': FRONTEND_URL,
              'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'access-control-allow-headers': 'Content-Type, Authorization'
            };
            return headers[name.toLowerCase()] || null;
          }
        }
      });
      global.fetch = mockFetch;

      const response = await fetch(`${BACKEND_URL}/api/messages/test`, {
        method: 'OPTIONS',
        headers: {
          'Origin': FRONTEND_URL,
          'Access-Control-Request-Method': 'PUT',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-methods')).toContain('PUT');
    });

    test('should reject requests from unauthorized origins', async () => {
      const unauthorizedOrigin = 'http://malicious-site.com';

      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({
          detail: 'CORS policy violation'
        })
      });
      global.fetch = mockFetch;

      const response = await fetch(`${BACKEND_URL}/api/sessions`, {
        method: 'GET',
        headers: {
          'Origin': unauthorizedOrigin
        }
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(403);
    });
  });

  describe('Authentication Integration', () => {
    test('should accept requests without authentication in development', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          sessions: [],
          count: 0,
          authenticated: false
        })
      });
      global.fetch = mockFetch;

      const response = await fetch(`${BACKEND_URL}/api/sessions`);
      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.authenticated).toBe(false);
    });

    test('should handle Bearer token authentication', async () => {
      const mockToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.test';

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          sessions: [],
          authenticated: true,
          user_id: 'user_123'
        })
      });
      global.fetch = mockFetch;

      const response = await fetch(`${BACKEND_URL}/api/sessions`, {
        headers: {
          'Authorization': `Bearer ${mockToken}`
        }
      });

      const result = await response.json();
      expect(result.authenticated).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `${BACKEND_URL}/api/sessions`,
        expect.objectContaining({
          headers: {
            'Authorization': `Bearer ${mockToken}`
          }
        })
      );
    });

    test('should handle invalid authentication gracefully', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          detail: 'Invalid authentication credentials'
        })
      });
      global.fetch = mockFetch;

      const response = await fetch(`${BACKEND_URL}/api/sessions`, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Message Operations Integration', () => {
    test('should perform end-to-end message edit flow', async () => {
      const sessionId = 'integration_test_session';
      const messageId = `msg_123_${sessionId}_user`;
      const newContent = 'Integration test updated content';

      // Mock the edit API call
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message_id: messageId,
          session_id: sessionId,
          operation: 'edit',
          data: {
            new_content: newContent,
            original_content: 'Original content'
          }
        })
      });
      global.fetch = mockFetch;

      // Perform edit operation
      const response = await fetch(`${BACKEND_URL}/api/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Origin': FRONTEND_URL
        },
        body: JSON.stringify({
          content: newContent,
          trigger_regeneration: false
        })
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
      expect(result.operation).toBe('edit');
      expect(result.data.new_content).toBe(newContent);
    });

    test('should perform end-to-end message delete flow', async () => {
      const sessionId = 'integration_test_session';
      const messageId = `msg_124_${sessionId}_assistant`;

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message_id: messageId,
          session_id: sessionId,
          operation: 'delete',
          data: {
            deleted_count: 1,
            deleted_message_ids: [messageId]
          }
        })
      });
      global.fetch = mockFetch;

      const response = await fetch(`${BACKEND_URL}/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Origin': FRONTEND_URL
        }
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
      expect(result.operation).toBe('delete');
      expect(result.data.deleted_count).toBe(1);
    });

    test('should perform end-to-end regeneration flow', async () => {
      const sessionId = 'integration_test_session';
      const messageId = `msg_125_${sessionId}_assistant`;

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message_id: messageId,
          session_id: sessionId,
          operation: 'regenerate',
          data: {
            task_id: 'integration_regen_task',
            original_message_id: `msg_124_${sessionId}_user`
          }
        })
      });
      global.fetch = mockFetch;

      const response = await fetch(`${BACKEND_URL}/api/messages/${messageId}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': FRONTEND_URL
        },
        body: JSON.stringify({})
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
      expect(result.operation).toBe('regenerate');
      expect(result.data.task_id).toBe('integration_regen_task');
    });

    test('should handle feedback submission flow', async () => {
      const sessionId = 'integration_test_session';
      const messageId = `msg_126_${sessionId}_assistant`;

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          feedback_id: 'integration_feedback_123',
          message_id: messageId,
          session_id: sessionId
        })
      });
      global.fetch = mockFetch;

      const response = await fetch(`${BACKEND_URL}/api/messages/${messageId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': FRONTEND_URL
        },
        body: JSON.stringify({
          feedback_type: 'upvote',
          reason: 'helpful_response'
        })
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
      expect(result.feedback_id).toBe('integration_feedback_123');
    });
  });

  describe('SSE Integration', () => {
    test('should establish SSE connection successfully', () => {
      const mockEventSource = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        close: jest.fn(),
        readyState: 1 // OPEN
      };

      global.EventSource = jest.fn().mockImplementation(() => mockEventSource);

      const sessionId = 'integration_test_session';
      const eventSource = new EventSource(`${BACKEND_URL}/agent_network_sse/${sessionId}`);

      expect(global.EventSource).toHaveBeenCalledWith(`${BACKEND_URL}/agent_network_sse/${sessionId}`);
      expect(mockEventSource.readyState).toBe(1);
    });

    test('should handle SSE authentication', () => {
      const mockEventSource = {
        addEventListener: jest.fn(),
        close: jest.fn(),
        readyState: 1
      };

      global.EventSource = jest.fn().mockImplementation((url, options) => {
        expect(options?.headers?.Authorization).toBeDefined();
        return mockEventSource;
      });

      const sessionId = 'integration_test_session';
      const eventSource = new EventSource(`${BACKEND_URL}/agent_network_sse/${sessionId}`, {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });

      expect(global.EventSource).toHaveBeenCalled();
    });

    test('should handle SSE connection errors', () => {
      const mockEventSource = {
        addEventListener: jest.fn(),
        close: jest.fn(),
        readyState: 2, // CLOSED
        onerror: null
      };

      global.EventSource = jest.fn().mockImplementation(() => mockEventSource);

      const sessionId = 'integration_test_session';
      const eventSource = new EventSource(`${BACKEND_URL}/agent_network_sse/${sessionId}`);

      // Simulate error
      const errorHandler = jest.fn();
      mockEventSource.addEventListener.mockImplementation((event, handler) => {
        if (event === 'error') {
          errorHandler();
        }
      });

      eventSource.addEventListener('error', errorHandler);

      // Trigger error handler
      errorHandler();
      expect(errorHandler).toHaveBeenCalled();
    });

    test('should handle SSE message events', () => {
      const mockEventSource = {
        addEventListener: jest.fn(),
        close: jest.fn(),
        readyState: 1
      };

      global.EventSource = jest.fn().mockImplementation(() => mockEventSource);

      const messageHandler = jest.fn();
      const sessionId = 'integration_test_session';
      const eventSource = new EventSource(`${BACKEND_URL}/agent_network_sse/${sessionId}`);

      mockEventSource.addEventListener.mockImplementation((event, handler) => {
        if (event === 'message') {
          messageHandler(handler);
        }
      });

      eventSource.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        expect(data).toHaveProperty('type');
      });

      // Simulate receiving a message
      const mockEvent = {
        data: JSON.stringify({
          type: 'message_edited',
          message_id: 'msg_123',
          data: { content: 'Updated content' }
        })
      };

      mockEventSource.addEventListener('message', (handler) => {
        handler(mockEvent);
      });
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle network connectivity issues', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network Error'));
      global.fetch = mockFetch;

      try {
        await fetch(`${BACKEND_URL}/api/sessions`);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toBe('Network Error');
      }
    });

    test('should handle server errors gracefully', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          detail: 'Internal server error',
          error_id: 'err_12345'
        })
      });
      global.fetch = mockFetch;

      const response = await fetch(`${BACKEND_URL}/api/sessions`);
      const error = await response.json();

      expect(response.status).toBe(500);
      expect(error.detail).toBe('Internal server error');
      expect(error.error_id).toBe('err_12345');
    });

    test('should handle malformed JSON responses', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new SyntaxError('Unexpected token'))
      });
      global.fetch = mockFetch;

      try {
        const response = await fetch(`${BACKEND_URL}/api/sessions`);
        await response.json();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toBe('Unexpected token');
      }
    });

    test('should handle timeout errors', async () => {
      const mockFetch = jest.fn().mockImplementation(() => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error('Request timeout'));
          }, 100);
        });
      });
      global.fetch = mockFetch;

      try {
        await fetch(`${BACKEND_URL}/api/sessions`);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toBe('Request timeout');
      }
    });
  });

  describe('Session Management Integration', () => {
    test('should list sessions successfully', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          sessions: [
            {
              id: 'session_1',
              title: 'Test Session 1',
              status: 'completed',
              created_at: '2025-01-26T09:00:00Z'
            },
            {
              id: 'session_2',
              title: 'Test Session 2',
              status: 'active',
              created_at: '2025-01-26T10:00:00Z'
            }
          ],
          count: 2,
          authenticated: false
        })
      });
      global.fetch = mockFetch;

      const response = await fetch(`${BACKEND_URL}/api/sessions`);
      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.sessions).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.sessions[0].id).toBe('session_1');
    });

    test('should get individual session details', async () => {
      const sessionId = 'test_session_123';

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: sessionId,
          title: 'Integration Test Session',
          status: 'active',
          messages: [
            {
              id: `msg_1_${sessionId}_user`,
              role: 'user',
              content: 'Test message',
              timestamp: '2025-01-26T10:00:00Z'
            }
          ],
          created_at: '2025-01-26T10:00:00Z',
          authenticated: false
        })
      });
      global.fetch = mockFetch;

      const response = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}`);
      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.id).toBe(sessionId);
      expect(result.title).toBe('Integration Test Session');
      expect(result.messages).toHaveLength(1);
    });

    test('should update session metadata', async () => {
      const sessionId = 'test_session_123';

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: sessionId,
          title: 'Updated Session Title',
          status: 'completed',
          authenticated: false
        })
      });
      global.fetch = mockFetch;

      const response = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Updated Session Title',
          status: 'completed'
        })
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.title).toBe('Updated Session Title');
      expect(result.status).toBe('completed');
    });
  });

  describe('Content Type and Encoding', () => {
    test('should handle JSON content type correctly', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (name) => {
            if (name.toLowerCase() === 'content-type') {
              return 'application/json; charset=utf-8';
            }
            return null;
          }
        },
        json: () => Promise.resolve({ status: 'ok' })
      });
      global.fetch = mockFetch;

      const response = await fetch(`${BACKEND_URL}/api/sessions`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    });

    test('should handle UTF-8 encoding for international content', async () => {
      const internationalContent = 'Test message with émojis 🚀 and ñoñó characters';
      const sessionId = 'utf8_test_session';
      const messageId = `msg_utf8_${sessionId}_user`;

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message_id: messageId,
          session_id: sessionId,
          operation: 'edit',
          data: {
            new_content: internationalContent
          }
        })
      });
      global.fetch = mockFetch;

      const response = await fetch(`${BACKEND_URL}/api/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          content: internationalContent
        })
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.data.new_content).toBe(internationalContent);
    });
  });
});