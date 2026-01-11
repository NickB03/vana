import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface DesktopHeaderProps {
  className?: string;
  isAuthenticated?: boolean;
}

/**
 * DesktopHeader - Desktop-only navigation header (Gemini-style)
 *
 * Features:
 * - Sign-in button in top-right corner
 * - Dedicated header row with fixed height (not floating/absolute)
 * - Takes up space in document flow to prevent overlay issues
 * - Only visible on desktop (>= 768px)
 * - Only shows when user is not authenticated
 *
 * Usage:
 * Place at the top of your main content area (desktop only).
 * This component reserves vertical space for the header.
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
        // Gemini-style: dedicated header row in document flow (not absolute)
        // Uses h-12 (48px) for consistent reserved space
        "hidden md:flex items-center justify-end px-4 h-12 shrink-0",
        "bg-transparent",
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
