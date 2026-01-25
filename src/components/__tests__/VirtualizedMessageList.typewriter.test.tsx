import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { VirtualizedMessageList } from '../chat/VirtualizedMessageList';

type Range = {
  startIndex: number;
  endIndex: number;
  overscan: number;
  count: number;
};

let lastRangeExtractor: ((range: Range) => number[]) | null = null;
let lastTypewriterCallback: ((isComplete: boolean) => void) | null = null;

vi.mock('@tanstack/react-virtual', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-virtual')>('@tanstack/react-virtual');
  return {
    ...actual,
    useVirtualizer: vi.fn((options: { rangeExtractor?: (range: Range) => number[] }) => {
      lastRangeExtractor = options.rangeExtractor ?? null;
      return {
        getTotalSize: () => 0,
        getVirtualItems: () => [],
        measureElement: () => undefined,
      };
    }),
  };
});

vi.mock('../chat/ChatMessage', () => ({
  ChatMessage: (props: { message: { id: string; content: string }; onTypewriterComplete?: (isComplete: boolean) => void }) => {
    if (props.onTypewriterComplete) {
      lastTypewriterCallback = props.onTypewriterComplete;
    }
    return <div data-testid={`message-${props.message.id}`}>{props.message.content}</div>;
  },
}));

describe('VirtualizedMessageList typewriter gating', () => {
  beforeEach(() => {
    lastRangeExtractor = null;
    lastTypewriterCallback = null;
  });

  it('renders all items until the typewriter completes after streaming ends', async () => {
    const messages = [
      { id: 'msg-user', role: 'user', content: 'Hi', session_id: 'session-1' },
      { id: 'msg-assistant', role: 'assistant', content: 'Hello world', session_id: 'session-1' },
    ];

    const baseProps = {
      messages,
      isLoading: false,
      lastMessageElapsedTime: undefined,
      onRetry: vi.fn(),
      onCopy: vi.fn(),
      onEdit: vi.fn(),
      onArtifactOpen: vi.fn(),
    };

    const { rerender } = render(
      <VirtualizedMessageList
        {...baseProps}
        isStreaming={true}
        streamProgress={{ stage: 'generating', message: 'Generating...', artifactDetected: false, percentage: 10 }}
        streamingMessageId="msg-assistant"
      />
    );

    const baseRange: Range = { startIndex: 0, endIndex: 0, overscan: 0, count: messages.length };
    expect(lastRangeExtractor).not.toBeNull();
    expect(lastRangeExtractor?.(baseRange)).toEqual([0, 1]);

    rerender(
      <VirtualizedMessageList
        {...baseProps}
        isStreaming={false}
        streamProgress={undefined}
        streamingMessageId={null}
      />
    );

    expect(lastRangeExtractor).not.toBeNull();
    expect(lastRangeExtractor?.(baseRange)).toEqual([0, 1]);
    expect(lastTypewriterCallback).not.toBeNull();

    act(() => {
      lastTypewriterCallback?.(true);
    });

    await waitFor(() => {
      expect(lastRangeExtractor?.(baseRange)).toEqual([0]);
    });
  });
});
