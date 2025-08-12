# Chunk 7: File Upload Integration

## PRD Section: 9. File Upload System

### Critical Requirements

1. **Smart File Routing**: .md files automatically open in Canvas
2. **Drag & Drop**: Full drag-and-drop support with visual feedback
3. **File Validation**: Size limits (10MB), type restrictions, preview
4. **Multi-file Support**: Up to 3 files with preview carousel
5. **Progressive Enhancement**: Works without backend initially

### Implementation Guide

#### Core Components
```typescript
// components/upload/FileUploader.tsx
- File input with hidden styling
- Drag-and-drop area with visual states
- File validation and error handling
- Automatic .md Canvas routing

// components/upload/FilePreview.tsx
- File thumbnail with metadata
- Remove file functionality
- Progress indicators for uploads
- File type icons and labels
```

#### Store Integration
```typescript
// stores/uploadStore.ts
interface UploadStore {
  files: File[]
  uploading: boolean
  uploadProgress: Record<string, number>
  addFiles: (files: File[]) => void
  removeFile: (index: number) => void
  uploadFiles: () => Promise<void>
}
```

### Real Validation Tests

1. **File Type Detection**: Upload .md file → Canvas opens with content
2. **Size Validation**: Upload 15MB file → Error toast with size limit
3. **Drag Feedback**: Drag file over input → Visual highlight
4. **Multi-file**: Upload 3 files → All show in preview carousel
5. **Canvas Integration**: .md upload → Markdown tab active in Canvas

### THINK HARD

- How does file upload integrate with chat message submission?
- What happens to uploaded files when session changes?
- How do you handle file upload errors gracefully?
- What accessibility features are needed for drag-and-drop?
- How do you preview different file types (.pdf, .docx, .txt)?

### Component Specifications

#### FileUploader Component
```typescript
interface FileUploaderProps {
  onFilesSelected?: (files: File[]) => void
  maxFiles?: number
  acceptedTypes?: string[]
  maxSize?: number // bytes
}

// Features:
- Hidden file input with click trigger
- Drag-and-drop zone with hover states
- File validation with user feedback
- Automatic Canvas routing for .md files
- Integration with message input
```

#### FilePreview Component
```typescript
interface FilePreviewProps {
  files: File[]
  onRemove: (index: number) => void
  showProgress?: boolean
  progress?: Record<string, number>
}

// Features:
- File thumbnail with type icon
- File size and name display
- Remove button with confirmation
- Upload progress visualization
- Error state indicators
```

### What NOT to Do

❌ Don't upload files automatically without user confirmation
❌ Don't allow unlimited file sizes or dangerous file types
❌ Don't open Canvas for non-.md files automatically
❌ Don't store file content in localStorage (use File objects)
❌ Don't forget to handle upload cancellation
❌ Don't skip accessibility for drag-and-drop interactions

### Integration Points

- **Canvas Store**: Auto-open for .md files
- **Chat Store**: Attach files to messages
- **UI Store**: Progress indicators and error states
- **Session Store**: File persistence across sessions

---

*Implementation Priority: High - Core UX feature*