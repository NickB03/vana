import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// Layout and real components
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import {
  ChatContainerContent,
  ChatContainerRoot,
} from '@/components/ui/chat-container';
import { Message as MessageComponent } from '@/components/prompt-kit/message';
import { ReasoningDisplay } from '@/components/ReasoningDisplay';
import { ReasoningErrorBoundary } from '@/components/ReasoningErrorBoundary';
import { ArtifactCard } from '@/components/ArtifactCard';
import { ArtifactContainer, ArtifactData } from '@/components/ArtifactContainer';
import { Markdown } from '@/components/ui/markdown';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { CHAT_SPACING } from '@/utils/spacingConstants';
import type { StructuredReasoning } from '@/types/reasoning';

// Pre-built game for instant rendering
import { FroggerGame } from '@/components/demo/FroggerGame';

/**
 * DemoMode - Full app simulation for screen recording
 *
 * Uses ACTUAL Vana components to perfectly match the real app:
 * - PageLayout with shader background
 * - ResizablePanelGroup for canvas panel
 * - Real ReasoningDisplay with timer and shimmer
 * - Real ArtifactCard with hover effects
 * - Real message styling (user pill, assistant markdown)
 *
 * NO LLM calls - all content is pre-defined for instant playback.
 */

type DemoPhase =
  | 'idle'
  | 'user-typing'
  | 'thinking'
  | 'reasoning'
  | 'assistant-typing'
  | 'artifact-appear'
  | 'canvas-opening'
  | 'game-playing'
  | 'game-won'
  | 'ready';

const DEMO_CONFIG = {
  userMessage: 'Create a playable Frogger game',
  assistantMessage: "Here's your playable Frogger game.",
  reasoningSteps: [
    'Analyzing game requirements...',
    'Designing game mechanics and physics...',
    'Setting up collision detection system...',
    'Implementing keyboard controls...',
    'Creating visual elements and animations...',
  ],
  timing: {
    userTypingDuration: 2200,    // Slower, more natural typing
    thinkingDelay: 600,          // Brief pause before thinking
    reasoningInterval: 1200,     // Slower reasoning step transitions
    assistantTypingDuration: 1400, // Shorter message = faster typing
    artifactDelay: 800,          // Longer pause before artifact
    canvasOpenDelay: 1200,       // Smoother canvas open delay
    gamePlayStartDelay: 1500,    // More time before auto-play starts
    gameWonHoldTime: 2500,       // Longer hold on win screen
  },
};

// Pre-built artifact data for the Frogger game
const FROGGER_ARTIFACT: ArtifactData = {
  id: 'demo-frogger-artifact',
  type: 'react',
  title: 'Frogger Game',
  content: '// Pre-built component - see FroggerGame.tsx',
  language: 'tsx',
};

// Properly typed reasoning steps that match StructuredReasoning schema
const STRUCTURED_REASONING: StructuredReasoning = {
  steps: [
    {
      phase: 'research',
      title: 'Analyzing game requirements',
      items: ['Understanding classic Frogger mechanics', 'Identifying collision detection needs'],
    },
    {
      phase: 'analysis',
      title: 'Designing game mechanics',
      items: ['Lane-based movement system', 'Log and car motion patterns'],
    },
    {
      phase: 'solution',
      title: 'Artifact complete',
      items: ['React state management for game loop', 'Keyboard controls with WASD and arrows', 'Visual rendering with Tailwind CSS'],
    },
  ],
};

// Custom artifact renderer that uses pre-built FroggerGame
function DemoArtifactRenderer({
  autoPlay = false,
  onAutoPlayComplete
}: {
  autoPlay?: boolean;
  onAutoPlayComplete?: () => void;
}) {
  return (
    <div className="h-full w-full overflow-auto">
      <FroggerGame autoPlay={autoPlay} onAutoPlayComplete={onAutoPlayComplete} />
    </div>
  );
}

export default function DemoMode() {
  const [phase, setPhase] = useState<DemoPhase>('idle');
  const [visibleUserText, setVisibleUserText] = useState('');
  const [visibleAssistantText, setVisibleAssistantText] = useState('');
  const [currentReasoningStep, setCurrentReasoningStep] = useState('');
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [currentArtifact, setCurrentArtifact] = useState<ArtifactData | null>(null);

  // Typing animation helper
  const animateTyping = useCallback(
    (text: string, setter: (s: string) => void, duration: number): Promise<void> => {
      return new Promise((resolve) => {
        const chars = text.split('');
        const charDelay = duration / chars.length;
        let index = 0;

        const interval = setInterval(() => {
          if (index < chars.length) {
            setter(text.slice(0, index + 1));
            index++;
          } else {
            clearInterval(interval);
            resolve();
          }
        }, charDelay);
      });
    },
    []
  );

  // Start demo on mount
  useEffect(() => {
    const runDemo = async () => {
      // Small initial delay
      await new Promise((r) => setTimeout(r, 800));

      // Phase 1: User typing
      setPhase('user-typing');
      await animateTyping(
        DEMO_CONFIG.userMessage,
        setVisibleUserText,
        DEMO_CONFIG.timing.userTypingDuration
      );

      // Phase 2: Thinking starts
      await new Promise((r) => setTimeout(r, DEMO_CONFIG.timing.thinkingDelay));
      setPhase('thinking');
      setCurrentReasoningStep(DEMO_CONFIG.reasoningSteps[0]);

      // Phase 3: Reasoning steps (animate through each one)
      setPhase('reasoning');
      for (let i = 0; i < DEMO_CONFIG.reasoningSteps.length; i++) {
        setCurrentReasoningStep(DEMO_CONFIG.reasoningSteps[i]);
        await new Promise((r) => setTimeout(r, DEMO_CONFIG.timing.reasoningInterval));
      }

      // Phase 4: Assistant typing
      setPhase('assistant-typing');
      await animateTyping(
        DEMO_CONFIG.assistantMessage,
        setVisibleAssistantText,
        DEMO_CONFIG.timing.assistantTypingDuration
      );

      // Phase 5: Artifact appears
      await new Promise((r) => setTimeout(r, DEMO_CONFIG.timing.artifactDelay));
      setCurrentArtifact(FROGGER_ARTIFACT);
      setPhase('artifact-appear');

      // Phase 6: Canvas opens automatically with animation
      await new Promise((r) => setTimeout(r, DEMO_CONFIG.timing.canvasOpenDelay));
      setPhase('canvas-opening');
      setIsCanvasOpen(true);

      // Phase 7: Game auto-play starts
      await new Promise((r) => setTimeout(r, DEMO_CONFIG.timing.gamePlayStartDelay));
      setPhase('game-playing');

      // Auto-play will trigger 'game-won' phase via callback
      // Phase 8 and 9 handled by onGameComplete callback
    };

    runDemo();
  }, [animateTyping]);

  // Callback when auto-play game completes
  const handleGameComplete = useCallback(() => {
    setPhase('game-won');
    // Hold on win screen, then transition to ready
    setTimeout(() => {
      setPhase('ready');
    }, DEMO_CONFIG.timing.gameWonHoldTime);
  }, []);

  const showUserMessage = phase !== 'idle';
  const showThinking = phase === 'thinking' || phase === 'reasoning';
  const showAssistantMessage = [
    'assistant-typing',
    'artifact-appear',
    'canvas-opening',
    'game-playing',
    'game-won',
    'ready'
  ].includes(phase);
  const showArtifact = phase !== 'idle' && phase !== 'user-typing' && phase !== 'thinking' && phase !== 'reasoning' && currentArtifact;

  const handleOpenCanvas = useCallback(() => {
    setIsCanvasOpen(true);
  }, []);

  const handleCloseCanvas = useCallback(() => {
    setIsCanvasOpen(false);
  }, []);

  // Render chat content
  const renderChatContent = () => (
    <div className="flex flex-1 flex-col min-h-0 px-4 pt-4 pb-4">
      {/* Unified chat card with transparent background */}
      <div className="relative mx-auto flex flex-1 min-h-0 w-full max-w-5xl rounded-3xl bg-black/50 backdrop-blur-sm shadow-[inset_-2px_0_4px_rgba(255,255,255,0.05)] border border-border/50">
        <ChatContainerRoot className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <ChatContainerContent
            className={cn(
              "w-full",
              CHAT_SPACING.messageList,
              CHAT_SPACING.message.gap
            )}
          >
            {/* User message - right-justified */}
            <AnimatePresence>
              {showUserMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <MessageComponent
                    className={cn(
                      "chat-message mx-auto flex w-full max-w-3xl flex-col items-end",
                      CHAT_SPACING.message.container
                    )}
                  >
                    <div className="group flex items-start gap-2">
                      {/* User pill */}
                      <div className="flex items-start gap-2.5 rounded-2xl bg-muted/60 px-3 py-2.5">
                        <div className="text-[15px] text-foreground leading-relaxed">
                          {visibleUserText}
                          {phase === 'user-typing' && (
                            <span className="inline-block w-0.5 h-4 bg-foreground ml-0.5 animate-pulse" />
                          )}
                        </div>
                      </div>
                    </div>
                  </MessageComponent>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Assistant message container - single element that persists from thinking through ready
                This prevents the "jump" when transitioning from thinking to assistant-typing */}
            <AnimatePresence>
              {(showThinking || showAssistantMessage) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <MessageComponent
                    className={cn(
                      "mx-auto flex w-full max-w-3xl flex-col items-start",
                      CHAT_SPACING.message.container
                    )}
                  >
                    <div className="group flex w-full flex-col gap-2">
                      {/* Vana assistant label with icon */}
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20">
                          <Sparkles className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground">Vana</span>
                      </div>

                      {/* Reasoning pill - streaming during thinking, collapsed after */}
                      <ReasoningErrorBoundary>
                        <ReasoningDisplay
                          reasoningStatus={showThinking ? currentReasoningStep : undefined}
                          reasoningSteps={!showThinking ? STRUCTURED_REASONING : undefined}
                          isStreaming={showThinking}
                          artifactRendered={showArtifact ? true : false}
                        />
                      </ReasoningErrorBoundary>

                      {/* Message text - only shows after thinking phase */}
                      {showAssistantMessage && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className="flex-1"
                        >
                          <Markdown className="prose prose-sm prose-p:mb-3 prose-p:leading-relaxed max-w-none dark:prose-invert text-foreground text-[15px] leading-relaxed">
                            {visibleAssistantText}
                          </Markdown>
                        </motion.div>
                      )}
                    </div>
                  </MessageComponent>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Artifact Card - using REAL component */}
            <AnimatePresence>
              {showArtifact && currentArtifact && (
                <motion.div
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="mx-auto w-full max-w-3xl"
                >
                  <ArtifactCard
                    artifact={currentArtifact}
                    onOpen={handleOpenCanvas}
                    className="mt-3"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </ChatContainerContent>
        </ChatContainerRoot>

        {/* Input area (disabled in demo) - matches real input styling */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-2 rounded-xl border bg-black/50 backdrop-blur-sm px-4 py-3 opacity-50">
            <input
              type="text"
              placeholder="Ask Vana anything..."
              className="flex-1 bg-transparent outline-none text-sm"
              disabled
            />
            <Button size="sm" disabled>
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout
      shaderOpacityClassName="opacity-30"
      gradientStyle={{
        background:
          "radial-gradient(125% 125% at 50% 10%, transparent 40%, rgba(30, 41, 59, 0.2) 100%)",
      }}
      enableEntranceAnimation={false}
    >
      <div className="h-screen flex flex-col">
        {/* Header - matches Vana header style */}
        <header className="border-b px-4 py-3 flex items-center justify-between shrink-0 bg-black/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">Vana</span>
          </div>
          <div className="text-sm text-muted-foreground">Demo Mode</div>
        </header>

        {/* Main content - ResizablePanelGroup like real ChatInterface */}
        <div className="flex-1 min-h-0">
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full"
          >
            <ResizablePanel
              id="demo-chat-panel"
              order={1}
              defaultSize={isCanvasOpen && currentArtifact ? 30 : 100}
              minSize={20}
              maxSize={isCanvasOpen && currentArtifact ? 50 : 100}
              className="flex flex-col transition-all duration-500"
            >
              {renderChatContent()}
            </ResizablePanel>

            <ResizableHandle
              withHandle
              className={`${!isCanvasOpen || !currentArtifact ? 'hidden' : ''}`}
            />

            <ResizablePanel
              id="demo-canvas-panel"
              order={2}
              defaultSize={isCanvasOpen && currentArtifact ? 70 : 0}
              minSize={isCanvasOpen && currentArtifact ? 50 : 0}
              className={cn(
                "flex flex-col overflow-hidden transition-all duration-500",
                !isCanvasOpen || !currentArtifact ? 'hidden' : ''
              )}
            >
              <AnimatePresence>
                {currentArtifact && isCanvasOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full flex flex-col bg-card"
                  >
                    {/* Custom artifact header since we're using pre-built game */}
                    <div className="border-b px-4 py-2 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="rounded-md bg-primary/10 p-1.5">
                          <Sparkles className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium">Frogger Game</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCloseCanvas}
                      >
                        Close
                      </Button>
                    </div>
                    {/* Pre-built game renders instantly */}
                    <DemoArtifactRenderer
                      autoPlay={phase === 'game-playing'}
                      onAutoPlayComplete={handleGameComplete}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </PageLayout>
  );
}
