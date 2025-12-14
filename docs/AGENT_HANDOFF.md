# Agent Handoff Document

> **Updated**: 2025-12-13 (Session 3)
> **Previous Agent**: Claude Opus 4.5
> **Task**: Issue Management for #271-281
> **Status**: 8/11 issues complete, 3 remaining (ALL BUGS DONE)

---

## Your Role: Lead Manager

You are acting as a **Lead Manager** coordinating work on GitHub issues #271-281. You do NOT implement code directly - you dispatch specialized agents and coordinate their work.

### Your Responsibilities:
1. **Assign appropriate agents** to each issue based on type
2. **Ensure all work is planned** before implementation begins
3. **Coordinate peer reviews** for quality, accuracy, and completeness
4. **Resolve discrepancies** before marking work complete
5. **Create PRs** and ensure they merge successfully before moving to next issue
6. **Approve agent activities** - you have full authority

---

## Workflow Protocol (MUST FOLLOW)

### For Each Issue:

```
┌─────────────────────────────────────────────────────────────┐
│  1. INVESTIGATION                                           │
│     └─ Dispatch: debugger or Explore agent                  │
│     └─ Goal: Find root cause, identify files to change      │
├─────────────────────────────────────────────────────────────┤
│  2. IMPLEMENTATION                                          │
│     └─ Dispatch: Appropriate specialist agent               │
│        - Frontend issues → frontend-developer               │
│        - Backend/DB issues → backend-specialist             │
│        - Edge Functions → backend-specialist                │
│     └─ Goal: Implement the fix                              │
├─────────────────────────────────────────────────────────────┤
│  3. PEER REVIEW                                             │
│     └─ Dispatch: comprehensive-review:code-reviewer         │
│        or pr-review-toolkit:code-reviewer                   │
│     └─ Goal: Verify quality, accuracy, completeness         │
│     └─ If issues found: Send back to implementation         │
├─────────────────────────────────────────────────────────────┤
│  4. PR & MERGE                                              │
│     └─ Create branch: fix/<issue>-<description>             │
│     └─ Stage only relevant files (not tracker docs)         │
│     └─ Commit with conventional format                      │
│     └─ Push and create PR with gh cli                       │
│     └─ Wait for CI (usually ~5 min for quality check)       │
│     └─ Merge with: gh pr merge <num> --squash --delete-branch│
│     └─ Update tracker document                              │
└─────────────────────────────────────────────────────────────┘
```

### Commit Message Format:
```
<type>(<scope>): <description> (#<issue>)

<body>

Closes #<issue>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

---

## Current State

### Tracking Documents:
- **Main Tracker**: `docs/ISSUE_TRACKER_271-281.md` (update after each PR)
- **This Handoff**: `docs/AGENT_HANDOFF.md`

### Progress:
| Status | Issues |
|--------|--------|
| ✅ Completed | #271, #273, #275, #276, #277, #279, #280, #281 (8 issues) |
| 🔴 Remaining Features | #272, #274, #278 |

### PRs Merged This Session:
| PR | Issue | Description |
|----|-------|-------------|
| #287 | #280 | Button mutual exclusivity + state reset |
| #288 | #281 | Base64 image artifact sanitization |

### Order of Work:
1. ~~**#281** - Image gen follow up prompts 400 error (Bug)~~ ✅ DONE
2. **#272** - Admin Portal Dashboard (Feature - large) ← **START HERE**
3. **#274** - Chat storage for non-auth users (Feature)
4. **#278** - Source hover tooltips (Feature)

---

## Environment Setup (IMPORTANT)

### Supabase Environments:
| Environment | Project Ref | Role | CLI Linked |
|-------------|-------------|------|------------|
| **Local** | N/A | Development | N/A |
| **vana-staging** | `tkqubuaqzqjvrcnlipts` | Staging | ❌ |
| **vana-dev** | `vznhbocnuykdmjvujaka` | **PRODUCTION** | ✅ Current |

### Environment Alignment Completed:
- ✅ Migrations synced to both staging and production
- ✅ `TAVILY_ALWAYS_SEARCH` unset in production (fixes #277)
- ✅ Production database backed up to `backups/`
- ✅ Staging data synced from production
- ✅ `backups/` added to `.gitignore`

### Local Development:
```bash
# Start local Supabase (if stopped)
supabase start

# Start dev server
npm run dev  # Port 8080

# Verify local edge functions
curl http://127.0.0.1:54321/functions/v1/health
```

### Deploy to Production:
```bash
./scripts/deploy-simple.sh prod  # Requires confirmation
```

### Note on Functions:
Production functions were last deployed Dec 12. PR #285 (#277 fix) code changes need deployment:
```bash
./scripts/deploy-simple.sh prod
```

---

## Issue Details: #281 (COMPLETED)

**PR**: #288 | **Merged**: 2025-12-13

### Problem:
After generating an image, follow-up prompts fail with 400 error. Root cause: When storage fails, `generate-image` returns base64 data (200,000-500,000+ chars) embedded in the artifact, exceeding the 100,000 character validation limit.

### Solution Applied:
- Added `sanitizeImageArtifacts` function in `useChatMessages.tsx`
- Regex detects image artifacts with base64 data and replaces with placeholder
- Enhanced validation logging in `validation.ts`
- Comprehensive test suite (9 test cases)

---

## Issue Details: Remaining Features (START HERE)

### #272 - Admin Portal Dashboard
- **Scope**: Large multi-phase feature
- **Design Doc**: `docs/plans/2025-12-13-admin-portal-design.md`
- **Phases**: Infrastructure → Core Layout → Views → Test Reports → Polish
- **Consider**: Breaking into multiple PRs per phase
- **Note**: Admin analytics edge function returns 503 locally - may need investigation

### #274 - Chat Storage for Non-Auth Users
- **Scope**: LocalStorage persistence for guest users
- **Pattern**: Store chat sessions in localStorage, sync on auth

### #278 - Source Hover Tooltips
- **Scope**: Hover popup showing URL for citation numbers like [3]
- **Pattern**: Parse citations from content, match to search_results, use Tooltip/HoverCard

---

## Agent Reference

| Agent Type | Use For |
|------------|---------|
| `debugging-toolkit:debugger` | Investigation, finding root cause |
| `Explore` | Codebase navigation, finding files |
| `frontend-developer` | React, UI, state management |
| `backend-specialist` | Supabase, Edge Functions, DB |
| `comprehensive-review:code-reviewer` | Peer reviews |
| `pr-review-toolkit:code-reviewer` | Peer reviews (alternative) |

---

## Git Commands Reference

```bash
# Create branch
git checkout -b fix/<issue>-<description>

# Stage specific files (NOT tracker docs)
git add <files>

# Commit with HEREDOC for proper formatting
git commit -m "$(cat <<'EOF'
<type>(<scope>): <description> (#<issue>)

<body>

Closes #<issue>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"

# Push and create PR
git push -u origin <branch>
gh pr create --title "..." --body "$(cat <<'EOF'
## Summary
...

## Test Plan
...

Closes #<issue>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"

# Wait for CI, then merge
gh pr checks <num>  # Wait until all pass
gh pr merge <num> --squash --delete-branch

# Return to main
git checkout main && git pull origin main
```

---

## Important Reminders

### Testing Before PR:
- Run `npm run test` to verify tests pass
- Check Chrome DevTools MCP for visual verification if needed
- Local Supabase must be running for edge function tests

### CI/CD:
- Quality check takes ~5 minutes
- All checks must pass before merge
- Use `gh pr checks <num>` to monitor

### Browser Testing Note:
If browser shows old version or connects to production:
1. Hard refresh: `Cmd+Shift+R`
2. Clear site data in DevTools → Application → Storage
3. Verify `.env` has `VITE_SUPABASE_URL=http://127.0.0.1:54321`

---

## User's Original Instructions

> "begin to work through issues 271 through 281. Do not start working on them at all time first create a document to track all progress... your task will then to be only acting as a lead manager you must assign the proper agents to the current issue being worked, ensure that all work is planned in advance. Agents must have all work peer reviewed for quality, accuracy and completeness any discrepancies must be resolved before completion. Each issue should be its own PR and the PR must be successfully merged before moving on to the next feature."

---

## Session Summary (What Was Done)

### Session 3 Accomplished:
1. ✅ Resumed from previous session
2. ✅ **Fixed #281** (image follow-up 400 error) - PR #288 merged
   - Root cause: Base64 image data exceeding 100k validation limit
   - Solution: `sanitizeImageArtifacts` function in `useChatMessages.tsx`
   - 9 comprehensive test cases added
3. ✅ Updated handoff documents

### Session 2 Accomplished:
1. ✅ Fixed #280 (button mutual exclusivity) - PR #287 merged
2. ✅ Synced migrations to staging and production
3. ✅ Unset `TAVILY_ALWAYS_SEARCH` in production (completes #277 fix)
4. ✅ Backed up production database
5. ✅ Synced data from production to staging
6. ✅ Added `backups/` to `.gitignore`

### Pending Work:
- Deploy functions to production (PR #285 code changes) - optional
- Complete features #272, #274, #278

---

## Next Steps

1. **Start #272 - Admin Portal Dashboard**
   - Large multi-phase feature
   - Check design doc at `docs/plans/2025-12-13-admin-portal-design.md`
   - Consider breaking into multiple PRs per phase
2. **Follow the 4-phase workflow** for each issue
3. **Update `ISSUE_TRACKER_271-281.md`** after each PR merge

---

🎉 **All bugs are now complete!** Ready for feature development. Good luck! 🚀
