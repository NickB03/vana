import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ArtifactCardSkeletonProps {
  className?: string;
}

/**
 * Skeleton placeholder for artifact cards during streaming.
 * Matches the exact layout of ArtifactCard for smooth transitions.
 *
 * Accessibility:
 * - Uses role="status" for screen readers
 * - Includes aria-label describing the loading state
 * - Contains sr-only text for additional context
 * - Respects prefers-reduced-motion via motion-safe/motion-reduce
 *
 * Note: Uses the Skeleton component which has synchronized pulse animation,
 * ensuring all skeletons on the page pulse together.
 */
export const ArtifactCardSkeleton = memo(({ className }: ArtifactCardSkeletonProps) => {
  return (
    <div
      role="status"
      aria-label="Loading artifact"
      className={cn(
        "group flex items-center gap-3 p-3 rounded-xl",
        "bg-muted/50 border border-border/50",
        className
      )}
    >
      {/* Icon badge skeleton - matches h-12 w-12 from ArtifactCard */}
      <Skeleton
        className="h-12 w-12 shrink-0 rounded-lg"
        aria-hidden="true"
      />

      {/* Title and type skeleton */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Title skeleton - matches font-medium text-sm */}
        <Skeleton
          className="h-4 w-3/4"
          aria-hidden="true"
        />
        {/* Type label skeleton - matches text-xs */}
        <Skeleton
          className="h-3 w-1/3"
          aria-hidden="true"
        />
      </div>

      {/* Open button skeleton - matches the rounded-full px-4 button */}
      <Skeleton
        className="h-8 w-20 shrink-0 rounded-full"
        aria-hidden="true"
      />

      <span className="sr-only">Loading artifact</span>
    </div>
  );
});

ArtifactCardSkeleton.displayName = 'ArtifactCardSkeleton';
