import { useState, useEffect, useCallback, useRef } from 'react';
import type { DemoDataMVP, DemoPhase, DemoReplayState, DemoTimelineEvent } from '@/data/demos/types';

/**
 * useDemoReplay - Timeline engine for demo animations
 *
 * Executes a sequence of timed events to animate the demo preview.
 * Runs entirely client-side with no network requests.
 *
 * Features:
 * - Typing animation for messages
 * - Reasoning chunk reveal
 * - Artifact slide-in
 * - Automatic looping
 * - Cleanup on unmount
 */
export function useDemoReplay(demo: DemoDataMVP): DemoReplayState {
  const [phase, setPhase] = useState<DemoPhase>('idle');
  const [visibleUserMessage, setVisibleUserMessage] = useState('');
  const [visibleAssistantMessage, setVisibleAssistantMessage] = useState('');
  const [visibleReasoningChunks, setVisibleReasoningChunks] = useState<string[]>([]);
  const [artifactVisible, setArtifactVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Reset state to initial
  const resetState = useCallback(() => {
    setPhase('idle');
    setVisibleUserMessage('');
    setVisibleAssistantMessage('');
    setVisibleReasoningChunks([]);
    setArtifactVisible(false);
    setProgress(0);
  }, []);

  // Typing animation helper
  const animateTyping = useCallback(
    (text: string, setter: (s: string) => void, duration: number) => {
      const chars = text.split('');
      const charDelay = duration / chars.length;

      chars.forEach((_, index) => {
        const timer = setTimeout(() => {
          setter(text.slice(0, index + 1));
        }, charDelay * index);
        timersRef.current.push(timer);
      });
    },
    []
  );

  // Process a timeline event
  const processEvent = useCallback(
    (event: DemoTimelineEvent) => {
      switch (event.type) {
        case 'user-message':
          setPhase('user-typing');
          if (event.duration) {
            animateTyping(demo.userMessage, setVisibleUserMessage, event.duration);
          } else {
            setVisibleUserMessage(demo.userMessage);
          }
          break;

        case 'thinking-start':
          setPhase('thinking');
          break;

        case 'reasoning-chunk':
          setPhase('reasoning');
          if (event.content) {
            setVisibleReasoningChunks((prev) => [...prev, event.content!]);
          }
          break;

        case 'thinking-end':
          // Stay in reasoning phase, just marks end of thinking
          break;

        case 'assistant-message':
          setPhase('assistant-typing');
          if (event.duration) {
            animateTyping(demo.assistantMessage, setVisibleAssistantMessage, event.duration);
          } else {
            setVisibleAssistantMessage(demo.assistantMessage);
          }
          break;

        case 'artifact-appear':
          setPhase('artifact');
          setArtifactVisible(true);
          break;

        case 'hold':
          setPhase('hold');
          break;
      }
    },
    [demo, animateTyping]
  );

  // Update progress bar
  const updateProgress = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const newProgress = Math.min(elapsed / demo.cycleDuration, 1);
    setProgress(newProgress);

    if (newProgress < 1) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [demo.cycleDuration]);

  // Run the demo cycle
  const runCycle = useCallback(() => {
    clearAllTimers();
    resetState();
    startTimeRef.current = Date.now();

    // Schedule all timeline events
    demo.timeline.forEach((event) => {
      const timer = setTimeout(() => processEvent(event), event.at);
      timersRef.current.push(timer);
    });

    // Schedule loop restart
    const loopTimer = setTimeout(() => {
      runCycle();
    }, demo.cycleDuration);
    timersRef.current.push(loopTimer);

    // Start progress tracking
    animationFrameRef.current = requestAnimationFrame(updateProgress);
  }, [demo, clearAllTimers, resetState, processEvent, updateProgress]);

  // Start on mount, cleanup on unmount
  useEffect(() => {
    // Small delay to ensure component is mounted
    const startTimer = setTimeout(runCycle, 100);

    return () => {
      clearTimeout(startTimer);
      clearAllTimers();
    };
  }, [runCycle, clearAllTimers]);

  return {
    phase,
    visibleUserMessage,
    visibleAssistantMessage,
    visibleReasoningChunks,
    artifactVisible,
    progress,
    isComplete: phase === 'hold',
  };
}
