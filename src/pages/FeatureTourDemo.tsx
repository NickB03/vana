import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PromptInput,
  PromptInputTextarea
} from "@/components/prompt-kit/prompt-input";
import {
  Sparkles,
  Play,
  RotateCcw,
  Image as ImageIcon,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InteractiveOnboardingChecklist, Step } from "@/components/ui/onboarding-checklist";

/**
 * Feature Tour Demo Page
 *
 * Demonstrates the onboarding checklist component for new users.
 * Uses the shadcn onboarding-checklist component from 21st.dev.
 */

const onboardingSteps: Step[] = [
  {
    id: "chat-input",
    title: "Start Chatting",
    description: "Type anything here to chat with Vana. Ask questions, get help with code, or request creative content.",
    targetSelector: "#demo-chat-input",
  },
  {
    id: "image-mode",
    title: "Generate Images",
    description: "Enable Image Mode to create AI-generated images from your text descriptions.",
    targetSelector: "#demo-image-mode",
  },
  {
    id: "artifact-mode",
    title: "Create Artifacts",
    description: "Artifact Mode generates interactive React components, games, dashboards, and more.",
    targetSelector: "#demo-artifact-mode",
  },
  {
    id: "suggestions",
    title: "Quick Ideas",
    description: "Choose from pre-built suggestions to see what Vana can do instantly.",
    targetSelector: "#demo-suggestions",
  },
  {
    id: "sidebar",
    title: "Chat History",
    description: "Access your previous conversations here. All chats are saved automatically.",
    targetSelector: "#demo-sidebar",
  }
];

// Mock chat sidebar for demo
const MockSidebar = () => (
  <div
    id="demo-sidebar"
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
    id="demo-suggestions"
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

export default function FeatureTourDemo() {
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [imageMode, setImageMode] = useState(false);
  const [artifactMode, setArtifactMode] = useState(false);

  const stepsWithCompletion = onboardingSteps.map(step => ({
    ...step,
    completed: completedSteps.includes(step.id)
  }));

  const handleCompleteStep = (stepId: string) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps(prev => [...prev, stepId]);
    }
  };

  const handleFinish = () => {
    setIsChecklistOpen(false);
  };

  const resetDemo = () => {
    setCompletedSteps([]);
    setIsChecklistOpen(false);
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
            <h1 className="text-lg font-semibold">Onboarding Checklist Preview</h1>
          </div>
          <div className="flex items-center gap-2">
            {completedSteps.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetDemo}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsChecklistOpen(true)}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              {isChecklistOpen ? "Checklist Open" : "Start Onboarding"}
            </Button>
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
            <div id="demo-chat-input" className="w-full">
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
                      <div id="demo-image-mode">
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
                      <div id="demo-artifact-mode">
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
                      <Sparkles className="h-4 w-4 text-white" />
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
                  <h3 className="font-medium text-sm mb-1">Onboarding Checklist Demo</h3>
                  <p className="text-sm text-muted-foreground">
                    Click "Start Onboarding" to see the checklist panel. Click on each step to highlight
                    the corresponding UI element. Complete steps by pressing Enter or clicking the element.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Onboarding Checklist Component */}
      <InteractiveOnboardingChecklist
        steps={stepsWithCompletion}
        open={isChecklistOpen}
        onOpenChange={setIsChecklistOpen}
        onCompleteStep={handleCompleteStep}
        onFinish={handleFinish}
      />
    </div>
  );
}
