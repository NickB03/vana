# Animation System

**Last Updated:** 2025-11-04

## Overview

Our animation system provides consistent timing and motion patterns using **motion/react** (Framer Motion). All animations use standardized durations and easing functions to create a cohesive, performant user experience.

### Key Principles
- **Consistent Timing:** Standardized durations for predictable motion
- **Natural Easing:** Physics-based easing for realistic movement
- **Performance First:** GPU-accelerated transforms, conditional animation
- **Accessibility:** Respects `prefers-reduced-motion` preference
- **Purposeful Motion:** Every animation has a reason

## Import

```tsx
import {
  ANIMATION_DURATIONS,
  ANIMATION_EASINGS,
  fadeInUp,
  scaleIn,
  staggerContainer,
  staggerItem,
  hoverLift,
  landingTransition,
  landingTransitionReduced,
  TAILWIND_DURATIONS
} from '@/utils/animationConstants';
```

---

## Animation Durations

Standardized timing in seconds for motion/react animations.

### Fast (0.15s / 150ms)
**Use For:** Micro-interactions, hover states, quick feedback

```tsx
import { ANIMATION_DURATIONS } from '@/utils/animationConstants';

<motion.button
  whileHover={{ scale: 1.05 }}
  transition={{ duration: ANIMATION_DURATIONS.fast }}
>
  Quick Hover
</motion.button>
```

**Examples:**
- Button hover scale
- Tooltip appear/disappear
- Icon state changes
- Quick color transitions

### Normal (0.2s / 200ms)
**Use For:** Standard transitions, focus states, basic animations

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: ANIMATION_DURATIONS.normal }}
>
  Standard Fade In
</motion.div>
```

**Examples:**
- Focus ring appearance
- Default fade in/out
- Menu open/close
- Tab switching

### Moderate (0.3s / 300ms)
**Use For:** Route transitions, page elements, complex components

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: ANIMATION_DURATIONS.moderate }}
>
  Page Content
</motion.div>
```

**Examples:**
- Page route transitions
- Modal open/close
- Drawer slide in/out
- Card flip animations
- Chat message appearance

### Slow (0.5s / 500ms)
**Use For:** Staggered animations, hero content, emphasis

```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: ANIMATION_DURATIONS.slow }}
>
  Hero Content
</motion.div>
```

**Examples:**
- Hero section entrance
- Staggered list items
- Complex reveal animations
- Emphasis animations

---

## Animation Easings

Natural easing functions for realistic motion.

### easeIn
**Accelerating from zero velocity** - starts slow, ends fast

```tsx
import { ANIMATION_EASINGS } from '@/utils/animationConstants';

<motion.div
  animate={{ x: 100 }}
  transition={{
    duration: ANIMATION_DURATIONS.moderate,
    ease: ANIMATION_EASINGS.easeIn
  }}
>
  Accelerating Element
</motion.div>
```

**Use When:**
- Elements exiting the screen
- Collapsing content
- Hiding elements

### easeOut
**Decelerating to zero velocity** - starts fast, ends slow (MOST COMMON)

```tsx
<motion.div
  animate={{ x: 0 }}
  transition={{
    duration: ANIMATION_DURATIONS.moderate,
    ease: ANIMATION_EASINGS.easeOut
  }}
>
  Decelerating Element
</motion.div>
```

**Use When:**
- Elements entering the screen
- Expanding content
- Revealing elements
- Most UI animations

### easeInOut
**Accelerating and decelerating** - smooth start and end

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{
    duration: ANIMATION_DURATIONS.moderate,
    ease: ANIMATION_EASINGS.easeInOut
  }}
>
  Route Transition
</motion.div>
```

**Use When:**
- Route transitions
- Modal entrance/exit
- Sliding panels
- Bidirectional animations

---

## Common Animation Variants

Pre-configured animation patterns for consistent motion.

### fadeInUp

Fade in with upward slide - used for route transitions and page elements.

```tsx
import { fadeInUp, ANIMATION_DURATIONS, ANIMATION_EASINGS } from '@/utils/animationConstants';

<motion.div
  initial={fadeInUp.initial}
  animate={fadeInUp.animate}
  exit={fadeInUp.exit}
  transition={{
    duration: ANIMATION_DURATIONS.moderate,
    ease: ANIMATION_EASINGS.easeInOut
  }}
>
  Page Content
</motion.div>
```

**Values:**
- Initial: `{ opacity: 0, y: 20 }`
- Animate: `{ opacity: 1, y: 0 }`
- Exit: `{ opacity: 0, y: -20 }`

**Use Cases:**
- Route transitions
- Page section entrances
- Modal content

### scaleIn

Scale in with fade - used for chat messages and modal entrances.

```tsx
import { scaleIn, ANIMATION_DURATIONS, ANIMATION_EASINGS } from '@/utils/animationConstants';

<motion.div
  initial={scaleIn.initial}
  animate={scaleIn.animate}
  transition={{
    duration: ANIMATION_DURATIONS.moderate,
    ease: ANIMATION_EASINGS.easeOut
  }}
>
  Chat Message
</motion.div>
```

**Values:**
- Initial: `{ opacity: 0, scale: 0.95, y: 10 }`
- Animate: `{ opacity: 1, scale: 1, y: 0 }`

**Use Cases:**
- Chat messages
- Notification toasts
- Popup dialogs
- Quick reveals

### staggerContainer

Parent container for coordinated child animations.

```tsx
import { staggerContainer } from '@/utils/animationConstants';

<motion.div
  variants={staggerContainer}
  initial="hidden"
  animate="visible"
>
  {items.map((item, i) => (
    <motion.div key={i} variants={staggerItem}>
      {item}
    </motion.div>
  ))}
</motion.div>
```

**Configuration:**
- Stagger delay: 100ms between children
- Initial child delay: 200ms before first child

**Use Cases:**
- Hero section elements
- Feature lists
- Card grids
- Navigation items

### staggerItem

Child animation for use with staggerContainer.

```tsx
// Used with staggerContainer (see example above)

import { staggerItem } from '@/utils/animationConstants';

<motion.div variants={staggerItem}>
  List Item
</motion.div>
```

**Values:**
- Hidden: `{ opacity: 0, y: 20 }`
- Visible: `{ opacity: 1, y: 0 }`
- Duration: 500ms with easeOut

**Use Cases:**
- List items in staggered animation
- Grid cards
- Navigation links
- Feature items

### hoverLift

Interactive hover effect for cards.

```tsx
import { hoverLift } from '@/utils/animationConstants';

<motion.div
  whileHover={hoverLift.whileHover}
  transition={hoverLift.transition}
  className="p-6 border rounded-lg bg-card"
>
  Hover Me
</motion.div>
```

**Effect:**
- Lifts up 8px
- Scales to 102%
- Duration: 300ms with easeOut

**Use Cases:**
- Showcase cards
- Feature cards
- Interactive tiles
- Gallery items

---

## Complete Animation Examples

### Route Transition
```tsx
import { motion } from 'motion/react';
import { fadeInUp, ANIMATION_DURATIONS, ANIMATION_EASINGS } from '@/utils/animationConstants';

function AnimatedRoute({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={fadeInUp.initial}
      animate={fadeInUp.animate}
      exit={fadeInUp.exit}
      transition={{
        duration: ANIMATION_DURATIONS.moderate,
        ease: ANIMATION_EASINGS.easeInOut
      }}
    >
      {children}
    </motion.div>
  );
}
```

### Chat Message
```tsx
import { motion } from 'motion/react';
import { scaleIn, ANIMATION_DURATIONS, ANIMATION_EASINGS } from '@/utils/animationConstants';

function ChatMessage({ content, isNew }: MessageProps) {
  if (!isNew) {
    // Don't animate existing messages (performance)
    return <div>{content}</div>;
  }

  return (
    <motion.div
      initial={scaleIn.initial}
      animate={scaleIn.animate}
      transition={{
        duration: ANIMATION_DURATIONS.moderate,
        ease: ANIMATION_EASINGS.easeOut
      }}
    >
      {content}
    </motion.div>
  );
}
```

### Staggered Feature List
```tsx
import { motion } from 'motion/react';
import { staggerContainer, staggerItem } from '@/utils/animationConstants';

function FeatureList() {
  const features = ['Fast', 'Secure', 'Reliable'];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-4"
    >
      {features.map((feature, i) => (
        <motion.div
          key={i}
          variants={staggerItem}
          className="p-4 border rounded-lg"
        >
          <h3 className="font-semibold">{feature}</h3>
        </motion.div>
      ))}
    </motion.div>
  );
}
```

### Interactive Card
```tsx
import { motion } from 'motion/react';
import { hoverLift } from '@/utils/animationConstants';

function FeatureCard({ title, description }: CardProps) {
  return (
    <motion.div
      whileHover={hoverLift.whileHover}
      transition={hoverLift.transition}
      className="p-6 border rounded-lg bg-card cursor-pointer"
      onClick={handleClick}
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-2">{description}</p>
    </motion.div>
  );
}
```

### Hero Section with Stagger
```tsx
import { motion } from 'motion/react';
import { staggerContainer, staggerItem } from '@/utils/animationConstants';

function Hero() {
  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="text-center py-24"
    >
      <motion.h1
        variants={staggerItem}
        className="text-6xl font-extrabold"
      >
        Welcome to Our App
      </motion.h1>

      <motion.p
        variants={staggerItem}
        className="text-xl text-muted-foreground mt-4"
      >
        The best solution for your needs
      </motion.p>

      <motion.div
        variants={staggerItem}
        className="flex gap-4 justify-center mt-8"
      >
        <button>Get Started</button>
        <button>Learn More</button>
      </motion.div>
    </motion.section>
  );
}
```

---

## Landing Page Transition

Special transition for landing → app navigation.

### Standard Transition
```tsx
import { landingTransition } from '@/utils/animationConstants';

// Landing page fade out
<motion.div
  initial={landingTransition.landing.fadeOut.initial}
  animate={landingTransition.landing.fadeOut.complete}
>
  Landing Content
</motion.div>

// App fade in
<motion.div
  initial={landingTransition.app.fadeIn.initial}
  animate={landingTransition.app.fadeIn.complete}
>
  App Content
</motion.div>
```

### Reduced Motion Transition
```tsx
import { landingTransitionReduced } from '@/utils/animationConstants';

// Respects prefers-reduced-motion
<motion.div
  initial={landingTransitionReduced.landing.fadeOut.initial}
  animate={landingTransitionReduced.landing.fadeOut.complete}
>
  Landing Content
</motion.div>
```

---

## Tailwind Duration Classes

For CSS transitions (not motion/react), use these Tailwind classes:

```tsx
import { TAILWIND_DURATIONS } from '@/utils/animationConstants';

// Fast (150ms)
<div className={`transition ${TAILWIND_DURATIONS.fast} hover:scale-105`}>
  Quick Hover
</div>

// Normal (200ms)
<div className={`transition-colors ${TAILWIND_DURATIONS.normal} hover:bg-accent`}>
  Color Transition
</div>

// Moderate (300ms)
<div className={`transition-all ${TAILWIND_DURATIONS.moderate} hover:shadow-lg`}>
  Complex Transition
</div>

// Slow (500ms)
<div className={`transition ${TAILWIND_DURATIONS.slow} hover:opacity-100`}>
  Slow Fade
</div>
```

**Values:**
- `fast`: `duration-150`
- `normal`: `duration-200`
- `moderate`: `duration-300`
- `slow`: `duration-500`

---

## Performance Optimization

### Conditional Animation

Only animate new elements, not entire lists:

```tsx
function MessageList({ messages }: Props) {
  return (
    <div>
      {messages.map((msg, i) => {
        const isLast = i === messages.length - 1;
        const isNew = isLast && !isStreaming;

        // Only animate the newest message
        if (isNew) {
          return (
            <motion.div
              key={msg.id}
              initial={scaleIn.initial}
              animate={scaleIn.animate}
            >
              {msg.content}
            </motion.div>
          );
        }

        // Existing messages: no animation
        return <div key={msg.id}>{msg.content}</div>;
      })}
    </div>
  );
}
```

### GPU Acceleration

Use transform properties (not top/left) for better performance:

```tsx
// Good - GPU accelerated
<motion.div animate={{ x: 100, y: 50 }}>
  Fast Animation
</motion.div>

// Avoid - CPU bound, causes layout thrashing
<motion.div animate={{ left: 100, top: 50 }}>
  Slow Animation
</motion.div>
```

### Will-Change Hint

For complex animations, add `will-change`:

```tsx
<motion.div
  className="will-change-transform"
  animate={{ x: 100, rotate: 45 }}
>
  Complex Animation
</motion.div>
```

### Layout Animations

Avoid animating layout properties when possible:

```tsx
// Prefer transform over width/height
<motion.div
  initial={{ scaleX: 0 }}
  animate={{ scaleX: 1 }}
>
  Efficient Width Animation
</motion.div>
```

---

## Accessibility

### Respecting prefers-reduced-motion

**Automatic (Tailwind):**
```tsx
// Automatically respects user preference
<div className="motion-safe:hover:scale-105">
  Hover Me
</div>
```

**Manual (motion/react):**
```tsx
import { useReducedMotion } from 'motion/react';

function AnimatedComponent() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ opacity: 1, y: shouldReduceMotion ? 0 : 20 }}
      transition={{ duration: shouldReduceMotion ? 0 : ANIMATION_DURATIONS.moderate }}
    >
      Content
    </motion.div>
  );
}
```

**With Variants:**
```tsx
const variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const reducedVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

function AccessibleAnimation() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={shouldReduceMotion ? reducedVariants : variants}
      initial="hidden"
      animate="visible"
    >
      Content
    </motion.div>
  );
}
```

---

## Best Practices

### DO
- Use standardized durations (ANIMATION_DURATIONS)
- Use easeOut for most animations
- Animate transform properties (x, y, scale, rotate)
- Conditionally animate (only new items in lists)
- Respect `prefers-reduced-motion`
- Use GPU acceleration (`transform-gpu`)
- Keep animations purposeful

### DON'T
- Create custom animation timings without reason
- Animate all items in long lists (performance)
- Animate layout properties (width, height, top, left)
- Use animations that cause layout thrashing
- Ignore accessibility preferences
- Add animation for decoration only
- Chain too many animations

### Performance Checklist
- [ ] Animating transform properties (not layout)
- [ ] Conditional animation for lists
- [ ] GPU acceleration enabled
- [ ] Duration is appropriate for context
- [ ] No layout thrashing
- [ ] Respects reduced motion preference
- [ ] Tested on lower-end devices

### Accessibility Checklist
- [ ] Respects `prefers-reduced-motion`
- [ ] Animation has purpose (not decoration)
- [ ] Content is accessible without animation
- [ ] Animation doesn't trigger seizures (no rapid flashing)
- [ ] User can pause/disable if needed

---

## Motion-Safe Pattern

Use Tailwind's `motion-safe:` prefix for CSS animations:

```tsx
function SafeAnimation() {
  return (
    <button className="motion-safe:hover:scale-105 motion-safe:active:scale-95 transition">
      {/* Scale animations disabled if user prefers reduced motion */}
      Accessible Button
    </button>
  );
}
```

**Applied in Interaction Constants:**
```tsx
// From BUTTON_STATES.default
"hover:scale-105 motion-safe:hover:scale-105"
"active:scale-95 motion-safe:active:scale-95"
```

---

## Timing Comparison

Visual guide for choosing the right duration:

**150ms (Fast):**
- Button hover
- Tooltip
- Icon change
- Quick feedback

**200ms (Normal):**
- Focus ring
- Color transition
- Menu toggle
- Tab switch

**300ms (Moderate):**
- Route transition
- Modal open/close
- Card flip
- Drawer slide

**500ms (Slow):**
- Hero entrance
- Staggered list
- Complex reveal
- Emphasis effect

---

## See Also

- [Design System Overview](./OVERVIEW.md) - Introduction to the design system
- [Interaction States](./INTERACTIONS.md) - Hover, focus, active states
- [Component Examples](./COMPONENTS.md) - Real-world component usage
- [Typography System](./TYPOGRAPHY.md) - Text styling

---

## Technical Details

**File Location:** `/src/utils/animationConstants.ts`

**Dependencies:**
- motion/react (Framer Motion)
- Tailwind CSS 3.4+

**TypeScript:** Fully typed with `as const` for autocomplete

**Bundle Size:** ~2KB minified (tree-shakeable)

**Browser Support:** All modern browsers, graceful fallback for older browsers
