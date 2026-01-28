import { PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { TOUR_STEP_IDS } from "@/components/tour";
import { useNavigate } from "react-router-dom";
import { UserProfileButton } from "./UserProfileButton";

interface MobileHeaderProps {
  className?: string;
  showLogo?: boolean;
  isAuthenticated?: boolean;
}

/**
 * MobileHeader - Gemini-style mobile navigation header
 *
 * Features:
 * - Hamburger menu icon to toggle sidebar drawer
 * - Only visible on mobile (< 768px)
 * - Integrates with SidebarProvider context
 * - Smooth slide-in animation for sidebar
 *
 * Usage:
 * Must be used within a SidebarProvider context.
 * Place at the top of your main content area.
 */
export function MobileHeader({ className, showLogo = true, isAuthenticated = false }: MobileHeaderProps) {
  const { setOpenMobile, openMobile, isMobile } = useSidebar();
  const navigate = useNavigate();

  // Only render on mobile when sidebar is closed
  // This prevents showing duplicate icons during sidebar open animation
  if (!isMobile || openMobile) {
    return null;
  }

  return (
    <header
      className={cn(
        "flex items-center justify-between px-4 py-2 pt-safe bg-transparent",
        "md:hidden", // Hide on desktop (redundant with isMobile check but adds CSS safety)
        className
      )}
    >
      {/* Left side: Sidebar toggle + Logo */}
      <div className="flex items-center gap-2">
        {/* Sidebar toggle button - uses TOUR_STEP_IDS.SIDEBAR for onboarding */}
        <Button
          id={TOUR_STEP_IDS.SIDEBAR}
          variant="ghost"
          size="icon"
          onClick={() => setOpenMobile(true)}
          className={cn(
            "h-10 w-10 rounded-full",
            "bg-white/5 hover:bg-white/10",
            "border border-white/10",
            "transition-all duration-200"
          )}
          aria-label="Open navigation menu"
          aria-expanded="false"
          aria-controls="mobile-sidebar"
        >
          <PanelLeft className="h-5 w-5 text-white/80" />
        </Button>

        {/* App name/logo */}
        {showLogo && (
          <span className="text-xl font-semibold text-white/80 tracking-tight leading-10">
            Vana
          </span>
        )}
      </div>

      {/* Right side: Sign in button or user profile button */}
      {isAuthenticated ? (
        <UserProfileButton collapsed={true} />
      ) : (
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
