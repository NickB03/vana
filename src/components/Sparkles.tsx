import { useEffect, useId, useMemo, useRef, useState } from "react"
import Particles, { initParticlesEngine } from "@tsparticles/react"
import { loadSlim } from "@tsparticles/slim"

interface SparklesProps {
  className?: string
  size?: number
  minSize?: number | null
  density?: number
  speed?: number
  minSpeed?: number | null
  opacity?: number
  opacitySpeed?: number
  minOpacity?: number | null
  color?: string
  background?: string
  glow?: boolean
  glowColor?: string
  /** Pause all particle movement and animations (useful during scroll) */
  paused?: boolean
  options?: Record<string, unknown>
  onError?: (error: Error) => void
}

export function Sparkles({
  className,
  size = 1,
  minSize = null,
  density = 800,
  speed = 1,
  minSpeed = null,
  opacity = 1,
  opacitySpeed = 3,
  minOpacity = null,
  color = "#FFFFFF",
  background = "transparent",
  glow = false,
  glowColor,
  paused = false,
  options = {},
  onError,
}: SparklesProps) {
  const [isReady, setIsReady] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const onErrorRef = useRef(onError)

  // Keep ref updated to avoid stale closure
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  // Mobile detection for performance optimization
  // Reduces FPS and disables glow effects on mobile devices
  // Debounced to prevent excessive re-renders during window resize
  useEffect(() => {
    let timeoutId: number | null = null
    const checkMobile = () => {
      if (timeoutId) window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        setIsMobile(window.innerWidth < 768)
      }, 100)
    }
    // Set initial value immediately (no debounce for initial render)
    setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', checkMobile)
    return () => {
      window.removeEventListener('resize', checkMobile)
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [])

  // Initialize particle engine once on mount
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    })
      .then(() => {
        setIsReady(true)
      })
      .catch((error) => {
        console.error('[Sparkles] Failed to initialize particle engine:', error)
        onErrorRef.current?.(error instanceof Error ? error : new Error(String(error)))
        // Component will simply not render particles - graceful degradation
      })
  }, [])

  const id = useId()

  // Memoize particle options to prevent unnecessary re-initialization
  // when parent components re-render (e.g., typing in input box)
  const particleOptions = useMemo(() => {
    const defaultOptions = {
      background: {
        color: {
          value: background,
        },
      },
      fullScreen: {
        enable: false,
        zIndex: 1,
      },
      // Mobile optimization: reduce FPS from 120 to 30 on mobile to prevent GPU overload and scroll stuttering
      fpsLimit: isMobile ? 30 : 60,
      particles: {
        color: {
          value: color,
        },
        move: {
          enable: !paused,
          direction: "none" as const,
          speed: {
            min: minSpeed ?? speed / 10,
            max: speed,
          },
          straight: false,
        },
        number: {
          value: density,
        },
        opacity: {
          value: {
            min: minOpacity ?? opacity / 10,
            max: opacity,
          },
          animation: {
            enable: !paused,
            sync: false,
            speed: opacitySpeed,
          },
        },
        size: {
          value: {
            min: minSize ?? size / 2.5,
            max: size,
          },
        },
        // Add shadow/glow effect when enabled (disabled on mobile for performance)
        ...(glow && !isMobile && {
          shadow: {
            enable: true,
            color: {
              value: glowColor || color,
            },
            blur: size * 8,
            offset: {
              x: 0,
              y: 0,
            },
          },
        }),
      },
      detectRetina: true,
    }
    return { ...defaultOptions, ...options }
  }, [background, color, density, glow, glowColor, minOpacity, minSize, minSpeed, opacity, opacitySpeed, options, size, speed, isMobile, paused])

  return isReady ? (
    <Particles id={id} options={particleOptions} className={className} />
  ) : null
}
