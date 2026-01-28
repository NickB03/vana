# Component Library

**Last Updated:** 2026-01-28

## Overview

Our component library provides reusable, accessible UI elements built on top of the design system. Components leverage typography, spacing, interaction, and animation constants for consistency.

### Component Philosophy
- **Composable:** Small, focused components that combine well
- **Accessible:** WCAG 2.1 AA compliant with keyboard navigation
- **Typed:** Full TypeScript support with prop interfaces
- **Themed:** Automatic light/dark mode support
- **Performant:** Optimized for rendering and bundle size

## Component Categories

1. **Skeleton Components** - Loading states
2. **shadcn/ui Components** - 69 components from Radix UI (see official docs)

---

## Skeleton Components

Loading state components that match the final content structure.

### Base Skeleton Component

The foundation for all skeleton components.

**Location:** `/src/components/ui/skeleton.tsx`

```tsx
import { Skeleton } from '@/components/ui/skeleton';

<Skeleton className="h-4 w-full" />
```

**Props:**
- Extends `React.HTMLAttributes<HTMLDivElement>`
- `className?: string` - Custom classes to control size/shape

**Default Styles:**
- `animate-pulse` - Pulsing animation
- `rounded-md` - Medium border radius
- `bg-muted` - Theme-aware muted background

**Examples:**

```tsx
// Single line
<Skeleton className="h-4 w-64" />

// Circular avatar
<Skeleton className="h-12 w-12 rounded-full" />

// Card
<Skeleton className="h-32 w-full" />

// Multiple lines
<div className="space-y-2">
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-4 w-1/2" />
</div>
```

---

### ArtifactSkeleton

Loading state for artifact rendering (code, HTML, React, diagrams).

**Location:** `/src/components/ui/artifact-skeleton.tsx`

```tsx
import { ArtifactSkeleton } from '@/components/ui/artifact-skeleton';

<ArtifactSkeleton type="code" />
```

**Props:**

```typescript
interface ArtifactSkeletonProps {
  type?: ArtifactType;  // Type of artifact to show skeleton for
  className?: string;   // Additional classes
}

type ArtifactType = "code" | "markdown" | "html" | "svg" | "mermaid" | "react" | "image";
```

**Type-Specific Skeletons:**

#### Code / Markdown
```tsx
<ArtifactSkeleton type="code" />
<ArtifactSkeleton type="markdown" />
```

**Layout:**
- Multiple lines with varying widths
- Simulates code structure
- Indented appearance

```tsx
// Visual representation:
// ███████████████░░░░
// ████████████████████
// ██████████████░░░░░░
// ███████████████░░░░░
//
// ████████████████████
// █████████████░░░░░░░
```

#### React / HTML
```tsx
<ArtifactSkeleton type="react" />
<ArtifactSkeleton type="html" />
```

**Layout:**
- Header bar
- Two-column grid
- Multiple text lines
- Simulates component structure

```tsx
// Visual representation:
// ███████████░░░░░░░░░
//
// ████████░░  ████████░░
// ████████░░  ████████░░
// ████████░░  ████████░░
//
// ████████████████████
// ███████████░░░░░░░░░
```

#### Mermaid / SVG
```tsx
<ArtifactSkeleton type="mermaid" />
<ArtifactSkeleton type="svg" />
```

**Layout:**
- Centered blocks
- Vertical stack with gaps
- Simulates diagram structure

```tsx
// Visual representation:
//     ████████████████
//
//     ██████  ██████
//
//     ████████████████
```

#### Image
```tsx
<ArtifactSkeleton type="image" />
```

**Layout:**
- Centered rectangle
- 16:9 aspect ratio
- Max width: 28rem (448px)

**Complete Example:**

```tsx
import { ArtifactSkeleton } from '@/components/ui/artifact-skeleton';
import { useState, useEffect } from 'react';

function ArtifactRenderer({ artifactId, type }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState(null);

  useEffect(() => {
    loadArtifact(artifactId).then((data) => {
      setContent(data);
      setIsLoading(false);
    });
  }, [artifactId]);

  if (isLoading) {
    return <ArtifactSkeleton type={type} />;
  }

  return <ArtifactContent content={content} />;
}
```

**Customization:**

```tsx
// Custom className
<ArtifactSkeleton type="code" className="bg-secondary" />

// With container
<div className="p-4 border rounded-lg">
  <ArtifactSkeleton type="react" />
</div>
```

---

### MessageSkeleton

Loading state for chat messages.

**Location:** `/src/components/ui/message-skeleton.tsx`

```tsx
import { MessageSkeleton } from '@/components/ui/message-skeleton';

<MessageSkeleton variant="assistant" />
```

**Props:**

```typescript
interface MessageSkeletonProps {
  variant?: "user" | "assistant";  // Message type
  className?: string;               // Additional classes
}
```

**Variants:**

#### User Message
```tsx
<MessageSkeleton variant="user" />
```

**Layout:**
- Right-aligned
- Rounded bubble shape (rounded-3xl)
- Single compact line
- Width: 16rem (256px)
- Height: 2.5rem (40px)

```tsx
// Visual representation:
//                    ████████████░░
```

**Use When:**
- Loading user message being sent
- Optimistic UI for sent messages
- Streaming user input

#### Assistant Message
```tsx
<MessageSkeleton variant="assistant" />
```

**Layout:**
- Left-aligned
- Multiple lines with varying widths
- Simulates paragraph structure
- Max width: 48rem (768px)

```tsx
// Visual representation:
// ████████████████████
// ██████████████░░░░░░
// ███████████████░░░░░
```

**Use When:**
- Waiting for AI response
- Streaming assistant response (initial)
- Loading message history

**Complete Example:**

```tsx
import { MessageSkeleton } from '@/components/ui/message-skeleton';
import { useState } from 'react';

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (content: string) => {
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content }]);

    setIsLoading(true);

    try {
      const response = await fetchAIResponse(content);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {messages.map((msg, i) => (
        <Message key={i} {...msg} />
      ))}

      {isLoading && <MessageSkeleton variant="assistant" />}
    </div>
  );
}
```

**Layout Context:**

```tsx
function MessageList() {
  return (
    <div className="space-y-6 p-4">
      {/* User message */}
      <div className="flex justify-end">
        <MessageSkeleton variant="user" />
      </div>

      {/* Assistant message */}
      <div className="flex justify-start">
        <MessageSkeleton variant="assistant" />
      </div>
    </div>
  );
}
```

---

## Skeleton Best Practices

### When to Use Skeletons

**DO Use:**
- Loading initial content
- Waiting for API responses
- Lazy loading components
- Streaming content (show before first chunk)

**DON'T Use:**
- For very fast operations (< 100ms)
- When showing a spinner is more appropriate
- For errors (use error states instead)

### Matching Content Structure

Skeleton should match final content as closely as possible:

```tsx
// Good - Skeleton matches actual message structure
{isLoading ? (
  <MessageSkeleton variant="assistant" />
) : (
  <Message role="assistant" content={content} />
)}

// Avoid - Generic skeleton that doesn't match
{isLoading ? (
  <Skeleton className="h-32 w-full" />
) : (
  <Message role="assistant" content={content} />
)}
```

### Skeleton Duration

- **Short (< 500ms):** Consider no skeleton
- **Medium (500ms - 2s):** Show skeleton immediately
- **Long (> 2s):** Show skeleton with progress indicator

### Accessibility

Skeletons automatically have:
- `animate-pulse` for visual loading indication
- Proper semantic structure
- Screen reader compatibility (non-interactive)

Add ARIA attributes for enhanced accessibility:

```tsx
<div role="status" aria-label="Loading message">
  <MessageSkeleton variant="assistant" />
  <span className="sr-only">Loading assistant response...</span>
</div>
```

---

## Component Patterns

### Progressive Loading

Load content in stages with appropriate skeletons:

```tsx
function ChatMessage({ messageId }: Props) {
  const { data: message, isLoading } = useQuery(['message', messageId]);
  const { data: artifact, isLoading: artifactLoading } = useQuery(
    ['artifact', message?.artifactId],
    { enabled: !!message?.artifactId }
  );

  if (isLoading) {
    return <MessageSkeleton variant="assistant" />;
  }

  return (
    <div>
      <MessageContent content={message.content} />

      {message.artifactId && (
        artifactLoading ? (
          <ArtifactSkeleton type={message.artifactType} />
        ) : (
          <ArtifactRenderer artifact={artifact} />
        )
      )}
    </div>
  );
}
```

### Optimistic Updates

Show skeleton immediately on user action:

```tsx
function ChatInput() {
  const [optimisticMessages, setOptimisticMessages] = useState([]);

  const sendMessage = async (content: string) => {
    // Add optimistic user message
    const tempId = Date.now();
    setOptimisticMessages(prev => [...prev, { id: tempId, role: 'user', content }]);

    // Show assistant skeleton
    const skeletonId = Date.now() + 1;
    setOptimisticMessages(prev => [...prev, { id: skeletonId, role: 'skeleton' }]);

    // Send to API
    const response = await sendToAPI(content);

    // Replace skeleton with real response
    setOptimisticMessages(prev =>
      prev.filter(m => m.id !== skeletonId)
    );
    addMessage(response);
  };

  return (
    <div>
      {optimisticMessages.map(msg =>
        msg.role === 'skeleton' ? (
          <MessageSkeleton key={msg.id} variant="assistant" />
        ) : (
          <Message key={msg.id} {...msg} />
        )
      )}
    </div>
  );
}
```

### Conditional Skeletons

Show appropriate skeleton based on context:

```tsx
function ArtifactPanel({ artifact, isLoading }: Props) {
  if (isLoading) {
    // Determine skeleton type from expected artifact type
    const skeletonType = artifact?.type || 'code';
    return <ArtifactSkeleton type={skeletonType} />;
  }

  return <ArtifactRenderer artifact={artifact} />;
}
```

---

## shadcn/ui Components

Our application uses 69 components from **shadcn/ui**, built on **Radix UI** primitives.

### Available Components

**Layout & Structure:**
- Accordion, Card, Separator, Tabs, Collapsible, ResizablePanel

**Navigation:**
- Navigation Menu, Breadcrumb, Pagination, Menubar, Command

**Form & Input:**
- Input, Textarea, Select, Checkbox, Radio Group, Switch, Slider, Calendar, Date Picker, Form

**Feedback:**
- Alert, Alert Dialog, Toast, Dialog, Drawer, Sheet, Popover, Tooltip, Progress, Skeleton

**Data Display:**
- Table, Badge, Avatar, Carousel, Chart, Aspect Ratio

**Buttons & Actions:**
- Button, Toggle, Toggle Group, Dropdown Menu, Context Menu

**Typography:**
- Typography components with theme support

### Documentation

For complete shadcn/ui component documentation:
- **Official Docs:** [https://ui.shadcn.com](https://ui.shadcn.com)
- **Local Files:** `/src/components/ui/`

### Usage Pattern

All shadcn/ui components follow this import pattern:

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function Example() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Form</CardTitle>
      </CardHeader>
      <CardContent>
        <Input placeholder="Enter text..." />
        <Button>Submit</Button>
      </CardContent>
    </Card>
  );
}
```

### Integration with Design System

shadcn/ui components automatically integrate with our design system:

```tsx
import { Button } from '@/components/ui/button';
import { COMPONENT_SPACING } from '@/utils/spacingConstants';
import { TYPOGRAPHY } from '@/utils/typographyConstants';

<Button className={`${COMPONENT_SPACING.full} ${TYPOGRAPHY.BODY.md.full}`}>
  Styled Button
</Button>
```

---

## Custom Component Examples

### Loading Card

Combine skeletons with design system:

```tsx
import { Skeleton } from '@/components/ui/skeleton';
import { CONTAINER_SPACING, GAP_SPACING } from '@/utils/spacingConstants';

function LoadingCard() {
  return (
    <div className={`${CONTAINER_SPACING.full} ${GAP_SPACING.md} flex flex-col border rounded-lg`}>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-10 w-24 mt-4" />
    </div>
  );
}
```

### Loading List

Skeleton list with proper spacing:

```tsx
import { MessageSkeleton } from '@/components/ui/message-skeleton';
import { GAP_SPACING } from '@/utils/spacingConstants';

function LoadingMessageList({ count = 3 }: { count?: number }) {
  return (
    <div className={GAP_SPACING.lg} flex flex-col>
      {Array.from({ length: count }).map((_, i) => (
        <MessageSkeleton
          key={i}
          variant={i % 2 === 0 ? 'user' : 'assistant'}
        />
      ))}
    </div>
  );
}
```

### Loading State HOC

Higher-order component for loading states:

```tsx
import { ComponentType } from 'react';

interface WithLoadingProps {
  isLoading: boolean;
  skeleton: React.ReactNode;
}

function withLoading<P extends object>(
  Component: ComponentType<P>,
  SkeletonComponent: React.ReactNode
) {
  return function WithLoadingComponent(props: P & WithLoadingProps) {
    const { isLoading, ...rest } = props;

    if (isLoading) {
      return <>{SkeletonComponent}</>;
    }

    return <Component {...(rest as P)} />;
  };
}

// Usage
const MessageWithLoading = withLoading(
  Message,
  <MessageSkeleton variant="assistant" />
);

<MessageWithLoading
  isLoading={isLoading}
  content={content}
  role="assistant"
/>
```

---

## Component Accessibility

### Keyboard Navigation

All interactive components support keyboard navigation:
- **Tab:** Focus next element
- **Shift+Tab:** Focus previous element
- **Enter/Space:** Activate button/link
- **Escape:** Close dialog/popover

### Screen Readers

Skeleton components work with screen readers:

```tsx
<div role="status" aria-live="polite" aria-busy="true">
  <MessageSkeleton variant="assistant" />
  <span className="sr-only">Loading assistant response</span>
</div>
```

### Focus Management

Components maintain focus when loading completes:

```tsx
function FocusPreservingComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleLoad = async () => {
    setIsLoading(true);
    await loadData();
    setIsLoading(false);
    buttonRef.current?.focus();
  };

  return (
    <button ref={buttonRef} onClick={handleLoad}>
      {isLoading ? 'Loading...' : 'Load Data'}
    </button>
  );
}
```

---

## Performance Considerations

### Lazy Loading Components

```tsx
import { lazy, Suspense } from 'react';
import { ArtifactSkeleton } from '@/components/ui/artifact-skeleton';

const ArtifactRenderer = lazy(() => import('./ArtifactRenderer'));

function LazyArtifact({ type, content }: Props) {
  return (
    <Suspense fallback={<ArtifactSkeleton type={type} />}>
      <ArtifactRenderer type={type} content={content} />
    </Suspense>
  );
}
```

### Memoization

Prevent unnecessary re-renders:

```tsx
import { memo } from 'react';

const MessageSkeleton = memo(({ variant }: MessageSkeletonProps) => {
  // Component implementation
});
```

---

## See Also

- [Design System Overview](./OVERVIEW.md) - Introduction to the design system
- [Spacing System](./SPACING.md) - Layout spacing constants
- [Typography System](./TYPOGRAPHY.md) - Text styling
- [Animations](./ANIMATIONS.md) - Motion and transitions
- [shadcn/ui Docs](https://ui.shadcn.com) - Official component documentation

---

## Technical Details

**Skeleton Components Location:** `/src/components/ui/`

**Dependencies:**
- React 18+
- Tailwind CSS 3.4+
- Radix UI (via shadcn/ui)
- TypeScript

**Bundle Impact:**
- Base Skeleton: ~0.5KB
- ArtifactSkeleton: ~1KB
- MessageSkeleton: ~0.8KB

**Browser Support:** All modern browsers with graceful fallback
