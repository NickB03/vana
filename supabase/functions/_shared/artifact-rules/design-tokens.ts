/**
 * Design Tokens for Vana Artifacts
 *
 * Based on Z.ai's tokens-first methodology:
 * - All visuals derived from semantic tokens, not ad-hoc values
 * - Supports light/dark mode through CSS custom properties
 * - Enables consistent design language across all artifacts
 *
 * Key principles:
 * 1. NEVER hardcode values - always reference tokens
 * 2. 8px spacing system for layout consistency
 * 3. Semantic color names that describe purpose, not appearance
 * 4. Motion tokens for consistent animations
 */

// =============================================================================
// COLOR TOKENS
// =============================================================================

export interface ColorTokens {
  // Backgrounds
  readonly background: string;
  readonly surface: string;
  readonly surfaceSubtle: string;
  readonly surfaceHover: string;

  // Text
  readonly text: string;
  readonly textSecondary: string;
  readonly textMuted: string;
  readonly textInverse: string;

  // Borders
  readonly border: string;
  readonly borderSubtle: string;
  readonly borderFocus: string;

  // Primary (Brand)
  readonly primary: string;
  readonly primaryHover: string;
  readonly primaryActive: string;
  readonly primaryForeground: string;

  // Accent
  readonly accent: string;
  readonly accentHover: string;
  readonly accentForeground: string;

  // Semantic States
  readonly success: string;
  readonly successForeground: string;
  readonly warning: string;
  readonly warningForeground: string;
  readonly danger: string;
  readonly dangerForeground: string;
  readonly info: string;
  readonly infoForeground: string;
}

export const LIGHT_COLORS: ColorTokens = {
  // Backgrounds
  background: 'hsl(0, 0%, 98%)',
  surface: 'hsl(0, 0%, 100%)',
  surfaceSubtle: 'hsl(0, 0%, 96%)',
  surfaceHover: 'hsl(0, 0%, 94%)',

  // Text
  text: 'hsl(0, 0%, 15%)',
  textSecondary: 'hsl(0, 0%, 45%)',
  textMuted: 'hsl(0, 0%, 60%)',
  textInverse: 'hsl(0, 0%, 100%)',

  // Borders
  border: 'hsl(0, 0%, 85%)',
  borderSubtle: 'hsl(0, 0%, 90%)',
  borderFocus: 'hsl(217, 91%, 60%)',

  // Primary (Blue)
  primary: 'hsl(217, 91%, 60%)',
  primaryHover: 'hsl(217, 91%, 55%)',
  primaryActive: 'hsl(217, 91%, 50%)',
  primaryForeground: 'hsl(0, 0%, 100%)',

  // Accent (Purple)
  accent: 'hsl(262, 83%, 58%)',
  accentHover: 'hsl(262, 83%, 53%)',
  accentForeground: 'hsl(0, 0%, 100%)',

  // Semantic States
  success: 'hsl(142, 71%, 45%)',
  successForeground: 'hsl(0, 0%, 100%)',
  warning: 'hsl(38, 92%, 50%)',
  warningForeground: 'hsl(0, 0%, 15%)',
  danger: 'hsl(0, 72%, 51%)',
  dangerForeground: 'hsl(0, 0%, 100%)',
  info: 'hsl(199, 89%, 48%)',
  infoForeground: 'hsl(0, 0%, 100%)',
};

export const DARK_COLORS: ColorTokens = {
  // Backgrounds
  background: 'hsl(0, 0%, 7%)',
  surface: 'hsl(0, 0%, 12%)',
  surfaceSubtle: 'hsl(0, 0%, 15%)',
  surfaceHover: 'hsl(0, 0%, 18%)',

  // Text
  text: 'hsl(0, 0%, 95%)',
  textSecondary: 'hsl(0, 0%, 70%)',
  textMuted: 'hsl(0, 0%, 55%)',
  textInverse: 'hsl(0, 0%, 15%)',

  // Borders
  border: 'hsl(0, 0%, 25%)',
  borderSubtle: 'hsl(0, 0%, 20%)',
  borderFocus: 'hsl(217, 91%, 60%)',

  // Primary (Blue - adjusted for dark mode)
  primary: 'hsl(217, 91%, 65%)',
  primaryHover: 'hsl(217, 91%, 70%)',
  primaryActive: 'hsl(217, 91%, 75%)',
  primaryForeground: 'hsl(0, 0%, 100%)',

  // Accent (Purple - adjusted for dark mode)
  accent: 'hsl(262, 83%, 68%)',
  accentHover: 'hsl(262, 83%, 73%)',
  accentForeground: 'hsl(0, 0%, 100%)',

  // Semantic States (adjusted for dark mode)
  success: 'hsl(142, 71%, 55%)',
  successForeground: 'hsl(0, 0%, 100%)',
  warning: 'hsl(38, 92%, 55%)',
  warningForeground: 'hsl(0, 0%, 15%)',
  danger: 'hsl(0, 72%, 60%)',
  dangerForeground: 'hsl(0, 0%, 100%)',
  info: 'hsl(199, 89%, 58%)',
  infoForeground: 'hsl(0, 0%, 100%)',
};

// =============================================================================
// TYPOGRAPHY TOKENS
// =============================================================================

type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export interface TypographyToken {
  readonly size: string;
  readonly lineHeight: number;
  readonly weight: FontWeight;
  readonly letterSpacing?: string;
}

export const TYPOGRAPHY: Record<string, TypographyToken> = {
  display: { size: '3.5rem', lineHeight: 1.1, weight: 700, letterSpacing: '-0.02em' },
  h1: { size: '2.5rem', lineHeight: 1.2, weight: 700, letterSpacing: '-0.01em' },
  h2: { size: '2rem', lineHeight: 1.25, weight: 600, letterSpacing: '-0.01em' },
  h3: { size: '1.5rem', lineHeight: 1.3, weight: 600 },
  h4: { size: '1.25rem', lineHeight: 1.4, weight: 600 },
  h5: { size: '1.125rem', lineHeight: 1.4, weight: 600 },
  h6: { size: '1rem', lineHeight: 1.4, weight: 600 },
  body: { size: '1rem', lineHeight: 1.6, weight: 400 },
  bodySmall: { size: '0.875rem', lineHeight: 1.5, weight: 400 },
  caption: { size: '0.75rem', lineHeight: 1.4, weight: 400 },
  overline: { size: '0.75rem', lineHeight: 1.4, weight: 600, letterSpacing: '0.08em' },
};

// Fluid typography using clamp() for responsive scaling
export const FLUID_TYPOGRAPHY = {
  display: 'clamp(2.5rem, 2rem + 2.5vw, 4rem)',
  h1: 'clamp(2rem, 1.5rem + 2vw, 3rem)',
  h2: 'clamp(1.5rem, 1.25rem + 1vw, 2rem)',
  h3: 'clamp(1.25rem, 1rem + 0.5vw, 1.5rem)',
  body: 'clamp(1rem, 0.95rem + 0.25vw, 1.125rem)',
};

// =============================================================================
// SPACING TOKENS (8px Base System)
// =============================================================================

export const SPACING = {
  0: '0px',
  1: '4px',    // 0.5 * 8
  2: '8px',    // 1 * 8
  3: '12px',   // 1.5 * 8
  4: '16px',   // 2 * 8
  5: '20px',   // 2.5 * 8
  6: '24px',   // 3 * 8
  8: '32px',   // 4 * 8
  10: '40px',  // 5 * 8
  12: '48px',  // 6 * 8
  16: '64px',  // 8 * 8
  20: '80px',  // 10 * 8
  24: '96px',  // 12 * 8
} as const;

// =============================================================================
// RADIUS TOKENS
// =============================================================================

export const RADIUS = {
  none: '0px',
  xs: '2px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  '3xl': '24px',
  full: '9999px',
} as const;

// =============================================================================
// SHADOW TOKENS
// =============================================================================

export const SHADOW = {
  none: 'none',
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const;

// Dark mode shadows (adjusted for dark backgrounds)
export const SHADOW_DARK = {
  none: 'none',
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.2)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.35), 0 4px 6px -4px rgb(0 0 0 / 0.35)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.4)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.5)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.2)',
} as const;

// =============================================================================
// MOTION TOKENS
// =============================================================================

export interface MotionToken {
  readonly duration: string;
  readonly easing: string;
}

export const MOTION: Record<string, MotionToken> = {
  // Micro-interactions (buttons, toggles)
  fast: { duration: '150ms', easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },

  // Default transitions (most UI)
  base: { duration: '220ms', easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },

  // Complex transitions (modals, drawers)
  slow: { duration: '300ms', easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },

  // Entrance animations
  enter: { duration: '220ms', easing: 'cubic-bezier(0, 0, 0.2, 1)' },

  // Exit animations
  exit: { duration: '150ms', easing: 'cubic-bezier(0.4, 0, 1, 1)' },

  // Spring-like (for playful interactions)
  spring: { duration: '500ms', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
} as const;

// =============================================================================
// Z-INDEX TOKENS
// =============================================================================

export const Z_INDEX = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  popover: 50,
  toast: 60,
  tooltip: 70,
} as const;

// =============================================================================
// BREAKPOINTS
// =============================================================================

export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// =============================================================================
// DESIGN DIRECTIONS (Style Templates)
// =============================================================================

export interface DesignDirection {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly characteristics: readonly string[];
  readonly customizations: Readonly<{
    radius: keyof typeof RADIUS;
    shadow: keyof typeof SHADOW;
    spacing: 'compact' | 'comfortable' | 'spacious';
    contrast: 'low' | 'medium' | 'high';
  }>;
}

export const DESIGN_DIRECTIONS: DesignDirection[] = [
  {
    id: 'minimal-saas',
    name: 'Minimal Premium SaaS',
    description: 'Clean, professional look with generous whitespace',
    characteristics: [
      'Near-white backgrounds with subtle surface contrast',
      'Light borders (1px, low opacity)',
      'Very subtle shadows',
      'Control height: 44-48px',
      'Radius: 6-8px',
      'Gentle hover states (background shift only)',
    ],
    customizations: {
      radius: 'md',
      shadow: 'sm',
      spacing: 'comfortable',
      contrast: 'medium',
    },
  },
  {
    id: 'bold-editorial',
    name: 'Bold Editorial',
    description: 'High contrast with dramatic typography',
    characteristics: [
      'Large display fonts (56-64px)',
      'High contrast (black/white extremes)',
      'Asymmetric layouts',
      'Grid-breaking elements',
      'Minimal color palette (1-2 accents)',
      'Sharp, geometric shapes',
    ],
    customizations: {
      radius: 'sm',
      shadow: 'none',
      spacing: 'comfortable',
      contrast: 'high',
    },
  },
  {
    id: 'soft-organic',
    name: 'Soft & Organic',
    description: 'Rounded, friendly aesthetic',
    characteristics: [
      'Rounded corners (12-24px)',
      'Soft shadows with subtle gradients',
      'Pastel/muted palette',
      'Gentle animations (300-400ms)',
      'Curved elements',
      'Generous padding (1.5-2x)',
    ],
    customizations: {
      radius: '2xl',
      shadow: 'md',
      spacing: 'spacious',
      contrast: 'low',
    },
  },
  {
    id: 'dark-neon',
    name: 'Dark Neon (Restrained)',
    description: 'Developer-focused dark theme',
    characteristics: [
      'Dark background (#0a0a0a to #1a1a1a)',
      'High contrast text',
      'Accent colors for CTAs only',
      'Subtle glow on hover',
      'Minimal borders',
      'Restrained neon usage',
    ],
    customizations: {
      radius: 'lg',
      shadow: 'lg',
      spacing: 'comfortable',
      contrast: 'high',
    },
  },
  {
    id: 'playful-colorful',
    name: 'Playful & Colorful',
    description: 'Vibrant and engaging',
    characteristics: [
      'Vibrant palette (3-5 colors)',
      'Rounded corners (8-16px)',
      'Micro-animations on hover',
      'Friendly illustrations',
      'Smooth transitions (200-250ms)',
      'Fun visual effects',
    ],
    customizations: {
      radius: 'xl',
      shadow: 'md',
      spacing: 'comfortable',
      contrast: 'medium',
    },
  },
];

// =============================================================================
// COMPONENT STATE REQUIREMENTS
// =============================================================================

export const REQUIRED_COMPONENT_STATES = [
  // Visual States
  'default',
  'hover',
  'active',
  'focus',
  'disabled',
  // Data States
  'loading',
  'empty',
  'error',
] as const;

export type ComponentState = typeof REQUIRED_COMPONENT_STATES[number];

// =============================================================================
// ANTI-PATTERNS (Z.ai "AI Slop" Prevention)
// =============================================================================

export const ANTI_PATTERNS = {
  // Banned fonts (generic AI defaults)
  bannedFonts: [
    'Inter',
    'Roboto',
    'Open Sans',
    'Arial',
    'Helvetica',
    'system-ui',
    'sans-serif (generic)',
  ],

  // Banned colors (overused AI defaults)
  bannedColors: [
    '#3b82f6',    // Default Tailwind blue
    '#8b5cf6',    // Default Tailwind purple
    '#6366f1',    // Default Tailwind indigo (overused)
    '#10b981',    // Default Tailwind green
    'purple gradient on white',
    'blue-to-purple gradient',
    'linear-gradient(to right, #3b82f6, #8b5cf6)', // Exact default gradient
  ],

  // Banned layout patterns (generic AI structures)
  bannedLayouts: [
    'card-grid-only',              // Just cards in a grid with no personality
    'hero-features-cta',           // Generic landing page template
    'sidebar-main-content',        // Without any distinctive elements
    'three-column-equal',          // Rigid symmetric 3-column layouts
    'centered-form-only',          // Just a centered form with no context
    'generic-dashboard-grid',      // Dashboard with only card grids
  ],

  // Banned visual patterns (AI slop indicators)
  bannedVisuals: [
    'generic-gradient-background',  // Aimless gradients without purpose
    'floating-shapes',              // Random decorative circles/blobs
    'wave-dividers',                // Wavy section dividers between sections
    'generic-illustrations',        // Stock illustration style
    'placeholder-images',           // Using placeholder.com or similar
    'stock-photo-hero',             // Generic stock photos in hero sections
  ],

  // Banned interaction patterns (missing essential states)
  bannedInteractions: [
    'no-loading-states',            // Missing skeleton/spinner states
    'no-empty-states',              // No "no data" handling
    'no-error-handling',            // No error messages/retry logic
    'buttons-without-hover',        // No hover feedback
    'no-focus-indicators',          // Missing keyboard focus states
    'instant-transitions',          // No animation/transition feedback
  ],

  // Banned copy patterns (AI-generated text indicators)
  bannedCopy: [
    'Lorem ipsum',                  // Placeholder text
    'Click here',                   // Vague CTAs
    'Learn more',                   // Generic without context
    'Get started today',            // Overused generic CTA
    'Trusted by thousands',         // Generic social proof
    'Revolutionary platform',       // Hyperbolic without substance
  ],

  // Required alternatives (prescriptive guidance)
  requiredAlternatives: {
    fonts: [
      'System UI stack (SF Pro, Segoe UI)',
      'Geist (Vercel)',
      'Plus Jakarta Sans',
      'DM Sans',
      'Space Grotesk',
      'Instrument Sans',
      'Custom font via @font-face',
    ],
    colorApproach: 'Use semantic tokens with intentional palette derived from brand/purpose, not default Tailwind values',
    layoutApproach: 'Choose ONE design direction from DESIGN_DIRECTIONS and commit fully with distinctive personality',
    visualApproach: 'Add meaningful visual hierarchy through typography scale, whitespace, and intentional color usage',
    interactionApproach: 'Implement ALL required component states (loading, empty, error, hover, focus, disabled)',
  },

  // Quality checklist (must satisfy ALL for non-generic output)
  qualityChecklist: [
    'Has custom color palette (not Tailwind defaults)',
    'Uses distinctive typography (not Inter/Roboto)',
    'Implements unique layout (not pure card grid)',
    'Includes personality elements (custom icons, illustrations, or textures)',
    'Handles all component states (loading, empty, error)',
    'Has meaningful hover/focus states',
    'Uses intentional animation timing (not instant)',
    'Contains specific copy (not generic placeholders)',
  ],
} as const;

// =============================================================================
// ANTI-PATTERN DETECTION
// =============================================================================

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detects anti-patterns in generated code
 * @returns Array of detected issues with severity
 */
export function detectAntiPatterns(code: string): Array<{ issue: string; severity: 'error' | 'warning' }> {
  if (!code || typeof code !== 'string') {
    console.warn('[design-tokens] detectAntiPatterns called with invalid input');
    return [];
  }

  const detected: Array<{ issue: string; severity: 'error' | 'warning' }> = [];

  // Check for banned fonts (ERROR level)
  for (const font of ANTI_PATTERNS.bannedFonts) {
    try {
      const escapedFont = escapeRegex(font);
      const regex = new RegExp(`['"\`]${escapedFont}['"\`]`, 'i');
      if (regex.test(code)) {
        detected.push({
          issue: `Banned font detected: ${font}. Use alternatives: ${ANTI_PATTERNS.requiredAlternatives.fonts.join(', ')}`,
          severity: 'error',
        });
      }
    } catch (error) {
      console.error(`[design-tokens] Failed to create regex for font "${font}":`, error);
    }
  }

  // Check for banned colors (ERROR level)
  for (const color of ANTI_PATTERNS.bannedColors) {
    if (code.includes(color)) {
      detected.push({
        issue: `Banned color detected: ${color}. ${ANTI_PATTERNS.requiredAlternatives.colorApproach}`,
        severity: 'error',
      });
    }
  }

  // Check for missing loading state (ERROR level)
  const hasLoadingState = code.includes('loading') || code.includes('skeleton') || code.includes('spinner');
  if (!hasLoadingState && code.length > 500) {
    detected.push({
      issue: 'Missing loading state. Add skeleton loaders or spinner for async operations',
      severity: 'error',
    });
  }

  // Check for missing empty state (WARNING level)
  const hasEmptyState = code.includes('empty') || code.includes('no data') || code.includes('no results');
  if (!hasEmptyState && code.length > 500) {
    detected.push({
      issue: 'Missing empty state. Add "no data" handling for better UX',
      severity: 'warning',
    });
  }

  // Check for missing error state (ERROR level)
  const hasErrorState = code.includes('error') || code.includes('try') || code.includes('catch');
  if (!hasErrorState && code.length > 500) {
    detected.push({
      issue: 'Missing error handling. Add error states and retry logic',
      severity: 'error',
    });
  }

  // Check for banned copy patterns (WARNING level)
  for (const copy of ANTI_PATTERNS.bannedCopy) {
    if (code.toLowerCase().includes(copy.toLowerCase())) {
      detected.push({
        issue: `Generic copy detected: "${copy}". Use specific, contextual text instead`,
        severity: 'warning',
      });
    }
  }

  // Check for hover states (WARNING level)
  const hasHoverStates = code.includes(':hover') || code.includes('onMouseEnter') || code.includes('hover:');
  if (!hasHoverStates && code.includes('button')) {
    detected.push({
      issue: 'Buttons detected without hover states. Add hover feedback for interactivity',
      severity: 'warning',
    });
  }

  return detected;
}

/**
 * Validates if code meets quality standards
 * @returns Object with validation result and specific failures
 */
export function validateQualityStandards(code: string): {
  passes: boolean;
  failures: string[];
  score: number;
} {
  if (!code || typeof code !== 'string') {
    console.warn('[design-tokens] validateQualityStandards called with invalid input');
    return { passes: false, failures: ['Invalid input'], score: 0 };
  }

  const failures: string[] = [];
  let passedChecks = 0;
  const totalChecks = ANTI_PATTERNS.qualityChecklist.length;

  // Check custom color palette
  const hasCustomColors = !ANTI_PATTERNS.bannedColors.some(color => code.includes(color));
  if (hasCustomColors) passedChecks++;
  else failures.push('Uses default Tailwind colors');

  // Check distinctive typography
  const hasDistinctiveFont = !ANTI_PATTERNS.bannedFonts.some(font => {
    try {
      const escapedFont = escapeRegex(font);
      return new RegExp(`['"\`]${escapedFont}['"\`]`, 'i').test(code);
    } catch (error) {
      console.error(`[design-tokens] Failed to create regex for font "${font}":`, error);
      return false;
    }
  });
  if (hasDistinctiveFont) passedChecks++;
  else failures.push('Uses generic fonts (Inter/Roboto)');

  // Check for state handling
  const hasLoadingState = code.includes('loading') || code.includes('skeleton');
  if (hasLoadingState) passedChecks++;
  else failures.push('Missing loading state');

  const hasEmptyState = code.includes('empty') || code.includes('no data');
  if (hasEmptyState) passedChecks++;
  else failures.push('Missing empty state');

  const hasErrorState = code.includes('error') || code.includes('catch');
  if (hasErrorState) passedChecks++;
  else failures.push('Missing error handling');

  // Check for hover states
  const hasHoverStates = code.includes(':hover') || code.includes('hover:');
  if (hasHoverStates) passedChecks++;
  else failures.push('Missing hover states');

  // Check for intentional animation
  const hasAnimation = code.includes('transition') || code.includes('animate');
  if (hasAnimation) passedChecks++;
  else failures.push('Missing animation/transitions');

  // Check for specific copy (not Lorem ipsum)
  const hasSpecificCopy = !code.toLowerCase().includes('lorem ipsum');
  if (hasSpecificCopy) passedChecks++;
  else failures.push('Contains placeholder text');

  const score = (passedChecks / totalChecks) * 100;
  const passes = score >= 75; // Must pass 75% of checks

  return {
    passes,
    failures,
    score: Math.round(score),
  };
}

// =============================================================================
// CSS CUSTOM PROPERTIES GENERATOR
// =============================================================================

export function generateCSSVariables(colors: ColorTokens, prefix = ''): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(colors)) {
    // Convert camelCase to kebab-case
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    lines.push(`  --${prefix}${cssKey}: ${value};`);
  }

  return lines.join('\n');
}

export function generateThemeCSS(): string {
  return `:root {
${generateCSSVariables(LIGHT_COLORS)}

  /* Spacing */
${Object.entries(SPACING).map(([k, v]) => `  --spacing-${k}: ${v};`).join('\n')}

  /* Radius */
${Object.entries(RADIUS).map(([k, v]) => `  --radius-${k}: ${v};`).join('\n')}

  /* Shadows */
${Object.entries(SHADOW).map(([k, v]) => `  --shadow-${k}: ${v};`).join('\n')}

  /* Motion */
${Object.entries(MOTION).map(([k, v]) => `  --duration-${k}: ${v.duration};`).join('\n')}
${Object.entries(MOTION).map(([k, v]) => `  --easing-${k}: ${v.easing};`).join('\n')}
}

.dark, [data-theme="dark"] {
${generateCSSVariables(DARK_COLORS)}

  /* Dark shadows */
${Object.entries(SHADOW_DARK).map(([k, v]) => `  --shadow-${k}: ${v};`).join('\n')}
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}`;
}
