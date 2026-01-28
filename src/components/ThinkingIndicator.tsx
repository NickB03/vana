import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThinkingIndicatorProps {
  status: string;
  isStreaming?: boolean;
  percentage?: number;
}

export function ThinkingIndicator({ status, isStreaming = false, percentage }: ThinkingIndicatorProps) {
  if (!status) return null;

  return (
    <div className="flex flex-col gap-2 mb-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Sparkles className={cn("h-4 w-4", isStreaming && "animate-pulse text-primary")} />
        <span className="text-sm font-medium">{status}</span>
        {percentage !== undefined && (
          <span className="text-sm font-semibold text-primary">
            {percentage}%
          </span>
        )}
      </div>
      {percentage !== undefined && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out shadow-lg shadow-primary/20"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
