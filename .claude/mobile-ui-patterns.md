# Mobile UI Patterns Reference

**Status**: Production-ready patterns for responsive mobile UX
**Last Updated**: 2025-11-16

---

## Pattern 1: Sticky Input with Keyboard Safety

### Use Case
Ensure input fields remain visible when mobile keyboard appears.

### Implementation
```tsx
// CSS (index.css)
@supports (height: 100dvh) {
  .safe-mobile-input {
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
    position: sticky;
    bottom: 0;
  }
}

// Component
<div
  className="shrink-0 bg-background/95 backdrop-blur-sm border-t border-border/30 safe-mobile-input px-4 pb-4"
  style={{
    position: 'sticky',
    bottom: 0,
    zIndex: 30,
    paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
  }}
>
  <input autoFocus={!isMobile} />
</div>
```

### Key Features
- Sticky positioning keeps input at bottom
- Safe-area support for iOS notch/home indicator
- Backdrop blur separates from content
- Disable autoFocus on mobile to prevent unwanted keyboard
- Progressive enhancement with `@supports`

---

## Pattern 2: Tap-to-Reveal Actions (Mobile)

### Use Case
Show actions on touch devices where hover doesn't exist.

### Implementation
```tsx
const [tappedMessageId, setTappedMessageId] = useState<string | null>(null);

<div
  onClick={() => {
    if (isMobile) {
      setTappedMessageId(message.id);
      setTimeout(() => setTappedMessageId(null), 3000);
    }
  }}
>
  <MessageActions
    className={cn(
      "flex transition-opacity duration-150",
      isMobile ? (
        isLastMessage ? "opacity-100" : cn(
          "opacity-0",
          tappedMessageId === message.id && "opacity-100"
        )
      ) : (
        "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
      )
    )}
  >
    <Button className={cn("rounded-full", isMobile && "h-9 w-9")}>
      <Copy />
    </Button>
  </MessageActions>
</div>
```

### Key Features
- Last message actions always visible (quick access)
- Tap older messages to reveal actions
- Auto-hide after 3 seconds
- Larger touch targets on mobile (44px minimum)
- Desktop hover behavior preserved

---

## Pattern 3: Touch-Friendly Navigation Buttons

### Use Case
Carousel/slider navigation that works well on small touch screens.

### Implementation
```tsx
<div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between pointer-events-none z-10 px-1 sm:px-4">
  <Button
    variant="outline"
    size="icon"
    onClick={handlePrev}
    className="h-12 w-12 sm:h-14 sm:w-14 rounded-full pointer-events-auto bg-background/30 backdrop-blur-sm hover:bg-background/50 border-white/30 opacity-70 hover:opacity-100 transition-opacity touch-none"
    aria-label="Previous suggestions"
  >
    <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" />
  </Button>
</div>

<Carousel
  opts={{
    loop: true,
    align: "start",
    dragFree: true,
    containScroll: "trimSnaps",
  }}
  className="touch-pan-x"
>
  <CarouselContent className="select-none">
    {/* items */}
  </CarouselContent>
</Carousel>
```

### Key Features
- 48px touch targets on mobile (exceeds 44px minimum)
- Slightly inset (px-1) for easier reach
- Swipe gestures enabled with `dragFree`
- `touch-pan-x` for horizontal scroll
- `select-none` prevents text selection during swipe
- Desktop gets larger targets (56px) for precision

---

## Pattern 4: Mobile Drawer with Backdrop

### Use Case
Side navigation that becomes full-screen overlay on mobile.

### Implementation
```tsx
const isMobile = useIsMobile();
const { open, setOpen } = useSidebar();

return <>
  <Sidebar
    collapsible="icon"
    className={cn(
      "md:w-64 md:max-w-64",
      isMobile && "w-[85vw] max-w-[320px]"
    )}
  >
    <SidebarMenuButton
      className={cn(
        "...",
        "min-h-[44px] py-2" // Ensure minimum touch target
      )}
    />
  </Sidebar>

  {/* Mobile backdrop */}
  {isMobile && open && (
    <div
      className="fixed inset-0 bg-black/50 z-40 md:hidden"
      onClick={() => setOpen(false)}
      aria-hidden="true"
    />
  )}
</>;
```

### Key Features
- 85% viewport width on mobile (max 320px)
- Black backdrop indicates overlay state
- Tap backdrop to close (intuitive)
- 44px minimum touch targets
- Desktop unchanged (256px width)

---

## Pattern 5: Slide-Up Modal with Header

### Use Case
Full-screen modal on mobile with native-feeling navigation.

### Implementation
```tsx
import { motion } from "motion/react";

{isMobile && isOpen ? (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    transition={{ duration: 0.2 }}
    className="fixed inset-0 z-50 bg-background flex flex-col"
  >
    {/* Mobile header */}
    <div
      className="flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-background/95 backdrop-blur-sm shrink-0"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClose}
        className="h-10 w-10 rounded-full"
        aria-label="Close"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>
      <h2 className="text-base font-semibold truncate flex-1">
        {title}
      </h2>
    </div>

    <div className="flex-1 min-h-0 overflow-hidden">
      {/* Content */}
    </div>
  </motion.div>
) : (
  // Desktop view
)}
```

### Key Features
- Smooth 200ms slide-up animation
- Native-style header with back button
- Safe-area compliant (iOS notch)
- ChevronLeft for familiar iOS pattern
- Desktop unchanged (side panel/modal)

---

## Shared Utilities

### useIsMobile Hook
```tsx
import { useIsMobile } from "@/hooks/use-mobile";

const isMobile = useIsMobile(); // true if width < 768px
```

### Conditional Classes
```tsx
import { cn } from "@/lib/utils";

className={cn(
  "base-classes",
  isMobile && "mobile-only-classes",
  !isMobile && "desktop-only-classes"
)}

// Or with Tailwind responsive prefixes
className="mobile-base sm:desktop-override"
```

### Safe Area CSS Variables
```css
/* Available globally */
env(safe-area-inset-top)
env(safe-area-inset-right)
env(safe-area-inset-bottom)
env(safe-area-inset-left)

/* Usage with fallback */
padding-top: max(0.75rem, env(safe-area-inset-top));
```

---

## Best Practices

### Touch Targets
- Minimum 44px × 44px (WCAG 2.5.5 Level AAA)
- 48px recommended for primary actions
- Add visual/haptic feedback on tap

### Keyboard Handling
- Disable `autoFocus` on mobile inputs
- Use sticky positioning for input areas
- Account for safe-area (iOS notch/home indicator)
- Consider `viewport-fit=cover` in meta tag

### Animations
- Keep under 300ms for perceived performance
- Use GPU-accelerated properties (transform, opacity)
- Respect `prefers-reduced-motion`
- Test on mid-range devices (not just flagships)

### Gestures
- Support swipe where it makes sense
- Use `touch-pan-x` or `touch-pan-y` to prevent scroll conflicts
- Add `select-none` during gesture interactions
- Provide button fallbacks for accessibility

### Responsive Strategy
- Mobile-first CSS (base styles for mobile)
- Use `sm:`, `md:`, `lg:` for desktop enhancements
- Prefer Tailwind responsive classes over `useIsMobile` when possible
- Test on real devices, not just DevTools

---

## Testing Checklist

- [ ] Test on iPhone SE (375px - smallest modern device)
- [ ] Test on iPad (768px - breakpoint boundary)
- [ ] Test landscape orientation
- [ ] Verify desktop unchanged (1280px+)
- [ ] Check touch target sizes (≥ 44px)
- [ ] Test with keyboard open (iOS Safari)
- [ ] Verify safe-area handling on notched devices
- [ ] Test swipe gestures on real touch devices
- [ ] Check animation performance (60fps)
- [ ] Verify backdrop tap-to-close works

---

## Common Pitfalls

1. **Forgetting safe-area**: Always use `env(safe-area-inset-*)` for iOS
2. **Touch conflicts**: Use `touch-none` on decorative elements
3. **Desktop regression**: Always test at 1280px after mobile changes
4. **AutoFocus keyboard**: Disable on mobile to prevent unwanted popups
5. **Fixed positioning**: Use `sticky` instead for better keyboard handling
6. **Hover assumptions**: Always provide tap alternative on mobile
7. **Small touch targets**: Verify ≥ 44px with browser DevTools
8. **Animation jank**: Profile on real devices, not just simulators

---

**Related Documentation:**
- `/PHASE1_MOBILE_UI_FIXES_SUMMARY.md` - Implementation details
- `/MOBILE_QA_CHECKLIST.md` - Testing checklist
- `/.claude/artifacts.md` - Artifact system patterns
- `/src/hooks/use-mobile.tsx` - Mobile detection hook
