# Test Coverage Quick Reference: Issues #271-281

## At a Glance

```
Coverage Breakdown:
├─ ADEQUATE (2)
│  ├─ #277 - Tavily search safeguards
│  └─ #281 - Image artifact sanitization
├─ MINIMAL (2)
│  ├─ #271 - Tour X button swap
│  └─ #275 - Reasoning preservation
└─ MISSING (4) ⚠️
   ├─ #273 - Signup 401 (Database schema)
   ├─ #276 - Message pill sizing
   ├─ #279 - Sidebar animations
   └─ #280 - Image/artifact mutual exclusivity
```

---

## Issue by Issue Summary

### #271 - Tour X Button Swap ⚠️ MINIMAL
**Test Files**:
- `/src/components/__tests__/Tour.test.tsx` (1,134 lines, 25+ tests)
- `/src/components/__tests__/OnboardingTour.test.tsx` (336 lines, 15+ tests)

**What's Tested**:
- Tour context, hook behavior ✅
- Keyboard navigation ✅
- State persistence ✅
- Step rendering ✅

**What's Missing**:
- X button positioning ❌
- X button click handler ❌
- Step counter positioning ❌
- Responsive button layout ❌

**Action**: Add positioning tests

---

### #273 - Signup 401 Fix ❌ MISSING
**Changed**: Database migration adding schema grants

**What's Tested**:
- Nothing directly ❌

**Why It Matters**:
- Infrastructure change affecting production signup
- Schema grants enable authenticated role access
- No migration tests = risk of future permission issues

**Action**: Add database schema tests + signup flow tests

---

### #275 - Reasoning Preservation ⚠️ MINIMAL
**Test Files**:
- `/src/hooks/__tests__/useChatMessages.test.tsx` (partial)

**What's Tested**:
- Reasoning steps saved to message ✅
- Null reasoning handled ✅

**What's Missing**:
- Reasoning available during streaming ❌
- onDelta timing correctness ❌
- Concurrent artifact + reasoning ❌
- Error recovery ❌

**Action**: Add streaming timing tests

---

### #276 - User Message Pill Sizing ❌ MISSING
**Changed**: `w-fit` + `max-w-[85%]` Tailwind classes

**What's Tested**:
- Nothing ❌

**Why Risky**:
- Mobile viewport edge case (narrow screens)
- Text wrapping behavior
- Content overflow on 375px screens

**Action**: Create comprehensive sizing tests

---

### #277 - Tavily Search Safeguards ✅ ADEQUATE
**Test Files**:
- `/supabase/functions/_shared/__tests__/tavily-client.test.ts` (457 lines, 20+ tests)
- `/supabase/functions/_shared/__tests__/config.test.ts` (Config validation)
- `/supabase/functions/chat/__tests__/intent-detector.test.ts` (Intent detection)

**What's Tested**:
- API client functionality ✅
- Cost calculation ✅
- Result formatting ✅
- Large result sets ✅
- Error handling ✅
- Intent detection ✅

**Minor Gap**:
- TAVILY_ALWAYS_SEARCH flag not explicitly tested (low risk - safeguard in place)

**Verdict**: GOOD

---

### #279 - Sidebar Animations ❌ MISSING
**Changed**: `transition-all` + `shrink-0` classes

**What's Tested**:
- Tour references sidebar ✅
- But no animation tests ❌

**What's Missing**:
- Icon size during collapse ❌
- Animation smoothness ❌
- Reduced motion preference ❌
- Multi-cycle animation ❌

**Action**: Create Sidebar animation test suite

---

### #280 - Image/Artifact Mutual Exclusivity ❌ MISSING (HIGH RISK)
**Changed**: 4 files (prompt-input-controls, Home, Index, ChatInterface)

**What's Tested**:
- Nothing ❌

**Critical Missing Tests**:
1. Clicking image button deactivates artifact ❌
2. Clicking artifact button deactivates image ❌
3. Only one mode active at any time ❌
4. Mode resets on new chat ❌
5. Mode resets on session change ❌

**Why This Is Critical**:
- State management in core chat UI
- Behavioral requirement, not cosmetic
- Bug would cause confusing UX
- Potential to send wrong request type to AI

**Action**: HIGH PRIORITY - Create comprehensive state tests

---

### #281 - Image Artifact Sanitization ✅ ADEQUATE
**Test File**: `/src/hooks/__tests__/imageSanitization.test.ts` (150 lines, 9 cases)

**What's Tested**:
- Base64 replacement ✅
- URL preservation ✅
- Multiple artifacts ✅
- MIME type handling ✅
- Attribute ordering ✅
- Size reduction (200KB → 200 bytes) ✅
- Malformed input ✅
- Mixed content ✅

**Verdict**: EXCELLENT

---

## Test File Locations Reference

### Frontend Tests (Vitest)
```
src/
├─ __tests__/
│  └─ Tour tests, accessibility
├─ components/
│  └─ __tests__/
│     ├─ Tour.test.tsx ✅
│     ├─ OnboardingTour.test.tsx ✅
│     ├─ ReasoningDisplay.test.tsx ⚠️
│     ├─ MessageWithArtifacts.test.tsx
│     └─ [MISSING: ChatInterface, Sidebar, PromptInputControls]
├─ hooks/
│  └─ __tests__/
│     ├─ useChatMessages.test.tsx ⚠️
│     ├─ imageSanitization.test.ts ✅
│     └─ [MISSING: UI state tests]
└─ utils/
   └─ __tests__/
      └─ [Various utility tests]
```

### Backend Tests (Deno)
```
supabase/functions/
├─ _shared/
│  └─ __tests__/
│     ├─ tavily-client.test.ts ✅
│     ├─ config.test.ts ⚠️
│     └─ [Various API tests]
├─ chat/
│  └─ __tests__/
│     └─ intent-detector.test.ts ✅
└─ [MISSING: Schema migration tests]
```

---

## Effort Estimation for Test Addition

| Issue | New Tests | Effort | Priority |
|-------|-----------|--------|----------|
| #280 | Mutual exclusivity suite | 4-6 hrs | P0 |
| #273 | Schema + signup tests | 3-4 hrs | P0 |
| #275 | Reasoning timing tests | 2-3 hrs | P1 |
| #271 | Positioning tests | 1-2 hrs | P1 |
| #279 | Sidebar animation tests | 1-2 hrs | P2 |
| #276 | Pill sizing tests | 1-2 hrs | P2 |
| **TOTAL** | **~15-20 tests** | **12-19 hrs** | |

---

## Coverage Quality Matrix

```
                  | Lines | Cases | Integration | Edge Cases | Coverage %
#271 (Tour)       | 1,470 | 40+   | Good        | Partial    | 60%
#273 (Signup)     | N/A   | 0     | None        | None       | 0%
#275 (Reasoning)  | 100+  | 3     | Basic       | Minimal    | 35%
#276 (Pill)       | N/A   | 0     | None        | None       | 0%
#277 (Tavily)     | 457   | 20+   | Excellent   | Excellent  | 95%
#279 (Sidebar)    | N/A   | 0     | None        | None       | 0%
#280 (Mutex)      | N/A   | 0     | None        | None       | 0%
#281 (Sanitize)   | 150   | 9     | Excellent   | Excellent  | 98%
```

---

## Red Flags & Risk Factors

### HIGH RISK
- **#280**: State management critical feature with ZERO tests
  - Could cause wrong mode sent to AI
  - UX confusion with both buttons active

- **#273**: Database migration with ZERO tests
  - Production signup failures
  - Hard to debug permission issues

### MEDIUM RISK
- **#275**: Streaming timing behavior under-tested
  - Reasoning disappearing could recur
  - Concurrent artifact + reasoning edge case

- **#271**: Visual layout swap not validated
  - Button positioning regression risk
  - Accessibility implications (tab order)

### LOW RISK
- **#276, #277, #279, #281**: Either good coverage or cosmetic changes
  - #281 has excellent test coverage
  - #277 has strong API tests

---

## Next Steps

### Immediate (This Week)
1. [ ] Add comprehensive tests for #280
2. [ ] Add database tests for #273
3. [ ] Update this analysis with PR links

### Short Term (Next Sprint)
4. [ ] Complete remaining test suites (#275, #271, #279, #276)
5. [ ] Integrate into CI/CD (fail builds if coverage drops)
6. [ ] Add visual regression tests for UI changes

### Ongoing
7. [ ] Establish coverage thresholds (60% minimum per file)
8. [ ] Require tests in PR template
9. [ ] Monthly coverage audits

---

## Related Documentation

- Full analysis: `/docs/TEST_COVERAGE_ANALYSIS.md`
- Issue tracker: `/docs/ISSUE_TRACKER_271-281.md`
- Testing guide: See project CLAUDE.md (Testing section)
