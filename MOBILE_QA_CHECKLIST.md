# Mobile UI Phase 1 - QA Checklist

## Pre-Deployment Verification

### Task 1: Chat Input Keyboard Handling
- [ ] Open app on 375px viewport
- [ ] Click into chat input
- [ ] Verify input stays visible (sticky at bottom)
- [ ] Verify backdrop blur visible above input
- [ ] Type multi-line message (verify expands to 120px)
- [ ] Verify safe-area padding on iOS notched devices
- [ ] Test on desktop (1280px) - verify no changes

### Task 2: Message Actions Touch Support
- [ ] Send a message on mobile viewport (375px)
- [ ] Tap user message bubble
- [ ] Verify actions appear (Edit, Delete, Copy)
- [ ] Wait 3 seconds, verify actions disappear
- [ ] Verify last assistant message actions always visible
- [ ] Tap older assistant message, verify actions don't appear
- [ ] Test on desktop - verify hover still works

### Task 3: Carousel Navigation
- [ ] Navigate to homepage on mobile (375px)
- [ ] Verify carousel buttons are visible and larger
- [ ] Tap Previous button - verify scroll works
- [ ] Tap Next button - verify scroll works
- [ ] Try swiping carousel items - verify gesture works
- [ ] Test on desktop (1280px) - verify buttons still work

### Task 4: Sidebar Mobile Drawer
- [ ] Open sidebar on mobile (375px)
- [ ] Verify sidebar takes 85% viewport width
- [ ] Verify black backdrop visible behind sidebar
- [ ] Tap backdrop - verify sidebar closes
- [ ] Tap session item - verify 44px touch target
- [ ] Test on desktop (1280px) - verify normal sidebar behavior

### Task 5: Artifact Mobile Fullscreen
- [ ] Generate artifact on mobile (375px)
- [ ] Click "Open" button on artifact card
- [ ] Verify smooth slide-up animation (200ms)
- [ ] Verify mobile header with title visible
- [ ] Tap back button (ChevronLeft) - verify closes
- [ ] Test on desktop (1280px) - verify side-by-side still works

## Browser Compatibility
- [ ] iOS Safari (latest)
- [ ] iOS Safari (iOS 15)
- [ ] Chrome Mobile (Android)
- [ ] Samsung Internet
- [ ] Desktop Chrome (regression check)
- [ ] Desktop Firefox (regression check)
- [ ] Desktop Safari (regression check)

## Accessibility Checks
- [ ] All touch targets ≥ 44px
- [ ] Screen reader announces changes correctly
- [ ] Keyboard navigation still works on desktop
- [ ] Color contrast ratios maintained
- [ ] ARIA labels present on icon-only buttons

## Performance Checks
- [ ] No console errors on mobile
- [ ] Animations run at 60fps
- [ ] No layout shift during keyboard open
- [ ] Touch interactions feel responsive (<100ms)
- [ ] Bundle size unchanged (check build output)

## Edge Cases
- [ ] Rotate device (portrait → landscape)
- [ ] Small screen (320px - iPhone SE 1st gen)
- [ ] Large phone (430px - iPhone 14 Pro Max)
- [ ] Tablet (768px - iPad)
- [ ] Long messages (verify actions still accessible)
- [ ] Multiple artifacts (verify all work)

## Sign-Off
- [ ] All critical paths tested
- [ ] No regressions on desktop
- [ ] Mobile UX significantly improved
- [ ] Ready for production deployment

---

**Tester**: _______________
**Date**: _______________
**Build Version**: _______________
**Notes**: _______________
