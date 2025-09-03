/**
 * Integration tests for frontend Vana backend API route
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/(chat)/api/chat/vana/route';
import { auth } from '@/app/(auth)/auth';
import { getChatById, saveChat, saveMessages } from '@/lib/db/queries';
import { generateTitleFromUserMessage } from '@/app/(chat)/actions';
import { ChatSDKError } from '@/lib/errors';

// Mock dependencies
jest.mock('@/app/(auth)/auth');
jest.mock('@/lib/db/queries');
jest.mock('@/app/(chat)/actions');

// Mock fetch globally
global.fetch = jest.fn();

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockGetChatById = getChatById as jest.MockedFunction<typeof getChatById>;
const mockSaveChat = saveChat as jest.MockedFunction<typeof saveChat>;
const mockSaveMessages = saveMessages as jest.MockedFunction<typeof saveMessages>;
const mockGenerateTitle = generateTitleFromUserMessage as jest.MockedFunction<typeof generateTitleFromUserMessage>;
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('Vana Backend API Route Integration Tests', () => {
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

  describe('POST /api/chat/vana', () => {
    const validRequestBody = {
      id: 'chat-123',
      message: {
        id: 'msg-456',
        role: 'user' as const,
        parts: [{ type: 'text' as const, text: 'Hello Vana!' }]
      },
      selectedVisibilityType: 'private' as const,
      vanaOptions: {
        agents: ['research', 'coding'],
        model: 'gemini-pro',
        enableProgress: true
      }
    };

    beforeEach(() => {
      mockAuth.mockResolvedValue(mockSession);
      mockGenerateTitle.mockResolvedValue('Test Chat with Vana');
      mockSaveChat.mockResolvedValue();
      mockSaveMessages.mockResolvedValue();
    });

    it('should successfully forward request to Vana backend', async () => {
      // Mock successful Vana backend response
      const vanaResponse = {
        task_id: 'vana-task-789',
        message_id: 'msg-456',
        status: 'started',
        chat_id: 'chat-123'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => vanaResponse,
        status: 200
      } as Response);

      mockGetChatById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.task_id).toBe('vana-task-789');
      expect(data.status).toBe('started');
      expect(data.stream_url).toContain('vana-task-789');

      // Verify Vana backend was called correctly
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/chat/chat-123/message',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-User-ID': 'user-123',
            'X-Session-ID': 'chat-123'
          }),
          body: expect.stringContaining('Hello Vana!')
        })
      );

      // Verify chat was created
      expect(mockSaveChat).toHaveBeenCalledWith({
        id: 'chat-123',
        userId: 'user-123',
        title: 'Test Chat with Vana',
        visibility: 'private'
      });

      // Verify message was saved
      expect(mockSaveMessages).toHaveBeenCalled();
    });

    it('should handle existing chat correctly', async () => {
      const existingChat = {
        id: 'chat-123',
        userId: 'user-123',
        title: 'Existing Chat',
        visibility: 'private' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetChatById.mockResolvedValue(existingChat);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ task_id: 'task-456', status: 'started' })
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSaveChat).not.toHaveBeenCalled(); // Should not create new chat
      expect(mockSaveMessages).toHaveBeenCalled(); // Should save message
    });

    it('should return unauthorized for unauthenticated requests', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return forbidden for other user\'s chat', async () => {
      const otherUsersChat = {
        id: 'chat-123',
        userId: 'other-user-456',
        title: 'Other User Chat',
        visibility: 'private' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetChatById.mockResolvedValue(otherUsersChat);

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it('should handle Vana backend errors', async () => {
      mockGetChatById.mockResolvedValue(null);
      
      // Mock Vana backend error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Internal Server Error',
        status: 500
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should handle Vana backend network errors', async () => {
      mockGetChatById.mockResolvedValue(null);
      
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('vana_unavailable');
      expect(data.fallback_to_vercel).toBe(true);
    });

    it('should handle timeout errors', async () => {
      mockGetChatById.mockResolvedValue(null);
      
      // Mock timeout
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);

      expect(response.status).toBe(503);
    });

    it('should use custom Vana base URL from environment', async () => {
      const originalEnv = process.env.VANA_BASE_URL;
      process.env.VANA_BASE_URL = 'https://custom-vana.example.com';

      mockGetChatById.mockResolvedValue(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ task_id: 'task-456', status: 'started' })
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await POST(request);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom-vana.example.com/chat/chat-123/message',
        expect.any(Object)
      );

      // Restore original environment
      if (originalEnv) {
        process.env.VANA_BASE_URL = originalEnv;
      } else {
        delete process.env.VANA_BASE_URL;
      }
    });

    it('should handle malformed request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should format message correctly for Vana backend', async () => {
      mockGetChatById.mockResolvedValue(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ task_id: 'task-456', status: 'started' })
      } as Response);

      const complexMessage = {
        ...validRequestBody,
        message: {
          id: 'msg-456',
          role: 'user' as const,
          parts: [
            { type: 'text' as const, text: 'Hello' },
            { type: 'text' as const, text: ' world!' }
          ]
        }
      };

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'POST',
        body: JSON.stringify(complexMessage),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await POST(request);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);

      expect(requestBody.message).toBe('Hello'); // Should take first text part
      expect(requestBody.message_id).toBe('msg-456');
      expect(requestBody.model).toBe('gemini-pro');
      expect(requestBody.agents).toEqual(['research', 'coding']);
      expect(requestBody.enable_progress).toBe(true);
      expect(requestBody.metadata).toEqual(expect.objectContaining({
        role: 'user',
        user_id: 'user-123',
        chat_id: 'chat-123'
      }));
    });
  });

  describe('GET /api/chat/vana (Health Check)', () => {
    it('should return Vana backend availability status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.available).toBe(true);
      expect(data.status).toBe(200);
      expect(data.url).toBe('http://localhost:8000');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/health',
        expect.objectContaining({
          method: 'GET',
          signal: expect.any(AbortSignal)
        })
      );
    });

    it('should return unavailable when Vana backend is down', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.available).toBe(false);
      expect(data.status).toBe(500);
    });

    it('should handle network errors in health check', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.available).toBe(false);
      expect(data.error).toBe('Connection refused');
    });

    it('should use custom Vana base URL in health check', async () => {
      const originalEnv = process.env.VANA_BASE_URL;
      process.env.VANA_BASE_URL = 'https://staging-vana.example.com';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.url).toBe('https://staging-vana.example.com');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://staging-vana.example.com/health',
        expect.any(Object)
      );

      // Restore original environment
      if (originalEnv) {
        process.env.VANA_BASE_URL = originalEnv;
      } else {
        delete process.env.VANA_BASE_URL;
      }
    });
  });

  describe('Request Formatting and Validation', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockSession);
      mockGetChatById.mockResolvedValue(null);
      mockSaveChat.mockResolvedValue();
      mockSaveMessages.mockResolvedValue();
      mockGenerateTitle.mockResolvedValue('Test Chat');
    });

    it('should use default values when vanaOptions not provided', async () => {
      const requestWithoutOptions = {
        id: 'chat-123',
        message: {
          id: 'msg-456',
          role: 'user' as const,
          parts: [{ type: 'text' as const, text: 'Hello!' }]
        },
        selectedVisibilityType: 'private' as const
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ task_id: 'task-456', status: 'started' })
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'POST',
        body: JSON.stringify(requestWithoutOptions),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await POST(request);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);

      expect(requestBody.model).toBe('gemini-pro'); // Default model
      expect(requestBody.agents).toEqual([]); // Default empty agents
      expect(requestBody.enable_progress).toBe(true); // Default true
    });

    it('should handle message with no text parts', async () => {
      const requestWithNoText = {
        id: 'chat-123',
        message: {
          id: 'msg-456',
          role: 'user' as const,
          parts: [{ type: 'image' as const, image: 'data:image/png;base64,...' }]
        },
        selectedVisibilityType: 'private' as const
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ task_id: 'task-456', status: 'started' })
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/chat/vana', {
        method: 'POST',
        body: JSON.stringify(requestWithNoText),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await POST(request);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);

      expect(requestBody.message).toBe(''); // Should default to empty string
    });
  });
});