import { cn } from "@/lib/utils";
import type { BundleProgress } from "@/types/bundleProgress";
import { STAGE_LABELS } from "@/types/bundleProgress";

interface BundleProgressIndicatorProps {
  progress: BundleProgress | null;
  className?: string;
}

export function BundleProgressIndicator({ progress, className }: BundleProgressIndicatorProps) {
  if (!progress) return null;

  return (
    <div className={cn("flex flex-col gap-1 text-sm", className)}>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">
          {STAGE_LABELS[progress.stage]}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {progress.progress}%
        </span>
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress.progress}%` }}
        />
      </div>
    </div>
  );
}
