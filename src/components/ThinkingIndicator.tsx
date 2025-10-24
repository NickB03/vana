import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThinkingIndicatorProps {
  status: string;
  isStreaming?: boolean;
}

export function ThinkingIndicator({ status, isStreaming = false }: ThinkingIndicatorProps) {
  if (!status) return null;

  return (
    <div className="flex items-center gap-2 mb-3 text-muted-foreground">
      <Sparkles className={cn("h-4 w-4", isStreaming && "animate-pulse text-primary")} />
      <span className="text-sm font-medium">{status}</span>
    </div>
  );
}
