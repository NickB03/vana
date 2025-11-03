# ArtifactDiffViewer Component

A production-ready React component for displaying differences between artifact versions with syntax highlighting, multiple view modes, and responsive design.

## Features

- **Split & Unified Views**: Toggle between side-by-side and unified diff display
- **Syntax Highlighting**: Code-aware diff rendering with line numbers
- **Metadata Changes**: Displays title and type changes separately
- **Responsive Design**: Automatically switches to unified view on mobile
- **Loading States**: Skeleton loaders while fetching data
- **Error Handling**: Graceful handling of missing versions or parsing errors
- **Accessibility**: Fully keyboard navigable with proper ARIA labels
- **Theme-Aware**: Adapts to light/dark mode automatically

## Installation

The component is already integrated into the project with all dependencies:

```bash
# Dependencies (already installed)
npm install react-diff-view diff @types/diff
```

## Basic Usage

```tsx
import { ArtifactDiffViewer } from "@/components/ArtifactDiffViewer";
import { useState } from "react";

function MyComponent() {
  const [showDiff, setShowDiff] = useState(false);

  return (
    <>
      <button onClick={() => setShowDiff(true)}>
        Compare Versions
      </button>

      {showDiff && (
        <ArtifactDiffViewer
          artifactId="artifact-123"
          fromVersion={1}
          toVersion={2}
          onClose={() => setShowDiff(false)}
        />
      )}
    </>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `artifactId` | `string` | Yes | Unique identifier for the artifact |
| `fromVersion` | `number` | Yes | Starting version number |
| `toVersion` | `number` | Yes | Ending version number |
| `onClose` | `() => void` | Yes | Callback when dialog is closed |

## Component Structure

```
ArtifactDiffViewer
├── Dialog (shadcn/ui)
│   ├── DialogHeader
│   │   ├── Title & Version Badge
│   │   └── View Mode Toggle (Desktop)
│   ├── DialogContent
│   │   ├── Loading Skeleton
│   │   ├── Error Alert
│   │   ├── Metadata Changes Alert
│   │   ├── No Changes Alert
│   │   └── Diff Display (react-diff-view)
│   └── DialogFooter
│       └── Close Button
└── CSS Styling (ArtifactDiffViewer.css)
```

## View Modes

### Split View (Default on Desktop)
Shows old and new content side-by-side with synchronized scrolling.

```
┌──────────────┬──────────────┐
│ Old Content  │ New Content  │
│ - removed    │ + added      │
│   unchanged  │   unchanged  │
└──────────────┴──────────────┘
```

### Unified View (Default on Mobile)
Shows changes in a single column with line markers.

```
┌────────────────────────────┐
│ - removed line             │
│ + added line               │
│   unchanged line           │
└────────────────────────────┘
```

## Diff Color Scheme

| Change Type | Light Mode | Dark Mode |
|-------------|------------|-----------|
| Additions | Light Green | Dark Green |
| Deletions | Light Red | Dark Red |
| Context | Default | Default |
| Line Numbers | Muted | Muted |

## Integration with useArtifactVersions

The component automatically fetches version data using the `useArtifactVersions` hook:

```tsx
import { useArtifactVersions } from "@/hooks/useArtifactVersions";

// Inside the component:
const { getVersionDiff, isLoading } = useArtifactVersions(artifactId);

// getVersionDiff returns:
// {
//   oldContent: string,
//   newContent: string,
//   oldTitle: string,
//   newTitle: string,
//   oldType: string,
//   newType: string
// }
```

## Advanced Usage Examples

### 1. Compare Current with Previous

```tsx
function QuickCompare({ artifactId, currentVersion }) {
  const [showDiff, setShowDiff] = useState(false);

  if (currentVersion <= 1) {
    return <div>No previous version</div>;
  }

  return (
    <>
      <Button onClick={() => setShowDiff(true)}>
        What Changed?
      </Button>
      {showDiff && (
        <ArtifactDiffViewer
          artifactId={artifactId}
          fromVersion={currentVersion - 1}
          toVersion={currentVersion}
          onClose={() => setShowDiff(false)}
        />
      )}
    </>
  );
}
```

### 2. Version Selector

```tsx
function VersionSelector({ artifactId, versions }) {
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(versions.length);
  const [showDiff, setShowDiff] = useState(false);

  return (
    <div>
      <select value={from} onChange={(e) => setFrom(Number(e.target.value))}>
        {versions.map(v => (
          <option key={v} value={v}>Version {v}</option>
        ))}
      </select>

      <select value={to} onChange={(e) => setTo(Number(e.target.value))}>
        {versions.map(v => (
          <option key={v} value={v}>Version {v}</option>
        ))}
      </select>

      <Button onClick={() => setShowDiff(true)}>
        Compare
      </Button>

      {showDiff && (
        <ArtifactDiffViewer
          artifactId={artifactId}
          fromVersion={from}
          toVersion={to}
          onClose={() => setShowDiff(false)}
        />
      )}
    </div>
  );
}
```

### 3. Inline Version History

```tsx
function VersionHistory({ artifactId }) {
  const { versions } = useArtifactVersions(artifactId);
  const [diffState, setDiffState] = useState(null);

  return (
    <div>
      <h3>Version History</h3>
      {versions.map((v, i) => (
        <div key={v.id}>
          <span>v{v.version_number} - {v.created_at}</span>
          {i < versions.length - 1 && (
            <Button
              size="sm"
              onClick={() =>
                setDiffState({
                  from: versions[i + 1].version_number,
                  to: v.version_number,
                })
              }
            >
              Compare with Previous
            </Button>
          )}
        </div>
      ))}

      {diffState && (
        <ArtifactDiffViewer
          artifactId={artifactId}
          fromVersion={diffState.from}
          toVersion={diffState.to}
          onClose={() => setDiffState(null)}
        />
      )}
    </div>
  );
}
```

## Styling Customization

The component uses CSS custom properties for theming. Override in your CSS:

```css
/* Custom diff colors */
.diff-view {
  --diff-gutter-insert-background-color: hsl(120, 100%, 95%);
  --diff-gutter-insert-text-color: hsl(120, 100%, 30%);
  --diff-gutter-delete-background-color: hsl(0, 100%, 95%);
  --diff-gutter-delete-text-color: hsl(0, 100%, 40%);
}

/* Dark mode overrides */
.dark .diff-view {
  --diff-gutter-insert-background-color: hsl(120, 100%, 15%);
  --diff-gutter-insert-text-color: hsl(120, 100%, 70%);
}
```

## Performance Considerations

- **Memoization**: Diff generation is memoized and only recomputes when version data changes
- **Lazy Loading**: Dialog content is only rendered when opened
- **Virtual Scrolling**: Large diffs are handled efficiently by react-diff-view
- **Context Lines**: Limits context to 3 lines above/below changes for better performance

## Accessibility

- **Keyboard Navigation**:
  - `ESC` closes the dialog
  - `Tab` navigates between controls
- **Screen Readers**:
  - Proper ARIA labels on all interactive elements
  - Semantic HTML structure
- **Color Contrast**:
  - WCAG AA compliant colors
  - Uses both color and symbols for changes

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari 14+
- Chrome Android 90+

## Testing

Comprehensive test suite included in `ArtifactDiffViewer.test.tsx`:

```bash
# Run tests
npm test -- src/components/__tests__/ArtifactDiffViewer.test.tsx

# Run with coverage
npm test -- src/components/__tests__/ArtifactDiffViewer.test.tsx --coverage
```

Test coverage:
- ✅ Rendering with version numbers
- ✅ Loading states
- ✅ Error states
- ✅ Empty/no changes state
- ✅ Metadata changes display
- ✅ View mode toggle
- ✅ Close functionality
- ✅ Responsive behavior
- ✅ Edge cases (same version, missing data, large diffs)

## Troubleshooting

### Diff not showing

**Problem**: Component shows "No content changes detected" even when content differs.

**Solution**: Ensure the content strings have actual differences. The `diff` library compares line-by-line.

```tsx
// This won't show changes (same lines):
oldContent: "const x = 1; const y = 2;"
newContent: "const x = 2; const y = 1;"

// This will show changes (different lines):
oldContent: "const x = 1;\nconst y = 2;"
newContent: "const x = 2;\nconst y = 1;"
```

### Performance issues with large files

**Problem**: Slow rendering with very large diffs.

**Solution**: Consider splitting large files or increasing context line limit:

```tsx
// In ArtifactDiffViewer.tsx, modify:
const diffText = createPatch(
  "artifact",
  oldContent,
  newContent,
  "old version",
  "new version",
  { context: 1 } // Reduce from 3 to 1
);
```

### Styling issues in dark mode

**Problem**: Diff colors not visible in dark mode.

**Solution**: Ensure the dark mode CSS variables are loaded. Check that `ArtifactDiffViewer.css` is imported.

## API Reference

### ArtifactDiffViewerProps

```typescript
interface ArtifactDiffViewerProps {
  artifactId: string;     // Unique identifier for the artifact
  fromVersion: number;    // Starting version (older)
  toVersion: number;      // Ending version (newer)
  onClose: () => void;    // Called when dialog is closed
}
```

### useArtifactVersions Hook

```typescript
const {
  getVersionDiff,  // (from: number, to: number) => DiffData | null
  isLoading,       // boolean
  error,           // string | null
} = useArtifactVersions(artifactId);
```

## File Structure

```
src/components/
├── ArtifactDiffViewer.tsx          # Main component
├── ArtifactDiffViewer.css          # Custom styles
├── ArtifactDiffViewer.example.tsx  # Usage examples
├── ArtifactDiffViewer.README.md    # This file
└── __tests__/
    └── ArtifactDiffViewer.test.tsx # Test suite
```

## Dependencies

- `react-diff-view@^3.3.2` - Diff rendering engine
- `diff@^8.0.2` - Diff generation library
- `@/components/ui/*` - shadcn/ui components
- `lucide-react` - Icons

## Future Enhancements

Potential improvements for future versions:

- [ ] Word-level diff highlighting
- [ ] Copy diff to clipboard
- [ ] Download diff as file
- [ ] Search within diff
- [ ] Collapse unchanged sections
- [ ] Diff statistics (lines added/removed)
- [ ] Syntax-specific highlighting (for code artifacts)
- [ ] Diff comments/annotations
- [ ] Print-friendly view

## Contributing

When modifying this component:

1. Ensure all tests pass: `npm test`
2. Update examples if API changes
3. Update this README with new features
4. Maintain TypeScript strict mode compliance
5. Follow existing code style and patterns

## License

This component is part of the llm-chat-site project.

## Support

For issues or questions:
- Check existing tests for usage patterns
- Review examples in `ArtifactDiffViewer.example.tsx`
- Consult `useArtifactVersions.ts` for hook documentation
