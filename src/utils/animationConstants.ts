/**
 * @deprecated This file is kept for backwards compatibility only.
 *
 * All new code should import from @/utils/animationSystem instead.
 * This file re-exports from animationSystem.ts to ensure single source of truth.
 *
 * Migration path:
 * - Replace: import { fadeInUp } from '@/utils/animationConstants'
 * - With: import { MOTION_VARIANTS } from '@/utils/animationSystem'
 * - Then use: MOTION_VARIANTS.fadeIn
 *
 * See .claude/ANIMATION_MIGRATION_GUIDE.md for full migration guide.
 */

// Re-export everything from the new animation system
export {
  // Legacy Motion variants (same functionality, different names)
  fadeInUp,
  scaleIn,
  staggerContainer,
  staggerItem,

  // Legacy durations (same values)
  ANIMATION_DURATIONS,
  ANIMATION_EASINGS,
  TAILWIND_DURATIONS,

  // Legacy scroll animations
  scrollFadeIn,
  scrollStaggerContainer,
  scrollStaggerItem,

  // Legacy hover animation
  hoverLift,
} from './animationSystem';
