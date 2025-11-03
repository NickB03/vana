import { useState, useRef, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Code, FileText, Image, Box, GitBranch, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ArtifactData, ArtifactType } from "@/components/Artifact";

interface ArtifactTabsProps {
  artifacts: ArtifactData[];
  activeArtifactId: string;
  onTabChange: (artifactId: string) => void;
  onTabClose?: (artifactId: string) => void;
  className?: string;
}

// Map artifact types to icons
const artifactTypeIcons: Record<ArtifactType, React.ComponentType<{ className?: string }>> = {
  code: Code,
  html: FileCode,
  markdown: FileText,
  svg: Box,
  mermaid: GitBranch,
  react: FileCode,
  image: Image,
};

export function ArtifactTabs({
  artifacts,
  activeArtifactId,
  onTabChange,
  onTabClose,
  className
}: ArtifactTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  // Check scroll state
  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftScroll(scrollLeft > 0);
    setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [artifacts]);

  // Scroll active tab into view
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const activeTab = container.querySelector(`[data-artifact-id="${activeArtifactId}"]`);
    if (activeTab) {
      activeTab.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [activeArtifactId]);

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({
      left: -200,
      behavior: 'smooth'
    });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({
      left: 200,
      behavior: 'smooth'
    });
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + 1-5 for quick tab switching
      if (isMod && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (artifacts[index]) {
          onTabChange(artifacts[index].id);
        }
      }

      // Arrow keys for navigation (when focused on tabs)
      if (document.activeElement?.closest('[role="tab"]')) {
        const currentIndex = artifacts.findIndex(a => a.id === activeArtifactId);

        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          e.preventDefault();
          onTabChange(artifacts[currentIndex - 1].id);
        } else if (e.key === 'ArrowRight' && currentIndex < artifacts.length - 1) {
          e.preventDefault();
          onTabChange(artifacts[currentIndex + 1].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [artifacts, activeArtifactId, onTabChange]);

  if (artifacts.length === 0) return null;

  return (
    <div className={cn("flex items-center border-b bg-muted/30", className)}>
      {/* Left scroll button */}
      {showLeftScroll && (
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-8 shrink-0 rounded-none"
          onClick={scrollLeft}
          aria-label="Scroll tabs left"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Tabs scroll area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        <div
          className="flex items-center min-w-min"
          role="tablist"
          aria-label="Artifact tabs"
        >
          {artifacts.map((artifact, index) => {
            const isActive = artifact.id === activeArtifactId;
            const Icon = artifactTypeIcons[artifact.type] || Code;
            const shortcut = index < 5 ? `⌘${index + 1}` : undefined;

            return (
              <Tooltip key={artifact.id}>
                <TooltipTrigger asChild>
                  <button
                    data-artifact-id={artifact.id}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`artifact-panel-${artifact.id}`}
                    onClick={() => onTabChange(artifact.id)}
                    className={cn(
                      "group relative flex items-center gap-2 h-10 px-3 border-r text-sm font-medium transition-colors",
                      "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "bg-background text-foreground"
                        : "bg-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}

                    {/* Icon */}
                    <Icon className="h-3.5 w-3.5 shrink-0" />

                    {/* Title - truncated */}
                    <span className="max-w-[120px] truncate">
                      {artifact.title}
                    </span>

                    {/* Close button */}
                    {onTabClose && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-5 w-5 ml-1 -mr-1 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity",
                          "hover:bg-destructive/10 hover:text-destructive"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTabClose(artifact.id);
                        }}
                        aria-label={`Close ${artifact.title}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="flex flex-col gap-0.5">
                  <span className="font-medium">{artifact.title}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {artifact.type}
                    {shortcut && ` • ${shortcut}`}
                  </span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* Right scroll button */}
      {showRightScroll && (
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-8 shrink-0 rounded-none"
          onClick={scrollRight}
          aria-label="Scroll tabs right"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
