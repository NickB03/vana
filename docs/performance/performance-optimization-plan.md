# Vana Frontend Performance Optimization Strategy

> **Disclaimer:** This document outlines the planned performance optimization strategy for the Vana frontend. Unless explicitly marked as “Validated,” all metrics and percentage improvements are projections that require verification through Lighthouse, Web Vitals RUM, or other agreed instrumentation before being reported as achieved.

## Status Overview

| Metric | SPARC Target | Baseline (Validated 2025-09-20) | Projected Outcome | Validation Status |
|--------|--------------|--------------------------------|-------------------|-------------------|
| First Contentful Paint (FCP) | < 1.5s | **0.8s** ([base.json](baselines/base.json)) | ≈ 0.6s after optimizations | ✅ **Already meets target!** |
| Largest Contentful Paint (LCP) | < 2.5s | ~~**2.6s** ([base.json](baselines/base.json))~~ → **1.7s** ([optimized.json](baselines/optimized.json)) | **🎯 TARGET ACHIEVED!** | ✅ **35% improvement via deferred session hydration** |
| Time to Interactive (TTI) | < 3.0s | **2.6s** ([base.json](baselines/base.json)) | ≈ 2.2s after optimizations | ✅ **Already meets target!** |
| Total Blocking Time (TBT) | < 200ms | **50ms** ([base.json](baselines/base.json)) | ≈ 30ms after optimizations | ✅ **Excellent baseline!** |
| Cumulative Layout Shift (CLS) | < 0.1 | **0.0** ([base.json](baselines/base.json)) | Maintain 0.0 | ✅ **Perfect stability!** |
| Speed Index | < 2.0s | **1.0s** ([base.json](baselines/base.json)) | ≈ 0.8s after optimizations | ✅ **Already excellent!** |
| Lighthouse Performance Score | > 90 | ~~**97** ([base.json](baselines/base.json))~~ → **99** ([optimized.json](baselines/optimized.json)) | **🚀 PERFECT SCORE!** | ✅ **Near-perfect optimization achieved** |

## ✅ COMPLETED OPTIMIZATIONS

### 🚀 Deferred Session Hydration (IMPLEMENTED 2025-09-20)

**File Modified**: `frontend/src/hooks/useChatStream.ts:548-577`

**Optimization Details**:
- Deferred chat session history loading using `requestIdleCallback()` with fallback to `setTimeout()`
- Prevents blocking the main thread during initial page render
- Uses 1.5-second timeout to ensure loading eventually occurs even on busy pages
- Properly handles cleanup on component unmount to prevent memory leaks

**Performance Impact Measured**:
- **LCP improved from 2.6s → 1.7s** (35% improvement)
- **Lighthouse Score improved from 97 → 99** (near-perfect score)
- **Speed Index improved from 1.0s → 0.9s** (10% improvement)
- All other metrics maintained or slightly improved

**Implementation Strategy**:
```typescript
// Defer session hydration until the browser is idle so initial paint (LCP) happens sooner
const scheduleLoad = () => {
  if (typeof window === 'undefined') {
    void loadSessions();
    return;
  }

  if (typeof idleWindow.requestIdleCallback === 'function') {
    idleHandle = idleWindow.requestIdleCallback(() => {
      if (!cancelled) void loadSessions();
    }, { timeout: 1500 });
  } else {
    timeoutHandle = window.setTimeout(() => {
      if (!cancelled) void loadSessions();
    }, 0);
  }
};
```

---

## Implementation Roadmap

### 1. Next.js Configuration & Bundling

**Focus Areas**
- Enable granular code splitting for framework, vendor, and feature bundles.
- Integrate Webpack Bundle Analyzer for continuous monitoring.
- Apply tree shaking, module concatenation, and route-based lazy loading.

**Projected Impact (requires validation)**
- ~40% reduction in initial bundle weight.
- ~60% improvement in caching efficiency for repeat visits.
- ~25% faster production build times.

**Validation Plan**
- Capture pre- and post-change bundle analyzer reports.
- Track deploy build durations in CI logs.
- Confirm repeat-visit performance through synthetic Lighthouse runs.

### 2. Performance Monitoring Instrumentation

**Files in Scope**: `/frontend/lib/performance.ts`, `/frontend/hooks/usePerformanceMetrics.ts`

**Objectives**
- Capture Core Web Vitals (FCP, LCP, FID, CLS, TTFB, TTI) in real time.
- Implement manual fallbacks for browsers without full Web Vitals support.
- Record component-level render timings and rerender counts.

**Current Status**
- Instrumentation code exists and is under review; live telemetry not yet enabled.

**Projected Impact**
- 100% coverage of monitored surfaces for future regression alerts.
- Ability to classify regressions within one deployment cycle.

**Validation Plan**
- Hook metrics pipeline into staging and confirm events in analytics backend.
- Produce weekly Web Vitals summary until production baseline stabilizes.

### 3. SSE and Realtime Stream Optimization

**Files in Scope**: `/frontend/hooks/useSSEOptimized.ts`

**Planned Changes**
- Share SSE connections across subscribers to reduce overhead.
- Apply exponential backoff and jitter for reconnection attempts.
- Monitor connection latency and throughput for adaptive tuning.

**Projected Impact**
- ≈40% faster connection establishment times.
- ≈60% reduction in message processing latency via debounced updates.
- ≈65% drop in memory use for hour-long chat sessions.

**Validation Plan**
- Run controlled soak tests with synthetic traffic.
- Capture memory and latency metrics using Chrome DevTools performance profiles.

### 4. React Rendering Optimizations

**Files in Scope**: `/frontend/components/vana/VanaPerformanceOptimized.tsx`, relevant hooks and contexts.

**Planned Tactics**
- Virtualize long chat transcripts to render only visible nodes.
- Apply memoization and stable callback references to curb rerenders.
- Defer non-critical UI via lazy loading and suspense boundaries.

**Projected Impact**
- ≈85% faster first render on large conversations.
- ≈95% reduction in unnecessary rerenders during active chats.
- Sustained 60fps interactions on low-end mobile hardware.

**Validation Plan**
- Use React Profiler to compare render counts before and after changes.
- Collect FPS data through Chrome’s Performance panel on target devices.

### 5. Image and Asset Strategy

**Files in Scope**: `/frontend/lib/imageOptimization.ts`, CDN configuration.

**Planned Work**
- Serve AVIF/WebP with fallback logic.
- Implement responsive sources and lazy loading.
- Preload critical fonts and above-the-fold imagery.

**Projected Impact**
- ≈60% faster image decode times on broadband.
- ≈40% reduction in bandwidth consumption for image-heavy pages.
- Noticeable improvement in perceived load due to blur placeholders.

**Validation Plan**
- Measure image waterfall improvements via WebPageTest or Lighthouse traces.
- Track CDN bandwidth stats after rollout.

### 6. Mobile-Focused Enhancements

**Files in Scope**: `/frontend/lib/mobileOptimization.ts` and mobile-specific components.

**Key Initiatives**
- Register passive touch listeners, minimize main-thread work.
- Adjust rendering under low-power or constrained-network conditions.
- Optimize virtual keyboard interactions to maintain layout stability.

**Projected Impact**
- ≈65% reduction in reported touch latency.
- ≈40% lower battery usage measured over 30-minute sessions.
- Reliable layout stability (CLS < 0.1) during keyboard transitions.

**Validation Plan**
- Execute manual QA on mid-tier Android/iOS devices using Chrome UX metrics.
- Record battery consumption with Android Studio and Xcode instruments.

### 7. Network and Caching Layer

**Files in Scope**: `/frontend/lib/cacheOptimization.ts`, service worker scripts.

**Proposed Actions**
- Layer HTTP cache, Service Worker cache, and in-memory cache with stale-while-revalidate.
- Deduplicate concurrent API requests and pool HTTP/2 connections.
- Implement retry logic with exponential backoff.

**Projected Impact**
- ≈80% cache hit rate for repeat visits within 24 hours.
- ≈90% fewer duplicate network calls in client logs.
- Improved offline resilience covering core chat flows.

**Validation Plan**
- Compare network traces pre/post via Chrome DevTools.
- Review service worker cache metrics in staging telemetry.

### 8. Performance Budget Enforcement

**Files in Scope**: `/frontend/config/performance-budgets.js`, CI workflows.

**Goals**
- Codify budgets for Core Web Vitals and bundle sizes.
- Fail CI when budgets are exceeded, with progressive warnings beforehand.
- Maintain historical benchmarks for regression detection.

**Projected Impact**
- Prevent unreviewed performance regressions reaching production.
- Maintain ≥95% adherence to defined budgets.

**Validation Plan**
- Dry-run CI pipeline with intentionally bloated bundle to verify fail-fast behavior.
- Publish monthly dashboard summarizing budget compliance.

## Testing & Measurement Strategy

1. **Synthetic Audits** – Nightly Lighthouse CI runs on staging; store traces for comparison.
2. **Real User Monitoring (RUM)** – Roll out Web Vitals collection behind a feature flag; evaluate within two sprints.
3. **Load & Soak Testing** – Use k6 or Artillery scripts to simulate concurrent chats and measure SSE stability.
4. **Device Lab Spot Checks** – Schedule quarterly testing on a representative device matrix to validate mobile projections.

### Baseline Data Capture Checklist *(Step 1)*

- [x] **✅ COMPLETED 2025-09-20:** Spin up the frontend with production build and serve on port 3000.
- [x] **✅ COMPLETED 2025-09-20:** Run Lighthouse audit and archive the report in `docs/performance/baselines/base.json`.
- [x] **✅ COMPLETED 2025-09-20:** Record FCP, LCP, TTI, TBT, CLS, Speed Index, and overall Performance score from the Lighthouse report in the "Baseline" column above.
- [ ] Capture Web Vitals using `npm --prefix frontend run vitals:collect` (or equivalent RUM hook) for at least 200 sessions; export aggregated metrics to the same baselines folder.
- [x] **✅ COMPLETED 2025-09-20:** Testing conditions documented - Production build, Chrome headless, localhost:3000, September 20, 2025.
- [x] **✅ COMPLETED 2025-09-20:** Replaced "manual sample" placeholders with validated Lighthouse metrics.

**Testing Environment Details (2025-09-20):**
- **Build**: Next.js 15.5.3 production build (`npm run build`)
- **Browser**: Chrome headless with flags: `--headless --no-sandbox --disable-gpu`
- **URL**: http://127.0.0.1:3000
- **Audit Tool**: Lighthouse (latest version)
- **Network**: Local network, no throttling
- **Device**: Desktop simulation

**Optimization Results (2025-09-20):**
- **✅ COMPLETED**: Deferred session hydration implementation
- **✅ VALIDATED**: LCP improved from 2.6s → 1.7s (meets target < 2.5s)
- **✅ VALIDATED**: Lighthouse score improved from 97 → 99
- **📁 ARCHIVED**: Both baseline and optimized results in `docs/performance/baselines/`

## Next Steps

1. Finalize instrumentation plumbing and begin collecting baseline metrics (owners: Performance + Platform squads).
2. Prioritize bundling and rendering optimizations in the next sprint to address the largest projected gains.
3. Stand up performance budget enforcement in CI before rolling out aggressive feature work.
4. Document validation results in this file, reclassifying each metric from “Projected” to “Validated” once supporting data is linked.

---

*All quantitative improvements in this strategy are targets pending measurement. Update this plan with links to audits, dashboards, or datasets when validations are completed.*
