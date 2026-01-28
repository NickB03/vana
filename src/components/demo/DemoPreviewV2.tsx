import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Gamepad2,
  Sparkles,
  Maximize2,
  ChevronDown,
  Clock,
} from "lucide-react";
import { useDemoReplay } from "./useDemoReplay";
import { froggerDemo } from "@/data/demos/dashboard";
import { cn } from "@/lib/utils";

/**
 * DemoPreviewV2 - JSON-driven demo preview matching real Vana UI
 *
 * Renders an animated chat interaction using the useDemoReplay hook.
 * Styled to match the actual ChatInterface components.
 */
export const DemoPreviewV2 = () => {
  const {
    phase,
    visibleUserMessage,
    visibleAssistantMessage,
    visibleReasoningChunks,
    artifactVisible,
  } = useDemoReplay(froggerDemo);

  const showUserMessage = phase !== 'idle';
  const showThinking = phase === 'thinking' || phase === 'reasoning';
  const showAssistantMessage =
    phase === 'assistant-typing' || phase === 'artifact' || phase === 'hold';

  // Get last reasoning chunk for ticker display
  const lastReasoningChunk = visibleReasoningChunks[visibleReasoningChunks.length - 1] || 'Thinking...';

  return (
    <div className="relative w-full aspect-[4/3] lg:aspect-[16/10] bg-background border-2 rounded-xl shadow-2xl overflow-hidden flex flex-col">
      {/* Browser chrome */}
      <div className="bg-muted border-b px-4 py-2 flex items-center gap-2 shrink-0">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div className="h-3 w-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 bg-background/50 rounded px-3 py-1 text-xs text-muted-foreground ml-2">
          vana.bot
        </div>
      </div>

      {/* Chat content area */}
      <div className="flex-1 overflow-hidden flex flex-col p-3">
        <div className="flex-1 flex flex-col gap-2.5 overflow-hidden">

          {/* User message - Claude-style pill with avatar */}
          {showUserMessage && (
            <div className="flex justify-start animate-in fade-in slide-in-from-right-5 duration-500">
              <div className="flex items-center gap-2 rounded-2xl bg-muted/60 px-2.5 py-1.5 max-w-[85%]">
                {/* User avatar */}
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-[10px]">
                  U
                </div>
                {/* Message text */}
                <div className="text-xs text-foreground leading-relaxed">
                  {visibleUserMessage}
                  {phase === 'user-typing' && (
                    <span className="inline-block w-0.5 h-3 bg-foreground ml-0.5 animate-pulse" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reasoning ticker - Claude-style pill during thinking */}
          {showThinking && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="flex items-center gap-1.5 rounded-full bg-muted/80 px-2.5 py-1 border border-border/50">
                <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                <span className="text-[10px] text-muted-foreground font-medium">
                  {lastReasoningChunk}
                </span>
              </div>
            </div>
          )}

          {/* Assistant message content */}
          {showAssistantMessage && (
            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-left-3 duration-500">
              {/* Collapsed reasoning pill (like after streaming completes) */}
              <div className="flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 w-fit border border-border/40">
                <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                <span className="text-[9px] text-muted-foreground">
                  Thought for 2s
                </span>
                <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
              </div>

              {/* Message text */}
              <div className="text-xs text-foreground leading-relaxed pl-0.5">
                {visibleAssistantMessage}
                {phase === 'assistant-typing' && (
                  <span className="inline-block w-0.5 h-3 bg-foreground ml-0.5 animate-pulse" />
                )}
              </div>
            </div>
          )}

          {/* Artifact Card - matches ArtifactCard.tsx styling */}
          {artifactVisible && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 mt-1">
              <Card className={cn(
                "group relative overflow-hidden",
                "border bg-card",
                "hover:border-primary/40",
                "hover:shadow-lg hover:shadow-primary/10",
                "transition-all duration-300"
              )}>
                <CardHeader className="py-2.5 px-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* Icon with background */}
                      <div className="rounded-md bg-primary/10 p-1.5 group-hover:bg-primary/20 transition-colors">
                        <Gamepad2 className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xs font-medium">
                          {froggerDemo.artifact.title}
                        </CardTitle>
                        <CardDescription className="text-[10px]">
                          React Component
                        </CardDescription>
                      </div>
                    </div>
                    {/* Open button */}
                    <Button
                      size="sm"
                      className="gap-1 h-6 px-2 text-[10px] transition-all group-hover:bg-primary group-hover:text-primary-foreground"
                    >
                      <Maximize2 className="h-2.5 w-2.5" />
                      Open
                    </Button>
                  </div>
                </CardHeader>

                {/* Preview area - Frogger game visual */}
                <div className="px-3 pb-2.5">
                  <div className="relative bg-slate-900 rounded-md overflow-hidden h-28">
                    {/* Safe zone (top) */}
                    <div className="absolute top-0 left-0 right-0 h-[12%] bg-emerald-800 flex items-center justify-center">
                      <div className="text-[8px] text-emerald-300 font-bold tracking-wide">GOAL</div>
                    </div>

                    {/* Water/river section */}
                    <div className="absolute top-[12%] left-0 right-0 h-[32%] bg-blue-900/90">
                      {/* Logs */}
                      <div className="absolute top-[20%] left-[8%] w-[22%] h-[25%] bg-amber-700 rounded-sm shadow-md" />
                      <div className="absolute top-[20%] left-[55%] w-[18%] h-[25%] bg-amber-700 rounded-sm shadow-md" />
                      <div className="absolute top-[58%] left-[22%] w-[26%] h-[25%] bg-amber-700 rounded-sm shadow-md" />
                      <div className="absolute top-[58%] left-[70%] w-[20%] h-[25%] bg-amber-700 rounded-sm shadow-md" />
                    </div>

                    {/* Middle safe zone */}
                    <div className="absolute top-[44%] left-0 right-0 h-[10%] bg-slate-700" />

                    {/* Road section */}
                    <div className="absolute top-[54%] left-0 right-0 h-[32%] bg-slate-800">
                      {/* Road markings */}
                      <div className="absolute top-[48%] left-0 right-0 h-[3px] flex gap-3 px-2">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="flex-1 bg-yellow-400/70 rounded-full" />
                        ))}
                      </div>
                      {/* Cars */}
                      <div className="absolute top-[12%] left-[12%] w-[10%] h-[30%] bg-red-500 rounded-sm shadow-md" />
                      <div className="absolute top-[12%] left-[52%] w-[10%] h-[30%] bg-blue-500 rounded-sm shadow-md" />
                      <div className="absolute top-[58%] left-[28%] w-[12%] h-[30%] bg-yellow-400 rounded-sm shadow-md" />
                      <div className="absolute top-[58%] left-[72%] w-[9%] h-[30%] bg-purple-500 rounded-sm shadow-md" />
                    </div>

                    {/* Start zone */}
                    <div className="absolute bottom-0 left-0 right-0 h-[14%] bg-emerald-800" />

                    {/* Frog */}
                    <div className="absolute bottom-[3%] left-[47%] w-[6%] aspect-square bg-lime-400 rounded-full border-2 border-lime-300 shadow-lg shadow-lime-400/50" />

                    {/* Score overlay */}
                    <div className="absolute top-1 right-1.5 text-[7px] text-white/80 font-mono bg-black/30 px-1 rounded">
                      SCORE: 0
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
