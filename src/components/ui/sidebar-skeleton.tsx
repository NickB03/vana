import { memo } from "react";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

interface SidebarSkeletonProps {
  /** Number of session groups to show (default: 2) */
  groups?: number;
  /** Sessions per group (default: [2, 1]) */
  sessionsPerGroup?: number[];
  className?: string;
}

/**
 * Skeleton placeholder for the ChatSidebar loading state.
 * Matches the exact layout of SidebarGroup/SidebarGroupLabel/SidebarMenuButton
 * for smooth transitions when data loads.
 *
 * Accessibility:
 * - Uses role="status" for screen readers
 * - Includes aria-label describing the loading state
 * - Contains sr-only text for additional context
 * - Individual skeleton elements have aria-hidden="true"
 *
 * Note: Uses h-8 to match SidebarMenuButton default size (verified in sidebar.tsx:435)
 */
export const SidebarSkeleton = memo(({
  groups = 2,
  sessionsPerGroup = [2, 1],
  className
}: SidebarSkeletonProps) => {
  return (
    <div
      role="status"
      aria-label="Loading conversations"
      className={cn("px-4 pt-1", className)}
    >
      {Array.from({ length: groups }).map((_, groupIndex) => (
        <div key={groupIndex} className="pt-1 pb-2">
          {/* Period label - matches SidebarGroupLabel */}
          <div className="px-0 pb-1">
            <Skeleton
              className={cn("h-4", groupIndex === 0 ? "w-16" : "w-20")}
              aria-hidden="true"
            />
          </div>

          {/* Session items - matches SidebarMenuButton default size (h-8) */}
          <div className="space-y-0.5">
            {Array.from({ length: sessionsPerGroup[groupIndex] || 2 }).map((_, itemIndex) => (
              <Skeleton
                key={itemIndex}
                className="h-8 w-full rounded-md"
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      ))}
      <span className="sr-only">Loading conversations</span>
    </div>
  );
});

SidebarSkeleton.displayName = 'SidebarSkeleton';
