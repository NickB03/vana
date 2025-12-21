import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye, Code, Copy, X, ExternalLink, Maximize2, RefreshCw,
  ChevronDown, MoreVertical, Download, FileCode
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * CanvasDemo - Side-by-side comparison of current vs proposed canvas UI
 *
 * This demo page helps visualize the UI changes before implementing them.
 */
export default function CanvasDemo() {
  const [currentView, setCurrentView] = useState<'preview' | 'code'>('preview');
  const [proposedView, setProposedView] = useState<'preview' | 'code'>('preview');

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Canvas UI Redesign Demo</h1>
          <p className="text-muted-foreground">
            Side-by-side comparison: Current implementation vs Claude's design
          </p>
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
                    <ExternalLink className="size-4" />
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
                <li>More toolbar icons visible</li>
              </ul>
            </div>
          </div>

          {/* PROPOSED DESIGN (Claude-style) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge>Proposed</Badge>
              <span className="text-sm text-muted-foreground">Claude's canvas design</span>
            </div>

            {/* Proposed Artifact Container */}
            <div className="flex flex-col overflow-hidden border bg-background shadow-md h-[500px]">
              {/* Proposed Header - Compact, solid background */}
              <div className="flex items-center justify-between border-b bg-background px-3 py-2">
                <div className="flex items-center gap-2">
                  {/* View Toggle Icons */}
                  <div className="flex items-center border rounded-md">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 w-7 p-0 rounded-r-none",
                        proposedView === 'preview' && "bg-muted"
                      )}
                      onClick={() => setProposedView('preview')}
                    >
                      <Eye className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 w-7 p-0 rounded-l-none border-l",
                        proposedView === 'code' && "bg-muted"
                      )}
                      onClick={() => setProposedView('code')}
                    >
                      <Code className="size-3.5" />
                    </Button>
                  </div>

                  {/* Filename */}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <FileCode className="size-3.5" />
                    <span>InteractiveDashboard</span>
                    <span className="text-muted-foreground/60">·</span>
                    <span className="text-muted-foreground/60">JSX</span>
                  </div>
                </div>

                <div className="flex items-center gap-0.5">
                  {/* Copy with dropdown indicator */}
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
                    Copy
                    <ChevronDown className="size-3" />
                  </Button>

                  {/* Refresh */}
                  <Button variant="ghost" size="sm" className="size-7 p-0 text-muted-foreground hover:text-foreground">
                    <RefreshCw className="size-3.5" />
                  </Button>

                  {/* Close */}
                  <Button variant="ghost" size="sm" className="size-7 p-0 text-muted-foreground hover:text-foreground">
                    <X className="size-3.5" />
                  </Button>
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
              <p className="font-medium text-primary">Proposed changes:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li><code className="text-xs bg-muted px-1 rounded">rounded-none</code> sharp corners</li>
                <li><code className="text-xs bg-muted px-1 rounded">shadow-md</code> more defined shadow</li>
                <li>Solid header <code className="text-xs bg-muted px-1 rounded">bg-background</code></li>
                <li>Icon toggle (Eye/Code) in header</li>
                <li><strong>No URL bar</strong> - removed entirely</li>
                <li>Compact header <code className="text-xs bg-muted px-1 rounded">py-2</code></li>
                <li>Copy button with dropdown</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Additional Comparison: Component Details */}
        <div className="border rounded-lg p-6 space-y-6">
          <h2 className="text-xl font-semibold">Component-Level Changes</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Header Comparison */}
            <div className="space-y-3">
              <h3 className="font-medium">Header Padding</h3>
              <div className="flex gap-4">
                <div className="flex-1 border rounded p-1">
                  <div className="bg-muted/50 px-4 py-3 rounded text-xs text-center">
                    Current: px-4 py-3
                  </div>
                </div>
                <div className="flex-1 border rounded p-1">
                  <div className="bg-background border px-3 py-2 rounded text-xs text-center">
                    Proposed: px-3 py-2
                  </div>
                </div>
              </div>
            </div>

            {/* Corner Radius */}
            <div className="space-y-3">
              <h3 className="font-medium">Corner Radius</h3>
              <div className="flex gap-4">
                <div className="flex-1 bg-muted/50 rounded-lg h-16 flex items-center justify-center text-xs">
                  Current: rounded-lg
                </div>
                <div className="flex-1 bg-muted/50 h-16 flex items-center justify-center text-xs border">
                  Proposed: sharp
                </div>
              </div>
            </div>

            {/* Shadow */}
            <div className="space-y-3">
              <h3 className="font-medium">Shadow Depth</h3>
              <div className="flex gap-4">
                <div className="flex-1 bg-background border rounded shadow-sm h-16 flex items-center justify-center text-xs">
                  Current: shadow-sm
                </div>
                <div className="flex-1 bg-background border rounded shadow-md h-16 flex items-center justify-center text-xs">
                  Proposed: shadow-md
                </div>
              </div>
            </div>

            {/* View Toggle */}
            <div className="space-y-3">
              <h3 className="font-medium">View Toggle</h3>
              <div className="flex gap-4">
                <div className="flex-1 border rounded p-2">
                  <div className="flex bg-muted/30 rounded">
                    <button className="px-3 py-1.5 text-xs bg-background rounded-l border-b-2 border-primary">Preview</button>
                    <button className="px-3 py-1.5 text-xs text-muted-foreground">Edit</button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 text-center">Text tabs</p>
                </div>
                <div className="flex-1 border rounded p-2">
                  <div className="flex items-center justify-center">
                    <div className="flex items-center border rounded-md">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-r-none bg-muted">
                        <Eye className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-l-none border-l">
                        <Code className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 text-center">Icon toggle</p>
                </div>
              </div>
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
              <p className="text-sm text-muted-foreground">CSS-only changes to corners, shadow, header padding</p>
              <p className="text-xs text-green-600">Low risk</p>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Phase 2</Badge>
              <h3 className="font-medium">Remove URL Bar</h3>
              <p className="text-sm text-muted-foreground">Remove WebPreviewUrl component from renderer</p>
              <p className="text-xs text-yellow-600">Low-Medium risk</p>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">Phase 3</Badge>
              <h3 className="font-medium">Header View Toggle</h3>
              <p className="text-sm text-muted-foreground">Replace tabs with icon buttons in header</p>
              <p className="text-xs text-orange-600">Medium risk</p>
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
