# Phase 1.3 Step 2: Quick Reference Card

**One-Page Testing Guide for Server-Side HTML Transformations**

---

## Overview

**Goal:** Verify 7 server-side HTML transformations + performance improvement before removing client code

**Time:** 45-60 minutes

**Tools:** Chrome DevTools (Console, Elements, Performance, Network tabs)

**Environment:** Production `https://chat.geminixai.app/`

---

## Test Prompts (Copy-Paste Ready)

### 1. PropTypes (Recharts)
```
Create a Recharts bar chart showing monthly sales data for 6 months.
Include axis labels, tooltips, and a legend. Use vibrant colors.
```
**Check:** `window.PropTypes` defined, chart renders, no errors

---

### 2. Framer Motion
```
Create an animated card component using framer-motion. The card should
scale up on hover, rotate slightly on click, and have smooth transitions.
Add a colorful gradient background.
```
**Check:** `window.motion` defined, animations smooth, no errors

---

### 3. Lucide Icons
```
Create a user profile card with lucide-react icons: User icon for avatar,
Mail icon for email, Phone icon for contact, MapPin for location.
Style it nicely with borders and spacing.
```
**Check:** `window.LucideIcons` defined, icons render as SVGs, no errors

---

### 4. Canvas Confetti
```
Create a celebration button that triggers colorful confetti when clicked.
Use canvas-confetti library. Make the button large and inviting with
a "Celebrate!" label.
```
**Check:** `window.confetti` defined, animation triggers, colorful particles

---

### 5. Import Syntax
```
Create a complex dashboard with multiple components importing from
different packages. Use react hooks, lucide-react icons, and recharts
for data visualization. Make it interactive with tabs.
```
**Check:** No "Unexpected token" errors, imports use `import * as` syntax

---

### 6. Dual React Instance
```
Create an interactive form using @radix-ui/react-dialog with a dialog
that contains input fields for name, email, and message. Add validation
and a submit button. Style it with Tailwind CSS.
```
**Check:** No "Invalid hook call" errors, esm.sh uses `?external=`, CSP includes `data:`

---

### 7. Template Literals
```
Create a greeting card component that uses template literals for
personalized messages. Include variables for name, age, and favorite color.
Display the message in a styled card with the interpolated values.
```
**Check:** No syntax errors, template interpolation works, backticks unescaped

---

## Quick Verification Checklist

For each test, verify:

1. **Console (F12)** - No errors in red
2. **Elements Tab** - Find iframe, inspect HTML source
3. **Global Check** - Switch console to iframe context, check `window.X`
4. **Functionality** - Component works as expected

---

## HTML Verification Patterns

### What to Search For (Ctrl+F in Elements tab)

| Test | Search Term | Expected Result |
|------|-------------|-----------------|
| PropTypes | `prop-types` | Script tag with unpkg.com URL |
| Framer Motion | `framer-motion` | Script tag with esm.sh URL |
| Lucide Icons | `lucide-react` | 2 script tags (UMD + aliasing) |
| Canvas Confetti | `canvas-confetti` | Script tag with esm.sh URL |
| Import Syntax | `import * as` | Valid syntax (NOT `const * as`) |
| Dual React | `?external=` | esm.sh URLs have query param |
| Template Literals | Search in `<script type="module">` | Unescaped backticks `` ` `` |

---

## Console Commands (Quick Copy)

```javascript
// Switch to iframe context first (use dropdown in console)

// Category 1: PropTypes
window.PropTypes

// Category 2: Framer Motion
window.motion

// Category 3: Lucide Icons
window.LucideIcons
window.User
window.Mail

// Category 4: Canvas Confetti
window.confetti
typeof confetti  // Should return "function"

// Manual confetti trigger (optional)
confetti()
```

---

## Performance Testing (5 minutes)

1. Open DevTools → Performance tab
2. Set CPU throttling to 4x slowdown
3. Enable Screenshots checkbox
4. Start recording (red circle)
5. Generate any artifact
6. Stop recording when rendered
7. Look for absence of:
   - `applyBundleTransformations` calls
   - Heavy regex operations
   - HTML manipulation in iframe
8. Expected: No client-side transformation overhead

---

## Pass Criteria Summary

| Category | Key Indicator | PASS if... |
|----------|---------------|------------|
| 1. PropTypes | Console + Global | No errors, `window.PropTypes` defined |
| 2. Framer Motion | Animation + Global | Smooth animations, `window.motion` defined |
| 3. Lucide Icons | Visual + Global | Icons render, `window.LucideIcons` defined |
| 4. Canvas Confetti | Animation + Global | Particles fall, `window.confetti` defined |
| 5. Import Syntax | Console + HTML | No syntax errors, valid imports in HTML |
| 6. Dual React | Console + HTML | No hook errors, `?external=` in URLs |
| 7. Template Literals | Console + HTML | No syntax errors, backticks unescaped |
| 8. Performance | DevTools Profile | No client-side processing visible |

---

## Go/No-Go Decision

**GO** (Proceed to Step 3) if:
- ✅ All 8 categories PASS
- ✅ Zero critical issues
- ✅ No console errors
- ✅ Performance improved or neutral

**NO-GO** (Do not proceed) if:
- ❌ Any category FAILS
- ❌ Critical issues found
- ❌ Console errors present
- ❌ Performance regressed

---

## Rollback (If Needed)

```bash
# Quick rollback if critical issues found
git log --oneline -10 | grep "Phase 1.3 Step 1"
git revert [COMMIT_HASH]
git push origin main
./scripts/deploy-simple.sh prod
```

**Rollback time:** 3-5 minutes

---

## Common Issues & Solutions

| Issue | Category | Solution |
|-------|----------|----------|
| "PropTypes is not defined" | 1 | Check script tag injection order |
| "motion is not defined" | 2 | Verify Framer Motion script loaded |
| Icons show broken | 3 | Check Lucide aliasing script present |
| "confetti is not defined" | 4 | Verify canvas-confetti script tag |
| "Unexpected token" | 5 or 7 | Check import syntax or template literals |
| "Invalid hook call" | 6 | Verify `?external=` and import map |
| Blank screen, no errors | Network | Check Network tab for failed loads |

---

## Documentation References

**Full Guides:**
- `docs/PHASE_1_3_TEST_EXECUTION_CHECKLIST.md` - Detailed step-by-step instructions
- `.phase1.3-progress.md` - Progress tracking and completion report
- `docs/PHASE_1_3_TESTING_GUIDE.md` - Original testing guide

**Implementation:**
- `supabase/functions/bundle-artifact/index.ts` - Server-side transformation functions (lines 290-444)

---

## Contact/Support

**Questions during testing?**
- Check detailed guide: `docs/PHASE_1_3_TEST_EXECUTION_CHECKLIST.md`
- Review troubleshooting: `.claude/TROUBLESHOOTING.md`
- Check git history: `git log --oneline -20`

---

**Last Updated:** 2026-01-16
**Version:** 1.0
**Status:** Ready for Testing
