# Quick Action Checklist
**For**: System Prompt Improvements  
**Branch**: `feature/remove-library-approval-merge`  
**Full Plan**: See `SYSTEM_PROMPT_IMPROVEMENT_PLAN.md`

---

## Phase 1: CRITICAL (Must Complete Before Merge)

### File: `supabase/functions/chat/index.ts`

- [ ] **Lines 447-535**: Delete entire shadcn/ui section (88 lines)
  - Remove "RECOMMENDED" promotion
  - Remove best practices
  - Remove code examples
  - Remove "USE shadcn/ui as primary choice"

- [ ] **Lines 447-535**: Add Radix UI + Tailwind guidance (replacement)
  - Import syntax for 7 Radix primitives
  - Critical restriction warning (local imports NOT available)
  - Tailwind styling guidance

- [ ] **After Radix guidance**: Add 3 code examples
  - Dialog with Radix UI + Tailwind
  - Tabs with Radix UI + Tailwind
  - Form with Tailwind only

- [ ] **Line 549**: Update quality checklist
  - Change: "shadcn/ui or Tailwind" → "Radix UI primitives + Tailwind CSS"

- [ ] **Lines 580-581**: Update common pitfalls
  - Remove: "Not using shadcn/ui"
  - Add: "Attempting to import @/components/ui/*"
  - Add: "Using local imports - not available"
  - Add: "Not using Radix UI primitives"

### Verification Commands

```bash
# No shadcn references
git grep -i "shadcn" supabase/functions/chat/index.ts
# Expected: No matches

# No @/components/ui references
git grep "@/components/ui" supabase/functions/chat/index.ts
# Expected: No matches

# Radix UI is mentioned
git grep -i "radix" supabase/functions/chat/index.ts
# Expected: Multiple matches

# Critical restriction present
git grep "Local imports.*NOT available" supabase/functions/chat/index.ts
# Expected: Match found
```

---

## Phase 2: HIGH (Significant Quality Improvements)

### File: `supabase/functions/chat/index.ts`

- [ ] **Line ~427**: Add design principles section
  - Complex apps vs landing pages guidance
  - "Wow factor" considerations
  - Modern design trends

- [ ] **Line ~557**: Add update vs rewrite guidelines
  - When to use update (<20 lines, <5 locations)
  - When to use rewrite (structural changes)
  - Max 4 updates per message

- [ ] **Line ~400**: Add artifact usage criteria
  - When MUST create artifacts
  - General principle (copy/paste test)
  - One artifact per response rule

- [ ] **Line ~560**: Add concise variable naming
  - Use i, j, k for indices
  - Use e for events, el for elements
  - Balance brevity with readability

- [ ] **Line ~413**: Strengthen CDN restriction
  - List allowed CDNs explicitly
  - Explain security requirement
  - No arbitrary external scripts

- [ ] **Line ~398**: Add localStorage warning header
  - NEVER use browser storage APIs
  - Use React state or JS variables instead
  - Explain exception handling

---

## Phase 3: MEDIUM (Nice-to-Have Enhancements)

### File: `supabase/functions/chat/index.ts`

- [ ] **After examples**: Add file reading API docs
  - window.fs.readFile usage
  - Encoding parameter
  - Error handling example

- [ ] **After file reading**: Add CSV handling best practices
  - Papaparse usage
  - Header processing (strip whitespace)
  - Lodash for computations

- [ ] **Line ~444**: Enhance Three.js warnings
  - List unavailable features (CapsuleGeometry, RoundedBoxGeometry)
  - Version constraint explanation
  - Alternative geometries

- [ ] **Lines 587-599**: Expand common libraries section
  - Add 20+ more CDN libraries
  - Categorize by purpose
  - Include CSS links where needed

---

## Phase 4: LOW (Optional Polish)

### File: `src/utils/artifactValidator.ts`

- [ ] **Lines 249-263**: Remove shadcn validation block

- [ ] **Add**: Local import error detection
  - Check for @/components/*, @/lib/*, @/utils/*
  - Add error message
  - Suggest Radix UI alternative

### File: `src/constants/artifactTemplates.ts`

- [ ] **Review**: Check for shadcn examples
  ```bash
  git grep -i "shadcn\|@/components/ui" src/constants/artifactTemplates.ts
  ```
- [ ] **Update**: Replace with Radix UI + Tailwind if found

### File: `supabase/functions/chat/index.ts`

- [ ] **Top of section**: Add version tracking comment
  - Version: 2.0.0
  - Date: 2025-11-04
  - Changes summary

---

## Testing Checklist

### Manual Testing

- [ ] **Test 1**: "Create a form with a submit button"
  - ✅ Uses Tailwind CSS
  - ❌ Does NOT use shadcn/ui

- [ ] **Test 2**: "Create a dialog component"
  - ✅ Uses Radix UI Dialog
  - ✅ Styled with Tailwind
  - ❌ Does NOT use shadcn/ui Dialog

- [ ] **Test 3**: "Create a tabs component"
  - ✅ Uses Radix UI Tabs
  - ✅ Styled with Tailwind
  - ❌ Does NOT use shadcn/ui Tabs

- [ ] **Test 4**: Verify no import errors in console

- [ ] **Test 5**: Verify artifacts render correctly

### Documentation Consistency

- [ ] CLAUDE.md matches system prompt
- [ ] Both explain shadcn/ui NOT available
- [ ] Both recommend Radix UI primitives
- [ ] Library lists consistent

---

## Pre-Merge Final Checks

- [ ] All Phase 1 tasks complete
- [ ] All verification commands pass
- [ ] Manual tests pass
- [ ] Documentation consistent
- [ ] No console errors
- [ ] Artifacts render correctly
- [ ] Code reviewed
- [ ] Ready to merge

---

## Quick Reference: What Changed

### ❌ REMOVED
- shadcn/ui promotion (88 lines)
- Local import examples
- "RECOMMENDED" language
- "USE shadcn/ui as primary choice"

### ✅ ADDED
- Radix UI primitives guidance
- Critical restriction warning
- 3 Radix UI + Tailwind examples
- Design principles
- Update/rewrite guidelines
- Artifact usage criteria
- localStorage warning
- Enhanced library documentation

### 🎯 RESULT
- Artifacts use Radix UI + Tailwind (works)
- No more shadcn/ui import errors
- Better alignment with technical capabilities
- Improved artifact success rates

