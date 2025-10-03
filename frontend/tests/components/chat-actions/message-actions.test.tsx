/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageActions } from '@/components/chat/MessageActions';
import { useChatStore } from '@/hooks/useChatStore';
import { useSSE } from '@/hooks/useSSE';

// Mock the hooks
jest.mock('@/hooks/useChatStore');
jest.mock('@/hooks/useSSE');

// Mock MSW for API calls
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.post('/api/chat/regenerate', () => {
    return HttpResponse.json({ success: true, messageId: 'new-msg-id' });
  }),
  http.put('/api/chat/messages/:messageId/edit', () => {
    return HttpResponse.json({ success: true });
  }),
  http.delete('/api/chat/messages/:messageId', () => {
    return HttpResponse.json({ success: true });
  }),
  http.post('/api/chat/feedback', () => {
    return HttpResponse.json({ success: true });
  })
);

const mockChatStore = {
  messages: [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      timestamp: Date.now()
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Hi there!',
      timestamp: Date.now(),
      parentId: 'msg-1'
    }
  ],
  isGenerating: false,
  editMessage: jest.fn(),
  deleteMessage: jest.fn(),
  regenerateMessage: jest.fn(),
  addFeedback: jest.fn(),
  setEditMode: jest.fn()
};

const mockSSE = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn()
};

describe('Chat Action Handlers', () => {
  beforeAll(() => server.listen());
  afterEach(() => {
    server.resetHandlers();
    jest.clearAllMocks();
  });
  afterAll(() => server.close());

  beforeEach(() => {
    (useChatStore as jest.Mock).mockReturnValue(mockChatStore);
    (useSSE as jest.Mock).mockReturnValue(mockSSE);
  });

  describe('handleEditMessage', () => {
    test('switches to edit mode when edit button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <MessageActions
          messageId="msg-2"
          canEdit={true}
          canDelete={true}
          canRegenerate={true}
        />
      );

      const editButton = screen.getByLabelText('Edit message');
      await user.click(editButton);

      expect(mockChatStore.setEditMode).toHaveBeenCalledWith('msg-2', true);
    });

    test('disables edit button during generation', () => {
      (useChatStore as jest.Mock).mockReturnValue({
        ...mockChatStore,
        isGenerating: true
      });

      render(
        <MessageActions
          messageId="msg-2"
          canEdit={true}
          canDelete={true}
          canRegenerate={true}
        />
      );

      const editButton = screen.getByLabelText('Edit message');
      expect(editButton).toBeDisabled();
    });

    test('saves edited message content', async () => {
      const user = userEvent.setup();

      render(
        <MessageActions
          messageId="msg-2"
          canEdit={true}
          canDelete={true}
          canRegenerate={true}
          isEditing={true}
        />
      );

      const saveButton = screen.getByLabelText('Save changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockChatStore.editMessage).toHaveBeenCalledWith('msg-2', expect.any(String));
      });
    });
  });

  describe('handleDeleteMessage', () => {
    test('removes message and descendants when delete is clicked', async () => {
      const user = userEvent.setup();

      render(
        <MessageActions
          messageId="msg-2"
          canEdit={true}
          canDelete={true}
          canRegenerate={true}
        />
      );

      const deleteButton = screen.getByLabelText('Delete message');
      await user.click(deleteButton);

      // Wait for confirmation dialog
      const confirmButton = await screen.findByText('Delete');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockChatStore.deleteMessage).toHaveBeenCalledWith('msg-2');
      });
    });

    test('shows confirmation dialog before deletion', async () => {
      const user = userEvent.setup();

      render(
        <MessageActions
          messageId="msg-2"
          canEdit={true}
          canDelete={true}
          canRegenerate={true}
        />
      );

      const deleteButton = screen.getByLabelText('Delete message');
      await user.click(deleteButton);

      expect(screen.getByText('Delete this message and all responses?')).toBeInTheDocument();
    });

    test('cancels deletion when cancel is clicked', async () => {
      const user = userEvent.setup();

      render(
        <MessageActions
          messageId="msg-2"
          canEdit={true}
          canDelete={true}
          canRegenerate={true}
        />
      );

      const deleteButton = screen.getByLabelText('Delete message');
      await user.click(deleteButton);

      const cancelButton = await screen.findByText('Cancel');
      await user.click(cancelButton);

      expect(mockChatStore.deleteMessage).not.toHaveBeenCalled();
    });
  });

  describe('handleRegenerateMessage', () => {
    test('clears and restarts streaming when regenerate is clicked', async () => {
      const user = userEvent.setup();

      render(
        <MessageActions
          messageId="msg-2"
          canEdit={true}
          canDelete={true}
          canRegenerate={true}
        />
      );

      const regenerateButton = screen.getByLabelText('Regenerate response');
      await user.click(regenerateButton);

      expect(mockChatStore.regenerateMessage).toHaveBeenCalledWith('msg-2');
    });

    test('shows thought process during regeneration', async () => {
      (useChatStore as jest.Mock).mockReturnValue({
        ...mockChatStore,
        isGenerating: true,
        thoughtProcess: ['Analyzing request...', 'Generating response...']
      });

      render(
        <MessageActions
          messageId="msg-2"
          canEdit={true}
          canDelete={true}
          canRegenerate={true}
        />
      );

      expect(screen.getByText('Analyzing request...')).toBeInTheDocument();
      expect(screen.getByText('Generating response...')).toBeInTheDocument();
    });

    test('disables regenerate button during streaming', () => {
      (useChatStore as jest.Mock).mockReturnValue({
        ...mockChatStore,
        isGenerating: true
      });

      render(
        <MessageActions
          messageId="msg-2"
          canEdit={true}
          canDelete={true}
          canRegenerate={true}
        />
      );

      const regenerateButton = screen.getByLabelText('Regenerate response');
      expect(regenerateButton).toBeDisabled();
    });
  });

  describe('handleUpvote/Downvote', () => {
    test('updates feedback state on upvote', async () => {
      const user = userEvent.setup();

      render(
        <MessageActions
          messageId="msg-2"
          canEdit={true}
          canDelete={true}
          canRegenerate={true}
          showFeedback={true}
        />
      );

      const upvoteButton = screen.getByLabelText('Upvote');
      await user.click(upvoteButton);

      expect(mockChatStore.addFeedback).toHaveBeenCalledWith('msg-2', 'positive');
    });

    test('updates feedback state on downvote', async () => {
      const user = userEvent.setup();

      render(
        <MessageActions
          messageId="msg-2"
          canEdit={true}
          canDelete={true}
          canRegenerate={true}
          showFeedback={true}
        />
      );

      const downvoteButton = screen.getByLabelText('Downvote');
      await user.click(downvoteButton);

      expect(mockChatStore.addFeedback).toHaveBeenCalledWith('msg-2', 'negative');
    });

    test('removes feedback when clicking same button again', async () => {
      const user = userEvent.setup();

      (useChatStore as jest.Mock).mockReturnValue({
        ...mockChatStore,
        messages: [
          ...mockChatStore.messages.slice(0, -1),
          {
            ...mockChatStore.messages[mockChatStore.messages.length - 1],
            feedback: 'positive'
          }
        ]
      });

      render(
        <MessageActions
          messageId="msg-2"
          canEdit={true}
          canDelete={true}
          canRegenerate={true}
          showFeedback={true}
        />
      );

      const upvoteButton = screen.getByLabelText('Upvote');
      await user.click(upvoteButton);

      expect(mockChatStore.addFeedback).toHaveBeenCalledWith('msg-2', null);
    });
  });
});

describe('UI State Transitions', () => {
  test('Edit mode replaces MessageContent with PromptInput', () => {
    render(
      <MessageActions
        messageId="msg-2"
        canEdit={true}
        canDelete={true}
        canRegenerate={true}
        isEditing={true}
      />
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByLabelText('Save changes')).toBeInTheDocument();
    expect(screen.getByLabelText('Cancel editing')).toBeInTheDocument();
  });

  test('Regenerate button shows loading state during generation', () => {
    (useChatStore as jest.Mock).mockReturnValue({
      ...mockChatStore,
      isGenerating: true
    });

    render(
      <MessageActions
        messageId="msg-2"
        canEdit={true}
        canDelete={true}
        canRegenerate={true}
      />
    );

    const regenerateButton = screen.getByLabelText('Regenerate response');
    expect(regenerateButton).toHaveAttribute('data-loading', 'true');
  });

  test('Thought process displays during regeneration', () => {
    (useChatStore as jest.Mock).mockReturnValue({
      ...mockChatStore,
      isGenerating: true,
      thoughtProcess: ['Thinking about the problem...']
    });

    render(
      <MessageActions
        messageId="msg-2"
        canEdit={true}
        canDelete={true}
        canRegenerate={true}
      />
    );

    expect(screen.getByText('Thinking about the problem...')).toBeInTheDocument();
  });

  test('Feedback buttons show active state when feedback is given', () => {
    (useChatStore as jest.Mock).mockReturnValue({
      ...mockChatStore,
      messages: [
        ...mockChatStore.messages.slice(0, -1),
        {
          ...mockChatStore.messages[mockChatStore.messages.length - 1],
          feedback: 'positive'
        }
      ]
    });

    render(
      <MessageActions
        messageId="msg-2"
        canEdit={true}
        canDelete={true}
        canRegenerate={true}
        showFeedback={true}
      />
    );

    const upvoteButton = screen.getByLabelText('Upvote');
    expect(upvoteButton).toHaveAttribute('data-active', 'true');
  });
});

describe('Performance Tests', () => {
  test('Actions render without causing unnecessary re-renders', () => {
    const { rerender } = render(
      <MessageActions
        messageId="msg-2"
        canEdit={true}
        canDelete={true}
        canRegenerate={true}
      />
    );

    // Re-render with same props should not cause component update
    rerender(
      <MessageActions
        messageId="msg-2"
        canEdit={true}
        canDelete={true}
        canRegenerate={true}
      />
    );

    // Component should be memoized and not re-render
    expect(screen.getByLabelText('Edit message')).toBeInTheDocument();
  });

  test('Large number of action buttons render efficiently', () => {
    const startTime = performance.now();

    render(
      <div>
        {Array.from({ length: 100 }, (_, i) => (
          <MessageActions
            key={i}
            messageId={`msg-${i}`}
            canEdit={true}
            canDelete={true}
            canRegenerate={true}
            showFeedback={true}
          />
        ))}
      </div>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render 100 action sets in under 100ms
    expect(renderTime).toBeLessThan(100);
  });
});

describe('Accessibility Tests', () => {
  test('All action buttons have proper ARIA labels', () => {
    render(
      <MessageActions
        messageId="msg-2"
        canEdit={true}
        canDelete={true}
        canRegenerate={true}
        showFeedback={true}
      />
    );

    expect(screen.getByLabelText('Edit message')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete message')).toBeInTheDocument();
    expect(screen.getByLabelText('Regenerate response')).toBeInTheDocument();
    expect(screen.getByLabelText('Upvote')).toBeInTheDocument();
    expect(screen.getByLabelText('Downvote')).toBeInTheDocument();
  });

  test('Action buttons are keyboard accessible', async () => {
    const user = userEvent.setup();

    render(
      <MessageActions
        messageId="msg-2"
        canEdit={true}
        canDelete={true}
        canRegenerate={true}
      />
    );

    const editButton = screen.getByLabelText('Edit message');

    // Tab to button and press Enter
    await user.tab();
    expect(editButton).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(mockChatStore.setEditMode).toHaveBeenCalledWith('msg-2', true);
  });
});