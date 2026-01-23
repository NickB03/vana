/**
 * useStreamingStatus Hook Tests
 *
 * Validates the 5-level priority system for status resolution:
 * P1: Semantic > P2: Tool > P3: Reasoning > P4: Phase > P5: Time
 *
 * Critical requirement: Status NEVER shows static "Thinking..." for > 3 seconds
 */

import { renderHook } from '@testing-library/react';
import { useStreamingStatus, type UseStreamingStatusProps } from '../useStreamingStatus';
import type { ToolExecution } from '@/hooks/useChatMessages';

describe('useStreamingStatus', () => {
  const baseProps: UseStreamingStatusProps = {
    reasoningStatus: null,
    toolExecution: null,
    streamingReasoningText: null,
    tokenCount: 0,
    artifactDetected: false,
    artifactClosed: false,
    elapsedSeconds: 0,
    isStreaming: true,
  };

  describe('Priority Level 1: Semantic Status', () => {
    it('prioritizes semantic status over all other sources', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          reasoningStatus: 'Analyzing the user question',
          toolExecution: { toolName: 'browser.search', timestamp: Date.now() },
          streamingReasoningText: '**Planning the approach**',
          elapsedSeconds: 10, // Would trigger time-based fallback
        })
      );

      expect(result.current.status).toBe('Analyzing the user question');
      expect(result.current.source).toBe('semantic');
      expect(result.current.isFallback).toBe(false);
    });

    it('ignores generic "Thinking..." as semantic status', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          reasoningStatus: 'Thinking...',
          toolExecution: { toolName: 'browser.search', timestamp: Date.now() },
        })
      );

      // Should fall through to tool status (P2), not use "Thinking..."
      expect(result.current.status).not.toBe('Thinking...');
      expect(result.current.status).toBe('Searching the web...');
      expect(result.current.source).toBe('tool');
    });

    it('treats empty or null reasoningStatus as non-meaningful', () => {
      const { result: nullResult } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          reasoningStatus: null,
          tokenCount: 10,
        })
      );

      const { result: emptyResult } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          reasoningStatus: '',
          tokenCount: 10,
        })
      );

      // Both should fall through to phase status
      expect(nullResult.current.source).toBe('phase');
      expect(emptyResult.current.source).toBe('phase');
    });
  });

  describe('Priority Level 2: Tool Execution Status', () => {
    it('uses tool status when no semantic status available', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          reasoningStatus: null,
          toolExecution: { toolName: 'browser.search', timestamp: Date.now() },
        })
      );

      expect(result.current.status).toBe('Searching the web...');
      expect(result.current.source).toBe('tool');
      expect(result.current.isFallback).toBe(false);
    });

    it('shows tool-specific in-progress messages', () => {
      const toolTests: Array<[string, string]> = [
        ['browser.search', 'Searching the web...'],
        ['generate_artifact', 'Generating artifact...'],
        ['generate_image', 'Generating image...'],
      ];

      toolTests.forEach(([toolName, expectedStatus]) => {
        const { result } = renderHook(() =>
          useStreamingStatus({
            ...baseProps,
            toolExecution: { toolName, timestamp: Date.now() },
          })
        );

        expect(result.current.status).toBe(expectedStatus);
      });
    });

    it('shows success status with source count', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          toolExecution: {
            toolName: 'browser.search',
            success: true,
            sourceCount: 5,
            timestamp: Date.now(),
          },
        })
      );

      expect(result.current.status).toBe('Found 5 sources');
      expect(result.current.source).toBe('tool');
    });

    it('handles singular source count correctly', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          toolExecution: {
            toolName: 'browser.search',
            success: true,
            sourceCount: 1,
            timestamp: Date.now(),
          },
        })
      );

      expect(result.current.status).toBe('Found 1 source'); // Not "sources"
    });

    it('shows failure status', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          toolExecution: {
            toolName: 'browser.search',
            success: false,
            timestamp: Date.now(),
          },
        })
      );

      expect(result.current.status).toBe('browser.search failed');
      expect(result.current.source).toBe('tool');
    });

    it('shows generic message for unknown tool', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          toolExecution: {
            toolName: 'unknown_tool',
            timestamp: Date.now(),
          },
        })
      );

      expect(result.current.status).toBe('Using unknown_tool...');
    });

    it('ignores tool status when not streaming', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          isStreaming: false,
          toolExecution: { toolName: 'browser.search', timestamp: Date.now() },
          tokenCount: 10,
        })
      );

      // Should fall through to phase status when not streaming
      expect(result.current.source).toBe('phase');
    });
  });

  describe('Priority Level 3: Reasoning Text Parsing', () => {
    it('extracts markdown bold headers', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          streamingReasoningText: '**Analyzing the Question**\n\nThe user wants...',
        })
      );

      expect(result.current.status).toBe('Analyzing the Question...');
      expect(result.current.source).toBe('reasoning');
      expect(result.current.isFallback).toBe(false);
    });

    it('truncates long headers to 30 characters', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          streamingReasoningText:
            '**This is a very long header that exceeds the maximum length**',
        })
      );

      expect(result.current.status).toBe('This is a very long header ...');
      expect(result.current.status.length).toBeLessThanOrEqual(33); // 30 + "..."
    });

    it('detects action keywords', () => {
      const keywordTests: Array<[string, string]> = [
        ['I will search for information', 'Searching for information...'],
        ['Let me build the component', 'Building implementation...'],
        ['I need to analyze the requirements', 'Analyzing requirements...'],
        ['I will create a solution', 'Creating solution...'],
        ['Time to design the approach', 'Designing approach...'],
      ];

      keywordTests.forEach(([text, expectedStatus]) => {
        const { result } = renderHook(() =>
          useStreamingStatus({
            ...baseProps,
            streamingReasoningText: text,
          })
        );

        expect(result.current.status).toBe(expectedStatus);
        expect(result.current.source).toBe('reasoning');
      });
    });

    it('extracts first sentence as fallback', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          streamingReasoningText: 'Planning the implementation. Then we will code it.',
        })
      );

      expect(result.current.status).toBe('Planning the implementation...');
      expect(result.current.source).toBe('reasoning');
    });

    it('ignores very short or empty reasoning text', () => {
      const { result: shortResult } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          streamingReasoningText: 'Hi',
          tokenCount: 10,
        })
      );

      const { result: emptyResult } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          streamingReasoningText: '',
          tokenCount: 10,
        })
      );

      // Both should fall through to phase status
      expect(shortResult.current.source).toBe('phase');
      expect(emptyResult.current.source).toBe('phase');
    });

    it('ignores reasoning text when not streaming', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          isStreaming: false,
          streamingReasoningText: '**Important Status**',
          tokenCount: 10,
        })
      );

      expect(result.current.source).toBe('phase');
    });
  });

  describe('Priority Level 4: Phase-Based Status', () => {
    it('shows reasoning phase for low token count (< 50)', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          tokenCount: 25,
        })
      );

      expect(result.current.status).toBe('Analyzing your request...');
      expect(result.current.source).toBe('phase');
      expect(result.current.isFallback).toBe(true);
    });

    it('shows generating phase for mid token count (50-150)', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          tokenCount: 100,
          artifactDetected: false,
        })
      );

      expect(result.current.status).toBe('Generating response...');
      expect(result.current.source).toBe('phase');
    });

    it('shows generating phase during artifact generation', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          tokenCount: 200,
          artifactDetected: true,
          artifactClosed: false,
        })
      );

      expect(result.current.status).toBe('Generating response...');
    });

    it('shows finalizing phase after artifact complete', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          tokenCount: 300,
          artifactDetected: true,
          artifactClosed: true,
        })
      );

      expect(result.current.status).toBe('Finalizing response...');
    });

    it('shows finalizing phase for high token count (> 500)', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          tokenCount: 600,
        })
      );

      expect(result.current.status).toBe('Finalizing response...');
    });
  });

  describe('Priority Level 5: Time-Based Progression', () => {
    it('uses phase status for first 3 seconds', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          elapsedSeconds: 2,
          tokenCount: 10,
        })
      );

      expect(result.current.status).toBe('Analyzing your request...');
      expect(result.current.source).toBe('phase');
    });

    it('shows "Still working" after 3 seconds', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          elapsedSeconds: 5,
          tokenCount: 10,
        })
      );

      expect(result.current.status).toBe('Still working on your request...');
      expect(result.current.source).toBe('time');
      expect(result.current.isFallback).toBe(true);
    });

    it('shows "Building detailed response" after 10 seconds', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          elapsedSeconds: 12,
        })
      );

      expect(result.current.status).toBe('Building a detailed response...');
      expect(result.current.source).toBe('time');
    });

    it('shows "Crafting thorough answer" after 20 seconds', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          elapsedSeconds: 22,
        })
      );

      expect(result.current.status).toBe('Crafting a thorough answer...');
      expect(result.current.source).toBe('time');
    });

    it('shows "Taking longer than usual" after 30 seconds', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          elapsedSeconds: 35,
        })
      );

      expect(result.current.status).toBe('This is taking longer than usual...');
      expect(result.current.source).toBe('time');
    });

    it('shows "Almost there" after 45 seconds', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          elapsedSeconds: 50,
        })
      );

      expect(result.current.status).toBe('Still processing... Almost there...');
      expect(result.current.source).toBe('time');
    });
  });

  describe('Critical Requirement: No Static "Thinking..." for > 3 Seconds', () => {
    it('never shows "Thinking..." after 3 seconds', () => {
      // Worst case: no semantic, no tool, no reasoning text
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          reasoningStatus: null,
          toolExecution: null,
          streamingReasoningText: null,
          tokenCount: 5,
          elapsedSeconds: 4,
        })
      );

      // Should show time-based fallback, not "Thinking..."
      expect(result.current.status).not.toBe('Thinking...');
      expect(result.current.status).toBe('Still working on your request...');
      expect(result.current.source).toBe('time');
    });

    it('guarantees status change within 3-second window', () => {
      const { result: atStart, rerender } = renderHook(
        (props: UseStreamingStatusProps) => useStreamingStatus(props),
        { initialProps: { ...baseProps, elapsedSeconds: 0, tokenCount: 5 } }
      );

      const initialStatus = atStart.current.status;

      // Advance to 4 seconds
      rerender({ ...baseProps, elapsedSeconds: 4, tokenCount: 5 });

      const laterStatus = atStart.current.status;

      // Status must have changed
      expect(laterStatus).not.toBe(initialStatus);
      expect(atStart.current.source).toBe('time');
    });
  });

  describe('Priority Chain Integration', () => {
    it('falls through priority chain correctly', () => {
      // Start with all sources null - should use phase
      const { result, rerender } = renderHook(
        (props: UseStreamingStatusProps) => useStreamingStatus(props),
        { initialProps: { ...baseProps, tokenCount: 10, elapsedSeconds: 1 } }
      );

      expect(result.current.source).toBe('phase');

      // Add reasoning text - should switch to reasoning
      rerender({
        ...baseProps,
        streamingReasoningText: '**Analyzing**',
        tokenCount: 10,
        elapsedSeconds: 1,
      });

      expect(result.current.source).toBe('reasoning');

      // Add tool execution - should switch to tool
      rerender({
        ...baseProps,
        streamingReasoningText: '**Analyzing**',
        toolExecution: { toolName: 'browser.search', timestamp: Date.now() },
        tokenCount: 10,
        elapsedSeconds: 1,
      });

      expect(result.current.source).toBe('tool');

      // Add semantic status - should switch to semantic
      rerender({
        ...baseProps,
        reasoningStatus: 'Planning approach',
        streamingReasoningText: '**Analyzing**',
        toolExecution: { toolName: 'browser.search', timestamp: Date.now() },
        tokenCount: 10,
        elapsedSeconds: 1,
      });

      expect(result.current.source).toBe('semantic');
      expect(result.current.status).toBe('Planning approach');
    });

    it('uses time-based fallback when all high-priority sources fail', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          reasoningStatus: 'Thinking...', // Generic, ignored
          toolExecution: null,
          streamingReasoningText: 'Hi', // Too short, ignored
          tokenCount: 10,
          elapsedSeconds: 5,
        })
      );

      // Should skip to time-based fallback
      expect(result.current.source).toBe('time');
      expect(result.current.status).toBe('Still working on your request...');
    });
  });

  describe('Edge Cases', () => {
    it('handles zero elapsed seconds', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          elapsedSeconds: 0,
          tokenCount: 10,
        })
      );

      expect(result.current.source).toBe('phase');
    });

    it('handles negative elapsed seconds (treated as 0)', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          elapsedSeconds: -5,
          tokenCount: 10,
        })
      );

      expect(result.current.source).toBe('phase');
    });

    it('handles extremely high token count', () => {
      const { result } = renderHook(() =>
        useStreamingStatus({
          ...baseProps,
          tokenCount: 10000,
        })
      );

      expect(result.current.status).toBe('Finalizing response...');
    });

    it('returns consistent results for same inputs (memoization)', () => {
      const { result, rerender } = renderHook(
        (props: UseStreamingStatusProps) => useStreamingStatus(props),
        { initialProps: { ...baseProps, tokenCount: 10, elapsedSeconds: 5 } }
      );

      const firstResult = result.current;

      // Re-render with same props
      rerender({ ...baseProps, tokenCount: 10, elapsedSeconds: 5 });

      // Result should be referentially equal (memoized)
      expect(result.current).toEqual(firstResult);
    });

    it('handles missing optional fields gracefully', () => {
      const minimalProps: UseStreamingStatusProps = {
        tokenCount: 10,
        artifactDetected: false,
        artifactClosed: false,
        elapsedSeconds: 2,
        isStreaming: true,
      };

      const { result } = renderHook(() => useStreamingStatus(minimalProps));

      expect(result.current.status).toBeTruthy();
      expect(result.current.source).toBe('phase');
    });
  });

  describe('useStreamingStatusText convenience hook', () => {
    it('returns just the status string', () => {
      const { useStreamingStatusText } = require('../useStreamingStatus');

      const { result } = renderHook(() =>
        useStreamingStatusText({
          ...baseProps,
          reasoningStatus: 'Test status',
        })
      );

      expect(typeof result.current).toBe('string');
      expect(result.current).toBe('Test status');
    });
  });
});
