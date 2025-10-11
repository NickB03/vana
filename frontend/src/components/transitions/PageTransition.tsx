'use client'

import { motion, AnimatePresence, Variants } from 'framer-motion'
import { useEffect, useState } from 'react'

interface PageTransitionProps {
  children: React.ReactNode
  /**
   * Unique key to trigger transitions when changed
   * Use different keys for different views (e.g., "home", "chat-123")
   */
  transitionKey: string
  /**
   * Transition duration in seconds
   * @default 0.25
   */
  duration?: number
  /**
   * Transition type: fade, slide, or fade-slide
   * @default "fade-slide"
   */
  type?: 'fade' | 'slide' | 'fade-slide'
}

/**
 * PageTransition Component
 *
 * Provides smooth, accessible page transitions using Framer Motion.
 * Respects user's prefers-reduced-motion setting for accessibility.
 *
 * Features:
 * - Fade + slide animations (subtle 20px upward slide)
 * - GPU-accelerated (uses transform and opacity only)
 * - Fast transitions (250ms default)
 * - Respects prefers-reduced-motion
 * - No layout shift or render blocking
 *
 * @example
 * <PageTransition transitionKey="home">
 *   <HomePage />
 * </PageTransition>
 */
export function PageTransition({
  children,
  transitionKey,
  duration = 0.25,
  type = 'fade-slide',
}: PageTransitionProps) {
  // Check for reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check initial preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Animation variants based on type
  const fadeVariants: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  }

  const slideVariants: Variants = {
    initial: { y: 20, opacity: 1 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 1 },
  }

  const fadeSlideVariants: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  }

  // Select variants based on type
  const getVariants = () => {
    switch (type) {
      case 'fade':
        return fadeVariants
      case 'slide':
        return slideVariants
      case 'fade-slide':
      default:
        return fadeSlideVariants
    }
  }

  // If user prefers reduced motion, disable animations
  if (prefersReducedMotion) {
    return <div key={transitionKey}>{children}</div>
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        variants={getVariants()}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          duration,
          ease: [0.22, 1, 0.36, 1], // Custom easing for natural feel
        }}
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Hook to get the current reduced motion preference
 * Useful for conditional animations in other components
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}
