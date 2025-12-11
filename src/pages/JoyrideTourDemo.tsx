import { useState, useCallback } from "react";
import Joyride, { STATUS, ACTIONS, EVENTS, CallBackProps, Step } from "react-joyride";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PromptInput,
  PromptInputTextarea
} from "@/components/prompt-kit/prompt-input";
import {
  Sparkles,
  ChevronRight,
  Image as ImageIcon,
  Wand2,
  Play,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * React Joyride Tour Demo Page
 *
 * Demonstrates the same onboarding flow as FeatureTourDemo.tsx
 * but using React Joyride library instead of custom implementation.
 *
 * Compare: /demo-feature-tour (custom) vs /demo-joyride-tour (this)
 */

// Joyride steps configuration
const tourSteps: Step[] = [
  {
    target: "#joyride-chat-input",
    content: "Type anything here to chat with Vana. Ask questions, get help with code, or request creative content.",
    title: "Start Chatting",
    disableBeacon: true,
    placement: "top",
  },
  {
    target: "#joyride-image-mode",
    content: "Enable Image Mode to create AI-generated images from your text descriptions.",
    title: "Generate Images",
    disableBeacon: true,
    placement: "top",
  },
  {
    target: "#joyride-artifact-mode",
    content: "Artifact Mode generates interactive React components, games, dashboards, and more.",
    title: "Create Artifacts",
    disableBeacon: true,
    placement: "top",
  },
  {
    target: "#joyride-suggestions",
    content: "Choose from pre-built suggestions to see what Vana can do instantly.",
    title: "Quick Ideas",
    disableBeacon: true,
    placement: "top",
  },
  {
    target: "#joyride-sidebar",
    content: "Access your previous conversations here. All chats are saved automatically.",
    title: "Chat History",
    disableBeacon: true,
    placement: "right",
  }
];

// Custom styles matching Shadcn design tokens
const joyrideStyles = {
  options: {
    arrowColor: "hsl(var(--popover))",
    backgroundColor: "hsl(var(--popover))",
    primaryColor: "hsl(var(--primary))",
    textColor: "hsl(var(--popover-foreground))",
    overlayColor: "rgba(0, 0, 0, 0.75)",
    zIndex: 1000,
  },
  tooltip: {
    borderRadius: "var(--radius)",
    padding: "1.5rem",
    fontFamily: "inherit",
  },
  tooltipContainer: {
    textAlign: "left" as const,
  },
  tooltipTitle: {
    fontSize: "1.125rem",
    fontWeight: 600,
    marginBottom: "0.5rem",
    color: "hsl(var(--foreground))",
  },
  tooltipContent: {
    fontSize: "0.875rem",
    color: "hsl(var(--muted-foreground))",
    lineHeight: 1.5,
  },
  buttonNext: {
    backgroundColor: "hsl(var(--primary))",
    color: "hsl(var(--primary-foreground))",
    borderRadius: "calc(var(--radius) - 2px)",
    fontSize: "0.875rem",
    fontWeight: 500,
    padding: "0.5rem 1rem",
  },
  buttonBack: {
    color: "hsl(var(--foreground))",
    marginRight: "0.5rem",
  },
  buttonSkip: {
    color: "hsl(var(--muted-foreground))",
    fontSize: "0.75rem",
  },
  spotlight: {
    borderRadius: "12px",
  },
};

// Mock chat sidebar for demo
const MockSidebar = () => (
  <div
    id="joyride-sidebar"
    className="w-64 bg-black/50 border-r border-border/50 p-4 flex flex-col gap-2"
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
const MockSuggestions = () => (
  <div
    id="joyride-suggestions"
    className="flex gap-3 overflow-x-auto pb-2"
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

export default function JoyrideTourDemo() {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [input, setInput] = useState("");
  const [imageMode, setImageMode] = useState(false);
  const [artifactMode, setArtifactMode] = useState(false);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, action, type, index } = data;

    // Handle step changes
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }

    // Handle tour completion or skip
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
      setStepIndex(0);
      // In production, you'd save to localStorage here
      // localStorage.setItem('joyride-tour-complete', 'true');
    }
  }, []);

  const startTour = () => {
    setStepIndex(0);
    setRun(true);
  };

  const resetTour = () => {
    setStepIndex(0);
    setRun(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Joyride Component */}
      <Joyride
        steps={tourSteps}
        run={run}
        stepIndex={stepIndex}
        continuous
        showProgress
        showSkipButton
        scrollToFirstStep
        disableScrolling={false}
        callback={handleJoyrideCallback}
        styles={joyrideStyles}
        locale={{
          back: "Previous",
          close: "Close",
          last: "Finish",
          next: "Next",
          skip: "Skip tour",
        }}
        floaterProps={{
          disableAnimation: false,
        }}
      />

      {/* Demo header */}
      <div className="border-b border-border/50 bg-black/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
              React Joyride
            </Badge>
            <h1 className="text-lg font-semibold">Library-Based Tour</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={startTour}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              {run ? "Restart Tour" : "Start Tour"}
            </Button>
            {run && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetTour}
                className="gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main demo area */}
      <div className="flex h-[calc(100vh-57px)]">
        {/* Mock sidebar */}
        <MockSidebar />

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
              <MockSuggestions />
            </div>

            {/* Chat input */}
            <div id="joyride-chat-input" className="w-full">
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
                      <div id="joyride-image-mode">
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
                      <div id="joyride-artifact-mode">
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

          {/* Comparison card */}
          <Card className="max-w-3xl mx-auto w-full bg-muted/10 border-border/50 mt-6">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-sm mb-1">React Joyride Demo</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    This uses React Joyride with Shadcn-themed styles. Compare with the{" "}
                    <a href="/demo-feature-tour" className="text-primary hover:underline">
                      custom implementation
                    </a>{" "}
                    to see the difference.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">~15KB gzipped</Badge>
                    <Badge variant="secondary">React-native hooks</Badge>
                    <Badge variant="secondary">Built-in scroll handling</Badge>
                    <Badge variant="secondary">Keyboard navigation</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
