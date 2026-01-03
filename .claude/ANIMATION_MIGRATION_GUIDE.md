# Animation System Migration Guide

This guide helps you migrate existing components to use the new unified animation system (`src/utils/animationSystem.ts`).

## ✅ Completed Migrations

The following components have been successfully migrated:

1. **Sidebar** (`src/components/ui/sidebar.tsx`)
   - ✅ Replaced `ease-out` with `ease-[cubic-bezier(0.4,0,0.2,1)]` for consistency
   - ✅ Maintained `duration-200` (matches ANIMATION_SYSTEM.duration.normal)

2. **ChatSidebar** (`src/components/ChatSidebar.tsx`)
   - ✅ Added consistent easing curves to transitions
   - ✅ Kept existing duration values

3. **ArtifactContainer** (`src/components/ArtifactContainer.tsx`)
   - ✅ Added scale-in animation using `ARTIFACT_ANIMATION`
   - ✅ Smooth entrance/exit with Motion

4. **ChatMessage** (`src/components/chat/ChatMessage.tsx`)
   - ✅ **CRITICAL FIX**: Only animates LAST message (not entire history)
   - ✅ Uses `MESSAGE_ANIMATION.shouldAnimate()`
   - ✅ Conditional animation wrapper

5. **AnimatedRoute** (`src/components/AnimatedRoute.tsx`)
   - ✅ Migrated to use `ROUTE_ANIMATION`
   - ✅ Simplified imports

## 🔄 Pending Migrations

The following files contain hardcoded animation values and should be migrated:

### High Priority (User-Facing Animations)

#### 1. Reasoning Display (`src/components/ReasoningDisplay.tsx`, `src/index.css`)
**Current**: Hardcoded 600ms fade animation with blur filter
```css
/* index.css lines 725-774 */
@keyframes fadeInWord {
  from {
    opacity: 0;
    filter: blur(2px);  /* ⚠️ Expensive on mobile */
  }
  to {
    opacity: 1;
    filter: blur(0px);
  }
}
``````

**Recommended**:
```typescript
// Replace blur with scale for better performance
import { DURATION, EASING } from '@/utils/animationSystem';

// Update CSS
@keyframes fadeInWord {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.fade-word {
  animation: fadeInWord ${DURATION.slow}ms ${EASING.decelerate} forwards;
}
```

#### 2. Gallery Hover Carousel (`src/components/ui/gallery-hover-carousel.tsx`)
**Current**: Likely has transition values
**Action**: Update to use `TRANSITIONS.normal` or `TRANSITIONS.transform.normal`

#### 3. Prompt Input Controls (`src/components/prompt-kit/prompt-input-controls.tsx`)
**Current**: Contains `duration-150` or `duration-200`
**Action**: Replace with `ANIMATION_CLASSES.duration.*` or use `TRANSITIONS.*`

### Medium Priority (Interactive Elements)

#### 4. All `transition.*duration-(150|200|300|400)` occurrences
Found in 20+ files. For each file:

**Before**:
```tsx
<div className="transition-all duration-200 ease-out">
```

**After**:
```tsx
import { TRANSITIONS } from '@/utils/animationSystem';

<div className={TRANSITIONS.normal}>  {/* Pre-composed: transition-all duration-200 ease-standard */}
```

Or for custom combinations:
```tsx
import { ANIMATION_CLASSES } from '@/utils/animationSystem';

<div className={`transition-transform ${ANIMATION_CLASSES.duration.normal} ${ANIMATION_CLASSES.easing.standard}`}>
```

### Low Priority (Internal/Less Visible)

#### 5. Remaining Component Files
- `src/components/MessageWithArtifacts.tsx`
- `src/components/DesktopHeader.tsx`
- `src/components/MobileHeader.tsx`
- `src/components/SidebarItem.tsx`
- `src/components/InlineImage.tsx`
- And 15+ more (see grep results)

## 📖 Migration Recipes

### Recipe 1: Tailwind Transitions

**Old Way**:
```tsx
<div className="transition-all duration-200 ease-out hover:scale-105">
```

**New Way**:
```tsx
import { TRANSITIONS, HOVER_ANIMATION } from '@/utils/animationSystem';

// Option A: Pre-composed class
<div className={`${TRANSITIONS.normal} hover:scale-105`}>

// Option B: Motion for complex hover effects
<motion.div {...HOVER_ANIMATION.scale}>
```

### Recipe 2: Motion Animations

**Old Way**:
```tsx
import { motion } from 'motion/react';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: 'easeOut' }}
>
```

**New Way**:
```tsx
import { motion } from 'motion/react';
import { MOTION_VARIANTS, MOTION_TRANSITIONS } from '@/utils/animationSystem';

<motion.div
  {...MOTION_VARIANTS.fadeIn}
  transition={MOTION_TRANSITIONS.moderate}
>
```

### Recipe 3: Conditional Animations (Accessibility)

**Old Way**:
```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
>
```

**New Way**:
```tsx
import { motion } from 'motion/react';
import { getAccessibleAnimation, MOTION_VARIANTS } from '@/utils/animationSystem';

<motion.div {...getAccessibleAnimation(MOTION_VARIANTS.fadeIn)}>
  {/* Animation respects prefers-reduced-motion */}
</motion.div>
```

### Recipe 4: Message-Only Animation (CRITICAL)

**❌ WRONG - Animates entire history**:
```tsx
export const ChatMessage = ({ message }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {message.content}
    </motion.div>
  );
};
```

**✅ CORRECT - Only animates last message**:
```tsx
import { MESSAGE_ANIMATION } from '@/utils/animationSystem';

export const ChatMessage = ({ message, isLastMessage, isStreaming }) => {
  const shouldAnimate = MESSAGE_ANIMATION.shouldAnimate(isLastMessage, isStreaming);
  const Wrapper = shouldAnimate ? motion.div : 'div';
  const props = shouldAnimate ? {
    ...MESSAGE_ANIMATION.variant,
    transition: MESSAGE_ANIMATION.transition
  } : {};

  return <Wrapper {...props}>{message.content}</Wrapper>;
};
```

## 🎯 Animation Decision Tree

Use this flowchart to choose the right animation approach:

```
Is it a simple CSS transition?
├─ YES → Use TRANSITIONS.* (pre-composed classes)
│   └─ Example: opacity fade, scale hover
│
└─ NO → Is it a complex multi-property animation?
    ├─ YES → Use Motion with MOTION_VARIANTS.*
    │   └─ Example: page transitions, modals, artifacts
    │
    └─ NO → Is it a component-specific animation?
        ├─ YES → Use specific config (ARTIFACT_ANIMATION, MESSAGE_ANIMATION, etc.)
        │   └─ Example: artifacts, messages, routes
        │
        └─ NO → Build custom using DURATION, EASING, TRANSLATE constants
```

## 🚨 Common Pitfalls

### ❌ DON'T: Mix animation systems inconsistently
```tsx
// Bad: Mixes Tailwind and Motion timing
<motion.div
  transition={{ duration: 0.2 }}  // Motion timing
  className="duration-300"         // Tailwind timing (different!)
>
```

### ✅ DO: Stay consistent
```tsx
// Good: Uses unified system
import { MOTION_TRANSITIONS, TRANSITIONS } from '@/utils/animationSystem';

<motion.div
  transition={MOTION_TRANSITIONS.normal}  // 200ms
  className={TRANSITIONS.normal}           // Also 200ms
>
```

### ❌ DON'T: Hardcode timing values
```tsx
// Bad
<div className="transition-all duration-[250ms]">
```

### ✅ DO: Use constants
```tsx
import { ANIMATION_CLASSES } from '@/utils/animationSystem';

<div className={`transition-all ${ANIMATION_CLASSES.duration.normal}`}>
```

### ❌ DON'T: Forget accessibility
```tsx
// Bad: No reduced-motion support
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
```

### ✅ DO: Use accessible helpers
```tsx
import { getAccessibleAnimation, MOTION_VARIANTS } from '@/utils/animationSystem';

<motion.div {...getAccessibleAnimation(MOTION_VARIANTS.fadeIn)}>
```

## 📊 Animation Inventory

### Timing Values (Duration)
- **Fast** (150ms): Hover states, tooltips, micro-interactions
- **Normal** (200ms): Dropdowns, focus states, standard UI
- **Moderate** (300ms): Page transitions, modals
- **Slow** (500ms): Hero sections, staggered lists

### Easing Curves
- **Standard** (`cubic-bezier(0.4, 0, 0.2, 1)`): Most common, balanced
- **Decelerate** (`cubic-bezier(0, 0, 0.2, 1)`): Elements entering screen
- **Accelerate** (`cubic-bezier(0.4, 0, 1, 1)`): Elements leaving screen
- **Sharp** (`cubic-bezier(0.4, 0, 0.6, 1)`): Quick, decisive movements

### Translate Distances
- **Small** (8px): Micro-interactions
- **Medium** (12px): Standard movements (NEW STANDARD)
- **Large** (20px): Page transitions
- **X-Large** (40px): Scroll-triggered animations

## 🔍 Finding Components to Migrate

```bash
# Find all files with hardcoded animation timing
grep -r "duration-\(150\|200\|300\|400\)" src/components --include="*.tsx"

# Find Motion usage without new system
grep -r "from.*motion/react" src/components --include="*.tsx" | \
  xargs grep -L "animationSystem"

# Find Tailwind transitions
grep -r "transition-" src/components --include="*.tsx"
```

## ✨ Benefits of Migration

1. **Consistency**: All animations use same timing/easing
2. **Maintainability**: Change timing globally in one file
3. **Performance**: Pre-composed classes reduce CSS bloat
4. **Accessibility**: Built-in reduced-motion support
5. **Developer Experience**: Clear, documented constants

## 📝 Migration Checklist

For each component you migrate:

- [ ] Import `animationSystem` constants
- [ ] Replace hardcoded `duration-*` with `ANIMATION_CLASSES.duration.*`
- [ ] Replace custom easing with `ANIMATION_CLASSES.easing.*`
- [ ] Use pre-composed `TRANSITIONS.*` when possible
- [ ] Update Motion animations to use `MOTION_VARIANTS.*` and `MOTION_TRANSITIONS.*`
- [ ] Test with reduced-motion enabled
- [ ] Verify animation timing feels consistent with other components

## 🎨 Examples in Codebase

See these files for reference implementations:

- **Sidebar Animation**: `src/components/ui/sidebar.tsx` (lines 196, 206)
- **Artifact Animation**: `src/components/ArtifactContainer.tsx` (lines 16-17, 292-296)
- **Message Animation**: `src/components/chat/ChatMessage.tsx` (lines 15-16, 79-89)
- **Route Animation**: `src/components/AnimatedRoute.tsx` (lines 13, 28-29)

## 🆘 Need Help?

- Check `src/utils/animationSystem.ts` for full documentation
- See examples above for common patterns
- Test in browser with Chrome DevTools to verify timing
- Use `prefers-reduced-motion` media query in DevTools to test accessibility
