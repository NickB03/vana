import { useState, useEffect, memo } from "react"
import { Sparkles } from "@/components/Sparkles"
import { useScrollPause } from "@/hooks/useScrollPause"

// Default settings from SparklesDemo - exported for control panels
export const SPARKLE_DEFAULTS = {
  height: 100,           // 100% height
  curvePosition: 53,     // Position of half-moon curve (desktop) - locked position
  mobileCurvePosition: 70, // Position of half-moon curve (mobile) - locked position
  density: 100,          // Particle count
  glowOpacity: 25,       // 25% glow opacity
  particleColor: "#FFFFFF",
  glowColor: "#8350e8",
  glowGradient: ["#22c55e", "#3b82f6", "#8b5cf6"], // Aurora gradient
  useGradient: true,
  speed: 0.2,
  particleSize: 2,
  particleGlow: true,
  opacitySpeed: 0.5,
  minOpacity: 0.7,
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
 * SparkleBackground - Animated sparkle particles with half-moon horizon effect
 *
 * Creates a 3-layer composition:
 * 1. Glow background layer (radial/conic gradient with Aurora colors)
 * 2. Sparkles particles (middle layer with radial mask)
 * 3. Half moon curve (covers bottom portion)
 *
 * All settings are configurable via props for live tweaking.
 * Replaces the plasma shader background with sparkle particles.
 *
 * Performance: Optimized for ~2-3% GPU usage at default density (100 particles), 60fps target on modern devices
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
  // Pause animations during scroll for better performance
  const { isScrolling } = useScrollPause(150)

  // Detect mobile viewport for responsive curve position
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }

    // Check on mount
    checkMobile()

    // Listen for resize
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
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

        {/* Layer 2: Sparkles (middle layer) */}
        <div
          className="absolute inset-0"
          style={{
            maskImage: `radial-gradient(${vignetteWidth}% ${vignetteHeight}%, white, transparent 85%)`,
            WebkitMaskImage: `radial-gradient(${vignetteWidth}% ${vignetteHeight}%, white, transparent 85%)`,
          }}
        >
          <Sparkles
            density={density}
            color={particleColor}
            speed={speed}
            size={particleSize}
            glow={particleGlow}
            glowColor={useGradient ? glowGradient[0] : glowColor}
            opacitySpeed={opacitySpeed}
            minOpacity={minOpacity}
            paused={isScrolling}
            className="absolute inset-0 w-full h-full"
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
