# Issue Tracker: #271-281

> **Last Updated**: 2025-12-13 (Session 3)
> **Lead Manager**: Claude (Opus 4.5)
> **Workflow**: Bugs first, then Features. Each issue = 1 PR. Sequential completion required.

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Total Issues | 11 |
| Completed | 8 (#271, #273, #275, #276, #277, #279, #280, #281) |
| Remaining Bugs | 0 |
| Remaining Features | 3 (#272, #274, #278) |
| In Progress | 0 |

---

## Issue Queue

### Phase 1: Bug Fixes (Priority)

| # | Issue | Type | Status | Assigned Agent | PR | Notes |
|---|-------|------|--------|----------------|-----|-------|
| 273 | Unable to create an account on signup | Bug | ✅ Merged | debugger, backend-specialist, code-reviewer | #282 | Schema grants migration |
| 275 | Chat session - reasoning not available then disappears | Bug | ✅ Merged | debugger, code-reviewer | #283 | Fixed onDelta timing |
| 276 | User sent message pill size | UI Bug | ✅ Merged | frontend-developer, code-reviewer | #284 | w-fit + max-w-[85%] |
| 277 | Search always on changes | Bug | ✅ Merged | debugger, backend-specialist, code-reviewer | #285 | Safeguards + env var unset |
| 279 | Sidebar animations and icon resizing | UI Bug | ✅ Merged | frontend-developer, code-reviewer | #286 | transition-all + shrink-0 |
| 280 | Image and artifact button behaviors | Bug | ✅ Merged | frontend-developer, code-reviewer | #287 | Mutual exclusivity + state reset |
| 281 | Image gen follow up prompts | Bug | ✅ Merged | debugger, code-reviewer | #288 | Base64 sanitization fix |

### Phase 2: Features (After Bugs)

| # | Issue | Type | Status | Assigned Agent | PR | Notes |
|---|-------|------|--------|----------------|-----|-------|
| 272 | feat: Admin Portal Dashboard | Feature | 🔴 Not Started | - | - | Large multi-phase feature |
| 274 | Add chat storage for non-auth users | Feature | 🔴 Not Started | - | - | LocalStorage persistence |
| 278 | Feature Request: add link to source on hover | Feature | 🔴 Not Started | - | - | Hover tooltip for citations |

### Already Complete (Pre-Session)

| # | Issue | Type | Status | PR | Merged |
|---|-------|------|--------|-----|--------|
| 271 | fix(tour): swap X button and step counter positions | Bug Fix | ✅ Merged | #271 | 2025-12-13 |

---

## Current Focus

### 🎯 All Bugs Complete! Next: Features

All 8 bug fixes have been merged. Ready for Phase 2: Features.

**Next Issue**: #272 - Admin Portal Dashboard (Feature)
- Large multi-phase feature
- Analytics dashboard for admin users

---

## Completed Issue Details

### #281 - Image gen follow up prompts (Session 3)
**Type**: Bug
**PR**: #288
**Merged**: 2025-12-13

**Problem**:
After generating an image, follow-up prompts fail with HTTP 400 error. When storage fails, `generate-image` returns base64 data embedded in the artifact (200,000-500,000+ chars), which exceeds the 100,000 character validation limit in `chat/middleware/validation.ts`.

**Fix Applied**:
- Added `sanitizeImageArtifacts` function in `useChatMessages.tsx`
- Regex detects image artifacts with base64 data and replaces with placeholder
- Handles attributes in any order (type before/after title)
- Enhanced validation logging for diagnosing oversized messages

**Files Changed** (3 files, +173 lines):
- `src/hooks/useChatMessages.tsx` - Sanitization function
- `supabase/functions/chat/middleware/validation.ts` - Enhanced logging
- `src/hooks/__tests__/imageSanitization.test.ts` - 9 test cases

---

### #280 - Image and artifact button behaviors (Session 2)
**Type**: Bug
**PR**: #287
**Merged**: 2025-12-13

**Problem**:
1. Both image and artifact buttons could be active simultaneously (should be mutually exclusive)
2. Buttons remained active when returning to main from a chat session

**Fix Applied**:
- Added mutual exclusivity logic to button click handlers in `prompt-input-controls.tsx`
- Added mode reset in `handleNewChat` (Home.tsx, Index.tsx)
- Added mode reset on session change (ChatInterface.tsx)

**Files Changed** (4 files, +12 lines):
- `src/components/prompt-kit/prompt-input-controls.tsx`
- `src/pages/Home.tsx`
- `src/pages/Index.tsx`
- `src/components/ChatInterface.tsx`

---

## Environment Notes

### Session 2 Environment Work:
- ✅ Migrations synced to staging and production
- ✅ `TAVILY_ALWAYS_SEARCH` unset in production
- ✅ Production database backed up to `backups/`
- ✅ Staging data synced from production
- ✅ `backups/` added to `.gitignore`

### Supabase Environments:
| Environment | Project Ref | Role |
|-------------|-------------|------|
| Local | N/A | Development |
| vana-staging | `tkqubuaqzqjvrcnlipts` | Staging |
| vana-dev | `vznhbocnuykdmjvujaka` | **PRODUCTION** |

### Pending Deployment:
Production functions need redeployment to include PR #285 code changes:
```bash
./scripts/deploy-simple.sh prod
```

---

## Workflow Protocol

### For Each Issue:

1. **Investigation Phase**
   - [ ] Dispatch debugger/Explore agent
   - [ ] Find root cause, identify files to change

2. **Implementation Phase**
   - [ ] Dispatch appropriate specialist agent
   - [ ] Implement fix/feature
   - [ ] Verify with Chrome DevTools MCP if needed

3. **Review Phase**
   - [ ] Dispatch code-reviewer agent
   - [ ] Verify quality, accuracy, completeness
   - [ ] Resolve any discrepancies

4. **Merge Phase**
   - [ ] Create PR with proper description
   - [ ] CI/CD passes
   - [ ] PR merged to main
   - [ ] Update this tracker

---

## Agent Roster

| Agent Type | Specialty | Use Case |
|------------|-----------|----------|
| `backend-specialist` | Supabase, Edge Functions, DB | #281 (likely) |
| `frontend-developer` | React, UI, State Management | #274, #278 |
| `debugger` | Error investigation, root cause | Initial investigation |
| `code-reviewer` | Quality, security, best practices | Peer reviews |
| `Explore` | Codebase navigation | Context gathering |

---

## Decision Log

| Date | Issue | Decision | Rationale |
|------|-------|----------|-----------|
| 2025-12-13 | All | Bugs before features | User requirement |
| 2025-12-13 | #271 | Skip (already merged) | Confirmed via git log |
| 2025-12-13 | #277 | Env var unset in prod | Completes the fix |
| 2025-12-13 | #280 | Mutual exclusivity via handler logic | Simpler than refactoring to single mode state |

---

## Notes

- Each issue gets its own PR
- PRs must be merged before proceeding to next issue
- All work requires peer review
- Lead Manager (Claude) has final approval authority
- Local Supabase must be running for edge function testing
- Browser cache may need clearing if showing old version
