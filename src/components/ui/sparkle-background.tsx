import { useState, useEffect, memo } from "react"
import { logError } from "@/utils/errorLogging"

/**
 * Seeded Linear Congruential Generator (LCG) for deterministic random numbers.
 * Returns a function that generates consistent pseudo-random values [0, 1).
 *
 * @param seed - Initial seed value
 * @returns Function that generates next random number in sequence
 *
 * Why seeded: Ensures star positions remain identical across renders and builds,
 * preventing visual "jumping" when component re-mounts.
 */
function seededRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
}

/**
 * Generates CSS box-shadow string for a layer of stars.
 * Each star is positioned in viewport units (vw/vh) for responsive scaling.
 *
 * @param count - Number of stars to generate
 * @param minSize - Minimum star size in pixels
 * @param maxSize - Maximum star size in pixels
 * @param minOpacity - Minimum star opacity (0-1)
 * @param maxOpacity - Maximum star opacity (0-1)
 * @param seed - Random seed (default: 12345)
 * @returns Comma-separated box-shadow declarations
 *
 * Format: "X Y blur spread color" where X/Y are viewport percentages
 */
function generateBoxShadow(
  count: number,
  minSize: number,
  maxSize: number,
  minOpacity: number,
  maxOpacity: number,
  seed: number = 12345
): string {
  const random = seededRandom(seed + count)
  const shadows: string[] = []

  for (let i = 0; i < count; i++) {
    const x = Math.round(random() * 2000) // vw units * 10 for precision
    const y = Math.round(random() * 1000) // vh units * 10
    const size = minSize + random() * (maxSize - minSize)
    const opacity = minOpacity + random() * (maxOpacity - minOpacity)

    shadows.push(
      `${x / 10}vw ${y / 10}vh 0 ${size}px rgba(255, 255, 255, ${opacity.toFixed(2)})`
    )
  }

  return shadows.join(', ')
}

/**
 * Pre-generated static star layers (computed once at module load).
 * Three layers create depth perception through size/opacity variation:
 * - Small: 50 distant stars (0.5-1px, 30-70% opacity)
 * - Medium: 35 mid-distance stars (1-1.5px, 50-90% opacity)
 * - Large: 15 foreground stars (1.5-2.5px, 70-100% opacity)
 * Total: 100 stars
 */
const STATIC_STAR_LAYERS = {
  small: generateBoxShadow(50, 0.5, 1, 0.3, 0.7),
  medium: generateBoxShadow(35, 1, 1.5, 0.5, 0.9),
  large: generateBoxShadow(15, 1.5, 2.5, 0.7, 1),
}

// Default settings from SparklesDemo - exported for control panels
export const SPARKLE_DEFAULTS = {
  height: 100,           // 100% height
  curvePosition: 53,     // Position of half-moon curve (desktop) - locked position
  mobileCurvePosition: 70, // Position of half-moon curve (mobile) - locked position
  density: 100,          // Legacy prop - ignored (star count is fixed at 100)
  glowOpacity: 25,       // 25% glow opacity
  particleColor: "#FFFFFF",
  glowColor: "#8350e8",
  glowGradient: ["#22c55e", "#3b82f6", "#8b5cf6"], // Aurora gradient
  useGradient: true,
  speed: 0.2,            // Legacy prop - no animation in current implementation
  particleSize: 2,       // Legacy prop - not used by static stars
  particleGlow: true,    // Legacy prop - not used by static stars
  opacitySpeed: 0.5,     // Legacy prop - no animation in current implementation
  minOpacity: 0.7,       // Legacy prop - not used by static stars
  // Vignette controls - shape of the radial mask fade
  vignetteWidth: 75,     // Horizontal spread of vignette (%)
  vignetteHeight: 55,    // Vertical spread of vignette (%)
  // Gradient spread controls - how far colors extend
  gradientSpreadX: 150,  // Horizontal spread of gradient colors (%)
  gradientSpreadY: 60,   // Vertical spread of gradient colors (%)
}

export interface SparkleBackgroundProps {
  className?: string
  opacity?: number
  /**
   * Position mode: 'fixed' for viewport-relative (default), 'absolute' for container-relative.
   * Use 'absolute' when rendering inside a positioned container like SidebarInset.
   */
  position?: 'fixed' | 'absolute'
  // All configurable settings (optional, defaults to SPARKLE_DEFAULTS)
  height?: number
  /** Curve position for desktop (percentage from top). Default: 53 */
  curvePosition?: number
  /** Curve position for mobile (percentage from top). Default: 70 - higher = lower on screen */
  mobileCurvePosition?: number
  density?: number
  glowOpacity?: number
  particleColor?: string
  glowColor?: string
  glowGradient?: string[]
  useGradient?: boolean
  speed?: number
  particleSize?: number
  particleGlow?: boolean
  opacitySpeed?: number
  minOpacity?: number
  /** Horizontal spread of vignette mask (%). Higher = wider visible area. Default: 50 */
  vignetteWidth?: number
  /** Vertical spread of vignette mask (%). Higher = taller visible area. Default: 50 */
  vignetteHeight?: number
  /** Horizontal spread of gradient colors (%). Higher = colors extend further left/right. Default: 150 */
  gradientSpreadX?: number
  /** Vertical spread of gradient colors (%). Higher = colors extend further up. Default: 60 */
  gradientSpreadY?: number
}

/**
 * SparkleBackground - Static star field with half-moon horizon effect
 *
 * Creates a 3-layer composition:
 * 1. Glow background layer (radial/conic gradient with Aurora colors)
 * 2. Static stars via CSS box-shadow (3 pre-generated layers for depth)
 * 3. Half moon curve (covers bottom portion)
 *
 * Stars are generated once at module load using seeded random for consistency.
 * Uses CSS box-shadow on single 1px elements - zero animation overhead.
 *
 * Performance: ~0% CPU, <0.5% GPU (static compositor layer, no animation loop)
 */
export const SparkleBackground = memo(function SparkleBackground({
  className = '',
  opacity = 1,
  position = 'fixed',
  height = SPARKLE_DEFAULTS.height,
  curvePosition = SPARKLE_DEFAULTS.curvePosition,
  mobileCurvePosition = SPARKLE_DEFAULTS.mobileCurvePosition,
  density = SPARKLE_DEFAULTS.density,
  glowOpacity = SPARKLE_DEFAULTS.glowOpacity,
  particleColor = SPARKLE_DEFAULTS.particleColor,
  glowColor = SPARKLE_DEFAULTS.glowColor,
  glowGradient = SPARKLE_DEFAULTS.glowGradient,
  useGradient = SPARKLE_DEFAULTS.useGradient,
  speed = SPARKLE_DEFAULTS.speed,
  particleSize = SPARKLE_DEFAULTS.particleSize,
  particleGlow = SPARKLE_DEFAULTS.particleGlow,
  opacitySpeed = SPARKLE_DEFAULTS.opacitySpeed,
  minOpacity = SPARKLE_DEFAULTS.minOpacity,
  vignetteWidth = SPARKLE_DEFAULTS.vignetteWidth,
  vignetteHeight = SPARKLE_DEFAULTS.vignetteHeight,
  gradientSpreadX = SPARKLE_DEFAULTS.gradientSpreadX,
  gradientSpreadY = SPARKLE_DEFAULTS.gradientSpreadY,
}: SparkleBackgroundProps) {
  // Detect mobile viewport for responsive curve position
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    let mounted = true;

    const checkMobile = () => {
      try {
        if (!mounted) return;
        setIsMobile(window.innerWidth < 768); // md breakpoint
      } catch (error) {
        logError(
          error instanceof Error ? error : new Error('Resize handler failed'),
          {
            errorId: 'SPARKLE_BACKGROUND_RESIZE_ERROR',
            metadata: {
              mounted,
              innerWidth: typeof window !== 'undefined' ? window.innerWidth : undefined,
            }
          }
        );
      }
    };

    // Check on mount
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', checkMobile);

    return () => {
      mounted = false;
      window.removeEventListener('resize', checkMobile);
    };
  }, [])

  // Use mobile curve position on smaller screens
  const effectiveCurvePosition = isMobile ? mobileCurvePosition : curvePosition

  // Generate the glow background based on mode
  const getGlowBackground = () => {
    if (useGradient) {
      const colorStops = glowGradient
        .map((c, i) => {
          const percent = glowGradient.length > 1
            ? (i / (glowGradient.length - 1)) * 100
            : 50;
          return `${c} ${percent}%`;
        })
        .join(', ')
      return `radial-gradient(ellipse ${gradientSpreadX}% ${gradientSpreadY}% at 50% 100%, ${glowGradient[0]}, transparent 70%), conic-gradient(from 180deg at 50% 100%, ${colorStops})`
    }
    return `radial-gradient(circle at bottom center, ${glowColor}, transparent 70%)`
  }

  // Get the primary color for the curve glow (first gradient color or solid color)
  const getCurveGlowColor = () => {
    return useGradient ? glowGradient[0] : glowColor
  }

  return (
    <div
      className={`${position} inset-0 z-[1] pointer-events-none ${className}`}
      style={{ clipPath: 'inset(0)', opacity }}
    >
      {/* Container with radial mask for overall fade effect */}
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{
          height: `${height}%`,
          maskImage: `radial-gradient(${vignetteWidth}% ${vignetteHeight}%, white, transparent)`,
          WebkitMaskImage: `radial-gradient(${vignetteWidth}% ${vignetteHeight}%, white, transparent)`,
        }}
      >
        {/* Layer 1: Glow (behind everything) - supports solid or gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: getGlowBackground(),
            opacity: glowOpacity / 100,
          }}
        />

        {/* Layer 2: Static stars via CSS box-shadow */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            maskImage: `radial-gradient(${vignetteWidth}% ${vignetteHeight}%, white, transparent 85%)`,
            WebkitMaskImage: `radial-gradient(${vignetteWidth}% ${vignetteHeight}%, white, transparent 85%)`,
          }}
        >
          {/* Small distant stars */}
          <div
            className="absolute w-px h-px rounded-full"
            style={{ boxShadow: STATIC_STAR_LAYERS.small }}
          />
          {/* Medium stars */}
          <div
            className="absolute w-px h-px rounded-full"
            style={{ boxShadow: STATIC_STAR_LAYERS.medium }}
          />
          {/* Large bright stars */}
          <div
            className="absolute w-px h-px rounded-full"
            style={{ boxShadow: STATIC_STAR_LAYERS.large }}
          />
        </div>

        {/* Layer 3: Half moon curve (ON TOP - covers bottom portion) */}
        <div
          className="absolute -left-1/2 w-[200%] rounded-[100%] bg-zinc-900"
          style={{
            top: `${effectiveCurvePosition}%`,
            aspectRatio: '1 / 0.7',
            boxShadow: `
              0 -60px 100px -20px ${getCurveGlowColor()}50,
              0 -30px 60px -10px ${getCurveGlowColor()}40,
              0 -10px 30px 0px ${getCurveGlowColor()}60,
              0 -2px 10px 0px ${getCurveGlowColor()}80,
              inset 0 2px 4px 0 ${getCurveGlowColor()}40
            `,
          }}
        />
      </div>
    </div>
  )
})
