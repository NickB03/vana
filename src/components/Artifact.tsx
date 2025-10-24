import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, Maximize2, Minimize2, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Markdown } from "./prompt-kit/markdown";
import { validateArtifact, ValidationResult } from "@/utils/artifactValidator";
import { LibraryApprovalDialog, DetectedLibrary } from "./LibraryApprovalDialog";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

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
  const [isLoading, setIsLoading] = useState(true);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [libraryApprovalOpen, setLibraryApprovalOpen] = useState(false);
  const [detectedLibraries, setDetectedLibraries] = useState<DetectedLibrary[]>([]);
  const [injectedCDNs, setInjectedCDNs] = useState<string>('');
  const [librariesChecked, setLibrariesChecked] = useState(false);

  // Phase 4: Validate artifact on mount
  useEffect(() => {
    const validationResult = validateArtifact(artifact.content, artifact.type);
    setValidation(validationResult);
  }, [artifact.content, artifact.type]);

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    toast.success("Copied to clipboard");
  };

  // Listen for errors and ready state from iframe
  useEffect(() => {
    setIsLoading(true);
    setPreviewError(null);
    
    const handleIframeMessage = (e: MessageEvent) => {
      if (e.data?.type === 'artifact-error') {
        setPreviewError(e.data.message);
        setIsLoading(false);
      } else if (e.data?.type === 'artifact-ready') {
        setIsLoading(false);
      }
    };
    
    const loadTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    
    window.addEventListener('message', handleIframeMessage);
    return () => {
      window.removeEventListener('message', handleIframeMessage);
      clearTimeout(loadTimeout);
    };
  }, [artifact.content]);

  // Phase 7: Check for libraries when content changes
  useEffect(() => {
    if (artifact.type === "html" || artifact.type === "code") {
      setLibrariesChecked(false);
      setInjectedCDNs('');
      checkLibraries();
    }
  }, [artifact.content]);

  const checkLibraries = async () => {
    const { cdn, needsApproval, libraries } = await detectAndRequestLibraries(artifact.content);
    
    if (needsApproval && libraries.length > 0) {
      setDetectedLibraries(libraries);
      setLibraryApprovalOpen(true);
    } else {
      setInjectedCDNs(cdn);
    }
    setLibrariesChecked(true);
  };

  // Phase 7: Detect libraries and check approval
  const detectAndRequestLibraries = async (content: string): Promise<{ 
    cdn: string; 
    needsApproval: boolean;
    libraries: DetectedLibrary[];
  }> => {
    const cdnMap: Record<string, { scripts: string[]; purpose: string; provider: string }> = {
      'chart.js': {
        scripts: ['<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>'],
        purpose: 'Interactive charts and data visualizations',
        provider: 'jsDelivr'
      },
      'd3': {
        scripts: ['<script src="https://d3js.org/d3.v7.min.js"></script>'],
        purpose: 'Data-driven DOM manipulation and visualizations',
        provider: 'd3js.org'
      },
      'three.js': {
        scripts: ['<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>'],
        purpose: '3D graphics and WebGL rendering',
        provider: 'jsDelivr'
      },
      'alpine': {
        scripts: ['<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.13.5/dist/cdn.min.js"></script>'],
        purpose: 'Lightweight reactive JavaScript framework',
        provider: 'jsDelivr'
      },
      'gsap': {
        scripts: ['<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>'],
        purpose: 'Professional-grade animation library',
        provider: 'jsDelivr'
      },
      'anime': {
        scripts: ['<script src="https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js"></script>'],
        purpose: 'Lightweight animation engine',
        provider: 'jsDelivr'
      },
      'p5': {
        scripts: ['<script src="https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js"></script>'],
        purpose: 'Creative coding and canvas drawing',
        provider: 'jsDelivr'
      },
      'particles': {
        scripts: ['<script src="https://cdn.jsdelivr.net/npm/tsparticles@3.0.3/tsparticles.bundle.min.js"></script>'],
        purpose: 'Particle effects and animations',
        provider: 'jsDelivr'
      },
      'leaflet': {
        scripts: [
          '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />',
          '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>'
        ],
        purpose: 'Interactive maps',
        provider: 'unpkg'
      },
      'sortable': {
        scripts: ['<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>'],
        purpose: 'Drag-and-drop list reordering',
        provider: 'jsDelivr'
      },
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

    const detectedLibs: DetectedLibrary[] = [];
    
    for (const [lib, pattern] of Object.entries(detectionPatterns)) {
      if (pattern.test(content)) {
        const libInfo = cdnMap[lib];
        const cdnScripts = libInfo.scripts;
        const alreadyIncluded = cdnScripts.some(script => content.includes(script));
        if (!alreadyIncluded) {
          cdnScripts.forEach(script => {
            const urlMatch = script.match(/(?:src|href)="([^"]+)"/);
            if (urlMatch) {
              detectedLibs.push({
                name: lib,
                url: urlMatch[1],
                purpose: libInfo.purpose,
                cdnProvider: libInfo.provider
              });
            }
          });
        }
      }
    }

    if (detectedLibs.length === 0) {
      return { cdn: '', needsApproval: false, libraries: [] };
    }

    // Check user preferences
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('auto_approve_libraries, approved_libraries')
          .eq('user_id', user.id)
          .single();

        if (prefs?.auto_approve_libraries) {
          // Auto-approve enabled
          const cdnCode = detectedLibs.map(lib => {
            const libInfo = cdnMap[lib.name];
            return libInfo.scripts.join('\n');
          }).join('\n');
          return { cdn: cdnCode, needsApproval: false, libraries: detectedLibs };
        }

        // Check if all libraries are already approved
        const approvedLibs = Array.isArray(prefs?.approved_libraries) 
          ? prefs.approved_libraries.filter((l): l is string => typeof l === 'string')
          : [];
        const allApproved = detectedLibs.every(lib => approvedLibs.includes(lib.url));
        
        if (allApproved) {
          const cdnCode = detectedLibs.map(lib => {
            const libInfo = cdnMap[lib.name];
            return libInfo.scripts.join('\n');
          }).join('\n');
          return { cdn: cdnCode, needsApproval: false, libraries: detectedLibs };
        }
      }
    } catch (error) {
      console.error('Error checking user preferences:', error);
    }

    // Need approval
    return { cdn: '', needsApproval: true, libraries: detectedLibs };
  };

  const handleLibraryApproval = async (remember: boolean) => {
    try {
      if (remember) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: prefs } = await supabase
            .from('user_preferences')
            .select('approved_libraries')
            .eq('user_id', user.id)
            .single();

          const existingLibs = Array.isArray(prefs?.approved_libraries)
            ? prefs.approved_libraries.filter((l): l is string => typeof l === 'string')
            : [];
          const newLibs = [...new Set([...existingLibs, ...detectedLibraries.map(l => l.url)])];

          await supabase
            .from('user_preferences')
            .upsert({
              user_id: user.id,
              approved_libraries: newLibs
            }, { onConflict: 'user_id' });
        }
      }

      // Inject libraries
      const cdnCode = detectedLibraries.map(lib => {
        const script = lib.url.includes('.css') 
          ? `<link rel="stylesheet" href="${lib.url}" />`
          : `<script src="${lib.url}"></script>`;
        return script;
      }).join('\n');

      setInjectedCDNs(cdnCode);
      setLibraryApprovalOpen(false);
      toast.success("Libraries approved and loaded");
    } catch (error) {
      console.error('Error approving libraries:', error);
      toast.error("Failed to approve libraries");
    }
  };

  const handleLibraryDenial = () => {
    setLibraryApprovalOpen(false);
    setInjectedCDNs('');
    toast.info("Libraries not loaded. Artifact may not work as intended.");
  };

  const renderPreview = () => {
    if (artifact.type === "code" || artifact.type === "html") {
      // Create a complete HTML document for preview
      const isFullHTML = artifact.content.includes("<!DOCTYPE");
      
      const previewContent = isFullHTML
        ? artifact.content 
        : `<!DOCTYPE html>
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
        message: e.message + ' at ' + e.filename + ':' + e.lineno 
      }, '*');
      return true;
    });
    
    window.addEventListener('unhandledrejection', (e) => {
      window.parent.postMessage({ 
        type: 'artifact-error', 
        message: 'Promise rejection: ' + e.reason 
      }, '*');
    });

    // Capture console errors and warnings
    const originalError = console.error;
    console.error = (...args) => {
      originalError.apply(console, args);
      window.parent.postMessage({ 
        type: 'artifact-error', 
        message: args.join(' ') 
      }, '*');
    };
    
    const originalWarn = console.warn;
    console.warn = (...args) => {
      originalWarn.apply(console, args);
    };
    
    // Signal ready state
    window.addEventListener('load', () => {
      window.parent.postMessage({ type: 'artifact-ready' }, '*');
    });
  </script>
</head>
<body>
${artifact.content}
</body>
</html>`;

      return (
        <div className="w-full h-full relative flex flex-col">
          {/* Phase 4: Validation UI */}
          {validation && !validation.isValid && (
            <Alert variant="destructive" className="m-2 mb-0">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Validation Errors:</strong>
                <ul className="list-disc pl-4 mt-1">
                  {validation.errors.map((err, idx) => (
                    <li key={idx}>{err.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {validation && validation.warnings.length > 0 && (
            <Alert className="m-2 mb-0">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Warnings:</strong>
                <ul className="list-disc pl-4 mt-1">
                  {validation.warnings.slice(0, 3).map((warn, idx) => (
                    <li key={idx}>{warn.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex-1 relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  <p className="text-sm text-muted-foreground">Loading preview...</p>
                </div>
              </div>
            )}
            {previewError && !isLoading && (
              <div className="absolute top-2 left-2 right-2 bg-destructive/10 border border-destructive text-destructive text-xs p-2 rounded z-10 flex items-start gap-2">
                <span className="font-semibold shrink-0">⚠️ Error:</span>
                <span className="flex-1 break-words">{previewError}</span>
              </div>
            )}
            <iframe
              key={injectedCDNs} // Re-render when CDNs change
              srcDoc={previewContent}
              className="w-full h-full border-0 bg-background"
              title={artifact.title}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
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
    <>
      <Card className={`flex flex-col overflow-hidden transition-all ${
        isMaximized ? "fixed inset-4 z-50" : "h-full"
      }`}>
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2 bg-muted/50">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{artifact.title}</h3>
            {validation && validation.errors.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {validation.errors.length} error{validation.errors.length > 1 ? 's' : ''}
              </Badge>
            )}
            {validation && validation.warnings.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {validation.warnings.length} warning{validation.warnings.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
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
          <TabsContent value="preview" className="flex-1 m-0 p-0 data-[state=active]:flex flex-col">
            {renderPreview()}
          </TabsContent>
          <TabsContent value="code" className="flex-1 m-0 p-0 data-[state=active]:flex">
            {renderCode()}
          </TabsContent>
        </Tabs>
      </Card>

      {/* Phase 7: Library Approval Dialog */}
      <LibraryApprovalDialog
        open={libraryApprovalOpen}
        libraries={detectedLibraries}
        onApprove={handleLibraryApproval}
        onDeny={handleLibraryDenial}
      />
    </>
  );
};
