/**
 * useStreamingStatus Hook
 *
 * Resolves current streaming status with 5-level priority system:
 * P1: Semantic status (from LLM reasoning)
 * P2: Tool execution status (always available during tool use)
 * P3: Parsed reasoning text (extract from raw text)
 * P4: Phase-based status (state machine)
 * P5: Time-based progression (fallback with UX)
 *
 * Guarantees that status NEVER shows static "Thinking..." for more than 3 seconds.
 *
 * @see /docs/STATUS_TICKER_DESIGN.md
 */

import { useMemo } from 'react';
import type { ToolExecution } from '@/hooks/useChatMessages';
import {
  type StatusSource,
  parseReasoningTextForStatus,
  getToolExecutionStatus,
  determinePhase,
  getPhaseStatus,
  getTimeBasedStatus,
  isStatusMeaningful,
} from '@/utils/streamingStatus';

export interface UseStreamingStatusProps {
  /** Semantic status from LLM reasoning (P1) */
  reasoningStatus?: string | null;

  /** Tool execution state (P2) */
  toolExecution?: ToolExecution | null;

  /** Raw reasoning text being streamed (P3) */
  streamingReasoningText?: string | null;

  /** Current token count for phase detection */
  tokenCount: number;

  /** Whether artifact tags detected in response */
  artifactDetected: boolean;

  /** Whether artifact closing tag detected */
  artifactClosed: boolean;

  /** Elapsed time in seconds */
  elapsedSeconds: number;

  /** Whether currently streaming */
  isStreaming: boolean;
}

export interface StreamingStatusResult {
  /** Current status message to display */
  status: string;

  /** Source of the status (for debugging/analytics) */
  source: StatusSource;

  /** Whether status is from a fallback (time/phase) */
  isFallback: boolean;
}

/**
 * Hook for resolving streaming status with 5-level priority system
 *
 * @param props - Status resolution context
 * @returns Current status, source, and fallback flag
 *
 * @example
 * const statusData = useStreamingStatus({
 *   reasoningStatus: "Analyzing the question",
 *   toolExecution: null,
 *   streamingReasoningText: null,
 *   tokenCount: 25,
 *   artifactDetected: false,
 *   artifactClosed: false,
 *   elapsedSeconds: 2,
 *   isStreaming: true,
 * });
 * // { status: "Analyzing the question", source: "semantic", isFallback: false }
 *
 * @example
 * // After 5 seconds with no semantic/tool/reasoning status
 * const statusData = useStreamingStatus({
 *   reasoningStatus: null,
 *   toolExecution: null,
 *   streamingReasoningText: null,
 *   tokenCount: 10,
 *   artifactDetected: false,
 *   artifactClosed: false,
 *   elapsedSeconds: 5,
 *   isStreaming: true,
 * });
 * // { status: "Still working on your request...", source: "time", isFallback: true }
 */
export function useStreamingStatus(
  props: UseStreamingStatusProps
): StreamingStatusResult {
  const {
    reasoningStatus,
    toolExecution,
    streamingReasoningText,
    tokenCount,
    artifactDetected,
    artifactClosed,
    elapsedSeconds,
    isStreaming,
  } = props;

  return useMemo(() => {
    // PRIORITY 1: Semantic status from LLM reasoning
    // This is the most context-aware, human-readable status
    if (isStatusMeaningful(reasoningStatus)) {
      return {
        status: reasoningStatus as string,
        source: 'semantic' as const,
        isFallback: false,
      };
    }

    // PRIORITY 2: Tool execution status
    // Always available and accurate during tool use
    if (toolExecution && isStreaming) {
      const toolStatus = getToolExecutionStatus(toolExecution);
      if (toolStatus) {
        return {
          status: toolStatus,
          source: 'tool' as const,
          isFallback: false,
        };
      }
    }

    // PRIORITY 3: Parse reasoning text
    // Extract meaningful status from raw text
    if (streamingReasoningText && isStreaming) {
      const parsedStatus = parseReasoningTextForStatus(streamingReasoningText);
      if (parsedStatus) {
        return {
          status: parsedStatus,
          source: 'reasoning' as const,
          isFallback: false,
        };
      }
    }

    // PRIORITY 4: Phase-based status (state machine)
    // Guaranteed fallback based on stream progress
    const phase = determinePhase({
      tokenCount,
      toolExecution,
      artifactDetected,
      artifactClosed,
    });
    const phaseStatus = getPhaseStatus(phase);

    // PRIORITY 5: Time-based progression
    // Enhanced UX for long-running streams (3+ seconds)
    if (elapsedSeconds >= 3) {
      const timeBasedStatus = getTimeBasedStatus(elapsedSeconds);
      if (timeBasedStatus) {
        return {
          status: timeBasedStatus,
          source: 'time' as const,
          isFallback: true,
        };
      }
    }

    // Final fallback (should only occur in first 3 seconds with no data)
    return {
      status: phaseStatus || 'Preparing response...',
      source: 'phase' as const,
      isFallback: true,
    };
  }, [
    reasoningStatus,
    toolExecution,
    streamingReasoningText,
    tokenCount,
    artifactDetected,
    artifactClosed,
    elapsedSeconds,
    isStreaming,
  ]);
}

/**
 * Hook variant that returns just the status string (convenience)
 *
 * @param props - Status resolution context
 * @returns Current status message string
 *
 * @example
 * const status = useStreamingStatusText({
 *   reasoningStatus: null,
 *   elapsedSeconds: 5,
 *   isStreaming: true,
 *   // ... other props
 * });
 * // "Still working on your request..."
 */
export function useStreamingStatusText(
  props: UseStreamingStatusProps
): string {
  const result = useStreamingStatus(props);
  return result.status;
}
