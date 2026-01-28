# Typography System

**Last Updated:** 2026-01-28

## Overview

Our typography system uses a **modular scale with a 1.25 ratio** (Major Third) to create harmonious relationships between text sizes. This ensures visual hierarchy, readability, and consistency across all screen sizes.

### Scale Foundation
- **Base:** 16px (1rem) - browser default
- **Ratio:** 1.25 (Major Third)
- **Calculation:** Each step = previous size × 1.25

### Why Modular Scale?
- Creates natural visual rhythm
- Maintains proportional relationships
- Scales gracefully across devices
- Reduces decision fatigue

## Import

```tsx
import { TYPOGRAPHY } from '@/utils/typographyConstants';

// Or import specific categories
import { DISPLAY, HEADING, BODY } from '@/utils/typographyConstants';
```

## Type Scale Categories

### DISPLAY - Hero Sections & Major Headings

Large, attention-grabbing text for landing pages and key sections.
- **Line Height:** Tight (1.1) for visual impact
- **Letter Spacing:** Slightly tighter for cohesion
- **Use Case:** Page heroes, marketing headlines

#### XL (Extra Large)
**Mobile:** 3rem (48px) | **Desktop:** 4rem (64px)

**Use When:** Main hero heading, primary marketing message, app title

**Example:**
```tsx
<h1 className={TYPOGRAPHY.DISPLAY.xl.full}>
  Transform Your Workflow with AI
</h1>
```

**Variants:**
```tsx
// Mobile only (48px)
<h1 className={TYPOGRAPHY.DISPLAY.xl.mobile}>Mobile Title</h1>

// Desktop only (64px, use with mobile variant)
<h1 className={`${TYPOGRAPHY.DISPLAY.xl.mobile} ${TYPOGRAPHY.DISPLAY.xl.desktop}`}>
  Responsive Title
</h1>

// Automatic responsive (recommended)
<h1 className={TYPOGRAPHY.DISPLAY.xl.full}>Responsive Title</h1>
```

#### LG (Large)
**Mobile:** 2.5rem (40px) | **Desktop:** 3rem (48px)

**Use When:** Section headers, secondary marketing headlines

**Example:**
```tsx
<h2 className={TYPOGRAPHY.DISPLAY.lg.full}>
  Features That Matter
</h2>
```

#### MD (Medium)
**Mobile:** 2rem (32px) | **Desktop:** 2.5rem (40px)

**Use When:** Subsection headers, feature group titles

**Example:**
```tsx
<h3 className={TYPOGRAPHY.DISPLAY.md.full}>
  Getting Started
</h3>
```

---

### HEADING - Content Sections & Card Titles

Structured content headings with balanced readability.
- **Line Height:** Snug (1.375) for multi-line reading
- **Letter Spacing:** Tight for headings, normal for smaller sizes
- **Use Case:** Article headers, card titles, dialog titles

#### XL (Extra Large)
**Mobile:** 1.875rem (30px) | **Desktop:** 2.25rem (36px)

**Use When:** Major content section headers, article titles

**Example:**
```tsx
<h2 className={TYPOGRAPHY.HEADING.xl.full}>
  Understanding AI Assistants
</h2>
```

#### LG (Large)
**Mobile:** 1.5rem (24px) | **Desktop:** 1.875rem (30px)

**Use When:** Section headers, prominent card titles

**Example:**
```tsx
<h3 className={TYPOGRAPHY.HEADING.lg.full}>
  Quick Start Guide
</h3>
```

#### MD (Medium)
**Mobile:** 1.25rem (20px) | **Desktop:** 1.5rem (24px)

**Use When:** Subsection headers, standard card titles

**Example:**
```tsx
<h4 className={TYPOGRAPHY.HEADING.md.full}>
  Configuration Options
</h4>
```

#### SM (Small)
**Mobile:** 1.125rem (18px) | **Desktop:** 1.25rem (20px)

**Use When:** Small card titles, list headers, sidebar titles

**Example:**
```tsx
<h5 className={TYPOGRAPHY.HEADING.sm.full}>
  Recent Conversations
</h5>
```

---

### BODY - Paragraphs & UI Text

Optimized for extended reading with generous line height.
- **Line Height:** Relaxed (1.625) for comfortable reading
- **Letter Spacing:** Normal for natural reading
- **Use Case:** Paragraphs, descriptions, UI text

#### LG (Large)
**Mobile:** 1.125rem (18px) | **Desktop:** 1.25rem (20px)

**Use When:** Introductory text, featured content, lead paragraphs

**Example:**
```tsx
<p className={TYPOGRAPHY.BODY.lg.full}>
  Our AI assistant helps you accomplish tasks faster with natural language processing and contextual understanding.
</p>
```

#### MD (Medium)
**Mobile & Desktop:** 1rem (16px)

**Use When:** Standard body text, descriptions, most paragraph content

**Example:**
```tsx
<p className={TYPOGRAPHY.BODY.md.full}>
  This is your standard paragraph text that users will read throughout the application.
</p>
```

**Note:** This is the default browser font size (16px) and doesn't scale on desktop.

#### SM (Small)
**Mobile & Desktop:** 0.875rem (14px)

**Use When:** Secondary information, captions, labels, helper text

**Example:**
```tsx
<p className={TYPOGRAPHY.BODY.sm.full}>
  Last updated: November 4, 2025
</p>
```

#### XS (Extra Small)
**Mobile & Desktop:** 0.75rem (12px)

**Use When:** Timestamps, metadata, fine print, tertiary information

**Example:**
```tsx
<span className={TYPOGRAPHY.BODY.xs.full}>
  2 minutes ago
</span>
```

---

## Utility Classes

### Font Weights (WEIGHT)

Semantic weight names for common use cases:

```tsx
import { WEIGHT } from '@/utils/typographyConstants';

// Light - 300 (Subtle, elegant text)
<p className={WEIGHT.light}>Delicate text</p>

// Normal - 400 (Default body text)
<p className={WEIGHT.normal}>Standard paragraph</p>

// Medium - 500 (Slightly emphasized)
<p className={WEIGHT.medium}>Emphasized text</p>

// Semibold - 600 (Headings, CTAs)
<h3 className={WEIGHT.semibold}>Section Title</h3>

// Bold - 700 (Strong emphasis)
<strong className={WEIGHT.bold}>Important!</strong>

// Extrabold - 800 (Hero text)
<h1 className={WEIGHT.extrabold}>Hero Headline</h1>
```

### Line Heights (LINE_HEIGHT)

Independent line height controls:

```tsx
import { LINE_HEIGHT } from '@/utils/typographyConstants';

// None - 1.0 (Tight displays)
<h1 className={LINE_HEIGHT.none}>Compact Title</h1>

// Tight - 1.25 (Large headings)
<h2 className={LINE_HEIGHT.tight}>Hero Heading</h2>

// Snug - 1.375 (Standard headings)
<h3 className={LINE_HEIGHT.snug}>Section Header</h3>

// Normal - 1.5 (UI elements)
<button className={LINE_HEIGHT.normal}>Button Text</button>

// Relaxed - 1.625 (Body text - default for BODY)
<p className={LINE_HEIGHT.relaxed}>Comfortable reading</p>

// Loose - 2.0 (Very spacious reading)
<p className={LINE_HEIGHT.loose}>Extra spacing</p>
```

### Letter Spacing (TRACKING)

Tracking adjustments for visual refinement:

```tsx
import { TRACKING } from '@/utils/typographyConstants';

// Tighter - -0.05em (Tight headlines)
<h1 className={TRACKING.tighter}>Condensed Headline</h1>

// Tight - -0.025em (Standard headings)
<h2 className={TRACKING.tight}>Section Title</h2>

// Normal - 0em (Default body text)
<p className={TRACKING.normal}>Normal text</p>

// Wide - 0.025em (Buttons, labels)
<button className={TRACKING.wide}>BUTTON</button>

// Wider - 0.05em (Uppercase text)
<span className={TRACKING.wider}>UPPERCASE LABEL</span>

// Widest - 0.1em (Spaced emphasis)
<span className={TRACKING.widest}>S P A C E D</span>
```

### Text Alignment (ALIGN)

Responsive text alignment patterns:

```tsx
import { ALIGN } from '@/utils/typographyConstants';

// Static alignment
<p className={ALIGN.left}>Left aligned</p>
<p className={ALIGN.center}>Center aligned</p>
<p className={ALIGN.right}>Right aligned</p>
<p className={ALIGN.justify}>Justified text</p>

// Responsive alignment
<h1 className={ALIGN.centerToLeft}>
  Center on mobile, left on desktop
</h1>

<p className={ALIGN.centerToRight}>
  Center on mobile, right on desktop
</p>
```

### Truncation (TRUNCATE)

Text overflow handling:

```tsx
import { TRUNCATE } from '@/utils/typographyConstants';

// Single line with ellipsis
<p className={TRUNCATE.single}>
  This text will truncate with ellipsis if too long...
</p>

// Two line clamp
<p className={TRUNCATE.twoLines}>
  This text will show max two lines and then add ellipsis...
</p>

// Three line clamp
<p className={TRUNCATE.threeLines}>
  This text will show max three lines and then add ellipsis...
</p>

// Four line clamp
<p className={TRUNCATE.fourLines}>
  This text will show max four lines and then add ellipsis...
</p>
```

---

## Pre-Composed Combinations (COMBO)

Common typography patterns for frequent use cases:

```tsx
import { COMBO } from '@/utils/typographyConstants';

// Hero headline: large, bold, tight
<h1 className={COMBO.hero}>
  Main Hero Headline
</h1>

// Section title: medium display, semibold
<h2 className={COMBO.sectionTitle}>
  Section Title
</h2>

// Card header: large heading, semibold
<h3 className={COMBO.cardHeader}>
  Card Title
</h3>

// Body lead: large body, normal weight
<p className={COMBO.bodyLead}>
  Introductory paragraph with emphasis
</p>

// Label: small body, medium weight, wide tracking
<label className={COMBO.label}>
  FORM LABEL
</label>

// Caption: extra small, normal weight
<span className={COMBO.caption}>
  Image caption or timestamp
</span>
```

---

## Helper Functions

### combineTypography

Combine multiple typography classes with custom classes:

```tsx
import { combineTypography, TYPOGRAPHY } from '@/utils/typographyConstants';

<h2 className={combineTypography(
  TYPOGRAPHY.HEADING.lg.full,
  TYPOGRAPHY.WEIGHT.semibold,
  TYPOGRAPHY.TRACKING.tight,
  'text-primary'
)}>
  Custom Styled Heading
</h2>

// With conditional classes
<p className={combineTypography(
  TYPOGRAPHY.BODY.md.full,
  isError ? 'text-destructive' : 'text-muted-foreground'
)}>
  Status message
</p>
```

---

## Responsive Variants Explained

Each typography constant has three variants:

### .mobile
Mobile-only sizing, use when manually controlling responsive behavior:

```tsx
<h1 className={TYPOGRAPHY.DISPLAY.xl.mobile}>
  {/* 48px on all screens */}
</h1>
```

### .desktop
Desktop override, must be used WITH mobile variant:

```tsx
<h1 className={`${TYPOGRAPHY.DISPLAY.xl.mobile} ${TYPOGRAPHY.DISPLAY.xl.desktop}`}>
  {/* 48px mobile, 64px desktop (768px+) */}
</h1>
```

### .full (Recommended)
Automatic responsive sizing, combines mobile + desktop:

```tsx
<h1 className={TYPOGRAPHY.DISPLAY.xl.full}>
  {/* 48px mobile, 64px desktop - recommended */}
</h1>
```

**Best Practice:** Always use `.full` unless you have a specific reason to control mobile/desktop separately.

---

## Usage Examples

### Landing Page Hero
```tsx
<section className="px-4 py-16 md:px-6 md:py-24">
  <h1 className={`${TYPOGRAPHY.DISPLAY.xl.full} ${TYPOGRAPHY.WEIGHT.extrabold} text-center`}>
    Your AI-Powered Assistant
  </h1>
  <p className={`${TYPOGRAPHY.BODY.lg.full} ${TYPOGRAPHY.ALIGN.center} text-muted-foreground mt-4`}>
    Transform the way you work with intelligent conversation
  </p>
</section>
```

### Content Card
```tsx
<div className="border rounded-lg p-6">
  <h3 className={`${TYPOGRAPHY.HEADING.md.full} ${TYPOGRAPHY.WEIGHT.semibold}`}>
    Getting Started
  </h3>
  <p className={`${TYPOGRAPHY.BODY.md.full} text-muted-foreground mt-2`}>
    Learn the basics of using our AI assistant to maximize your productivity.
  </p>
  <span className={`${TYPOGRAPHY.BODY.xs.full} text-muted-foreground mt-4 block`}>
    5 min read
  </span>
</div>
```

### Form Label and Helper Text
```tsx
<div className="space-y-2">
  <label className={`${TYPOGRAPHY.BODY.sm.full} ${TYPOGRAPHY.WEIGHT.medium}`}>
    Email Address
  </label>
  <input type="email" className="..." />
  <p className={`${TYPOGRAPHY.BODY.xs.full} text-muted-foreground`}>
    We'll never share your email with anyone else.
  </p>
</div>
```

### Chat Message
```tsx
<div className="space-y-2">
  <p className={`${TYPOGRAPHY.BODY.md.full} leading-relaxed`}>
    This is the main message content with comfortable reading spacing.
  </p>
  <span className={`${TYPOGRAPHY.BODY.xs.full} text-muted-foreground`}>
    2 minutes ago
  </span>
</div>
```

---

## Best Practices

### DO
- Use `.full` variants for automatic responsive behavior
- Combine typography constants with color utilities
- Use semantic HTML elements (h1-h6, p, span)
- Follow the type scale - don't skip levels arbitrarily
- Use COMBO patterns for common use cases

### DON'T
- Hard-code font sizes (`text-[17px]`)
- Mix display sizes with body content (e.g., DISPLAY for paragraphs)
- Use DISPLAY for small UI elements
- Ignore line height recommendations
- Override font sizes without good reason

### Accessibility
- Use proper heading hierarchy (h1 → h2 → h3)
- Ensure sufficient contrast ratios (4.5:1 for body, 3:1 for large text)
- Don't rely solely on size for emphasis (use semantic HTML)
- Test with browser zoom (200%+)

### Performance
- Typography classes are pure Tailwind CSS (no runtime cost)
- Constants are tree-shakeable
- No JavaScript execution for styling

---

## Pixel Value Reference

Quick reference for all typography sizes:

**DISPLAY**
- XL: 48px mobile / 64px desktop
- LG: 40px mobile / 48px desktop
- MD: 32px mobile / 40px desktop

**HEADING**
- XL: 30px mobile / 36px desktop
- LG: 24px mobile / 30px desktop
- MD: 20px mobile / 24px desktop
- SM: 18px mobile / 20px desktop

**BODY**
- LG: 18px mobile / 20px desktop
- MD: 16px (all screens)
- SM: 14px (all screens)
- XS: 12px (all screens)

---

## See Also

- [Design System Overview](./OVERVIEW.md) - Introduction to the design system
- [Spacing System](./SPACING.md) - Layout and spacing constants
- [Component Examples](./COMPONENTS.md) - Real-world component usage
- [Interaction States](./INTERACTIONS.md) - Hover and focus states

---

## Technical Details

**File Location:** `/src/utils/typographyConstants.ts`

**Dependencies:** Tailwind CSS 3.4+

**TypeScript:** Fully typed with `as const` for autocomplete

**Bundle Size:** ~2KB minified (tree-shakeable)
