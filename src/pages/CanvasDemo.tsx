import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye, Code, Copy, X, Maximize2, RefreshCw,
  Download, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * CanvasDemo - Side-by-side comparison of current vs proposed canvas UI
 *
 * This demo page helps visualize the UI changes before implementing them.
 *
 * Design Decisions:
 * - Sharp corners (rounded-none) is a canvas-specific UX choice to create visual
 *   distinction between the artifact panel and the chat interface (which uses rounded-lg)
 * - This is NOT a system-wide design change
 * - The design closely mirrors Claude's canvas interface
 */
export default function CanvasDemo() {
  const [currentView, setCurrentView] = useState<'preview' | 'code'>('preview');
  const [proposedView, setProposedView] = useState<'preview' | 'code'>('preview');
  const [selectedOption, setSelectedOption] = useState<'glass' | 'minimal' | 'hybrid'>('hybrid');

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Canvas UI Redesign Demo</h1>
          <p className="text-muted-foreground">
            Side-by-side comparison: Current implementation vs Claude's canvas design
          </p>
          <Button asChild>
            <Link to="/canvas-live-demo" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              View Live Demo in Vana UI
            </Link>
          </Button>
        </div>

        {/* UI Cohesiveness Options */}
        <div className="border rounded-lg p-6 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">UI Cohesiveness Options</h2>
            <p className="text-muted-foreground">
              Solving the visual disconnect between chat panel (rounded glass-morphic) and canvas panel (square minimalistic)
            </p>
          </div>

          {/* Option Selector */}
          <div className="flex justify-center gap-2">
            <Button
              variant={selectedOption === 'glass' ? 'default' : 'outline'}
              onClick={() => setSelectedOption('glass')}
            >
              Option 1: Glass-Morphic
            </Button>
            <Button
              variant={selectedOption === 'minimal' ? 'default' : 'outline'}
              onClick={() => setSelectedOption('minimal')}
            >
              Option 2: Minimal
            </Button>
            <Button
              variant={selectedOption === 'hybrid' ? 'default' : 'outline'}
              onClick={() => setSelectedOption('hybrid')}
              className="gap-2"
            >
              Option 3: Hybrid
              <Badge variant="secondary" className="bg-green-500/20 text-green-600 border-green-500/30">
                Recommended
              </Badge>
            </Button>
          </div>

          {/* Option 1: Unified Glass-Morphic */}
          {selectedOption === 'glass' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Option 1: Unified Glass-Morphic Design</h3>
                <p className="text-sm text-muted-foreground">Apply chat's rounded glass aesthetic to the entire interface</p>
              </div>

              {/* Mockup */}
              <div className="border rounded-lg overflow-hidden bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950 h-[500px] p-6">
                <div className="flex h-full gap-6">
                  {/* Chat Panel - Glass */}
                  <div className="flex-1 flex flex-col rounded-3xl bg-black/70 backdrop-blur-sm border border-white/10 shadow-2xl overflow-hidden">
                    <div className="border-b border-white/10 bg-white/5 px-4 py-3">
                      <p className="text-white/90 text-sm font-medium">Chat Panel</p>
                    </div>
                    <div className="flex-1 p-4 space-y-3">
                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 ml-auto w-fit max-w-[80%]">
                        <p className="text-white/90 text-sm">User message</p>
                      </div>
                      <div className="bg-white/5 backdrop-blur-sm rounded-2xl px-4 py-2 w-fit max-w-[80%]">
                        <p className="text-white/90 text-sm">Assistant response</p>
                      </div>
                    </div>
                  </div>

                  {/* Canvas Panel - Glass */}
                  <div className="w-[45%] flex flex-col rounded-3xl bg-black/70 backdrop-blur-sm border border-white/10 shadow-2xl overflow-hidden">
                    <div className="border-b border-white/10 bg-white/5 px-4 py-3">
                      <p className="text-white/90 text-sm font-medium">Canvas Panel</p>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-primary/30 rounded-2xl mx-auto flex items-center justify-center mb-2">
                          <Eye className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-white/70 text-sm">Artifact Preview</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-2 text-sm">Key Characteristics</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li><code className="text-xs bg-muted px-1 rounded">rounded-3xl</code> on both panels</li>
                    <li><code className="text-xs bg-muted px-1 rounded">bg-black/70 backdrop-blur-sm</code> glass effect</li>
                    <li><code className="text-xs bg-muted px-1 rounded">border-white/10</code> subtle borders</li>
                    <li>Unified visual language throughout</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="font-medium text-green-600 text-sm mb-1">Pros</p>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                      <li>Complete visual consistency</li>
                      <li>Modern, polished aesthetic</li>
                      <li>Clear panel separation</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="font-medium text-red-600 text-sm mb-1">Cons</p>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                      <li>Rounded corners waste screen space</li>
                      <li>Less content area for artifacts</li>
                      <li>May feel too decorative for tools</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Option 2: Minimal Everywhere */}
          {selectedOption === 'minimal' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Option 2: Minimal Everywhere</h3>
                <p className="text-sm text-muted-foreground">Reduce chat to minimal styling, maximize screen real estate</p>
              </div>

              {/* Mockup */}
              <div className="border rounded-lg overflow-hidden bg-[#1a1a1a] h-[500px] p-6">
                <div className="flex h-full gap-0">
                  {/* Chat Panel - Minimal */}
                  <div className="flex-1 flex flex-col bg-[#212121] border-r border-gray-800 overflow-hidden">
                    <div className="border-b border-gray-800 bg-[#2a2a2a] px-4 py-3">
                      <p className="text-gray-200 text-sm font-medium">Chat Panel</p>
                    </div>
                    <div className="flex-1 p-4 space-y-3">
                      <div className="bg-[#3a3a3a] rounded-lg px-4 py-2 ml-auto w-fit max-w-[80%]">
                        <p className="text-gray-200 text-sm">User message</p>
                      </div>
                      <div className="bg-[#2a2a2a] rounded-lg px-4 py-2 w-fit max-w-[80%]">
                        <p className="text-gray-200 text-sm">Assistant response</p>
                      </div>
                    </div>
                  </div>

                  {/* Canvas Panel - Minimal */}
                  <div className="w-[45%] flex flex-col bg-[#1e1e1e] overflow-hidden">
                    <div className="border-b border-gray-800 bg-[#2d2d2d] px-4 py-3">
                      <p className="text-gray-200 text-sm font-medium">Canvas Panel</p>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-primary/20 rounded mx-auto flex items-center justify-center mb-2">
                          <Eye className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-gray-400 text-sm">Artifact Preview</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-2 text-sm">Key Characteristics</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li><code className="text-xs bg-muted px-1 rounded">rounded-none</code> or minimal rounding</li>
                    <li>Solid backgrounds, no blur effects</li>
                    <li>Sharp borders between panels</li>
                    <li>Maximum content area</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="font-medium text-green-600 text-sm mb-1">Pros</p>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                      <li>Maximum screen real estate</li>
                      <li>Clean, professional look</li>
                      <li>Better for productivity tools</li>
                      <li>Follows IDE/editor conventions</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="font-medium text-red-600 text-sm mb-1">Cons</p>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                      <li>May feel too stark/utilitarian</li>
                      <li>Loses current brand aesthetic</li>
                      <li>Less visual polish</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Option 3: Hybrid Approach (Recommended) */}
          {selectedOption === 'hybrid' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Option 3: Hybrid Approach</h3>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                    Recommended
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Keep chat's rounded glass on left, subtle rounding on canvas right edge only</p>
              </div>

              {/* Mockup */}
              <div className="border rounded-lg overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-950 to-blue-950 h-[500px] p-6">
                <div className="flex h-full gap-0">
                  {/* Chat Panel - Glass with rounded left */}
                  <div className="flex-1 flex flex-col rounded-tl-3xl rounded-bl-3xl bg-black/70 backdrop-blur-sm border-l border-t border-b border-white/10 shadow-2xl overflow-hidden">
                    <div className="border-b border-white/10 bg-white/5 px-4 py-3">
                      <p className="text-white/90 text-sm font-medium">Chat Panel</p>
                      <p className="text-white/50 text-xs mt-1">rounded-tl-3xl rounded-bl-3xl</p>
                    </div>
                    <div className="flex-1 p-4 space-y-3">
                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 ml-auto w-fit max-w-[80%]">
                        <p className="text-white/90 text-sm">User message</p>
                      </div>
                      <div className="bg-white/5 backdrop-blur-sm rounded-2xl px-4 py-2 w-fit max-w-[80%]">
                        <p className="text-white/90 text-sm">Assistant response</p>
                      </div>
                    </div>
                  </div>

                  {/* Canvas Panel - Subtle glass with rounded right */}
                  <div className="w-[45%] flex flex-col rounded-tr-lg rounded-br-lg bg-black/50 backdrop-blur-sm border-r border-t border-b border-white/10 shadow-2xl overflow-hidden">
                    <div className="border-b border-white/10 bg-black/40 backdrop-blur-sm px-4 py-3">
                      <p className="text-white/90 text-sm font-medium">Canvas Panel</p>
                      <p className="text-white/50 text-xs mt-1">rounded-tr-lg rounded-br-lg</p>
                    </div>
                    <div className="flex-1 flex items-center justify-center bg-[#1e1e1e]/80">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-primary/30 rounded-lg mx-auto flex items-center justify-center mb-2">
                          <Eye className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-white/70 text-sm">Artifact Preview</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-2 text-sm">Key Characteristics</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Chat: <code className="text-xs bg-muted px-1 rounded">rounded-tl-3xl rounded-bl-3xl</code></li>
                    <li>Canvas: <code className="text-xs bg-muted px-1 rounded">rounded-tr-lg rounded-br-lg</code></li>
                    <li>Canvas header: <code className="text-xs bg-muted px-1 rounded">bg-black/50 backdrop-blur-sm</code></li>
                    <li>Creates visual "bookends" effect</li>
                    <li>Maintains distinct tool vs chat areas</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="font-medium text-green-600 text-sm mb-1">Pros</p>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                      <li>Best of both worlds approach</li>
                      <li>Keeps brand's glass aesthetic</li>
                      <li>Maximizes canvas content area</li>
                      <li>Visual hierarchy: chat (decorative) vs canvas (functional)</li>
                      <li>Subtle rounding prevents harsh edge</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="font-medium text-yellow-600 text-sm mb-1">Considerations</p>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                      <li>Requires careful balance of styling</li>
                      <li>Different rounding amounts per panel</li>
                      <li>May need slight gap between panels</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Implementation Example */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="font-medium text-primary mb-2 text-sm">Implementation Example</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-muted-foreground mb-2">Chat Container:</p>
                    <pre className="bg-muted/50 p-2 rounded overflow-x-auto">
                      <code>{`className="
  rounded-tl-3xl
  rounded-bl-3xl
  bg-black/70
  backdrop-blur-sm
  border-l border-t border-b
  border-white/10
"`}</code>
                    </pre>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-2">Canvas Container:</p>
                    <pre className="bg-muted/50 p-2 rounded overflow-x-auto">
                      <code>{`className="
  rounded-tr-lg
  rounded-br-lg
  bg-black/50
  backdrop-blur-sm
  border-r border-t border-b
  border-white/10
"`}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* CURRENT DESIGN */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Current</Badge>
              <span className="text-sm text-muted-foreground">Your existing implementation</span>
            </div>

            {/* Current Artifact Container */}
            <div className="flex flex-col overflow-hidden rounded-lg border bg-background shadow-sm h-[500px]">
              {/* Current Header */}
              <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">Interactive Dashboard</p>
                  <Badge variant="outline" className="text-xs">react</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="size-8 p-0 text-muted-foreground hover:text-foreground">
                    <Copy className="size-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="size-8 p-0 text-muted-foreground hover:text-foreground">
                    <Download className="size-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="size-8 p-0 text-muted-foreground hover:text-foreground">
                    <Maximize2 className="size-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="size-8 p-0 text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Current Tabs */}
              <div className="w-full border-b bg-muted/30">
                <div className="flex">
                  <button
                    className={cn(
                      "px-4 py-2 text-sm font-medium transition-colors",
                      currentView === 'preview'
                        ? "bg-background text-foreground border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setCurrentView('preview')}
                  >
                    Preview
                  </button>
                  <button
                    className={cn(
                      "px-4 py-2 text-sm font-medium transition-colors",
                      currentView === 'code'
                        ? "bg-background text-foreground border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setCurrentView('code')}
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Current URL Bar */}
              <div className="flex items-center gap-1 border-b p-2 bg-card">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <input
                  type="text"
                  className="h-8 flex-1 text-sm bg-muted/50 border rounded px-2"
                  placeholder="Enter URL..."
                  value="about:blank"
                  readOnly
                />
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Current Preview Area */}
              <div className="flex-1 bg-muted/20 flex items-center justify-center">
                {currentView === 'preview' ? (
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-primary/20 rounded-lg mx-auto flex items-center justify-center">
                      <Eye className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">Preview Content</p>
                  </div>
                ) : (
                  <div className="w-full h-full p-4 font-mono text-sm bg-muted/30">
                    <pre className="text-muted-foreground">
{`export default function Dashboard() {
  return (
    <div className="p-4">
      <h1>Dashboard</h1>
    </div>
  );
}`}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Current Design Notes */}
            <div className="bg-muted/30 rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium">Current characteristics:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li><code className="text-xs bg-muted px-1 rounded">rounded-lg</code> corners (8px)</li>
                <li><code className="text-xs bg-muted px-1 rounded">shadow-sm</code> subtle shadow</li>
                <li>Translucent header <code className="text-xs bg-muted px-1 rounded">bg-muted/50</code></li>
                <li>Text-based tab labels below header</li>
                <li>URL input bar for web preview</li>
                <li>Title + badge in header</li>
              </ul>
            </div>
          </div>

          {/* PROPOSED DESIGN (Claude Canvas Style) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge>Proposed</Badge>
              <span className="text-sm text-muted-foreground">Claude's canvas design</span>
            </div>

            {/* Proposed Artifact Container - Matches Claude exactly */}
            <div className="flex flex-col overflow-hidden border bg-background shadow-md h-[500px]">
              {/* Proposed Header - Claude style */}
              <div className="flex items-center justify-between border-b bg-[#2d2d2d] px-3 py-2">
                <div className="flex items-center gap-3">
                  {/* Segmented Toggle Pill - Eye/Code icons */}
                  <div className="flex items-center bg-[#404040] rounded-full p-0.5">
                    <button
                      onClick={() => setProposedView('preview')}
                      className={cn(
                        "flex items-center justify-center size-7 rounded-full transition-all",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        proposedView === 'preview'
                          ? "bg-[#5a5a5a] text-white"
                          : "text-gray-400 hover:text-gray-200"
                      )}
                      aria-label="Preview mode"
                      aria-pressed={proposedView === 'preview'}
                    >
                      <Eye className="size-4" />
                    </button>
                    <button
                      onClick={() => setProposedView('code')}
                      className={cn(
                        "flex items-center justify-center size-7 rounded-full transition-all",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        proposedView === 'code'
                          ? "bg-[#5a5a5a] text-white"
                          : "text-gray-400 hover:text-gray-200"
                      )}
                      aria-label="Code mode"
                      aria-pressed={proposedView === 'code'}
                    >
                      <Code className="size-4" />
                    </button>
                  </div>

                  {/* Version Indicator */}
                  <div className="flex items-center gap-1.5 text-sm text-gray-400">
                    <span className="text-gray-200">v2</span>
                    <span>•</span>
                    <span>Latest</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Refresh */}
                  <button
                    className="flex items-center justify-center size-8 rounded text-gray-400 hover:text-gray-200 hover:bg-[#404040] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Refresh preview"
                  >
                    <RefreshCw className="size-4" />
                  </button>

                  {/* Download */}
                  <button
                    className="flex items-center justify-center size-8 rounded text-gray-400 hover:text-gray-200 hover:bg-[#404040] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Download artifact"
                  >
                    <Download className="size-4" />
                  </button>

                  {/* Expand/Maximize */}
                  <button
                    className="flex items-center justify-center size-8 rounded text-gray-400 hover:text-gray-200 hover:bg-[#404040] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Expand canvas"
                  >
                    <Maximize2 className="size-4" />
                  </button>

                  {/* Close */}
                  <button
                    className="flex items-center justify-center size-8 rounded text-gray-400 hover:text-gray-200 hover:bg-[#404040] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Close canvas"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* NO URL BAR - Content directly below header */}

              {/* Proposed Preview Area */}
              <div className="flex-1 bg-background flex items-center justify-center">
                {proposedView === 'preview' ? (
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-primary/20 rounded-lg mx-auto flex items-center justify-center">
                      <Eye className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">Preview Content</p>
                    <p className="text-xs text-muted-foreground/60">No URL bar - cleaner interface</p>
                  </div>
                ) : (
                  <div className="w-full h-full p-4 font-mono text-sm bg-muted/10">
                    <pre className="text-muted-foreground">
{`export default function Dashboard() {
  return (
    <div className="p-4">
      <h1>Dashboard</h1>
    </div>
  );
}`}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Proposed Design Notes */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium text-primary">Proposed changes (Claude style):</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Sharp corners <code className="text-xs bg-muted px-1 rounded">rounded-none</code> (canvas-specific)</li>
                <li>Dark header bar <code className="text-xs bg-muted px-1 rounded">bg-[#2d2d2d]</code></li>
                <li><strong>Segmented pill toggle</strong> with Eye/Code icons in header</li>
                <li><strong>Version indicator</strong> "v2 • Latest"</li>
                <li><strong>No URL bar</strong> - removed entirely</li>
                <li>Icon-only action buttons (refresh, download, expand, close)</li>
                <li><code className="text-xs bg-muted px-1 rounded">aria-label</code> + <code className="text-xs bg-muted px-1 rounded">aria-pressed</code> for a11y</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Component Details */}
        <div className="border rounded-lg p-6 space-y-6">
          <h2 className="text-xl font-semibold">Key Design Elements</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Segmented Toggle */}
            <div className="space-y-3">
              <h3 className="font-medium">Segmented Toggle Pill</h3>
              <div className="flex flex-col gap-3 p-4 border rounded-lg bg-[#2d2d2d]">
                <div className="flex items-center bg-[#404040] rounded-full p-0.5 w-fit">
                  <button className="flex items-center justify-center size-7 rounded-full bg-[#5a5a5a] text-white">
                    <Eye className="size-4" />
                  </button>
                  <button className="flex items-center justify-center size-7 rounded-full text-gray-400">
                    <Code className="size-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-400">Icon-only toggle, rounded-full pill</p>
              </div>
            </div>

            {/* Version Badge */}
            <div className="space-y-3">
              <h3 className="font-medium">Version Indicator</h3>
              <div className="flex flex-col gap-3 p-4 border rounded-lg bg-[#2d2d2d]">
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-gray-200">v2</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-400">Latest</span>
                </div>
                <p className="text-xs text-gray-400">Shows version + status inline</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <h3 className="font-medium">Header Actions</h3>
              <div className="flex flex-col gap-3 p-4 border rounded-lg bg-[#2d2d2d]">
                <div className="flex items-center gap-1">
                  <button className="size-8 rounded flex items-center justify-center text-gray-400 hover:bg-[#404040]">
                    <RefreshCw className="size-4" />
                  </button>
                  <button className="size-8 rounded flex items-center justify-center text-gray-400 hover:bg-[#404040]">
                    <Download className="size-4" />
                  </button>
                  <button className="size-8 rounded flex items-center justify-center text-gray-400 hover:bg-[#404040]">
                    <Maximize2 className="size-4" />
                  </button>
                  <button className="size-8 rounded flex items-center justify-center text-gray-400 hover:bg-[#404040]">
                    <X className="size-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-400">Refresh, download, expand, close</p>
              </div>
            </div>
          </div>
        </div>

        {/* Full Page Layout Mockup */}
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Full Page Layout Mockup</h2>
          <p className="text-sm text-muted-foreground">How the canvas fits within the overall chat interface</p>

          {/* Mockup Container */}
          <div className="border rounded-lg overflow-hidden bg-[#1a1a1a] h-[600px]">
            <div className="flex h-full">

              {/* Sidebar */}
              <div className="w-14 bg-[#1a1a1a] border-r border-gray-800 flex flex-col items-center py-3 gap-3">
                {/* Logo placeholder */}
                <div className="size-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                  V
                </div>
                {/* Nav icons */}
                <div className="flex-1 flex flex-col items-center gap-2 mt-4">
                  <div className="size-9 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400">
                    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="size-9 rounded-lg hover:bg-gray-800 flex items-center justify-center text-gray-500">
                    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="size-9 rounded-lg hover:bg-gray-800 flex items-center justify-center text-gray-500">
                    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                {/* User avatar */}
                <div className="size-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-xs">
                  N
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 flex flex-col bg-[#212121] min-w-0">
                {/* Chat Header */}
                <div className="h-12 border-b border-gray-800 flex items-center px-4">
                  <span className="text-gray-200 text-sm font-medium">Slime Soccer Game</span>
                  <svg className="size-4 ml-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="bg-[#3a3a3a] rounded-2xl px-4 py-2 max-w-[80%]">
                      <p className="text-gray-200 text-sm">make the blobs eyes change depending on what direction you are traveling</p>
                    </div>
                  </div>

                  {/* Assistant message with artifact reference */}
                  <div className="flex justify-start">
                    <div className="max-w-[80%] space-y-3">
                      {/* Artifact card */}
                      <div className="bg-[#2a2a2a] border border-gray-700 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded bg-gray-700 flex items-center justify-center">
                            <Eye className="size-4 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-gray-200 text-sm font-medium">Slime Soccer Game</p>
                            <p className="text-gray-500 text-xs">Interactive artifact · Version 2</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm">Done! Now the slimes have expressive eyes that react to their movement.</p>
                    </div>
                  </div>
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-800">
                  <div className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Reply..."
                        className="flex-1 bg-transparent text-gray-200 text-sm placeholder-gray-500 outline-none"
                      />
                      <button className="size-8 rounded-lg bg-primary flex items-center justify-center text-white">
                        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Canvas Panel - New Design */}
              <div className="w-[45%] flex flex-col border-l border-gray-800">
                {/* Canvas Header - Dark style */}
                <div className="flex items-center justify-between bg-[#2d2d2d] px-3 py-2 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    {/* Segmented Toggle Pill */}
                    <div className="flex items-center bg-[#404040] rounded-full p-0.5">
                      <button className="flex items-center justify-center size-7 rounded-full bg-[#5a5a5a] text-white">
                        <Eye className="size-4" />
                      </button>
                      <button className="flex items-center justify-center size-7 rounded-full text-gray-400">
                        <Code className="size-4" />
                      </button>
                    </div>
                    {/* Version */}
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="text-gray-200">v2</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-500">Latest</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="size-8 rounded flex items-center justify-center text-gray-400 hover:bg-[#404040]">
                      <RefreshCw className="size-4" />
                    </button>
                    <button className="size-8 rounded flex items-center justify-center text-gray-400 hover:bg-[#404040]">
                      <Download className="size-4" />
                    </button>
                    <button className="size-8 rounded flex items-center justify-center text-gray-400 hover:bg-[#404040]">
                      <Maximize2 className="size-4" />
                    </button>
                    <button className="size-8 rounded flex items-center justify-center text-gray-400 hover:bg-[#404040]">
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Canvas Content */}
                <div className="flex-1 bg-[#1e1e1e] flex items-center justify-center">
                  <div className="text-center space-y-4">
                    {/* Game preview placeholder */}
                    <div className="w-64 h-40 bg-gradient-to-b from-blue-900 to-blue-950 rounded-lg mx-auto flex items-center justify-center relative overflow-hidden">
                      {/* Simple game representation */}
                      <div className="absolute bottom-4 left-8 size-8 rounded-full bg-green-400"></div>
                      <div className="absolute bottom-4 right-8 size-8 rounded-full bg-red-400"></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-4 rounded-full bg-white"></div>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-600"></div>
                    </div>
                    <p className="text-gray-400 text-sm">Slime Soccer Game</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Layout Notes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium mb-1">Sidebar</p>
              <p className="text-xs text-muted-foreground">Collapsed icon-only nav, auto-collapses when canvas opens on smaller screens</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium mb-1">Chat Area</p>
              <p className="text-xs text-muted-foreground">Flexible width, shows artifact cards inline with messages</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm font-medium text-primary mb-1">Canvas Panel (new)</p>
              <p className="text-xs text-muted-foreground">Sharp corners, dark header with segmented toggle, no URL bar</p>
            </div>
          </div>
        </div>

        {/* Implementation Phases */}
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Implementation Phases</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 space-y-2">
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Phase 1</Badge>
              <h3 className="font-medium">Container Styling</h3>
              <p className="text-sm text-muted-foreground">Sharp corners, shadow-md, dark header bar</p>
              <p className="text-xs text-green-600">Low risk - CSS only</p>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Phase 2</Badge>
              <h3 className="font-medium">Remove URL Bar</h3>
              <p className="text-sm text-muted-foreground">Delete WebPreviewUrl + dead code cleanup (done!)</p>
              <p className="text-xs text-yellow-600">Low-Medium risk</p>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">Phase 3</Badge>
              <h3 className="font-medium">Header Redesign</h3>
              <p className="text-sm text-muted-foreground">Segmented pill toggle, version indicator, action buttons</p>
              <p className="text-xs text-orange-600">Medium risk - component refactor</p>
            </div>
          </div>

          {/* Accessibility Notes */}
          <div className="mt-6 p-4 border rounded-lg bg-muted/30">
            <h3 className="font-medium mb-2">Accessibility Implementation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <ul className="list-disc list-inside space-y-1">
                <li><code className="text-xs bg-muted px-1 rounded">aria-pressed</code> on toggle buttons</li>
                <li><code className="text-xs bg-muted px-1 rounded">aria-label</code> on icon-only buttons</li>
                <li><code className="text-xs bg-muted px-1 rounded">focus-visible:ring-2</code> for keyboard focus</li>
              </ul>
              <ul className="list-disc list-inside space-y-1">
                <li>Keyboard navigation (Tab between controls)</li>
                <li>Space/Enter to toggle view mode</li>
                <li>Clear visual focus indicators</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => window.history.back()}>
            ← Back to Chat
          </Button>
        </div>
      </div>
    </div>
  );
}
