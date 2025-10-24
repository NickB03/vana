import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, Maximize2, Minimize2, X } from "lucide-react";
import { toast } from "sonner";
import { Markdown } from "./prompt-kit/markdown";

export type ArtifactType = "code" | "markdown" | "html";

export interface ArtifactData {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  language?: string;
}

interface ArtifactProps {
  artifact: ArtifactData;
  onClose?: () => void;
}

export const Artifact = ({ artifact, onClose }: ArtifactProps) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    toast.success("Copied to clipboard");
  };

  // Listen for errors from iframe
  useEffect(() => {
    const handleIframeError = (e: MessageEvent) => {
      if (e.data?.type === 'artifact-error') {
        setPreviewError(e.data.message);
        toast.error(`Preview error: ${e.data.message}`);
      }
    };
    window.addEventListener('message', handleIframeError);
    return () => window.removeEventListener('message', handleIframeError);
  }, []);

  // Detect libraries and inject CDNs
  const detectAndInjectLibraries = (content: string): string => {
    const cdnMap: Record<string, string[]> = {
      'chart.js': ['<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>'],
      'd3': ['<script src="https://d3js.org/d3.v7.min.js"></script>'],
      'three.js': ['<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>'],
      'alpine': ['<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.13.5/dist/cdn.min.js"></script>'],
      'gsap': ['<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>'],
      'anime': ['<script src="https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js"></script>'],
      'p5': ['<script src="https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js"></script>'],
      'particles': ['<script src="https://cdn.jsdelivr.net/npm/tsparticles@3.0.3/tsparticles.bundle.min.js"></script>'],
      'leaflet': [
        '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />',
        '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>'
      ],
      'sortable': ['<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>'],
    };

    const detectionPatterns: Record<string, RegExp> = {
      'chart.js': /new Chart\(|Chart\.register/i,
      'd3': /d3\.|from ['"]d3['"]/i,
      'three.js': /new THREE\.|from ['"]three['"]/i,
      'alpine': /x-data|x-bind|x-on|x-show|x-if/i,
      'gsap': /gsap\.|TweenMax|TimelineMax|ScrollTrigger/i,
      'anime': /anime\(\{|anime\.timeline/i,
      'p5': /createCanvas|draw\(\)|setup\(\)/i,
      'particles': /particlesJS|tsParticles/i,
      'leaflet': /L\.map\(|L\.marker\(/i,
      'sortable': /new Sortable\(/i,
    };

    const detectedLibs = new Set<string>();
    
    // Check if CDN already included
    for (const [lib, pattern] of Object.entries(detectionPatterns)) {
      if (pattern.test(content)) {
        // Check if CDN already present
        const cdnScripts = cdnMap[lib] || [];
        const alreadyIncluded = cdnScripts.some(script => content.includes(script));
        if (!alreadyIncluded) {
          detectedLibs.add(lib);
        }
      }
    }

    return Array.from(detectedLibs).flatMap(lib => cdnMap[lib] || []).join('\n');
  };

  const renderPreview = () => {
    if (artifact.type === "code" || artifact.type === "html") {
      // Create a complete HTML document for preview
      const isFullHTML = artifact.content.includes("<!DOCTYPE");
      
      const previewContent = isFullHTML
        ? artifact.content 
        : (() => {
            const injectedCDNs = detectAndInjectLibraries(artifact.content);
            return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  ${injectedCDNs}
  <style>
    body { margin: 0; padding: 0; }
  </style>
  <script>
    // Error reporting to parent
    window.addEventListener('error', (e) => {
      window.parent.postMessage({ 
        type: 'artifact-error', 
        message: e.message 
      }, '*');
    });
    
    window.addEventListener('unhandledrejection', (e) => {
      window.parent.postMessage({ 
        type: 'artifact-error', 
        message: 'Promise rejection: ' + e.reason 
      }, '*');
    });

    // Capture console errors
    const originalError = console.error;
    console.error = (...args) => {
      originalError.apply(console, args);
      window.parent.postMessage({ 
        type: 'artifact-error', 
        message: args.join(' ') 
      }, '*');
    };
  </script>
</head>
<body>
${artifact.content}
</body>
</html>`;
          })();

      return (
        <div className="w-full h-full relative">
          {previewError && (
            <div className="absolute top-2 left-2 right-2 bg-destructive/10 border border-destructive text-destructive text-xs p-2 rounded z-10">
              Error: {previewError}
            </div>
          )}
          <iframe
            srcDoc={previewContent}
            className="w-full h-full border-0 bg-background"
            title={artifact.title}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      );
    }

    if (artifact.type === "markdown") {
      return (
        <div className="w-full h-full overflow-auto p-4 bg-background">
          <Markdown>{artifact.content}</Markdown>
        </div>
      );
    }

    return null;
  };

  const renderCode = () => {
    return (
      <div className="w-full h-full overflow-auto bg-muted">
        <pre className="p-4 text-sm font-mono">
          <code className="text-foreground whitespace-pre-wrap break-words">{artifact.content}</code>
        </pre>
      </div>
    );
  };

  return (
    <Card className={`flex flex-col overflow-hidden transition-all ${
      isMaximized ? "fixed inset-4 z-50" : "h-full"
    }`}>
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2 bg-muted/50">
        <h3 className="font-semibold text-sm truncate">{artifact.title}</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={handleCopy}
          >
            <Copy className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setIsMaximized(!isMaximized)}
          >
            {isMaximized ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="preview" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start rounded-none border-b bg-muted/30">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
        </TabsList>
        <TabsContent value="preview" className="flex-1 m-0 p-0 data-[state=active]:flex">
          {renderPreview()}
        </TabsContent>
        <TabsContent value="code" className="flex-1 m-0 p-0 data-[state=active]:flex">
          {renderCode()}
        </TabsContent>
      </Tabs>
    </Card>
  );
};
