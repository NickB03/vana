/**
 * Error Scenario Tests for Chat Actions
 * Tests error handling and rollback mechanisms
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { ChatProvider } from '@/contexts/ChatContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Mock implementation of abort controller for older environments
if (!global.AbortController) {
  global.AbortController = class AbortController {
    signal = { aborted: false, addEventListener: jest.fn(), removeEventListener: jest.fn() };
    abort = jest.fn(() => { this.signal.aborted = true; });
  } as any;
}

// Error response types
interface APIError {
  message: string;
  code: string;
  details?: any;
}

const createErrorResponse = (status: number, error: APIError) => {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error })
  };
};

// Network failure scenarios
const networkFailureHandlers = [
  // Connection timeout
  rest.post('/api/chat/regenerate', (req, res, ctx) => {
    return new Promise(() => {}); // Never resolves - simulates timeout
  }),

  // Network error
  rest.post('/api/chat/regenerate', (req, res, ctx) => {
    return res.networkError('Connection failed');
  }),

  // Server error
  rest.post('/api/chat/regenerate', (req, res, ctx) => {
    return res(ctx.status(500), ctx.json({ error: { message: 'Internal server error', code: 'SERVER_ERROR' } }));
  }),

  // Malformed response
  rest.post('/api/chat/regenerate', (req, res, ctx) => {
    return res(ctx.status(200), ctx.text('invalid json response'));
  }),

  // Partial response (connection drops during streaming)
  rest.post('/api/chat/regenerate', async (req, res, ctx) => {
    // Simulate partial SSE stream
    return res(
      ctx.status(200),
      ctx.set('Content-Type', 'text/event-stream'),
      ctx.text('data: {"type": "thought", "content": "Thinking..."}\n\ndata: [INCOMPLETE')
    );
  })
];

const server = setupServer(
  // Default successful responses
  rest.post('/api/chat/regenerate', (req, res, ctx) => {
    return res(ctx.json({ success: true, messageId: 'new-msg-id' }));
  }),

  rest.put('/api/chat/messages/:messageId/edit', (req, res, ctx) => {
    return res(ctx.json({ success: true, message: { id: ctx.params.messageId, content: 'Updated content' } }));
  }),

  rest.delete('/api/chat/messages/:messageId', (req, res, ctx) => {
    return res(ctx.json({ success: true, deletedMessageIds: [ctx.params.messageId] }));
  }),

  rest.post('/api/chat/feedback', (req, res, ctx) => {
    return res(ctx.json({ success: true }));
  })
);

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary>
    <ChatProvider>
      {children}
    </ChatProvider>
  </ErrorBoundary>
);

describe('Chat Error Handling and Rollback', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('Network Failure Scenarios', () => {
    test('handles connection timeout during regeneration', async () => {
      const user = userEvent.setup({ delay: null });

      // Set up timeout handler
      server.use(
        rest.post('/api/chat/regenerate', (req, res, ctx) => {
          return new Promise(() => {}); // Never resolves
        })
      );

      render(
        <TestWrapper>
          <ChatContainer initialMessages={[
            { id: 'msg-1', role: 'user', content: 'Test message', timestamp: Date.now() },
            { id: 'msg-2', role: 'assistant', content: 'Test response', timestamp: Date.now() }
          ]} />
        </TestWrapper>
      );

      // Click regenerate
      const regenerateButton = screen.getByLabelText('Regenerate response');
      await user.click(regenerateButton);

      // Should show loading state
      expect(regenerateButton).toBeDisabled();
      expect(screen.getByTestId('streaming-indicator')).toBeInTheDocument();

      // Wait for timeout (should be handled by client-side timeout)
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      }, { timeout: 10000 });

      // Should show timeout error
      expect(screen.getByText(/connection timed out/i)).toBeInTheDocument();

      // Button should be re-enabled
      expect(regenerateButton).toBeEnabled();

      // Original message should still be there (no rollback needed for regeneration)
      expect(screen.getByText('Test response')).toBeInTheDocument();
    });

    test('handles network error with retry mechanism', async () => {
      const user = userEvent.setup({ delay: null });
      let requestCount = 0;

      server.use(
        rest.post('/api/chat/regenerate', (req, res, ctx) => {
          requestCount++;
          if (requestCount === 1) {
            return res.networkError('Network failed');
          }
          return res(ctx.json({ success: true, messageId: 'recovered-msg-id' }));
        })
      );

      render(
        <TestWrapper>
          <ChatContainer initialMessages={[
            { id: 'msg-1', role: 'user', content: 'Test message', timestamp: Date.now() },
            { id: 'msg-2', role: 'assistant', content: 'Test response', timestamp: Date.now() }
          ]} />
        </TestWrapper>
      );

      // Click regenerate
      const regenerateButton = screen.getByLabelText('Regenerate response');
      await user.click(regenerateButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      // Should show retry button
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();

      // Click retry
      await user.click(retryButton);

      // Should succeed on retry
      await waitFor(() => {
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
      });

      expect(requestCount).toBe(2);
    });

    test('handles malformed server response gracefully', async () => {
      const user = userEvent.setup({ delay: null });

      server.use(
        rest.post('/api/chat/regenerate', (req, res, ctx) => {
          return res(ctx.status(200), ctx.text('invalid json'));
        })
      );

      render(
        <TestWrapper>
          <ChatContainer initialMessages={[
            { id: 'msg-1', role: 'user', content: 'Test message', timestamp: Date.now() },
            { id: 'msg-2', role: 'assistant', content: 'Test response', timestamp: Date.now() }
          ]} />
        </TestWrapper>
      );

      const regenerateButton = screen.getByLabelText('Regenerate response');
      await user.click(regenerateButton);

      // Should handle JSON parse error
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      expect(screen.getByText(/invalid server response/i)).toBeInTheDocument();
    });

    test('handles partial SSE stream interruption', async () => {
      const user = userEvent.setup({ delay: null });

      server.use(
        rest.post('/api/chat/regenerate', (req, res, ctx) => {
          // Simulate SSE stream that gets cut off
          return res(
            ctx.status(200),
            ctx.set('Content-Type', 'text/event-stream'),
            ctx.text('data: {"type": "thought", "content": "Starting..."}\n\ndata: [INCOMPLETE')
          );
        })
      );

      render(
        <TestWrapper>
          <ChatContainer initialMessages={[
            { id: 'msg-1', role: 'user', content: 'Test message', timestamp: Date.now() },
            { id: 'msg-2', role: 'assistant', content: 'Test response', timestamp: Date.now() }
          ]} />
        </TestWrapper>
      );

      const regenerateButton = screen.getByLabelText('Regenerate response');
      await user.click(regenerateButton);

      // Should show thought process initially
      await waitFor(() => {
        expect(screen.getByText('Starting...')).toBeInTheDocument();
      });

      // Should detect stream interruption and show error
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      }, { timeout: 10000 });

      expect(screen.getByText(/connection was interrupted/i)).toBeInTheDocument();
    });
  });

  describe('Edit Operation Rollback', () => {
    test('rolls back edit on server error', async () => {
      const user = userEvent.setup({ delay: null });

      server.use(
        rest.put('/api/chat/messages/:messageId/edit', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({
            error: { message: 'Failed to save edit', code: 'EDIT_FAILED' }
          }));
        })
      );

      render(
        <TestWrapper>
          <ChatContainer initialMessages={[
            { id: 'msg-1', role: 'user', content: 'Original message', timestamp: Date.now() },
            { id: 'msg-2', role: 'assistant', content: 'Test response', timestamp: Date.now() }
          ]} />
        </TestWrapper>
      );

      const originalMessage = 'Original message';
      const editedMessage = 'Edited message';

      // Start editing user message
      const editButton = screen.getByLabelText('Edit message');
      await user.click(editButton);

      // Edit the message
      const editInput = screen.getByTestId('edit-input');
      await user.clear(editInput);
      await user.type(editInput, editedMessage);

      // Verify UI shows edited content temporarily
      expect(editInput).toHaveValue(editedMessage);

      // Save (which will fail)
      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      // Should rollback to original content
      await waitFor(() => {
        expect(screen.getByText(originalMessage)).toBeInTheDocument();
      });

      // Should not show edited content
      expect(screen.queryByText(editedMessage)).not.toBeInTheDocument();
    });

    test('handles optimistic update rollback correctly', async () => {
      const user = userEvent.setup({ delay: null });

      let shouldFail = true;
      server.use(
        rest.put('/api/chat/messages/:messageId/edit', (req, res, ctx) => {
          if (shouldFail) {
            return res(ctx.status(409), ctx.json({
              error: { message: 'Edit conflict detected', code: 'EDIT_CONFLICT' }
            }));
          }
          return res(ctx.json({ success: true, message: { id: ctx.params.messageId, content: 'Final content' } }));
        })
      );

      render(
        <TestWrapper>
          <ChatContainer
            initialMessages={[
              { id: 'msg-1', role: 'user', content: 'Original content', timestamp: Date.now() }
            ]}
            optimisticUpdates={true}
          />
        </TestWrapper>
      );

      const editButton = screen.getByLabelText('Edit message');
      await user.click(editButton);

      const editInput = screen.getByTestId('edit-input');
      await user.clear(editInput);
      await user.type(editInput, 'Optimistic content');

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      // Should show optimistic update immediately
      expect(screen.queryByTestId('edit-input')).not.toBeInTheDocument();
      expect(screen.getByText('Optimistic content')).toBeInTheDocument();

      // Should rollback after server error
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Original content')).toBeInTheDocument();
      });

      // Should show conflict resolution UI
      expect(screen.getByText(/edit conflict/i)).toBeInTheDocument();

      // Try again (should succeed)
      shouldFail = false;
      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Final content')).toBeInTheDocument();
      });
    });
  });

  describe('Delete Operation Rollback', () => {
    test('restores deleted messages on server error', async () => {
      const user = userEvent.setup({ delay: null });

      server.use(
        rest.delete('/api/chat/messages/:messageId', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({
            error: { message: 'Delete failed', code: 'DELETE_FAILED' }
          }));
        })
      );

      render(
        <TestWrapper>
          <ChatContainer initialMessages={[
            { id: 'msg-1', role: 'user', content: 'Message to delete', timestamp: Date.now() },
            { id: 'msg-2', role: 'assistant', content: 'Response 1', timestamp: Date.now() },
            { id: 'msg-3', role: 'user', content: 'Follow-up', timestamp: Date.now() },
            { id: 'msg-4', role: 'assistant', content: 'Response 2', timestamp: Date.now() }
          ]} />
        </TestWrapper>
      );

      // Verify initial state
      expect(screen.getByText('Message to delete')).toBeInTheDocument();
      expect(screen.getByText('Response 1')).toBeInTheDocument();
      expect(screen.getByText('Follow-up')).toBeInTheDocument();
      expect(screen.getByText('Response 2')).toBeInTheDocument();

      // Delete the first message
      const deleteButtons = screen.getAllByLabelText('Delete message');
      await user.click(deleteButtons[0]);

      // Confirm deletion
      const confirmButton = screen.getByText('Delete');
      await user.click(confirmButton);

      // Should show optimistic delete (messages disappear)
      await waitFor(() => {
        expect(screen.queryByText('Message to delete')).not.toBeInTheDocument();
      });

      // Should show error and restore messages
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Message to delete')).toBeInTheDocument();
        expect(screen.getByText('Response 1')).toBeInTheDocument();
        expect(screen.getByText('Follow-up')).toBeInTheDocument();
        expect(screen.getByText('Response 2')).toBeInTheDocument();
      });
    });

    test('handles cascade delete rollback properly', async () => {
      const user = userEvent.setup({ delay: null });

      server.use(
        rest.delete('/api/chat/messages/:messageId', (req, res, ctx) => {
          return res(ctx.status(403), ctx.json({
            error: { message: 'Cannot delete message with children', code: 'CASCADE_BLOCKED' }
          }));
        })
      );

      const initialMessages = [
        { id: 'msg-1', role: 'user', content: 'Parent message', timestamp: Date.now() },
        { id: 'msg-2', role: 'assistant', content: 'Child response 1', timestamp: Date.now(), parentId: 'msg-1' },
        { id: 'msg-3', role: 'user', content: 'Child message', timestamp: Date.now(), parentId: 'msg-2' },
        { id: 'msg-4', role: 'assistant', content: 'Child response 2', timestamp: Date.now(), parentId: 'msg-3' }
      ];

      render(
        <TestWrapper>
          <ChatContainer initialMessages={initialMessages} />
        </TestWrapper>
      );

      // Try to delete parent message
      const deleteButton = screen.getAllByLabelText('Delete message')[0];
      await user.click(deleteButton);

      const confirmButton = screen.getByText('Delete');
      await user.click(confirmButton);

      // Should show error without deleting anything
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      expect(screen.getByText(/cannot delete message with children/i)).toBeInTheDocument();

      // All messages should still be present
      expect(screen.getByText('Parent message')).toBeInTheDocument();
      expect(screen.getByText('Child response 1')).toBeInTheDocument();
      expect(screen.getByText('Child message')).toBeInTheDocument();
      expect(screen.getByText('Child response 2')).toBeInTheDocument();
    });
  });

  describe('Feedback Operation Error Handling', () => {
    test('reverts feedback state on server error', async () => {
      const user = userEvent.setup({ delay: null });

      server.use(
        rest.post('/api/chat/feedback', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({
            error: { message: 'Feedback service unavailable', code: 'FEEDBACK_FAILED' }
          }));
        })
      );

      render(
        <TestWrapper>
          <ChatContainer initialMessages={[
            { id: 'msg-1', role: 'assistant', content: 'Test response', timestamp: Date.now() }
          ]} />
        </TestWrapper>
      );

      const upvoteButton = screen.getByLabelText('Upvote');

      // Verify initial state
      expect(upvoteButton).toHaveAttribute('data-active', 'false');

      // Click upvote (should show optimistic update)
      await user.click(upvoteButton);

      // Should show active state immediately
      expect(upvoteButton).toHaveAttribute('data-active', 'true');

      // Should revert after server error
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(upvoteButton).toHaveAttribute('data-active', 'false');
      });
    });

    test('handles feedback conflict resolution', async () => {
      const user = userEvent.setup({ delay: null });

      server.use(
        rest.post('/api/chat/feedback', (req, res, ctx) => {
          return res(ctx.status(409), ctx.json({
            error: {
              message: 'Feedback already exists',
              code: 'FEEDBACK_CONFLICT',
              currentFeedback: 'negative'
            }
          }));
        })
      );

      render(
        <TestWrapper>
          <ChatContainer initialMessages={[
            { id: 'msg-1', role: 'assistant', content: 'Test response', timestamp: Date.now() }
          ]} />
        </TestWrapper>
      );

      const upvoteButton = screen.getByLabelText('Upvote');
      await user.click(upvoteButton);

      // Should show conflict resolution
      await waitFor(() => {
        expect(screen.getByText(/feedback conflict/i)).toBeInTheDocument();
      });

      // Should show current server state
      const downvoteButton = screen.getByLabelText('Downvote');
      expect(downvoteButton).toHaveAttribute('data-active', 'true');
      expect(upvoteButton).toHaveAttribute('data-active', 'false');
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('recovers from multiple consecutive errors', async () => {
      const user = userEvent.setup({ delay: null });
      let errorCount = 0;

      server.use(
        rest.post('/api/chat/regenerate', (req, res, ctx) => {
          errorCount++;
          if (errorCount <= 2) {
            return res(ctx.status(500), ctx.json({
              error: { message: `Error ${errorCount}`, code: 'TEMP_ERROR' }
            }));
          }
          return res(ctx.json({ success: true, messageId: 'success-msg' }));
        })
      );

      render(
        <TestWrapper>
          <ChatContainer initialMessages={[
            { id: 'msg-1', role: 'assistant', content: 'Test response', timestamp: Date.now() }
          ]} />
        </TestWrapper>
      );

      const regenerateButton = screen.getByLabelText('Regenerate response');

      // First attempt - should fail
      await user.click(regenerateButton);
      await waitFor(() => expect(screen.getByTestId('error-message')).toBeInTheDocument());

      // Retry - should fail again
      await user.click(screen.getByText('Retry'));
      await waitFor(() => expect(screen.getByText('Error 2')).toBeInTheDocument());

      // Retry again - should succeed
      await user.click(screen.getByText('Retry'));
      await waitFor(() => expect(screen.queryByTestId('error-message')).not.toBeInTheDocument());

      expect(errorCount).toBe(3);
    });

    test('maintains UI stability during error states', async () => {
      const user = userEvent.setup({ delay: null });

      server.use(
        rest.post('/api/chat/regenerate', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({
            error: { message: 'Server error', code: 'SERVER_ERROR' }
          }));
        })
      );

      render(
        <TestWrapper>
          <ChatContainer initialMessages={[
            { id: 'msg-1', role: 'user', content: 'User message', timestamp: Date.now() },
            { id: 'msg-2', role: 'assistant', content: 'Assistant response', timestamp: Date.now() }
          ]} />
        </TestWrapper>
      );

      // Trigger error
      const regenerateButton = screen.getByLabelText('Regenerate response');
      await user.click(regenerateButton);

      await waitFor(() => expect(screen.getByTestId('error-message')).toBeInTheDocument());

      // UI should remain stable - other actions should still work
      const upvoteButton = screen.getByLabelText('Upvote');
      await user.click(upvoteButton);

      // Feedback should work despite regeneration error
      expect(upvoteButton).toHaveAttribute('data-active', 'true');

      // Messages should still be visible
      expect(screen.getByText('User message')).toBeInTheDocument();
      expect(screen.getByText('Assistant response')).toBeInTheDocument();
    });

    test('handles abort operations during error recovery', async () => {
      const user = userEvent.setup({ delay: null });
      let requestAborted = false;

      server.use(
        rest.post('/api/chat/regenerate', async (req, res, ctx) => {
          // Simulate long-running request that can be aborted
          await new Promise(resolve => {
            setTimeout(() => {
              if (!requestAborted) resolve(undefined);
            }, 5000);
          });

          if (requestAborted) {
            return res(ctx.status(499), ctx.json({
              error: { message: 'Request aborted', code: 'ABORTED' }
            }));
          }

          return res(ctx.json({ success: true, messageId: 'delayed-response' }));
        })
      );

      render(
        <TestWrapper>
          <ChatContainer initialMessages={[
            { id: 'msg-1', role: 'assistant', content: 'Test response', timestamp: Date.now() }
          ]} />
        </TestWrapper>
      );

      const regenerateButton = screen.getByLabelText('Regenerate response');
      await user.click(regenerateButton);

      // Should show loading state
      expect(screen.getByTestId('streaming-indicator')).toBeInTheDocument();

      // Cancel the operation
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      requestAborted = true;

      // Should stop loading and return to normal state
      await waitFor(() => {
        expect(screen.queryByTestId('streaming-indicator')).not.toBeInTheDocument();
      });

      expect(regenerateButton).toBeEnabled();
    });
  });

  describe('Error Boundary Integration', () => {
    test('error boundary catches component errors', async () => {
      const ThrowError = () => {
        throw new Error('Component crash');
      };

      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText('Reload Page')).toBeInTheDocument();

      consoleError.mockRestore();
    });

    test('error boundary provides error recovery', async () => {
      const user = userEvent.setup({ delay: null });

      let shouldThrow = true;
      const ConditionalError = () => {
        if (shouldThrow) {
          throw new Error('Recoverable error');
        }
        return <div>Component recovered</div>;
      };

      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ConditionalError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Simulate recovery
      shouldThrow = false;
      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);

      expect(screen.getByText('Component recovered')).toBeInTheDocument();

      consoleError.mockRestore();
    });
  });
});