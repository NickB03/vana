import { DesktopHeader } from "@/components/DesktopHeader";
import { MobileHeader } from "@/components/MobileHeader";
import { UserProfileButton } from "@/components/UserProfileButton";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/**
 * HeaderTestPage - Visual test page for header components
 *
 * This page allows previewing both authentication states of the header
 * without needing to sign in/out. Use this to verify the fix for:
 * - Layout shift when header disappears
 * - UserProfileButton integration in headers
 *
 * Visit: /dev/header-test
 */
export default function HeaderTestPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-bold mb-2">Header Component Test</h1>
      <p className="text-muted-foreground mb-8">
        Preview header states to verify fix for layout shift regression
      </p>

      {/* Desktop Header States */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Desktop Header</h2>

        <div className="space-y-6">
          {/* Non-authenticated state - CURRENT */}
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">
              Non-authenticated (current behavior)
            </p>
            <div className="bg-black/50 rounded">
              <DesktopHeader isAuthenticated={false} />
            </div>
          </div>

          {/* Authenticated state - CURRENT (broken) */}
          <div className="border rounded-lg p-4 border-destructive/50">
            <p className="text-sm text-destructive mb-2">
              Authenticated - CURRENT (returns null → layout shift!)
            </p>
            <div className="bg-black/50 rounded min-h-12 flex items-center justify-center">
              <span className="text-muted-foreground text-sm">
                DesktopHeader returns null here
              </span>
            </div>
          </div>

          {/* Authenticated state - PROPOSED FIX */}
          <div className="border rounded-lg p-4 border-green-500/50">
            <p className="text-sm text-green-500 mb-2">
              Authenticated - PROPOSED (consistent h-12 with UserProfileButton)
            </p>
            <div className="bg-black/50 rounded">
              <header
                className={cn(
                  "hidden md:flex items-center justify-end px-4 h-12 shrink-0",
                  "bg-transparent"
                )}
              >
                <UserProfileButton collapsed={true} />
              </header>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Header States - wrapped in SidebarProvider */}
      <SidebarProvider defaultOpen={false}>
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Mobile Header</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Note: MobileHeader only renders on mobile viewport. Below are mockups showing the proposed layout.
          </p>

          <div className="space-y-6">
            {/* Non-authenticated */}
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">Non-authenticated</p>
              <div className="bg-black/50 rounded max-w-sm">
                <div className="flex items-center justify-between h-14 px-4">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <span className="text-white/80">☰</span>
                    </div>
                    <span className="text-xl font-semibold text-white/80">Vana</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="default"
                    className={cn(
                      "px-4 rounded-full",
                      "bg-white/5 hover:bg-white/10",
                      "border border-white/10",
                      "text-white/80 hover:text-white",
                      "text-sm font-medium"
                    )}
                  >
                    Sign in
                  </Button>
                </div>
              </div>
            </div>

            {/* Authenticated - CURRENT (empty right side) */}
            <div className="border rounded-lg p-4 border-destructive/50">
              <p className="text-sm text-destructive mb-2">
                Authenticated - CURRENT (empty right side)
              </p>
              <div className="bg-black/50 rounded max-w-sm">
                <div className="flex items-center justify-between h-14 px-4">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <span className="text-white/80">☰</span>
                    </div>
                    <span className="text-xl font-semibold text-white/80">Vana</span>
                  </div>
                  {/* Empty space where button should be */}
                </div>
              </div>
            </div>

            {/* Authenticated - PROPOSED FIX */}
            <div className="border rounded-lg p-4 border-green-500/50">
              <p className="text-sm text-green-500 mb-2">
                Authenticated - PROPOSED (collapsed UserProfileButton)
              </p>
              <div className="bg-black/50 rounded max-w-sm">
                <div className="flex items-center justify-between h-14 px-4">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <span className="text-white/80">☰</span>
                    </div>
                    <span className="text-xl font-semibold text-white/80">Vana</span>
                  </div>
                  <UserProfileButton collapsed={true} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </SidebarProvider>

      {/* Standalone UserProfileButton variants */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">UserProfileButton Variants</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Shows loading and loaded states. Collapsed mode shows just the avatar.
        </p>
        <div className="flex gap-8 flex-wrap">
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Expanded (collapsed=false)</p>
            <div className="bg-black/30 rounded p-2">
              <UserProfileButton collapsed={false} />
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Collapsed (collapsed=true)</p>
            <div className="bg-black/30 rounded p-2">
              <UserProfileButton collapsed={true} />
            </div>
          </div>
        </div>
      </section>

      {/* Layout comparison */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Layout Shift Comparison</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Notice how the content shifts when the header disappears vs stays consistent.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Before fix */}
          <div className="border rounded-lg p-4 border-destructive/50">
            <p className="text-sm text-destructive mb-2">Before Fix (layout shift)</p>
            <div className="bg-black/30 rounded overflow-hidden">
              <div className="h-0">{/* No header - content shifts up */}</div>
              <div className="p-4 bg-white/5">
                <div className="h-8 bg-white/10 rounded mb-2" />
                <div className="h-32 bg-white/5 rounded flex items-center justify-center text-muted-foreground text-sm">
                  Content area (shifted up when header gone)
                </div>
              </div>
            </div>
          </div>

          {/* After fix */}
          <div className="border rounded-lg p-4 border-green-500/50">
            <p className="text-sm text-green-500 mb-2">After Fix (consistent layout)</p>
            <div className="bg-black/30 rounded overflow-hidden">
              <div className="h-12 flex items-center justify-end px-4">
                <div className="h-8 w-8 rounded-full bg-white/10" />
              </div>
              <div className="p-4 bg-white/5">
                <div className="h-8 bg-white/10 rounded mb-2" />
                <div className="h-32 bg-white/5 rounded flex items-center justify-center text-muted-foreground text-sm">
                  Content area (stable position)
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
