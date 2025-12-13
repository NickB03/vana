# Tour Chat Extension Design

**Date:** 2025-12-12
**Status:** Approved
**Goal:** Extend the onboarding tour to showcase the chat experience with a pre-seeded demo

---

## Overview

Extend the existing 5-step tour to include a typing demo and chat view walkthrough. The tour will demonstrate Vana's unique features (reasoning display, AI commentator, artifact system) to users who may not be familiar with LLMs.

**Approach:** Hybrid - pre-seeded demo chat with client-side data injection, typing animation on home page, then navigation to chat view for feature showcase.

---

## Tour Flow

```
┌─────────────────────────────────────────────────────────┐
│  PHASE 1: Home View                                     │
├─────────────────────────────────────────────────────────┤
│  1. Chat Input      - "Type anything here..."           │
│  2. Image Mode      - "Enable to create AI images..."   │
│  3. Artifact Mode   - "Generate interactive apps..."    │
│  4. Suggestions     - "Choose from pre-built ideas..."  │
│  5. Sidebar         - "Your chat history lives here..." │
└─────────────────────────────────────────────────────────┘
                         │
                    [After step 5]
                         ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 1.5: Typing Demo                                 │
├─────────────────────────────────────────────────────────┤
│  6. Watch It Work   - Tour highlights input, text       │
│     types in:       "Create a sales dashboard with      │
│                      monthly revenue and growth charts" │
│     └→ Typing animation ~2-3 seconds                    │
│     └→ Auto-submits when complete                       │
│     └→ Navigates to pre-seeded demo chat                │
└─────────────────────────────────────────────────────────┘
                         │
                    [Auto-navigation to demo chat]
                         ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 2: Chat View                                     │
├─────────────────────────────────────────────────────────┤
│  7. Message Bubble  - "Responses stream in real-time"   │
│  8. Reasoning       - "Watch Vana think through..."     │
│  9. AI Commentator  - "Live status updates..."          │
│  10. Artifact Panel - "Interactive preview renders..."  │
└─────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### TourStep Interface Extension

```typescript
interface TourStep {
  content: React.ReactNode;
  selectorId: string;
  width?: number;
  height?: number;
  onClickWithinArea?: () => void;
  position?: "top" | "bottom" | "left" | "right";
  // NEW PROPERTIES
  typeText?: string;           // Text to type into input
  autoSubmit?: boolean;        // Submit after typing completes
  navigateTo?: string;         // URL to navigate to after step
  waitForElement?: string;     // Wait for selector before showing step
}
```

### Demo Session Strategy

**Client-side injection** - No database writes, works for guests:
- Demo session data stored in dedicated file
- Injected into chat view when tour navigates to demo URL
- Unique ID format: `tour-demo-{timestamp}` to avoid collisions

### New Tour Step IDs

```typescript
TOUR_STEP_IDS = {
  // Existing
  CHAT_INPUT: "tour-chat-input",
  IMAGE_MODE: "tour-image-mode",
  ARTIFACT_MODE: "tour-artifact-mode",
  SUGGESTIONS: "tour-suggestions",
  SIDEBAR: "tour-sidebar",
  // New
  TYPING_DEMO: "tour-typing-demo",
  MESSAGE_BUBBLE: "tour-message-bubble",
  REASONING_DISPLAY: "tour-reasoning-display",
  AI_COMMENTATOR: "tour-ai-commentator",
  ARTIFACT_PANEL: "tour-artifact-panel",
}
```

---

## Demo Data Structure

```typescript
const DEMO_SESSION = {
  id: "tour-demo-session",
  title: "Sales Dashboard Demo",
  messages: [
    {
      role: "user",
      content: "Create a sales dashboard with monthly revenue and growth charts"
    },
    {
      role: "assistant",
      content: "I'll create an interactive sales dashboard...",
      reasoning: [
        "Analyzing the request for a sales dashboard",
        "Planning chart layout with revenue trends",
        "Selecting appropriate chart library",
        "Implementing responsive grid layout",
        "Adding smooth animations for data updates"
      ],
      artifact: {
        type: "react",
        title: "Sales Dashboard",
        content: "/* Full component code - data visualization with charts */"
      }
    }
  ]
};
```

**Demo artifact:** A polished sales dashboard with:
- Line chart showing monthly revenue (animated)
- Bar chart with growth percentages
- Clean card layout
- Sample data (Jan-Dec)

---

## Tour Step Content

### Phase 1: Home View

| Step | Element | Content |
|------|---------|---------|
| 1 | Chat Input | **Start a Conversation** - Type any question or request here. Vana understands natural language. |
| 2 | Image Mode | **Generate Images** - Toggle this to create AI-generated images from your descriptions. |
| 3 | Artifact Mode | **Create Interactive Apps** - Enable this to generate working apps, charts, games, and tools. |
| 4 | Suggestions | **Quick Prompts** - Not sure what to try? Pick from these curated examples. |
| 5 | Sidebar | **Your History** - All your conversations are saved here. Let's see Vana in action... |

### Phase 1.5: Typing Demo

| Step | Element | Content |
|------|---------|---------|
| 6 | Chat Input | **Watch This** - Here's how easy it is to create something impressive... |

### Phase 2: Chat View

| Step | Element | Content |
|------|---------|---------|
| 7 | Message Bubble | **Streaming Response** - Responses appear in real-time as the AI writes them. |
| 8 | Reasoning Display | **See the Thinking** - Watch Vana's reasoning process - like seeing an expert think through a problem. |
| 9 | AI Commentator | **Live Status** - These updates explain what's happening as your creation is built. |
| 10 | Artifact Panel | **Interactive Preview** - Your creation renders live and ready to use. This dashboard is a fully working app built in seconds. |

---

## Error Handling

### Navigation & Timing

| Scenario | Handling |
|----------|----------|
| User closes tour mid-typing | Cancel animation, save progress to localStorage |
| User manually navigates away | Pause tour, resume if they return |
| Demo chat page doesn't load | Timeout 3s, show error with "Skip" option |
| Element not found on chat page | Wait 2s for render, fallback to next step |

### Demo Session

| Scenario | Handling |
|----------|----------|
| Session ID collision | Use unique ID: `tour-demo-{timestamp}` |
| User interacts with demo | Allow read-only viewing during tour |
| User refreshes mid-Phase 2 | Detect state, re-inject data, resume |
| Tour completed, user returns | Show as regular explorable session |

### Typing Animation

| Scenario | Handling |
|----------|----------|
| User starts typing | Cancel animation, let user take over |
| Animation interrupted | Pause and resume OR skip to submit |

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/components/tour/demo-session.ts` | Demo chat data (messages, reasoning, artifact) |
| `src/components/tour/typing-animation.ts` | Typing effect hook/utility |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/tour/tour.tsx` | Add typeText, autoSubmit, navigateTo, waitForElement |
| `src/components/tour/tour-constants.ts` | Add new TOUR_STEP_IDS |
| `src/components/OnboardingTour.tsx` | Add steps 6-10, wire up typing + navigation |
| `src/components/ChatInterface.tsx` | Add tour IDs to message bubble, reasoning, commentator |
| `src/components/ArtifactContainer.tsx` | Add tour ID to artifact panel |
| `src/hooks/useChatMessages.tsx` | Handle demo session injection |
| `src/pages/Home.tsx` | Support demo session route detection |

### Tests

- `demo-session.test.ts` - Demo data structure validation
- `typing-animation.test.ts` - Typing utility tests
- Update existing tour tests for new steps

---

## Scope Estimate

- ~300-400 lines new code
- ~50-100 lines modifications
- 2 new test files
