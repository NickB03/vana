import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, RotateCw, Pencil, Sparkles, ChevronDown, Clock, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TextShimmer } from "@/components/prompt-kit/text-shimmer";
import { SystemMessage } from "@/components/ui/system-message";

/**
 * UI/UX Showcase Page
 *
 * Demonstrates proposed improvements to the chat interface with side-by-side comparisons.
 * Each section shows BEFORE (current) vs AFTER (proposed) implementations.
 */
export default function UIShowcase() {
  const [activeTab, setActiveTab] = useState("message-hierarchy");

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">UI/UX Improvements Showcase</h1>
          <p className="text-lg text-muted-foreground">
            Interactive examples of proposed chat interface enhancements
          </p>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
            <TabsTrigger value="message-hierarchy">Messages</TabsTrigger>
            <TabsTrigger value="action-buttons">Actions</TabsTrigger>
            <TabsTrigger value="placeholders">Input</TabsTrigger>
            <TabsTrigger value="reasoning">Reasoning</TabsTrigger>
            <TabsTrigger value="visual-polish">Polish</TabsTrigger>
          </TabsList>

          {/* 1. Message Visual Hierarchy - Alternative Options */}
          <TabsContent value="message-hierarchy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>1. Message Visual Hierarchy Options</CardTitle>
                <CardDescription>
                  Alternative approaches to improve assistant message visibility without hurting readability
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Current State */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">CURRENT (Baseline)</h3>
                  <div className="space-y-4 rounded-2xl bg-black/50 backdrop-blur-sm p-6 border border-border/50">
                    <div className="flex items-start gap-2.5 rounded-2xl bg-muted/60 px-3 py-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">U</div>
                      <div className="text-[15px] text-foreground leading-relaxed">What's the weather like today?</div>
                    </div>
                    <div className="flex w-full flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground">Vana</span>
                      </div>
                      <div className="text-[15px] text-foreground leading-relaxed">
                        The weather today is sunny with a high of 72°F and clear skies. Perfect for outdoor activities!
                      </div>
                    </div>
                  </div>
                </div>

                {/* Option 1: Left Border Accent */}
                <div>
                  <h3 className="text-sm font-semibold mb-1 text-green-500">Option 1: Left Border Accent</h3>
                  <p className="text-xs text-muted-foreground mb-3">Like Slack/Discord quotes - minimal visual footprint</p>
                  <div className="space-y-4 rounded-2xl bg-black/50 backdrop-blur-sm p-6 border border-border/50">
                    <div className="flex items-start gap-2.5 rounded-2xl bg-muted/60 px-3 py-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">U</div>
                      <div className="text-[15px] text-foreground leading-relaxed">What's the weather like today?</div>
                    </div>
                    {/* LEFT BORDER ACCENT */}
                    <div className="flex w-full flex-col gap-1.5 border-l-2 border-primary/40 pl-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground">Vana</span>
                      </div>
                      <div className="text-[15px] text-foreground leading-relaxed">
                        The weather today is sunny with a high of 72°F and clear skies. Perfect for outdoor activities!
                      </div>
                    </div>
                  </div>
                </div>

                {/* Option 2: Enhanced Icon/Avatar */}
                <div>
                  <h3 className="text-sm font-semibold mb-1 text-blue-500">Option 2: Enhanced Icon</h3>
                  <p className="text-xs text-muted-foreground mb-3">Larger icon with ring effect - like ChatGPT/Claude</p>
                  <div className="space-y-4 rounded-2xl bg-black/50 backdrop-blur-sm p-6 border border-border/50">
                    <div className="flex items-start gap-2.5 rounded-2xl bg-muted/60 px-3 py-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">U</div>
                      <div className="text-[15px] text-foreground leading-relaxed">What's the weather like today?</div>
                    </div>
                    {/* ENHANCED ICON */}
                    <div className="flex w-full flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 ring-2 ring-primary/25">
                          <Sparkles className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground">Vana</span>
                      </div>
                      <div className="text-[15px] text-foreground leading-relaxed">
                        The weather today is sunny with a high of 72°F and clear skies. Perfect for outdoor activities!
                      </div>
                    </div>
                  </div>
                </div>

                {/* Option 3: Gradient Fade */}
                <div>
                  <h3 className="text-sm font-semibold mb-1 text-purple-500">Option 3: Gradient Fade</h3>
                  <p className="text-xs text-muted-foreground mb-3">Subtle gradient at top - modern look without blocking text</p>
                  <div className="space-y-4 rounded-2xl bg-black/50 backdrop-blur-sm p-6 border border-border/50">
                    <div className="flex items-start gap-2.5 rounded-2xl bg-muted/60 px-3 py-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">U</div>
                      <div className="text-[15px] text-foreground leading-relaxed">What's the weather like today?</div>
                    </div>
                    {/* GRADIENT FADE */}
                    <div className="flex w-full flex-col gap-1.5 relative">
                      <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none rounded-t-lg" />
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground">Vana</span>
                      </div>
                      <div className="text-[15px] text-foreground leading-relaxed">
                        The weather today is sunny with a high of 72°F and clear skies. Perfect for outdoor activities!
                      </div>
                    </div>
                  </div>
                </div>

                {/* Option 4: Separator Line */}
                <div>
                  <h3 className="text-sm font-semibold mb-1 text-orange-500">Option 4: Separator Line</h3>
                  <p className="text-xs text-muted-foreground mb-3">Thin divider between message pairs - clear separation</p>
                  <div className="space-y-4 rounded-2xl bg-black/50 backdrop-blur-sm p-6 border border-border/50">
                    <div className="flex items-start gap-2.5 rounded-2xl bg-muted/60 px-3 py-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">U</div>
                      <div className="text-[15px] text-foreground leading-relaxed">What's the weather like today?</div>
                    </div>
                    {/* SEPARATOR LINE */}
                    <div className="h-px bg-border/40 my-1" />
                    <div className="flex w-full flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground">Vana</span>
                      </div>
                      <div className="text-[15px] text-foreground leading-relaxed">
                        The weather today is sunny with a high of 72°F and clear skies. Perfect for outdoor activities!
                      </div>
                    </div>
                  </div>
                </div>

                {/* Option 5: Role Label Badge */}
                <div>
                  <h3 className="text-sm font-semibold mb-1 text-cyan-500">Option 5: Role Label Badge</h3>
                  <p className="text-xs text-muted-foreground mb-3">Subtle badge on label only - not full message</p>
                  <div className="space-y-4 rounded-2xl bg-black/50 backdrop-blur-sm p-6 border border-border/50">
                    <div className="flex items-start gap-2.5 rounded-2xl bg-muted/60 px-3 py-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">U</div>
                      <div className="text-[15px] text-foreground leading-relaxed">What's the weather like today?</div>
                    </div>
                    {/* ROLE LABEL BADGE */}
                    <div className="flex w-full flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground/90 px-2 py-0.5 rounded-md bg-primary/10">
                          Vana
                        </span>
                      </div>
                      <div className="text-[15px] text-foreground leading-relaxed">
                        The weather today is sunny with a high of 72°F and clear skies. Perfect for outdoor activities!
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-sm">
                  <strong className="text-green-600 dark:text-green-400">Recommendation:</strong> Options 1 (Left Border) and 2 (Enhanced Icon) are most commonly used in production chat apps. They provide clear visual hierarchy without affecting text readability.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. Action Button Discoverability */}
          <TabsContent value="action-buttons" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>2. Action Button Discoverability</CardTitle>
                <CardDescription>
                  Show buttons with reduced opacity instead of hiding completely
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* BEFORE */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">BEFORE (Current)</h3>
                  <div className="rounded-2xl bg-black/50 backdrop-blur-sm p-6 border border-border/50">
                    <div className="group flex w-full flex-col gap-1.5 rounded-2xl bg-muted/20 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground">Vana</span>
                      </div>
                      <div className="text-[15px] text-foreground leading-relaxed">
                        Here's a sample response to demonstrate action buttons.
                      </div>
                      {/* Buttons HIDDEN by default */}
                      <div className="flex justify-end">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm hover:bg-muted/50">
                            <RotateCw className="h-3 w-3 text-muted-foreground/60" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm hover:bg-muted/50">
                            <Copy className="h-3 w-3 text-muted-foreground/60" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 italic">Hover over the message to see buttons</p>
                  </div>
                </div>

                {/* AFTER */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">AFTER (Proposed)</h3>
                  <div className="rounded-2xl bg-black/50 backdrop-blur-sm p-6 border border-border/50">
                    <div className="group flex w-full flex-col gap-1.5 rounded-2xl bg-muted/20 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground">Vana</span>
                      </div>
                      <div className="text-[15px] text-foreground leading-relaxed">
                        Here's a sample response to demonstrate action buttons.
                      </div>
                      {/* Buttons VISIBLE with reduced opacity */}
                      <div className="flex justify-end">
                        <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity duration-150">
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm hover:bg-muted/50">
                            <RotateCw className="h-3 w-3 text-muted-foreground/60" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm hover:bg-muted/50">
                            <Copy className="h-3 w-3 text-muted-foreground/60" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 italic">Buttons are always visible (hover for full opacity)</p>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm">
                  <strong className="text-blue-600 dark:text-blue-400">Why:</strong> Users may not discover hover-only actions. Subtle visibility hints at functionality without clutter.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. Context-Aware Placeholders */}
          <TabsContent value="placeholders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>3. Context-Aware Input Placeholders</CardTitle>
                <CardDescription>
                  Placeholder text adapts to current mode (image, artifact, editing)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* BEFORE */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">BEFORE (Current)</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Ask anything"
                      className="w-full rounded-xl border border-border/50 bg-black/50 px-4 py-3 text-sm placeholder:text-muted-foreground/50"
                      readOnly
                    />
                    <p className="text-xs text-muted-foreground">Same placeholder regardless of mode</p>
                  </div>
                </div>

                {/* AFTER */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">AFTER (Proposed)</h3>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-xs font-medium">Normal mode:</p>
                      <input
                        type="text"
                        placeholder="Ask anything"
                        className="w-full rounded-xl border border-border/50 bg-black/50 px-4 py-3 text-sm placeholder:text-muted-foreground/50"
                        readOnly
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium">Image mode:</p>
                      <input
                        type="text"
                        placeholder="Describe the image you want to generate..."
                        className="w-full rounded-xl border border-orange-500/30 bg-black/50 px-4 py-3 text-sm placeholder:text-muted-foreground/50"
                        readOnly
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium">Artifact mode:</p>
                      <input
                        type="text"
                        placeholder="Describe the component you want to create..."
                        className="w-full rounded-xl border border-purple-500/30 bg-black/50 px-4 py-3 text-sm placeholder:text-muted-foreground/50"
                        readOnly
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium">Editing artifact:</p>
                      <input
                        type="text"
                        placeholder="Ask me to modify this artifact..."
                        className="w-full rounded-xl border border-blue-500/30 bg-black/50 px-4 py-3 text-sm placeholder:text-muted-foreground/50"
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm">
                  <strong className="text-blue-600 dark:text-blue-400">Why:</strong> Contextual hints guide users and clarify mode-specific expectations, reducing cognitive load.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 4. Reasoning Display Enhancements */}
          <TabsContent value="reasoning" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>4. Reasoning Display Polish</CardTitle>
                <CardDescription>
                  Subtle pulse animation during active reasoning + improved timer display
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* BEFORE */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">BEFORE (Current)</h3>
                  <div className="rounded-2xl bg-black/50 backdrop-blur-sm p-6 border border-border/50">
                    <div className="flex w-full items-center justify-between gap-2 rounded-2xl border border-border/40 bg-transparent px-3 py-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin shrink-0" />
                        <TextShimmer className="font-mono text-sm text-muted-foreground" duration={3} spread={25}>
                          Analyzing request...
                        </TextShimmer>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                        2.4s
                      </span>
                    </div>
                  </div>
                </div>

                {/* AFTER */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">AFTER (Proposed)</h3>
                  <div className="rounded-2xl bg-black/50 backdrop-blur-sm p-6 border border-border/50">
                    <div className="flex w-full items-center justify-between gap-2 rounded-2xl border border-border/40 bg-transparent px-3 py-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin shrink-0" />
                        <TextShimmer className="font-mono text-sm text-muted-foreground" duration={3} spread={25}>
                          Analyzing request...
                        </TextShimmer>
                      </div>
                      {/* Timer with subtle pulse */}
                      <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground animate-pulse">
                        2.4s
                      </span>
                    </div>

                    {/* Completed state */}
                    <div className="flex w-full items-center justify-between gap-2 rounded-2xl border border-border/60 bg-muted/30 px-3 py-2 mt-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm text-muted-foreground line-clamp-1 w-full">
                          Thought process
                        </span>
                      </div>
                      {/* Timer with clock icon (completed) */}
                      <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                        <Clock className="size-3" />
                        3.8s
                      </span>
                      <ChevronDown className="size-3.5 text-muted-foreground/60" />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm">
                  <strong className="text-blue-600 dark:text-blue-400">Why:</strong> Visual feedback (pulse) reinforces that AI is actively thinking. Clock icon in completed state clarifies it's a duration, not a timestamp.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 5. Visual Polish */}
          <TabsContent value="visual-polish" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>5. Visual Polish & Micro-interactions</CardTitle>
                <CardDescription>
                  Enhanced shadows, guest banner urgency, and button feedback
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Canvas Toggle Button */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Canvas Toggle Button (Mobile)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* BEFORE */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">BEFORE</p>
                      <div className="relative h-32 bg-gradient-to-b from-muted/20 to-muted/40 rounded-lg flex items-end justify-end p-4">
                        <Button
                          size="icon"
                          className="h-14 w-14 rounded-full bg-primary shadow-lg shadow-primary/30"
                        >
                          <Maximize2 className="h-6 w-6 text-white" />
                        </Button>
                      </div>
                    </div>

                    {/* AFTER */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">AFTER (hover/press me)</p>
                      <div className="relative h-32 bg-gradient-to-b from-muted/20 to-muted/40 rounded-lg flex items-end justify-end p-4">
                        <Button
                          size="icon"
                          className="h-14 w-14 rounded-full bg-primary shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 active:scale-95 active:shadow-md transition-all duration-200"
                        >
                          <Maximize2 className="h-6 w-6 text-white" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Guest Banner Urgency */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Guest Banner Urgency Gradient</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Many messages left (neutral)</p>
                      <SystemMessage
                        variant="action"
                        fill
                        cta={{ label: "Sign In", onClick: () => {} }}
                        className="text-xs py-1.5 pr-1.5 pl-2.5"
                      >
                        <strong>8</strong> free messages left. Sign in for more!
                      </SystemMessage>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Low messages (warning)</p>
                      <SystemMessage
                        variant="action"
                        fill
                        cta={{ label: "Sign In", onClick: () => {} }}
                        className={cn(
                          "text-xs py-1.5 pr-1.5 pl-2.5",
                          "border-orange-500/40 bg-orange-500/5"
                        )}
                      >
                        <strong>2</strong> free messages left. Sign in for more!
                      </SystemMessage>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-2">No messages (urgent)</p>
                      <SystemMessage
                        variant="action"
                        fill
                        cta={{ label: "Sign In", onClick: () => {} }}
                        className={cn(
                          "text-xs py-1.5 pr-1.5 pl-2.5",
                          "border-red-500/40 bg-red-500/5"
                        )}
                      >
                        Free limit reached. Sign in to continue!
                      </SystemMessage>
                    </div>
                  </div>
                </div>

                {/* Chat Card Shadow Depth */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Chat Card Shadow (Canvas State)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Canvas closed */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Canvas closed (subtle)</p>
                      <div className="h-32 rounded-3xl bg-black/50 backdrop-blur-sm border border-border/50 shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-4">
                        <p className="text-xs text-muted-foreground">Full-width chat</p>
                      </div>
                    </div>

                    {/* Canvas open */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Canvas open (lifted)</p>
                      <div className="h-32 rounded-3xl bg-black/50 backdrop-blur-sm border border-border/50 shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-4">
                        <p className="text-xs text-muted-foreground">Split-panel mode</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm">
                  <strong className="text-blue-600 dark:text-blue-400">Why:</strong> These subtle polish touches create a more responsive, premium feel. Urgency gradient encourages conversion, shadow depth clarifies spatial relationships.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Implementation Notes */}
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-green-600 dark:text-green-400">Implementation Impact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold mb-1">High Impact, Low Effort</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Assistant message background</li>
                  <li>Action button opacity</li>
                  <li>Guest banner urgency</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Medium Impact</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Context-aware placeholders</li>
                  <li>Reasoning timer pulse</li>
                  <li>Canvas shadow transitions</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Polish Details</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Button micro-interactions</li>
                  <li>Message spacing</li>
                  <li>Scroll button auto-hide</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
