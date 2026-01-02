import type { CSSProperties, ReactNode } from "react";
import { motion } from "motion/react";
import { SparkleBackground, type SparkleBackgroundProps } from "@/components/ui/sparkle-background";
import { fadeInUp } from "@/utils/animationConstants";
import { cn } from "@/lib/utils";

export interface PageLayoutProps {
  /**
   * Main page content to render inside the layout.
   */
  children: ReactNode;
  /**
   * Classes applied to the main content container.
   */
  className?: string;
  /**
   * Optional Tailwind classes to control shader opacity (e.g. "opacity-30").
   * Defaults to 30% opacity to match the design used across most pages.
   */
  shaderOpacityClassName?: string;
  /**
   * Whether to show the radial gradient overlay above the shader.
   */
  showGradient?: boolean;
  /**
   * Optional style overrides for the gradient layer (background, etc.).
   * Used by Home to apply a slightly different gradient while keeping
   * the same positioning and z-index.
   */
  gradientStyle?: CSSProperties;
  /**
   * If true, wraps the content in a motion.div using fadeInUp.
   */
  enableEntranceAnimation?: boolean;
  /**
   * Optional delay (in seconds) applied to the entrance animation.
   */
  animationDelay?: number;
  /**
   * Optional sparkle background settings for live tweaking.
   * Passed through to SparkleBackground component.
   */
  sparkleSettings?: Omit<SparkleBackgroundProps, 'className' | 'opacity'>;
  /**
   * Whether to render the sparkle background in PageLayout.
   * Set to false when rendering SparkleBackground separately (e.g., inside SidebarInset).
   */
  showSparkleBackground?: boolean;
}

const DEFAULT_GRADIENT_STYLE: CSSProperties = {
  zIndex: -1,
  background: "radial-gradient(125% 125% at 50% 10%, #000000 40%, #1e293b 100%)",
};

export function PageLayout({
  children,
  className,
  shaderOpacityClassName = "opacity-30",
  showGradient = true,
  gradientStyle,
  enableEntranceAnimation = true,
  animationDelay = 0,
  sparkleSettings,
  showSparkleBackground = true,
}: PageLayoutProps) {
  const Container = enableEntranceAnimation ? motion.div : "div";

  const mergedGradientStyle: CSSProperties = showGradient
    ? { ...DEFAULT_GRADIENT_STYLE, ...gradientStyle }
    : {};

  const transition = enableEntranceAnimation
    ? { duration: 0.3, delay: animationDelay }
    : undefined;

  return (
    <div className="min-h-[var(--app-height)] w-full bg-zinc-950 relative">
      {/* Sparkle background layer - z-0 sits on top of bg-zinc-950 */}
      {showSparkleBackground && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <SparkleBackground className={shaderOpacityClassName} {...sparkleSettings} />
        </div>
      )}

      {/* Radial gradient overlay */}
      {showGradient && (
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{ ...mergedGradientStyle, zIndex: 0 }}
        />
      )}

      {/* Main content container with optional entrance animation */}
      <Container
        {...(enableEntranceAnimation ? fadeInUp : {})}
        transition={transition}
        className={cn("relative z-10", className)}
      >
        {children}
      </Container>
    </div>
  );
}
