# Comprehensive Prebuilt Bundle Expansion Plan

**Created**: 2025-12-07
**Status**: Planning
**Goal**: Expand prebuilt bundles to cover 80%+ of artifact dependency requests across all artifact categories

---

## Executive Summary

This plan expands the prebuilt bundle system from **23 packages** to **70+ packages**, covering:
- **Games & Interactive**: Canvas, physics, animation, audio
- **Data Visualization**: Charts, diagrams, maps, tables
- **Web Tools**: Editors, file handling, forms, drag-and-drop
- **UI Components**: Toasts, carousels, loaders, icons

**Estimated Impact**: Reduce artifact generation time by **5-15 seconds** for 60%+ of artifacts.

---

## Current State

### Already Prebuilt (23 packages)
| Category | Packages |
|----------|----------|
| **Utilities** | date-fns, clsx, class-variance-authority, tailwind-merge, uuid |
| **Radix UI** | dialog, dropdown-menu, select, tabs, tooltip, popover, accordion, checkbox, radio-group, switch, slider, scroll-area, avatar, progress, separator |
| **React Libs** | recharts, lucide-react, @tanstack/react-query |

### UMD Globals (Already Loaded)
- React, ReactDOM, PropTypes
- framer-motion (v10)
- canvas-confetti

---

## Package Expansion by Artifact Category

### Category 1: Games & Interactive Experiences

#### Tier 1 - Core Game Libraries (HIGH PRIORITY)

| Package | Bundle Size | Pure? | Use Cases | Priority |
|---------|-------------|-------|-----------|----------|
| **react-konva** | ~98KB gzip | No | Card games, puzzles, 2D games, board games | **P0** |
| **@use-gesture/react** | ~2KB gzip | No | Touch controls, drag interactions, mobile games | **P0** |
| **matter-js** | ~87KB | Yes | Physics puzzles, platformers, ragdoll games | **P0** |
| **react-spring** | ~19KB gzip | No | Physics animations, smooth transitions | **P0** |

#### Tier 2 - Advanced Game Libraries (MEDIUM PRIORITY)

| Package | Bundle Size | Pure? | Use Cases | Priority |
|---------|-------------|-------|-----------|----------|
| **@pixi/react** | ~222KB gzip | No | Particle effects, WebGL games, performance-critical | **P1** |
| **gsap** | ~23KB gzip | Yes | Timeline animations, cinematic sequences | **P1** |
| **howler** | ~7KB gzip | Yes | Game audio, SFX, background music | **P1** |
| **nipplejs** | Small | Yes | Virtual joysticks, mobile controls | **P2** |
| **planck-js** | Small | Yes | Box2D physics (alternative to matter-js) | **P2** |

#### Tier 3 - Specialized (LOW PRIORITY - Large bundles)

| Package | Bundle Size | Pure? | Use Cases | Priority |
|---------|-------------|-------|-----------|----------|
| **@react-three/fiber** | ~155KB+ | No | 3D games, WebGL experiences | **P3** |
| **@react-three/drei** | Large | No | 3D helpers, effects | **P3** |
| **phaser** | ~200KB-980KB | Yes | Full game engine (use custom builds) | **P3** |
| **fabric.js** | ~96KB gzip | Yes | Drawing games, canvas manipulation | **P3** |

---

### Category 2: Data Visualization & Infographics

#### Tier 1 - Essential Viz Libraries (HIGH PRIORITY)

| Package | Bundle Size | Pure? | Use Cases | Priority |
|---------|-------------|-------|-----------|----------|
| **@tanstack/react-table** | ~15KB gzip | No | Data tables, sorting, filtering | **P0** |
| **@xyflow/react** (React Flow) | Moderate | No | Flowcharts, org charts, node graphs | **P0** |
| **@visx/visx** | ~12KB | No | Custom D3 visualizations, minimal bundle | **P1** |
| **react-grid-layout** | Moderate | No | Dashboard layouts, draggable panels | **P1** |

#### Tier 2 - Additional Charts (MEDIUM PRIORITY)

| Package | Bundle Size | Pure? | Use Cases | Priority |
|---------|-------------|-------|-----------|----------|
| **@nivo/bar** | Modular | No | Bar charts (alternative to recharts) | **P1** |
| **@nivo/line** | Modular | No | Line charts | **P1** |
| **@nivo/pie** | Modular | No | Pie/donut charts | **P1** |
| **chart.js** | ~118KB gzip | Yes | Simple charts (tree-shakeable) | **P2** |
| **react-chartjs-2** | ~55KB | No | Chart.js React wrapper | **P2** |

#### Tier 3 - Maps & Advanced (LOW PRIORITY)

| Package | Bundle Size | Pure? | Use Cases | Priority |
|---------|-------------|-------|-----------|----------|
| **react-simple-maps** | Moderate | No | Geographic visualizations | **P2** |
| **react-leaflet** | ~1.1MB+ | No | Interactive maps | **P3** |
| **d3** (modular) | Varies | Yes | Custom visualizations | **P2** |

---

### Category 3: Web Tools & Utilities

#### Tier 1 - Essential Tool Libraries (HIGH PRIORITY)

| Package | Bundle Size | Pure? | Use Cases | Priority |
|---------|-------------|-------|-----------|----------|
| **zustand** | ~1KB gzip | No | Global state management | **P0** |
| **immer** | ~5KB gzip | Yes | Immutable state updates | **P0** |
| **nanoid** | ~118 bytes | Yes | ID generation (smaller than uuid) | **P0** |
| **react-hook-form** | ~12KB | No | Form handling, validation | **P0** |
| **zod** | ~68KB | Yes | Schema validation | **P0** |
| **@hookform/resolvers** | Minimal | No | RHF + Zod integration | **P0** |

#### Tier 2 - File & Data Processing (MEDIUM PRIORITY)

| Package | Bundle Size | Pure? | Use Cases | Priority |
|---------|-------------|-------|-----------|----------|
| **papaparse** | ~8KB gzip | Yes | CSV parsing | **P1** |
| **file-saver** | ~2KB gzip | Yes | Client-side file downloads | **P1** |
| **jszip** | ~28KB gzip | Yes | ZIP file creation | **P1** |
| **client-zip** | ~3KB gzip | Yes | Lightweight ZIP (alternative) | **P2** |

#### Tier 3 - Code & Text Editing (MEDIUM-LOW PRIORITY)

| Package | Bundle Size | Pure? | Use Cases | Priority |
|---------|-------------|-------|-----------|----------|
| **prism-react-renderer** | ~2KB + langs | No | Syntax highlighting | **P1** |
| **react-syntax-highlighter** | ~17KB gzip | No | Syntax highlighting (more languages) | **P2** |
| **@uiw/react-md-editor** | Light | No | Markdown editing | **P2** |
| **lexical** | Minimal | No | Rich text editing | **P3** |

#### Tier 4 - Drag & Drop (MEDIUM PRIORITY)

| Package | Bundle Size | Pure? | Use Cases | Priority |
|---------|-------------|-------|-----------|----------|
| **@dnd-kit/core** | ~10KB | No | Drag and drop | **P1** |
| **@dnd-kit/sortable** | Minimal | No | Sortable lists | **P1** |
| **@dnd-kit/utilities** | Minimal | No | DnD utilities | **P1** |

---

### Category 4: UI Components (Beyond Radix UI)

#### Tier 1 - High-Value UI (HIGH PRIORITY)

| Package | Bundle Size | Pure? | Use Cases | Priority |
|---------|-------------|-------|-----------|----------|
| **sonner** | ~4KB gzip | No | Toast notifications (shadcn standard) | **P0** |
| **react-hot-toast** | ~4KB gzip | No | Toast notifications (alternative) | **P1** |
| **embla-carousel-react** | ~8KB gzip | No | Carousels, sliders | **P0** |
| **react-loading-skeleton** | ~5KB | No | Skeleton loaders | **P0** |
| **@formkit/auto-animate** | ~2KB gzip | No | Automatic animations | **P0** |

#### Tier 2 - Icons & Feedback (MEDIUM PRIORITY)

| Package | Bundle Size | Pure? | Use Cases | Priority |
|---------|-------------|-------|-----------|----------|
| **@heroicons/react** | Tree-shake | No | Icons (Tailwind ecosystem) | **P1** |
| **@phosphor-icons/react** | Tree-shake | No | Icons (9000+ options) | **P2** |
| **@tanem/react-nprogress** | ~3KB | No | Progress bar (top-bar style) | **P1** |
| **react-spinners** | ~8KB | No | Loading spinners | **P2** |

#### Tier 3 - Specialized UI (LOW PRIORITY)

| Package | Bundle Size | Pure? | Use Cases | Priority |
|---------|-------------|-------|-----------|----------|
| **react-colorful** | ~3KB gzip | No | Color pickers | **P2** |
| **react-resizable-panels** | ~15KB | No | Resizable layouts | **P2** |
| **react-zoom-pan-pinch** | ~15KB | No | Image zoom/pan | **P2** |
| **react-day-picker** | ~15KB | No | Date pickers | **P2** |

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1) - 12 packages

**Goal**: Cover most common artifact patterns

```typescript
// Add to PREBUILT_PACKAGES in build-prebuilt-bundles.ts

// State & Forms
{ name: "zustand", version: "5.0.2", compatibleVersions: ["^5.0.0"], pure: true },
{ name: "immer", version: "10.1.1", compatibleVersions: ["^10.0.0"], pure: true },
{ name: "react-hook-form", version: "7.54.2", compatibleVersions: ["^7.0.0"], pure: false },
{ name: "zod", version: "3.24.1", compatibleVersions: ["^3.0.0"], pure: true },
{ name: "@hookform/resolvers", version: "3.10.0", compatibleVersions: ["^3.0.0"], pure: false },
{ name: "papaparse", version: "5.4.1", compatibleVersions: ["^5.0.0"], pure: true },

// UI Essentials
{ name: "sonner", version: "1.7.1", compatibleVersions: ["^1.0.0"], pure: false },
{ name: "embla-carousel-react", version: "8.5.1", compatibleVersions: ["^8.0.0"], pure: false },
{ name: "react-loading-skeleton", version: "3.5.0", compatibleVersions: ["^3.0.0"], pure: false },
{ name: "@formkit/auto-animate", version: "0.8.2", compatibleVersions: ["^0.8.0"], pure: false },

// Animation
{ name: "react-spring", version: "9.7.5", compatibleVersions: ["^9.0.0"], pure: false },

// Data
{ name: "@tanstack/react-table", version: "8.20.6", compatibleVersions: ["^8.0.0"], pure: false },
{ name: "nanoid", version: "5.0.9", compatibleVersions: ["^5.0.0", "^4.0.0"], pure: true },
```

**Estimated Bundle Addition**: ~150KB gzipped
**Impact**: Covers forms, toasts, carousels, tables, animations

---

### Phase 2: Data Visualization (Week 2) - 8 packages

**Goal**: Enable dashboards and infographics

```typescript
// Flowcharts & Diagrams
{ name: "@xyflow/react", version: "12.3.6", compatibleVersions: ["^12.0.0"], pure: false },
{ name: "react-grid-layout", version: "1.5.0", compatibleVersions: ["^1.0.0"], pure: false },

// Charts (Nivo - modular)
{ name: "@nivo/core", version: "0.88.0", compatibleVersions: ["^0.88.0"], pure: false },
{ name: "@nivo/bar", version: "0.88.0", compatibleVersions: ["^0.88.0"], pure: false },
{ name: "@nivo/line", version: "0.88.0", compatibleVersions: ["^0.88.0"], pure: false },
{ name: "@nivo/pie", version: "0.88.0", compatibleVersions: ["^0.88.0"], pure: false },

// Visx (lightweight D3)
{ name: "@visx/visx", version: "3.12.0", compatibleVersions: ["^3.0.0"], pure: false },

// Chart.js (alternative)
{ name: "chart.js", version: "4.4.7", compatibleVersions: ["^4.0.0"], pure: true },
{ name: "react-chartjs-2", version: "5.2.0", compatibleVersions: ["^5.0.0"], pure: false },
```

**Estimated Bundle Addition**: ~200KB gzipped
**Impact**: Enables flowcharts, dashboards, advanced charts

---

### Phase 3: Games & Interactive (Week 3) - 10 packages

**Goal**: Enable game development artifacts

```typescript
// 2D Canvas
{ name: "konva", version: "9.3.18", compatibleVersions: ["^9.0.0"], pure: true },
{ name: "react-konva", version: "18.2.10", compatibleVersions: ["^18.0.0"], pure: false },

// Physics
{ name: "matter-js", version: "0.20.0", compatibleVersions: ["^0.20.0", "^0.19.0"], pure: true },

// Gestures
{ name: "@use-gesture/react", version: "10.3.1", compatibleVersions: ["^10.0.0"], pure: false },

// Animation
{ name: "gsap", version: "3.12.5", compatibleVersions: ["^3.0.0"], pure: true },

// Audio
{ name: "howler", version: "2.2.4", compatibleVersions: ["^2.0.0"], pure: true },

// DnD
{ name: "@dnd-kit/core", version: "6.3.1", compatibleVersions: ["^6.0.0"], pure: false },
{ name: "@dnd-kit/sortable", version: "9.0.0", compatibleVersions: ["^9.0.0"], pure: false },
{ name: "@dnd-kit/utilities", version: "3.2.2", compatibleVersions: ["^3.0.0"], pure: false },
```

**Estimated Bundle Addition**: ~350KB gzipped
**Impact**: Enables games, drag-and-drop, audio, file processing

---

### Phase 4: Polish & Expansion (Week 4) - 10 packages

**Goal**: Fill remaining gaps

```typescript
// File operations
{ name: "file-saver", version: "2.0.5", compatibleVersions: ["^2.0.0"], pure: true },
{ name: "jszip", version: "3.10.1", compatibleVersions: ["^3.0.0"], pure: true },

// Code highlighting
{ name: "prism-react-renderer", version: "2.4.1", compatibleVersions: ["^2.0.0"], pure: false },

// Icons
{ name: "@heroicons/react", version: "2.2.0", compatibleVersions: ["^2.0.0"], pure: false },

// UI extras
{ name: "react-hot-toast", version: "2.4.1", compatibleVersions: ["^2.0.0"], pure: false },
{ name: "@tanem/react-nprogress", version: "5.0.51", compatibleVersions: ["^5.0.0"], pure: false },
{ name: "react-colorful", version: "5.6.1", compatibleVersions: ["^5.0.0"], pure: false },
{ name: "react-day-picker", version: "9.4.4", compatibleVersions: ["^9.0.0", "^8.0.0"], pure: false },

// Jotai (alternative to zustand)
{ name: "jotai", version: "2.11.0", compatibleVersions: ["^2.0.0"], pure: false },

// Lodash ES
{ name: "lodash-es", version: "4.17.21", compatibleVersions: ["^4.0.0"], pure: true },
```

**Estimated Bundle Addition**: ~200KB gzipped
**Impact**: Complete toolkit for most artifact types

---

## Required Code Changes (Before Phase 1)

These code changes must be applied before implementing Phase 1:

### 1. Peer Dependency Externalization
**File**: `supabase/functions/bundle-artifact/index.ts`

Add `PEER_DEPENDENCIES` map and update `buildEsmUrl()` to externalize peer deps for packages like react-konva, @nivo/*, @dnd-kit/*, react-chartjs-2.

### 2. Map-Based Lookup Optimization
**File**: `supabase/functions/_shared/prebuilt-bundles.ts`

Replace O(n) `array.find()` with O(1) `Map.get()` for package lookups. Critical for scaling to 70+ packages.

### 3. Build Script Concurrency
**File**: `scripts/build-prebuilt-bundles.ts`

Increase `CONCURRENCY_LIMIT` from 5 to 10 to reduce build time from ~35s to ~17s.

---

## Artifact Type Coverage Matrix

| Artifact Type | Current Coverage | After Expansion | Key Packages |
|---------------|------------------|-----------------|--------------|
| **Websites/Landing** | 70% | 95% | tailwind, lucide, framer-motion |
| **Dashboards** | 60% | 95% | recharts, @tanstack/react-table, react-grid-layout |
| **Forms** | 40% | 95% | react-hook-form, zod, sonner |
| **Charts/Viz** | 50% | 90% | recharts, nivo, visx, chart.js |
| **Flowcharts** | 0% | 90% | @xyflow/react |
| **Games (2D)** | 10% | 85% | react-konva, matter-js, gsap |
| **Games (3D)** | 0% | 50% | @react-three/fiber (large bundle) |
| **File Tools** | 20% | 90% | papaparse, jszip, file-saver |
| **Code Editors** | 10% | 70% | prism-react-renderer |
| **Infographics** | 30% | 85% | nivo, visx, d3 |

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Prebuilt package count | 23 | 70+ | Count in manifest |
| Cache hit rate | ~40% | 80%+ | Monitor bundle-artifact logs |
| Avg bundle time (cached) | 5-15s | <2s | Performance logs |
| Artifact error rate | ~5% | <2% | Error tracking |

---

## Testing Strategy

### Per-Package Tests
1. **ESM Resolution**: Verify esm.sh URL returns valid module
2. **React Hooks**: Test packages with hooks don't cause dual-instance errors
3. **Import Map**: Verify React externalization works correctly
4. **Bundle Size**: Confirm size matches expectations

### Integration Tests
1. **Game Artifact**: Create Tic-Tac-Toe with react-konva + matter-js
2. **Dashboard Artifact**: Create KPI dashboard with @tanstack/react-table + recharts
3. **Tool Artifact**: Create CSV editor with papaparse + file-saver
4. **Form Artifact**: Create signup form with react-hook-form + zod + sonner

### Browser Testing
1. Chrome DevTools MCP verification after each phase
2. Console error monitoring
3. Performance profiling

---

## Rollback Plan

Each phase is independently deployable:
1. Revert `prebuilt-bundles.json` to previous version
2. Dynamic bundling continues to work for all packages
3. No user-facing impact (just slower artifact generation)

---

## Open Questions

1. **Version pinning strategy**: Use latest stable or pin to tested versions?
2. **Bundle size threshold**: What's the max acceptable prebuilt bundle size?
3. **Usage analytics**: Should we add package-level usage tracking?
4. **System prompt updates**: Add examples using new packages?

---

## Appendix: Package Categories Summary

### Pure Packages (Can use `?bundle`)
- date-fns, clsx, class-variance-authority, tailwind-merge, uuid
- immer, zod, nanoid, zustand
- matter-js, gsap, howler
- papaparse, file-saver, jszip, lodash-es
- chart.js, konva

### React Packages (No `?bundle` - preserve hooks)
- All Radix UI components
- recharts, lucide-react, @tanstack/react-query
- jotai, react-hook-form, @hookform/resolvers
- sonner, react-hot-toast, embla-carousel-react
- react-konva, react-spring, @use-gesture/react
- @tanstack/react-table, @xyflow/react, react-grid-layout
- All @nivo/* packages, @visx/visx
- @dnd-kit/* packages
- prism-react-renderer, @heroicons/react

---

## Next Steps

1. **Review plan** with stakeholder
2. **Phase 1 implementation**: Update `build-prebuilt-bundles.ts`
3. **Run prebuild script**: `deno task prebuild`
4. **Test artifacts**: Create sample artifacts for each category
5. **Deploy**: Update Edge Functions with new manifest
6. **Monitor**: Track cache hit rates and bundle times
