
## UI/UX Design System

### Theme & Colors
VANA uses a sophisticated dark theme with vibrant accent colors:

```css
/* Core Color Palette */
--bg-main: #1a1a1a;          /* Main background - dark grey */
--bg-element: #2d2d2d;       /* Element background */
--bg-input: #3a3a3a;         /* Input fields */
--border-primary: #4a4a4a;   /* Borders */
--text-primary: #ffffff;     /* Primary text */
--text-secondary: #a0a0a0;   /* Secondary text */

/* Accent Colors - The VANA Gradient */
--accent-blue: #7c9fff;      /* Primary accent */
--accent-purple: #b794f6;    /* Secondary accent */
--accent-orange: #f6ad55;    /* Tertiary accent */
--accent-red: #fc8181;       /* Alert/error accent */
```

### Signature Gradient
VANA's signature "Gemini Gradient" used throughout the UI:
```css
background: linear-gradient(135deg, 
  #7c9fff 0%,    /* Blue */
  #b794f6 35%,   /* Purple */
  #fc8181 70%,   /* Red */
  #f6ad55 100%   /* Orange */
);
```

### Layout Pattern
- **Sidebar Navigation**: Collapsible dark sidebar with agent status
- **Main Chat Area**: Center-focused conversation interface
- **ThinkingPanel**: Expandable panel showing real-time agent activity

## ThinkingPanel - Core Innovation

### Purpose
The ThinkingPanel is VANA's primary way of communicating what the AI is doing in real-time. It demystifies the "black box" of AI by showing users the step-by-step process.  By default, it is expanded to provide transparency. Users can collapse it to focus on the conversation.  All communication should come from "Vana" and not the individual agents. Vana is the "voice" of the AI system and the thinking panel shows what is happening "under the hood".

### Features
- **Real-time Updates**: Shows each step as it happens
- **Status Indicators**: 
  - 🟡 Active (pulsing animation)
  - ✅ Complete 
  - ⏰ Pending
- **Timing Information**: Shows milliseconds for each operation
- **Expandable Details**: Additional context for each step
- **Default Expanded**: Users see the thinking process by default

### Example Flow
```typescript
1. 🎯 Analyzing request (120ms) ✅
2. 🔀 Routing to Research Specialist - "Request requires research expertise" (45ms) ✅
3. 🔍 Performing multi-domain research - "Checking multiple sources for relevant information" (890ms) ✅
4. 📊 Aggregating results (230ms) ✅
5. ✅ Preparing response (110ms) ✅
```

## Frontend Requirements

### Technology Stack
- **Framework**: React with TypeScript
- **UI Library**: Kibo-UI
- **Styling**: Tailwind CSS with custom VANA theme
- **State Management**: Context API or similar
- **Real-time Updates**: WebSocket or SSE for ThinkingPanel

### Key Components Needed
1. **Chat Interface**: Message bubbles with user/AI distinction
2. **ThinkingPanel**: Real-time agent activity display
3. **Sidebar**: Navigation and agent status
4. **Agent Cards**: Visual representation of active specialists
5. **Progress Indicators**: Loading states with animations

### Animations
- **Moving Border**: Rotating gradient border for active elements
- **Chasing Border**: Linear gradient animation for loading states
- **Pulse Effects**: For active thinking steps
- **Slide Transitions**: Smooth panel expansions