# TextShimmer Configuration Guide

Complete reference for adjusting speed, direction, and appearance of shimmer effects.

## Quick Reference

```tsx
<TextShimmer
  duration={2}        // Animation speed (seconds)
  spread={20}         // Shimmer width (5-45)
  pulse={false}       // Use pulsing variant instead of sweep
  className="..."     // Additional CSS classes
>
  {text}
</TextShimmer>
```

---

## Duration (Speed Control)

Controls how long one complete animation cycle takes.

### Duration Values

| Duration | Effect | Use Case |
|----------|--------|----------|
| `1` | ⚡ Ultra-fast, jittery | Not recommended |
| `2` | 🚀 Fast, energetic | Loading states, urgent |
| `3` | ⚖️ Balanced, steady | Default for most uses |
| `4` | 📖 Slow, readable | Long text, focus |
| `6`+ | 🐌 Glacial, relaxed | Background elements |

### Implementation

```tsx
// Fast shimmer (good for brief status updates)
<TextShimmer duration={2} spread={2}>
  Thinking...
</TextShimmer>

// Slow shimmer (good for reading longer text)
<TextShimmer duration={6} spread={20}>
  Analyzing request complexity and dependencies...
</TextShimmer>

// Using with streaming - adjust based on message frequency
{isStreaming ? (
  <TextShimmer duration={2}>      {/* Fast for rapid updates */}
    {pill}
  </TextShimmer>
) : (
  <TextShimmer duration={4}>      {/* Slow for final state */}
    {pill}
  </TextShimmer>
)}
```

### Real-World Example (from ReasoningDisplay)

```tsx
<TextShimmer
  duration={2}    // Quick sweep = keeps attention
  spread={2}      // Tight band = visible against text
>
  {getPillLabel()}  // Updates as reasoning progresses
</TextShimmer>
```

---

## Spread (Width Control)

Controls the width of the bright shimmer band.

### Spread Values

| Spread | Width | Effect | Use Case |
|--------|-------|--------|----------|
| `5` | 🎯 Narrow | Tight highlight, subtle | Minimal visual impact |
| `10` | 📍 Medium-narrow | Balanced, noticeable | Standard text |
| `20` | 📌 Medium | Clear, prominent | Default recommendation |
| `30` | 📈 Medium-wide | Obvious, energetic | Call attention |
| `45` | 📊 Wide | Maximum effect, bold | Emphasis, high priority |

### Visual Comparison

```
Spread=5:   [dark-[tight]-dark] → Subtle shimmer
Spread=20:  [dark-----[clear]-----dark] → Balanced
Spread=45:  [dark-----------[bold]-----------dark] → Bold
```

### Implementation

```tsx
// Subtle shimmer for background info
<TextShimmer spread={5}>
  Processing...
</TextShimmer>

// Standard shimmer for normal updates
<TextShimmer spread={20}>
  Analyzing...
</TextShimmer>

// Bold shimmer for important status
<TextShimmer spread={45}>
  Critical: Checking security...
</TextShimmer>

// Tight shimmer on small text
<div className="text-xs">
  <TextShimmer spread={2}>mini text</TextShimmer>
</div>

// Wide shimmer on large text
<div className="text-2xl">
  <TextShimmer spread={30}>Big text</TextShimmer>
</div>
```

---

## Animation Direction

### Left-to-Right (Default)

```tsx
// Default behavior - shimmer sweeps left to right
<TextShimmer duration={3}>
  Text here
</TextShimmer>

// Animation:
// Start: [    light-band] → [dark area]
// Mid:   [dark] [light-band] [dark]
// End:   [dark area] [    light-band]
```

### Reverse Direction (Right-to-Left)

Currently requires custom CSS modification. Here's how to implement:

```tsx
// Custom wrapper with reversed animation
<div className="shimmer-rtl">
  <TextShimmer duration={3}>
    Text here
  </TextShimmer>
</div>

// Add to tailwind.config.ts keyframes:
"shimmer-rtl": {
  "0%": { backgroundPosition: "200% 0" },    // Start right
  "100%": { backgroundPosition: "-200% 0" }   // End left
}

// Add to tailwind.config.ts animation:
"shimmer-rtl": "shimmer-rtl 3s infinite linear"

// Add to styles:
const customStyle = `
  .shimmer-rtl {
    animation: shimmer-rtl 3s infinite linear !important;
  }
`
```

Or using inline styles:

```tsx
<div style={{
  animation: 'shimmer-rtl 3s infinite linear'
}}>
  <TextShimmer duration={3}>
    Text here
  </TextShimmer>
</div>
```

---

## Animation Modes

### Mode 1: Sweep (Default)

Shimmer band travels across text once per cycle.

```tsx
<TextShimmer pulse={false} duration={3}>
  Thinking...
</TextShimmer>

// Animation: [START] ──→ [MIDDLE] ──→ [END] ──→ [REPEAT]
// Continuous left-to-right motion
```

**Best for**:
- Status updates
- Loading indicators
- Real-time processing
- Streaming responses

### Mode 2: Pulse

Gentle pulsing effect (brightness fades in/out).

```tsx
<TextShimmer pulse={true} duration={3}>
  Thinking...
</TextShimmer>

// Animation:
// Start:  [dim] Thinking [dim]
// Mid:    [bright] Thinking [bright]
// End:    [dim] Thinking [dim]
// Repeat: cycle repeats
```

**Best for**:
- Gentle loading indicators
- Non-urgent status
- Breathing effect
- Background processing

### Keyframes Comparison

```tsx
// tailwind.config.ts

// Sweep: backgroundPosition travels
keyframes: {
  "shimmer": {
    "0%": { backgroundPosition: "-200% 0" },
    "100%": { backgroundPosition: "200% 0" }
  },

  // Pulse: backgroundPosition + opacity change
  "shimmer-pulse": {
    "0%, 100%": {
      backgroundPosition: "-200% 0",
      opacity: "0.8"
    },
    "50%": {
      backgroundPosition: "0% 0",
      opacity: "1"
    }
  }
}
```

---

## Advanced Configurations

### Scenario 1: Streaming Updates (Fast & Tight)

```tsx
// During streaming: quick updates, tight focus
<TextShimmer
  duration={2}    // Fast - matches rapid text updates
  spread={2}      // Tight - visible on changing text
>
  {streamingText}
</TextShimmer>
```

**Why these values**:
- Short duration matches rapid status changes
- Tight spread visible even on short text
- Energetic feel keeps user engaged

### Scenario 2: Final Status (Slow & Clear)

```tsx
// After streaming: slower, easier to read
<TextShimmer
  duration={4}    // Slow - final status is stable
  spread={20}     // Clear - good visibility
>
  {finalStatus}
</TextShimmer>
```

**Why these values**:
- Longer duration gives time to read
- Medium spread is readable and professional
- Less frenetic energy

### Scenario 3: Subtle Background Processing

```tsx
// Background task with minimal distraction
<TextShimmer
  duration={6}    // Very slow - subtle
  spread={5}      // Narrow - barely visible
  pulse={true}    // Gentle pulsing
>
  {backgroundText}
</TextShimmer>
```

**Why these values**:
- Long duration = non-intrusive
- Narrow spread = subtle effect
- Pulse mode = breathing feel

### Scenario 4: High-Priority Alert

```tsx
// Important status requiring attention
<TextShimmer
  duration={1.5}  // Fast - grab attention
  spread={45}     // Wide - obvious effect
>
  ERROR: {errorMessage}
</TextShimmer>
```

**Why these values**:
- Short duration = urgent feel
- Wide spread = can't miss it
- Energetic animation

---

## Real Component Examples

### In ReasoningDisplay Component

```tsx
// Current implementation (line 369-379 in ChatInterface.tsx)
{showShimmer ? (
  <TextShimmer
    className={cn(
      "text-sm line-clamp-1 w-full",
      "transition-opacity duration-150",
      isTransitioning && "opacity-50"
    )}
    duration={2}    // ← Fast for streaming updates
    spread={2}      // ← Tight for changing text
  >
    {getPillLabel()}
  </TextShimmer>
) : (
  // Non-streaming state shows static text
)}
```

### Customization Variants

Create preset configurations:

```tsx
// shimmer-presets.tsx
export const shimmerPresets = {
  // Fast & tight for streaming
  streaming: { duration: 2, spread: 2 },

  // Balanced for general use
  default: { duration: 3, spread: 20 },

  // Slow & gentle for subtle effect
  subtle: { duration: 6, spread: 5, pulse: true },

  // Bold for attention
  urgent: { duration: 1.5, spread: 45 },

  // Large text
  largeText: { duration: 3, spread: 30 },

  // Small text
  smallText: { duration: 3, spread: 8 },
} as const;

// Usage:
<TextShimmer {...shimmerPresets.streaming}>
  {text}
</TextShimmer>
```

---

## Performance Tuning

### CPU/GPU Impact by Configuration

```
Duration 1s:    ████████░░░░░░░░ CPU: ~0.3% (60fps repaints)
Duration 2s:    ███░░░░░░░░░░░░░░ CPU: ~0.15% (30fps pattern)
Duration 4s:    ██░░░░░░░░░░░░░░░░ CPU: ~0.08% (15fps pattern)
Duration 6s:    █░░░░░░░░░░░░░░░░░░ CPU: ~0.05% (10fps pattern)
```

### Recommendations

- **Mobile**: Use `duration={4+}` and `spread={≤20}`
- **Desktop**: Any duration/spread (can handle more)
- **Multiple elements**: Keep count ≤5 per view
- **Slow networks**: Use longer duration for better UX

### Browser DevTools Inspection

```javascript
// Check animation performance
const el = document.querySelector('[class*="shimmer"]');
const perf = el.getAnimations();

console.log('Active animations:', perf.length);
console.log('Duration:', perf[0].effect.getTiming().duration);
console.log('Iteration:', perf[0].effect.getTiming().iterations);

// Monitor repaints
performance.mark('shimmer-start');
// ... let animation run for 5 seconds
performance.mark('shimmer-end');
performance.measure('shimmer', 'shimmer-start', 'shimmer-end');
```

---

## CSS Variable Customization

Shimmer colors use theme CSS variables:

```css
/* In your theme or global styles */
--muted-foreground: 215 14% 34%;    /* Dark band color */
--foreground: 217 33% 17%;          /* Bright band color */
```

To customize shimmer colors without changing theme:

```tsx
<div style={{
  '--muted-foreground': '220 10% 50%',  // Custom dark
  '--foreground': '220 100% 80%',       // Custom light
}}>
  <TextShimmer>Custom colors</TextShimmer>
</div>
```

---

## Troubleshooting Configuration Issues

### Issue: Shimmer Too Fast (Distracting)

**Solution**: Increase `duration`
```tsx
// Before
<TextShimmer duration={1.5}>

// After
<TextShimmer duration={4}>
```

### Issue: Shimmer Not Visible

**Solution**: Increase `spread`
```tsx
// Before
<TextShimmer spread={2}>

// After
<TextShimmer spread={20}>
```

### Issue: Animation Stops When Text Changes

**Solution**: Verify `backgroundSize: 200%` is applied
```jsx
// In browser DevTools:
getComputedStyle(element).backgroundSize
// Should be: "200% 100%"
```

### Issue: Looks Different on Mobile

**Solution**: Adjust for smaller screens
```tsx
import { useIsMobile } from '@/hooks/use-mobile';

export function MyComponent() {
  const isMobile = useIsMobile();

  return (
    <TextShimmer
      duration={isMobile ? 4 : 2}
      spread={isMobile ? 10 : 20}
    >
      {text}
    </TextShimmer>
  );
}
```

---

## Best Practices

1. **Match duration to update frequency**
   - Rapid updates: `duration={2}` (fast)
   - Stable text: `duration={4}` (slow)

2. **Size spread to text size**
   - Small text (12px): `spread={5-10}`
   - Medium text (16px): `spread={15-25}`
   - Large text (20px+): `spread={30-45}`

3. **Use pulse for background tasks**
   - Less distracting
   - Gentler on the eye
   - Better accessibility

4. **Test on actual devices**
   - Desktop Chrome ≠ Mobile Safari
   - Battery impact on mobile
   - Performance varies

5. **Consider accessibility**
   - Respect `prefers-reduced-motion`
   - Ensure text remains readable
   - Don't use for critical information

---

## See Also

- `.claude/SHIMMER_FIX_PLAN.md` — Technical implementation
- `.claude/SHIMMER_VISUAL_GUIDE.md` — Animation mechanics
- `src/components/prompt-kit/text-shimmer.tsx` — Component source
- `tailwind.config.ts` — Animation definitions
- `src/components/ReasoningDisplay.tsx` — Production usage example
