# Vana UI Specifications

## Design System

### Colors
- **Background**: Black (#000000)
- **Primary**: Purple (#8B5CF6)
- **Text Primary**: White
- **Text Secondary**: Gray (#9CA3AF)
- **Accent**: Purple variations
- **Success**: Green
- **Error**: Red

### Typography
- **Font**: System fonts (sans-serif)
- **Hero Title**: 4xl-6xl, bold
- **Body**: Base size
- **Code**: Monospace font

## Core Features to Preserve

### 1. Landing Page
- Hero section with gradient text "Virtual Autonomous Network Agents"
- Subheading explaining the platform
- Large input box for initial message
- Send button with arrow icon
- Login link in top-right

### 2. Chat Interface
- Full-height layout
- Message list with smooth scrolling
- User messages (right-aligned, purple background)
- AI messages (left-aligned, with avatar)
- Thinking panel toggle ("Show Agent activity")
- Connection status indicator

### 3. Agent Thinking Visualization
- Collapsible panel showing agent activity
- Timeline with agent names and actions
- Status indicators (active/complete)
- Duration tracking
- Real-time updates during processing

### 4. Input Area
- Sticky bottom position
- Textarea with auto-resize
- File upload button
- Send button
- Disabled state during AI response

### 5. Real-time Features
- SSE-based streaming responses
- Progressive text rendering
- Connection status updates
- Error handling with user-friendly messages

## Technical Requirements

### ADK Integration
- Compatible with ADK research agent format
- Handle agent events (thinking steps)
- Process streaming responses
- Support research plan display

### Libraries to Use
- React 18+
- Vite
- Tailwind CSS
- shadcn/ui (base components)
- kibo-ui (AI-specific components)
  - AIInput: Advanced input with model selection, tools
  - AIMessage: Message display with avatars
  - AIConversation: Conversation container
  - AIReasoning: Thinking visualization
- React Markdown
- TypeScript

## User Experience

### Interactions
1. User lands on hero page
2. Types research query
3. Submits → transitions to chat view
4. Shows user message immediately
5. Displays "thinking" indicator
6. Streams agent response progressively
7. Shows agent activity in collapsible panel

### States
- Loading/connecting
- Connected/ready
- Thinking/processing
- Streaming response
- Complete
- Error/disconnected

## Responsive Design
- Mobile-friendly
- Tablet optimized
- Desktop experience
- Smooth transitions between views