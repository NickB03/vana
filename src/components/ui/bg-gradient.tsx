import { cn } from "@/lib/utils";

interface GradientBackgroundProps {
  className?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientSize?: string;
  gradientPosition?: string;
  gradientStop?: string;
}

export const GradientBackground = ({
  className,
  gradientFrom = "#000000",   // Pure black
  gradientTo = "#1e293b",     // Dark slate
  gradientSize = "125% 125%",
  gradientPosition = "50% 10%",
  gradientStop = "40%"
}: GradientBackgroundProps) => {
  return (
    <div
      className={cn(
        "fixed inset-0 w-full h-full -z-10 bg-black",
        className
      )}
      style={{
        background: `radial-gradient(${gradientSize} at ${gradientPosition}, ${gradientFrom} ${gradientStop}, ${gradientTo} 100%)`
      }}
    />
  );
};

// Legacy export for backwards compatibility
export const Component = GradientBackground;