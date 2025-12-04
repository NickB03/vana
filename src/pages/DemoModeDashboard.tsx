import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, BarChart3, FileSpreadsheet } from 'lucide-react';
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
import { ArtifactData } from '@/components/ArtifactContainer';
import { Markdown } from '@/components/ui/markdown';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { CHAT_SPACING } from '@/utils/spacingConstants';
import type { StructuredReasoning } from '@/types/reasoning';

// Dashboard demo component
import { DashboardDemo } from '@/components/demo/DashboardDemo';

/**
 * DemoModeDashboard - Dashboard artifact demo
 *
 * Demonstrates building an analytics dashboard with:
 * - Metric cards with animated counters
 * - Bar charts with staggered animations
 * - Progress bars
 * - Transaction table
 */

type DemoPhase =
  | 'idle'
  | 'user-typing'
  | 'thinking'
  | 'reasoning'
  | 'assistant-typing'
  | 'artifact-appear'
  | 'canvas-opening'
  | 'dashboard-revealing'
  | 'ready';

const DEMO_CONFIG = {
  userMessage: 'Turn this into an interactive dashboard',
  fileName: 'Q4_Results.xlsx',
  assistantMessage: "I've created an interactive dashboard from your quarterly results. The data shows strong revenue growth with a 12.5% increase.",
  reasoningSteps: [
    'Parsing Excel spreadsheet...',
    'Extracting quarterly metrics...',
    'Identifying key performance indicators...',
    'Building interactive visualizations...',
  ],
  timing: {
    userTypingDuration: 1800,
    thinkingDelay: 600,
    reasoningInterval: 1000,
    assistantTypingDuration: 2000,
    artifactDelay: 800,
    canvasOpenDelay: 1200,
    dashboardRevealDelay: 500,
  },
};

// Artifact data for the dashboard
const DASHBOARD_ARTIFACT: ArtifactData = {
  id: 'demo-dashboard-artifact',
  type: 'react',
  title: 'Q4 Results Dashboard',
  content: '// Dashboard component with metrics and charts',
  language: 'tsx',
};

// Structured reasoning for display
const STRUCTURED_REASONING: StructuredReasoning = {
  steps: [
    {
      phase: 'research',
      title: 'Parsing spreadsheet data',
      items: ['Reading Q4_Results.xlsx', 'Identifying data columns and metrics'],
    },
    {
      phase: 'analysis',
      title: 'Analyzing quarterly performance',
      items: ['Revenue trends and growth rates', 'User acquisition metrics', 'Conversion analysis'],
    },
    {
      phase: 'solution',
      title: 'Dashboard complete',
      items: ['4 KPI cards with trend indicators', 'Weekly revenue chart', 'Traffic breakdown'],
    },
  ],
};

// Custom artifact renderer for dashboard
function DemoDashboardRenderer() {
  return (
    <div className="h-full w-full overflow-auto">
      <DashboardDemo />
    </div>
  );
}

export default function DemoModeDashboard() {
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

      // Phase 3: Reasoning steps
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
      setCurrentArtifact(DASHBOARD_ARTIFACT);
      setPhase('artifact-appear');

      // Phase 6: Canvas opens automatically
      await new Promise((r) => setTimeout(r, DEMO_CONFIG.timing.canvasOpenDelay));
      setPhase('canvas-opening');
      setIsCanvasOpen(true);

      // Phase 7: Dashboard reveals with animations
      await new Promise((r) => setTimeout(r, DEMO_CONFIG.timing.dashboardRevealDelay));
      setPhase('dashboard-revealing');

      // Phase 8: Ready state (hold)
      await new Promise((r) => setTimeout(r, 3000));
      setPhase('ready');
    };

    runDemo();
  }, [animateTyping]);

  const showUserMessage = phase !== 'idle';
  const showThinking = phase === 'thinking' || phase === 'reasoning';
  const showAssistantMessage = [
    'assistant-typing',
    'artifact-appear',
    'canvas-opening',
    'dashboard-revealing',
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
      {/* Unified chat card */}
      <div className="relative mx-auto flex flex-1 min-h-0 w-full max-w-5xl rounded-3xl bg-black/50 backdrop-blur-sm shadow-[inset_-2px_0_4px_rgba(255,255,255,0.05)] border border-border/50">
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
                      {/* File attachment chip */}
                      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/20">
                          <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-foreground">{DEMO_CONFIG.fileName}</span>
                          <span className="text-[10px] text-muted-foreground">Excel Spreadsheet</span>
                        </div>
                      </div>
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
                          artifactRendered={showArtifact ? true : false}
                        />
                      </ReasoningErrorBoundary>

                      {/* Message text */}
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

            {/* Artifact Card */}
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

        {/* Input area (disabled in demo) */}
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
        {/* Header */}
        <header className="border-b px-4 py-3 flex items-center justify-between shrink-0 bg-black/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">Vana</span>
          </div>
          <div className="text-sm text-muted-foreground">Demo Mode - Dashboard</div>
        </header>

        {/* Main content */}
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
                    {/* Artifact header */}
                    <div className="border-b px-4 py-2 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="rounded-md bg-primary/10 p-1.5">
                          <BarChart3 className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium">Q4 Results Dashboard</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCloseCanvas}
                      >
                        Close
                      </Button>
                    </div>
                    {/* Dashboard renderer */}
                    <DemoDashboardRenderer />
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
