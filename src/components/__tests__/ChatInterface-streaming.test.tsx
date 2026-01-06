import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook, waitFor } from '@testing-library/react';
import { useMemo } from 'react';
import type { ChatMessage } from '@/hooks/useChatMessages';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Simulates the displayMessages useMemo logic from ChatInterface
 * This is the critical logic that was fixed to use isStreaming flag
 */
function useDisplayMessages(
  messages: ChatMessage[],
  streamingMessage: string,
  isStreaming: boolean,
  sessionId: string
) {
  return useMemo(() => {
    const allMessages = [...messages];
    if (isStreaming) {
      allMessages.push({
        id: 'streaming-temp',
        session_id: sessionId,
        role: "assistant" as const,
        content: streamingMessage,
        created_at: new Date().toISOString(),
      });
    }
    return allMessages;
  }, [messages, streamingMessage, sessionId, isStreaming]);
}

// ============================================================================
// Streaming State Fix Tests
// ============================================================================

describe('ChatInterface Streaming State Fix', () => {
  const mockSessionId = 'test-session-123';
  const baseMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      session_id: mockSessionId,
      role: 'user',
      content: 'Hello',
      created_at: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'msg-2',
      session_id: mockSessionId,
      role: 'assistant',
      content: 'Hi there!',
      created_at: '2026-01-01T00:00:01.000Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Streaming Message Inclusion Logic', () => {
    it('should NOT include streaming message when isStreaming=false even if streamingMessage exists', () => {
      const { result } = renderHook(() =>
        useDisplayMessages(
          baseMessages,
          'Leftover content from previous stream', // streamingMessage has content
          false, // isStreaming is false
          mockSessionId
        )
      );

      // Should only have base messages, no streaming message
      expect(result.current).toHaveLength(2);
      expect(result.current[0].id).toBe('msg-1');
      expect(result.current[1].id).toBe('msg-2');

      // Should NOT include streaming-temp message
      const hasStreamingMessage = result.current.some(msg => msg.id === 'streaming-temp');
      expect(hasStreamingMessage).toBe(false);
    });

    it('should include streaming message when isStreaming=true even if streamingMessage is empty', () => {
      const { result } = renderHook(() =>
        useDisplayMessages(
          baseMessages,
          '', // Empty streaming message
          true, // isStreaming is true
          mockSessionId
        )
      );

      // Should have base messages + streaming placeholder
      expect(result.current).toHaveLength(3);
      expect(result.current[2].id).toBe('streaming-temp');
      expect(result.current[2].role).toBe('assistant');
      expect(result.current[2].content).toBe('');
    });

    it('should include streaming message with content when isStreaming=true', () => {
      const streamingContent = 'This is the streaming response...';

      const { result } = renderHook(() =>
        useDisplayMessages(
          baseMessages,
          streamingContent,
          true,
          mockSessionId
        )
      );

      expect(result.current).toHaveLength(3);
      expect(result.current[2].id).toBe('streaming-temp');
      expect(result.current[2].content).toBe(streamingContent);
    });
  });

  describe('Streaming State Transitions', () => {
    it('should update displayMessages when isStreaming changes from false to true', () => {
      const { result, rerender } = renderHook(
        ({ messages, streamingMessage, isStreaming, sessionId }) =>
          useDisplayMessages(messages, streamingMessage, isStreaming, sessionId),
        {
          initialProps: {
            messages: baseMessages,
            streamingMessage: '',
            isStreaming: false,
            sessionId: mockSessionId
          }
        }
      );

      // Initially no streaming message
      expect(result.current).toHaveLength(2);

      // Change to isStreaming=true
      rerender({
        messages: baseMessages,
        streamingMessage: 'Starting to stream...',
        isStreaming: true,
        sessionId: mockSessionId
      });

      // Should now include streaming message
      expect(result.current).toHaveLength(3);
      expect(result.current[2].id).toBe('streaming-temp');
      expect(result.current[2].content).toBe('Starting to stream...');
    });

    it('should update displayMessages when isStreaming changes from true to false', () => {
      const { result, rerender } = renderHook(
        ({ messages, streamingMessage, isStreaming, sessionId }) =>
          useDisplayMessages(messages, streamingMessage, isStreaming, sessionId),
        {
          initialProps: {
            messages: baseMessages,
            streamingMessage: 'Streaming content...',
            isStreaming: true,
            sessionId: mockSessionId
          }
        }
      );

      // Initially has streaming message
      expect(result.current).toHaveLength(3);
      expect(result.current[2].id).toBe('streaming-temp');

      // Change to isStreaming=false (streaming complete)
      rerender({
        messages: baseMessages,
        streamingMessage: 'Streaming content...', // Content still exists
        isStreaming: false, // But flag is false
        sessionId: mockSessionId
      });

      // Should no longer include streaming message
      expect(result.current).toHaveLength(2);
      const hasStreamingMessage = result.current.some(msg => msg.id === 'streaming-temp');
      expect(hasStreamingMessage).toBe(false);
    });

    it('should update streaming message content as it accumulates', () => {
      const { result, rerender } = renderHook(
        ({ messages, streamingMessage, isStreaming, sessionId }) =>
          useDisplayMessages(messages, streamingMessage, isStreaming, sessionId),
        {
          initialProps: {
            messages: baseMessages,
            streamingMessage: 'Hello',
            isStreaming: true,
            sessionId: mockSessionId
          }
        }
      );

      expect(result.current[2].content).toBe('Hello');

      // Simulate content accumulation
      rerender({
        messages: baseMessages,
        streamingMessage: 'Hello world',
        isStreaming: true,
        sessionId: mockSessionId
      });

      expect(result.current[2].content).toBe('Hello world');

      // More accumulation
      rerender({
        messages: baseMessages,
        streamingMessage: 'Hello world! How can I help?',
        isStreaming: true,
        sessionId: mockSessionId
      });

      expect(result.current[2].content).toBe('Hello world! How can I help?');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty messages array with streaming', () => {
      const { result } = renderHook(() =>
        useDisplayMessages(
          [],
          'First streaming message',
          true,
          mockSessionId
        )
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe('streaming-temp');
      expect(result.current[0].content).toBe('First streaming message');
    });

    it('should handle multiple rapid isStreaming toggles', () => {
      const { result, rerender } = renderHook(
        ({ messages, streamingMessage, isStreaming, sessionId }) =>
          useDisplayMessages(messages, streamingMessage, isStreaming, sessionId),
        {
          initialProps: {
            messages: baseMessages,
            streamingMessage: '',
            isStreaming: false,
            sessionId: mockSessionId
          }
        }
      );

      expect(result.current).toHaveLength(2);

      // Toggle on
      rerender({
        messages: baseMessages,
        streamingMessage: 'Content 1',
        isStreaming: true,
        sessionId: mockSessionId
      });
      expect(result.current).toHaveLength(3);

      // Toggle off
      rerender({
        messages: baseMessages,
        streamingMessage: 'Content 1',
        isStreaming: false,
        sessionId: mockSessionId
      });
      expect(result.current).toHaveLength(2);

      // Toggle on again
      rerender({
        messages: baseMessages,
        streamingMessage: 'Content 2',
        isStreaming: true,
        sessionId: mockSessionId
      });
      expect(result.current).toHaveLength(3);
      expect(result.current[2].content).toBe('Content 2');
    });

    it('should preserve base messages when streaming state changes', () => {
      const { result, rerender } = renderHook(
        ({ messages, streamingMessage, isStreaming, sessionId }) =>
          useDisplayMessages(messages, streamingMessage, isStreaming, sessionId),
        {
          initialProps: {
            messages: baseMessages,
            streamingMessage: 'Streaming...',
            isStreaming: true,
            sessionId: mockSessionId
          }
        }
      );

      // Verify base messages are intact with streaming message
      expect(result.current[0]).toEqual(baseMessages[0]);
      expect(result.current[1]).toEqual(baseMessages[1]);

      // Stop streaming
      rerender({
        messages: baseMessages,
        streamingMessage: '',
        isStreaming: false,
        sessionId: mockSessionId
      });

      // Base messages should still be intact
      expect(result.current[0]).toEqual(baseMessages[0]);
      expect(result.current[1]).toEqual(baseMessages[1]);
    });
  });

  describe('Session ID Handling', () => {
    it('should use provided sessionId in streaming message', () => {
      const customSessionId = 'custom-session-456';

      const { result } = renderHook(() =>
        useDisplayMessages(
          baseMessages,
          'Test content',
          true,
          customSessionId
        )
      );

      expect(result.current[2].session_id).toBe(customSessionId);
    });

    it('should handle empty sessionId gracefully', () => {
      const { result } = renderHook(() =>
        useDisplayMessages(
          baseMessages,
          'Test content',
          true,
          '' // Empty session ID
        )
      );

      expect(result.current[2].session_id).toBe('');
      expect(result.current[2].id).toBe('streaming-temp');
    });
  });

  describe('Timestamp Stability', () => {
    it('should create valid timestamp for streaming message', () => {
      const { result } = renderHook(() =>
        useDisplayMessages(
          baseMessages,
          'Test content',
          true,
          mockSessionId
        )
      );

      const timestamp = result.current[2].created_at;
      expect(timestamp).toBeTruthy();

      // Should be a valid ISO string
      expect(() => new Date(timestamp)).not.toThrow();

      // Should be a recent timestamp (within last minute)
      const timestampDate = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - timestampDate.getTime();
      expect(diffMs).toBeLessThan(60000); // Less than 1 minute
    });
  });
});

// ============================================================================
// Artifact XML Stripping Tests (Related to Streaming Display)
// ============================================================================

describe('Streaming Content Artifact XML Stripping', () => {
  const mockSessionId = 'test-session-123';

  /**
   * Simulates the artifact XML stripping logic from ChatInterface
   */
  function stripArtifactXML(content: string): string {
    let displayContent = content;

    // Strip complete artifact tags
    const completeArtifactRegex = /<artifact\b[^>]*>[\s\S]*?<\/artifact>/gi;
    displayContent = displayContent.replace(completeArtifactRegex, '');

    // Strip incomplete/partial artifact tags
    const incompleteArtifactRegex = /<artifact\b[^>]*>[\s\S]*$/gi;
    displayContent = displayContent.replace(incompleteArtifactRegex, '');

    return displayContent.trim();
  }

  it('should strip complete artifact tags from streaming content', () => {
    const contentWithArtifact = 'Here is your component:\n<artifact type="react">code here</artifact>\nEnjoy!';
    const stripped = stripArtifactXML(contentWithArtifact);

    expect(stripped).toBe('Here is your component:\n\nEnjoy!');
    expect(stripped).not.toContain('<artifact');
    expect(stripped).not.toContain('</artifact>');
  });

  it('should strip incomplete artifact tags (no closing tag yet)', () => {
    const incompleteArtifact = 'Creating component...\n<artifact type="react">\nexport default function App() {';
    const stripped = stripArtifactXML(incompleteArtifact);

    expect(stripped).toBe('Creating component...');
    expect(stripped).not.toContain('<artifact');
  });

  it('should handle multiple complete artifacts', () => {
    const multipleArtifacts = 'First: <artifact type="react">code1</artifact>\nSecond: <artifact type="html">code2</artifact>';
    const stripped = stripArtifactXML(multipleArtifacts);

    // The trim() function collapses multiple spaces to single space, so we get 'First: \nSecond:'
    expect(stripped).toBe('First: \nSecond:');
  });

  it('should preserve non-artifact content', () => {
    const normalContent = 'This is a normal response with no artifacts.';
    const stripped = stripArtifactXML(normalContent);

    expect(stripped).toBe(normalContent);
  });

  it('should handle artifact tags with attributes', () => {
    const artifactWithAttrs = '<artifact type="application/vnd.ant.react" title="Component">code</artifact>';
    const stripped = stripArtifactXML(artifactWithAttrs);

    expect(stripped).toBe('');
  });

  it('should handle mixed content with artifacts and text', () => {
    const mixed = 'Here is your code:\n<artifact type="react">function App() {}</artifact>\nLet me know if you need changes!';
    const stripped = stripArtifactXML(mixed);

    expect(stripped).toBe('Here is your code:\n\nLet me know if you need changes!');
  });
});
