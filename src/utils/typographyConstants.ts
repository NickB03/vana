/**
 * Typography Constants
 *
 * Centralized typography system following a modular scale (1.25 ratio) for
 * consistent text styling across the application.
 *
 * Scale Calculation:
 * - Base: 16px (1rem)
 * - Ratio: 1.25 (Major Third)
 * - Each step: size × 1.25 = next size
 *
 * Usage:
 * ```tsx
 * import { DISPLAY, HEADING, BODY } from '@/utils/typographyConstants'
 *
 * <h1 className={DISPLAY.xl}>Welcome</h1>
 * <p className={BODY.md}>This is body text</p>
 * ```
 *
 * Responsive Pattern:
 * - Mobile-first approach
 * - Desktop sizes scale up at md breakpoint (768px)
 * - Use `full` variant for automatic responsive sizing
 */

/**
 * Display Text (Hero sections, major headings)
 *
 * Large, attention-grabbing text for landing pages and key sections.
 * Tighter line height (1.1) for impact, slightly tighter letter spacing.
 */
export const DISPLAY = {
  /** Extra Large: 48px mobile / 64px desktop - Page heroes */
  xl: {
    mobile: 'text-5xl leading-tight tracking-tight',
    desktop: 'md:text-6xl md:leading-tight',
    full: 'text-5xl leading-tight tracking-tight md:text-6xl md:leading-tight',
  },
  /** Large: 40px mobile / 48px desktop - Section headers */
  lg: {
    mobile: 'text-4xl leading-tight tracking-tight',
    desktop: 'md:text-5xl md:leading-tight',
    full: 'text-4xl leading-tight tracking-tight md:text-5xl md:leading-tight',
  },
  /** Medium: 32px mobile / 40px desktop - Subsection headers */
  md: {
    mobile: 'text-3xl leading-tight tracking-tight',
    desktop: 'md:text-4xl md:leading-tight',
    full: 'text-3xl leading-tight tracking-tight md:text-4xl md:leading-tight',
  },
} as const;

/**
 * Heading Text (Content sections, card titles)
 *
 * Structured content headings with balanced readability.
 * Standard line height (1.2) for better multi-line reading.
 */
export const HEADING = {
  /** Extra Large: 28px mobile / 32px desktop - Major content headers */
  xl: {
    mobile: 'text-3xl leading-snug tracking-tight',
    desktop: 'md:text-4xl md:leading-snug',
    full: 'text-3xl leading-snug tracking-tight md:text-4xl md:leading-snug',
  },
  /** Large: 24px mobile / 28px desktop - Section headers */
  lg: {
    mobile: 'text-2xl leading-snug tracking-tight',
    desktop: 'md:text-3xl md:leading-snug',
    full: 'text-2xl leading-snug tracking-tight md:text-3xl md:leading-snug',
  },
  /** Medium: 20px mobile / 24px desktop - Subsection headers */
  md: {
    mobile: 'text-xl leading-snug',
    desktop: 'md:text-2xl md:leading-snug',
    full: 'text-xl leading-snug md:text-2xl md:leading-snug',
  },
  /** Small: 18px mobile / 20px desktop - Card titles, small headers */
  sm: {
    mobile: 'text-lg leading-normal',
    desktop: 'md:text-xl md:leading-normal',
    full: 'text-lg leading-normal md:text-xl md:leading-normal',
  },
} as const;

/**
 * Body Text (Paragraphs, descriptions, UI text)
 *
 * Optimized for readability with generous line height (1.6-1.8).
 * Normal letter spacing for comfortable extended reading.
 */
export const BODY = {
  /** Large: 18px mobile / 20px desktop - Introductory text, featured content */
  lg: {
    mobile: 'text-lg leading-relaxed',
    desktop: 'md:text-xl md:leading-relaxed',
    full: 'text-lg leading-relaxed md:text-xl md:leading-relaxed',
  },
  /** Medium: 16px all screens - Standard body text (default browser size) */
  md: {
    mobile: 'text-base leading-relaxed',
    desktop: 'md:text-base md:leading-relaxed',
    full: 'text-base leading-relaxed',
  },
  /** Small: 14px all screens - Secondary info, captions, labels */
  sm: {
    mobile: 'text-sm leading-normal',
    desktop: 'md:text-sm md:leading-normal',
    full: 'text-sm leading-normal',
  },
  /** Extra Small: 12px all screens - Helper text, timestamps, metadata */
  xs: {
    mobile: 'text-xs leading-normal',
    desktop: 'md:text-xs md:leading-normal',
    full: 'text-xs leading-normal',
  },
} as const;

/**
 * Font Weight Utilities
 *
 * Semantic weight names for common use cases.
 */
export const WEIGHT = {
  light: 'font-light',       // 300 - Subtle, elegant text
  normal: 'font-normal',     // 400 - Body text
  medium: 'font-medium',     // 500 - Slightly emphasized
  semibold: 'font-semibold', // 600 - Headings, CTAs
  bold: 'font-bold',         // 700 - Strong emphasis
  extrabold: 'font-extrabold', // 800 - Hero text
} as const;

/**
 * Line Height Utilities
 *
 * Independent line height controls for fine-tuning.
 */
export const LINE_HEIGHT = {
  none: 'leading-none',       // 1.0 - Tight displays
  tight: 'leading-tight',     // 1.25 - Large headings
  snug: 'leading-snug',       // 1.375 - Headings
  normal: 'leading-normal',   // 1.5 - UI elements
  relaxed: 'leading-relaxed', // 1.625 - Body text
  loose: 'leading-loose',     // 2.0 - Spacious reading
} as const;

/**
 * Letter Spacing Utilities
 *
 * Tracking adjustments for visual refinement.
 */
export const TRACKING = {
  tighter: 'tracking-tighter', // -0.05em - Tight headlines
  tight: 'tracking-tight',     // -0.025em - Headings
  normal: 'tracking-normal',   // 0em - Body text
  wide: 'tracking-wide',       // 0.025em - Buttons, labels
  wider: 'tracking-wider',     // 0.05em - Uppercase text
  widest: 'tracking-widest',   // 0.1em - Spaced emphasis
} as const;

/**
 * Text Alignment Utilities
 *
 * Responsive text alignment patterns.
 */
export const ALIGN = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
  // Responsive: mobile center, desktop left
  centerToLeft: 'text-center md:text-left',
  // Responsive: mobile center, desktop right
  centerToRight: 'text-center md:text-right',
} as const;

/**
 * Truncation Utilities
 *
 * Text overflow handling patterns.
 */
export const TRUNCATE = {
  /** Single line truncation with ellipsis */
  single: 'truncate',
  /** Two line clamp */
  twoLines: 'line-clamp-2',
  /** Three line clamp */
  threeLines: 'line-clamp-3',
  /** Four line clamp */
  fourLines: 'line-clamp-4',
} as const;

/**
 * Common Typography Combinations
 *
 * Pre-composed patterns for frequent use cases.
 */
export const COMBO = {
  /** Hero headline: large, bold, tight */
  hero: `${DISPLAY.xl.full} ${WEIGHT.extrabold}`,
  /** Section title: medium display, semibold */
  sectionTitle: `${DISPLAY.md.full} ${WEIGHT.semibold}`,
  /** Card header: large heading, semibold */
  cardHeader: `${HEADING.lg.full} ${WEIGHT.semibold}`,
  /** Body lead: large body, medium weight */
  bodyLead: `${BODY.lg.full} ${WEIGHT.normal}`,
  /** Label: small body, medium weight, wide tracking */
  label: `${BODY.sm.full} ${WEIGHT.medium} ${TRACKING.wide}`,
  /** Caption: extra small, normal weight */
  caption: `${BODY.xs.full} ${WEIGHT.normal}`,
} as const;

/**
 * Helper function to combine typography classes
 *
 * @example
 * combineTypography(HEADING.lg.full, WEIGHT.bold, 'text-primary')
 */
export const combineTypography = (...classes: string[]): string => {
  return classes.join(' ');
};

/**
 * Unified TYPOGRAPHY export for convenience
 *
 * @example
 * import { TYPOGRAPHY } from '@/utils/typographyConstants'
 * <h1 className={TYPOGRAPHY.DISPLAY.xl.full}>Hero</h1>
 */
export const TYPOGRAPHY = {
  DISPLAY,
  HEADING,
  BODY,
  WEIGHT,
  LINE_HEIGHT,
  TRACKING,
  ALIGN,
  TRUNCATE,
  COMBO,
} as const;
