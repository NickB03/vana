import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface DesktopHeaderProps {
  className?: string;
  isAuthenticated?: boolean;
}

/**
 * DesktopHeader - Desktop-only navigation header
 *
 * Features:
 * - Sign-in button in top-right corner
 * - Matches sidebar toggle button style
 * - Only visible on desktop (>= 768px)
 * - Only shows when user is not authenticated
 *
 * Usage:
 * Place at the top of your main content area (desktop only).
 */
export function DesktopHeader({ className, isAuthenticated = false }: DesktopHeaderProps) {
  const navigate = useNavigate();

  // Hide on mobile or when authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <header
      className={cn(
        "hidden md:flex items-center justify-end px-3 py-2",
        "bg-transparent",
        "absolute top-0 right-0 z-20",
        className
      )}
    >
      {/* Sign in button - matches sidebar toggle style */}
      <Button
        variant="ghost"
        size="default"
        onClick={() => navigate("/auth")}
        className={cn(
          "px-4 rounded-full",
          "bg-white/5 hover:bg-white/10",
          "border border-white/10",
          "text-white/80 hover:text-white",
          "transition-all duration-200",
          "text-sm font-medium"
        )}
        aria-label="Sign in"
      >
        Sign in
      </Button>
    </header>
  );
}
