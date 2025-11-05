# Design System Overview

**Last Updated:** 2025-11-04

## Introduction

Welcome to the design system documentation for our AI-powered chat assistant application. This design system provides a comprehensive set of constants, components, and patterns to ensure consistency, maintainability, and exceptional user experience across the entire application.

## Purpose and Benefits

### Why a Design System?

**Consistency:** All UI elements follow the same visual language, creating a cohesive experience.

**Efficiency:** Reusable constants and components accelerate development and reduce code duplication.

**Maintainability:** Centralized design tokens make global updates simple - change once, apply everywhere.

**Accessibility:** Built-in focus states, keyboard navigation, and motion-safe animations ensure WCAG compliance.

**Performance:** Optimized animations, GPU acceleration, and responsive design patterns built-in.

**Scalability:** Modular architecture supports growth without technical debt.

## Design Philosophy

### Mobile-First Responsive Design
All components and spacing start with mobile sizing and scale up at breakpoints (768px for desktop).

### Performance-Optimized
- GPU-accelerated animations (`transform-gpu`)
- Respects `prefers-reduced-motion` for accessibility
- Conditional animations to prevent performance issues

### Accessibility-First
- Focus-visible states for keyboard navigation
- Semantic HTML structure
- ARIA attributes where appropriate
- Motion-safe animations

### Theme-Aware
- Light and dark mode support
- CSS variables for dynamic theming
- Consistent color semantics

## System Structure

The design system is organized into five core areas:

### 1. Typography (`typographyConstants.ts`)
Modular scale-based typography system with three categories:
- **DISPLAY** - Hero sections and major headings
- **HEADING** - Content sections and card titles
- **BODY** - Paragraphs and UI text

[View Typography Documentation →](./TYPOGRAPHY.md)

### 2. Spacing (`spacingConstants.ts`)
4px-based spacing system for consistent layouts:
- **SECTION_SPACING** - Page sections
- **CONTAINER_SPACING** - Cards and panels
- **COMPONENT_SPACING** - Buttons and inputs
- **CHAT_SPACING** - Chat-specific layouts
- **GAP_SPACING** - Flex/grid gaps

[View Spacing Documentation →](./SPACING.md)

### 3. Interactions (`interactionConstants.ts`)
Standardized hover, focus, and active states:
- **BUTTON_STATES** - Default, subtle, ghost
- **CARD_STATES** - Interactive, subtle
- **LINK_STATES** - Default, subtle
- **INPUT_STATES** - Form inputs

[View Interactions Documentation →](./INTERACTIONS.md)

### 4. Animations (`animationConstants.ts`)
Consistent animation timing and patterns:
- **ANIMATION_DURATIONS** - Fast, normal, moderate, slow
- **ANIMATION_EASINGS** - easeIn, easeOut, easeInOut
- **Common Variants** - fadeInUp, scaleIn, staggerContainer, hoverLift

[View Animations Documentation →](./ANIMATIONS.md)

### 5. Components
Reusable UI components built with the design system:
- **Skeleton Components** - Loading states
- **shadcn/ui Components** - 69 components from Radix UI

[View Components Documentation →](./COMPONENTS.md)

## Quick Start Guide

### Installation

All design system constants are already available in the project. No installation needed.

### Basic Usage

**1. Import Constants**
```tsx
import { TYPOGRAPHY } from '@/utils/typographyConstants';
import { SECTION_SPACING } from '@/utils/spacingConstants';
import { BUTTON_STATES } from '@/utils/interactionConstants';
```

**2. Apply to Components**
```tsx
export function HeroSection() {
  return (
    <section className={SECTION_SPACING.full}>
      <h1 className={TYPOGRAPHY.DISPLAY.xl.full}>
        Welcome to Our App
      </h1>
      <button className={BUTTON_STATES.default}>
        Get Started
      </button>
    </section>
  );
}
```

**3. Combine Classes**
```tsx
import { combineTypography } from '@/utils/typographyConstants';

<h2 className={combineTypography(
  TYPOGRAPHY.HEADING.lg.full,
  TYPOGRAPHY.WEIGHT.semibold,
  'text-primary'
)}>
  Section Title
</h2>
```

## File Structure

```
src/
├── utils/
│   ├── typographyConstants.ts    # Typography scale and utilities
│   ├── spacingConstants.ts        # Spacing system
│   ├── interactionConstants.ts    # Hover/focus/active states
│   └── animationConstants.ts      # Animation timing and variants
├── components/
│   └── ui/
│       ├── skeleton.tsx           # Base Skeleton component
│       ├── message-skeleton.tsx   # Message loading state
│       └── artifact-skeleton.tsx  # Artifact loading state
└── docs/
    └── design-system/
        ├── OVERVIEW.md            # This file
        ├── TYPOGRAPHY.md          # Typography documentation
        ├── SPACING.md             # Spacing documentation
        ├── INTERACTIONS.md        # Interactions documentation
        ├── ANIMATIONS.md          # Animations documentation
        └── COMPONENTS.md          # Components documentation
```

## Common Patterns

### Responsive Section Layout
```tsx
import { SECTION_SPACING } from '@/utils/spacingConstants';
import { TYPOGRAPHY } from '@/utils/typographyConstants';
import { GAP_SPACING } from '@/utils/spacingConstants';

<section className={SECTION_SPACING.full}>
  <div className={`max-w-7xl mx-auto ${GAP_SPACING.lg} flex flex-col`}>
    <h2 className={TYPOGRAPHY.DISPLAY.lg.full}>
      Section Title
    </h2>
    <p className={TYPOGRAPHY.BODY.lg.full}>
      Section description text
    </p>
  </div>
</section>
```

### Interactive Card
```tsx
import { CONTAINER_SPACING } from '@/utils/spacingConstants';
import { CARD_STATES } from '@/utils/interactionConstants';
import { TYPOGRAPHY } from '@/utils/typographyConstants';

<div className={`${CONTAINER_SPACING.full} ${CARD_STATES.interactive} border rounded-lg`}>
  <h3 className={TYPOGRAPHY.HEADING.md.full}>
    Card Title
  </h3>
  <p className={TYPOGRAPHY.BODY.md.full}>
    Card content
  </p>
</div>
```

### Animated Route
```tsx
import { motion } from 'motion/react';
import { fadeInUp } from '@/utils/animationConstants';
import { ANIMATION_DURATIONS, ANIMATION_EASINGS } from '@/utils/animationConstants';

<motion.div
  initial={fadeInUp.initial}
  animate={fadeInUp.animate}
  exit={fadeInUp.exit}
  transition={{
    duration: ANIMATION_DURATIONS.moderate,
    ease: ANIMATION_EASINGS.easeInOut
  }}
>
  {/* Page content */}
</motion.div>
```

## Best Practices

### DO
- Use constants for all spacing, typography, and animations
- Combine classes with helper functions (`combineTypography`, `combineSpacing`)
- Use `.full` variants for automatic responsive behavior
- Respect `motion-safe:` prefix for animations
- Use semantic constant names over arbitrary values

### DON'T
- Hard-code spacing values (`px-4` unless from constants)
- Use arbitrary font sizes (`text-[17px]`)
- Create custom animation timings without good reason
- Ignore focus-visible states
- Skip mobile-first responsive considerations

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Progressive enhancement for older browsers
- Graceful fallbacks for unsupported features

## Accessibility

All components and constants support:
- Keyboard navigation (Tab, Enter, Space)
- Screen readers (semantic HTML, ARIA attributes)
- Reduced motion preferences (`prefers-reduced-motion`)
- High contrast mode
- Focus indicators (focus-visible)

## Theming

The design system supports dynamic theming via CSS variables:
- Light and dark mode
- Color themes (violet, blue, green, etc.)
- Automatic system preference detection

## Performance

Performance considerations built into the system:
- GPU-accelerated animations
- Conditional animation for long lists
- Optimized re-renders with React.memo
- Lazy loading of heavy components

## Version

**Current Version:** 1.0.0
**Compatible With:** React 18+, Tailwind CSS 3.4+, Motion/React (Framer Motion)

## Support and Contribution

For questions or contributions:
1. Read the relevant documentation section
2. Check existing patterns in the codebase
3. Follow the established conventions
4. Test across mobile and desktop viewports

## See Also

- [Typography System](./TYPOGRAPHY.md) - Complete typography documentation
- [Spacing System](./SPACING.md) - Layout and spacing patterns
- [Interaction States](./INTERACTIONS.md) - Hover, focus, active states
- [Animation System](./ANIMATIONS.md) - Motion and transitions
- [Component Library](./COMPONENTS.md) - Reusable components

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Motion/React (Framer Motion)](https://www.framer.com/motion/)
- [WCAG Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
