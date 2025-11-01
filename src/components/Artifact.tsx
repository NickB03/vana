import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, Maximize2, Minimize2, X, AlertCircle, Download, Edit, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Markdown } from "./prompt-kit/markdown";
import { validateArtifact, ValidationResult, categorizeError } from "@/utils/artifactValidator";
import { LibraryApprovalDialog, DetectedLibrary } from "./LibraryApprovalDialog";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import mermaid from "mermaid";
import { generateCompleteIframeStyles } from "@/utils/themeUtils";

export type ArtifactType = "code" | "markdown" | "html" | "svg" | "mermaid" | "react" | "image";

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
  onEdit?: (suggestion?: string) => void;
}


export const Artifact = ({ artifact, onClose, onEdit }: ArtifactProps) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [errorCategory, setErrorCategory] = useState<'syntax' | 'runtime' | 'import' | 'unknown'>('unknown');
  const [isLoading, setIsLoading] = useState(true);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [libraryApprovalOpen, setLibraryApprovalOpen] = useState(false);
  const [detectedLibraries, setDetectedLibraries] = useState<DetectedLibrary[]>([]);
  const [injectedCDNs, setInjectedCDNs] = useState<string>('');
  const [librariesChecked, setLibrariesChecked] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [editedContent, setEditedContent] = useState(artifact.content);
  const [themeRefreshKey, setThemeRefreshKey] = useState(0);

  // Initialize mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose'
    });
  }, []);

  // Watch for theme changes to re-render iframes with updated theme
  useEffect(() => {
    const observer = new MutationObserver(() => {
      // Class attribute changed (filtered by attributeFilter), trigger iframe refresh
      setThemeRefreshKey(prev => prev + 1);
    });

    if (document.documentElement) {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    return () => {
      observer?.disconnect();
    };
  }, []);

  // Phase 4: Validate artifact on mount - debounced for performance
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const validationResult = validateArtifact(artifact.content, artifact.type);
      setValidation(validationResult);
    }, 300); // Debounce validation by 300ms
    
    return () => clearTimeout(timeoutId);
  }, [artifact.content, artifact.type]);

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    toast.success("Copied to clipboard");
  };

  const handlePopOut = () => {
    // Open a new window
    const newWindow = window.open('', '_blank', 'width=1200,height=800');

    if (!newWindow) {
      toast.error("Popup blocked - please allow popups for this site");
      return;
    }

    // Create complete HTML document for the new window
    const isFullHTML = artifact.content.includes("<!DOCTYPE");

    const popoutContent = isFullHTML
      ? artifact.content
      : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${artifact.title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  ${injectedCDNs}
  ${generateCompleteIframeStyles()}
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, sans-serif;
    }
  </style>
</head>
<body>
${artifact.content}
</body>
</html>`;

    // Write content to new window
    newWindow.document.open();
    newWindow.document.write(popoutContent);
    newWindow.document.close();

    toast.success("Opened in new window");
  };

  // Listen for errors and ready state from iframe
  useEffect(() => {
    setIsLoading(true);
    setPreviewError(null);
    
    const handleIframeMessage = (e: MessageEvent) => {
      if (e.data?.type === 'artifact-error') {
        const errorInfo = categorizeError(e.data.message);
        setPreviewError(e.data.message);
        setErrorCategory(errorInfo.category);
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

  // Render mermaid diagrams
  useEffect(() => {
    if (artifact.type === "mermaid" && mermaidRef.current) {
      const renderMermaid = async () => {
        try {
          setIsLoading(true);
          const id = `mermaid-${Date.now()}`;
          const { svg } = await mermaid.render(id, artifact.content);
          if (mermaidRef.current) {
            // Use safer DOM manipulation instead of innerHTML to prevent XSS
            const template = document.createElement('template');
            // Sanitize SVG content before insertion to prevent XSS
            const cleanSvg = svg.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            template.innerHTML = cleanSvg.trim();
            const svgElement = template.content.firstChild;

            // Clear and append as DOM element (safer than innerHTML)
            mermaidRef.current.textContent = '';
            if (svgElement) {
              mermaidRef.current.appendChild(svgElement);
            }
          }
          setIsLoading(false);
        } catch (error) {
          console.error('Mermaid render error:', error);
          setPreviewError(error instanceof Error ? error.message : 'Failed to render diagram');
          setIsLoading(false);
        }
      };
      renderMermaid();
    }
  }, [artifact.content, artifact.type]);

  // Phase 7: Check for libraries when content changes
  useEffect(() => {
    if (artifact.type === "html" || artifact.type === "code" || artifact.type === "react") {
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
      'shadcn': {
        scripts: [], // shadcn is imported via ES modules, not CDN
        purpose: 'shadcn/ui component library (imported as ES modules)',
        provider: 'internal'
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
    
    // Phase 1: Detect shadcn/ui component imports
    const shadcnPattern = /import\s+\{[^}]+\}\s+from\s+['"]@\/components\/ui\//;
    const usesShadcn = shadcnPattern.test(content);
    
    if (usesShadcn) {
      detectedLibs.push({
        name: 'shadcn/ui',
        url: 'internal://shadcn-ui',
        purpose: 'Modern React component library',
        cdnProvider: 'internal'
      });
    }
    
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
  ${generateCompleteIframeStyles()}
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
              <div className={`absolute top-2 left-2 right-2 text-xs p-3 rounded z-10 flex flex-col gap-2 ${
                errorCategory === 'syntax' ? 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200' :
                errorCategory === 'runtime' ? 'bg-orange-50 border border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-200' :
                errorCategory === 'import' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200' :
                'bg-destructive/10 border border-destructive text-destructive'
              }`}>
                <div className="flex items-start gap-2">
                  <span className="font-semibold shrink-0">
                    {errorCategory === 'syntax' ? '🔴 Syntax Error:' :
                     errorCategory === 'runtime' ? '🟠 Runtime Error:' :
                     errorCategory === 'import' ? '🟡 Import Error:' :
                     '⚠️ Error:'}
                  </span>
                  <span className="flex-1 break-words font-mono text-xs">{previewError}</span>
                </div>
                {categorizeError(previewError).suggestion && (
                  <div className="text-xs opacity-80 pl-6">
                    💡 {categorizeError(previewError).suggestion}
                  </div>
                )}
                <div className="flex gap-2 pl-6">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-6 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(previewError);
                      toast.success("Error copied to clipboard");
                    }}
                  >
                    Copy Error
                  </Button>
                  {onEdit && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-6 text-xs"
                      onClick={() => onEdit(`Fix this error: ${previewError}`)}
                    >
                      Ask AI to Fix
                    </Button>
                  )}
                </div>
              </div>
            )}
            <iframe
              key={`${injectedCDNs}-${themeRefreshKey}`} // Re-render when CDNs or theme change
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
        <div className="w-full h-full flex flex-col">
          {isEditingCode ? (
            <div className="flex-1 overflow-auto p-4 bg-muted">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full h-full p-4 text-sm bg-muted text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                spellCheck={false}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-4 bg-background">
              <Markdown>{artifact.content}</Markdown>
            </div>
          )}
        </div>
      );
    }

    if (artifact.type === "svg") {
      // Ensure SVG has proper dimensions
      const hasViewBox = artifact.content.includes('viewBox');
      const hasWidthHeight = artifact.content.includes('width=') && artifact.content.includes('height=');
      
      let svgContent = artifact.content.trim();
      
      // If SVG lacks dimensions, add default viewBox
      if (!hasViewBox && !hasWidthHeight) {
        svgContent = svgContent.replace(
          /<svg([^>]*)>/,
          '<svg$1 viewBox="0 0 800 600" width="800" height="600">'
        );
      }
      
      // Convert to data URL for proper SVG namespace handling
      const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
      
      return (
        <div className="w-full h-full overflow-auto p-4 bg-background flex items-center justify-center">
          <img 
            src={svgDataUrl}
            alt={artifact.title}
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              console.error('SVG rendering error:', artifact.content);
            }}
          />
        </div>
      );
    }

    if (artifact.type === "mermaid") {
      return (
        <div className="w-full h-full overflow-auto p-4 bg-background flex items-center justify-center">
          {isLoading && (
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-sm text-muted-foreground">Rendering diagram...</p>
            </div>
          )}
          {previewError && !isLoading && (
            <div className="bg-destructive/10 border border-destructive text-destructive text-xs p-2 rounded flex items-start gap-2">
              <span className="font-semibold shrink-0">⚠️ Error:</span>
              <span className="flex-1 break-words">{previewError}</span>
            </div>
          )}
          <div ref={mermaidRef} className={isLoading || previewError ? 'hidden' : ''} />
        </div>
      );
    }

    if (artifact.type === "image") {
      return (
        <div className="w-full h-full overflow-auto p-6 bg-muted/30 flex flex-col items-center justify-center gap-4">
          <img 
            src={artifact.content} 
            alt={artifact.title}
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
          />
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                const link = document.createElement('a');
                link.href = artifact.content;
                link.download = `${artifact.title.replace(/\s+/g, '_')}.png`;
                link.click();
                toast.success("Image downloaded");
              }}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button 
              onClick={() => onEdit?.(`Edit this image: ${artifact.title}. `)}
              size="sm"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Image
            </Button>
          </div>
        </div>
      );
    }

    if (artifact.type === "react") {
      const reactPreviewContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- Pre-approved libraries -->
  <script src="https://unpkg.com/lucide-react@0.263.1/dist/umd/lucide-react.js"></script>
  <script src="https://unpkg.com/recharts@2.5.0/dist/Recharts.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js"></script>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  ${injectedCDNs}

  ${generateCompleteIframeStyles()}
  <style>
    /* React app container */
    #root {
      width: 100%;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useReducer, useRef, useMemo, useCallback } = React;

    ${artifact.content}

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>

  <script>
    // Error reporting
    window.addEventListener('error', (e) => {
      window.parent.postMessage({
        type: 'artifact-error',
        message: e.message
      }, '*');
    });

    window.addEventListener('load', () => {
      window.parent.postMessage({ type: 'artifact-ready' }, '*');
    });
  </script>
</body>
</html>`;

      return (
        <div className="w-full h-full relative flex flex-col">
          <div className="flex-1 relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  <p className="text-sm text-muted-foreground">Loading React component...</p>
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
              key={`${injectedCDNs}-${themeRefreshKey}`} // Re-render when CDNs or theme change
              srcDoc={reactPreviewContent}
              className="w-full h-full border-0 bg-background"
              title={artifact.title}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      );
    }

    return null;
  };

  const handleEditToggle = () => {
    if (isEditingCode) {
      // Save changes
      artifact.content = editedContent;
      toast.success("Code updated");
      setIsEditingCode(false);
    } else {
      // Enter edit mode
      setEditedContent(artifact.content);
      setIsEditingCode(true);
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(artifact.content);
    setIsEditingCode(false);
  };

  const renderCode = () => {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto bg-muted">
          {isEditingCode ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-full p-4 text-sm font-mono bg-muted text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              spellCheck={false}
            />
          ) : (
            <pre className="p-4 text-sm font-mono overflow-auto">
              <code className="text-foreground whitespace-pre-wrap break-words">{artifact.content}</code>
            </pre>
          )}
        </div>
        {isEditingCode && (
          <div className="flex items-center justify-end gap-2 border-t px-4 py-2 bg-muted/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelEdit}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleEditToggle}
            >
              Save Changes
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Card className={`flex flex-col overflow-hidden transition-all !rounded-none ${
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
              title="Copy code"
            >
              <Copy className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={handlePopOut}
              title="Open in new window"
            >
              <ExternalLink className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Minimize" : "Maximize"}
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


        <Tabs 
          defaultValue="preview" 
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
          onValueChange={(value) => setIsEditingCode(value === "code")}
        >
          <TabsList className="w-full justify-start rounded-none border-b bg-muted/30">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="code">Edit</TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="flex-1 m-0 p-0 data-[state=active]:flex flex-col overflow-hidden">
            {renderPreview()}
          </TabsContent>
          <TabsContent value="code" className="flex-1 m-0 p-0 data-[state=active]:flex overflow-hidden">
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
