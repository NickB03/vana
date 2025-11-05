# Spacing System

**Last Updated:** 2025-11-04

## Overview

Our spacing system is built on a **4px base unit** with semantic multipliers for different layout contexts. This creates consistent rhythm and visual hierarchy across the application.

### Base Unit Philosophy
- **Base:** 4px (0.25rem)
- **Multipliers:** 4x, 6x, 8x, 12x, 16x, 24x
- **Semantic Names:** Section, Container, Component level spacing
- **Result:** Predictable, harmonious layouts

### Why 4px Base?
- Divisible by common screen sizes
- Works with 8px grid systems
- Scales cleanly across devices
- Industry standard (Material Design, iOS HIG)

## Import

```tsx
import {
  SECTION_SPACING,
  CONTAINER_SPACING,
  COMPONENT_SPACING,
  CHAT_SPACING,
  GAP_SPACING,
  SAFE_AREA_SPACING,
  combineSpacing
} from '@/utils/spacingConstants';
```

---

## SECTION_SPACING

Large breathing room between major page sections.

**Mobile:** 16px horizontal / 64px vertical (4rem × 0.25rem × 16)
**Desktop:** 24px horizontal / 96px vertical (6rem × 0.25rem × 24)

**Use When:** Top-level page sections, major content areas

### Variants

```tsx
// Mobile only
<section className={SECTION_SPACING.mobile}>
  {/* px-4 py-16 (16px / 64px) */}
</section>

// Desktop only (use with mobile)
<section className={`${SECTION_SPACING.mobile} ${SECTION_SPACING.desktop}`}>
  {/* Responsive: 16px/64px mobile → 24px/96px desktop */}
</section>

// Full (recommended)
<section className={SECTION_SPACING.full}>
  {/* Automatic responsive spacing */}
</section>
```

### Examples

**Landing Page Section:**
```tsx
<section className={SECTION_SPACING.full}>
  <div className="max-w-7xl mx-auto">
    <h2 className="text-3xl font-bold">Features</h2>
    {/* Content */}
  </div>
</section>
```

**Content Section:**
```tsx
<section className={SECTION_SPACING.full}>
  <article className="max-w-3xl mx-auto">
    <h1>Article Title</h1>
    <p>Article content...</p>
  </article>
</section>
```

---

## CONTAINER_SPACING

Medium spacing for content containers like cards and panels.

**Mobile:** 16px horizontal / 24px vertical
**Desktop:** 24px horizontal / 32px vertical

**Use When:** Cards, panels, modals, major component groupings

### Variants

```tsx
// Mobile only
<div className={CONTAINER_SPACING.mobile}>
  {/* px-4 py-6 (16px / 24px) */}
</div>

// Desktop only (use with mobile)
<div className={`${CONTAINER_SPACING.mobile} ${CONTAINER_SPACING.desktop}`}>
  {/* Responsive: 16px/24px mobile → 24px/32px desktop */}
</div>

// Full (recommended)
<div className={CONTAINER_SPACING.full}>
  {/* Automatic responsive spacing */}
</div>
```

### Examples

**Card Component:**
```tsx
<div className={`${CONTAINER_SPACING.full} border rounded-lg bg-card`}>
  <h3 className="text-lg font-semibold">Card Title</h3>
  <p className="text-muted-foreground">Card description</p>
</div>
```

**Modal Content:**
```tsx
<div className="modal">
  <div className={CONTAINER_SPACING.full}>
    <h2>Modal Title</h2>
    <p>Modal content...</p>
    <div className="flex gap-2">
      <button>Cancel</button>
      <button>Confirm</button>
    </div>
  </div>
</div>
```

**Panel Component:**
```tsx
<aside className={`${CONTAINER_SPACING.full} bg-muted rounded-lg`}>
  <h3>Quick Links</h3>
  <nav>
    <a href="#">Link 1</a>
    <a href="#">Link 2</a>
  </nav>
</aside>
```

---

## COMPONENT_SPACING

Tight spacing for interactive elements like buttons and inputs.

**Mobile:** 12px horizontal / 12px vertical
**Desktop:** 20px horizontal / 20px vertical

**Use When:** Buttons, inputs, small interactive components

### Variants

```tsx
// Mobile only
<button className={COMPONENT_SPACING.mobile}>
  {/* px-3 py-3 (12px / 12px) */}
</button>

// Desktop only (use with mobile)
<button className={`${COMPONENT_SPACING.mobile} ${COMPONENT_SPACING.desktop}`}>
  {/* Responsive: 12px mobile → 20px desktop */}
</button>

// Full (recommended)
<button className={COMPONENT_SPACING.full}>
  {/* Automatic responsive spacing */}
</button>
```

### Examples

**Button:**
```tsx
<button className={`${COMPONENT_SPACING.full} bg-primary text-primary-foreground rounded-md`}>
  Click Me
</button>
```

**Input Field:**
```tsx
<input
  type="text"
  className={`${COMPONENT_SPACING.full} border rounded-md`}
  placeholder="Enter text..."
/>
```

**Badge:**
```tsx
<span className={`${COMPONENT_SPACING.full} bg-secondary rounded-full text-sm`}>
  New
</span>
```

---

## CHAT_SPACING

Specialized spacing optimized for chat/messaging interfaces.

### Message Container
**Value:** 24px horizontal / 12px vertical
**Use When:** Outer container for individual messages

```tsx
<div className={CHAT_SPACING.message.container}>
  {/* Message content */}
</div>
```

### Message Bubble
**Value:** 20px horizontal / 10px vertical
**Use When:** Inner padding for message bubbles

```tsx
<div className={`${CHAT_SPACING.message.bubble} bg-primary text-primary-foreground rounded-2xl`}>
  <p>Message text</p>
</div>
```

### Input Container
**Value:** 12px/20px horizontal / 12px/20px bottom (responsive)
**Use When:** Chat input area container

```tsx
<div className={CHAT_SPACING.input.container}>
  <textarea placeholder="Type a message..." />
</div>
```

### Input Textarea
**Value:** 16px left / 12px top
**Use When:** Internal padding for textarea

```tsx
<textarea className={CHAT_SPACING.input.textarea} />
```

### Message List
**Value:** 20px horizontal / 48px vertical
**Use When:** Container for scrollable message list

```tsx
<div className={CHAT_SPACING.messageList}>
  {messages.map(msg => <Message key={msg.id} {...msg} />)}
</div>
```

### Complete Chat Example

```tsx
function ChatInterface() {
  return (
    <div className="flex flex-col h-screen">
      {/* Message List */}
      <div className={`${CHAT_SPACING.messageList} flex-1 overflow-y-auto`}>
        <div className={CHAT_SPACING.message.container}>
          <div className={CHAT_SPACING.message.bubble}>
            <p>Hello! How can I help you?</p>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className={CHAT_SPACING.input.container}>
        <textarea
          className={CHAT_SPACING.input.textarea}
          placeholder="Type a message..."
        />
      </div>
    </div>
  );
}
```

---

## GAP_SPACING

Consistent gaps for flex and grid layouts.

### Sizes

**XS (Extra Small):** 8px (gap-2)
```tsx
<div className={`flex ${GAP_SPACING.xs}`}>
  <button>A</button>
  <button>B</button>
</div>
```

**SM (Small):** 12px (gap-3)
```tsx
<div className={`flex ${GAP_SPACING.sm}`}>
  <span>Tag 1</span>
  <span>Tag 2</span>
</div>
```

**MD (Medium):** 16px (gap-4)
```tsx
<div className={`flex flex-col ${GAP_SPACING.md}`}>
  <input />
  <input />
</div>
```

**LG (Large):** 24px (gap-6)
```tsx
<div className={`grid grid-cols-2 ${GAP_SPACING.lg}`}>
  <Card />
  <Card />
</div>
```

**XL (Extra Large):** 32px (gap-8)
```tsx
<div className={`flex flex-col ${GAP_SPACING.xl}`}>
  <Section />
  <Section />
</div>
```

### Examples

**Button Group:**
```tsx
<div className={`flex ${GAP_SPACING.sm}`}>
  <button>Save</button>
  <button>Cancel</button>
  <button>Delete</button>
</div>
```

**Feature Grid:**
```tsx
<div className={`grid grid-cols-1 md:grid-cols-3 ${GAP_SPACING.lg}`}>
  <FeatureCard title="Fast" />
  <FeatureCard title="Secure" />
  <FeatureCard title="Reliable" />
</div>
```

**Form Fields:**
```tsx
<form className={`flex flex-col ${GAP_SPACING.md}`}>
  <input type="text" placeholder="Name" />
  <input type="email" placeholder="Email" />
  <button type="submit">Submit</button>
</form>
```

---

## SAFE_AREA_SPACING

Ensures content doesn't get clipped by mobile device UI (notches, home indicators).

### Bottom Safe Area
**Value:** Max of 12px or device safe area inset
**Use When:** Bottom navigation, floating action buttons

```tsx
<nav className={`fixed bottom-0 ${SAFE_AREA_SPACING.bottom}`}>
  <button>Home</button>
  <button>Profile</button>
</nav>
```

### Top Safe Area
**Value:** Max of 12px or device safe area inset
**Use When:** Fixed headers near notch area

```tsx
<header className={`fixed top-0 ${SAFE_AREA_SPACING.top}`}>
  <h1>App Title</h1>
</header>
```

### Left Safe Area
**Value:** Max of 16px or device safe area inset
**Use When:** Landscape orientation, left-aligned content

```tsx
<aside className={SAFE_AREA_SPACING.left}>
  <nav>Sidebar</nav>
</aside>
```

### Right Safe Area
**Value:** Max of 16px or device safe area inset
**Use When:** Landscape orientation, right-aligned content

```tsx
<aside className={SAFE_AREA_SPACING.right}>
  <nav>Sidebar</nav>
</aside>
```

### Example: Mobile-Safe Footer

```tsx
<footer className={`fixed bottom-0 w-full ${SAFE_AREA_SPACING.bottom} bg-background border-t`}>
  <div className="flex justify-around px-4 py-3">
    <button>Chat</button>
    <button>History</button>
    <button>Settings</button>
  </div>
</footer>
```

---

## Helper Functions

### combineSpacing

Combine multiple spacing values:

```tsx
import { combineSpacing, CONTAINER_SPACING, GAP_SPACING } from '@/utils/spacingConstants';

<div className={combineSpacing(
  CONTAINER_SPACING.full,
  GAP_SPACING.md,
  'flex flex-col'
)}>
  {/* Content */}
</div>
```

**Use Cases:**
```tsx
// Card with internal gap
<div className={combineSpacing(CONTAINER_SPACING.full, GAP_SPACING.lg, 'flex flex-col')}>
  <h3>Title</h3>
  <p>Description</p>
</div>

// Section with safe area
<section className={combineSpacing(SECTION_SPACING.full, SAFE_AREA_SPACING.bottom)}>
  {/* Content */}
</section>
```

---

## Usage Patterns

### Full Page Layout
```tsx
function Page() {
  return (
    <>
      {/* Hero Section */}
      <section className={SECTION_SPACING.full}>
        <h1>Welcome</h1>
      </section>

      {/* Features Section */}
      <section className={SECTION_SPACING.full}>
        <div className={`grid grid-cols-3 ${GAP_SPACING.lg}`}>
          <FeatureCard />
          <FeatureCard />
          <FeatureCard />
        </div>
      </section>

      {/* CTA Section */}
      <section className={SECTION_SPACING.full}>
        <div className={CONTAINER_SPACING.full}>
          <h2>Get Started</h2>
          <button className={COMPONENT_SPACING.full}>Sign Up</button>
        </div>
      </section>
    </>
  );
}
```

### Card Layout
```tsx
function Card({ title, description }: CardProps) {
  return (
    <div className={combineSpacing(
      CONTAINER_SPACING.full,
      GAP_SPACING.md,
      'flex flex-col border rounded-lg'
    )}>
      <h3>{title}</h3>
      <p>{description}</p>
      <button className={COMPONENT_SPACING.full}>Learn More</button>
    </div>
  );
}
```

### Modal Layout
```tsx
function Modal({ isOpen, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className={combineSpacing(
        CONTAINER_SPACING.full,
        GAP_SPACING.lg,
        'bg-background rounded-lg shadow-xl max-w-md'
      )}>
        {children}
        <div className={`flex justify-end ${GAP_SPACING.sm}`}>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
```

---

## Best Practices

### DO
- Use semantic spacing constants (SECTION, CONTAINER, COMPONENT)
- Use `.full` variants for automatic responsive behavior
- Combine spacing with GAP_SPACING for internal layout
- Use SAFE_AREA_SPACING for mobile-fixed elements
- Maintain consistent spacing hierarchy

### DON'T
- Hard-code spacing values (`px-5` unless from constant)
- Mix spacing levels inappropriately (SECTION padding on buttons)
- Forget safe area insets on fixed mobile elements
- Use arbitrary padding values

### Accessibility
- Ensure touch targets are at least 44px × 44px (COMPONENT_SPACING provides this)
- Maintain consistent spacing for predictable navigation
- Don't rely solely on spacing for visual hierarchy

### Performance
- Spacing classes are pure Tailwind CSS (no runtime cost)
- Constants are tree-shakeable
- No layout thrashing from JS spacing calculations

---

## Pixel Value Reference

Quick reference for all spacing values:

**SECTION_SPACING**
- Mobile: 16px horizontal / 64px vertical
- Desktop: 24px horizontal / 96px vertical

**CONTAINER_SPACING**
- Mobile: 16px horizontal / 24px vertical
- Desktop: 24px horizontal / 32px vertical

**COMPONENT_SPACING**
- Mobile: 12px horizontal / 12px vertical
- Desktop: 20px horizontal / 20px vertical

**GAP_SPACING**
- XS: 8px
- SM: 12px
- MD: 16px
- LG: 24px
- XL: 32px

**SAFE_AREA_SPACING**
- All: Max(12-16px, device safe area)

---

## Responsive Behavior

All spacing constants follow mobile-first approach:

1. **Mobile First:** Base spacing for mobile screens
2. **Desktop Override:** Scales up at `md` breakpoint (768px)
3. **Full Variant:** Combines both for automatic behavior

**Breakpoint:** 768px (Tailwind `md:` prefix)

---

## See Also

- [Design System Overview](./OVERVIEW.md) - Introduction to the design system
- [Typography System](./TYPOGRAPHY.md) - Text sizing and hierarchy
- [Component Examples](./COMPONENTS.md) - Real-world component usage
- [Interaction States](./INTERACTIONS.md) - Hover and focus states

---

## Technical Details

**File Location:** `/src/utils/spacingConstants.ts`

**Dependencies:** Tailwind CSS 3.4+

**TypeScript:** Fully typed with `as const` for autocomplete

**Bundle Size:** ~1KB minified (tree-shakeable)
