# Truth Verification System - Implementation Guide

## Quick Start

The Truth Verification System is now integrated into your Vana project. Use these commands to ensure each PR in your 6-PR plan meets specifications and prevents regressions.

### Core Commands

```bash
# Run complete truth verification for a PR
npm run verify:truth-system stage pre-implementation --pr=123
npm run verify:truth-system stage implementation --pr=123  
npm run verify:truth-system stage post-implementation --pr=123
npm run verify:truth-system stage regression --pr=123

# Run specific verifications
npm run verify:components          # Component compliance
npm run verify:performance        # Performance regression check
npm run test:a11y                 # Accessibility audit
npm run verify:all                # All verifications

# Capture baseline before starting
npm run verify:baseline-capture
```

## Per-PR Workflow

### 1. Pre-Implementation Phase

**Before starting any PR work:**

```bash
# Capture performance baseline (run once)
npm run verify:baseline-capture

# Verify requirements for specific PR
npm run verify:truth-system stage pre-implementation --pr=PR-ID

# Check PR requirements compliance
npm run verify:requirements
```

**Truth Gates Checked:**
- ✅ Requirements compliance with specification
- ✅ Baseline metrics captured
- ✅ Test plan generated
- ✅ Dependencies validated

### 2. Implementation Phase

**During active development:**

```bash
# Run on each commit
npm run verify:truth-system stage implementation --pr=PR-ID

# Watch mode for continuous verification
npm run test:watch
```

**Truth Gates Checked:**
- ✅ Code quality standards (ESLint, TypeScript)
- ✅ shadcn component compliance
- ✅ Unit test coverage (≥85%)
- ✅ Component API validation

### 3. Post-Implementation Phase

**Before submitting PR:**

```bash
# Complete post-implementation verification
npm run verify:truth-system stage post-implementation --pr=PR-ID

# Run all verification checks
npm run verify:all
```

**Truth Gates Checked:**
- ✅ End-to-end functionality tests
- ✅ Performance regression check
- ✅ Accessibility compliance (WCAG AA)
- ✅ Cross-browser compatibility

### 4. Regression Phase

**Before merging PR:**

```bash
# Cross-PR impact analysis
npm run verify:truth-system stage regression --pr=PR-ID

# Verify rollback procedures
npm run verify:rollback
```

**Truth Gates Checked:**
- ✅ Cross-PR impact analysis
- ✅ Integration test matrix
- ✅ Rollback verification
- ✅ State consistency checks

## File Structure

```
verification/
├── baseline/
│   ├── baseline.json                    # Performance baseline
│   └── performance-baseline.json       # Detailed performance metrics
├── reports/
│   ├── verification-*.json             # Truth verification reports
│   ├── performance-report-*.json       # Performance reports
│   └── component-verification-report.json
└── scripts/
    ├── truth-verify.js                  # Main verification system
    ├── verify-components.js             # Component compliance checker
    └── verify-performance.js            # Performance regression checker
```

## Truth Gates Overview

### Pre-Implementation Gates
| Gate | Blocking | Description |
|------|----------|-------------|
| `requirements-compliance` | ✅ | PR requirements match specification |
| `baseline-capture` | ✅ | Performance and functionality baseline |

### Implementation Gates
| Gate | Blocking | Description |
|------|----------|-------------|
| `code-quality` | ✅ | ESLint, TypeScript validation |
| `component-compliance` | ✅ | shadcn component standards |
| `unit-tests` | ✅ | Test coverage ≥85% |

### Post-Implementation Gates
| Gate | Blocking | Description |
|------|----------|-------------|
| `functionality-tests` | ✅ | End-to-end validation |
| `performance-check` | ✅ | Performance regression check |
| `accessibility-audit` | ✅ | WCAG AA compliance |

### Regression Gates
| Gate | Blocking | Description |
|------|----------|-------------|
| `cross-pr-impact` | ✅ | Cross-PR dependency analysis |
| `rollback-verification` | ❌ | Rollback procedure validation |

## Performance Thresholds

```javascript
const THRESHOLDS = {
  lighthouse: {
    performance: 90,    // Lighthouse performance score
    accessibility: 95,  // Lighthouse accessibility score
    bestPractices: 90,  // Lighthouse best practices score
    seo: 90,           // Lighthouse SEO score
  },
  coreWebVitals: {
    LCP: 2500,         // Largest Contentful Paint (ms)
    FID: 100,          // First Input Delay (ms)
    CLS: 0.1,          // Cumulative Layout Shift
  },
  bundle: {
    maxIncrease: 5,    // Max bundle size increase (%)
    maxGzipSize: 250,  // Max gzip size (KB)
  },
  quality: {
    coverage: 85,      // Test coverage (%)
    eslintWarnings: 0, // ESLint warnings
    typeErrors: 0,     // TypeScript errors
  },
};
```

## Component Verification Rules

### shadcn Compliance
- ✅ Must use CLI-installed components (`npx shadcn add`)
- ✅ No manual component creation
- ✅ Proper import paths (`@/components/ui/`)
- ❌ No direct Radix UI imports (use shadcn wrappers)
- ❌ No inline styles
- ❌ No `dangerouslySetInnerHTML`

### Accessibility Standards
- ✅ Semantic HTML elements (`main`, `section`, `article`, etc.)
- ✅ ARIA labels for interactive elements
- ✅ Alt text for images
- ✅ Keyboard navigation support
- ✅ Screen reader compatibility

### Performance Standards
- ✅ Files under 500 lines
- ✅ Proper React optimizations (`React.memo`, `useMemo`, `useCallback`)
- ✅ TypeScript interfaces for all props
- ✅ No memory leaks

## CodeRabbit Integration

The truth verification system integrates with CodeRabbit reviews:

### Automatic Triggers
- Runs on every PR submission
- Checks on file changes matching patterns
- Validates against all truth gates
- Generates detailed reports

### Review Configuration
```yaml
# .coderabbit.yml
reviews:
  auto_review: true
  draft_review: true
  
checks:
  - name: 'Truth Verification Gates'
    path: 'scripts/truth-verify.js'
    required: true
    
rules:
  - pattern: '**/*.tsx'
    reviewers: ['ui-team', 'accessibility-team']
```

## Troubleshooting

### Common Issues

**Truth verification fails with "No baseline found":**
```bash
# Capture baseline first
npm run verify:baseline-capture
```

**Component verification fails on shadcn compliance:**
```bash
# Check shadcn configuration
npx shadcn info

# Verify components.json exists
ls frontend/components.json

# Reinstall component if needed
npx shadcn add button --overwrite
```

**Performance verification timeout:**
```bash
# Start dev server manually first
npm run dev

# Then run verification in another terminal
npm run verify:performance
```

**Accessibility tests fail:**
```bash
# Install axe-core if missing
npm install --save-dev @axe-core/cli

# Run accessibility tests
npm run test:a11y
```

### Debug Commands

```bash
# Show available truth gates
node scripts/truth-verify.js gates

# Test individual components
node scripts/verify-components.js single src/components/ui/button.tsx

# Check performance metrics only
node scripts/verify-performance.js lighthouse
```

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
name: Truth Verification

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: 'frontend/package-lock.json'
      
      - name: Install dependencies
        run: |
          npm install
          cd frontend && npm install
      
      - name: Run truth verification
        run: |
          npm run verify:baseline-capture
          npm run verify:all
          
      - name: Upload verification reports
        uses: actions/upload-artifact@v4
        with:
          name: verification-reports
          path: verification/reports/
```

## Custom Gate Development

To add custom truth gates:

```javascript
// In scripts/truth-verify.js
const CUSTOM_GATES = {
  'custom-security-check': {
    stage: STAGES.IMPLEMENTATION,
    blocking: true,
    command: 'npm run security:scan',
    description: 'Custom security vulnerability scan',
  },
};
```

## Success Metrics Dashboard

Track these KPIs:

- **Truth Gate Pass Rate**: >95%
- **Regression Incidents**: 0
- **Performance Degradation**: <5%
- **Accessibility Compliance**: 100%
- **Code Coverage**: >85%
- **Review Cycle Time**: <24 hours

## Support and Maintenance

### Regular Maintenance Tasks

```bash
# Weekly baseline updates
npm run verify:baseline-capture

# Monthly threshold reviews
# Review and adjust thresholds in scripts/

# Quarterly process improvements  
# Analyze verification reports for patterns
```

### Getting Help

1. Check the truth verification logs in `verification/reports/`
2. Run individual verification components to isolate issues
3. Review the detailed documentation in `/docs/truth-verification-system.md`
4. Check component compliance with `npm run verify:components`

The truth verification system ensures your 6-PR UI fix implementation maintains quality, performance, and accessibility standards while preventing regressions.