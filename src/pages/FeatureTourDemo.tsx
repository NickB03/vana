import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PromptInput,
  PromptInputTextarea
} from "@/components/prompt-kit/prompt-input";
import { PromptInputControls } from "@/components/prompt-kit/prompt-input-controls";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  MessageSquare,
  Image as ImageIcon,
  Wand2,
  History,
  RotateCcw,
  Play
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

/**
 * Feature Tour Demo Page
 *
 * Demonstrates the onboarding feature tour UX pattern for new users.
 * Shows how tooltips/spotlights guide users through the main UI elements.
 */

interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position: "top" | "bottom" | "left" | "right";
}

const tourSteps: TourStep[] = [
  {
    id: "chat-input",
    target: "#demo-chat-input",
    title: "Start Chatting",
    description: "Type anything here to chat with Vana. Ask questions, get help with code, or request creative content.",
    icon: <MessageSquare className="h-5 w-5" />,
    position: "top"
  },
  {
    id: "image-mode",
    target: "#demo-image-mode",
    title: "Generate Images",
    description: "Enable Image Mode to create AI-generated images from your text descriptions.",
    icon: <ImageIcon className="h-5 w-5" />,
    position: "top"
  },
  {
    id: "artifact-mode",
    target: "#demo-artifact-mode",
    title: "Create Artifacts",
    description: "Artifact Mode generates interactive React components, games, dashboards, and more.",
    icon: <Wand2 className="h-5 w-5" />,
    position: "top"
  },
  {
    id: "suggestions",
    target: "#demo-suggestions",
    title: "Quick Ideas",
    description: "Choose from pre-built suggestions to see what Vana can do instantly.",
    icon: <Sparkles className="h-5 w-5" />,
    position: "top"
  },
  {
    id: "sidebar",
    target: "#demo-sidebar",
    title: "Chat History",
    description: "Access your previous conversations here. All chats are saved automatically.",
    icon: <History className="h-5 w-5" />,
    position: "right"
  }
];

// Spotlight overlay component with enhanced visuals
const SpotlightOverlay = ({
  targetRect,
  isVisible
}: {
  targetRect: DOMRect | null;
  isVisible: boolean;
}) => {
  if (!isVisible || !targetRect) return null;

  // Create a mask that highlights the target element
  const padding = 12;
  const borderRadius = 16;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Backdrop with gradient overlay */}
      <svg className="w-full h-full">
        <defs>
          {/* Radial gradient for spotlight glow */}
          <radialGradient id="spotlight-glow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="rgba(0, 0, 0, 0.6)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0.85)" />
          </radialGradient>

          {/* Mask for spotlight cutout */}
          <mask id="spotlight-mask">
            {/* White background (visible area) */}
            <rect width="100%" height="100%" fill="white" />
            {/* Black rectangle (cut out / transparent area) with larger border radius */}
            <rect
              x={targetRect.left - padding}
              y={targetRect.top - padding}
              width={targetRect.width + padding * 2}
              height={targetRect.height + padding * 2}
              rx={borderRadius}
              ry={borderRadius}
              fill="black"
            />
          </mask>
        </defs>
        {/* Dark overlay with mask and gradient applied */}
        <rect
          width="100%"
          height="100%"
          fill="url(#spotlight-glow)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Animated highlight ring with gradient border */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="absolute rounded-2xl"
        style={{
          left: targetRect.left - padding,
          top: targetRect.top - padding,
          width: targetRect.width + padding * 2,
          height: targetRect.height + padding * 2,
        }}
      >
        {/* Outer glow */}
        <div
          className="absolute inset-0 rounded-2xl animate-pulse"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--accent-primary) / 0.4), hsl(var(--accent-primary-bright) / 0.4))',
            filter: 'blur(12px)',
          }}
        />

        {/* Border ring with gradient */}
        <div
          className="absolute inset-0 rounded-2xl border-2"
          style={{
            borderImage: 'linear-gradient(135deg, hsl(var(--accent-primary)), hsl(var(--accent-primary-bright))) 1',
            boxShadow: `
              0 0 0 1px hsl(var(--accent-primary) / 0.3),
              0 0 20px hsl(var(--accent-primary) / 0.4),
              0 0 40px hsl(var(--accent-primary) / 0.2)
            `
          }}
        />
      </motion.div>
    </div>
  );
};

// Tour tooltip component
const TourTooltip = ({
  step,
  currentStep,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onSkip,
  onComplete
}: {
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
}) => {
  if (!targetRect) return null;

  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  // Calculate tooltip position
  const getTooltipStyle = () => {
    const tooltipWidth = 320;
    const tooltipHeight = 180;
    const gap = 16;

    let left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    let top = targetRect.bottom + gap;

    // Position based on step preference
    switch (step.position) {
      case "top":
        top = targetRect.top - tooltipHeight - gap;
        break;
      case "bottom":
        top = targetRect.bottom + gap;
        break;
      case "left":
        left = targetRect.left - tooltipWidth - gap;
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        break;
      case "right":
        left = targetRect.right + gap;
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        break;
    }

    // Keep tooltip within viewport
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));

    return { left, top, width: tooltipWidth };
  };

  const style = getTooltipStyle();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="fixed z-50 pointer-events-auto"
      style={style}
    >
      <Card className="bg-card/95 backdrop-blur-xl border-border shadow-2xl relative overflow-hidden">
        {/* Gradient accent bar at top */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{
            background: 'linear-gradient(90deg, hsl(var(--accent-primary)), hsl(var(--accent-primary-bright)))',
          }}
        />

        <CardContent className="p-5">
          {/* Header with icon and title */}
          <div className="flex items-start gap-3 mb-4">
            {/* Icon with gradient background */}
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--accent-primary) / 0.15), hsl(var(--accent-primary-bright) / 0.15))',
                border: '1px solid hsl(var(--accent-primary) / 0.2)'
              }}
            >
              <div style={{ color: 'hsl(var(--accent-primary))' }}>
                {step.icon}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-base mb-1.5">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground-accessible leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>

          {/* Footer with navigation */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-border/50">
            {/* Skip link */}
            <button
              onClick={onSkip}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip tour
            </button>

            {/* Progress and navigation */}
            <div className="flex items-center gap-3">
              {/* Progress dots */}
              <div className="flex gap-1.5 mr-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: i === currentStep ? 1 : 0.8 }}
                    className={cn(
                      "rounded-full transition-all duration-300",
                      i === currentStep
                        ? "w-6 h-2"
                        : "w-2 h-2"
                    )}
                    style={{
                      background: i === currentStep
                        ? 'linear-gradient(90deg, hsl(var(--accent-primary)), hsl(var(--accent-primary-bright)))'
                        : 'hsl(var(--muted-foreground) / 0.25)'
                    }}
                  />
                ))}
              </div>

              {/* Previous button */}
              {!isFirstStep && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPrev}
                  className="h-8 w-8 p-0 hover:bg-accent/50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}

              {/* Next/Complete button with gradient */}
              <Button
                size="sm"
                onClick={isLastStep ? onComplete : onNext}
                className="h-8 gap-1.5 font-medium px-4 border-0 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--accent-primary)), hsl(var(--accent-primary-bright)))',
                  boxShadow: '0 4px 12px hsl(var(--accent-primary) / 0.3)',
                  color: 'white'
                }}
              >
                {isLastStep ? (
                  "Get Started"
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Mock chat sidebar for demo
const MockSidebar = ({ isHighlighted }: { isHighlighted: boolean }) => (
  <div
    id="demo-sidebar"
    className={cn(
      "w-64 bg-black/50 border-r border-border/50 p-4 flex flex-col gap-2",
      isHighlighted && "relative z-50"
    )}
  >
    <div className="text-sm font-medium text-muted-foreground mb-2">Recent Chats</div>
    {["Build a todo app", "Help with React hooks", "Explain TypeScript generics"].map((title, i) => (
      <div
        key={i}
        className="px-3 py-2 rounded-lg bg-muted/20 hover:bg-muted/30 cursor-pointer transition-colors"
      >
        <span className="text-sm text-foreground/80 truncate">{title}</span>
      </div>
    ))}
  </div>
);

// Mock suggestion cards
const MockSuggestions = ({ isHighlighted }: { isHighlighted: boolean }) => (
  <div
    id="demo-suggestions"
    className={cn(
      "flex gap-3 overflow-x-auto pb-2",
      isHighlighted && "relative z-50"
    )}
  >
    {[
      { title: "Build a Game", emoji: "🎮" },
      { title: "Create Dashboard", emoji: "📊" },
      { title: "Design Landing Page", emoji: "🎨" },
      { title: "Generate Image", emoji: "🖼️" }
    ].map((item, i) => (
      <Card
        key={i}
        className="shrink-0 w-32 h-24 bg-muted/20 hover:bg-muted/30 cursor-pointer transition-colors border-border/50"
      >
        <CardContent className="p-3 flex flex-col items-center justify-center h-full">
          <span className="text-2xl mb-1">{item.emoji}</span>
          <span className="text-xs text-center text-muted-foreground">{item.title}</span>
        </CardContent>
      </Card>
    ))}
  </div>
);

export default function FeatureTourDemo() {
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [input, setInput] = useState("");
  const [imageMode, setImageMode] = useState(false);
  const [artifactMode, setArtifactMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentStep = tourSteps[currentStepIndex];

  // Update target element rect when step changes
  useEffect(() => {
    if (!isTourActive) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const element = document.querySelector(currentStep.target);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      }
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect);
    };
  }, [isTourActive, currentStep?.target]);

  const startTour = () => {
    setCurrentStepIndex(0);
    setIsTourActive(true);
  };

  const endTour = () => {
    setIsTourActive(false);
    setCurrentStepIndex(0);
  };

  const nextStep = () => {
    if (currentStepIndex < tourSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Demo header */}
      <div className="border-b border-border/50 bg-black/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              Demo
            </Badge>
            <h1 className="text-lg font-semibold">Feature Tour Preview</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={startTour}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              {isTourActive ? "Restart Tour" : "Start Tour"}
            </Button>
            {isTourActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={endTour}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main demo area */}
      <div className="flex h-[calc(100vh-57px)]">
        {/* Mock sidebar */}
        <MockSidebar isHighlighted={isTourActive && currentStep?.id === "sidebar"} />

        {/* Main content */}
        <div className="flex-1 flex flex-col p-6">
          {/* Center content */}
          <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
            {/* Heading */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
                Hi, I'm Vana.
              </h2>
              <p className="text-muted-foreground">
                Get started by choosing from an idea below or tell me what you want to do
              </p>
            </div>

            {/* Suggestion cards */}
            <div className="w-full mb-6">
              <MockSuggestions isHighlighted={isTourActive && currentStep?.id === "suggestions"} />
            </div>

            {/* Chat input */}
            <div
              id="demo-chat-input"
              className={cn(
                "w-full",
                isTourActive && currentStep?.id === "chat-input" && "relative z-50"
              )}
            >
              <PromptInput
                value={input}
                onValueChange={setInput}
                isLoading={false}
                onSubmit={() => {}}
                className="w-full relative rounded-xl bg-black/50 backdrop-blur-sm p-0 pt-1"
              >
                <div className="flex flex-col">
                  <PromptInputTextarea
                    placeholder="Ask anything"
                    className="min-h-[44px] text-base leading-[1.3] pl-4 pt-3"
                  />
                  <div className="flex items-center justify-between px-3 pb-3 mt-5">
                    {/* Left controls with IDs for targeting */}
                    <div className="flex items-center gap-2">
                      <div
                        id="demo-image-mode"
                        className={cn(
                          isTourActive && currentStep?.id === "image-mode" && "relative z-50"
                        )}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "size-9 rounded-full transition-all duration-200",
                            imageMode
                              ? "bg-blue-500 text-white shadow-lg ring-2 ring-blue-400/60"
                              : "hover:bg-accent"
                          )}
                          onClick={() => setImageMode(!imageMode)}
                        >
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      <div
                        id="demo-artifact-mode"
                        className={cn(
                          isTourActive && currentStep?.id === "artifact-mode" && "relative z-50"
                        )}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "size-9 rounded-full transition-all duration-200",
                            artifactMode
                              ? "bg-purple-500 text-white shadow-lg ring-2 ring-purple-400/60"
                              : "hover:bg-accent"
                          )}
                          onClick={() => setArtifactMode(!artifactMode)}
                        >
                          <Wand2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {/* Send button */}
                    <Button
                      size="icon"
                      disabled={!input.trim()}
                      className="size-9 rounded-full"
                      style={{
                        background: 'linear-gradient(135deg, hsl(var(--accent-primary)), hsl(var(--accent-primary-bright)))',
                        boxShadow: '0 4px 14px hsl(var(--accent-primary) / 0.4)',
                      }}
                    >
                      <ChevronRight className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                </div>
              </PromptInput>
            </div>
          </div>

          {/* Instructions card */}
          <Card className="max-w-3xl mx-auto w-full bg-muted/10 border-border/50 mt-6">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-sm mb-1">Feature Tour Demo</h3>
                  <p className="text-sm text-muted-foreground">
                    Click "Start Tour" above to see how the onboarding experience would look for new users.
                    The tour highlights key UI elements with contextual tooltips.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tour overlay and tooltip */}
      <AnimatePresence>
        {isTourActive && (
          <>
            <SpotlightOverlay
              targetRect={targetRect}
              isVisible={isTourActive}
            />
            <TourTooltip
              step={currentStep}
              currentStep={currentStepIndex}
              totalSteps={tourSteps.length}
              targetRect={targetRect}
              onNext={nextStep}
              onPrev={prevStep}
              onSkip={endTour}
              onComplete={endTour}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
