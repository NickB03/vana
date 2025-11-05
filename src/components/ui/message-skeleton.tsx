import { cn } from "@/lib/utils";

interface MessageSkeletonProps {
  variant?: "user" | "assistant";
  className?: string;
}

export const MessageSkeleton = ({ variant = "assistant", className }: MessageSkeletonProps) => {
  const baseClasses = "animate-pulse bg-muted rounded";

  if (variant === "user") {
    return (
      <div className={cn("flex flex-col items-end gap-1 mx-auto w-full max-w-3xl px-6", className)}>
        <div className={cn(baseClasses, "h-10 w-64 rounded-3xl")} />
      </div>
    );
  }

  // Assistant message skeleton
  return (
    <div className={cn("mx-auto w-full max-w-3xl px-6 space-y-2", className)}>
      <div className="space-y-2">
        <div className={cn(baseClasses, "h-4 w-full")} />
        <div className={cn(baseClasses, "h-4 w-5/6")} />
        <div className={cn(baseClasses, "h-4 w-4/5")} />
      </div>
    </div>
  );
};
