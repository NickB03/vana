# PromptInputControls - Quick Reference

**Component:** `PromptInputControls`
**Location:** `src/components/prompt-kit/prompt-input-controls.tsx`
**Purpose:** Shared prompt input action buttons (image mode, create, send, file upload)

## Quick Start

### Basic Usage (Minimal)

```tsx
import { PromptInputControls } from "@/components/prompt-kit/prompt-input-controls";

<PromptInputControls
  input={input}
  onSend={handleSubmit}
  isLoading={isLoading}
/>
```

### Full Usage (All Features)

```tsx
import { PromptInputControls } from "@/components/prompt-kit/prompt-input-controls";

const [imageMode, setImageMode] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);

<PromptInputControls
  // Required
  input={input}
  onSend={handleSend}
  isLoading={isLoading}

  // Image mode
  imageMode={imageMode}
  onImageModeChange={setImageMode}

  // Canvas/Create
  isCanvasOpen={isCanvasOpen}
  currentArtifact={currentArtifact}
  onCreateClick={handleCreateClick}

  // File upload
  showFileUpload={true}
  fileInputRef={fileInputRef}
  isUploadingFile={isUploadingFile}
  onFileUpload={handleFileUpload}

  // Customization
  sendIcon="arrow"  // or "send"
  className="mt-5 px-3 pb-3"
/>
```

## Props Reference

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `input` | `string` | ❌ | `""` | Current input value for send button state |
| `onSend` | `() => void` | ❌ | - | Send button click handler |
| `isLoading` | `boolean` | ❌ | `false` | Loading state for send button |
| `isStreaming` | `boolean` | ❌ | `false` | Streaming state for send button |
| `imageMode` | `boolean` | ❌ | `false` | Image mode toggle state |
| `onImageModeChange` | `(enabled: boolean) => void` | ❌ | - | Image mode toggle handler |
| `isCanvasOpen` | `boolean` | ❌ | `false` | Canvas open state |
| `currentArtifact` | `any` | ❌ | - | Current artifact object |
| `onCreateClick` | `() => void` | ❌ | - | Create/Canvas button handler |
| `showFileUpload` | `boolean` | ❌ | `false` | Show file upload button |
| `fileInputRef` | `React.RefObject<HTMLInputElement>` | ❌ | - | File input ref |
| `isUploadingFile` | `boolean` | ❌ | `false` | File upload loading state |
| `onFileUpload` | `(event) => void` | ❌ | - | File upload handler |
| `sendIcon` | `"arrow" \| "send"` | ❌ | `"arrow"` | Send button icon style |
| `className` | `string` | ❌ | - | Additional CSS classes |

## Button Visibility Rules

| Button | Shown When | Hidden When |
|--------|-----------|-------------|
| **File Upload** | `showFileUpload={true}` | `showFileUpload={false}` or not provided |
| **Image Mode** | `onImageModeChange` provided | `onImageModeChange` not provided |
| **Create/Canvas** | `onCreateClick` provided | `onCreateClick` not provided |
| **Send** | Always shown | Never (required for form submission) |

## Button States

### Image Mode Button
- **Normal:** Gray ghost button
- **Active:** Primary color background with 10% opacity
- **Tooltip:** "Enable image mode" / "Image mode enabled"

### Create/Canvas Button
- **Normal:** Gray ghost button
- **Canvas Open:** Primary color background with 10% opacity
- **Disabled:** When `!currentArtifact && isCanvasOpen`
- **Tooltip:**
  - No artifact: "Create"
  - Artifact + closed: "Open canvas"
  - Artifact + open: "Close canvas"

### Send Button
- **Normal:** Gradient primary button
- **Disabled:** When `!input.trim() || isLoading || isStreaming`
- **Loading:** Spinner animation
- **Icon:** Arrow (ChatInterface) or Send (Home)

### File Upload Button
- **Normal:** Gray ghost button with Plus icon
- **Loading:** Spinner animation
- **Disabled:** When `isUploadingFile={true}`

## Usage Patterns

### Pattern 1: Simple Send Only

```tsx
<PromptInputControls
  input={input}
  onSend={handleSend}
  isLoading={isLoading}
/>
```

### Pattern 2: With Image Mode

```tsx
const [imageMode, setImageMode] = useState(false);

<PromptInputControls
  input={input}
  onSend={handleSend}
  isLoading={isLoading}
  imageMode={imageMode}
  onImageModeChange={setImageMode}
/>
```

### Pattern 3: With Canvas (ChatInterface)

```tsx
<PromptInputControls
  input={input}
  onSend={handleSend}
  isLoading={isLoading}
  imageMode={imageMode}
  onImageModeChange={setImageMode}
  isCanvasOpen={isCanvasOpen}
  currentArtifact={currentArtifact}
  onCreateClick={handleCreateClick}
  sendIcon="arrow"
/>
```

### Pattern 4: With Create Helper (Home)

```tsx
<PromptInputControls
  input={input}
  onSend={handleSubmit}
  isLoading={isLoading}
  imageMode={imageMode}
  onImageModeChange={setImageMode}
  onCreateClick={() => setInput("Help me create ")}
  sendIcon="send"
/>
```

### Pattern 5: Full Featured (ChatInterface)

```tsx
const fileInputRef = useRef<HTMLInputElement>(null);
const [isUploadingFile, setIsUploadingFile] = useState(false);

const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setIsUploadingFile(true);
  try {
    // Upload logic
  } finally {
    setIsUploadingFile(false);
  }
};

<PromptInputControls
  input={input}
  onSend={handleSend}
  isLoading={isLoading}
  imageMode={imageMode}
  onImageModeChange={setImageMode}
  isCanvasOpen={isCanvasOpen}
  currentArtifact={currentArtifact}
  onCreateClick={handleCreateClick}
  showFileUpload={true}
  fileInputRef={fileInputRef}
  isUploadingFile={isUploadingFile}
  onFileUpload={handleFileUpload}
  sendIcon="arrow"
/>
```

## Common Integrations

### With PromptInput Component

```tsx
<PromptInput value={input} onValueChange={setInput} onSubmit={handleSend}>
  <PromptInputTextarea placeholder="Ask anything..." />
  <PromptInputControls
    input={input}
    onSend={handleSend}
    isLoading={isLoading}
    // ... other props
  />
</PromptInput>
```

### With Form Context

```tsx
<form onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
  <PromptInput value={input} onValueChange={setInput}>
    <PromptInputTextarea />
    <PromptInputControls
      input={input}
      onSend={handleSend}
      // Send button type="submit" will trigger form submit
    />
  </PromptInput>
</form>
```

## Styling

### Default Styles
- Container: `flex w-full items-center justify-between gap-2`
- Buttons: `size-9 rounded-full`
- Button groups: `flex items-center gap-2`

### Custom Styles

```tsx
// Override container
<PromptInputControls
  className="mt-5 px-3 pb-3 bg-red-500"
  // ...
/>

// Note: Individual button styles are not customizable
// For custom button styling, fork the component
```

## Accepted File Types

When `showFileUpload={true}`, accepts:

- **Documents:** .pdf, .docx, .txt, .md
- **Images:** .jpg, .jpeg, .png, .webp, .gif, .svg
- **Data:** .csv, .json, .xlsx
- **Code:** .js, .ts, .tsx, .jsx, .py, .html, .css
- **Audio:** .mp3, .wav, .m4a, .ogg

## TypeScript

### Import Type

```tsx
import { PromptInputControls, type PromptInputControlsProps } from "@/components/prompt-kit/prompt-input-controls";

// Extend props
interface MyComponentProps extends PromptInputControlsProps {
  customProp: string;
}
```

### Ref Typing

```tsx
const fileInputRef = useRef<HTMLInputElement>(null);
```

## Accessibility

- All buttons have tooltips
- Proper ARIA labels
- Keyboard navigation support
- Visual feedback for all states
- Loading states announced to screen readers

## Performance

- Minimal re-renders (memoization in parent components)
- Conditional rendering of optional buttons
- Optimized animations (GPU-accelerated)

## Troubleshooting

### Send Button Always Disabled

**Cause:** `input` prop is empty or contains only whitespace
**Fix:** Ensure `input` prop receives the current input value

```tsx
// Wrong
<PromptInputControls onSend={handleSend} />

// Correct
<PromptInputControls input={input} onSend={handleSend} />
```

### Image Mode Not Working

**Cause:** `onImageModeChange` handler not provided
**Fix:** Provide both `imageMode` state and handler

```tsx
// Wrong
<PromptInputControls imageMode={imageMode} />

// Correct
<PromptInputControls
  imageMode={imageMode}
  onImageModeChange={setImageMode}
/>
```

### File Upload Not Showing

**Cause:** `showFileUpload` not set to `true`
**Fix:** Explicitly enable file upload

```tsx
// Wrong
<PromptInputControls fileInputRef={fileInputRef} />

// Correct
<PromptInputControls
  showFileUpload={true}
  fileInputRef={fileInputRef}
  onFileUpload={handleFileUpload}
/>
```

## Examples in Codebase

- **ChatInterface:** `/Users/nick/Projects/llm-chat-site/src/components/ChatInterface.tsx` (Line 459)
- **Home:** `/Users/nick/Projects/llm-chat-site/src/pages/Home.tsx` (Line 549)

---

*Last Updated: 2025-11-13*
*Component Version: 1.0.0*
