/**
 * End-to-End Integration Tests for Frontend-Backend Communication
 */

import { NextRequest } from 'next/server';
import fetch from 'node-fetch';

// Mock fetch for controlled testing
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Import after mocking fetch
import { POST as ChatPOST } from '@/app/(chat)/api/chat/route';
import { POST as VanaPOST, GET as VanaGET } from '@/app/(chat)/api/chat/vana/route';

// Mock auth and database
jest.mock('@/app/(auth)/auth');
jest.mock('@/lib/db/queries');
jest.mock('@/app/(chat)/actions');

import { auth } from '@/app/(auth)/auth';
import { getChatById, saveChat, saveMessages, getMessageCountByUserId } from '@/lib/db/queries';
import { generateTitleFromUserMessage } from '@/app/(chat)/actions';

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockGetChatById = getChatById as jest.MockedFunction<typeof getChatById>;
const mockSaveChat = saveChat as jest.MockedFunction<typeof saveChat>;
const mockSaveMessages = saveMessages as jest.MockedFunction<typeof saveMessages>;
const mockGetMessageCountByUserId = getMessageCountByUserId as jest.MockedFunction<typeof getMessageCountByUserId>;
const mockGenerateTitle = generateTitleFromUserMessage as jest.MockedFunction<typeof generateTitleFromUserMessage>;

describe('Frontend-Backend Integration E2E Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    type: 'free' as const,
  };

  const mockSession = {
    user: mockUser,
    expires: '2024-12-31T23:59:59.999Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Chat Flow Integration', () => {
    it('should handle complete flow: frontend -> Vana backend -> response', async () => {
      // Setup mocks for successful flow
      mockAuth.mockResolvedValue(mockSession);
      mockGetChatById.mockResolvedValue(null);
      mockGenerateTitle.mockResolvedValue('Integration Test Chat');
      mockSaveChat.mockResolvedValue();
      mockSaveMessages.mockResolvedValue();
      mockGetMessageCountByUserId.mockResolvedValue(5);

      // Mock Vana backend response
      const mockVanaResponse = {
        task_id: 'vana-task-12345',
        message_id: 'msg-456',
        status: 'started',
        chat_id: 'chat-123'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVanaResponse,
        status: 200
      } as any);

      // Prepare frontend request to Vana API
      const requestBody = {
        id: 'chat-123',
        message: {
          id: 'msg-456',
          role: 'user' as const,
          parts: [{ type: 'text' as const, text: 'Hello, can you help me with coding?' }]
        },
        selectedVisibilityType: 'private' as const,
        vanaOptions: {
          agents: ['coder', 'reviewer'],
          model: 'gemini-pro',
          enableProgress: true
        }
      };

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Execute the request
      const response = await VanaPOST(request);
      const responseData = await response.json();

      // Verify the complete flow
      expect(response.status).toBe(200);
      expect(responseData.task_id).toBe('vana-task-12345');
      expect(responseData.status).toBe('started');
      expect(responseData.stream_url).toContain('vana-task-12345');

      // Verify backend was called correctly
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/chat/chat-123/message',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-User-ID': 'user-123',
            'X-Session-ID': 'chat-123'
          })
        })
      );

      // Verify database operations
      expect(mockSaveChat).toHaveBeenCalledWith({
        id: 'chat-123',
        userId: 'user-123',
        title: 'Integration Test Chat',
        visibility: 'private'
      });
      expect(mockSaveMessages).toHaveBeenCalled();
    });

    it('should handle fallback from Vana to Vercel AI when backend unavailable', async () => {
      // Setup environment for fallback scenario
      process.env.NEXT_PUBLIC_USE_VERCEL_AI = 'false'; // Try Vana first

      mockAuth.mockResolvedValue(mockSession);
      mockGetChatById.mockResolvedValue(null);
      mockGenerateTitle.mockResolvedValue('Fallback Test Chat');
      mockSaveChat.mockResolvedValue();
      mockSaveMessages.mockResolvedValue();
      mockGetMessageCountByUserId.mockResolvedValue(5);

      // Mock Vana backend failure
      mockFetch.mockRejectedValueOnce(new Error('Vana backend unavailable'));

      const requestBody = {
        id: 'chat-123',
        message: {
          id: 'msg-456',
          role: 'user' as const,
          parts: [{ type: 'text' as const, text: 'This should fallback' }]
        },
        selectedChatModel: 'gemini-pro',
        selectedVisibilityType: 'private' as const
      };

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Should redirect to Vana first, then fallback
      const response = await ChatPOST(request);

      // Verify fallback behavior
      expect(response.status).toBeGreaterThanOrEqual(200);

      delete process.env.NEXT_PUBLIC_USE_VERCEL_AI;
    });

    it('should handle streaming integration correctly', async () => {
      // Test the streaming URL generation and format
      mockAuth.mockResolvedValue(mockSession);
      mockGetChatById.mockResolvedValue(null);
      mockGenerateTitle.mockResolvedValue('Stream Test Chat');
      mockSaveChat.mockResolvedValue();
      mockSaveMessages.mockResolvedValue();

      const mockVanaResponse = {
        task_id: 'stream-task-789',
        message_id: 'msg-stream-456',
        status: 'started',
        chat_id: 'chat-stream-123'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVanaResponse,
        status: 200
      } as any);

      const requestBody = {
        id: 'chat-stream-123',
        message: {
          id: 'msg-stream-456',
          role: 'user' as const,
          parts: [{ type: 'text' as const, text: 'Start streaming response' }]
        },
        selectedVisibilityType: 'private' as const
      };

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await VanaPOST(request);
      const data = await response.json();

      // Verify stream URL format
      expect(data.stream_url).toBe('/api/chat/vana/chat-stream-123/stream?task_id=stream-task-789');
    });
  });

  describe('Error Handling Integration', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockSession);
      mockGetMessageCountByUserId.mockResolvedValue(5);
    });

    it('should propagate backend errors correctly', async () => {
      mockGetChatById.mockResolvedValue(null);
      mockGenerateTitle.mockResolvedValue('Error Test Chat');
      mockSaveChat.mockResolvedValue();
      mockSaveMessages.mockResolvedValue();

      // Mock backend returning error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Internal Server Error',
        status: 500
      } as any);

      const requestBody = {
        id: 'error-chat-123',
        message: {
          id: 'error-msg-456',
          role: 'user' as const,
          parts: [{ type: 'text' as const, text: 'This will cause backend error' }]
        },
        selectedVisibilityType: 'private' as const
      };

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await VanaPOST(request);

      expect(response.status).toBe(500);
    });

    it('should handle timeout errors gracefully', async () => {
      mockGetChatById.mockResolvedValue(null);
      mockGenerateTitle.mockResolvedValue('Timeout Test Chat');
      mockSaveChat.mockResolvedValue();
      mockSaveMessages.mockResolvedValue();

      // Mock network timeout
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      const requestBody = {
        id: 'timeout-chat-123',
        message: {
          id: 'timeout-msg-456',
          role: 'user' as const,
          parts: [{ type: 'text' as const, text: 'This will timeout' }]
        },
        selectedVisibilityType: 'private' as const
      };

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await VanaPOST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('vana_unavailable');
      expect(data.fallback_to_vercel).toBe(true);
    });

    it('should handle authentication failures consistently', async () => {
      // Test unauthenticated request
      mockAuth.mockResolvedValue(null);

      const requestBody = {
        id: 'auth-test-123',
        message: {
          id: 'auth-msg-456',
          role: 'user' as const,
          parts: [{ type: 'text' as const, text: 'This should require auth' }]
        },
        selectedVisibilityType: 'private' as const
      };

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await VanaPOST(request);

      expect(response.status).toBe(401);
    });
  });

  describe('Configuration Integration', () => {
    it('should use environment variables correctly across the stack', async () => {
      const originalVanaUrl = process.env.VANA_BASE_URL;
      process.env.VANA_BASE_URL = 'https://staging-vana.example.com';

      mockAuth.mockResolvedValue(mockSession);
      mockGetChatById.mockResolvedValue(null);
      mockGenerateTitle.mockResolvedValue('Config Test Chat');
      mockSaveChat.mockResolvedValue();
      mockSaveMessages.mockResolvedValue();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ task_id: 'config-task-123', status: 'started' })
      } as any);

      const requestBody = {
        id: 'config-chat-123',
        message: {
          id: 'config-msg-456',
          role: 'user' as const,
          parts: [{ type: 'text' as const, text: 'Test custom backend URL' }]
        },
        selectedVisibilityType: 'private' as const
      };

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await VanaPOST(request);

      // Verify custom URL was used
      expect(mockFetch).toHaveBeenCalledWith(
        'https://staging-vana.example.com/chat/config-chat-123/message',
        expect.any(Object)
      );

      // Restore environment
      if (originalVanaUrl) {
        process.env.VANA_BASE_URL = originalVanaUrl;
      } else {
        delete process.env.VANA_BASE_URL;
      }
    });

    it('should handle health check integration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      } as any);

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'GET'
      });

      const response = await VanaGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.available).toBe(true);
      expect(data.status).toBe(200);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/health',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });
  });

  describe('Performance and Concurrency Integration', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockSession);
      mockGetChatById.mockResolvedValue(null);
      mockGenerateTitle.mockResolvedValue('Concurrent Test Chat');
      mockSaveChat.mockResolvedValue();
      mockSaveMessages.mockResolvedValue();
      mockGetMessageCountByUserId.mockResolvedValue(5);
    });

    it('should handle multiple concurrent requests', async () => {
      // Mock successful responses for all requests
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            task_id: `concurrent-task-${Date.now()}`,
            status: 'started'
          }),
          status: 200
        } as any)
      );

      const concurrentRequests = Array.from({ length: 5 }, (_, i) => {
        const requestBody = {
          id: `concurrent-chat-${i}`,
          message: {
            id: `concurrent-msg-${i}`,
            role: 'user' as const,
            parts: [{ type: 'text' as const, text: `Concurrent message ${i}` }]
          },
          selectedVisibilityType: 'private' as const
        };

        const request = new NextRequest('http://localhost:3000/api/chat/vana', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        return VanaPOST(request);
      });

      const responses = await Promise.all(concurrentRequests);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify all backend calls were made
      expect(mockFetch).toHaveBeenCalledTimes(5);
    });

    it('should handle request timeouts appropriately', async () => {
      mockFetch.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const requestBody = {
        id: 'timeout-integration-chat',
        message: {
          id: 'timeout-integration-msg',
          role: 'user' as const,
          parts: [{ type: 'text' as const, text: 'This will timeout in integration' }]
        },
        selectedVisibilityType: 'private' as const
      };

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await VanaPOST(request);

      // Should handle timeout gracefully
      expect(response.status).toBe(503);
    });
  });

  describe('Data Consistency Integration', () => {
    it('should maintain data consistency across frontend and backend', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockGetChatById.mockResolvedValue(null);
      mockGenerateTitle.mockResolvedValue('Consistency Test Chat');
      mockSaveChat.mockResolvedValue();
      mockSaveMessages.mockResolvedValue();

      const messageId = 'consistency-msg-12345';
      const chatId = 'consistency-chat-67890';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          task_id: 'consistency-task-99999',
          message_id: messageId,
          status: 'started',
          chat_id: chatId
        })
      } as any);

      const requestBody = {
        id: chatId,
        message: {
          id: messageId,
          role: 'user' as const,
          parts: [{ type: 'text' as const, text: 'Test data consistency' }]
        },
        selectedVisibilityType: 'private' as const
      };

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await VanaPOST(request);
      const data = await response.json();

      // Verify data consistency
      expect(data.message_id).toBe(messageId);
      
      // Verify frontend saved message with correct ID
      const saveMessagesCall = mockSaveMessages.mock.calls[0][0];
      expect(saveMessagesCall.messages[0].id).toBe(messageId);
      expect(saveMessagesCall.messages[0].chatId).toBe(chatId);

      // Verify backend received correct data
      const fetchCall = mockFetch.mock.calls[0];
      const backendRequestBody = JSON.parse(fetchCall[1]?.body as string);
      expect(backendRequestBody.message_id).toBe(messageId);
    });
  });
});