# Sucrase Migration Plan - Peer Review

**Review Date:** 2025-12-26 (Updated)
**Reviewed By:** Claude Code Agent (Code Architect)
**Codebase Version:** Main branch (commit 44b1447)

> **Update (2025-12-26)**: Scope clarification applied. Prebuilt bundle integration
> concern was based on misunderstanding of architecture. Sucrase and prebuilt bundles
> operate on different code paths and don't directly interact. Sucrase transpiles
> JSX/TypeScript → JavaScript while preserving import statements unchanged. Prebuilt
> bundles work on imports at bundle resolution time, not transpiled code.

---

## Executive Summary

**Recommendation:** APPROVED WITH MINOR MODIFICATIONS

The Sucrase migration plan is well-structured, technically sound, and addresses a real performance optimization opportunity. The main areas requiring attention are import map compatibility and React global accessibility in transpiled code.

**Overall Assessment:**
- **Completeness:** 85% - Well-scoped with minor gaps in rollback strategy
- **Technical Accuracy:** 70% - Several line number mismatches and implementation gaps
- **Risk Assessment:** 75% - Primary risks correctly identified, import map compatibility is the main concern
- **Testing Strategy:** 80% - Good coverage but missing browser-specific scenarios

---

## Critical Findings (Must-Fix Before Implementation)

### 1. ~~Missing Prebuilt Bundle System Integration~~ NOT APPLICABLE

~~The plan doesn't address how Sucrase integrates with the existing **Prebuilt Bundle System** (`_shared/prebuilt-bundles.ts`).~~

**Status:** Not Applicable - These systems are orthogonal:
- **Sucrase**: Transpiles JSX/TypeScript syntax → JavaScript (preserves imports)
- **Prebuilt Bundles**: Resolves imports → pre-bundled CDN URLs at bundle time

Import statements pass through Sucrase unchanged, so prebuilt bundle resolution works independently.

### 2. Import Map Shim Compatibility

Lines 1241-1259 of `ArtifactRenderer.tsx` show a complex import map system with data URL shims. The plan proposes removing these entirely when switching to Sucrase, but doesn't validate compatibility.

**Impact:** High
**Required Action:** Phase 1.3 must include testing of import map shim compatibility BEFORE removing Babel template.

### 3. Dual React Instance Problem

BundledArtifactFrame (lines 256-346) has extensive client-side fixes for the dual React instance problem. The plan doesn't explain how Sucrase affects this architecture.

**Impact:** High
**Required Action:** Add Phase 1.5: "Validate React Instance Unification" with specific test cases.

### 4. Server-Side Rollback Strategy Missing

Phase 2 deploys Sucrase to Edge Functions. If server-side Sucrase breaks bundling, the feature flag only controls CLIENT-SIDE usage.

**Impact:** High
**Required Action:** Add server-side feature flag via Supabase secrets: `ENABLE_SUCRASE_SERVER=false`

### 5. Sentry Integration Incomplete

Edge Functions don't have Sentry integration yet (confirmed by CLAUDE.md). This means server-side Sucrase errors won't be tracked.

**Impact:** Medium
**Required Action:** Add console logging fallback for Edge Functions, document Sentry gap.

### 6. Line Number Mismatches

Plan states "ArtifactRenderer.tsx (lines 1176-1378)" but actual structure differs. Update all line references to match current codebase.

### 7. Bundle Size Claim Misleading

Babel is loaded via CDN, not npm bundle. Reframe as "96% reduction in transpiler download size" rather than "bundle size."

---

## Missing Test Scenarios

| Scenario | Priority | Test Type |
|----------|----------|-----------|
| Error recovery compatibility | Critical | Integration |
| Multi-artifact concurrent transpilation | High | Unit |
| Theme refresh determinism | High | Unit |
| Reserved keyword preservation | High | Unit |
| Import map shim preservation | High | Integration |

---

## Timeline Adjustment

| Phase | Plan Estimate | Realistic Estimate | Reason |
|-------|---------------|-------------------|--------|
| Phase 1.3 | 2-4 hours | 3-4 hours | Import map testing |
| Phase 2.2 | 2-3 hours | 2-3 hours | Standard Deno setup |
| Phase 3 | 1-2 days | 2-3 days | Missing test scenarios |
| Phase 4 | 1 week | 1-1.5 weeks | Percentage rollout implementation |
| Phase 5 | 2-4 hours | 3-4 hours | CSP validation needed |

**Total:** 8-10 days → **9-12 days realistic** (original estimate was close to accurate)

---

## Recommended Next Steps

1. Address import map shim compatibility (Finding #2)
2. Validate React instance unification (Finding #3)
3. Add server-side feature flag (Finding #4)
4. Create separate PRs for each phase
5. Schedule design review after Phase 1 completion

---

## Revised Success Criteria

**Before 10% Rollout:**
- [ ] All unit tests pass (including new scenarios)
- [ ] All integration tests pass (including import map tests)
- [ ] Server-side feature flag implemented
- [ ] Chrome DevTools verification passes
- [ ] Safari 10.1 compatibility verified
- [ ] React global accessibility in transpiled code verified
- [ ] Performance benchmarks show >10x improvement

**Before Full Rollout (after 2 weeks at 100%):**
- [ ] Error rate < 0.1%
- [ ] No user-reported regressions
- [ ] Transpiler download size reduced by >90%
- [ ] Transpilation time < 10ms (p95)
- [ ] Import map shims still functional
- [ ] Babel cleanup completed

---

## Final Verdict

**APPROVED WITH MINOR MODIFICATIONS**

The plan represents a solid optimization opportunity with a well-thought-out phased approach. The main focus should be on import map compatibility testing and React global accessibility validation. The original 8-10 day timeline is largely accurate after removing the prebuilt bundle integration concern.

**Key remaining risks:**
1. Import map shim compatibility with Sucrase output
2. React global accessibility in transpiled JSX
3. Server-side rollback mechanism
