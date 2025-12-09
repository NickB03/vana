# Prebuilt Bundles Testing Implementation Checklist

**Status**: Ready for Implementation
**Target**: Complete before Phase 1 deployment
**Owned By**: QA Team + Test Automation Engineer

---

## Quick Reference: Priority Matrix

### Critical Path (Must Complete)
- [ ] **1.1** Manifest Validation Tests (4h)
- [ ] **1.2** ESM Package Availability Tests (6h)
- [ ] **1.3** React Hook Isolation Tests (5h)
- [ ] **1.4** Integration Artifact Tests (8h)
- [ ] **2.1** Performance & Caching Tests (6h)
- [ ] **2.2** Cross-Browser Verification (4h)
- [ ] **2.3** Regression Testing Suite (5h)

**Subtotal**: 38 hours | **Effort**: High | **Timeline**: 1 week (with parallel execution)

### High Value (Strongly Recommended)
- [ ] **3.1** Dependency Conflict Detection (4h)
- [ ] **3.2** Bundle Size Accuracy Tests (3h)
- [ ] **3.3** Manifest Stability Tests (2h)
- [ ] CI/CD Integration Workflow (3h)
- [ ] Manual Testing Documentation (2h)

**Subtotal**: 14 hours | **Effort**: Medium | **Timeline**: 3-4 days

### Enhancement (Nice to Have)
- [ ] **4.1** Analytics & Monitoring Tests (4h)
- [ ] Performance Dashboard Setup (3h)
- [ ] Baseline Metrics Collection (2h)

**Subtotal**: 9 hours | **Effort**: Low | **Timeline**: 2-3 days

---

## Test Implementation Tasks (In Priority Order)

### CRITICAL PATH

#### Task 1.1: Manifest Validation Tests
**File**: `supabase/functions/_shared/__tests__/prebuilt-bundles-manifest.test.ts`
**Effort**: 4 hours
**Status**: [ ] TODO

**Checklist**:
- [ ] Create test file with Deno testing framework
- [ ] Write 8 manifest validation test cases:
  - [ ] Required fields validation
  - [ ] Duplicate package detection
  - [ ] Version semver format validation
  - [ ] Package name format validation
  - [ ] Bundle size realism checks
  - [ ] Fetch time validation
  - [ ] ESM URL pattern validation
  - [ ] Version compatibility consistency
- [ ] Implement helper to load and validate manifest
- [ ] Verify tests pass with current manifest
- [ ] Document expected manifest format
- [ ] Add pre-deploy check to CI/CD

**Dependencies**:
- Current manifest: `supabase/functions/_shared/prebuilt-bundles.json`
- Test framework: Deno std lib assertions

**Definition of Done**:
- All 8 tests pass
- Manifest validation can run in CI/CD
- Build fails if validation errors occur
- Test coverage: 100% of manifest structure

---

#### Task 1.2: ESM Package Availability Tests
**File**: `supabase/functions/_shared/__tests__/prebuilt-availability.test.ts`
**Effort**: 6 hours
**Status**: [ ] TODO
**Note**: Network-dependent; can be flaky. Consider making non-blocking.

**Checklist**:
- [ ] Create test file with network fetch capability
- [ ] Implement 5 availability test cases:
  - [ ] Fetch all ESM URLs with 5s timeout
  - [ ] React package externalization validation
  - [ ] Circular dependency detection
  - [ ] Pure package bundling verification
  - [ ] CDN fallback chain testing (esm.sh → esm.run → jsdelivr)
- [ ] Add retry logic for transient failures
- [ ] Collect package availability statistics
- [ ] Generate availability report (JSON)
- [ ] Flag any 404 or timeout packages
- [ ] Document results for review

**Dependencies**:
- Network access to esm.sh, esm.run, jsdelivr
- Manifest loading
- HTTP client (Deno native)

**Definition of Done**:
- 95%+ packages fetchable from primary CDN
- No circular dependency warnings
- CDN fallback chain verified
- Report generated for manual review

**Note**: This test can be run:
- Before deployment (required)
- As pre-deploy health check (recommended)
- On schedule (e.g., weekly CDN health check)

---

#### Task 1.3: React Hook Isolation Tests
**File**: `supabase/functions/_shared/__tests__/prebuilt-react-hooks.test.ts`
**Effort**: 5 hours
**Status**: [ ] TODO

**Checklist**:
- [ ] Create test file with artifact bundling capability
- [ ] Implement 6 isolation test cases:
  - [ ] zustand store without React instance errors
  - [ ] react-hook-form with external React
  - [ ] @dnd-kit packages together
  - [ ] @radix-ui components with hooks
  - [ ] Multiple state managers (zustand + jotai)
  - [ ] Animation libraries (react-spring + framer-motion + gsap)
- [ ] Create test artifacts for each case
- [ ] Verify no console.error for React instance issues
- [ ] Verify hooks initialize correctly
- [ ] Document React externalization rules

**Dependencies**:
- Bundle artifact endpoint
- Test artifact samples
- Console error collection

**Definition of Done**:
- All 6 tests pass
- Zero React instance warnings in any test
- Hooks function correctly when packages combined
- Documentation: React externalization best practices

---

#### Task 1.4: Integration Artifact Tests
**File**: `supabase/functions/_shared/__tests__/prebuilt-integration.test.ts`
**Effort**: 8 hours
**Status**: [ ] TODO

**Checklist**:
- [ ] Create test file with artifact rendering capability
- [ ] Create 4 integration test fixtures:
  - [ ] **Phase 1**: Signup form (react-hook-form + zod + sonner)
  - [ ] **Phase 2**: KPI dashboard (recharts + @tanstack/react-table)
  - [ ] **Phase 3**: Tic-Tac-Toe game (react-konva + matter-js)
  - [ ] **Phase 4**: CSV editor (papaparse + file-saver)
- [ ] For each test:
  - [ ] Create artifact code
  - [ ] Bundle with prebuilt packages
  - [ ] Render in headless browser/DOM
  - [ ] Verify expected elements render
  - [ ] Collect console errors (expect 0)
  - [ ] Verify prebuilt packages were used
  - [ ] Check bundle time < 2s
- [ ] Document expected behavior for each artifact
- [ ] Add baseline screenshots for visual regression

**Dependencies**:
- Bundle artifact endpoint
- Headless browser or DOM rendering capability
- Artifact test fixtures

**Definition of Done**:
- All 4 category integration tests pass
- Zero console errors for each test
- All expected DOM elements present
- Bundle time < 2 seconds per artifact
- Prebuilt packages confirmed in bundle manifest

---

#### Task 2.1: Performance & Caching Tests
**File**: `supabase/functions/_shared/__tests__/prebuilt-performance.test.ts`
**Effort**: 6 hours
**Status**: [ ] TODO

**Checklist**:
- [ ] Create test file with performance timing capability
- [ ] Implement 4 performance test cases:
  - [ ] Prebuilt bundle time < 2 seconds
  - [ ] Dynamic bundle time 5-15 seconds (comparison)
  - [ ] Cache hit rate > 80% for repeated requests
  - [ ] Size reduction vs dynamic bundling
- [ ] Add performance timing instrumentation
- [ ] Track individual bundle times
- [ ] Calculate cache effectiveness
- [ ] Generate performance report (CSV/JSON)
- [ ] Document performance expectations per phase
- [ ] Create performance regression detection

**Dependencies**:
- Performance.now() or equivalent timing
- Bundle artifact endpoint
- Request caching logic

**Definition of Done**:
- Performance baseline established
- Cache hit rates > 80% after warmup
- Prebuilt < 2s vs dynamic 5-15s verified
- Performance report integrated into test output

---

#### Task 2.2: Cross-Browser Verification (Chrome DevTools MCP)
**File**: `.claude/scripts/test-cross-browser.sh`
**Effort**: 4 hours
**Status**: [ ] TODO

**Checklist**:
- [ ] Create bash script using Chrome DevTools MCP commands
- [ ] Test Phase 1 artifacts (forms, UI):
  - [ ] Signup form artifact loads
  - [ ] No console errors
  - [ ] Expected form elements render
  - [ ] Screenshot for baseline
- [ ] Test Phase 2 artifacts (dashboards):
  - [ ] Dashboard loads
  - [ ] Charts render (check for SVG)
  - [ ] Table displays data
  - [ ] Screenshot for baseline
- [ ] Test Phase 3 artifacts (games):
  - [ ] Canvas element present
  - [ ] Game renders without errors
  - [ ] Screenshot for baseline
- [ ] Test Phase 4 artifacts (tools):
  - [ ] Tool UI renders
  - [ ] File input available
  - [ ] Screenshot for baseline
- [ ] Verify console.errors array is empty for all
- [ ] Create baseline screenshot references
- [ ] Document screenshot expectations
- [ ] Add to CI/CD workflow

**Commands to Use**:
```bash
/chrome-status           # Verify MCP is running
/chrome-restart          # Clean restart
chrome-mcp navigate "url"
chrome-mcp screenshot "path.png"
chrome-mcp check-console-errors
chrome-mcp evaluate-script "() => { ... }"
```

**Dependencies**:
- Chrome DevTools MCP running
- Dev server on localhost:8080
- Test artifacts accessible via UI

**Definition of Done**:
- All test artifacts load without console errors
- Baseline screenshots created
- Cross-browser checklist documented
- Script integrated into CI/CD

---

#### Task 2.3: Regression Testing Suite
**File**: `supabase/functions/_shared/__tests__/prebuilt-regression.test.ts`
**Effort**: 5 hours
**Status**: [ ] TODO

**Checklist**:
- [ ] Create test file for regression validation
- [ ] Implement 3 regression test categories:
  - [ ] **Existing Artifacts**: Re-bundle last month's sample artifacts
    - [ ] Todo List with zustand
    - [ ] Weather Dashboard with recharts
    - [ ] Photo Gallery with framer-motion
  - [ ] **Version Matching**: Verify compatibility logic unchanged
    - [ ] Caret range tests
    - [ ] Tilde range tests
    - [ ] Exact version matching
  - [ ] **Package Lookups**: Verify consistent bundle selection
    - [ ] Same version ranges return same bundles
    - [ ] Fallback logic works
- [ ] Add test data for existing artifacts
- [ ] Verify no breaking changes in compatibility logic
- [ ] Document expected behavior per artifact
- [ ] Add as blocking test in CI/CD

**Dependencies**:
- Bundle artifact endpoint
- Historical artifact samples
- Version compatibility logic

**Definition of Done**:
- All existing artifacts still bundle successfully
- Version matching logic unchanged
- Package lookups return consistent results
- Test added to mandatory CI/CD checks

---

### HIGH VALUE

#### Task 3.1: Dependency Conflict Detection
**File**: `supabase/functions/_shared/__tests__/prebuilt-conflicts.test.ts`
**Effort**: 4 hours
**Status**: [ ] TODO

**Checklist**:
- [ ] Create test file for dependency conflict detection
- [ ] Implement 3 conflict test cases:
  - [ ] zustand + jotai (state managers)
  - [ ] @dnd-kit packages together (dnd-kit/core, sortable, utilities)
  - [ ] Animation libraries (framer-motion, react-spring, gsap)
- [ ] For each test:
  - [ ] Create artifact using multiple packages
  - [ ] Bundle together
  - [ ] Verify no "already loaded" warnings
  - [ ] Verify no "multiple instances" errors
  - [ ] Check functionality works
- [ ] Document compatible package combinations
- [ ] Flag any actual conflicts found

**Dependencies**:
- Bundle artifact endpoint
- Console error detection

**Definition of Done**:
- All common package combinations work together
- No conflicts detected in test suite
- Documentation of compatible package combos
- Test added to integration suite

---

#### Task 3.2: Bundle Size Accuracy Tests
**File**: `supabase/functions/_shared/__tests__/prebuilt-bundle-sizes.test.ts`
**Effort**: 3 hours
**Status**: [ ] TODO

**Checklist**:
- [ ] Create test file for size validation
- [ ] Implement 3 size test cases:
  - [ ] Manifest sizes match actual content (20% tolerance)
  - [ ] Pure packages smaller than React packages (on average)
  - [ ] Phase expansion totals match plan (±10%)
- [ ] Fetch actual package sizes from CDN
- [ ] Compare to manifest values
- [ ] Generate size report
- [ ] Document size expectations per phase
- [ ] Add size regression detection

**Dependencies**:
- HTTP requests to CDN
- Manifest data
- Size calculation utilities

**Definition of Done**:
- Bundle sizes validated (20% tolerance)
- Phase totals match plan
- Size regression detection in place
- Test added to performance validation

---

#### Task 3.3: Manifest Stability Tests
**File**: `supabase/functions/_shared/__tests__/prebuilt-stability.test.ts`
**Effort**: 2 hours
**Status**: [ ] TODO

**Checklist**:
- [ ] Create test file for manifest stability
- [ ] Implement 3 stability test cases:
  - [ ] Manifest version consistency on reload
  - [ ] Package ordering is alphabetically sorted
  - [ ] URL format unchanged across versions
- [ ] Verify deterministic behavior
- [ ] Check for any breaking changes
- [ ] Document stability guarantees

**Dependencies**:
- Manifest loading capability

**Definition of Done**:
- Manifest loads consistently
- Packages in deterministic order
- URL format stable
- Stability guarantees documented

---

#### Task 3.4: CI/CD Integration Workflow
**File**: `.github/workflows/test-prebuilt-bundles.yml`
**Effort**: 3 hours
**Status**: [ ] TODO

**Checklist**:
- [ ] Create GitHub Actions workflow
- [ ] Add workflow jobs:
  - [ ] **unit-tests**: Prebuilt-bundles.test.ts
  - [ ] **manifest-validation**: Manifest validation tests (blocking)
  - [ ] **esm-availability**: ESM URL checks (non-blocking)
  - [ ] **integration-tests**: Integration artifacts (blocking)
  - [ ] **chrome-verification**: Cross-browser tests (blocking)
  - [ ] **regression-tests**: Regression suite (blocking)
- [ ] Set blocking vs non-blocking tests
- [ ] Add test result reporting
- [ ] Configure test timeout (60s per test)
- [ ] Add artifacts/reports collection
- [ ] Create failure notifications

**Dependencies**:
- All test files created above
- GitHub Actions capability
- Test result reporting setup

**Definition of Done**:
- Workflow runs on push/PR
- All blocking tests must pass
- Test results visible in PR
- Non-blocking tests don't block merge

---

#### Task 3.5: Manual Testing Documentation
**File**: `.claude/testing/MANUAL_TESTING_GUIDE.md`
**Effort**: 2 hours
**Status**: [ ] TODO

**Checklist**:
- [ ] Document pre-phase deployment checklist:
  - [ ] Review manifest changes (30min)
  - [ ] Spot-test 3-5 artifacts per category (1h)
  - [ ] Verify no console errors (30min)
  - [ ] Check bundle times < 2s (30min)
  - [ ] Screenshot comparison (1h)
- [ ] Document post-deployment monitoring:
  - [ ] Error rate tracking (target: < 2%)
  - [ ] Cache hit rate monitoring (target: > 80%)
  - [ ] Performance metrics collection
  - [ ] User feedback review
- [ ] Create manual test templates
- [ ] Document screenshot baseline expectations
- [ ] Add rollback procedures

**Dependencies**:
- Test artifact samples
- Baseline screenshots
- Manual testing team

**Definition of Done**:
- Pre-deployment checklist documented
- Post-deployment monitoring plan
- Manual test templates created
- Rollback procedures documented

---

### ENHANCEMENT

#### Task 4.1: Analytics & Monitoring Tests
**File**: `supabase/functions/_shared/__tests__/prebuilt-analytics.test.ts`
**Effort**: 4 hours
**Status**: [ ] TODO

**Checklist**:
- [ ] Create analytics test file
- [ ] Implement 3 analytics test cases:
  - [ ] Cache hit rate tracking per package
  - [ ] Missing package detection (candidates for Phase 5)
  - [ ] Time savings measurement
- [ ] Parse bundle-artifact logs for usage data
- [ ] Generate analytics report (JSON)
- [ ] Identify most-used packages
- [ ] Identify frequently-missed packages

**Dependencies**:
- Bundle artifact function logs
- Analytics data collection

**Definition of Done**:
- Cache hit rates measurable
- Missing packages tracked
- Time savings quantified
- Analytics dashboard ready

---

## Test Data & Fixtures

### Create Test Artifact Fixtures

**Directory**: `supabase/functions/_shared/__tests__/fixtures/`

```
fixtures/
├── phase-1-form.ts              # 80 lines - Form with react-hook-form
├── phase-1-carousel.ts          # 60 lines - Carousel with embla-carousel
├── phase-2-dashboard.ts         # 100 lines - Dashboard with recharts + table
├── phase-2-flowchart.ts         # 90 lines - Flowchart with @xyflow/react
├── phase-3-game.ts              # 120 lines - Game with react-konva
├── phase-3-animation.ts         # 80 lines - Animation demo
├── phase-4-csv.ts               # 100 lines - CSV editor
├── phase-4-markdown.ts          # 80 lines - Markdown viewer
├── regression-todo.ts           # Existing artifact sample 1
├── regression-weather.ts        # Existing artifact sample 2
├── regression-gallery.ts        # Existing artifact sample 3
└── manifest-valid.json          # Golden snapshot
```

**Effort**: 3 hours to create fixtures

---

## Test Metrics & Reporting

### Test Execution Report Template

```
# Test Execution Report - Phase N

## Summary
- Tests Run: XX
- Tests Passed: XX
- Tests Failed: 0
- Tests Skipped: 0
- Success Rate: 100%
- Execution Time: XXs

## Tier 1 (Critical) - PASS
- [x] 1.1 Manifest Validation (8/8)
- [x] 1.2 ESM Availability (5/5)
- [x] 1.3 React Isolation (6/6)
- [x] 1.4 Integration Tests (4/4)
- [x] 2.1 Performance (4/4)
- [x] 2.2 Cross-Browser (4/4)
- [x] 2.3 Regression (3/3)

## Tier 2 (High) - PASS
- [x] 3.1 Conflicts (3/3)
- [x] 3.2 Bundle Sizes (3/3)
- [x] 3.3 Stability (3/3)

## Performance Metrics
- Prebuilt Bundle Time: 1.2s (target: < 2s) ✓
- Cache Hit Rate: 85% (target: > 80%) ✓
- Dynamic Bundle Time: 10.5s (baseline comparison) ✓

## Console Errors
- Phase 1 Forms: 0
- Phase 2 Dashboards: 0
- Phase 3 Games: 0
- Phase 4 Tools: 0

## Artifacts Tested
- Form (react-hook-form): ✓
- Dashboard (recharts): ✓
- Game (react-konva): ✓
- CSV Editor (papaparse): ✓
- Regression suite: ✓

## Risk Assessment
- No breaking changes detected: ✓
- Version compatibility verified: ✓
- Package conflicts: None
- Performance regression: None
- Blocker issues: None

## Approval
- [ ] QA Lead Approval
- [ ] Tech Lead Approval
- [ ] Deployment Authorized
```

---

## Implementation Timeline

### Week 1: Critical Path (Tier 1 + 2)

```
Mon:  Tasks 1.1, 1.2 (Manifest + ESM Availability)
Tue:  Tasks 1.3, 1.4 (React Hooks + Integration)
Wed:  Tasks 2.1, 2.2 (Performance + Cross-Browser)
Thu:  Task 2.3 (Regression), CI/CD integration
Fri:  Review, fixes, test refinement
```

### Week 2: High Value (Tier 3)

```
Mon:  Tasks 3.1, 3.2 (Conflicts + Sizes)
Tue:  Tasks 3.3, 3.4 (Stability + CI/CD)
Wed:  Task 3.5 (Manual Testing Docs)
Thu:  Fixture creation, baseline screenshots
Fri:  Final validation, sign-off
```

### Week 3: Enhancement (Tier 4)

```
Mon:  Task 4.1 (Analytics)
Tue:  Dashboard setup
Wed:  Baseline collection
Thu-Fri: Refinement, optimization
```

---

## Test Infrastructure Requirements

### Tools & Dependencies

- **Deno**: Runtime for edge function tests (v1.40+)
- **Deno Testing**: std lib assertions
- **Chrome DevTools MCP**: Browser automation
- **GitHub Actions**: CI/CD automation
- **Headless Browser**: For integration tests (Deno + fetch)

### Environment Setup

```bash
# Install Deno (if not present)
curl -fsSL https://deno.land/install.sh | sh

# Run tests locally
cd supabase/functions
deno task test -- _shared/__tests__/prebuilt-*.test.ts

# Run Chrome verification
bash .claude/scripts/test-cross-browser.sh

# Generate test report
deno task test -- --reporter=junit > test-results.xml
```

---

## Sign-Off Checklist

### Ready for Implementation
- [x] Test plan documented
- [x] Gap analysis complete
- [x] Priority matrix defined
- [x] Timeline estimated
- [x] Resource allocation clear

### Before Phase 1 Deployment
- [ ] All Tier 1 tests passing
- [ ] Tier 2 tests 80%+ complete
- [ ] CI/CD integration verified
- [ ] Manual testing checklist ready
- [ ] Rollback procedures tested
- [ ] Team sign-off obtained

### After Each Phase
- [ ] Test report generated
- [ ] Metrics validated
- [ ] No regressions detected
- [ ] Performance targets met
- [ ] User feedback reviewed

---

## Contact & Escalation

- **QA Lead**: Review and approve test plans
- **Test Automation**: Implement automated tests
- **DevOps**: CI/CD integration and deployment
- **Product**: Monitor success metrics and user impact

---

**Last Updated**: 2025-12-07
**Status**: Ready for Implementation
**Next Step**: Start Task 1.1 (Manifest Validation Tests)

