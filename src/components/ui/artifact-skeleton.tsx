import { cn } from "@/lib/utils";

export type ArtifactType = "code" | "markdown" | "html" | "svg" | "mermaid" | "react" | "image";

interface ArtifactSkeletonProps {
  type?: ArtifactType;
  className?: string;
}

export const ArtifactSkeleton = ({ type = "code", className }: ArtifactSkeletonProps) => {
  // Base skeleton classes
  const baseClasses = "animate-pulse bg-muted rounded";

  // Type-specific skeletons
  if (type === "code" || type === "markdown") {
    return (
      <div className={cn("space-y-2 p-4", className)}>
        <div className={cn(baseClasses, "h-4 w-3/4")} />
        <div className={cn(baseClasses, "h-4 w-full")} />
        <div className={cn(baseClasses, "h-4 w-5/6")} />
        <div className={cn(baseClasses, "h-4 w-4/5")} />
        <div className="mt-4 space-y-2">
          <div className={cn(baseClasses, "h-4 w-full")} />
          <div className={cn(baseClasses, "h-4 w-2/3")} />
        </div>
      </div>
    );
  }

  if (type === "react" || type === "html") {
    return (
      <div className={cn("flex flex-col gap-4 p-4", className)}>
        <div className={cn(baseClasses, "h-8 w-1/2")} />
        <div className="grid grid-cols-2 gap-4">
          <div className={cn(baseClasses, "h-32")} />
          <div className={cn(baseClasses, "h-32")} />
        </div>
        <div className="space-y-2">
          <div className={cn(baseClasses, "h-4 w-full")} />
          <div className={cn(baseClasses, "h-4 w-3/4")} />
        </div>
      </div>
    );
  }

  if (type === "mermaid" || type === "svg") {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="space-y-3 w-full max-w-md">
          <div className={cn(baseClasses, "h-16 w-full")} />
          <div className="flex gap-2">
            <div className={cn(baseClasses, "h-12 flex-1")} />
            <div className={cn(baseClasses, "h-12 flex-1")} />
          </div>
          <div className={cn(baseClasses, "h-16 w-full")} />
        </div>
      </div>
    );
  }

  if (type === "image") {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className={cn(baseClasses, "h-64 w-full max-w-md aspect-video")} />
      </div>
    );
  }

  // Default skeleton
  return (
    <div className={cn("p-4", className)}>
      <div className={cn(baseClasses, "h-64 w-full")} />
    </div>
  );
};
