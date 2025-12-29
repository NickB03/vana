# Tour Component Mobile Optimization Plan

## Executive Summary

The tour component (`src/components/tour/tour.tsx`) has critical mobile compatibility issues that cause overflow and poor usability on mobile devices. This plan addresses touch target accessibility, responsive layout, and mobile-first positioning.

---

## Current Issues Analysis

### 1. Tooltip Width Overflow (CRITICAL)

**Problem**: Hardcoded `CONTENT_WIDTH = 420px` overflows on ALL mobile viewports.

| Device | Viewport | Max Safe Width | Overflow |
|--------|----------|----------------|----------|
| Android Small | 360px | 328px | **92px** |
| iPhone SE | 375px | 343px | **77px** |
| iPhone 12 | 390px | 358px | **62px** |
| iPhone 14 Pro | 393px | 361px | **59px** |

**Location**: `src/components/tour/tour.tsx:59`
```typescript
const CONTENT_WIDTH = 420; // PROBLEM: Fixed width
```

### 2. Touch Targets Below Minimum (CRITICAL)

| Element | Current | Required | Gap |
|---------|---------|----------|-----|
| Close button | 40×40px | 44×44px | -4px |
| Next button | 55×36px | 55×44px | -8px height |
| Previous button | ~55×36px | 55×44px | -8px height |

**Locations**:
- Close button: `tour.tsx:500-506` - `p-2.5` (40px)
- Nav buttons: `tour.tsx:532-556` - `size="sm"` (36px height)

### 3. TourAlertDialog Not Responsive

**Problem**: `max-w-md` (448px) can overflow on small mobile screens.

**Location**: `tour.tsx:630`
```typescript
<AlertDialogContent className="max-w-md p-6">
```

### 4. Position Calculation Edge Cases

**Problem**: `calculateContentPosition()` doesn't handle mobile-specific scenarios:
- Sidebar step with `position: "right"` would place tooltip off-screen on mobile
- No fallback positioning when preferred position overflows

---

## Proposed Changes

### Priority 1: Responsive Tooltip Width

**File**: `src/components/tour/tour.tsx`

**Changes**:
```typescript
// Before
const CONTENT_WIDTH = 420;

// After - responsive width
const useResponsiveContentWidth = () => {
  const [width, setWidth] = useState(420);

  useEffect(() => {
    const updateWidth = () => {
      const viewportWidth = window.innerWidth;
      const maxWidth = Math.min(420, viewportWidth - 32); // 16px padding each side
      setWidth(maxWidth);
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return width;
};
```

**Alternative** (simpler CSS approach):
```typescript
// In the tooltip motion.div style:
style={{
  position: "fixed",
  width: "min(420px, calc(100vw - 32px))", // Responsive width
  maxWidth: "calc(100vw - 32px)",
}}
```

### Priority 2: Touch Target Accessibility

**File**: `src/components/tour/tour.tsx`

**Close button** (line ~500):
```typescript
// Before
<button
  onClick={endTour}
  className="absolute top-1 right-1 z-10 p-2.5 rounded-md..."
>
  <X className="h-5 w-5" />
</button>

// After - 44px touch target
<button
  onClick={endTour}
  className="absolute top-1 right-1 z-10 size-11 flex items-center justify-center rounded-md..."
>
  <X className="h-5 w-5" />
</button>
```

**Navigation buttons** (lines ~532-556):
```typescript
// Before
<Button variant="ghost" size="sm">Previous</Button>
<Button size="sm">Next</Button>

// After - 44px minimum height
<Button variant="ghost" className="h-11 px-4">Previous</Button>
<Button className="h-11 px-4">Next</Button>
```

### Priority 3: TourAlertDialog Mobile Responsiveness

**File**: `src/components/tour/tour.tsx`

```typescript
// Before
<AlertDialogContent className="max-w-md p-6">

// After - responsive with mobile padding
<AlertDialogContent className="max-w-md w-[calc(100vw-32px)] sm:w-full p-4 sm:p-6">
```

Also update buttons in dialog:
```typescript
// Before
<Button onClick={startTour} className="w-full">Start Tour</Button>
<Button onClick={handleSkip} variant="ghost" className="w-full">Skip Tour</Button>

// After - 44px touch targets
<Button onClick={startTour} className="w-full h-11">Start Tour</Button>
<Button onClick={handleSkip} variant="ghost" className="w-full h-11">Skip Tour</Button>
```

### Priority 4: Mobile-Aware Position Calculation

**File**: `src/components/tour/tour.tsx`

Update `calculateContentPosition()` to handle mobile:

```typescript
function calculateContentPosition(
  elementPos: { top: number; left: number; width: number; height: number },
  position: "top" | "bottom" | "left" | "right" = "bottom",
  contentWidth: number // Pass responsive width
) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isMobile = viewportWidth < 768;

  let left = elementPos.left;
  let top = elementPos.top;

  // On mobile, prefer top/bottom positioning to avoid horizontal overflow
  const effectivePosition = isMobile && (position === "left" || position === "right")
    ? "bottom"
    : position;

  switch (effectivePosition) {
    case "top":
      top = elementPos.top - CONTENT_HEIGHT - PADDING;
      left = elementPos.left + elementPos.width / 2 - contentWidth / 2;
      break;
    case "bottom":
      top = elementPos.top + elementPos.height + PADDING;
      left = elementPos.left + elementPos.width / 2 - contentWidth / 2;
      break;
    case "left":
      left = elementPos.left - contentWidth - PADDING;
      top = elementPos.top + elementPos.height / 2 - CONTENT_HEIGHT / 2;
      break;
    case "right":
      left = elementPos.left + elementPos.width + PADDING;
      top = elementPos.top + elementPos.height / 2 - CONTENT_HEIGHT / 2;
      break;
  }

  // Ensure tooltip stays within viewport bounds
  return {
    top: Math.max(PADDING, Math.min(top, viewportHeight - CONTENT_HEIGHT - PADDING)),
    left: Math.max(PADDING, Math.min(left, viewportWidth - contentWidth - PADDING)),
    width: contentWidth,
    height: CONTENT_HEIGHT
  };
}
```

---

## Implementation Checklist

### Phase 1: Touch Targets (TDD)
- [ ] Write tests for close button size (44×44px)
- [ ] Write tests for navigation button heights (44px)
- [ ] Update close button: `p-2.5` → `size-11 flex items-center justify-center`
- [ ] Update Previous button: `size="sm"` → `className="h-11 px-4"`
- [ ] Update Next button: `size="sm"` → `className="h-11 px-4"`
- [ ] Update dialog Start/Skip buttons: add `h-11`
- [ ] Peer review changes

### Phase 2: Responsive Width (TDD)
- [ ] Write tests for tooltip max-width on mobile viewports
- [ ] Create `useResponsiveContentWidth` hook OR use CSS approach
- [ ] Update tooltip width styling
- [ ] Update TourAlertDialog responsive width
- [ ] Verify no horizontal overflow on 360px viewport
- [ ] Peer review changes

### Phase 3: Mobile Position Logic
- [ ] Write tests for position fallback on mobile
- [ ] Update `calculateContentPosition` with mobile awareness
- [ ] Test sidebar tour step on mobile (should not overflow right)
- [ ] Peer review changes

### Phase 4: Chrome DevTools Verification
- [ ] Test on 375px viewport (iPhone SE)
- [ ] Test on 360px viewport (Android small)
- [ ] Verify all touch targets are 44px
- [ ] Verify tooltip doesn't overflow
- [ ] Take screenshots for documentation

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/tour/tour.tsx` | Main tour component - all priorities |
| `src/components/__tests__/tour-mobile.test.tsx` | NEW - Mobile-specific tests |

---

## Success Criteria

1. **Tooltip width**: Never exceeds `calc(100vw - 32px)` on any viewport
2. **Touch targets**: All interactive elements ≥44×44px
3. **No overflow**: Zero horizontal scroll on 360px viewport
4. **Position logic**: Sidebar step works on mobile without overflow
5. **Tests**: All new tests pass
6. **Peer review**: Approved with no drift

---

## Inspiration Reference

- **ChatGPT mobile**: Tour tooltips are full-width with bottom sheet style
- **Claude mobile**: Onboarding uses card-based tooltips that respect viewport
- **Gemini mobile**: Uses modal dialogs for onboarding instead of spotlight tour

---

## Estimated Effort

| Phase | Estimated Time |
|-------|---------------|
| Phase 1: Touch Targets | 1 hour |
| Phase 2: Responsive Width | 1.5 hours |
| Phase 3: Mobile Position | 1 hour |
| Phase 4: Verification | 30 minutes |
| **Total** | **4 hours** |

---

## Notes

- All changes should maintain backward compatibility with desktop
- Use `useIsMobile()` hook from `@/hooks/use-mobile` for breakpoint detection
- Consider adding swipe gestures for next/previous on mobile (future enhancement)
