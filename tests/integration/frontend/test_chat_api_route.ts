/**
 * Integration tests for frontend /api/chat route
 */

import { NextRequest } from 'next/server';
import { POST, DELETE } from '@/app/(chat)/api/chat/route';
import { auth } from '@/app/(auth)/auth';
import { getChatById, saveChat, saveMessages, deleteChatById, getMessageCountByUserId } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { generateTitleFromUserMessage } from '@/app/(chat)/actions';

// Mock dependencies
jest.mock('@/app/(auth)/auth');
jest.mock('@/lib/db/queries');
jest.mock('@/app/(chat)/actions');
jest.mock('@/lib/ai/providers');
jest.mock('@vercel/functions', () => ({
  geolocation: () => ({
    longitude: -122.4194,
    latitude: 37.7749,
    city: 'San Francisco',
    country: 'US'
  })
}));

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockGetChatById = getChatById as jest.MockedFunction<typeof getChatById>;
const mockSaveChat = saveChat as jest.MockedFunction<typeof saveChat>;
const mockSaveMessages = saveMessages as jest.MockedFunction<typeof saveMessages>;
const mockDeleteChatById = deleteChatById as jest.MockedFunction<typeof deleteChatById>;
const mockGetMessageCountByUserId = getMessageCountByUserId as jest.MockedFunction<typeof getMessageCountByUserId>;
const mockGenerateTitle = generateTitleFromUserMessage as jest.MockedFunction<typeof generateTitleFromUserMessage>;

describe('/api/chat Route Integration Tests', () => {
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

  describe('POST /api/chat - Vana Backend Integration', () => {
    beforeEach(() => {
      // Mock environment to use Vana backend
      process.env.NEXT_PUBLIC_USE_VERCEL_AI = 'false';
    });

    afterEach(() => {
      delete process.env.NEXT_PUBLIC_USE_VERCEL_AI;
    });

    it('should redirect to Vana backend when configured', async () => {
      const requestBody = {
        id: 'chat-123',
        message: {
          id: 'msg-456',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello world' }]
        },
        selectedChatModel: 'gemini-pro',
        selectedVisibilityType: 'private'
      };

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Mock the vana module
      const mockVanaPost = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          task_id: 'task-789',
          message_id: 'msg-456',
          status: 'started',
          stream_url: '/api/chat/vana/chat-123/stream?task_id=task-789'
        }))
      );

      jest.doMock('@/app/(chat)/api/chat/vana/route', () => ({
        POST: mockVanaPost
      }), { virtual: true });

      const response = await POST(request);
      
      expect(mockVanaPost).toHaveBeenCalledWith(request);
    });

    it('should handle Vana backend unavailable', async () => {
      const requestBody = {
        id: 'chat-123',
        message: {
          id: 'msg-456',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello world' }]
        },
        selectedChatModel: 'gemini-pro',
        selectedVisibilityType: 'private'
      };

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Mock vana module to throw error
      jest.doMock('@/app/(chat)/api/chat/vana/route', () => ({
        POST: jest.fn().mockRejectedValue(new Error('Vana backend unavailable'))
      }), { virtual: true });

      const response = await POST(request);
      
      // Should still return a response, potentially falling back
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/chat - Vercel AI Integration', () => {
    beforeEach(() => {
      // Configure to use Vercel AI
      process.env.NEXT_PUBLIC_USE_VERCEL_AI = 'true';
      
      // Setup default mocks
      mockAuth.mockResolvedValue(mockSession);
      mockGetChatById.mockResolvedValue(null);
      mockGenerateTitle.mockResolvedValue('Test Chat');
      mockSaveChat.mockResolvedValue();
      mockSaveMessages.mockResolvedValue();
      mockGetMessageCountByUserId.mockResolvedValue(5);
    });

    afterEach(() => {
      delete process.env.NEXT_PUBLIC_USE_VERCEL_AI;
    });

    it('should create new chat with valid request', async () => {
      const requestBody = {
        id: 'chat-123',
        message: {
          id: 'msg-456',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello world' }]
        },
        selectedChatModel: 'gemini-pro',
        selectedVisibilityType: 'private'
      };

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(mockSaveChat).toHaveBeenCalledWith({
        id: 'chat-123',
        userId: 'user-123',
        title: 'Test Chat',
        visibility: 'private'
      });
      expect(mockSaveMessages).toHaveBeenCalled();
    });

    it('should handle existing chat', async () => {
      const existingChat = {
        id: 'chat-123',
        userId: 'user-123',
        title: 'Existing Chat',
        visibility: 'private' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetChatById.mockResolvedValue(existingChat);

      const requestBody = {
        id: 'chat-123',
        message: {
          id: 'msg-456',
          role: 'user',
          parts: [{ type: 'text', text: 'Follow up message' }]
        },
        selectedChatModel: 'gemini-pro',
        selectedVisibilityType: 'private'
      };

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(mockSaveChat).not.toHaveBeenCalled(); // Should not create new chat
      expect(mockSaveMessages).toHaveBeenCalled();
    });

    it('should return unauthorized for unauthenticated requests', async () => {
      mockAuth.mockResolvedValue(null);

      const requestBody = {
        id: 'chat-123',
        message: {
          id: 'msg-456',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello world' }]
        },
        selectedChatModel: 'gemini-pro',
        selectedVisibilityType: 'private'
      };

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(401);
    });

    it('should handle rate limiting', async () => {
      // Mock user exceeding daily message limit
      mockGetMessageCountByUserId.mockResolvedValue(1000);

      const requestBody = {
        id: 'chat-123',
        message: {
          id: 'msg-456',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello world' }]
        },
        selectedChatModel: 'gemini-pro',
        selectedVisibilityType: 'private'
      };

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(429); // Rate limited
    });

    it('should handle forbidden access to other user\'s chat', async () => {
      const otherUsersChat = {
        id: 'chat-123',
        userId: 'other-user-456',
        title: 'Other User Chat',
        visibility: 'private' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetChatById.mockResolvedValue(otherUsersChat);

      const requestBody = {
        id: 'chat-123',
        message: {
          id: 'msg-456',
          role: 'user',
          parts: [{ type: 'text', text: 'Trying to access other chat' }]
        },
        selectedChatModel: 'gemini-pro',
        selectedVisibilityType: 'private'
      };

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(403);
    });

    it('should handle malformed JSON request', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });

    it('should handle missing required fields', async () => {
      const requestBody = {
        // Missing required fields
        message: 'Hello world'
      };

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });

    it('should handle database errors gracefully', async () => {
      mockSaveMessages.mockRejectedValue(new Error('Database connection failed'));

      const requestBody = {
        id: 'chat-123',
        message: {
          id: 'msg-456',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello world' }]
        },
        selectedChatModel: 'gemini-pro',
        selectedVisibilityType: 'private'
      };

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /api/chat', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockSession);
    });

    it('should delete chat successfully', async () => {
      const chatToDelete = {
        id: 'chat-123',
        userId: 'user-123',
        title: 'Chat to Delete',
        visibility: 'private' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetChatById.mockResolvedValue(chatToDelete);
      mockDeleteChatById.mockResolvedValue(chatToDelete);

      const request = new NextRequest('http://localhost:3000/api/chat?id=chat-123', {
        method: 'DELETE'
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(mockDeleteChatById).toHaveBeenCalledWith({ id: 'chat-123' });
    });

    it('should return bad request for missing id', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      
      expect(response.status).toBe(400);
    });

    it('should return unauthorized for unauthenticated requests', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/chat?id=chat-123', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      
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

      const request = new NextRequest('http://localhost:3000/api/chat?id=chat-123', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      
      expect(response.status).toBe(403);
    });
  });

  describe('Environment Variable Configuration', () => {
    it('should handle missing environment variables gracefully', async () => {
      // Remove all relevant environment variables
      const originalEnv = process.env;
      process.env = {};

      const requestBody = {
        id: 'chat-123',
        message: {
          id: 'msg-456',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello world' }]
        },
        selectedChatModel: 'gemini-pro',
        selectedVisibilityType: 'private'
      };

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      mockAuth.mockResolvedValue(mockSession);
      mockGetChatById.mockResolvedValue(null);
      mockGenerateTitle.mockResolvedValue('Test Chat');
      mockSaveChat.mockResolvedValue();
      mockSaveMessages.mockResolvedValue();
      mockGetMessageCountByUserId.mockResolvedValue(5);

      const response = await POST(request);
      
      // Should still work with defaults
      expect(response.status).toBe(200);

      process.env = originalEnv;
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockSession);
      mockGetMessageCountByUserId.mockResolvedValue(5);
    });

    it('should handle ChatSDKError properly', async () => {
      const error = new ChatSDKError('internal:api');
      mockSaveMessages.mockRejectedValue(error);

      const requestBody = {
        id: 'chat-123',
        message: {
          id: 'msg-456',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello world' }]
        },
        selectedChatModel: 'gemini-pro',
        selectedVisibilityType: 'private'
      };

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      mockGetChatById.mockResolvedValue(null);
      mockGenerateTitle.mockResolvedValue('Test Chat');
      mockSaveChat.mockResolvedValue();

      const response = await POST(request);
      
      expect(response.status).toBe(500);
    });

    it('should handle unexpected errors', async () => {
      mockSaveMessages.mockRejectedValue(new Error('Unexpected error'));

      const requestBody = {
        id: 'chat-123',
        message: {
          id: 'msg-456',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello world' }]
        },
        selectedChatModel: 'gemini-pro',
        selectedVisibilityType: 'private'
      };

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      mockGetChatById.mockResolvedValue(null);
      mockGenerateTitle.mockResolvedValue('Test Chat');
      mockSaveChat.mockResolvedValue();

      const response = await POST(request);
      
      expect(response.status).toBe(500);
    });
  });
});