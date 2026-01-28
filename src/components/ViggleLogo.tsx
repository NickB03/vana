import { cn } from "@/lib/utils";

interface ViggleLogoProps {
  className?: string;
}

export function ViggleLogo({ className }: ViggleLogoProps) {
  return (
    <img
      src="/vana-logo-optimized.png"
      alt="Vana"
      className={cn("object-contain", className)}
    />
  );
}
