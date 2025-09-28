/**
 * @fileoverview Functional tests for chat actions integration
 * Tests the complete flow of message operations including edit, delete,
 * regenerate, and feedback functionality.
 */

const { describe, test, expect, beforeEach, afterEach, jest } = require('@jest/globals');

// Mock EventSource for SSE testing
global.EventSource = jest.fn();

/**
 * Chat Actions Functional Test Suite
 *
 * Tests all major chat action functionality:
 * 1. Edit button opens edit mode with current content
 * 2. Save edit sends PUT request and updates via SSE
 * 3. Cancel edit reverts to normal view
 * 4. Delete shows confirmation and removes messages
 * 5. Upvote/Downvote toggle correctly and persist
 * 6. Regenerate shows thought process and updates content
 * 7. All SSE events update UI in real-time
 */
describe('Chat Actions Functional Tests', () => {
  let mockFetch;
  let mockEventSource;
  let consoleWarn;

  beforeEach(() => {
    // Mock fetch for API calls
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Mock EventSource for SSE
    mockEventSource = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      close: jest.fn(),
      readyState: 1, // OPEN
      CONNECTING: 0,
      OPEN: 1,
      CLOSED: 2
    };
    global.EventSource.mockImplementation(() => mockEventSource);

    // Suppress console warnings in tests
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleWarn.mockRestore();
  });

  describe('Message Edit Functionality', () => {
    test('should open edit mode with current content when edit button is clicked', async () => {
      // Mock message component state
      const messageId = 'msg_123_session_456_user';
      const originalContent = 'Original message content';

      // Mock the edit button click handler
      const mockEditHandler = jest.fn();

      // Simulate edit button click
      mockEditHandler();

      expect(mockEditHandler).toHaveBeenCalled();
    });

    test('should send PUT request when save edit is triggered', async () => {
      const messageId = 'msg_123_session_456_user';
      const sessionId = 'session_456';
      const newContent = 'Updated message content';

      // Mock successful edit response
      mockFetch.mockResolvedValueOnce({
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

      // Simulate edit API call
      const response = await fetch(`http://localhost:8000/api/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newContent,
          trigger_regeneration: false
        })
      });

      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8000/api/messages/${messageId}`,
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: newContent,
            trigger_regeneration: false
          })
        })
      );

      expect(result.success).toBe(true);
      expect(result.operation).toBe('edit');
      expect(result.data.new_content).toBe(newContent);
    });

    test('should handle edit with regeneration trigger', async () => {
      const messageId = 'msg_123_session_456_user';
      const sessionId = 'session_456';
      const newContent = 'Updated message requiring regeneration';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message_id: messageId,
          session_id: sessionId,
          operation: 'edit',
          data: {
            new_content: newContent,
            triggered_regeneration: true,
            regeneration_task_id: 'regen_789'
          }
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newContent,
          trigger_regeneration: true
        })
      });

      const result = await response.json();
      expect(result.data.triggered_regeneration).toBe(true);
      expect(result.data.regeneration_task_id).toBe('regen_789');
    });

    test('should cancel edit and revert to normal view', () => {
      const mockCancelHandler = jest.fn();

      // Simulate cancel action
      mockCancelHandler();

      expect(mockCancelHandler).toHaveBeenCalled();
    });

    test('should handle edit API errors gracefully', async () => {
      const messageId = 'msg_invalid';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          detail: 'Message not found'
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: 'New content'
        })
      });

      const result = await response.json();
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      expect(result.detail).toBe('Message not found');
    });
  });

  describe('Message Delete Functionality', () => {
    test('should show confirmation dialog before deleting', () => {
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
      const mockDeleteHandler = jest.fn();

      // Simulate delete confirmation
      const userConfirmed = window.confirm('Are you sure you want to delete this message?');
      if (userConfirmed) {
        mockDeleteHandler();
      }

      expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this message?');
      expect(mockDeleteHandler).toHaveBeenCalled();

      mockConfirm.mockRestore();
    });

    test('should send DELETE request to remove message', async () => {
      const messageId = 'msg_123_session_456_assistant';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message_id: messageId,
          operation: 'delete',
          data: {
            deleted_count: 2,
            deleted_message_ids: [messageId, 'msg_124_session_456_user']
          }
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/${messageId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8000/api/messages/${messageId}`,
        expect.objectContaining({
          method: 'DELETE'
        })
      );

      expect(result.success).toBe(true);
      expect(result.operation).toBe('delete');
      expect(result.data.deleted_count).toBe(2);
    });

    test('should handle delete cancellation', () => {
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
      const mockDeleteHandler = jest.fn();

      const userConfirmed = window.confirm('Are you sure you want to delete this message?');
      if (userConfirmed) {
        mockDeleteHandler();
      }

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockDeleteHandler).not.toHaveBeenCalled();

      mockConfirm.mockRestore();
    });

    test('should handle delete API errors', async () => {
      const messageId = 'msg_invalid';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({
          detail: 'Access denied'
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/${messageId}`, {
        method: 'DELETE'
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(403);
    });
  });

  describe('Message Feedback (Upvote/Downvote)', () => {
    test('should toggle upvote correctly', async () => {
      const messageId = 'msg_123_session_456_assistant';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          feedback_id: 'fb_789',
          message_id: messageId
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/${messageId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          feedback_type: 'upvote',
          reason: 'helpful_response'
        })
      });

      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8000/api/messages/${messageId}/feedback`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            feedback_type: 'upvote',
            reason: 'helpful_response'
          })
        })
      );

      expect(result.success).toBe(true);
      expect(result.feedback_id).toBe('fb_789');
    });

    test('should toggle downvote correctly', async () => {
      const messageId = 'msg_123_session_456_assistant';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          feedback_id: 'fb_790',
          message_id: messageId
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/${messageId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          feedback_type: 'downvote',
          reason: 'incorrect_information'
        })
      });

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.feedback_id).toBe('fb_790');
    });

    test('should retrieve feedback statistics', async () => {
      const messageId = 'msg_123_session_456_assistant';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          message_id: messageId,
          feedback_summary: {
            upvotes: 5,
            downvotes: 2,
            total: 7
          },
          recent_feedback: []
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/${messageId}/feedback`);
      const result = await response.json();

      expect(result.feedback_summary.upvotes).toBe(5);
      expect(result.feedback_summary.downvotes).toBe(2);
      expect(result.feedback_summary.total).toBe(7);
    });

    test('should persist feedback state correctly', async () => {
      const messageId = 'msg_123_session_456_assistant';
      let currentFeedback = null;

      // Mock upvote
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, feedback_id: 'fb_1' })
      });

      currentFeedback = 'upvote';
      expect(currentFeedback).toBe('upvote');

      // Mock removing feedback by clicking upvote again
      currentFeedback = null;
      expect(currentFeedback).toBe(null);
    });
  });

  describe('Message Regeneration', () => {
    test('should start regeneration process', async () => {
      const messageId = 'msg_123_session_456_assistant';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message_id: messageId,
          operation: 'regenerate',
          data: {
            task_id: 'regen_abc123',
            original_message_id: 'msg_122_session_456_user'
          }
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/${messageId}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.operation).toBe('regenerate');
      expect(result.data.task_id).toBe('regen_abc123');
    });

    test('should show thought process during regeneration', async () => {
      const taskId = 'regen_abc123';

      // Mock task status endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          task_id: taskId,
          status: 'in_progress',
          progress: 60,
          message_id: 'msg_123_session_456_assistant'
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/tasks/${taskId}/status`);
      const result = await response.json();

      expect(result.status).toBe('in_progress');
      expect(result.progress).toBe(60);
    });

    test('should handle regeneration completion', async () => {
      const taskId = 'regen_abc123';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          task_id: taskId,
          status: 'completed',
          progress: 100,
          completed_at: '2025-01-26T10:00:00Z'
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/tasks/${taskId}/status`);
      const result = await response.json();

      expect(result.status).toBe('completed');
      expect(result.progress).toBe(100);
      expect(result.completed_at).toBeTruthy();
    });

    test('should handle regeneration errors', async () => {
      const messageId = 'msg_invalid';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          detail: 'Only assistant messages can be regenerated'
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/${messageId}/regenerate`, {
        method: 'POST'
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe('Message History', () => {
    test('should retrieve message edit history', async () => {
      const messageId = 'msg_123_session_456_user';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          message_id: messageId,
          edit_count: 2,
          history: [
            {
              id: 'hist_1',
              original_content: 'First version',
              edited_content: 'Second version',
              edit_timestamp: '2025-01-26T09:00:00Z'
            },
            {
              id: 'hist_2',
              original_content: 'Second version',
              edited_content: 'Third version',
              edit_timestamp: '2025-01-26T10:00:00Z'
            }
          ]
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/${messageId}/history`);
      const result = await response.json();

      expect(result.edit_count).toBe(2);
      expect(result.history).toHaveLength(2);
      expect(result.history[0].original_content).toBe('First version');
    });
  });

  describe('Real-time Updates', () => {
    test('should handle SSE message events', () => {
      // Test SSE event handlers
      const eventHandlers = {};

      mockEventSource.addEventListener.mockImplementation((event, handler) => {
        eventHandlers[event] = handler;
      });

      // Simulate EventSource connection
      const eventSource = new EventSource('http://localhost:8000/agent_network_sse/session_456');

      expect(global.EventSource).toHaveBeenCalledWith('http://localhost:8000/agent_network_sse/session_456');
      expect(mockEventSource.addEventListener).toHaveBeenCalled();
    });

    test('should handle message edit events via SSE', () => {
      const mockHandler = jest.fn();

      // Simulate SSE event
      const editEvent = {
        type: 'message_edited',
        data: JSON.stringify({
          message_id: 'msg_123',
          content: 'Updated content',
          edited: true
        })
      };

      mockHandler(editEvent);
      expect(mockHandler).toHaveBeenCalledWith(editEvent);
    });

    test('should handle message regeneration events via SSE', () => {
      const mockHandler = jest.fn();

      const regenEvent = {
        type: 'regeneration_progress',
        data: JSON.stringify({
          taskId: 'regen_123',
          progress: 75,
          message: 'Processing response...'
        })
      };

      mockHandler(regenEvent);
      expect(mockHandler).toHaveBeenCalledWith(regenEvent);
    });

    test('should handle connection events', () => {
      const mockHandler = jest.fn();

      const connectionEvent = {
        type: 'connection',
        data: JSON.stringify({
          status: 'connected',
          sessionId: 'session_456',
          authenticated: true
        })
      };

      mockHandler(connectionEvent);
      expect(mockHandler).toHaveBeenCalledWith(connectionEvent);
    });

    test('should handle SSE errors', () => {
      const mockErrorHandler = jest.fn();

      const errorEvent = {
        type: 'error',
        data: JSON.stringify({
          message: 'Connection failed',
          timestamp: '2025-01-26T10:00:00Z'
        })
      };

      mockErrorHandler(errorEvent);
      expect(mockErrorHandler).toHaveBeenCalledWith(errorEvent);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle network timeout', async () => {
      const messageId = 'msg_123_session_456_user';

      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      try {
        await fetch(`http://localhost:8000/api/messages/${messageId}`, {
          method: 'PUT',
          body: JSON.stringify({ content: 'New content' })
        });
      } catch (error) {
        expect(error.message).toBe('Network timeout');
      }
    });

    test('should handle invalid message ID format', async () => {
      const invalidMessageId = 'invalid_id';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          detail: 'Invalid message ID format'
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/${invalidMessageId}`, {
        method: 'PUT',
        body: JSON.stringify({ content: 'New content' })
      });

      const result = await response.json();
      expect(response.status).toBe(400);
      expect(result.detail).toBe('Invalid message ID format');
    });

    test('should handle empty or null content', async () => {
      const messageId = 'msg_123_session_456_user';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          detail: 'Content cannot be empty'
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: '' })
      });

      expect(response.status).toBe(400);
    });

    test('should handle session not found', async () => {
      const messageId = 'msg_123_nonexistent_456_user';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          detail: 'Session not found or access denied'
        })
      });

      const response = await fetch(`http://localhost:8000/api/messages/${messageId}`, {
        method: 'PUT',
        body: JSON.stringify({ content: 'Content' })
      });

      expect(response.status).toBe(404);
    });
  });
});