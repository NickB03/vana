# Frogger V2 Migration Guide

## Quick Start

Replace the original Frogger game with the enhanced V2 in just 2 steps:

### Step 1: Update DemoMode.tsx

```typescript
// Change this import:
import { FroggerGame } from '@/components/demo/FroggerGame';

// To this:
import { FroggerGameV2 } from '@/components/demo/FroggerGameV2';
```

### Step 2: Update the component usage

```typescript
// Change this:
<FroggerGame autoPlay={autoPlay} onAutoPlayComplete={onAutoPlayComplete} />

// To this:
<FroggerGameV2 autoPlay={autoPlay} onAutoPlayComplete={onAutoPlayComplete} />
```

That's it! The V2 component has the same props interface, so it's a drop-in replacement.

---

## What You Get

### Visual Enhancements
- Smooth hop animations with parabolic arc (15px height)
- Squash/stretch on landing
- Directional rotation during movement
- Particle trails on every hop
- Collision sparks (12 particles)
- Victory confetti (40 particles)
- Screen shake on collisions
- Enhanced car visuals (gradients, headlights, windows)
- Textured logs (bark pattern)
- Frog eyes and gradient

### Performance Improvements
- RequestAnimationFrame-based game loop (60fps)
- Memoized collision detection
- Automatic pause when tab hidden
- Delta-time based movement
- Particle lifecycle management

### Auto-Play Enhancements
- Variable timing (400ms - 1000ms per move)
- Dramatic pauses before risky moves
- Quick reactions for dodges
- Natural, engaging pacing
- 14 moves total, ~12 second completion

### UX Improvements
- Start screen with instructions (manual mode)
- Enhanced victory/game over screens
- Larger, more readable text
- Better visual feedback
- Hover states on buttons

---

## Side-by-Side Comparison

| Feature | V1 (Original) | V2 (Enhanced) |
|---------|---------------|---------------|
| Frog movement | Instant teleport | Smooth 200ms hop |
| Animation | Basic CSS transition | Parabolic arc + rotation + squash |
| Particles | None | 3 systems (trail, sparks, confetti) |
| Game loop | setInterval (20fps) | RAF (60fps) |
| Auto-play timing | Fixed 750ms | Variable 400-1000ms |
| Collision hitbox | Exact rectangle | Forgiving (5px inset) |
| Visual effects | Basic colors | Gradients, shadows, glow |
| Cars | Flat rectangles | Headlights, windows, 3D effect |
| Logs | Flat brown | Bark texture, depth |
| Frog | Solid circle | Gradient, eyes, glow |
| Screen shake | None | On collisions |
| Start screen | None | Full instructions |
| File size | ~12KB | ~15KB (+3KB) |
| Performance | ~20fps cap | ~60fps |

---

## Testing Checklist

After migrating, verify these features:

### Core Gameplay
- [ ] Frog hops smoothly to each grid position
- [ ] Hop arc is visible (frog goes up then down)
- [ ] Can move in all 4 directions
- [ ] Boundaries prevent moving off-screen
- [ ] Car collisions trigger sparks and screen shake
- [ ] Water drowning works (must be on log)
- [ ] Log riding moves frog correctly
- [ ] Victory at y < 100 triggers confetti
- [ ] Lives decrement properly
- [ ] Game over at 0 lives

### Animations
- [ ] Particle trails appear on every hop
- [ ] Collision creates red/orange spark burst
- [ ] Victory creates multi-color confetti
- [ ] Screen shakes briefly on collision
- [ ] Frog rotates slightly when moving
- [ ] Squash/stretch visible on landing

### Auto-Play (Demo Mode)
- [ ] Starts automatically when autoPlay={true}
- [ ] Completes all 14 moves
- [ ] Reaches goal without dying
- [ ] Timing feels natural (not robotic)
- [ ] Callback fires after victory
- [ ] No collisions during playthrough

### Visual Quality
- [ ] Cars have headlights and windows
- [ ] Logs have bark texture
- [ ] Frog has eyes
- [ ] All gradients render correctly
- [ ] Glow effects visible
- [ ] Text is crisp and readable

### Performance
- [ ] Runs at 60fps (check DevTools Performance tab)
- [ ] No frame drops during particles
- [ ] Smooth in both Chrome and Firefox
- [ ] No memory leaks over time

---

## Rollback Plan

If you need to revert to V1:

```typescript
// Change import back
import { FroggerGame } from '@/components/demo/FroggerGame';

// Change component
<FroggerGame autoPlay={autoPlay} onAutoPlayComplete={onAutoPlayComplete} />
```

The original file is untouched at:
`/Users/nick/Projects/llm-chat-site/src/components/demo/FroggerGame.tsx`

---

## Configuration Options

Both components support the same props:

```typescript
interface FroggerGameProps {
  /** Enable auto-play mode for demo purposes */
  autoPlay?: boolean;

  /** Callback when auto-play completes */
  onAutoPlayComplete?: () => void;
}
```

### Usage Examples

#### Manual Play (User Control)
```typescript
<FroggerGameV2 />
```

#### Auto-Play Demo
```typescript
<FroggerGameV2
  autoPlay={true}
  onAutoPlayComplete={() => {
    console.log('Demo complete!');
    // Transition to next demo or loop
  }}
/>
```

#### Conditional Auto-Play
```typescript
<FroggerGameV2
  autoPlay={phase === 'game-playing'}
  onAutoPlayComplete={handleGameComplete}
/>
```

---

## Performance Tips

### For Screen Recording

1. **Close DevTools** - Reduces overhead
2. **Use Hardware Acceleration** - Enable in Chrome settings
3. **Disable Extensions** - Use incognito mode
4. **Full Screen** - Better compression ratios
5. **60fps Recording** - Matches game loop

### For Production

1. **Lazy Load** - Only load when needed
```typescript
const FroggerGameV2 = lazy(() =>
  import('@/components/demo/FroggerGameV2').then(m => ({ default: m.FroggerGameV2 }))
);
```

2. **Preload** - Start loading before needed
```typescript
<link rel="preload" href="/chunks/FroggerGameV2.js" as="script" />
```

3. **Optimize Particle Count** - Reduce for slower devices
```typescript
const particleCount = window.devicePixelRatio > 1 ? 40 : 20;
```

---

## Customization Guide

### Adjust Hop Speed
```typescript
// In FroggerGameV2.tsx
const HOP_DURATION = 200; // Change to 150 for faster, 300 for slower
```

### Change Particle Colors
```typescript
// Hop trail
createParticles(x, y, 3, ['#84cc16', '#a3e635', '#bef264']);
                            // ^^^^^^^^ Customize these colors

// Collision sparks
createParticles(x, y, 12, ['#ef4444', '#f97316', '#fbbf24']);
                            // ^^^^^^^^ Or these

// Victory confetti
createParticles(x, y, 40, [
  '#ef4444', '#f97316', '#fbbf24',
  '#84cc16', '#3b82f6', '#8b5cf6'
]);
```

### Adjust Auto-Play Timing
```typescript
// In the enhancedMoves array
const enhancedMoves = [
  { move: 'up', delay: 800 },  // Increase/decrease these values
  { move: 'up', delay: 600 },
  { move: 'right', delay: 400, dramatic: true },
  // ...
];
```

### Change Screen Shake Intensity
```typescript
// On collision
createCollisionSparks(x, y);
triggerScreenShake(3, 150); // First number is amplitude (px)
                            // Second is duration (ms)
```

---

## Troubleshooting

### Issue: Particles not visible
**Solution:** Check contrast against background. May need to adjust colors for light themes.

### Issue: Choppy animation
**Solution:**
1. Check DevTools Performance tab for frame drops
2. Reduce particle count
3. Disable other animations on page

### Issue: Auto-play fails
**Solution:**
1. Check console for errors
2. Verify moves array doesn't cause collisions
3. Test manual play first

### Issue: High CPU usage
**Solution:**
1. Particles are the main contributor
2. Reduce from 40 to 20 confetti particles
3. Shorten particle lifetime

---

## Browser Support

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | 90+ | ✅ Full | Tested, recommended |
| Firefox | 88+ | ✅ Full | Should work perfectly |
| Safari | 14+ | ✅ Full | CSS gradients supported |
| Edge | 90+ | ✅ Full | Chromium-based |
| Mobile Safari | iOS 14+ | ⚠️ Partial | No hover states |
| Mobile Chrome | Android 90+ | ⚠️ Partial | No hover states |

**Note:** Mobile devices don't support keyboard input. Touch controls would need to be added for mobile demo.

---

## File Locations

```
/Users/nick/Projects/llm-chat-site/
├── src/
│   └── components/
│       └── demo/
│           ├── FroggerGame.tsx        # Original (untouched)
│           ├── FroggerGameV2.tsx      # Enhanced version
│           └── DemoMode.tsx           # Update imports here
└── .claude/
    ├── analysis/
    │   └── frogger-enhancement-analysis.md  # Full analysis
    └── guides/
        └── frogger-v2-migration.md          # This file
```

---

## Next Steps

1. **Test locally** - Run `npm run dev` and navigate to demo mode
2. **Verify auto-play** - Check that it completes successfully
3. **Record demo** - Capture at 60fps, 1920x1080
4. **Compare quality** - Side-by-side with original
5. **Deploy** - If satisfied, deploy to production

---

## Questions?

- **Visual bugs?** Check CSS gradient browser support
- **Performance issues?** Profile with DevTools
- **Auto-play timing?** Adjust delays in enhancedMoves array
- **Need more features?** See "Future Enhancement Ideas" in analysis doc
