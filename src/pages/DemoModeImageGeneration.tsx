import { useState, useEffect, useCallback } from 'react';
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
import { Markdown } from '@/components/ui/markdown';
import { CHAT_SPACING } from '@/utils/spacingConstants';
import type { StructuredReasoning } from '@/types/reasoning';

// Inline image demo component
import { InlineImageDemo } from '@/components/demo/ImageGenerationDemo';

/**
 * DemoModeImageGeneration - AI Image Generation demo (Google Gemini Flash style)
 *
 * Demonstrates AI-powered image generation with:
 * - Natural language prompt processing
 * - Inline image display (no artifact canvas)
 * - Real-time generation progress
 * - Image appears directly in chat message
 */

type DemoPhase =
  | 'idle'
  | 'user-typing'
  | 'thinking'
  | 'reasoning'
  | 'assistant-typing'
  | 'image-generating'
  | 'image-complete'
  | 'ready';

const DEMO_CONFIG = {
  userMessage: 'Create an image of Pikachu on a surfboard wearing a tuxedo',
  assistantMessage: "I've generated an image for you: Pikachu on a surfboard wearing a tuxedo",
  reasoningSteps: [
    'Understanding creative prompt...',
    'Composing visual elements...',
    'Initializing Gemini Flash Image...',
    'Generating artwork...',
  ],
  timing: {
    userTypingDuration: 2000,
    thinkingDelay: 500,
    reasoningInterval: 700,
    assistantTypingDuration: 1400,
    imageGenerationDelay: 400,
  },
};

// Structured reasoning for display
const STRUCTURED_REASONING: StructuredReasoning = {
  steps: [
    {
      phase: 'research',
      title: 'Understanding the request',
      items: ['Subject: Pikachu (iconic Pokémon)', 'Outfit: Formal tuxedo attire', 'Action: Surfing on a surfboard'],
    },
    {
      phase: 'analysis',
      title: 'Composing visual elements',
      items: ['Contrast of formal and casual elements', 'Dynamic surfing pose', 'Playful, whimsical atmosphere'],
    },
    {
      phase: 'solution',
      title: 'Image ready',
      items: ['Generated with Gemini Flash Image', '1024×1024 resolution', 'Completed in ~2 seconds'],
    },
  ],
};

export default function DemoModeImageGeneration() {
  const [phase, setPhase] = useState<DemoPhase>('idle');
  const [visibleUserText, setVisibleUserText] = useState('');
  const [visibleAssistantText, setVisibleAssistantText] = useState('');
  const [currentReasoningStep, setCurrentReasoningStep] = useState('');
  const [showImage, setShowImage] = useState(false);
  const [imageRevealed, setImageRevealed] = useState(false);

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

      // Phase 3: Reasoning steps
      setPhase('reasoning');
      for (let i = 0; i < DEMO_CONFIG.reasoningSteps.length; i++) {
        setCurrentReasoningStep(DEMO_CONFIG.reasoningSteps[i]);
        await new Promise((r) => setTimeout(r, DEMO_CONFIG.timing.reasoningInterval));
      }

      // Phase 4: Assistant typing message
      setPhase('assistant-typing');
      await animateTyping(
        DEMO_CONFIG.assistantMessage,
        setVisibleAssistantText,
        DEMO_CONFIG.timing.assistantTypingDuration
      );

      // Phase 5: Image generation starts
      await new Promise((r) => setTimeout(r, DEMO_CONFIG.timing.imageGenerationDelay));
      setPhase('image-generating');
      setShowImage(true);

      // Wait for image reveal animation to complete (handled by InlineImageDemo)
      // The imageRevealed callback will be triggered when done
    };

    runDemo();
  }, [animateTyping]);

  // Handle image reveal completion
  const handleImageRevealed = useCallback(() => {
    setImageRevealed(true);
    setPhase('ready');
  }, []);

  const showUserMessage = phase !== 'idle';
  const showThinking = phase === 'thinking' || phase === 'reasoning';
  const showAssistantMessage = !['idle', 'user-typing', 'thinking', 'reasoning'].includes(phase);

  return (
    <PageLayout
      shaderOpacityClassName=""
      gradientStyle={{
        background:
          "radial-gradient(125% 125% at 50% 10%, transparent 40%, rgba(30, 41, 59, 0.2) 100%)",
      }}
      enableEntranceAnimation={false}
    >
      <div className="h-screen flex flex-col">
        {/* Header */}
        <header className="border-b px-4 py-3 flex items-center justify-between shrink-0 bg-black/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">Vana</span>
          </div>
          <div className="text-sm text-muted-foreground">Demo Mode - Image Generation</div>
        </header>

        {/* Main content - full width chat, no canvas */}
        <div className="flex-1 min-h-0 flex flex-col px-4 pt-4 pb-4">
          {/* Unified chat card */}
          <div className="relative mx-auto flex flex-1 min-h-0 w-full max-w-4xl rounded-3xl bg-black/50 backdrop-blur-sm shadow-[inset_-2px_0_4px_rgba(255,255,255,0.05)] border border-border/50 flex-col">
            <ChatContainerRoot className="flex flex-1 flex-col min-h-0 overflow-hidden">
              <ChatContainerContent
                className={cn(
                  "w-full",
                  CHAT_SPACING.messageList,
                  CHAT_SPACING.message.gap
                )}
              >
                {/* User message */}
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
                        <div className="group flex flex-col items-end gap-2">
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

                {/* Assistant message container */}
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
                          {/* Vana assistant label */}
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20">
                              <Sparkles className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-sm font-medium text-foreground">Vana</span>
                          </div>

                          {/* Reasoning display */}
                          <ReasoningErrorBoundary>
                            <ReasoningDisplay
                              reasoningStatus={showThinking ? currentReasoningStep : undefined}
                              reasoningSteps={!showThinking ? STRUCTURED_REASONING : undefined}
                              isStreaming={showThinking}
                              artifactRendered={imageRevealed}
                            />
                          </ReasoningErrorBoundary>

                          {/* Message text (intro) */}
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

                          {/* Inline Image - appears directly in chat */}
                          <AnimatePresence>
                            {showImage && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                              >
                                <InlineImageDemo onImageRevealed={handleImageRevealed} />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </MessageComponent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </ChatContainerContent>
            </ChatContainerRoot>

            {/* Input area (disabled in demo) - part of flex layout inside card */}
            <div className="shrink-0 px-4 pb-4 pt-2">
              <div className="mx-auto w-full max-w-3xl">
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
        </div>
      </div>
    </PageLayout>
  );
}
