# Project Review Findings

## Scope and Method
- TypeScript check: `./node_modules/.bin/tsc -p tsconfig.json --noEmit`
- Test run: `npm run test`
- Static scan: heuristic import scan for unused pages; repo-wide grep for script references

## Findings

### Dead Code
- DC-001: ~~`src/pages/Index.tsx` appears unused (no imports found in `src/`; not referenced in `src/App.tsx` or `src/main.tsx`).~~ **RESOLVED** - File deleted on 2025-12-19 (Issue #349).
- DC-002: Orphan utility scripts are present in the repo root and not referenced by npm scripts or docs (grep found no references).
  - Files: `check-actual-rendering.js`, `check-responsive-badges.js`, `verify-badge-placement.js`, `test-backend-flow.js`, `test-edge-function-logs.js`, `test-final-mobile-menu.js`, `test-image-regeneration.js`, `test-mobile-chat-sidebar.js`, `test-mobile-debug.js`, `test-mobile-sidebar.js`, `test-simple-mobile-menu.js`, `test-artifacts`
  - Recommendation: move these into `scripts/` with README usage notes, or delete if obsolete.

### Race Conditions / Concurrency Risks
- RC-001: `useChatMessages` can apply stale fetch results after a session change (no abort or session guard around `fetchMessages`).
  - Evidence: `src/hooks/useChatMessages.tsx:160` `src/hooks/useChatMessages.tsx:197`
  - Recommendation: add an AbortController or compare `sessionId` before `setMessages` to ignore stale results.
- RC-002: `streamChat` retries return a recursive call, but the `finally` block still executes and sets `isLoading` false immediately.
  - Evidence: `src/hooks/useChatMessages.tsx:1462` `src/hooks/useChatMessages.tsx:1491`
  - Impact: loading state can flicker off while a retry is still streaming.
  - Recommendation: only clear `isLoading` on terminal exits, or guard with a request-scoped flag.
- RC-003: Session changes reset local state but do not cancel an in-flight stream.
  - Evidence: `src/components/ChatInterface.tsx:200` `src/components/ChatInterface.tsx:212`
  - Impact: late stream callbacks can update state after a session switch.
  - Recommendation: call `cancelStream()` on session change or ignore updates when `sessionId` changes.
- RC-004: Service worker update polling interval is set inside an async helper that returns a cleanup, but the cleanup is never wired to the effect.
  - Evidence: `src/components/UpdateNotification.tsx:37` `src/components/UpdateNotification.tsx:62`
  - Impact: interval and listeners persist after unmount; possible state updates after unmount.
  - Recommendation: move the interval setup into the effect body and return a real cleanup function.

### TypeScript
- TS-001: No TypeScript errors found by `./node_modules/.bin/tsc -p tsconfig.json --noEmit`.

### Tests
- TEST-001: `npm run test` failed with a vitest worker crash and OOM.
  - Evidence: errors surfaced from `src/components/__tests__/ArtifactErrorBoundary.test.tsx` followed by `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`.
  - Recommendation: isolate the failing suite (run `npm run test -- src/components/__tests__/ArtifactErrorBoundary.test.tsx`), and investigate memory usage; if needed, raise Node heap or reduce test concurrency, and ensure tests are not leaking timers or DOM nodes.
