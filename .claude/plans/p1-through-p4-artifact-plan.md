Insight ─────────────────────────────────────
  The plan is organized into 4 phases based on impact and dependencies. Phase 1 is critical because it fixes
  the root cause of dual React instances at the source (server-side bundle generation), rather than patching
  them client-side. This single change eliminates an entire category of bugs.
  ─────────────────────────────────────────────────

  Quick Overview

  | Phase   | Focus               | Time | Key Changes                                    |
  |---------|---------------------|------|------------------------------------------------|
  | Phase 1 | Critical Fixes (P0) | ~2h  | Fix dual React at source, complete import maps |
  | Phase 2 | Reliability (P1)    | ~3h  | Artifact render signals, error recovery, CSP   |
  | Phase 3 | UX (P2)             | ~3h  | 24h URLs, bundle progress, animation perf      |
  | Phase 4 | Optimization (P3)   | ~3h  | Pre-bundled deps, token rate limits, caching   |

  Phase 1 Highlights (Start Here)

  1.1 The Core Fix

  // bundle-artifact/index.ts:395
  // BEFORE (causes dual React)
  const esmUrl = `https://esm.sh/${pkg}@${version}?deps=react@18.3.1,react-dom@18.3.1`;

  // AFTER (uses window.React)
  const esmUrl = `https://esm.sh/${pkg}@${version}?external=react,react-dom`;

  1.2 Complete Import Map

  Add missing bare specifier entries (react, react-dom, react/jsx-runtime) so esm.sh packages resolve
  correctly.

  1.3 Timeout Increase

  Bump BUNDLE_TIMEOUT_MS from 30s to 60s for complex dependency trees.

  Key Dependencies

  Phase 1 ─┬─► Phase 2 ─┬─► Phase 3 ─┬─► Phase 4
           │            │            │
     (fixes root cause) (reliability) (UX polish)  (performance)

  What You'll Get

  After implementing all phases:
  - 0% dual React errors (down from ~5% on Radix artifacts)
  - <2% bundle timeout failures (down from ~10%)
  - <2s bundle time for common deps (down from ~10s with prebuilts)
  - Accurate completion timing in ReasoningDisplay
  - 24-hour artifact URLs (up from 1 hour)
  - Token-based fair rate limiting