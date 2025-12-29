# Skeleton UI Implementation Plan

## Executive Summary
Comprehensive plan to implement skeleton loading states across Vana's AI chat application using shadcn/ui Skeleton component. This will improve perceived performance and user experience by providing visual feedback during data loading.

## Architecture Overview

### Two-Tier Skeleton Architecture

This plan follows a **two-tier architecture** for maintainability and consistency:

**Tier 1: Primitives** (reusable building blocks in `src/components/ui/`)
- `Skeleton` - Base pulse animation component (already exists)
- `SkeletonLine` - Single text line with variable width
- `SkeletonParagraph` - Multiple lines with natural variation
- `SkeletonAvatar` - Circular avatar placeholder
- `SkeletonCard` - Generic card with image/content areas

**Tier 2: Domain-Specific** (composed from primitives, limited scope)
- `ArtifactSkeleton` - **Already exists** at `src/components/ui/artifact-skeleton.tsx`
- `MessageSkeleton` - **Already exists** at `src/components/ui/message-skeleton.tsx`

> **Architecture Decision**: Domain-specific skeletons are limited to `ArtifactSkeleton` and `MessageSkeleton` only. Other loading states (sidebar, landing page, forms) should use **inline composition** of Tier 1 primitives rather than creating separate skeleton components. This reduces component proliferation and keeps loading states co-located with their parent components.

### Suspense Integration Pattern

The codebase already uses React Suspense for code splitting. See `ArtifactRenderer.tsx` (lines 22-26):

```tsx
// Lazy load Sandpack component for code splitting
const SandpackArtifactRenderer = lazy(() =>
  import('./SandpackArtifactRenderer').then(module => ({
    default: module.SandpackArtifactRenderer
  }))
);
```

**Recommended pattern**: Use Suspense boundaries with skeleton fallbacks for lazy-loaded components:

```tsx
import { Suspense, lazy } from 'react';
import { ArtifactSkeleton } from '@/components/ui/artifact-skeleton';

const LazyComponent = lazy(() => import('./HeavyComponent'));

// In render:
<Suspense fallback={<ArtifactSkeleton type="react" />}>
  <LazyComponent />
</Suspense>
```

## Current State Audit

### Already Implemented
- **Base Skeleton Component** (`src/components/ui/skeleton.tsx`)
  - Simple, reusable component with pulse animation
  - Uses muted background color with proper theming support

- **ArtifactSkeleton** (`src/components/ui/artifact-skeleton.tsx`)
  - Supports multiple artifact types: code, markdown, html, svg, mermaid, react, image
  - Type-specific layouts with appropriate sizing
  - Ready for integration - needs to be wired into loading states

- **MessageSkeleton** (`src/components/ui/message-skeleton.tsx`)
  - Variants for user/assistant messages
  - Matches actual message dimensions
  - Used in ChatInterface (line 757-759)

- **ChatSidebar Loading State** (lines 143-155)
  - Shows skeleton for session groups using inline composition
  - Displays 2-3 skeleton items per group
  - Proper spacing and sizing

### Missing Skeleton States

1. **Artifact System** (Critical - Poor UX)
   - ArtifactContainer: No loading state for initial render
   - ArtifactRenderer: Shows "Loading..." text instead of using existing `ArtifactSkeleton`
   - Bundled artifacts: No visual feedback during 2-5s bundle time
   - Image generation: No skeleton during generation

2. **Data-Heavy Components** (Medium Priority)
   - AdminDashboard: Tables load without skeletons
   - Deep Research: No skeleton for research results

3. **User Profile** (Low Priority)
   - UserProfileButton: No skeleton for user data

## Anti-Patterns to Avoid

### Do NOT Create Skeletons For:

1. **Static Content (Hero, Benefits, Landing sections)**
   - These components render immediately with no data fetching
   - Adding artificial loading delays (e.g., `setTimeout(..., 100)`) is an anti-pattern
   - If content appears instantly, a skeleton just adds unnecessary flash

2. **Form Submission States**
   - During form submission, keep the form visible with a loading button state
   - Do NOT replace the entire form with a skeleton
   - Use button loading indicators instead: `<Button disabled loading>Submitting...</Button>`

3. **Static Dialogs (Settings, Preferences)**
   - If dialog content is static or already loaded, don't add skeleton
   - Only use skeleton if dialog fetches data after opening

4. **Already-Efficient Components**
   - ChatSidebar already has good inline skeleton composition
   - Don't create separate `SessionListSkeleton` component - recommend inline composition instead

## React/Frontend Best Practices

All skeleton components MUST follow these patterns:

### 1. Component Optimization
- **Always use `React.memo()`** for skeleton components (they receive static props)
- **Add `displayName`** to all components for React DevTools debugging
- **Include `className?: string`** prop in all interfaces for composability

### 2. Array Rendering Performance
```tsx
// BAD - Creates new array on every render
{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} />)}

// GOOD - Extract array keys outside component/render
const SKELETON_KEYS = Array.from({ length: 10 }, (_, i) => `skeleton-${i}`);
{SKELETON_KEYS.map((key) => <Skeleton key={key} />)}

// GOOD - Use useMemo for dynamic counts
const keys = useMemo(() => Array.from({ length: count }, (_, i) => `item-${i}`), [count]);
```

### 3. Animation Strategy
```tsx
// BAD - Avoid framer-motion for simple skeleton fades
<motion.div animate={{ opacity: 1 }}>

// GOOD - Use CSS transitions (more performant)
<div className="transition-opacity duration-200">
```

### 4. Prevent Skeleton Flash
```tsx
// Use minimum display time hook to prevent flash on fast loads
const useMinimumLoadingTime = (isLoading: boolean, minTime = 300) => {
  const [showLoading, setShowLoading] = useState(isLoading);
  useEffect(() => {
    if (isLoading) {
      setShowLoading(true);
    } else {
      const timer = setTimeout(() => setShowLoading(false), minTime);
      return () => clearTimeout(timer);
    }
  }, [isLoading, minTime]);
  return showLoading;
};
```

### 5. TypeScript Types
```tsx
// Reference existing types instead of duplicating
import type { ArtifactType } from '../ArtifactContainer';

// Always include className for flexibility
interface ComponentSkeletonProps {
  className?: string;
  // ... other props
}
```

### 6. Testing with Vitest
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
```

### 7. File Naming
- Use **kebab-case** for skeleton files: `artifact-skeleton.tsx`
- Matches existing codebase patterns

## Design System & Patterns

### 1. Skeleton Principles

Following shadcn/ui best practices:

```tsx
// Good: Semantic sizing matching content
<Skeleton className="h-4 w-full" />  // Text line
<Skeleton className="h-10 w-64" />   // Button
<Skeleton className="h-32 w-full" /> // Card content

// Bad: Generic sizing without context
<Skeleton className="h-20 w-20" />   // What is this for?
```

### 2. Skeleton Variants

#### **Text Skeleton**
```tsx
// Single line
<Skeleton className="h-4 w-full" />

// Multi-line paragraph
<div className="space-y-2">
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-5/6" />
  <Skeleton className="h-4 w-4/5" />
</div>
```

#### **Card Skeleton**
```tsx
<div className="space-y-3">
  <Skeleton className="h-32 w-full rounded-lg" /> {/* Image */}
  <div className="space-y-2">
    <Skeleton className="h-4 w-3/4" />           {/* Title */}
    <Skeleton className="h-4 w-full" />          {/* Description */}
    <Skeleton className="h-4 w-2/3" />
  </div>
</div>
```

#### **Avatar + Text Skeleton**
```tsx
<div className="flex items-center gap-3">
  <Skeleton className="h-10 w-10 rounded-full" /> {/* Avatar */}
  <div className="space-y-2 flex-1">
    <Skeleton className="h-4 w-32" />             {/* Name */}
    <Skeleton className="h-3 w-24" />             {/* Meta */}
  </div>
</div>
```

#### **Table Skeleton**
```tsx
// Extract array keys outside render
const SKELETON_TABLE_KEYS = Array.from({ length: 5 }, (_, i) => `skeleton-row-${i}`);

<div className="space-y-2">
  {SKELETON_TABLE_KEYS.map((key) => (
    <Skeleton key={key} className="h-12 w-full" />
  ))}
</div>
```

### 3. Accessibility Requirements

All skeleton components must:

```tsx
<div
  role="status"
  aria-live="polite"
  aria-label="Loading content"
  className="...skeleton classes..."
>
  <Skeleton ... />
  <span className="sr-only">Loading...</span>
</div>
```

**Why this matters:**
- `role="status"`: Announces loading state to screen readers
- `aria-live="polite"`: Updates users without interrupting
- `aria-label`: Provides context about what's loading
- `sr-only` text: Fallback for older assistive tech

### 4. Performance Considerations

```tsx
// Good: Conditional rendering
{isLoading ? <ComponentSkeleton /> : <Component data={data} />}

// Good: Extract array keys outside render
const SKELETON_KEYS = Array.from({ length: 10 }, (_, i) => `skeleton-${i}`);
{SKELETON_KEYS.map((key, index) => (
  <Skeleton
    key={key}
    className="..."
    style={{ animationDelay: `${index * 100}ms` }}
  />
))}

// Bad: Array.from() inside render
{Array.from({ length: 10 }).map((_, i) => (
  <Skeleton key={i} ... />
))}

// Bad: Always rendering both
<div className={isLoading ? 'block' : 'hidden'}>
  <ComponentSkeleton />
</div>
<div className={!isLoading ? 'block' : 'hidden'}>
  <Component />
</div>
```

## Implementation Plan

### Phase 1: Create Tier 1 Primitive Components (Week 1)

#### 1.1 SkeletonLine
**File:** `src/components/ui/skeleton-line.tsx`

```tsx
import { memo } from 'react';
import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';

interface SkeletonLineProps {
  width?: 'full' | '3/4' | '2/3' | '1/2' | '1/3' | '1/4';
  className?: string;
}

export const SkeletonLine = memo(({ width = 'full', className }: SkeletonLineProps) => {
  const widthClass = {
    'full': 'w-full',
    '3/4': 'w-3/4',
    '2/3': 'w-2/3',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '1/4': 'w-1/4',
  }[width];

  return <Skeleton className={cn('h-4', widthClass, className)} />;
});

SkeletonLine.displayName = 'SkeletonLine';
```

#### 1.2 SkeletonParagraph
**File:** `src/components/ui/skeleton-paragraph.tsx`

```tsx
import { memo } from 'react';
import { SkeletonLine } from './skeleton-line';
import { cn } from '@/lib/utils';

interface SkeletonParagraphProps {
  lines?: number;
  className?: string;
}

const LINE_WIDTHS = ['full', '5/6', '4/5', '3/4', '2/3'] as const;

export const SkeletonParagraph = memo(({ lines = 3, className }: SkeletonParagraphProps) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLine
          key={`para-line-${i}`}
          width={LINE_WIDTHS[i % LINE_WIDTHS.length]}
        />
      ))}
    </div>
  );
});

SkeletonParagraph.displayName = 'SkeletonParagraph';
```

#### 1.3 SkeletonAvatar
**File:** `src/components/ui/skeleton-avatar.tsx`

```tsx
import { memo } from 'react';
import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';

interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SkeletonAvatar = memo(({ size = 'md', className }: SkeletonAvatarProps) => {
  const sizeClass = {
    'sm': 'h-8 w-8',
    'md': 'h-10 w-10',
    'lg': 'h-12 w-12',
  }[size];

  return <Skeleton className={cn(sizeClass, 'rounded-full', className)} />;
});

SkeletonAvatar.displayName = 'SkeletonAvatar';
```

#### 1.4 SkeletonCard
**File:** `src/components/ui/skeleton-card.tsx`

```tsx
import { memo } from 'react';
import { Skeleton } from './skeleton';
import { SkeletonParagraph } from './skeleton-paragraph';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  hasImage?: boolean;
  className?: string;
}

export const SkeletonCard = memo(({ hasImage = true, className }: SkeletonCardProps) => {
  return (
    <div className={cn('space-y-3', className)}>
      {hasImage && <Skeleton className="h-32 w-full rounded-lg" />}
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" /> {/* Title */}
        <SkeletonParagraph lines={2} />
      </div>
    </div>
  );
});

SkeletonCard.displayName = 'SkeletonCard';
```

### Phase 2: Enhance Existing ArtifactSkeleton (Week 1)

The `ArtifactSkeleton` already exists at `src/components/ui/artifact-skeleton.tsx`. Enhancements needed:

**Current state**: Supports code, markdown, html, svg, mermaid, react, image types with basic layouts.

**Enhancements to add:**
1. Add `role="status"` and `aria-label` for accessibility
2. Add `sr-only` text for screen readers
3. Wrap with `memo()` for performance

```tsx
// Enhanced artifact-skeleton.tsx
import { memo } from 'react';
import { cn } from "@/lib/utils";

export type ArtifactType = "code" | "markdown" | "html" | "svg" | "mermaid" | "react" | "image";

interface ArtifactSkeletonProps {
  type?: ArtifactType;
  className?: string;
}

export const ArtifactSkeleton = memo(({ type = "code", className }: ArtifactSkeletonProps) => {
  const baseClasses = "animate-pulse bg-muted rounded";

  return (
    <div role="status" aria-label="Loading artifact" className={className}>
      {/* ... existing type-specific rendering ... */}
      <span className="sr-only">Loading artifact</span>
    </div>
  );
});

ArtifactSkeleton.displayName = 'ArtifactSkeleton';
```

### Phase 3: Critical Path Integration (Week 1-2)

#### Priority 1: Artifact System
**Impact: High** - Users stare at blank screens during 2-5s bundling

**Files to modify:**

1. **ArtifactContainer.tsx**
   ```tsx
   // Add bundleStatus check
   const [bundleStatus, setBundleStatus] = useState<'idle' | 'bundling' | 'success' | 'error'>('idle');

   // Wrap renderPreview
   const renderPreview = () => {
     if (bundleStatus === 'bundling') {
       return <ArtifactSkeleton type="react" />;
     }
     return <ArtifactRenderer ... />;
   };
   ```

2. **ArtifactRenderer.tsx** - Add Suspense boundary for lazy-loaded Sandpack:
   ```tsx
   // Line 22-26: Already has lazy loading, add Suspense fallback
   <Suspense fallback={<ArtifactSkeleton type="react" />}>
     <SandpackArtifactRenderer {...props} />
   </Suspense>
   ```

3. **BundledArtifactFrame.tsx**
   ```tsx
   // Add skeleton during initial bundle load
   {!bundleUrl && artifact.bundleStatus === 'bundling' && (
     <ArtifactSkeleton type="react" />
   )}
   ```

#### Priority 2: Image Generation Skeleton
**Impact: High** - Image generation can take 5-10 seconds

**File: MessageWithArtifacts.tsx**
```tsx
// Add skeleton for image artifacts during generation (inline composition)
{artifact.type === 'image' && !artifact.content && (
  <div className="relative" role="status" aria-label="Generating image">
    <Skeleton className="h-96 w-full rounded-lg" />
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-sm text-muted-foreground">Generating image...</div>
    </div>
    <span className="sr-only">Generating image</span>
  </div>
)}
```

### Phase 4: Inline Composition for Other Components (Week 2)

> **Note**: These use inline composition of Tier 1 primitives rather than separate skeleton components.

#### 4.1 ChatSidebar Loading State
**File: ChatSidebar.tsx** (lines 143-155)

The existing inline skeleton composition is appropriate. Keep as-is, just ensure accessibility attributes are present:

```tsx
{isLoading && (
  <div role="status" aria-label="Loading conversations" className="px-4 pt-3 space-y-6">
    {/* Today group */}
    <div className="space-y-2">
      <Skeleton className="h-4 w-16 mb-2" />
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
    {/* Yesterday group */}
    <div className="space-y-2">
      <Skeleton className="h-4 w-20 mb-2" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
    <span className="sr-only">Loading conversations</span>
  </div>
)}
```

#### 4.2 UserProfileButton
**File: UserProfileButton.tsx**

```tsx
// While loading user data (inline composition)
{isLoading ? (
  <div className="flex items-center gap-2" role="status" aria-label="Loading profile">
    <Skeleton className="h-8 w-8 rounded-full" />
    {!collapsed && <Skeleton className="h-4 w-24" />}
    <span className="sr-only">Loading profile</span>
  </div>
) : (
  // ... actual profile button
)}
```

### Phase 5: Data-Heavy Components (Week 3)

#### 5.1 Admin Dashboard Tables
**File: AdminDashboard.tsx** (inline composition)

```tsx
// Extract array keys outside component
const TABLE_ROW_KEYS = Array.from({ length: 10 }, (_, i) => `row-${i}`);

// Inline table skeleton
{isLoading && (
  <div role="status" aria-label="Loading data" className="space-y-2">
    <Skeleton className="h-12 w-full" /> {/* Header */}
    {TABLE_ROW_KEYS.map((key) => (
      <Skeleton key={key} className="h-16 w-full" />
    ))}
    <span className="sr-only">Loading table data</span>
  </div>
)}
```

#### 5.2 Deep Research Components
**File: src/components/deep-research/** (inline composition)

```tsx
// Extract array keys outside component
const RESEARCH_RESULT_KEYS = Array.from({ length: 5 }, (_, i) => `result-${i}`);

// Inline research skeleton
{isLoading && (
  <div role="status" aria-label="Researching" className="space-y-4">
    {RESEARCH_RESULT_KEYS.map((key) => (
      <div key={key} className="border rounded-lg p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <Skeleton className="h-4 w-32" />
      </div>
    ))}
    <span className="sr-only">Conducting research</span>
  </div>
)}
```

## File Structure

After implementation, the skeleton-related files should be:

```
src/components/ui/
├── skeleton.tsx              # Base component (existing)
├── skeleton-line.tsx         # Tier 1: Single line primitive
├── skeleton-paragraph.tsx    # Tier 1: Multi-line primitive
├── skeleton-avatar.tsx       # Tier 1: Avatar primitive
├── skeleton-card.tsx         # Tier 1: Card primitive
├── artifact-skeleton.tsx     # Tier 2: Domain-specific (existing, enhanced)
└── message-skeleton.tsx      # Tier 2: Domain-specific (existing)
```

## Testing Strategy

### 1. Visual Regression Testing

```tsx
// __tests__/skeletons.visual.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ArtifactSkeleton } from '@/components/ui/artifact-skeleton';

describe('Skeleton Visual Tests', () => {
  it('matches snapshot for artifact skeleton', () => {
    const { container } = render(<ArtifactSkeleton type="react" />);
    expect(container).toMatchSnapshot();
  });

  it('applies pulse animation', () => {
    const { container } = render(<ArtifactSkeleton />);
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('passes className prop correctly', () => {
    const { container } = render(<ArtifactSkeleton className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
```

### 2. Accessibility Audits

```bash
# Use axe-core for automated a11y testing
npm run test:a11y
```

**Checklist:**
- [ ] All skeletons have `role="status"`
- [ ] All skeletons have `aria-label` describing what's loading
- [ ] Screen reader announcements work properly
- [ ] Keyboard navigation isn't blocked by skeletons
- [ ] Color contrast meets WCAG AA (muted backgrounds)

### 3. Performance Testing

**Target Metrics:**
- Skeleton should appear within **100ms** of component mount
- Perceived performance improvement: **20-30% faster** feeling (research-backed estimate)
- Artifact bundling (2-5s) will see **25-35% perceived improvement** due to visual feedback
- No layout shift (CLS score remains 0)

## Rollout Plan

### Week 1
- [ ] Create Tier 1 primitive components (SkeletonLine, SkeletonParagraph, SkeletonAvatar, SkeletonCard)
- [ ] Enhance existing ArtifactSkeleton with accessibility attributes
- [ ] Wire ArtifactSkeleton into ArtifactContainer/ArtifactRenderer
- [ ] Add Suspense boundaries for lazy-loaded components

### Week 2
- [ ] Add image generation skeleton (inline composition)
- [ ] Review ChatSidebar skeleton for accessibility
- [ ] Add UserProfileButton loading state (inline composition)
- [ ] Accessibility audit

### Week 3
- [ ] Admin dashboard table skeletons (inline composition)
- [ ] Deep research skeletons (inline composition)
- [ ] Performance testing
- [ ] User testing
- [ ] Documentation update

## Success Metrics

### Quantitative
- **Perceived Load Time**: 20-30% improvement in user surveys (research-backed estimate)
- **Bounce Rate**: 10-15% reduction on slow connections
- **TTI (Time to Interactive)**: No regression (skeletons don't delay interactivity)
- **CLS (Cumulative Layout Shift)**: Maintain 0 score

### Qualitative
- Users report app "feels faster"
- Reduced confusion during loading states
- Improved brand perception (polish, professionalism)
- Positive feedback from accessibility users

## References

- [shadcn/ui Skeleton Docs](https://www.shadcn.io/ui/skeleton)
- [React Suspense Patterns](https://react.dev/reference/react/Suspense)
- [WCAG 2.1 Loading States](https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html)
- [Google Web Vitals](https://web.dev/vitals/)
- [Perceived Performance Research](https://www.nngroup.com/articles/response-times-3-important-limits/)

---

**Document Version:** 2.0
**Last Updated:** 2025-12-28
**Owner:** UI/UX Team
**Status:** Ready for Implementation

**Changelog:**
- v2.0 (2025-12-28): Architecture feedback incorporated
  - Added two-tier skeleton architecture (Primitives + Domain-specific)
  - Added Suspense integration pattern referencing ArtifactRenderer.tsx
  - Noted ArtifactSkeleton already exists - plan now enhances rather than creates
  - Removed proposals for SessionListSkeleton, HeroSkeleton, ShowcaseSkeleton as separate components
  - Recommend inline composition for sidebar, landing page, forms
  - Removed anti-patterns: artificial 100ms Hero loading, Settings dialog skeleton, FormSkeleton for submission
  - Updated file structure to reflect simplified architecture
  - Added Anti-Patterns section documenting what NOT to skeleton
- v1.1 (2025-12-28): Added React/Frontend best practices section
- v1.0 (2025-12-28): Initial implementation plan
