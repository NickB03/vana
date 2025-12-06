import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PromptInput,
  PromptInputTextarea
} from "@/components/prompt-kit/prompt-input";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  Image as ImageIcon,
  Wand2,
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
  position: "top" | "bottom" | "left" | "right";
}

const tourSteps: TourStep[] = [
  {
    id: "chat-input",
    target: "#demo-chat-input",
    title: "Start Chatting",
    description: "Type anything here to chat with Vana. Ask questions, get help with code, or request creative content.",
    position: "top"
  },
  {
    id: "image-mode",
    target: "#demo-image-mode",
    title: "Generate Images",
    description: "Enable Image Mode to create AI-generated images from your text descriptions.",
    position: "top"
  },
  {
    id: "artifact-mode",
    target: "#demo-artifact-mode",
    title: "Create Artifacts",
    description: "Artifact Mode generates interactive React components, games, dashboards, and more.",
    position: "top"
  },
  {
    id: "suggestions",
    target: "#demo-suggestions",
    title: "Quick Ideas",
    description: "Choose from pre-built suggestions to see what Vana can do instantly.",
    position: "top"
  },
  {
    id: "sidebar",
    target: "#demo-sidebar",
    title: "Chat History",
    description: "Access your previous conversations here. All chats are saved automatically.",
    position: "right"
  }
];

// Gradient glow highlight border (no dark overlay)
const GradientGlowBorder = ({
  targetRect,
  isVisible
}: {
  targetRect: DOMRect | null;
  isVisible: boolean;
}) => {
  if (!isVisible || !targetRect) return null;

  const padding = 8;
  const borderRadius = 12;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed z-40 pointer-events-none"
      style={{
        left: targetRect.left - padding,
        top: targetRect.top - padding,
        width: targetRect.width + padding * 2,
        height: targetRect.height + padding * 2,
      }}
    >
      {/* Outer glow layer */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: `${borderRadius}px`,
          background: 'linear-gradient(135deg, hsl(var(--accent-primary) / 0.3), hsl(var(--accent-primary-bright) / 0.3))',
          filter: 'blur(8px)',
        }}
      />

      {/* Gradient border using pseudo-element technique */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: `${borderRadius}px`,
          padding: '2px',
          background: 'linear-gradient(135deg, hsl(var(--accent-primary)), hsl(var(--accent-primary-bright)))',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />

      {/* Box shadow glow */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: `${borderRadius}px`,
          boxShadow: `
            0 0 20px hsl(var(--accent-primary) / 0.4),
            0 0 40px hsl(var(--accent-primary) / 0.2),
            inset 0 0 20px hsl(var(--accent-primary) / 0.1)
          `,
        }}
      />
    </motion.div>
  );
};

// Compact tour tooltip component
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

  // Calculate tooltip position - compact size
  const getTooltipStyle = () => {
    const tooltipWidth = 280;
    const tooltipHeight = 140; // Reduced height
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

    // Keep tooltip within viewport with more margin
    left = Math.max(20, Math.min(left, window.innerWidth - tooltipWidth - 20));
    top = Math.max(20, Math.min(top, window.innerHeight - tooltipHeight - 20));

    return { left, top, width: tooltipWidth };
  };

  const style = getTooltipStyle();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed z-50 pointer-events-auto"
      style={style}
    >
      <Card className="bg-card border-border shadow-xl">
        <CardContent className="p-4">
          {/* Title */}
          <h3 className="font-semibold text-foreground text-base mb-0.5">
            {step.title}
          </h3>

          {/* Step counter */}
          <p className="text-xs text-muted-foreground mb-2">
            Step {currentStep + 1} of {totalSteps}
          </p>

          {/* Description - shorter */}
          <p className="text-sm text-muted-foreground leading-snug mb-4">
            {step.description}
          </p>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between">
            {/* Skip link */}
            <button
              onClick={onSkip}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip tour
            </button>

            {/* Prev/Next buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onPrev}
                disabled={isFirstStep}
                className="h-8 px-3 gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={isLastStep ? onComplete : onNext}
                className="h-8 px-3 gap-1"
              >
                {isLastStep ? "Finish" : "Next"}
                {!isLastStep && <ChevronRight className="h-3.5 w-3.5" />}
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

      {/* Tour highlight and tooltip */}
      <AnimatePresence>
        {isTourActive && (
          <>
            <GradientGlowBorder
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
