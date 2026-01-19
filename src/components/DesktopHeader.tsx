import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserProfileButton } from "./UserProfileButton";

interface DesktopHeaderProps {
  className?: string;
  isAuthenticated?: boolean;
}

/**
 * DesktopHeader - Desktop-only navigation header (Gemini-style)
 *
 * Features:
 * - Sign-in button (when not authenticated) or user profile button (when authenticated)
 * - Dedicated header row with fixed height (not floating/absolute)
 * - Takes up space in document flow to prevent overlay issues
 * - Only visible on desktop (>= 768px)
 * - ALWAYS renders to prevent layout shift on authentication state change
 *
 * Usage:
 * Place at the top of your main content area (desktop only).
 * This component reserves vertical space for the header.
 */
export function DesktopHeader({ className, isAuthenticated = false }: DesktopHeaderProps) {
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        // Gemini-style: dedicated header row in document flow (not absolute)
        // Uses py-2 to match SidebarHeader padding for visual alignment
        "hidden md:flex items-center justify-end px-4 py-2 shrink-0",
        "bg-transparent",
        className
      )}
    >
      {/* Left spacer for balance */}
      <div className="flex-1" />

      {/* Right side: Sign in button or user profile button */}
      {isAuthenticated ? (
        // Show user profile button when authenticated
        <UserProfileButton collapsed={true} />
      ) : (
        // Sign in button - matches profile button style
        <Button
          variant="ghost"
          size="default"
          onClick={() => navigate("/auth")}
          className={cn(
            "h-10 px-4 rounded-full",
            "bg-white/20 hover:bg-transparent hover:opacity-80",
            "text-white/90",
            "transition-all duration-200",
            "text-sm font-medium"
          )}
          aria-label="Sign in"
        >
          Sign in
        </Button>
      )}
    </header>
  );
}
