import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Message, MessageAvatar, MessageContent } from "@/components/prompt-kit/message";
import { PromptInput, PromptInputTextarea } from "@/components/prompt-kit/prompt-input";
import { WebPreview, WebPreviewBody } from "@/components/ai-elements/web-preview";
import { ArrowLeft, Eye, Code, RefreshCw, Download, Maximize2, X, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

/**
 * CanvasLiveDemo - Interactive demo showing proposed canvas redesign in Vana's actual UI
 *
 * SCOPE: Canvas/Artifact panel ONLY - Chat UI is unchanged
 *
 * This page demonstrates the Claude-inspired canvas design. The chat panel is shown
 * for context only and will NOT be modified in the actual implementation.
 *
 * Files to modify (canvas only):
 * - ArtifactContainer.tsx - Header styling, segmented toggle, version indicator
 * - ArtifactRenderer.tsx - Container styling (sharp corners)
 *
 * Files NOT to modify:
 * - ChatInterface.tsx, ChatSidebar.tsx, Message components, etc.
 *
 * Key Design Changes (canvas panel only):
 * 1. Sharp corners (no rounded-lg on canvas container)
 * 2. Dark header bar (bg-[#2d2d2d])
 * 3. Segmented pill toggle (Eye/Code icons)
 * 4. No URL bar (already removed)
 * 5. Icon-only action buttons
 */

// Simple example artifact - an interactive counter
const DEMO_ARTIFACT_CODE = `
function App() {
  const [count, setCount] = React.useState(0);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      gap: '1.5rem',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 600, margin: 0 }}>
        Interactive Counter
      </h1>
      <div style={{
        fontSize: '4rem',
        fontWeight: 700,
        background: 'rgba(255,255,255,0.2)',
        padding: '1rem 2rem',
        borderRadius: '1rem',
        minWidth: '150px',
        textAlign: 'center'
      }}>
        {count}
      </div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={() => setCount(c => c - 1)}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1.25rem',
            fontWeight: 600,
            background: 'rgba(255,255,255,0.2)',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '0.5rem',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
        >
          − Decrease
        </button>
        <button
          onClick={() => setCount(c => c + 1)}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1.25rem',
            fontWeight: 600,
            background: 'rgba(255,255,255,0.9)',
            border: 'none',
            borderRadius: '0.5rem',
            color: '#764ba2',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'white'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.9)'}
        >
          + Increase
        </button>
      </div>
      <p style={{ opacity: 0.8, fontSize: '0.875rem' }}>
        Click the buttons to change the count
      </p>
    </div>
  );
}
`.trim();

// Generate the full HTML for the iframe
const generateArtifactHTML = (code: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${code}
    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>
`;

export default function CanvasLiveDemo() {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [artifactKey, setArtifactKey] = useState(0);

  // Refresh artifact
  const handleRefresh = () => {
    setArtifactKey(prev => prev + 1);
  };

  // Download artifact
  const handleDownload = () => {
    const html = generateArtifactHTML(DEMO_ARTIFACT_CODE);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'interactive-counter.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/canvas-demo" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Comparison
            </Link>
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">Canvas Live Demo</h1>
            <Badge variant="secondary" className="text-xs">Proposed Design</Badge>
          </div>
        </div>
      </header>

      {/* Main Layout - Sidebar + Chat + Canvas */}
      <SidebarProvider defaultOpen={false}>
        <div className="flex min-h-[calc(100vh-56px)]">
          {/* Collapsed Sidebar */}
          <ChatSidebar
            sessions={[]}
            currentSessionId={undefined}
            onSessionSelect={() => {}}
            onNewChat={() => {}}
            onDeleteSession={async () => {}}
            isLoading={false}
          />

          <SidebarInset className="flex-1">
            <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-56px)]">
              {/* Chat Panel - UNCHANGED (for context only) */}
              <ResizablePanel
                id="chat-panel"
                order={1}
                defaultSize={30}
                minSize={20}
                maxSize={50}
                className="flex flex-col min-w-[280px] relative">
                {/* Unchanged indicator */}
                <div className="absolute top-16 left-4 z-10">
                  <Badge variant="outline" className="bg-background/90 text-xs text-muted-foreground">
                    Chat UI unchanged
                  </Badge>
                </div>
                {/* Chat Header */}
                <div className="h-12 border-b flex items-center px-4 bg-muted/30">
                  <span className="text-sm font-medium">New Conversation</span>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  {/* User message */}
                  <Message className="justify-end gap-3">
                    <MessageContent className="bg-primary text-primary-foreground max-w-[80%]">
                      Create an interactive counter with a colorful gradient background
                    </MessageContent>
                    <MessageAvatar fallback="U" className="bg-muted" />
                  </Message>

                  {/* Assistant message */}
                  <Message className="gap-3">
                    <MessageAvatar fallback="V" className="bg-gradient-to-br from-orange-400 to-orange-600 text-white" />
                    <div className="flex-1 space-y-3 max-w-[80%]">
                      {/* Artifact card */}
                      <div className="bg-muted/50 border rounded-lg p-3 cursor-pointer hover:bg-muted/70 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded bg-primary/10 flex items-center justify-center">
                            <Eye className="size-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Interactive Counter</p>
                            <p className="text-xs text-muted-foreground">React component · v1</p>
                          </div>
                        </div>
                      </div>
                      <MessageContent className="bg-muted/50 p-0">
                        <p className="text-sm px-4 py-2">
                          Done! I've created an interactive counter with a purple-pink gradient background.
                          The counter displays the current value and has buttons to increase or decrease it.
                          Click the buttons to try it out! ✨
                        </p>
                      </MessageContent>
                    </div>
                  </Message>
                </div>

                {/* Input Area */}
                <div className="p-4 border-t">
                  <PromptInput className="bg-muted/30 border rounded-xl">
                    <PromptInputTextarea placeholder="Reply to Vana..." disabled />
                    <div className="flex items-center justify-end p-2">
                      <Button size="sm" className="rounded-lg" disabled>
                        <Send className="size-4" />
                      </Button>
                    </div>
                  </PromptInput>
                </div>
              </ResizablePanel>

              {/* Resizable Handle - matches actual implementation */}
              <ResizableHandle withHandle className="hidden md:flex" />

              {/* Canvas Panel - PROPOSED DESIGN */}
              <ResizablePanel
                id="canvas-panel"
                order={2}
                defaultSize={70}
                minSize={50}
                className="flex flex-col min-w-[400px] bg-background relative">
                {/* Proposed changes indicator */}
                <div className="absolute top-14 right-4 z-20">
                  <Badge className="bg-primary text-primary-foreground text-xs shadow-lg">
                    ← Proposed Changes
                  </Badge>
                </div>
                {/* Canvas Header - Dark style with segmented toggle */}
                <div className="flex items-center justify-between h-12 bg-[#2d2d2d] px-3 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    {/* Segmented Toggle Pill - Eye/Code icons */}
                    <div className="flex items-center bg-[#404040] rounded-full p-0.5">
                      <button
                        onClick={() => setViewMode('preview')}
                        className={cn(
                          "flex items-center justify-center size-7 rounded-full transition-all",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                          viewMode === 'preview'
                            ? "bg-[#5a5a5a] text-white"
                            : "text-gray-400 hover:text-gray-200"
                        )}
                        aria-label="Preview mode"
                        aria-pressed={viewMode === 'preview'}
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('code')}
                        className={cn(
                          "flex items-center justify-center size-7 rounded-full transition-all",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                          viewMode === 'code'
                            ? "bg-[#5a5a5a] text-white"
                            : "text-gray-400 hover:text-gray-200"
                        )}
                        aria-label="Code mode"
                        aria-pressed={viewMode === 'code'}
                      >
                        <Code className="size-4" />
                      </button>
                    </div>

                    {/* Version Indicator */}
                    <div className="flex items-center gap-1.5 text-sm text-gray-400">
                      <span className="text-gray-200">v1</span>
                      <span>•</span>
                      <span>Latest</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleRefresh}
                      className="flex items-center justify-center size-8 rounded text-gray-400 hover:text-gray-200 hover:bg-[#404040] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Refresh preview"
                    >
                      <RefreshCw className="size-4" />
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center justify-center size-8 rounded text-gray-400 hover:text-gray-200 hover:bg-[#404040] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Download artifact"
                    >
                      <Download className="size-4" />
                    </button>
                    <button
                      className="flex items-center justify-center size-8 rounded text-gray-400 hover:text-gray-200 hover:bg-[#404040] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Expand canvas"
                    >
                      <Maximize2 className="size-4" />
                    </button>
                    <Link
                      to="/canvas-demo"
                      className="flex items-center justify-center size-8 rounded text-gray-400 hover:text-gray-200 hover:bg-[#404040] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Close canvas"
                    >
                      <X className="size-4" />
                    </Link>
                  </div>
                </div>

                {/* Canvas Content - No URL bar, content directly below header */}
                <div className="flex-1 bg-background">
                  {viewMode === 'preview' ? (
                    <WebPreview className="h-full rounded-none border-0">
                      <WebPreviewBody
                        key={artifactKey}
                        srcDoc={generateArtifactHTML(DEMO_ARTIFACT_CODE)}
                        className="h-full"
                      />
                    </WebPreview>
                  ) : (
                    <div className="h-full overflow-auto bg-[#1e1e1e] p-4">
                      <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap">
                        {DEMO_ARTIFACT_CODE}
                      </pre>
                    </div>
                  )}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </SidebarInset>
        </div>
      </SidebarProvider>

      {/* Design Notes Overlay */}
      <div className="fixed bottom-4 right-4 max-w-sm bg-card/95 backdrop-blur border rounded-lg shadow-lg p-4 space-y-3">
        <h3 className="font-medium text-sm flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          Canvas Panel Changes Only
        </h3>
        <p className="text-xs text-muted-foreground">
          Only the canvas/artifact panel is being redesigned. Chat UI remains unchanged.
        </p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>✓ Sharp corners on canvas container</li>
          <li>✓ Dark header bar (bg-[#2d2d2d])</li>
          <li>✓ Segmented pill toggle with Eye/Code icons</li>
          <li>✓ Version indicator (v1 • Latest)</li>
          <li>✓ No URL bar - cleaner interface</li>
          <li>✓ Icon-only action buttons with hover states</li>
          <li>✓ Proper a11y (aria-label, aria-pressed)</li>
          <li>✓ Resizable panels preserved (drag handle)</li>
        </ul>
        <div className="pt-1 border-t text-xs text-muted-foreground">
          <strong>Files to modify:</strong> ArtifactContainer.tsx, ArtifactRenderer.tsx
        </div>
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link to="/canvas-demo">View Side-by-Side Comparison</Link>
        </Button>
      </div>
    </div>
  );
}
