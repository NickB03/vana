# Prebuilt Bundles Testing Strategy

**Status**: Planning Phase
**Last Updated**: 2025-12-07
**Scope**: Comprehensive testing for 70+ prebuilt package expansion across 4 phases

---

## Executive Summary

Testing strategy for prebuilt bundle expansion from 23 to 70+ packages. The plan covers:
1. **Unit Testing** - Version resolution, manifest validation, compatibility checks
2. **Integration Testing** - Real artifacts using prebuilt packages
3. **End-to-End Testing** - Browser verification with Chrome DevTools MCP
4. **Performance Testing** - Bundle time reduction, cache hit rates
5. **Regression Testing** - Existing artifacts remain unaffected
6. **Rollback Testing** - Safe deployment and version control

---

## Gap Analysis: Current vs Proposed Strategy

### Current Test Coverage (Excellent Foundation)

**What's Already Tested** ✅
- Version parsing and comparison logic (12+ test cases)
- Caret range matching (^2.5.0 semantic rules)
- Tilde range matching (~2.5.0 semantic rules)
- Exact version matching and pre-release handling
- Bug regression tests for version compatibility
- JSON manifest structure validation

**Test Location**: `supabase/functions/_shared/__tests__/prebuilt-bundles.test.ts` (389 lines, 34 test cases)

**Coverage Assessment**:
- **Version Logic**: 95% (excellent)
- **Manifest Handling**: 40% (MISSING)
- **Package Availability**: 0% (MISSING)
- **Integration**: 0% (MISSING)
- **Performance**: 0% (MISSING)

### Major Testing Gaps

| Gap | Severity | Impact | Status |
|-----|----------|--------|--------|
| **No manifest-level tests** | HIGH | Can't detect broken entries, malformed URLs | TODO |
| **No ESM URL availability tests** | CRITICAL | Packages may be unavailable at runtime | TODO |
| **No React hook isolation tests** | CRITICAL | Could cause dual React instance errors | TODO |
| **No artifact integration tests** | CRITICAL | Can't validate packages work in real artifacts | TODO |
| **No performance baseline** | HIGH | No way to measure 5-15s improvement claim | TODO |
| **No cross-browser verification** | HIGH | May fail on Safari, Firefox | TODO |
| **No cache hit rate tracking** | MEDIUM | Can't prove 80%+ cache hit goal | TODO |
| **No dependency conflict detection** | MEDIUM | Multiple prebuilts may conflict | TODO |
| **No rollback validation** | MEDIUM | Can't safely rollback broken phases | TODO |
| **No package interaction tests** | MEDIUM | Game + Physics + Animation combo untested | TODO |

---

## Testing Checklist by Priority

### Tier 1: Critical Path (Must Pass Before Deploy)

#### 1.1 Manifest Validation Tests
**Priority**: P0 | **Effort**: 4h | **Automation**: Full

```typescript
// Location: supabase/functions/_shared/__tests__/prebuilt-bundles.test.ts

Deno.test("manifest - validates all entries have required fields", () => {
  // Assert: name, version, compatibleVersions, esmUrl, bundleUrl, size, fetchTime exist
  // Assert: No empty strings, null, or undefined values
  // Assert: All URLs are valid HTTPS
});

Deno.test("manifest - detects duplicate package names", () => {
  // Assert: No two entries have same 'name'
  // Assert: Version uniqueness within scoped packages (@radix-ui/*)
});

Deno.test("manifest - validates version semver format", () => {
  // Assert: All versions match /^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/
  // Assert: All compatibleVersions match semver or ^/~ patterns
});

Deno.test("manifest - validates package name format", () => {
  // Assert: Names match /^[@a-z0-9\-/]+$/i (npm naming convention)
  // Assert: Scoped packages start with @
});

Deno.test("manifest - validates bundle sizes are realistic", () => {
  // Assert: All sizes > 0 bytes
  // Assert: Utility packages < 100KB (zod, nanoid, immer)
  // Assert: UI packages < 50KB (sonner, embla-carousel)
  // Assert: Visualization packages < 500KB (recharts, nivo)
  // Warn: Any package > 1MB (potential configuration error)
});

Deno.test("manifest - validates fetch times are reasonable", () => {
  // Assert: All fetchTimes >= 10ms (network overhead)
  // Assert: All fetchTimes <= 5000ms (reasonable CDN latency)
  // Warn: Any > 1000ms (potential CDN health issue)
});

Deno.test("manifest - validates ESM URL patterns", () => {
  // For React packages: Assert ?external=react,react-dom present
  // For pure packages: Can have ?bundle or not
  // Assert: URLs include version number
  // Assert: URLs use https://esm.sh/ base domain
});

Deno.test("manifest - version compatibility is consistent", () => {
  // Assert: If prebuilt version is ^2.5.0, pattern includes ^2.0.0 or ^2.5.0
  // Assert: Tilde patterns are more specific than caret patterns
  // Assert: No impossible ranges (e.g., ^3.0.0 in prebuilt 2.5.0)
});

Deno.test("manifest - detects dead/malformed URLs before deploy", () => {
  // Assert: All ESM URLs can be fetched (3s timeout)
  // Assert: URLs return status 200-304
  // Assert: Responses include valid JavaScript
  // Flag for review: Any URLs that 404 or timeout
});
```

**Acceptance Criteria**:
- All 8 tests pass
- Manifest can be auto-validated in CI/CD pipeline
- Build fails if validation errors occur

---

#### 1.2 ESM Package Availability Tests
**Priority**: P0 | **Effort**: 6h | **Automation**: Partial (requires network)

```typescript
// Location: supabase/functions/_shared/__tests__/prebuilt-availability.test.ts

Deno.test("esm-availability - tests prebuilt URLs are fetchable", async () => {
  // For each package in manifest:
  // 1. Fetch esmUrl with 5s timeout
  // 2. Assert status 200 (or 304 cached)
  // 3. Assert response is valid JavaScript (contains 'export' or 'module')
  // 4. Track fetch time against manifest.fetchTime (warn if > 2x)
  // 5. Collect package availability statistics

  // Expected: 95%+ packages available
  // Report any 404 or timeout packages for investigation
});

Deno.test("esm-availability - validates React packages don't export React", () => {
  // For packages with ?external=react,react-dom:
  // 1. Fetch esmUrl
  // 2. Assert does NOT contain 'window.React ='
  // 3. Assert uses 'import React from' (will be redirected to shim)
  // 4. Assert imports work in isolation
});

Deno.test("esm-availability - checks for circular dependencies", () => {
  // For multi-package combos (zustand + immer, @dnd-kit/* packages):
  // 1. Bundle test artifacts with both packages
  // 2. Assert no "already loaded" warnings
  // 3. Assert no "multiple instances" errors
});

Deno.test("esm-availability - validates pure packages can use ?bundle", () => {
  // For packages marked pure: true (zod, immer, matter-js):
  // 1. Fetch with ?bundle parameter
  // 2. Assert returns valid bundled module
  // 3. File size should be <= manifest.size * 1.3 (some variation allowed)
});

Deno.test("esm-availability - checks CDN fallback chain works", () => {
  // Test CDN priority: esm.sh → esm.run → jsdelivr
  // 1. Mock esm.sh as unavailable
  // 2. Verify fallback to esm.run succeeds
  // 3. Verify fallback to jsdelivr succeeds
  // 4. Assert same package content from all CDNs
});
```

**Acceptance Criteria**:
- All packages fetchable from esm.sh
- No circular dependency warnings
- CDN fallback chain verified
- Can run as pre-deploy health check

---

#### 1.3 React Hook Isolation Tests
**Priority**: P0 | **Effort**: 5h | **Automation**: Full

```typescript
// Location: supabase/functions/_shared/__tests__/react-hook-isolation.test.ts

Deno.test("react-hooks - zustand doesn't cause dual instance errors", () => {
  // Create artifact with zustand store
  // Assert: No "multiple instances of React" console error
  // Assert: Store mutations work correctly
  // Assert: React.useState in same component doesn't conflict
});

Deno.test("react-hooks - react-hook-form works with external React", () => {
  // Create form artifact with react-hook-form
  // Assert: useForm hook initializes correctly
  // Assert: Form registration works
  // Assert: Validation executes without React instance errors
});

Deno.test("react-hooks - @dnd-kit packages work together", () => {
  // Create sortable list with @dnd-kit/core + @dnd-kit/sortable
  // Assert: useSortable hook initializes
  // Assert: Drag-drop listeners attach correctly
  // Assert: No "can't find hook" errors
});

Deno.test("react-hooks - @radix-ui components with hooks work", () => {
  // Test complex component: Dialog + Form + Toast
  // Assert: useDialogTrigger, useFormContext, useToast all work
  // Assert: No conflicting hook calls
});

Deno.test("react-hooks - state management works (zustand + jotai)", () => {
  // Create artifact using both zustand and jotai
  // Assert: Both state systems work independently
  // Assert: No "atom already registered" warnings
  // Assert: No React instance conflicts
});

Deno.test("react-hooks - animation hooks don't interfere", () => {
  // Create artifact with react-spring + framer-motion + gsap
  // Assert: All animation engines initialize
  // Assert: No "requestAnimationFrame" conflicts
  // Assert: useSpring hook works
  // Assert: motion.div works via framer-motion shim
  // Assert: gsap.to() works
});
```

**Acceptance Criteria**:
- All 6 tests pass
- No React instance warnings in console
- Hooks function correctly when multiple packages used

---

#### 1.4 Integration Artifact Tests
**Priority**: P0 | **Effort**: 8h | **Automation**: Full + Manual

```typescript
// Location: supabase/functions/_shared/__tests__/prebuilt-integration.test.ts

interface IntegrationTest {
  name: string;
  category: string;
  code: string;
  dependencies: Record<string, string>;
  expectedElements: string[]; // CSS selectors to verify rendered
  expectedNoConsoleErrors: boolean;
  expectedBundleTimeMs?: number;
}

// Test Suite 1: Forms (Phase 1)
Deno.test("integration - signup form with react-hook-form + zod + sonner", async () => {
  const code = `
    import { useForm } from 'react-hook-form';
    import { zodResolver } from '@hookform/resolvers/zod';
    import { z } from 'zod';
    import { Toaster, toast } from 'sonner';

    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8)
    });

    export default function SignupForm() {
      const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(schema)
      });

      const onSubmit = (data) => {
        toast.success('Account created!');
      };

      return (
        <form onSubmit={handleSubmit(onSubmit)}>
          <input {...register('email')} />
          {errors.email && <span>{errors.email.message}</span>}
          <input {...register('password')} />
          {errors.password && <span>{errors.password.message}</span>}
          <button type="submit">Sign Up</button>
          <Toaster />
        </form>
      );
    }
  `;

  const dependencies = {
    'react-hook-form': '^7.54.0',
    '@hookform/resolvers': '^3.10.0',
    'zod': '^3.24.0',
    'sonner': '^1.7.0'
  };

  // Test expectations
  const result = await bundleAndTest({ code, dependencies });

  assertEquals(result.success, true);
  assertEquals(result.hasConsoleErrors, false);
  assertEquals(result.elementExists('form'), true);
  assertEquals(result.elementExists('input'), true);
  assertEquals(result.elementExists('button'), true);
  // Should use prebuilt packages (no dynamic bundling)
  assertEquals(result.usedPrebuilt, true);
});

// Test Suite 2: Data Visualization (Phase 2)
Deno.test("integration - KPI dashboard with recharts + @tanstack/react-table", async () => {
  const code = `
    import { BarChart, Bar, XAxis, YAxis } from 'recharts';
    import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

    const data = [
      { month: 'Jan', sales: 4000 },
      { month: 'Feb', sales: 3000 },
      { month: 'Mar', sales: 5000 }
    ];

    const tableData = [
      { id: 1, name: 'Widget', revenue: 100000 },
      { id: 2, name: 'Gadget', revenue: 120000 }
    ];

    export default function Dashboard() {
      const columnHelper = createColumnHelper();
      const columns = [
        columnHelper.accessor('name'),
        columnHelper.accessor('revenue')
      ];

      const table = useReactTable({
        data: tableData,
        columns,
        getCoreRowModel: getCoreRowModel()
      });

      return (
        <div>
          <BarChart width={400} height={300} data={data}>
            <XAxis dataKey="month" />
            <YAxis />
            <Bar dataKey="sales" fill="#8884d8" />
          </BarChart>
          <table>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  `;

  const dependencies = {
    'recharts': '^2.10.0',
    '@tanstack/react-table': '^8.20.0'
  };

  const result = await bundleAndTest({ code, dependencies });

  assertEquals(result.success, true);
  assertEquals(result.hasConsoleErrors, false);
  assertEquals(result.elementExists('svg'), true); // Chart renders
  assertEquals(result.elementExists('table'), true);
  assertEquals(result.usedPrebuilt, true);
});

// Test Suite 3: Games (Phase 3)
Deno.test("integration - tic-tac-toe with react-konva + matter-js", async () => {
  const code = `
    import { Stage, Layer, Rect, Text } from 'react-konva';
    import Konva from 'konva';

    export default function TicTacToe() {
      const [board, setBoard] = useState(Array(9).fill(null));

      const handleClick = (index) => {
        const newBoard = [...board];
        newBoard[index] = 'X';
        setBoard(newBoard);
      };

      return (
        <Stage width={300} height={300}>
          <Layer>
            {board.map((cell, i) => (
              <Rect
                key={i}
                x={(i % 3) * 100}
                y={Math.floor(i / 3) * 100}
                width={100}
                height={100}
                stroke="black"
                onClick={() => handleClick(i)}
              />
            ))}
          </Layer>
        </Stage>
      );
    }
  `;

  const dependencies = {
    'react-konva': '^18.2.0',
    'konva': '^9.3.0',
    'matter-js': '^0.20.0'
  };

  const result = await bundleAndTest({ code, dependencies });

  assertEquals(result.success, true);
  assertEquals(result.hasConsoleErrors, false);
  assertEquals(result.elementExists('canvas'), true);
  assertEquals(result.usedPrebuilt, true);
});

// Test Suite 4: Tools (Phase 4)
Deno.test("integration - CSV editor with papaparse + file-saver", async () => {
  const code = `
    import Papa from 'papaparse';
    import { saveAs } from 'file-saver';

    export default function CSVEditor() {
      const handleUpload = (e) => {
        Papa.parse(e.target.files[0], {
          header: true,
          complete: (results) => {
            console.log(results.data);
          }
        });
      };

      const handleDownload = () => {
        const csv = 'id,name\\n1,Alice\\n2,Bob';
        saveAs(new Blob([csv]), 'data.csv');
      };

      return (
        <div>
          <input type="file" onChange={handleUpload} />
          <button onClick={handleDownload}>Download</button>
        </div>
      );
    }
  `;

  const dependencies = {
    'papaparse': '^5.4.0',
    'file-saver': '^2.0.5'
  };

  const result = await bundleAndTest({ code, dependencies });

  assertEquals(result.success, true);
  assertEquals(result.hasConsoleErrors, false);
  assertEquals(result.elementExists('input[type="file"]'), true);
  assertEquals(result.elementExists('button'), true);
  assertEquals(result.usedPrebuilt, true);
});
```

**Acceptance Criteria**:
- All 4 category integration tests pass
- Zero console errors for each test
- All prebuilt packages verified in bundles
- Bundle time < 2s for cached packages

---

### Tier 2: High Priority (Before Deployment)

#### 2.1 Performance & Caching Tests
**Priority**: P1 | **Effort**: 6h | **Automation**: Full

```typescript
// Location: supabase/functions/_shared/__tests__/prebuilt-performance.test.ts

Deno.test("performance - prebuilt bundle time is < 2 seconds", async () => {
  const artifactWithPrebuilt = {
    code: `import { useForm } from 'react-hook-form'; ...`,
    dependencies: { 'react-hook-form': '^7.54.0', 'zod': '^3.24.0' }
  };

  const startTime = performance.now();
  const result = await bundleArtifact(artifactWithPrebuilt);
  const endTime = performance.now();

  const bundleTime = endTime - startTime;
  assertEquals(bundleTime < 2000, true, `Bundle took ${bundleTime}ms, expected < 2000ms`);
  assertEquals(result.success, true);
});

Deno.test("performance - dynamic bundle time is 5-15 seconds", async () => {
  // Use a package NOT in prebuilt list
  const artifactWithDynamic = {
    code: `import { Calendar } from '@react-big-calendar'; ...`,
    dependencies: { '@react-big-calendar': '^1.8.0' }
  };

  const startTime = performance.now();
  const result = await bundleArtifact(artifactWithDynamic);
  const endTime = performance.now();

  const bundleTime = endTime - startTime;
  assertEquals(bundleTime > 5000, true);
  assertEquals(bundleTime < 15000, true);
});

Deno.test("performance - cache hit rate for prebuilt packages", async () => {
  // Bundle same artifact 10 times
  // First should be slower (network fetch), rest should be cached
  const results = [];

  for (let i = 0; i < 10; i++) {
    const startTime = performance.now();
    const result = await bundleArtifact(testArtifact);
    const endTime = performance.now();
    results.push(endTime - startTime);
  }

  // After warmup, last 5 should be significantly faster
  const avgWarmup = (results[5] + results[6] + results[7] + results[8] + results[9]) / 5;
  assertEquals(avgWarmup < 500, true, `Warmup time ${avgWarmup}ms should be < 500ms`);
});

Deno.test("performance - prebuilt packages reduce bundle size", async () => {
  const manifest = await getPrebuiltManifest();

  // Calculate total size if packages were bundled dynamically
  const estimatedDynamicSize = manifest.packages.reduce((sum, pkg) => sum + pkg.size * 3, 0); // 3x for bundler overhead

  // Prebuilt bundles should reduce this significantly
  assertEquals(estimatedDynamicSize > 500000, true, "Should save significant bytes");
});
```

**Acceptance Criteria**:
- Prebuilt bundle time < 2 seconds
- Cache hit rate > 80% for repeated requests
- Performance improvement measurable vs dynamic bundling

---

#### 2.2 Cross-Browser Verification Tests
**Priority**: P1 | **Effort**: 4h | **Automation**: Chrome DevTools MCP

```bash
# Location: .claude/scripts/test-cross-browser.sh
# Uses Chrome DevTools MCP to verify artifacts work across browsers

#!/bin/bash

# Test artifact loading in Chrome
chrome-mcp start

# Test Phase 1 artifacts (forms, UI)
/chrome-mcp navigate "http://localhost:8080?test=form-artifact"
/chrome-mcp screenshot ".screenshots/chrome-form.png"
/chrome-mcp check-console-errors  # Should be empty

# Test Phase 2 artifacts (dashboards)
/chrome-mcp navigate "http://localhost:8080?test=dashboard-artifact"
/chrome-mcp screenshot ".screenshots/chrome-dashboard.png"

# Test Phase 3 artifacts (games)
/chrome-mcp navigate "http://localhost:8080?test=game-artifact"
/chrome-mcp screenshot ".screenshots/chrome-game.png"
/chrome-mcp evaluate-script "() => { return document.querySelector('canvas') !== null }"
# Expected: true

# Test Phase 4 artifacts (tools)
/chrome-mcp navigate "http://localhost:8080?test=tool-artifact"
/chrome-mcp screenshot ".screenshots/chrome-tool.png"
```

**Acceptance Criteria**:
- All test artifacts render without console errors
- Screenshots match baseline expectations
- No React instance warnings

---

#### 2.3 Regression Testing Suite
**Priority**: P1 | **Effort**: 5h | **Automation**: Full

```typescript
// Location: supabase/functions/_shared/__tests__/prebuilt-regression.test.ts

Deno.test("regression - existing artifacts still work with new manifest", async () => {
  // Re-run last month's artifact sample
  const existingArtifacts = [
    { title: 'Todo List', dependencies: { 'zustand': '^4.0.0' } },
    { title: 'Weather Dashboard', dependencies: { 'recharts': '^2.0.0' } },
    { title: 'Photo Gallery', dependencies: { 'framer-motion': '^10.0.0' } }
  ];

  for (const artifact of existingArtifacts) {
    const result = await bundleArtifact(artifact);
    assertEquals(result.success, true, `${artifact.title} should still work`);
    assertEquals(result.hasConsoleErrors, false);
  }
});

Deno.test("regression - version ranges still match correctly", async () => {
  // Verify compatibility logic didn't break
  const testCases = [
    { requested: '^2.5.0', prebuilt: '2.6.0', pattern: '^2.0.0', shouldMatch: true },
    { requested: '^2.5.0', prebuilt: '3.0.0', pattern: '^2.0.0', shouldMatch: false },
    { requested: '~2.5.0', prebuilt: '2.5.9', pattern: '~2.5.0', shouldMatch: true }
  ];

  for (const test of testCases) {
    const matches = isVersionCompatible(test.requested, test.prebuilt, [test.pattern]);
    assertEquals(matches, test.shouldMatch, `Version matching failed for ${test.requested} vs ${test.prebuilt}`);
  }
});

Deno.test("regression - package lookups return correct bundles", async () => {
  const testLookups = [
    { name: 'zustand', version: '^5.0.0', expectedFound: true },
    { name: 'react-hook-form', version: '^7.54.0', expectedFound: true },
    { name: 'nonexistent-package-12345', version: '^1.0.0', expectedFound: false }
  ];

  for (const lookup of testLookups) {
    const bundle = getPrebuiltBundle(lookup.name, lookup.version);
    assertEquals(!!bundle, lookup.expectedFound);
  }
});

Deno.test("regression - bundle URLs are stable across versions", async () => {
  // Fetch same package twice, verify URL consistency
  const url1 = getPrebuiltBundle('react-hook-form', '^7.50.0')?.esmUrl;
  const url2 = getPrebuiltBundle('react-hook-form', '^7.54.0')?.esmUrl;

  // Both should resolve to same prebuilt version
  assertEquals(url1, url2, "Same package with compatible versions should use same bundle");
});
```

**Acceptance Criteria**:
- All existing artifacts bundle successfully
- Version matching logic unchanged
- Package lookups return consistent results

---

### Tier 3: Important (Should Complete)

#### 3.1 Dependency Conflict Detection
**Priority**: P2 | **Effort**: 4h | **Automation**: Full

```typescript
// Location: supabase/functions/_shared/__tests__/prebuilt-conflicts.test.ts

Deno.test("conflicts - zustand + jotai don't conflict", async () => {
  const artifact = {
    code: `
      import { create } from 'zustand';
      import { atom, useAtom } from 'jotai';

      const store = create(set => ({ count: 0 }));
      const countAtom = atom(0);

      export default function App() {
        const [count] = useAtom(countAtom);
        return <div>{count}</div>;
      }
    `,
    dependencies: {
      'zustand': '^5.0.0',
      'jotai': '^2.11.0'
    }
  };

  const result = await bundleAndTest(artifact);
  assertEquals(result.success, true);
  assertEquals(result.consoleErrors, []);
});

Deno.test("conflicts - @dnd-kit packages work together", async () => {
  const artifact = {
    code: `
      import { DndContext } from '@dnd-kit/core';
      import { SortableContext, useSortable } from '@dnd-kit/sortable';
      import { useDroppable } from '@dnd-kit/core';

      // Implementation...
    `,
    dependencies: {
      '@dnd-kit/core': '^6.3.0',
      '@dnd-kit/sortable': '^9.0.0',
      '@dnd-kit/utilities': '^3.2.0'
    }
  };

  const result = await bundleAndTest(artifact);
  assertEquals(result.success, true);
});

Deno.test("conflicts - animation libraries don't interfere", async () => {
  const artifact = {
    code: `
      import { motion } from 'framer-motion';
      import { useSpring, animated } from 'react-spring';
      import gsap from 'gsap';

      // All three used in same component
    `,
    dependencies: {
      'framer-motion': '^10.0.0',
      'react-spring': '^9.7.0',
      'gsap': '^3.12.0'
    }
  };

  const result = await bundleAndTest(artifact);
  assertEquals(result.success, true);
});
```

**Acceptance Criteria**:
- No package conflicts detected
- Combined package bundles work correctly
- No "already loaded" or "multiple instances" warnings

---

#### 3.2 Bundle Size Accuracy Tests
**Priority**: P2 | **Effort**: 3h | **Automation**: Full

```typescript
// Location: supabase/functions/_shared/__tests__/prebuilt-bundle-sizes.test.ts

Deno.test("bundle-sizes - manifest sizes match actual content", async () => {
  const manifest = await getPrebuiltManifest();

  for (const pkg of manifest.packages) {
    const response = await fetch(pkg.esmUrl);
    const content = await response.arrayBuffer();
    const actualSize = content.byteLength;

    // Allow 20% variance (some gzip variance)
    const tolerance = pkg.size * 0.2;
    assertEquals(
      actualSize < pkg.size + tolerance,
      true,
      `${pkg.name} size mismatch: manifest=${pkg.size}, actual=${actualSize}`
    );
  }
});

Deno.test("bundle-sizes - pure packages are smaller than React packages", () => {
  const manifest = getPrebuiltManifest();
  const purePackages = manifest.packages.filter(p => isPure(p.name));
  const reactPackages = manifest.packages.filter(p => !isPure(p.name));

  const avgPureSize = purePackages.reduce((sum, p) => sum + p.size, 0) / purePackages.length;
  const avgReactSize = reactPackages.reduce((sum, p) => sum + p.size, 0) / reactPackages.length;

  assertEquals(avgPureSize < avgReactSize, true, "Pure packages should generally be smaller");
});

Deno.test("bundle-sizes - Phase expansion totals match plan", () => {
  // Phase 1: +150KB gzipped
  // Phase 2: +200KB gzipped
  // Phase 3: +350KB gzipped
  // Phase 4: +200KB gzipped

  const phase1Pkgs = ['zustand', 'immer', 'react-hook-form', 'zod', 'sonner', 'embla-carousel-react', 'react-spring', '@tanstack/react-table', 'nanoid', '@formkit/auto-animate', 'react-loading-skeleton'];

  const totalSize = getPrebuiltManifest().packages
    .filter(p => phase1Pkgs.includes(p.name))
    .reduce((sum, p) => sum + p.size, 0);

  assertEquals(totalSize <= 160000, true, `Phase 1 should be ~150KB, got ${totalSize}`);
});
```

**Acceptance Criteria**:
- Bundle sizes within 20% of manifest specification
- Phase expansion totals match estimated plan
- No unexpected size bloat

---

#### 3.3 Manifest Stability Tests
**Priority**: P2 | **Effort**: 2h | **Automation**: Full

```typescript
// Location: supabase/functions/_shared/__tests__/prebuilt-stability.test.ts

Deno.test("stability - manifest version doesn't break on npm updates", () => {
  // Load manifest multiple times (simulate reload)
  const manifest1 = getPrebuiltManifest();
  const manifest2 = getPrebuiltManifest();

  assertEquals(manifest1.version, manifest2.version);
  assertEquals(manifest1.packages.length, manifest2.packages.length);
});

Deno.test("stability - package order is consistent", () => {
  // Manifest should be consistently sorted (prevents diffs)
  const manifest = getPrebuiltManifest();
  const names = manifest.packages.map(p => p.name);

  const sorted = [...names].sort();
  assertEquals(names, sorted, "Package list should be alphabetically sorted");
});

Deno.test("stability - no breaking changes in URL format", () => {
  // ESM URLs should maintain backwards compatibility
  const manifest = getPrebuiltManifest();

  for (const pkg of manifest.packages) {
    // URLs should include version
    assertEquals(pkg.esmUrl.includes(pkg.version), true);
    // URLs should use esm.sh
    assertEquals(pkg.esmUrl.startsWith('https://esm.sh/'), true);
  }
});
```

**Acceptance Criteria**:
- Manifest loads consistently
- Packages in deterministic order
- URL format stable across versions

---

### Tier 4: Nice to Have (Enhancement Opportunities)

#### 4.1 Analytics & Monitoring Tests
**Priority**: P3 | **Effort**: 4h | **Automation**: Partial

```typescript
// Location: supabase/functions/_shared/__tests__/prebuilt-analytics.test.ts

Deno.test("analytics - can track cache hit rates per package", async () => {
  // Track prebuilt lookups (cache hits vs misses)
  // Expected: 80%+ cache hit rate for top 20 packages

  const stats = analyzePrebuiltUsage();
  assertEquals(stats.cacheHitRate > 0.8, true);
});

Deno.test("analytics - can identify missing packages", async () => {
  // Track requested packages NOT in prebuilt list
  // Use data to identify candidates for Phase 5

  const missingRequests = analyzeMissingPackages();
  assertEquals(missingRequests.length > 0, true, "Should have data on missing packages");
});

Deno.test("analytics - can measure time savings", async () => {
  // Compare prebuilt bundle time vs estimated dynamic time
  // Expected: 10-15x faster for prebuilt

  const savings = calculateTimeSavings();
  assertEquals(savings.improvement > 10, true);
});
```

**Acceptance Criteria**:
- Cache hit rates measurable
- Missing packages tracked for future phases
- Time savings quantified

---

## Automated Test Execution Strategy

### CI/CD Integration Points

```yaml
# .github/workflows/test-prebuilt-bundles.yml

name: Prebuilt Bundles Test Suite
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run unit tests
        run: cd supabase/functions && deno task test -- _shared/__tests__/prebuilt-bundles.test.ts

  manifest-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate manifest
        run: deno run --allow-read supabase/functions/_shared/__tests__/prebuilt-bundles.test.ts

  esm-availability:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check ESM URLs (may timeout, non-blocking)
        run: deno run --allow-net supabase/functions/_shared/__tests__/prebuilt-availability.test.ts
        continue-on-error: true

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Start dev server
        run: npm run dev &
      - name: Run integration tests
        run: deno task test -- _shared/__tests__/prebuilt-integration.test.ts

  chrome-verification:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Start dev server
        run: npm run dev &
      - name: Chrome DevTools verification
        run: bash .claude/scripts/test-cross-browser.sh

  regression-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run regression suite
        run: deno task test -- _shared/__tests__/prebuilt-regression.test.ts
```

---

## Manual Testing Checklist

### Before Each Phase Deployment

| Task | Owner | Time | Status |
|------|-------|------|--------|
| Review manifest changes | Senior Dev | 30min | TODO |
| Spot-test 3-5 artifacts per category | QA | 1h | TODO |
| Verify Chrome console has no errors | QA | 30min | TODO |
| Check bundle times < 2s | DevOps | 30min | TODO |
| Confirm cache hit rates > 80% | Analytics | 30min | TODO |
| Screenshot comparison vs baseline | QA | 1h | TODO |
| Network throttling test (Slow 3G) | QA | 30min | TODO |
| Mobile device test (iOS Safari) | QA | 30min | TODO |

### After Each Phase Deployment

| Task | Owner | Time | Status |
|------|-------|------|--------|
| Monitor error rates (target: < 2%) | DevOps | 1h | TODO |
| Track cache hit metrics | Analytics | 30min | TODO |
| Review user feedback | Support | 1h | TODO |
| Collect performance data | DevOps | 1h | TODO |
| Rollback readiness check | DevOps | 30min | TODO |

---

## Test Data & Artifacts

### Sample Test Artifacts

**Location**: `supabase/functions/_shared/__tests__/fixtures/`

```
fixtures/
├── phase-1-form.ts          # Form with react-hook-form + zod + sonner
├── phase-1-carousel.ts      # Carousel with embla-carousel-react
├── phase-2-dashboard.ts     # Dashboard with recharts + @tanstack/react-table
├── phase-2-flowchart.ts     # Flowchart with @xyflow/react
├── phase-3-game.ts          # Game with react-konva + matter-js
├── phase-3-animation.ts     # Animation with react-spring + gsap
├── phase-4-csv-editor.ts    # CSV editor with papaparse + file-saver
├── phase-4-markdown.ts      # Markdown with prism-react-renderer
├── existing-artifact-1.ts   # Regression test case
├── existing-artifact-2.ts   # Regression test case
└── manifest-valid.json      # Golden snapshot of valid manifest
```

### Performance Baseline

```
# .claude/benchmarks/prebuilt-baseline.json

{
  "phase_1": {
    "expected_bundle_time_ms": 1500,
    "expected_cache_hit_rate": 0.85,
    "estimated_size_reduction": "200KB"
  },
  "phase_2": {
    "expected_bundle_time_ms": 1500,
    "expected_cache_hit_rate": 0.85,
    "estimated_size_reduction": "250KB"
  },
  "phase_3": {
    "expected_bundle_time_ms": 2000,
    "expected_cache_hit_rate": 0.80,
    "estimated_size_reduction": "400KB"
  },
  "phase_4": {
    "expected_bundle_time_ms": 1500,
    "expected_cache_hit_rate": 0.85,
    "estimated_size_reduction": "200KB"
  }
}
```

---

## Rollback Testing Procedures

### Phase Rollback Scenarios

```bash
# Location: .claude/scripts/test-rollback.sh

#!/bin/bash

# Scenario 1: Phase 3 (games) breaks existing artifacts
git checkout HEAD~1 supabase/functions/_shared/prebuilt-bundles.json
npm run test  # Should pass with previous manifest

# Scenario 2: Quick rollback test
# 1. Deploy Phase N
npm run build:phase-n
./scripts/deploy-simple.sh staging

# 2. Run smoke tests
deno task test -- prebuilt-regression.test.ts

# 3. If failed, rollback
git revert HEAD
./scripts/deploy-simple.sh staging

# 4. Verify old code works
deno task test -- prebuilt-regression.test.ts
```

---

## Success Metrics & Acceptance Criteria

### Go/No-Go Criteria Per Phase

| Phase | Tests Must Pass | Metrics Target | Failure = Rollback |
|-------|-----------------|-----------------|------------------|
| **Phase 1** | Tier 1 + Tier 2 | Bundle time < 2s, cache hit > 80%, 0 console errors | Yes |
| **Phase 2** | Tier 1 + Tier 2 | Bundle time < 2s, cache hit > 80%, 0 console errors | Yes |
| **Phase 3** | Tier 1 + Tier 2 | Bundle time < 2.5s, cache hit > 75%, 0 console errors | Yes |
| **Phase 4** | Tier 1 + Tier 2 | Bundle time < 2s, cache hit > 80%, 0 console errors | Yes |

### Overall Success Criteria

- **Artifact Error Rate**: < 2% (was 5%)
- **Average Bundle Time (Prebuilt)**: < 2 seconds (was 10-15s)
- **Cache Hit Rate**: > 80% (was 40%)
- **Artifact Type Coverage**: 80%+ of requests use prebuilt packages
- **Zero Regressions**: All existing artifacts work identically
- **Performance Improvement**: 5-15x faster for common patterns

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Broken ESM URLs** | Medium | High | Automated availability check before deploy |
| **React hook conflicts** | Medium | High | React isolation tests + manual verification |
| **Version matching bugs** | Low | High | Comprehensive regression test suite |
| **Cache incoherence** | Low | Medium | CDN fallback validation tests |
| **Performance regression** | Low | Medium | Performance baseline + trending analysis |
| **Dependency conflicts** | Medium | Medium | Conflict detection tests for multi-package combos |

---

## Timeline & Resource Allocation

| Phase | Tests | Effort | Status | Owner |
|-------|-------|--------|--------|-------|
| **Tier 1 (Critical Path)** | 1.1-1.4 | 23h | TODO | QA Lead |
| **Tier 2 (High Priority)** | 2.1-2.3 | 15h | TODO | QA Engineer |
| **Tier 3 (Important)** | 3.1-3.3 | 9h | TODO | QA Engineer |
| **Tier 4 (Enhancement)** | 4.1 | 4h | TODO | Analytics |
| **Manual Testing** | All phases | 8h per phase | TODO | QA Team |
| **Total** | 40 tests | 59h | TODO | QA Team |

---

## Appendix: Test Utility Functions

### Helper Functions Needed

```typescript
// Location: supabase/functions/_shared/__tests__/test-utils.ts

export async function bundleAndTest(artifact: {
  code: string;
  dependencies: Record<string, string>;
}): Promise<{
  success: boolean;
  hasConsoleErrors: boolean;
  elementExists: (selector: string) => boolean;
  usedPrebuilt: boolean;
  consoleErrors: string[];
}> {
  // 1. Call bundle-artifact endpoint
  // 2. Render result in headless browser
  // 3. Collect console messages
  // 4. Check DOM for expected elements
  // 5. Verify prebuilt packages were used
}

export async function getPrebuiltManifest(): Promise<PrebuiltManifest> {
  // Load from JSON with type safety
}

export function isVersionCompatible(
  requested: string,
  prebuilt: string,
  patterns: string[]
): boolean {
  // Reuse logic from prebuilt-bundles.ts
}

export function analyzePrebuiltUsage(): {
  cacheHitRate: number;
  topPackages: string[];
  errorRate: number;
} {
  // Parse logs from bundle-artifact function
}

export function calculateTimeSavings(): {
  improvement: number;
  avgPrebuiltTime: number;
  avgDynamicTime: number;
} {
  // Compare metrics
}
```

---

## Sign-Off Checklist

- [ ] All Tier 1 tests written and passing
- [ ] Manifest validation integrated into CI/CD
- [ ] Integration tests cover all 4 categories
- [ ] Performance baseline established
- [ ] Cross-browser verification documented
- [ ] Regression test suite complete
- [ ] Rollback procedures tested
- [ ] Test coverage report generated
- [ ] Team review and approval
- [ ] Ready for Phase 1 deployment

