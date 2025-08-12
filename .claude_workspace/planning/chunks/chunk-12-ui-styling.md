# Chunk 12: UI Component Map & Styling

## 📸 UI REFERENCES

**Comprehensive Screenshot Analysis**:

### Screenshot 12.01.21 AM.png (Gemini Homepage)
- **Primary Colors**: #1F1F1F background, #FFFFFF text, #3B82F6-#8B5CF6 gradients
- **Typography**: Inter font family, gradient headlines, clean card text
- **Layout**: Centered design, generous spacing, responsive grid

### Screenshot 12.06.24 AM.png (Gemini Chat Interface) 
- **Sidebar**: #1A1A1A background, 240px width, conversation list
- **Chat Area**: #131314 background, proper message alignment
- **Message Styling**: User (#2563EB), Agent (#374151), rounded corners

### Screenshot 12.10.13 AM.png (Claude Canvas)
- **Split Layout**: Resizable panels, #2A2A2A toolbar
- **Canvas Colors**: #1A1A1A background, #3A3A3A borders
- **Editor Theme**: Dark with syntax highlighting, professional appearance

**EXTRACTED COLOR PALETTE**:
```css
:root {
  --background: 31 31 34;           /* #1F1F22 */
  --foreground: 229 231 235;        /* #E5E7EB */
  --muted: 55 65 81;                /* #374151 */
  --muted-foreground: 156 163 175;  /* #9CA3AF */
  --primary: 59 130 246;            /* #3B82F6 */
  --primary-gradient: linear-gradient(135deg, #3B82F6, #8B5CF6);
  --card: 26 26 26;                 /* #1A1A1A */
  --border: 58 58 58;               /* #3A3A3A */
  --accent: 37 99 235;              /* #2563EB */
}
```

**TYPOGRAPHY SCALE**:
- Headlines: 2.25rem (36px) bold with gradient
- Body: 0.875rem (14px) Inter regular
- Code: JetBrains Mono, 14px
- Captions: 0.75rem (12px) muted

**SPACING SYSTEM**:
- Container padding: 1.5rem (24px)
- Card gaps: 1rem (16px)
- Section spacing: 2rem (32px)
- Component margins: 0.5rem (8px)

**VISUAL VALIDATION CRITERIA**:
✅ All components use extracted color palette
✅ Typography follows consistent scale
✅ Spacing matches reference designs
✅ Dark theme implemented correctly
✅ Gradients and accents match Gemini style
✅ Component hierarchy is visually clear

## PRD Section: 14-15. UI Components & Design System

### Critical Requirements

1. **shadcn/ui Foundation**: Leverage Radix-based accessible components
2. **Dark Theme Primary**: Professional interface matching Gemini aesthetic
3. **Component Mapping**: Clear usage guidelines for each component
4. **Design Tokens**: Consistent colors, typography, and spacing
5. **Animation System**: Smooth transitions with Framer Motion

### Implementation Guide

#### Component Usage Map
```typescript
// Feature-to-Component mapping
Auth: Card, Tabs, Button, Input, Label → GoogleSignInButton
Chat: ScrollArea, Card → MessageList, AgentMessage, StreamingIndicator
Canvas: ResizablePanel, Tabs → CanvasEditor, VersionHistory, ToolbarActions
Upload: Button, Tooltip → FileUploader, FilePreview, DropZone
Agent Deck: Card, Progress → AgentTaskCard, TaskStatus, TaskStack
Session: ScrollArea, DropdownMenu → SessionCard, SessionActions, SidebarNav
```

#### Design System Implementation
```typescript
// tailwind.config.ts - Extended theme configuration
- Dark-first color palette with Gemini inspiration
- Typography scale with Inter and JetBrains Mono
- Animation keyframes for card shuffling and transitions
- Gradient definitions for accents and highlights
- Responsive breakpoints and container queries

// styles/globals.css - Global styles and utilities
- CSS custom properties for dynamic theming
- Component-specific utility classes
- Animation definitions and timing functions
- Focus ring styles for accessibility
- Print styles and reduced motion preferences
```

#### Custom Component Architecture
```typescript
// components/ui/ - Extended shadcn/ui components
CodeBlock: Syntax highlighting with Canvas integration
StreamingText: Typewriter effect for SSE messages
TaskCard: Stacking animation with status indicators
FilePreview: Thumbnail display with metadata
AgentAvatar: Dynamic agent identification and status
```

### Real Validation Tests

1. **Theme Consistency**: All components → Proper dark theme colors
2. **Animation Performance**: Card shuffle → 60fps smooth animation
3. **Responsive Design**: Mobile viewport → Components adapt correctly
4. **Accessibility**: Tab navigation → All interactive elements reachable
5. **Component Integration**: shadcn + custom → Seamless visual consistency

### THINK HARD

- How do you maintain visual consistency across custom and shadcn components?
- What animation performance optimizations are needed for mobile devices?
- How do you handle component theming for potential light mode future support?
- What accessibility patterns need special attention in custom components?
- How do you ensure consistent spacing and typography across all components?

### Component Specifications

#### Extended shadcn/ui Components
```typescript
// CodeBlock with Canvas Integration
interface CodeBlockProps extends ComponentProps<'pre'> {
  language: string
  value: string
  onOpenInCanvas?: () => void
  showLineNumbers?: boolean
}

// Features:
- Syntax highlighting with react-syntax-highlighter
- Canvas integration button on hover
- Copy to clipboard functionality
- Line number display option
- Language detection and labeling
```

#### Custom Animation Components
```typescript
// TaskCard with Stacking Animation
interface TaskCardProps {
  task: AgentTask
  stackIndex: number
  onComplete?: () => void
  animationDuration?: number
}

// Features:
- Framer Motion stacking animation
- Progress indicator integration
- Status-based color coding
- Completion celebration animation
- Touch/mouse interaction support
```

#### Design System Utilities
```typescript
// lib/design/tokens.ts
export const designTokens = {
  colors: { /* Dark theme palette */ },
  typography: { /* Font scales and families */ },
  spacing: { /* Consistent spacing values */ },
  animations: { /* Timing and easing functions */ },
  breakpoints: { /* Responsive breakpoints */ }
}

// Features:
- Type-safe design token access
- Theme calculation utilities
- Responsive value helpers
- Animation preset definitions
- Color manipulation functions
```

### What NOT to Do

❌ Don't override shadcn/ui component styles without good reason
❌ Don't use hardcoded colors or spacing values throughout components
❌ Don't create heavy animations that impact performance on mobile
❌ Don't forget accessibility in custom component implementations
❌ Don't mix different design patterns (stick to shadcn conventions)
❌ Don't ignore responsive design considerations in component APIs

### Integration Points

- **All Features**: Consistent component usage and styling
- **Theme System**: Central color and typography management
- **Animation Engine**: Coordinated transitions across components
- **Accessibility**: WCAG compliance throughout component library

---

*Implementation Priority: Medium - Visual foundation affects all features*