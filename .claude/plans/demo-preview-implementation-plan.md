# Pre-Recorded Demo Mode Implementation Plan

> **Version**: 3.0 (Simplified MVP with Alternate Landing Page)
> **Last Updated**: 2025-12-02
> **Status**: Ready for Implementation - Phase 0.5 MVP

## Executive Summary

Create an **alternate landing page** (`/landing-v2`) with a **single JSON-driven demo** to validate the concept before full implementation. This allows A/B testing against the current `/landing` without risk.

**MVP Scope**: One dashboard demo, no iframe, no pre-bundling — just JSON timeline + screenshot fallback.

**Zero Network Requests**: All demo data is static JSON bundled at build time. No LLM calls, no Supabase calls, no loading states. The demo runs entirely client-side using `setTimeout` and React state.

---

## Strategy Change: Alternate Landing Page

### Why Not Replace Current Landing?
- **Zero risk**: Current `/landing` continues working
- **A/B testing**: Compare conversion rates between versions
- **Iterative validation**: Prove the timeline engine works before investing in 6 demos
- **Easy rollback**: If issues arise, just don't promote `/landing-v2`

### Route Structure
```
/landing      → Current hardcoded animation (UNCHANGED)
/landing-v2   → New JSON-driven demo (MVP)
/demo         → Future iframe target (Phase 2+)
```

### SEO Considerations
- Add `<meta name="robots" content="noindex">` to `/landing-v2` during testing
- Remove once ready for production traffic

---

## ⚠️ Concerns & Mitigations

### 1. Component Isolation Risk
**Concern**: If `HeroV2` shares code with `Hero`, changes to shared utilities could accidentally affect the current landing page.

**Mitigation**: Keep `HeroV2.tsx` and `LandingV2.tsx` as complete copies initially. Don't extract shared components until MVP is validated. This is intentional duplication for safety.

### 2. Animation Performance on Mobile
**Concern**: The timeline-based typing animation could cause jank on low-end mobile devices.

**Mitigation**:
- Use `transform` and `opacity` only (GPU-accelerated)
- Respect `prefers-reduced-motion` media query
- Consider instant text display on mobile (no typing effect)

### 3. Screenshot Artifact vs Interactive
**Concern**: Using a static screenshot for the artifact (instead of real interactive component) may feel less impressive than the full vision.

**Mitigation**: This is acceptable for MVP validation. The key insight is whether the **timeline-driven animation** feels more authentic than the current hardcoded approach. Interactive artifacts can be added in Phase 2.

### 4. Route Discovery
**Concern**: Users might accidentally discover `/landing-v2` via URL guessing or referrer leaks.

**Mitigation**:
- `noindex` meta tag prevents search engine indexing
- Route is not linked from anywhere in the app
- Consider adding basic auth or IP whitelist if sensitive

### 5. JSON Data Format Lock-in
**Concern**: The simplified `DemoDataMVP` type might not scale well when adding more demos.

**Mitigation**: Design the simplified type as a subset of the full `DemoData` type from the original plan. Add fields incrementally rather than redesigning.

### 6. Testing Coverage
**Concern**: Adding new pages/components without tests could degrade overall code quality.

**Mitigation**: Write basic tests for `useDemoReplay` hook since it contains the core logic. UI components can rely on visual testing via Chrome DevTools MCP.

---

## Original Summary (Preserved for Context)

The full vision: Replace the current simulated demo browser on the landing page with a **pre-recorded demo mode** that uses the **real Vana interface** with pre-loaded conversation states. This provides an authentic preview while skipping loading times and avoiding API costs.

---

## Table of Contents

1. [Goals & Non-Goals](#goals--non-goals)
2. [Architecture Overview](#architecture-overview)
3. [Demo Examples](#demo-examples)
4. [Data Structures](#data-structures)
5. [Component Specifications](#component-specifications)
6. [Build-Time Assets](#build-time-assets)
7. [Mobile Strategy](#mobile-strategy)
8. [Accessibility](#accessibility)
9. [Analytics & Tracking](#analytics--tracking)
10. [Security Considerations](#security-considerations)
11. [File Structure](#file-structure)
12. [Implementation Phases](#implementation-phases)
13. [Testing Strategy](#testing-strategy)

---

## Goals & Non-Goals

### Goals

- **Authenticity**: Use real Vana UI components (ChatInterface, ArtifactRenderer)
- **Performance**: Skip all loading times — demos feel instant
- **Zero API Cost**: Pre-recorded responses, no AI API calls
- **Conversion Optimization**: Showcase 6 diverse capabilities to appeal to different personas
- **Accessibility**: Full screen reader support with ARIA live regions
- **Mobile-Friendly**: Screenshot carousel fallback for reliable mobile experience

### Non-Goals

- Interactive demos where users can type (that's what the real app is for)
- Server-side rendering of demo content (static pre-build is sufficient)
- Supporting user-customizable demos

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Landing Page (Hero)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                      DemoPreview.tsx                                ││
│  │                                                                      ││
│  │  Desktop: iframe → /demo?example=dashboard&autoplay=true            ││
│  │  Mobile:  ScreenshotCarousel (no iframe)                            ││
│  │                                                                      ││
│  │  ┌───────────────────────────────────────────────────────────────┐  ││
│  │  │  Browser Chrome                                               │  ││
│  │  │  ┌─────────────────────────────────────────────────────────┐  │  ││
│  │  │  │  DemoChatInterface                                      │  │  ││
│  │  │  │  ├── useDemoReplay hook (timeline engine)               │  │  ││
│  │  │  │  ├── DemoMessageList (typed messages)                   │  │  ││
│  │  │  │  ├── DemoReasoningTicker (fast ticker)                  │  │  ││
│  │  │  │  ├── DemoArtifact (pre-bundled/pre-rendered)            │  │  ││
│  │  │  │  └── TryItCTA (postMessage to parent)                   │  │  ││
│  │  │  └─────────────────────────────────────────────────────────┘  │  ││
│  │  │  ProgressDots (6 dots, clickable, color-coded)                │  ││
│  │  └───────────────────────────────────────────────────────────────┘  ││
│  │                                                                      ││
│  │  ErrorBoundary → Fallback: ScreenshotCarousel                       ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. Hero loads → DemoPreview renders
2. DemoPreview checks device:
   - Desktop: renders iframe with /demo route
   - Mobile: renders ScreenshotCarousel
3. /demo route loads DemoChatInterface
4. useDemoReplay hook:
   a. Loads demo data (static import)
   b. Executes timeline events with precise timing
   c. Prefetches next 2 examples
5. User clicks CTA → postMessage to parent → scroll to app
6. Demo rotates to next example after cycle completes
```

---

## Demo Examples

### Priority Order (wow factor × appeal breadth)

| # | Example | Prompt | Artifact | Wow | Complexity | Target Persona |
|---|---------|--------|----------|-----|------------|----------------|
| 1 | **Dashboard** | "Create a dashboard for Q3 sales" | React + Charts | 8/10 | 2/5 | Analysts, Business |
| 2 | **AI Image** | "A futuristic city at sunset with flying cars" | Image | 9/10 | 2/5 | Creators, Marketers |
| 3 | **Game** | "Build a tic-tac-toe game I can play" | React Interactive | 8/10 | 3/5 | Developers, Students |
| 4 | **Deep Reasoning** | "Explain how neural networks learn" | Thinking + Response | 10/10 | 4/5 | Engineers, Researchers |
| 5 | **Web Research** | "Latest breakthroughs in quantum computing" | Markdown + Sources | 9/10 | 3/5 | Students, Curious |
| 6 | **Diagram** | "Diagram a microservices e-commerce system" | Mermaid SVG | 7/10 | 3/5 | Architects, PMs |

### Timing per Example

| Phase | Duration | Cumulative | Notes |
|-------|----------|------------|-------|
| User message typing | 600ms | 600ms | Fast typing effect |
| Thinking pulse | 200ms | 800ms | Brief visual cue |
| Reasoning ticker | 700ms | 1500ms | 3-4 fast chunks |
| Assistant message | 800ms | 2300ms | Response appears |
| Artifact render | 300ms | 2600ms | Slide-in animation |
| Hold for viewing | 5400ms | 8000ms | Appreciate the result |
| **Total per example** | **8 seconds** | | |
| Transition fade | 500ms | 8500ms | Cross-fade to next |

**Full rotation**: 6 examples × 8.5s = **51 seconds**

---

## Data Structures

### DemoData Type

```typescript
// src/data/demos/types.ts

import type { LucideIcon } from 'lucide-react';

export type ColorScheme = 'purple' | 'cyan' | 'emerald' | 'amber' | 'violet' | 'blue';

export type ArtifactType = 'react' | 'image' | 'mermaid' | 'markdown';

export interface DemoMeta {
  id: string;
  name: string;
  description: string;
  icon: string;  // Lucide icon name
  colorScheme: ColorScheme;
  targetPersona: string;
  wowFactor: 1 | 2 | 3 | 4 | 5;
}

export interface DemoArtifact {
  type: ArtifactType;
  title: string;
  techStack?: string[];
  badge?: string;

  // Type-specific fields
  bundlePath?: string;           // React: pre-bundled JS
  screenshotPath?: string;       // Fallback screenshot
  imageUrl?: string;             // Image: main image
  thumbnailUrl?: string;         // Image: low-res placeholder
  blurhash?: string;             // Image: instant placeholder
  svgPath?: string;              // Mermaid: pre-rendered SVG
  markdownContent?: string;      // Markdown: pre-formatted content
}

// Explicit timeline format for precise control
export type DemoTimelineEvent =
  | { type: 'user-message'; content: string; at: number; duration: number }
  | { type: 'thinking-start'; at: number }
  | { type: 'reasoning-chunk'; content: string; at: number }
  | { type: 'thinking-end'; at: number }
  | { type: 'assistant-message'; content: string; at: number; duration: number }
  | { type: 'artifact-appear'; at: number; animationDuration: number }
  | { type: 'hold'; until: number };

export interface DemoData {
  meta: DemoMeta;
  timeline: DemoTimelineEvent[];
  artifact: DemoArtifact;

  // For "Try it yourself" CTA
  suggestedPrompt: string;
}

// Demo manifest for rotation
export interface DemoManifest {
  examples: string[];  // Ordered list of demo IDs
  defaultExample: string;
  cycleDuration: number;  // ms per example
  transitionDuration: number;  // ms for cross-fade
}
```

### Example Demo Data

```typescript
// src/data/demos/dashboard.ts

import type { DemoData } from './types';

export const dashboardDemo: DemoData = {
  meta: {
    id: 'dashboard',
    name: 'Data Dashboard',
    description: 'Turn spreadsheets into interactive dashboards',
    icon: 'LayoutDashboard',
    colorScheme: 'blue',
    targetPersona: 'Analysts, Business Users',
    wowFactor: 4,
  },

  timeline: [
    { type: 'user-message', content: 'Create a dashboard for Q3 sales data', at: 0, duration: 600 },
    { type: 'thinking-start', at: 700 },
    { type: 'reasoning-chunk', content: 'Analyzing data structure...', at: 800 },
    { type: 'reasoning-chunk', content: 'Selecting chart types...', at: 1000 },
    { type: 'reasoning-chunk', content: 'Designing responsive layout...', at: 1200 },
    { type: 'thinking-end', at: 1500 },
    { type: 'assistant-message', content: "I'll create an interactive analytics dashboard with key metrics, trends, and visualizations.", at: 1600, duration: 700 },
    { type: 'artifact-appear', at: 2400, animationDuration: 300 },
    { type: 'hold', until: 8000 },
  ],

  artifact: {
    type: 'react',
    title: 'Q3 Analytics Dashboard',
    techStack: ['React', 'Recharts', 'Tailwind'],
    badge: 'Interactive',
    bundlePath: '/demos/dashboard/bundle.js',
    screenshotPath: '/demos/dashboard/screenshot.webp',
  },

  suggestedPrompt: 'Create a dashboard for my sales data',
};
```

---

## Component Specifications

### 1. DemoPreview.tsx (Refactored)

**Location**: `src/components/landing/DemoPreview.tsx`

**Responsibilities**:
- Render browser chrome (traffic lights, URL bar)
- Desktop: render iframe with demo route
- Mobile: render ScreenshotCarousel
- Handle iframe errors with fallback
- Render progress dots
- Listen for postMessage from iframe

```typescript
interface DemoPreviewProps {
  className?: string;
}

// Key features:
// - useDemoMode() hook for device-adaptive rendering
// - ErrorBoundary with ScreenshotCarousel fallback
// - postMessage listener for CTA clicks
// - Progress dots with example selection
```

### 2. useDemoReplay Hook

**Location**: `src/components/demo/useDemoReplay.ts`

**Responsibilities**:
- Load demo data
- Execute timeline with precise timing
- Handle AbortController cleanup
- Prefetch next examples
- Expose state for rendering

```typescript
interface UseDemoReplayReturn {
  phase: 'idle' | 'user-typing' | 'thinking' | 'reasoning' | 'assistant-typing' | 'artifact' | 'hold';
  visibleMessages: DemoMessage[];
  typingText: string;
  reasoningChunks: string[];
  artifactVisible: boolean;
  progress: number;  // 0-1 for progress bar
  isComplete: boolean;
}

// Key implementation details:
// - AbortController for cleanup on unmount/demo change
// - Prefetch next 2 examples via dynamic import
// - requestAnimationFrame for smooth animations
// - Respects prefers-reduced-motion
```

### 3. DemoChatInterface.tsx

**Location**: `src/components/demo/DemoChatInterface.tsx`

**Responsibilities**:
- Render chat UI in demo mode
- Display messages with typing animation
- Show reasoning ticker
- Render artifact (pre-bundled or screenshot)
- Provide "Try it yourself" CTA
- ARIA live regions for accessibility

```typescript
interface DemoChatInterfaceProps {
  demoId: string;
  autoplay?: boolean;
  onTryIt?: (prompt: string) => void;
}

// Uses minimal UI compared to full ChatInterface:
// - No input field
// - No sidebar
// - No auth checks
// - Simplified message rendering
```

### 4. DemoArtifact Components

**Location**: `src/components/demo/artifacts/`

```
artifacts/
├── DemoReactArtifact.tsx    # Loads pre-bundled JS
├── DemoImageArtifact.tsx    # Blurhash + image loading
├── DemoMermaidArtifact.tsx  # Loads pre-rendered SVG
├── DemoMarkdownArtifact.tsx # Renders pre-formatted markdown
└── DemoArtifactWrapper.tsx  # Pointer-events blocking + CTA overlay
```

### 5. ScreenshotCarousel.tsx

**Location**: `src/components/landing/ScreenshotCarousel.tsx`

**Responsibilities**:
- Mobile fallback when iframe not suitable
- Display real screenshots of Vana
- Auto-rotate with fade transitions
- Touch-friendly navigation

---

## Build-Time Assets

### Pre-Bundle Script

**Location**: `scripts/prebundle-demos.ts`

**Purpose**: Pre-compile React artifacts to eliminate Sandpack bundling at runtime.

```typescript
// Runs during: npm run build

import { build } from 'esbuild';
import { demos } from '../src/data/demos';

for (const demo of demos) {
  if (demo.artifact.type === 'react') {
    await build({
      entryPoints: [`src/data/demos/artifacts/${demo.meta.id}.tsx`],
      bundle: true,
      format: 'esm',
      outfile: `public/demos/${demo.meta.id}/bundle.js`,
      external: ['react', 'react-dom'],  // Use globals
      minify: true,
    });
  }
}
```

### Pre-Render Mermaid Script

**Location**: `scripts/prerender-mermaid.ts`

**Purpose**: Convert Mermaid definitions to static SVG.

```typescript
import mermaid from 'mermaid';

const diagrams = {
  'microservices': `
    graph TB
      A[API Gateway] --> B[Auth Service]
      A --> C[Product Service]
      ...
  `,
};

for (const [id, definition] of Object.entries(diagrams)) {
  mermaid.initialize({ startOnLoad: false, theme: 'dark' });
  const { svg } = await mermaid.render(`diagram-${id}`, definition);
  await fs.writeFile(`public/demos/diagrams/${id}.svg`, svg);
}
```

### Asset Directory Structure

```
public/demos/
├── dashboard/
│   ├── bundle.js           # Pre-bundled React
│   └── screenshot.webp     # Fallback (760×1000 @2x)
├── image-gen/
│   ├── futuristic-city.webp      # Full image (1024×1024)
│   ├── futuristic-city-thumb.webp # Thumbnail (256×256)
│   └── screenshot.webp           # Fallback
├── game/
│   ├── bundle.js
│   └── screenshot.webp
├── reasoning/
│   └── screenshot.webp     # No artifact, just chat
├── research/
│   └── screenshot.webp
├── diagrams/
│   ├── microservices.svg   # Pre-rendered Mermaid
│   └── screenshot.webp
└── og/
    ├── dashboard.png       # Social sharing (1200×630)
    ├── image-gen.png
    └── ...
```

---

## Mobile Strategy

### Device Detection

```typescript
// src/components/demo/useDemoMode.ts

export function useDemoMode() {
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();
  const isLowBandwidth = useNetworkInfo()?.effectiveType === '2g';

  return {
    // Mobile: screenshots, Desktop: iframe
    mode: isMobile ? 'screenshots' : 'iframe',

    // Reduced motion: minimal animations
    animations: prefersReducedMotion ? 'minimal' : 'full',

    // Low bandwidth: fewer, smaller examples
    exampleCount: isLowBandwidth ? 3 : 6,
    imageQuality: isLowBandwidth ? 'thumbnail' : 'full',

    // Timing adjustments
    timing: {
      typingSpeed: isMobile ? 0 : 40,  // chars/sec, 0 = instant
      transitionDuration: prefersReducedMotion ? 200 : 500,
      cycleDuration: isMobile ? 6000 : 8000,
    },
  };
}
```

### Mobile Examples (Reduced Set)

When `isLowBandwidth` or very small screen:

1. **AI Image** (highest visual impact)
2. **Dashboard** (practical utility)
3. **Game** (interactivity showcase)

---

## Accessibility

### ARIA Live Regions

```tsx
// DemoChatInterface.tsx

const DemoChatInterface = () => {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    switch (phase) {
      case 'user-typing':
        setAnnouncement(`User asks: ${currentMessage}`);
        break;
      case 'thinking':
        setAnnouncement('Vana is thinking...');
        break;
      case 'assistant-typing':
        setAnnouncement(`Vana responds: ${assistantMessage.slice(0, 100)}`);
        break;
      case 'artifact':
        setAnnouncement(`Vana created: ${artifact.title}`);
        break;
    }
  }, [phase]);

  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
      {/* Demo content */}
    </>
  );
};
```

### Reduced Motion Support

```typescript
// Respect prefers-reduced-motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Adjust animations
const animationClass = prefersReducedMotion
  ? 'transition-opacity duration-200'  // Simple fade
  : 'animate-in slide-in-from-bottom-4 fade-in duration-500';  // Full animation
```

### Keyboard Navigation

- Progress dots are focusable and activatable with Enter/Space
- Demo container has `role="region"` and `aria-label`
- Skip link available to bypass demo

---

## Analytics & Tracking

### Events to Track

```typescript
// src/components/demo/useDemoAnalytics.ts

type DemoEvent =
  | { type: 'demo_viewed'; exampleId: string; viewport: string }
  | { type: 'demo_completed'; exampleId: string; duration: number }
  | { type: 'demo_skipped'; exampleId: string; progressPercent: number }
  | { type: 'demo_cta_clicked'; exampleId: string; promptUsed: string }
  | { type: 'demo_error'; exampleId: string; error: string };

export function useDemoAnalytics() {
  const track = useCallback((event: DemoEvent) => {
    // Send to analytics (Supabase, Mixpanel, etc.)
    analytics.track('demo_interaction', {
      ...event,
      timestamp: Date.now(),
      sessionId: getSessionId(),
    });
  }, []);

  return { track };
}
```

### Conversion Attribution

Track which demo example leads to signups:

```
Demo viewed → CTA clicked → Signup started → Signup completed
```

---

## Security Considerations

### PostMessage Origin Validation

```typescript
// Parent (DemoPreview.tsx)
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    // Only accept messages from same origin
    if (event.origin !== window.location.origin) {
      console.warn('Rejected postMessage from:', event.origin);
      return;
    }

    if (event.data?.type === 'try-vana') {
      scrollToApp(event.data.prompt);
    }
  };

  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);

// Child (DemoChatInterface.tsx)
const sendToParent = (message: object) => {
  if (window.parent !== window) {
    window.parent.postMessage(message, window.location.origin);  // NOT '*'
  }
};
```

### Content Security Policy

Ensure CSP allows:
- `frame-src 'self'` for iframe
- Pre-bundled scripts from `/demos/`

---

## File Structure

### New Files to Create

```
src/
├── pages/
│   └── Demo.tsx                      # /demo route
├── components/
│   ├── demo/
│   │   ├── DemoChatInterface.tsx     # Main demo component
│   │   ├── DemoMessageList.tsx       # Animated message list
│   │   ├── DemoReasoningTicker.tsx   # Fast reasoning display
│   │   ├── DemoProgressDots.tsx      # Example navigation
│   │   ├── useDemoReplay.ts          # Timeline engine hook
│   │   ├── useDemoMode.ts            # Device/preference detection
│   │   ├── useDemoAnalytics.ts       # Analytics tracking
│   │   └── artifacts/
│   │       ├── DemoReactArtifact.tsx
│   │       ├── DemoImageArtifact.tsx
│   │       ├── DemoMermaidArtifact.tsx
│   │       ├── DemoMarkdownArtifact.tsx
│   │       └── DemoArtifactWrapper.tsx
│   └── landing/
│       ├── DemoPreview.tsx           # Refactored (iframe + fallback)
│       └── ScreenshotCarousel.tsx    # Mobile fallback
├── data/
│   └── demos/
│       ├── types.ts                  # Type definitions
│       ├── index.ts                  # Manifest + exports
│       ├── dashboard.ts
│       ├── image-gen.ts
│       ├── game.ts
│       ├── reasoning.ts
│       ├── research.ts
│       └── diagram.ts
└── scripts/
    ├── prebundle-demos.ts            # Build-time bundling
    └── prerender-mermaid.ts          # Build-time SVG generation

public/demos/
├── dashboard/
│   ├── bundle.js
│   └── screenshot.webp
├── image-gen/
│   ├── futuristic-city.webp
│   ├── futuristic-city-thumb.webp
│   └── screenshot.webp
├── game/
│   ├── bundle.js
│   └── screenshot.webp
├── reasoning/
│   └── screenshot.webp
├── research/
│   └── screenshot.webp
├── diagrams/
│   ├── microservices.svg
│   └── screenshot.webp
└── og/
    └── [social-share-images].png
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/demo` route |
| `src/components/landing/DemoPreview.tsx` | Complete rewrite for iframe approach |
| `src/components/landing/Hero.tsx` | Minor: handle CTA from demo |
| `vite.config.ts` | Add demo entry point (optional) |
| `package.json` | Add prebundle scripts |

---

## Implementation Phases

---

### 🚀 Phase 0.5: MVP - Single Demo Alternate Landing (NEW)

**Goal**: Create `/landing-v2` with one JSON-driven dashboard demo to validate the approach.

**Architecture** (Simplified - No iframe):
```
src/
├── pages/
│   └── LandingV2.tsx              # NEW: Alternate landing page
├── components/
│   ├── demo/
│   │   ├── DemoPreviewV2.tsx      # JSON-driven demo preview
│   │   ├── useDemoReplay.ts       # Timeline engine (minimal)
│   │   └── DemoArtifactStatic.tsx # Screenshot-based artifact
│   └── landing/
│       └── HeroV2.tsx             # Copy of Hero with DemoPreviewV2
└── data/
    └── demos/
        ├── types.ts               # Simplified types
        └── dashboard.json         # Single demo data
```

**Simplified Data Structure**:
```typescript
// src/data/demos/types.ts (MVP version)
export interface DemoTimelineEvent {
  type: 'user-message' | 'thinking' | 'reasoning' | 'assistant-message' | 'artifact';
  content?: string;
  at: number;      // ms from start
  duration?: number;
}

export interface DemoDataMVP {
  id: string;
  name: string;
  timeline: DemoTimelineEvent[];
  artifact: {
    title: string;
    screenshotUrl: string;  // Just use a screenshot for MVP
  };
}
```

**Tasks**:
- [ ] Create `src/pages/LandingV2.tsx` (copy of Landing.tsx)
- [ ] Create `src/components/landing/HeroV2.tsx` (copy of Hero.tsx)
- [ ] Create `src/components/demo/DemoPreviewV2.tsx` (JSON-driven)
- [ ] Create `src/components/demo/useDemoReplay.ts` (timeline engine)
- [ ] Create `src/data/demos/types.ts` (simplified)
- [ ] Create `src/data/demos/dashboard.json` (one demo)
- [ ] Add `/landing-v2` route to `App.tsx`
- [ ] Add `noindex` meta tag to LandingV2
- [ ] Capture dashboard screenshot for artifact display
- [ ] Test on desktop and mobile

**Deliverable**: Working `/landing-v2` with animated dashboard demo using JSON timeline.

**Estimate**: 0.5-1 day

---

### Phase 0: Foundation (DEFERRED)

*Original Phase 0 tasks - defer until MVP validated*

- [ ] Create `src/data/demos/types.ts` with all type definitions
- [ ] Create `src/data/demos/index.ts` with manifest
- [ ] Set up `public/demos/` directory structure
- [ ] Add `/demo` route to `App.tsx`

### Phase 1: Core Engine (DEFERRED)

*Original Phase 1 tasks - expand after MVP*

- [ ] Implement `useDemoReplay.ts` with:
  - Timeline execution with AbortController
  - Prefetching logic
  - Reduced motion support
- [ ] Implement `useDemoMode.ts` for device detection
- [ ] Create `DemoChatInterface.tsx` skeleton
- [ ] Create `DemoMessageList.tsx` with typing animation
- [ ] Create `DemoReasoningTicker.tsx` (fast version)

### Phase 2: First 3 Examples (DEFERRED)

- [ ] Create `dashboard.ts` demo data
- [ ] Create `image-gen.ts` demo data
- [ ] Create `game.ts` demo data
- [ ] Implement `DemoReactArtifact.tsx`
- [ ] Implement `DemoImageArtifact.tsx` with Blurhash
- [ ] Set up `scripts/prebundle-demos.ts`
- [ ] Generate first 3 pre-bundled artifacts

### Phase 3: Hero Integration (DEFERRED)

- [ ] Refactor `DemoPreview.tsx` for iframe approach
- [ ] Implement `DemoProgressDots.tsx`
- [ ] Add postMessage handling
- [ ] Implement error boundary with fallback
- [ ] Create `ScreenshotCarousel.tsx` for mobile

### Phase 4: Remaining Examples + Polish (DEFERRED)

- [ ] Create `reasoning.ts` demo data
- [ ] Create `research.ts` demo data
- [ ] Create `diagram.ts` demo data
- [ ] Set up `scripts/prerender-mermaid.ts`
- [ ] Implement `DemoMermaidArtifact.tsx`
- [ ] Implement `DemoMarkdownArtifact.tsx`
- [ ] Add analytics tracking
- [ ] Add ARIA live regions

### Phase 5: Screenshots & Testing (DEFERRED)

- [ ] Capture 6 real screenshots for fallbacks
- [ ] Capture 6 OG images for social sharing
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Mobile testing (iOS Safari, Android Chrome)
- [ ] Accessibility audit (screen reader, keyboard)
- [ ] Performance audit (Lighthouse)

**MVP Total: 0.5-1 day** | Full Implementation: ~5.5 days (after MVP validation)

---

## Testing Strategy

### Unit Tests

```typescript
// useDemoReplay.test.ts
describe('useDemoReplay', () => {
  it('executes timeline events in order');
  it('cleans up on unmount via AbortController');
  it('prefetches next 2 examples');
  it('respects reduced motion preference');
  it('handles missing demo data gracefully');
});
```

### Integration Tests

```typescript
// DemoChatInterface.test.tsx
describe('DemoChatInterface', () => {
  it('renders user message with typing animation');
  it('shows reasoning ticker during thinking phase');
  it('displays artifact after assistant message');
  it('sends postMessage on CTA click');
  it('announces to screen readers via aria-live');
});
```

### Visual Regression Tests

- Capture screenshots at each demo phase
- Compare against baseline on PR

### Performance Tests

- First paint < 500ms
- Demo interactive < 1s
- 60fps during animations
- Lighthouse performance > 90

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Demo load time | < 500ms | Lighthouse |
| CTA click rate | > 5% | Analytics |
| Demo completion rate | > 60% | Analytics |
| Mobile fallback rate | < 10% | Error tracking |
| Accessibility score | 100 | Lighthouse |
| Conversion lift | > 15% | A/B test vs current |

---

## Appendix: Demo Timeline Visualization

```
Dashboard Demo (8 seconds)
─────────────────────────────────────────────────────────────────────────────

0ms      600ms    800ms   1000ms  1200ms  1500ms  1600ms    2300ms    2600ms                    8000ms
│         │        │        │       │       │       │         │         │                          │
▼         ▼        ▼        ▼       ▼       ▼       ▼         ▼         ▼                          ▼
┌─────────┐
│ User    │
│ typing  │
└─────────┘
          ┌────────────────────────────────┐
          │ Thinking + Reasoning chunks    │
          │ "Analyzing..." "Selecting..."  │
          └────────────────────────────────┘
                                           ┌─────────────┐
                                           │ Assistant   │
                                           │ message     │
                                           └─────────────┘
                                                         ┌────────────────────────────────────────────┐
                                                         │ Artifact visible (hold for viewing)        │
                                                         └────────────────────────────────────────────┘
```

---

## Next Steps

After plan approval:

1. **Start with Phase 0**: Set up types and directory structure
2. **Parallel work**:
   - Developer A: useDemoReplay hook
   - Developer B: Demo data files
3. **Daily check-ins**: Review progress against phase targets
4. **End of Phase 3**: First demo in production for feedback
5. **End of Phase 5**: Full launch with all 6 examples

---

*Plan authored by: Claude (with peer review feedback incorporated)*
*Ready for implementation approval*
