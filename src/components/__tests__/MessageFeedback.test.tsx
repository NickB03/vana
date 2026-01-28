import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MessageFeedback } from '../MessageFeedback';
import * as useMessageFeedbackHook from '@/hooks/useMessageFeedback';

// Mock the hook
vi.mock('@/hooks/useMessageFeedback');

describe('MessageFeedback', () => {
  const mockSubmitFeedback = vi.fn();
  const mockGetFeedbackForMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    vi.mocked(useMessageFeedbackHook.useMessageFeedback).mockReturnValue({
      submitFeedback: mockSubmitFeedback,
      getFeedbackForMessage: mockGetFeedbackForMessage,
      isLoading: false,
      error: null,
    });

    // No existing feedback by default
    mockGetFeedbackForMessage.mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  it('should render thumbs up and thumbs down buttons', () => {
    render(<MessageFeedback messageId="msg-1" sessionId="session-1" />);

    expect(screen.getByLabelText('Helpful response')).toBeInTheDocument();
    expect(screen.getByLabelText('Not helpful')).toBeInTheDocument();
  });

  it('should submit positive feedback immediately when thumbs up clicked', async () => {
    mockSubmitFeedback.mockResolvedValue({
      id: 'feedback-1',
      rating: 'positive',
    });

    render(<MessageFeedback messageId="msg-1" sessionId="session-1" />);

    const thumbsUpButton = screen.getByLabelText('Helpful response');
    fireEvent.click(thumbsUpButton);

    await waitFor(() => {
      expect(mockSubmitFeedback).toHaveBeenCalledWith({
        messageId: 'msg-1',
        sessionId: 'session-1',
        rating: 'positive',
      });
    });

    expect(screen.getByText('Thank you for your feedback!')).toBeInTheDocument();
  });

  it('should show category form when thumbs down clicked', async () => {
    render(<MessageFeedback messageId="msg-1" sessionId="session-1" />);

    const thumbsDownButton = screen.getByLabelText('Not helpful');
    fireEvent.click(thumbsDownButton);

    await waitFor(() => {
      expect(screen.getByText('What was the issue? (optional)')).toBeInTheDocument();
      expect(screen.getByLabelText('Inaccurate')).toBeInTheDocument();
      expect(screen.getByLabelText('Unhelpful')).toBeInTheDocument();
      expect(screen.getByLabelText('Incomplete')).toBeInTheDocument();
      expect(screen.getByLabelText('Off-topic')).toBeInTheDocument();
    });
  });

  it('should submit negative feedback with category and comment', async () => {
    mockSubmitFeedback.mockResolvedValue({
      id: 'feedback-2',
      rating: 'negative',
      category: 'incomplete',
      comment: 'Missing examples',
    });

    render(<MessageFeedback messageId="msg-1" sessionId="session-1" />);

    // Click thumbs down
    const thumbsDownButton = screen.getByLabelText('Not helpful');
    fireEvent.click(thumbsDownButton);

    await waitFor(() => {
      expect(screen.getByLabelText('Incomplete')).toBeInTheDocument();
    });

    // Select category
    const incompleteRadio = screen.getByLabelText('Incomplete');
    fireEvent.click(incompleteRadio);

    // Add comment
    const commentTextarea = screen.getByPlaceholderText('Tell us more about what went wrong...');
    fireEvent.change(commentTextarea, { target: { value: 'Missing examples' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmitFeedback).toHaveBeenCalledWith({
        messageId: 'msg-1',
        sessionId: 'session-1',
        rating: 'negative',
        category: 'incomplete',
        comment: 'Missing examples',
      });
    });
  });

  it('should cancel negative feedback form', async () => {
    render(<MessageFeedback messageId="msg-1" sessionId="session-1" />);

    // Click thumbs down
    const thumbsDownButton = screen.getByLabelText('Not helpful');
    fireEvent.click(thumbsDownButton);

    await waitFor(() => {
      expect(screen.getByText('What was the issue? (optional)')).toBeInTheDocument();
    });

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('What was the issue? (optional)')).not.toBeInTheDocument();
    });
  });

  it('should disable buttons after submission', async () => {
    mockSubmitFeedback.mockResolvedValue({
      id: 'feedback-1',
      rating: 'positive',
    });

    render(<MessageFeedback messageId="msg-1" sessionId="session-1" />);

    const thumbsUpButton = screen.getByLabelText('Helpful response');
    fireEvent.click(thumbsUpButton);

    await waitFor(() => {
      expect(thumbsUpButton).toBeDisabled();
      expect(screen.getByLabelText('Not helpful')).toBeDisabled();
    });
  });

  it('should show loading state during submission', async () => {
    vi.mocked(useMessageFeedbackHook.useMessageFeedback).mockReturnValue({
      submitFeedback: mockSubmitFeedback,
      getFeedbackForMessage: mockGetFeedbackForMessage,
      isLoading: true,
      error: null,
    });

    render(<MessageFeedback messageId="msg-1" sessionId="session-1" />);

    expect(screen.getByText('Submitting...')).toBeInTheDocument();
    expect(screen.getByLabelText('Helpful response')).toBeDisabled();
    expect(screen.getByLabelText('Not helpful')).toBeDisabled();
  });

  it('should show existing feedback on load', async () => {
    mockGetFeedbackForMessage.mockResolvedValue({
      id: 'feedback-1',
      message_id: 'msg-1',
      session_id: 'session-1',
      user_id: 'user-1',
      rating: 'positive',
      category: null,
      comment: null,
      created_at: new Date().toISOString(),
    });

    render(<MessageFeedback messageId="msg-1" sessionId="session-1" />);

    await waitFor(() => {
      expect(screen.getByText('Thank you for your feedback!')).toBeInTheDocument();
      expect(screen.getByLabelText('Helpful response')).toBeDisabled();
    });
  });

  it('should enforce 500 character limit on comment', async () => {
    render(<MessageFeedback messageId="msg-1" sessionId="session-1" />);

    const thumbsDownButton = screen.getByLabelText('Not helpful');
    fireEvent.click(thumbsDownButton);

    await waitFor(() => {
      const commentTextarea = screen.getByPlaceholderText('Tell us more about what went wrong...');
      expect(commentTextarea).toHaveAttribute('maxLength', '500');
    });
  });

  it('should handle submit without category or comment', async () => {
    mockSubmitFeedback.mockResolvedValue({
      id: 'feedback-3',
      rating: 'negative',
      category: null,
      comment: null,
    });

    render(<MessageFeedback messageId="msg-1" sessionId="session-1" />);

    // Click thumbs down
    const thumbsDownButton = screen.getByLabelText('Not helpful');
    fireEvent.click(thumbsDownButton);

    await waitFor(() => {
      expect(screen.getByText('What was the issue? (optional)')).toBeInTheDocument();
    });

    // Submit without selecting anything
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmitFeedback).toHaveBeenCalledWith({
        messageId: 'msg-1',
        sessionId: 'session-1',
        rating: 'negative',
        category: undefined,
        comment: undefined,
      });
    });
  });
});
