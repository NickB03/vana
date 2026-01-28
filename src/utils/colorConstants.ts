/**
 * Color and Gradient Constants
 *
 * Centralized color system for consistent visual design across the application.
 * All gradient-based UI elements should reference these constants for brand cohesion.
 */

/**
 * Brand gradient patterns
 * Use these for primary UI elements and accents
 */
export const GRADIENTS = {
  /** Primary brand gradient - Blue for knowledge/trust */
  primary: "from-blue-500 via-blue-600 to-indigo-600",

  /** Accent gradient - Purple for insights/premium */
  accent: "from-purple-500 via-purple-600 to-violet-600",

  /** Success gradient - Green for growth/positive */
  success: "from-emerald-500 via-green-600 to-teal-600",

  /** Warning gradient - Orange for attention/caution */
  warning: "from-orange-500 via-amber-600 to-yellow-600",

  /** Info gradient - Cyan for structure/clarity */
  info: "from-cyan-500 via-cyan-600 to-sky-600",

  /** Creative gradient - Pink for imagination/innovation */
  creative: "from-pink-500 via-rose-600 to-fuchsia-600",
} as const;

/**
 * Gradient text utility classes
 * Apply gradient as text color with background-clip
 */
export const GRADIENT_TEXT = {
  primary: "bg-gradient-to-r from-[hsl(0,0%,30%)] to-[hsl(0,0%,40%)] bg-clip-text text-transparent",
  accent: "bg-gradient-to-r from-[hsl(0,0%,40%)] to-[hsl(0,0%,50%)] bg-clip-text text-transparent",
  success: "bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 bg-clip-text text-transparent",
  info: "bg-gradient-to-r from-[hsl(0,0%,30%)] to-[hsl(0,0%,40%)] bg-clip-text text-transparent",
} as const;

/**
 * Gradient background utility classes with directional variants
 */
export const GRADIENT_BG = {
  primary: {
    toR: `bg-gradient-to-r ${GRADIENTS.primary}`,
    toB: `bg-gradient-to-b ${GRADIENTS.primary}`,
    toBR: `bg-gradient-to-br ${GRADIENTS.primary}`,
  },
  accent: {
    toR: `bg-gradient-to-r ${GRADIENTS.accent}`,
    toB: `bg-gradient-to-b ${GRADIENTS.accent}`,
    toBR: `bg-gradient-to-br ${GRADIENTS.accent}`,
  },
  success: {
    toR: `bg-gradient-to-r ${GRADIENTS.success}`,
    toB: `bg-gradient-to-b ${GRADIENTS.success}`,
    toBR: `bg-gradient-to-br ${GRADIENTS.success}`,
  },
} as const;

/**
 * Semantic color roles
 * Map specific UI purposes to gradient constants
 */
export const SEMANTIC_GRADIENTS = {
  /** Primary CTA buttons and main actions */
  cta: GRADIENTS.primary,

  /** Hero text and branding elements */
  hero: GRADIENTS.info,

  /** Feature highlights and benefits */
  feature: GRADIENTS.accent,

  /** Success states and confirmations */
  positive: GRADIENTS.success,
} as const;

/**
 * Showcase feature category colors
 * Each feature type gets a semantically meaningful color
 */
export const SHOWCASE_GRADIENTS = {
  /** Research/Knowledge - Blue */
  research: GRADIENTS.primary,

  /** Code/Development - Green */
  code: GRADIENTS.success,

  /** Data/Visualization - Purple */
  visualization: GRADIENTS.accent,

  /** Diagrams/Structure - Cyan */
  diagrams: GRADIENTS.info,

  /** Image/Creative - Pink */
  image: GRADIENTS.creative,

  /** Documents/Organization - Orange */
  documents: GRADIENTS.warning,
} as const;
