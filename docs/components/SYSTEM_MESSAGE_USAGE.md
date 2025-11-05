# SystemMessage Component Usage

## Overview
The SystemMessage component from prompt-kit is a banner-style component for surfacing contextual information in the chat interface. It supports multiple variants (action, error, warning) with customizable icons and call-to-action buttons.

## Installation
✅ Installed via: `npx shadcn add "https://prompt-kit.com/c/system-message.json"`
✅ Location: `src/components/ui/system-message.tsx`
✅ Dependencies: button component, lucide-react icons

## Basic Usage

```tsx
import { SystemMessage } from "@/components/ui/system-message"

// Simple info message
<SystemMessage>
  Your session will expire in 5 minutes
</SystemMessage>

// Error message
<SystemMessage variant="error">
  Failed to send message. Please try again.
</SystemMessage>

// Warning message
<SystemMessage variant="warning">
  You have unsaved changes
</SystemMessage>
```

## Props

### SystemMessageProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"action" \| "error" \| "warning"` | `"action"` | Message type and color scheme |
| `fill` | `boolean` | `false` | Whether to fill background with color |
| `icon` | `React.ReactNode` | Auto | Custom icon (overrides default) |
| `isIconHidden` | `boolean` | `false` | Hide the icon completely |
| `cta` | `CTAConfig` | `undefined` | Call-to-action button config |
| `className` | `string` | - | Additional CSS classes |

### CTAConfig

```typescript
{
  label: string           // Button text
  onClick?: () => void   // Click handler
  variant?: "solid" | "outline" | "ghost"  // Button style
}
```

## Variants

### Action (Default)
Neutral, informational messages:
```tsx
<SystemMessage variant="action">
  Processing your request...
</SystemMessage>

<SystemMessage variant="action" fill>
  New update available
</SystemMessage>
```

### Error
Critical errors requiring attention:
```tsx
<SystemMessage variant="error">
  Authentication failed
</SystemMessage>

<SystemMessage variant="error" fill>
  Connection lost. Retrying...
</SystemMessage>
```

### Warning
Important warnings or cautions:
```tsx
<SystemMessage variant="warning">
  API rate limit approaching
</SystemMessage>

<SystemMessage variant="warning" fill>
  Slow network detected
</SystemMessage>
```

## With Call-to-Action

```tsx
<SystemMessage
  variant="action"
  cta={{
    label: "Reload Now",
    onClick: () => window.location.reload()
  }}
>
  New version available
</SystemMessage>

<SystemMessage
  variant="error"
  fill
  cta={{
    label: "Retry",
    onClick: handleRetry
  }}
>
  Failed to load chat history
</SystemMessage>
```

## Custom Icons

```tsx
import { Wifi, WifiOff, Zap } from "lucide-react"

// Custom icon
<SystemMessage
  variant="warning"
  icon={<WifiOff className="size-4" />}
>
  Offline mode enabled
</SystemMessage>

// Hide icon
<SystemMessage
  variant="action"
  isIconHidden
>
  Text-only message
</SystemMessage>
```

## Use Cases in This Project

### 1. Session Expiration Warning
```tsx
// In ChatInterface.tsx or Auth.tsx
{sessionExpiringSoon && (
  <SystemMessage
    variant="warning"
    fill
    cta={{
      label: "Extend Session",
      onClick: handleExtendSession
    }}
  >
    Your session will expire in {timeRemaining}. Please save your work.
  </SystemMessage>
)}
```

### 2. Network Error Recovery
```tsx
// In ChatInterface.tsx
{networkError && (
  <SystemMessage
    variant="error"
    cta={{
      label: "Reconnect",
      onClick: handleReconnect
    }}
  >
    Connection lost. Some features may be unavailable.
  </SystemMessage>
)}
```

### 3. Artifact Generation Notice
```tsx
// In Artifact.tsx
<SystemMessage variant="action" fill>
  Generating interactive preview...
</SystemMessage>
```

### 4. File Upload Validation
```tsx
// In ChatInterface.tsx file upload
{uploadError && (
  <SystemMessage variant="error" fill>
    {uploadError.message}. Max file size: 10MB.
  </SystemMessage>
)}
```

### 5. Update Notification
```tsx
// In UpdateNotification.tsx (replace current implementation)
{updateAvailable && (
  <SystemMessage
    variant="action"
    fill
    cta={{
      label: "Reload Now",
      onClick: handleReload
    }}
  >
    A new version is available. Reload to update.
  </SystemMessage>
)}
```

## Styling

The component uses class-variance-authority for variant management:

- **Filled backgrounds**: Colored backgrounds with transparent borders
- **Outlined**: Colored borders with transparent backgrounds
- **Dark mode**: Automatically adjusts colors for dark theme
- **Responsive**: Adapts to mobile/desktop layouts

Custom styling:
```tsx
<SystemMessage
  variant="action"
  className="my-4 mx-auto max-w-2xl"
>
  Centered message with custom spacing
</SystemMessage>
```

## Accessibility

✅ **ARIA Support**: Proper semantic HTML structure
✅ **Keyboard Navigation**: CTA buttons are keyboard accessible
✅ **Screen Readers**: Icon descriptions and message content read correctly
✅ **Color Contrast**: WCAG AA compliant color combinations
✅ **Dark Mode**: Theme-aware colors maintain contrast

## Performance

- **Memoization**: Consider wrapping in `React.memo` for static messages
- **Conditional Rendering**: Only render when needed (error states, warnings)
- **Icon Loading**: lucide-react icons are tree-shakeable

```tsx
const MemoizedSystemMessage = React.memo(SystemMessage)
```

## Integration Example

Replace existing toast notifications with SystemMessage for persistent in-UI messaging:

```tsx
// Before (toast)
toast({
  title: "Error",
  description: "Failed to load messages",
  variant: "destructive"
})

// After (persistent banner)
<SystemMessage variant="error" fill>
  Failed to load messages. Please refresh the page.
</SystemMessage>
```

## Component Source

```tsx
// src/components/ui/system-message.tsx
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle, AlertTriangle, Info } from "lucide-react"
import React from "react"

// ... (full component code available in the file)
```

## Next Steps

Consider integrating SystemMessage for:
1. Session management warnings (auth expiration)
2. Network status indicators (offline/online)
3. Artifact generation status
4. File upload errors
5. Service worker update notifications
6. Rate limit warnings for API calls

## Related Components

- **Button**: Used for CTA actions
- **Toast**: For transient notifications (different use case)
- **Alert**: For critical page-level messages (different use case)

---

**Status**: ✅ Installed and ready for use
**Version**: prompt-kit registry (latest)
**Dependencies**: All resolved
**Type Safety**: Full TypeScript support
