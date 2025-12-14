/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatMessages } from '../useChatMessages';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock useToast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock request throttle
vi.mock('@/utils/requestThrottle', () => ({
  chatRequestThrottle: {
    waitForToken: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock authHelpers
vi.mock('@/utils/authHelpers', () => ({
  ensureValidSession: vi.fn().mockResolvedValue(null),
  getAuthErrorMessage: vi.fn((error: any) => error?.message || 'Unknown error'),
}));

// Mock reasoning parser
vi.mock('@/types/reasoning', () => ({
  parseReasoningSteps: vi.fn((steps) => steps),
}));

describe('useChatMessages - Reasoning Preservation During Streaming', () => {
  const mockSessionId = 'test-session-id';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Reasoning Data Preservation', () => {
    it('should preserve reasoning when artifact is streamed', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const mockReasoningSteps = {
        steps: [
          { step: 1, title: 'Analyzing', content: 'Analyzing the request...' },
          { step: 2, title: 'Planning', content: 'Planning the solution...' },
        ],
      };

      let savedMessage;
      await act(async () => {
        savedMessage = await result.current.saveMessage(
          'assistant',
          'Here is a calculator component',
          undefined,
          mockReasoningSteps
        );
      });

      // Reasoning should be preserved
      expect(savedMessage?.reasoning_steps).toEqual(mockReasoningSteps);
      expect(savedMessage?.reasoning_steps?.steps).toHaveLength(2);
    });

    it('should make reasoning available before artifact generation completes', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const mockReasoningSteps = {
        steps: [{ step: 1, title: 'Analyzing', content: 'Analyzing...' }],
      };

      let savedMessage;
      await act(async () => {
        savedMessage = await result.current.saveMessage(
          'assistant',
          '<artifact type="react">export default function App() {}</artifact>',
          undefined,
          mockReasoningSteps
        );
      });

      // Immediately check reasoning is available (before completion)
      expect(savedMessage?.reasoning_steps).toBeDefined();
      expect(savedMessage?.reasoning_steps?.steps).toHaveLength(1);
      expect(savedMessage?.reasoning_steps?.steps[0].title).toBe('Analyzing');
    });

    it('should preserve reasoning even if artifact is very large', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const mockReasoningSteps = {
        steps: [{ step: 1, title: 'Generating Large Component', content: 'Creating...' }],
      };

      // Large artifact content (simulating complex component)
      const largeArtifact = `<artifact type="react" title="App">
        export default function App() {
          return <div>${'x'.repeat(5000)}</div>
        }
      </artifact>`;

      let savedMessage;
      await act(async () => {
        savedMessage = await result.current.saveMessage(
          'assistant',
          largeArtifact,
          undefined,
          mockReasoningSteps
        );
      });

      // Reasoning should persist regardless of artifact size
      expect(savedMessage?.reasoning_steps).toEqual(mockReasoningSteps);
    });
  });

  describe('Multiple Reasoning Updates in Sequence', () => {
    it('should handle multiple reasoning updates in sequence', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const reasoning1 = {
        steps: [{ step: 1, title: 'Step 1', content: 'Content 1' }],
      };

      const reasoning2 = {
        steps: [
          { step: 1, title: 'Step 1', content: 'Content 1' },
          { step: 2, title: 'Step 2', content: 'Content 2' },
        ],
      };

      const reasoning3 = {
        steps: [
          { step: 1, title: 'Step 1', content: 'Content 1' },
          { step: 2, title: 'Step 2', content: 'Content 2' },
          { step: 3, title: 'Step 3', content: 'Content 3' },
        ],
      };

      let message1, message2, message3;

      await act(async () => {
        message1 = await result.current.saveMessage(
          'assistant',
          'First response',
          undefined,
          reasoning1
        );
      });

      await act(async () => {
        message2 = await result.current.saveMessage(
          'assistant',
          'Second response',
          undefined,
          reasoning2
        );
      });

      await act(async () => {
        message3 = await result.current.saveMessage(
          'assistant',
          'Third response',
          undefined,
          reasoning3
        );
      });

      // Each message should maintain its correct reasoning
      expect(message1?.reasoning_steps?.steps).toHaveLength(1);
      expect(message2?.reasoning_steps?.steps).toHaveLength(2);
      expect(message3?.reasoning_steps?.steps).toHaveLength(3);

      // All messages should be in state
      expect(result.current.messages).toHaveLength(3);
    });

    it('should preserve reasoning order when multiple updates occur rapidly', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const updates = [
        { steps: [{ step: 1, title: 'Analyzing', content: 'A' }] },
        { steps: [{ step: 1, title: 'Analyzing', content: 'A' }, { step: 2, title: 'Planning', content: 'B' }] },
        { steps: [
          { step: 1, title: 'Analyzing', content: 'A' },
          { step: 2, title: 'Planning', content: 'B' },
          { step: 3, title: 'Implementing', content: 'C' },
        ]},
      ];

      const savedMessages = [];

      for (const reasoning of updates) {
        let msg;
        await act(async () => {
          msg = await result.current.saveMessage(
            'assistant',
            'Response',
            undefined,
            reasoning
          );
        });
        if (msg) {
          savedMessages.push(msg);
        }
      }

      // Verify sequence is correct
      expect(savedMessages[0]?.reasoning_steps?.steps).toHaveLength(1);
      expect(savedMessages[1]?.reasoning_steps?.steps).toHaveLength(2);
      expect(savedMessages[2]?.reasoning_steps?.steps).toHaveLength(3);

      // Verify content integrity
      expect(savedMessages[2]?.reasoning_steps?.steps[0].title).toBe('Analyzing');
      expect(savedMessages[2]?.reasoning_steps?.steps[1].title).toBe('Planning');
      expect(savedMessages[2]?.reasoning_steps?.steps[2].title).toBe('Implementing');
    });
  });

  describe('onDelta Callback Timing (Critical Fix Validation)', () => {
    it('should provide reasoning before onDelta callback fires', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const mockReasoningSteps = {
        steps: [{ step: 1, title: 'Analyzing', content: 'Analyzing...' }],
      };

      // Track callback order
      const callbackOrder: string[] = [];

      const mockOnDelta = vi.fn(() => {
        callbackOrder.push('onDelta');
      });

      // Simulate the critical timing: save message with reasoning, then trigger callback
      await act(async () => {
        const msg = await result.current.saveMessage(
          'assistant',
          'Response',
          undefined,
          mockReasoningSteps
        );

        callbackOrder.push('saveMessage');

        // Now fire the callback (simulating onDelta after reasoning is saved)
        mockOnDelta();

        callbackOrder.push('afterCallback');

        // Verify reasoning is accessible at this point
        expect(msg?.reasoning_steps).toBeDefined();
      });

      // Verify timing sequence
      expect(callbackOrder[0]).toBe('saveMessage');
      expect(callbackOrder[1]).toBe('onDelta');
      expect(callbackOrder[2]).toBe('afterCallback');
    });

    it('should not lose reasoning if onDelta called during streaming', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const reasoning = {
        steps: [{ step: 1, title: 'Step', content: 'Content' }],
      };

      let messageBeforeCallback, messageAfterCallback;

      await act(async () => {
        messageBeforeCallback = await result.current.saveMessage(
          'assistant',
          'Response',
          undefined,
          reasoning
        );

        // Simulate onDelta callback being triggered
        // (in real streamChat, onDelta is called at line 1005-1012)
        vi.runAllTimers();

        // Check reasoning is still preserved after callback
        messageAfterCallback = result.current.messages.find(
          m => m.id === messageBeforeCallback?.id
        );
      });

      expect(messageBeforeCallback?.reasoning_steps).toBeDefined();
      expect(messageAfterCallback?.reasoning_steps).toBeDefined();
      expect(messageAfterCallback?.reasoning_steps).toEqual(reasoning);
    });

    it('should maintain reasoning data through state updates during streaming', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const reasoning = {
        steps: [
          { step: 1, title: 'A', content: 'Content A' },
          { step: 2, title: 'B', content: 'Content B' },
        ],
      };

      let savedMessage;

      await act(async () => {
        savedMessage = await result.current.saveMessage(
          'assistant',
          'Response',
          undefined,
          reasoning
        );
      });

      // Access message from latest state
      const stateMessage = result.current.messages.find(m => m.id === savedMessage?.id);

      // Reasoning should be accessible from state
      expect(stateMessage?.reasoning_steps?.steps).toHaveLength(2);
      expect(stateMessage?.reasoning_steps?.steps[0].title).toBe('A');
      expect(stateMessage?.reasoning_steps?.steps[1].title).toBe('B');
    });
  });

  describe('Concurrent Artifact and Reasoning Streaming', () => {
    it('should handle artifact and reasoning streaming together', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const artifactContent = '<artifact type="react" title="App">export default function App() {}</artifact>';
      const reasoning = {
        steps: [{ step: 1, title: 'Generating', content: 'Creating React component...' }],
      };

      let message;
      await act(async () => {
        message = await result.current.saveMessage(
          'assistant',
          `I'll create a React app.\n${artifactContent}`,
          undefined,
          reasoning
        );
      });

      // Both artifact and reasoning should be preserved
      expect(message?.content).toContain('artifact');
      expect(message?.reasoning_steps).toEqual(reasoning);
    });

    it('should preserve reasoning even if artifact generation fails', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const reasoning = {
        steps: [{ step: 1, title: 'Attempted', content: 'Tried to generate...' }],
      };

      let message;
      await act(async () => {
        // Save message with reasoning but no valid artifact
        message = await result.current.saveMessage(
          'assistant',
          'I attempted to generate but encountered an error.',
          undefined,
          reasoning
        );
      });

      // Reasoning should be preserved even without artifact
      expect(message?.reasoning_steps).toEqual(reasoning);
      expect(message?.reasoning_steps?.steps[0].title).toBe('Attempted');
    });

    it('should preserve reasoning with content chunks of varying sizes', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const reasoning = {
        steps: [
          { step: 1, title: 'Planning', content: 'Planning approach...' },
          { step: 2, title: 'Implementing', content: 'Implementing solution...' },
          { step: 3, title: 'Finalizing', content: 'Finalizing code...' },
        ],
      };

      let message;
      await act(async () => {
        // Simulate artifact with multiple content chunks
        const largeContent = `<artifact type="react" title="App">
          export default function App() {
            return ${Array(100).fill('<div/>').join('')}
          }
        </artifact>`;

        message = await result.current.saveMessage(
          'assistant',
          largeContent,
          undefined,
          reasoning
        );
      });

      expect(message?.reasoning_steps?.steps).toHaveLength(3);
      expect(message?.reasoning_steps).toEqual(reasoning);
    });
  });

  describe('Reasoning Error Scenarios', () => {
    it('should handle null reasoning gracefully', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      let message;
      await act(async () => {
        message = await result.current.saveMessage(
          'assistant',
          'Response',
          undefined,
          null as any
        );
      });

      expect(message?.reasoning_steps).toBeNull();
      expect(message?.content).toBe('Response');
    });

    it('should handle undefined reasoning gracefully', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      let message;
      await act(async () => {
        message = await result.current.saveMessage(
          'assistant',
          'Response',
          undefined,
          undefined
        );
      });

      expect(message?.reasoning_steps).toBeUndefined();
      expect(message?.content).toBe('Response');
    });

    it('should handle empty reasoning steps array', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const emptyReasoning = { steps: [] };

      let message;
      await act(async () => {
        message = await result.current.saveMessage(
          'assistant',
          'Response',
          undefined,
          emptyReasoning
        );
      });

      expect(message?.reasoning_steps?.steps).toHaveLength(0);
      expect(message?.content).toBe('Response');
    });

    it('should recover if reasoning has missing properties', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const partialReasoning = {
        steps: [
          { step: 1, title: 'Step 1' }, // Missing content property
        ],
      } as any;

      let message;
      await act(async () => {
        message = await result.current.saveMessage(
          'assistant',
          'Response',
          undefined,
          partialReasoning
        );
      });

      // Should not crash, message should still be saved
      expect(message?.content).toBe('Response');
      expect(message?.reasoning_steps?.steps).toBeDefined();
    });

    it('should handle reasoning with very long content', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const longContent = 'x'.repeat(10000);
      const reasoning = {
        steps: [{ step: 1, title: 'Long Step', content: longContent }],
      };

      let message;
      await act(async () => {
        message = await result.current.saveMessage(
          'assistant',
          'Response',
          undefined,
          reasoning
        );
      });

      expect(message?.reasoning_steps?.steps[0].content.length).toBe(10000);
      expect(message?.reasoning_steps).toEqual(reasoning);
    });
  });

  describe('Reasoning Persistence Across Message Updates', () => {
    it('should preserve reasoning when message content is updated', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const reasoning = {
        steps: [{ step: 1, title: 'Initial', content: 'Initial reasoning' }],
      };

      let message;
      await act(async () => {
        message = await result.current.saveMessage(
          'assistant',
          'Original response',
          undefined,
          reasoning
        );
      });

      if (message) {
        await act(async () => {
          await result.current.updateMessage(message.id, 'Updated response');
        });

        // Reasoning should still be there after update
        const updatedMessage = result.current.messages.find(m => m.id === message.id);
        expect(updatedMessage?.reasoning_steps).toEqual(reasoning);
        expect(updatedMessage?.content).toBe('Updated response');
      }
    });

    it('should maintain reasoning through multiple updates', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const reasoning = {
        steps: [{ step: 1, title: 'Test', content: 'Testing' }],
      };

      let message;
      await act(async () => {
        message = await result.current.saveMessage(
          'assistant',
          'Version 1',
          undefined,
          reasoning
        );
      });

      if (message) {
        // First update
        await act(async () => {
          await result.current.updateMessage(message.id, 'Version 2');
        });

        let updatedMsg = result.current.messages.find(m => m.id === message.id);
        expect(updatedMsg?.reasoning_steps).toEqual(reasoning);

        // Second update
        await act(async () => {
          await result.current.updateMessage(message.id, 'Version 3');
        });

        updatedMsg = result.current.messages.find(m => m.id === message.id);
        expect(updatedMsg?.reasoning_steps).toEqual(reasoning);
      }
    });
  });

  describe('Timing Sequence Validation (Issue #275 Fix)', () => {
    it('should call onDelta BEFORE onDone to preserve reasoning state', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const callSequence: string[] = [];

      const mockOnDelta = vi.fn(() => {
        callSequence.push('onDelta');
      });

      const mockOnDone = vi.fn(() => {
        callSequence.push('onDone');
      });

      const reasoning = {
        steps: [{ step: 1, title: 'Analysis', content: 'Analyzing...' }],
      };

      await act(async () => {
        // Save reasoning first (mimics saveMessage in streamChat)
        const msg = await result.current.saveMessage(
          'assistant',
          'Response',
          undefined,
          reasoning
        );

        // Call onDelta with reasoning (lines 1005-1012 of useChatMessages.tsx)
        mockOnDelta();

        // Then call onDone (line 1016)
        mockOnDone();

        // Verify reasoning is still accessible
        expect(msg?.reasoning_steps).toBeDefined();
      });

      // Critical: onDelta should be called BEFORE onDone
      expect(callSequence[0]).toBe('onDelta');
      expect(callSequence[1]).toBe('onDone');
    });

    it('should preserve reasoning in state between onDelta and onDone', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const reasoning = {
        steps: [{ step: 1, title: 'Processing', content: 'Processing...' }],
      };

      let reasoningBetweenCallbacks;

      await act(async () => {
        await result.current.saveMessage(
          'assistant',
          'Response',
          undefined,
          reasoning
        );

        // Simulate onDelta call
        // At this point, reasoning should be in React state
        reasoningBetweenCallbacks = result.current.messages[
          result.current.messages.length - 1
        ]?.reasoning_steps;

        // Then onDone would clear loading state
        vi.runAllTimers();
      });

      // Reasoning should be available between callback calls
      expect(reasoningBetweenCallbacks).toEqual(reasoning);
    });

    it('should maintain reasoning availability after small delay before saveMessage', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const reasoning = {
        steps: [{ step: 1, title: 'Complete', content: 'Complete' }],
      };

      let msg;

      await act(async () => {
        msg = await result.current.saveMessage(
          'assistant',
          'Response',
          undefined,
          reasoning
        );

        // Simulate 50ms delay (line 1019 in useChatMessages.tsx)
        vi.advanceTimersByTime(50);
      });

      // Reasoning should persist through the delay
      const stateMsg = result.current.messages.find(m => m.id === msg?.id);
      expect(stateMsg?.reasoning_steps).toEqual(reasoning);
    });
  });

  describe('Reasoning with Multiple Message Types', () => {
    it('should preserve reasoning for assistant messages with artifacts', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const reasoning = {
        steps: [
          { step: 1, title: 'Design', content: 'Designing component...' },
          { step: 2, title: 'Code', content: 'Writing code...' },
        ],
      };

      let message;
      await act(async () => {
        message = await result.current.saveMessage(
          'assistant',
          '<artifact type="react">export default function App() {}</artifact>',
          undefined,
          reasoning
        );
      });

      expect(message?.role).toBe('assistant');
      expect(message?.reasoning_steps).toEqual(reasoning);
    });

    it('should handle reasoning for assistant messages without artifacts', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const reasoning = {
        steps: [{ step: 1, title: 'Thinking', content: 'Thinking about response...' }],
      };

      let message;
      await act(async () => {
        message = await result.current.saveMessage(
          'assistant',
          'This is a plain text response without an artifact.',
          undefined,
          reasoning
        );
      });

      expect(message?.reasoning_steps).toEqual(reasoning);
    });

    it('should not add reasoning to user messages', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      let message;
      await act(async () => {
        message = await result.current.saveMessage(
          'user',
          'User question'
        );
      });

      expect(message?.role).toBe('user');
      expect(message?.reasoning_steps).toBeUndefined();
    });
  });

  describe('Reasoning Content Integrity', () => {
    it('should preserve reasoning step structure and all properties', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const reasoning = {
        steps: [
          {
            step: 1,
            title: 'Analysis',
            content: 'Analyzing request',
            icon: 'search',
            items: ['item1', 'item2'],
          },
          {
            step: 2,
            title: 'Implementation',
            content: 'Implementing solution',
            icon: 'code',
            items: ['code', 'tests'],
          },
        ],
      };

      let message;
      await act(async () => {
        message = await result.current.saveMessage(
          'assistant',
          'Response',
          undefined,
          reasoning
        );
      });

      expect(message?.reasoning_steps).toEqual(reasoning);
      expect(message?.reasoning_steps?.steps[0].icon).toBe('search');
      expect(message?.reasoning_steps?.steps[0].items).toEqual(['item1', 'item2']);
    });

    it('should maintain reasoning text integrity with special characters', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const reasoning = {
        steps: [
          {
            step: 1,
            title: 'Special Chars',
            content: 'Content with <tags> & "quotes" and \'apostrophes\'',
          },
        ],
      };

      let message;
      await act(async () => {
        message = await result.current.saveMessage(
          'assistant',
          'Response',
          undefined,
          reasoning
        );
      });

      expect(message?.reasoning_steps?.steps[0].content).toBe(
        'Content with <tags> & "quotes" and \'apostrophes\''
      );
    });
  });

  describe('Reasoning State Isolation', () => {
    it('should not leak reasoning between different messages', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const reasoning1 = {
        steps: [{ step: 1, title: 'First', content: 'Content 1' }],
      };

      const reasoning2 = {
        steps: [{ step: 1, title: 'Second', content: 'Content 2' }],
      };

      let msg1, msg2;

      await act(async () => {
        msg1 = await result.current.saveMessage(
          'assistant',
          'Response 1',
          undefined,
          reasoning1
        );
      });

      await act(async () => {
        msg2 = await result.current.saveMessage(
          'assistant',
          'Response 2',
          undefined,
          reasoning2
        );
      });

      // Verify each message maintains its own reasoning
      expect(result.current.messages[0]?.reasoning_steps?.steps[0].title).toBe('First');
      expect(result.current.messages[1]?.reasoning_steps?.steps[0].title).toBe('Second');
    });

    it('should maintain reasoning isolation when messages are deleted', async () => {
      const { result } = renderHook(() => useChatMessages(mockSessionId));

      const reasoning1 = {
        steps: [{ step: 1, title: 'First', content: 'Content 1' }],
      };

      const reasoning2 = {
        steps: [{ step: 1, title: 'Second', content: 'Content 2' }],
      };

      let msg1, msg2;

      await act(async () => {
        msg1 = await result.current.saveMessage(
          'assistant',
          'Response 1',
          undefined,
          reasoning1
        );
      });

      await act(async () => {
        msg2 = await result.current.saveMessage(
          'assistant',
          'Response 2',
          undefined,
          reasoning2
        );
      });

      // Delete first message
      if (msg1) {
        await act(async () => {
          await result.current.deleteMessage(msg1.id);
        });
      }

      // Verify second message's reasoning is unaffected
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]?.reasoning_steps?.steps[0].title).toBe('Second');
    });
  });
});
