# ArtifactVersionSelector Component

A production-ready React component for displaying and selecting artifact versions with full TypeScript support, accessibility features, and responsive design.

## Features

- **Version History Display**: Shows all versions in reverse chronological order (newest first)
- **Visual Feedback**: Highlights currently selected version with badge and checkmark
- **Relative Timestamps**: Uses `date-fns` for human-readable time formatting ("2 hours ago", "3 days ago")
- **Loading & Error States**: Handles all edge cases with proper UI feedback
- **Empty State**: Clear messaging when no versions exist
- **Responsive Design**: Works seamlessly on mobile and desktop
- **Accessibility**: Full keyboard navigation, ARIA labels, semantic HTML
- **Performance**: Optimized with ScrollArea for long version lists
- **Type Safety**: Complete TypeScript types with strict mode support

## Installation

The component is already integrated into this project. It uses:

- `@/hooks/useArtifactVersions` - Artifact version management
- `@/components/ui/scroll-area` - Scrollable container (shadcn/ui)
- `@/components/ui/badge` - Version number badges (shadcn/ui)
- `date-fns` - Timestamp formatting
- `lucide-react` - Icons (Clock, Check)

## Basic Usage

```tsx
import { ArtifactVersionSelector } from "@/components/ArtifactVersionSelector";
import { ArtifactVersion } from "@/hooks/useArtifactVersions";
import { useState } from "react";

function MyComponent() {
  const [currentVersion, setCurrentVersion] = useState<number>(3);

  const handleVersionSelect = (version: ArtifactVersion) => {
    setCurrentVersion(version.version_number);
    console.log("Selected:", version);
    // Load artifact content: loadArtifact(version.artifact_content)
  };

  return (
    <ArtifactVersionSelector
      artifactId="artifact-123"
      currentVersion={currentVersion}
      onVersionSelect={handleVersionSelect}
    />
  );
}
```

## Props

```typescript
interface ArtifactVersionSelectorProps {
  artifactId: string;           // Unique artifact identifier
  currentVersion?: number;      // Currently selected version number (optional)
  onVersionSelect: (version: ArtifactVersion) => void;  // Selection callback
}
```

## ArtifactVersion Type

```typescript
interface ArtifactVersion {
  id: string;                   // Database ID
  message_id: string;           // Associated message ID
  artifact_id: string;          // Artifact identifier
  version_number: number;       // Version sequence number
  artifact_type: string;        // Type (react, code, html, etc.)
  artifact_title: string;       // Version title
  artifact_content: string;     // Full content
  artifact_language: string | null;  // Programming language
  content_hash: string;         // SHA-256 hash for deduplication
  created_at: string;           // ISO timestamp
}
```

## Usage Patterns

### 1. With Sheet (Recommended)

Display version history in a slide-out panel:

```tsx
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";

<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline" size="sm">
      <History className="mr-2 h-4 w-4" />
      Version History
    </Button>
  </SheetTrigger>

  <SheetContent side="right" className="w-full sm:max-w-md">
    <ArtifactVersionSelector
      artifactId={artifactId}
      currentVersion={currentVersion}
      onVersionSelect={handleVersionSelect}
    />
  </SheetContent>
</Sheet>
```

### 2. Inline Sidebar

Permanent sidebar in your artifact viewer:

```tsx
<div className="flex h-screen">
  <div className="flex-1">
    {/* Main artifact display */}
  </div>

  <div className="w-80 border-l">
    <ArtifactVersionSelector
      artifactId={artifactId}
      currentVersion={currentVersion}
      onVersionSelect={handleVersionSelect}
    />
  </div>
</div>
```

### 3. Mobile-Responsive

Bottom sheet on mobile, sidebar on desktop:

```tsx
<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <SheetContent side="bottom" className="h-[80vh] md:hidden">
    <ArtifactVersionSelector {...props} />
  </SheetContent>
</Sheet>

<div className="hidden md:block">
  <ArtifactVersionSelector {...props} />
</div>
```

## Component States

### Loading State
Shows spinning loader with "Loading versions..." message.

### Error State
Displays error message in destructive color with error details.

### Empty State
Shows clock icon with "No versions available" message and guidance.

### Loaded State
Displays scrollable list of versions with:
- Version number badge (v1, v2, v3, etc.)
- Artifact title
- Relative timestamp
- Programming language (if available)
- Visual indicator for selected version

## Accessibility

The component follows WCAG 2.1 Level AA guidelines:

- **Keyboard Navigation**: Full support with Tab and Enter keys
- **ARIA Labels**: Descriptive labels for screen readers
- **Semantic HTML**: `<time>` elements with `datetime` attributes
- **Focus Management**: Visible focus indicators with ring-offset
- **Current State**: `aria-current="true"` on selected version
- **Color Contrast**: Uses theme-aware colors for readability

## Styling

The component uses Tailwind CSS classes and respects your theme:

- **Light/Dark Mode**: Automatically adapts using theme variables
- **Hover States**: Interactive feedback on version items
- **Truncation**: Long titles truncate gracefully
- **Responsive Text**: Font sizes adjust for mobile/desktop

### Customization

Override styles using Tailwind classes:

```tsx
<div className="custom-wrapper">
  <ArtifactVersionSelector {...props} />
</div>

<style>
.custom-wrapper h2 {
  @apply text-2xl font-bold;
}
</style>
```

## Performance Considerations

- **ScrollArea**: Virtualizes long lists for smooth scrolling
- **React Query**: Caches version data with 5-minute stale time
- **Memoization**: Efficient re-renders only when data changes
- **Debouncing**: Built into the underlying hook

## Testing

Comprehensive test suite with 16 tests covering:

- Loading, error, and empty states
- Version list rendering
- Version selection callbacks
- Keyboard navigation
- Accessibility attributes
- Edge cases (missing data, long titles)

Run tests:

```bash
npm test -- src/components/__tests__/ArtifactVersionSelector.test.tsx
```

## Integration with useArtifactVersions Hook

The component uses the `useArtifactVersions` hook which provides:

- **Automatic fetching**: Loads versions on mount
- **Caching**: React Query integration
- **Deduplication**: SHA-256 hash-based duplicate detection
- **RLS Security**: Row-level security enforcement
- **Error handling**: Permission and validation errors

## File Locations

- Component: `/src/components/ArtifactVersionSelector.tsx`
- Tests: `/src/components/__tests__/ArtifactVersionSelector.test.tsx`
- Examples: `/src/components/ArtifactVersionSelector.example.tsx`
- Hook: `/src/hooks/useArtifactVersions.ts`

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Examples

See `ArtifactVersionSelector.example.tsx` for 5 detailed integration examples:

1. Basic usage with Sheet (sidebar)
2. Inline usage in artifact panel
3. Version comparison workflow
4. Mobile-responsive drawer
5. Integration with artifact toolbar

## Troubleshooting

**Issue**: Versions not loading
- Check `artifactId` is correct and exists in database
- Verify user has permission to view versions (RLS policies)
- Check browser console for errors

**Issue**: Selected version not highlighting
- Ensure `currentVersion` prop matches a `version_number` in the list
- Version numbers are integers (1, 2, 3), not IDs

**Issue**: Timestamps showing wrong relative time
- Check system timezone settings
- Verify `created_at` is valid ISO 8601 format

## Related Components

- `Artifact` - Renders artifact content
- `ChatInterface` - Main chat UI with artifact canvas
- `VirtualizedMessageList` - Message list with artifacts

## Contributing

When modifying this component:

1. Update TypeScript types if props change
2. Add tests for new functionality
3. Update this README with examples
4. Ensure accessibility standards maintained
5. Test on mobile and desktop viewports

## License

Part of the llm-chat-site project. See repository license.
