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
  options = {},
  onError,
}: SparklesProps) {
  const [isReady, setIsReady] = useState(false)
  const onErrorRef = useRef(onError)

  // Keep ref updated to avoid stale closure
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

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
      fpsLimit: 120,
      particles: {
        color: {
          value: color,
        },
        move: {
          enable: true,
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
            enable: true,
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
        // Add shadow/glow effect when enabled
        ...(glow && {
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
  }, [background, color, density, glow, glowColor, minOpacity, minSize, minSpeed, opacity, opacitySpeed, options, size, speed])

  return isReady ? (
    <Particles id={id} options={particleOptions} className={className} />
  ) : null
}
