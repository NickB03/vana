import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { getSyncDelay } from "./skeleton-utils";

export type ArtifactType = "code" | "markdown" | "html" | "svg" | "mermaid" | "react" | "image";

interface ArtifactSkeletonProps {
  type?: ArtifactType;
  className?: string;
}

/**
 * Skeleton placeholder for artifact content during loading.
 * Supports all artifact types with appropriate visual layouts.
 *
 * Accessibility:
 * - Uses role="status" for screen readers
 * - Includes aria-label describing the loading state
 * - Contains sr-only text for additional context
 * - Respects prefers-reduced-motion via motion-safe/motion-reduce
 *
 * Note: Uses synchronized pulse animation to ensure all skeletons on the page
 * pulse together regardless of when they mount.
 */
export const ArtifactSkeleton = memo(({ type = "code", className }: ArtifactSkeletonProps) => {
  // Calculate sync delay once on mount for consistent timing
  const syncDelay = useMemo(() => getSyncDelay(), []);
  const syncStyle = useMemo(() => ({ '--pulse-sync-delay': `${syncDelay}ms` } as React.CSSProperties), [syncDelay]);

  // Base skeleton classes with synchronized pulse animation
  // Uses animate-pulse-sync which syncs to a global clock
  const baseClasses = "animate-pulse-sync bg-muted rounded";

  const getTypeLabel = (): string => {
    switch (type) {
      case "code": return "code editor";
      case "markdown": return "markdown content";
      case "html": return "HTML preview";
      case "svg": return "SVG graphic";
      case "mermaid": return "diagram";
      case "react": return "React component";
      case "image": return "image";
      default: return "content";
    }
  };

  const ariaLabel = `Loading ${getTypeLabel()}`;

  // Type-specific skeletons
  if (type === "code" || type === "markdown") {
    return (
      <div
        role="status"
        aria-label={ariaLabel}
        className={cn("w-full h-full flex flex-col gap-3 p-6", className)}
        style={syncStyle}
      >
        {/* Multiple lines of code/text */}
        <div className="flex-1 space-y-3 overflow-hidden">
          <div className={cn(baseClasses, "h-4 w-3/4")} aria-hidden="true" />
          <div className={cn(baseClasses, "h-4 w-full")} aria-hidden="true" />
          <div className={cn(baseClasses, "h-4 w-5/6")} aria-hidden="true" />
          <div className={cn(baseClasses, "h-4 w-4/5")} aria-hidden="true" />
          <div className={cn(baseClasses, "h-4 w-11/12")} aria-hidden="true" />
          <div className={cn(baseClasses, "h-4 w-full")} aria-hidden="true" />
          <div className={cn(baseClasses, "h-4 w-2/3")} aria-hidden="true" />
          <div className={cn(baseClasses, "h-4 w-5/6")} aria-hidden="true" />
          <div className={cn(baseClasses, "h-4 w-full")} aria-hidden="true" />
          <div className={cn(baseClasses, "h-4 w-3/4")} aria-hidden="true" />
          <div className={cn(baseClasses, "h-4 w-4/5")} aria-hidden="true" />
          <div className={cn(baseClasses, "h-4 w-2/3")} aria-hidden="true" />
        </div>
        <span className="sr-only">{ariaLabel}</span>
      </div>
    );
  }

  if (type === "react" || type === "html") {
    return (
      <div
        role="status"
        aria-label={ariaLabel}
        className={cn("w-full h-full flex flex-col gap-6 p-8", className)}
        style={syncStyle}
      >
        {/* Header/Title area */}
        <div className={cn(baseClasses, "h-12 w-2/3 max-w-md")} aria-hidden="true" />

        {/* Main content area - takes up most of the space */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={cn(baseClasses, "h-full min-h-[200px]")} aria-hidden="true" />
          <div className="space-y-4">
            <div className={cn(baseClasses, "h-24")} aria-hidden="true" />
            <div className={cn(baseClasses, "h-24")} aria-hidden="true" />
            <div className={cn(baseClasses, "h-24")} aria-hidden="true" />
          </div>
        </div>

        {/* Footer area */}
        <div className="space-y-3">
          <div className={cn(baseClasses, "h-4 w-full")} aria-hidden="true" />
          <div className={cn(baseClasses, "h-4 w-4/5")} aria-hidden="true" />
          <div className={cn(baseClasses, "h-4 w-3/4")} aria-hidden="true" />
        </div>

        <span className="sr-only">{ariaLabel}</span>
      </div>
    );
  }

  if (type === "mermaid" || type === "svg") {
    return (
      <div
        role="status"
        aria-label={ariaLabel}
        className={cn("w-full h-full flex items-center justify-center p-8", className)}
        style={syncStyle}
      >
        <div className="space-y-6 w-full max-w-2xl">
          <div className={cn(baseClasses, "h-24 w-full")} aria-hidden="true" />
          <div className="flex gap-4">
            <div className={cn(baseClasses, "h-32 flex-1")} aria-hidden="true" />
            <div className={cn(baseClasses, "h-32 flex-1")} aria-hidden="true" />
            <div className={cn(baseClasses, "h-32 flex-1")} aria-hidden="true" />
          </div>
          <div className={cn(baseClasses, "h-24 w-full")} aria-hidden="true" />
          <div className="flex gap-4">
            <div className={cn(baseClasses, "h-20 flex-1")} aria-hidden="true" />
            <div className={cn(baseClasses, "h-20 flex-1")} aria-hidden="true" />
          </div>
        </div>
        <span className="sr-only">{ariaLabel}</span>
      </div>
    );
  }

  if (type === "image") {
    return (
      <div
        role="status"
        aria-label={ariaLabel}
        className={cn("w-full h-full flex items-center justify-center p-8", className)}
        style={syncStyle}
      >
        <div className={cn(baseClasses, "w-full h-full max-h-[600px] max-w-3xl aspect-video")} aria-hidden="true" />
        <span className="sr-only">{ariaLabel}</span>
      </div>
    );
  }

  // Default skeleton
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={cn("w-full h-full flex items-center justify-center p-8", className)}
      style={syncStyle}
    >
      <div className={cn(baseClasses, "w-full h-full max-w-4xl")} aria-hidden="true" />
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
});

ArtifactSkeleton.displayName = 'ArtifactSkeleton';
