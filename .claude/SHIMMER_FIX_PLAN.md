# TextShimmer Animation Fix - Complete Plan

## Problem Statement

The shimmer effect in the reasoning display was appearing **frozen** - the animation would not visually move across the text. The gradient highlight appeared stuck in one location regardless of the CSS animation.

## Root Cause Analysis

### Why the Animation Was Frozen

The original implementation had a fundamental CSS limitation:

```tsx
// OLD: Gradient was 100% wide with fixed color stops
backgroundImage: `linear-gradient(to right,
  hsl(var(--muted-foreground)) ${50 - dynamicSpread}%,  // e.g., 30%
  hsl(var(--foreground)) 50%,                            // center
  hsl(var(--muted-foreground)) ${50 + dynamicSpread}%    // e.g., 70%
)`
// Only changes: backgroundPosition shifts (200% → -200%)
// But the gradient FILLS the 100% container, so position changes are invisible
```

**The Issue**: When a gradient's color stops span 0-100% (fills container), shifting the `backgroundPosition` creates no visual effect because:
1. The gradient already covers the entire element
2. Moving it left/right just shows the same gradient in a different position
3. The color transitions happen at the same visual locations

This is why the shimmer appeared **frozen** even though the CSS animation was technically running.

### Why It Got Worse With Streaming

During streaming, the `ReasoningDisplay` component updates the pill text frequently:
- "Thinking..." → "Scrutinizing..." → "Analyzing logic..." etc.

Each text change triggered a React re-render, which:
1. Recalculated the gradient with new `dynamicSpread` values
2. Made the animation restart/flicker
3. Compounded the frozen appearance

## Solution Implementation

### 1. Fix TextShimmer Component (`src/components/prompt-kit/text-shimmer.tsx`)

Changed from a 100%-wide gradient to a **200%-wide gradient** with explicit shimmer highlight:

```tsx
// NEW: Create a 200% wide gradient so animations can sweep across
backgroundImage: `linear-gradient(90deg,
  hsl(var(--muted-foreground)) 0%,
  hsl(var(--muted-foreground)) ${40 - dynamicSpread / 2}%,  // Dark area
  hsl(var(--foreground)) 40%,                                 // Shimmer start
  hsl(var(--foreground)) 60%,                                 // Shimmer peak
  hsl(var(--muted-foreground)) ${60 + dynamicSpread / 2}%,  // Dark area
  hsl(var(--muted-foreground)) 100%
)`,
backgroundSize: '200% 100%',  // CRITICAL: Makes gradient 2x container width
animationDuration: `${duration}s`,
```

**Key Changes**:
- ✅ Added `backgroundSize: '200% 100%'` — stretches gradient to 200% of container width
- ✅ Restructured gradient to show a clear shimmer band moving left-to-right
- ✅ Dynamic spread now controls the **width of the light band**, not the color stop percentages

### 2. Fix Tailwind Animation (`tailwind.config.ts`)

Updated keyframes to properly animate the oversized gradient:

```tsx
// OLD: Reversed positions (200% → -200%)
"shimmer": {
  "0%": { backgroundPosition: "200% 0" },
  "100%": { backgroundPosition: "-200% 0" }
}

// NEW: Correct direction (-200% → 200%)
"shimmer": {
  "0%": { backgroundPosition: "-200% 0" },
  "100%": { backgroundPosition: "200% 0" }
}
```

**Why this matters**:
- With a 200%-wide gradient, starting at `-200% 0` positions the gradient **off-screen to the left**
- Animating to `200% 0` sweeps it **across the visible container**
- Creates the illusion of a shimmer highlight moving left-to-right

## How It Works Now

### Animation Sequence

1. **0% keyframe** (`backgroundPosition: "-200% 0"`): Gradient is off-screen left
   ```
   [Gradient off-screen] [ELEMENT] [Visible container]
   ```

2. **50% keyframe** (implicit): Gradient is centered
   ```
   [ELEMENT with bright band in middle]
   ```

3. **100% keyframe** (`backgroundPosition: "200% 0"`): Gradient is off-screen right
   ```
   [Visible container] [ELEMENT] [Gradient off-screen right]
   ```

### During Streaming

When the pill text changes ("Thinking..." → "Scrutinizing..."):
- React re-renders the component
- ✅ The gradient stays visible because it's now **larger than the container**
- ✅ The animation continues uninterrupted because `backgroundPosition` shifts are always effective
- ✅ No visual "jump" or "freeze"

## Key Implementation Details

### Dynamic Spread Calculation

The `spread` prop now controls the **width of the bright area**:

```tsx
// Old: spread = 20 → color stops at 30% and 70%
// New: spread = 20 → bright band width ≈ 20% of gradient

${40 - dynamicSpread / 2}%  // Left edge of bright area
${60 + dynamicSpread / 2}%  // Right edge of bright area
```

**Constrained values**:
- Minimum spread: 5px (tight shimmer)
- Maximum spread: 45px (wide shimmer)

### CSS Properties Used

```tsx
{
  backgroundImage: "<linear-gradient>",
  backgroundSize: '200% 100%',      // Makes gradient 2x wider
  backgroundClip: 'text',           // Applied via Tailwind class
  WebkitBackgroundClip: 'text',     // Safari compatibility
  color: 'transparent',              // Applied via Tailwind class
  animation: 'animate-shimmer 4s...' // Tailwind animation
}
```

## Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| Gradient width | 100% (container) | 200% (oversized) |
| Animation effect | Frozen | Smooth sweep |
| Text changes | Restart/flicker | Continuous |
| Performance | ✅ Good | ✅ Good (no change) |
| Browser support | ✅ All modern | ✅ All modern |

## Testing Checklist

- [x] Gradient properly expands to 200% width
- [x] Animation sweeps left-to-right smoothly
- [x] Works during streaming (text changes don't break animation)
- [x] Works with both `duration` and `spread` props
- [x] `pulse` variant still functions
- [x] Tailwind keyframes properly configured
- [x] No performance regression

## Files Modified

1. **src/components/prompt-kit/text-shimmer.tsx**
   - Updated inline style with 200% gradient
   - Restructured color stops for proper shimmer effect

2. **tailwind.config.ts**
   - Fixed keyframe animation direction
   - Updated both `shimmer` and `shimmer-pulse` animations

## Compatibility Notes

- **CSS Support**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **Performance**: No impact - same CSS property mutations
- **Accessibility**: Text is clipped but content is in DOM (screen readers unaffected)
- **Mobile**: Works identically on iOS/Android

## Related Code

- **Component using TextShimmer**: `src/components/ReasoningDisplay.tsx` (line 369-379)
- **Animation timing**: `tailwind.config.ts` (line 163: `"shimmer": "shimmer 4s infinite linear"`)
- **Theme colors**: Uses `--muted-foreground` and `--foreground` CSS variables

---

**Status**: ✅ Complete - Fix applied and validated
**Date**: 2025-12-01
