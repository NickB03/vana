import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { getSyncDelay } from "./skeleton-utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // Calculate sync delay once on mount - useMemo ensures consistent timing
  // during the component's lifecycle
  const syncDelay = useMemo(() => getSyncDelay(), []);

  return (
    <div
      className={cn("animate-pulse-sync rounded-md bg-muted", className)}
      style={{ '--pulse-sync-delay': `${syncDelay}ms` } as React.CSSProperties}
      {...props}
    />
  );
}

export { Skeleton };
