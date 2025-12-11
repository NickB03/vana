# Tour Component - Complete API Reference

A native shadcn/ui product tour component built with Framer Motion animations, CSS `clip-path` spotlight effects, and React Context for state management.

**Based on** [shadcn/tour](https://github.com/NiazMorshed2007/shadcn-tour) by Niaz Morshed, adapted for Vana.

## Table of Contents

1. [Component Overview](#component-overview)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Complete API Reference](#complete-api-reference)
5. [TypeScript Interfaces](#typescript-interfaces)
6. [Usage Examples](#usage-examples)
7. [Integration Guide](#integration-guide)
8. [Keyboard Navigation](#keyboard-navigation)
9. [Styling & Customization](#styling--customization)
10. [Accessibility](#accessibility)
11. [Constants & Exports](#constants--exports)

---

## Component Overview

### What It Does

The Tour component provides an interactive guided tour system for introducing users to your application's key features. It highlights target elements with a spotlight effect and displays contextual tooltips with step-by-step instructions.

### Key Features

- **Native shadcn/ui Integration** — Uses shadcn Button, AlertDialog components
- **CSS Spotlight Effect** — `polygon()` clip-path creates a smooth cutout around target elements
- **Smooth Animations** — Framer Motion handles transitions with directional slide effects
- **Full Keyboard Support** — Arrow keys, Enter, Escape (works seamlessly without UI hints)
- **Accessibility First** — ARIA attributes, focus management, `prefers-reduced-motion` support
- **State Persistence** — localStorage saves completion state per unique tour ID
- **Responsive Design** — Auto-repositions tooltip within viewport bounds
- **Click Callbacks** — Execute actions when users click within highlighted areas

### When to Use

Use the Tour component when you need to:
- Onboard new users with interactive walkthroughs
- Highlight new features in major releases
- Guide users through complex workflows
- Provide contextual tooltips for UI elements
- Track tour completion and user engagement

---

## Installation

The component is located at `src/components/tour/` and is fully exported from `index.ts`:

```tsx
import {
  TourProvider,
  useTour,
  TourAlertDialog,
  TOUR_STEP_IDS,
  type TourStep
} from "@/components/tour";
```

**Files**:
- `tour.tsx` — Core components (TourProvider, useTour hook, TourAlertDialog)
- `tour-constants.ts` — Pre-defined element IDs (TOUR_STEP_IDS)
- `index.ts` — Public exports
- `README.md` — This documentation

---

## Quick Start

### Basic Usage

```tsx
import { TourProvider, useTour, TourStep } from "@/components/tour";
import { useEffect } from "react";

// 1. Define tour steps
const tourSteps: TourStep[] = [
  {
    selectorId: "step-1-target",
    position: "bottom",
    content: (
      <div>
        <h3 className="font-semibold mb-2">Welcome</h3>
        <p className="text-sm text-muted-foreground">This is the first step.</p>
      </div>
    ),
  },
  {
    selectorId: "step-2-target",
    position: "top",
    content: (
      <div>
        <h3 className="font-semibold mb-2">Second Step</h3>
        <p className="text-sm text-muted-foreground">This is the second step.</p>
      </div>
    ),
  },
];

// 2. Create a component that uses the tour
function TourContent() {
  const { setSteps, startTour } = useTour();

  useEffect(() => {
    setSteps(tourSteps);
  }, [setSteps]);

  return (
    <>
      <button onClick={startTour}>Start Tour</button>
      <div id="step-1-target">First Target</div>
      <div id="step-2-target">Second Target</div>
    </>
  );
}

// 3. Wrap with TourProvider
export default function App() {
  return (
    <TourProvider onComplete={() => console.log("Tour finished!")}>
      <TourContent />
    </TourProvider>
  );
}
```

---

## Complete API Reference

### `<TourProvider>` Component

The root context provider that manages all tour state and rendering. Must wrap any component using `useTour()`.

#### Props

| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `children` | `React.ReactNode` | — | Yes | Child components to wrap with tour context |
| `onComplete` | `() => void` | — | No | Callback function invoked when user completes all tour steps |
| `onSkip` | `(completedSteps: number) => void` | — | No | Callback invoked when user exits before finishing (receives count of completed steps) |
| `className` | `string` | — | No | Additional CSS classes applied to the spotlight ring element |
| `isTourCompleted` | `boolean` | `false` | No | Initial completion state; if `true`, tour won't auto-start |
| `tourId` | `string` | `"default"` | No | Unique identifier for localStorage persistence; different IDs = different completion states |

#### Behavior

- **localStorage Persistence**: Uses key format `vana-tour-{tourId}` to store `{ completed, lastStep }`
- **Storage Errors**: Gracefully handles localStorage access errors (private browsing, quota exceeded)
- **Auto-Start Prevention**: If `isTourCompleted` is `true`, calling `startTour()` does nothing
- **Event Listeners**: Automatically tracks window resize and scroll to update spotlight position

#### Example

```tsx
<TourProvider
  tourId="onboarding"
  onComplete={() => {
    console.log("User completed onboarding");
    // Show success animation, redirect, etc.
  }}
  onSkip={(completedSteps) => {
    console.log(`User skipped after ${completedSteps} steps`);
    // Track analytics, offer help modal, etc.
  }}
  className="ring-blue-500 ring-4"
>
  <App />
</TourProvider>
```

---

### `useTour()` Hook

Access the tour context from any child component. Must be called within a component wrapped by `<TourProvider>`.

#### Return Value

Returns a `TourContextType` object with the following properties:

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `currentStep` | `number` | Current step index (0-based), or `-1` if tour is inactive | `0`, `1`, `-1` |
| `totalSteps` | `number` | Total number of tour steps defined | `5` |
| `isActive` | `boolean` | Whether the tour is currently running | `true` / `false` |
| `isTourCompleted` | `boolean` | Whether user has completed the tour (persisted) | `true` / `false` |
| `steps` | `TourStep[]` | Array of current tour step definitions | `[{ selectorId: "...", ... }]` |
| `nextStep` | `() => void` | Function to advance to next step; auto-completes on last step | See examples below |
| `previousStep` | `() => void` | Function to go to previous step; no-op if already at first step | See examples below |
| `startTour` | `() => void` | Function to start the tour from step 0; prevented if already completed | See examples below |
| `endTour` | `() => void` | Function to exit tour early; invokes `onSkip` callback | See examples below |
| `setSteps` | `(steps: TourStep[]) => void` | Function to update tour steps (typically in `useEffect`) | See examples below |
| `setIsTourCompleted` | `(completed: boolean) => void` | Function to manually set completion state | See examples below |

#### Hook Requirements

Must be called **within** a `TourProvider`:

```tsx
// ✅ CORRECT - Inside TourProvider
function MyComponent() {
  const { startTour } = useTour();
  return <button onClick={startTour}>Start</button>;
}

<TourProvider>
  <MyComponent />
</TourProvider>

// ❌ WRONG - Outside TourProvider
<MyComponent /> // Error: useTour must be used within a TourProvider
```

#### Example Usage

```tsx
function TourControls() {
  const {
    currentStep,
    totalSteps,
    isActive,
    isTourCompleted,
    nextStep,
    previousStep,
    startTour,
    endTour,
    setSteps,
    setIsTourCompleted,
  } = useTour();

  return (
    <div>
      <button onClick={startTour} disabled={isTourCompleted}>
        {isActive ? `Step ${currentStep + 1}/${totalSteps}` : "Start Tour"}
      </button>
      {isActive && (
        <>
          <button onClick={previousStep} disabled={currentStep === 0}>
            Previous
          </button>
          <button onClick={nextStep}>
            {currentStep === totalSteps - 1 ? "Finish" : "Next"}
          </button>
          <button onClick={endTour}>Skip Tour</button>
        </>
      )}
      <button onClick={() => setIsTourCompleted(false)}>
        Reset Completion
      </button>
    </div>
  );
}
```

---

## TypeScript Interfaces

### `TourStep` Interface

Defines a single step in the tour.

```typescript
interface TourStep {
  /**
   * The content (usually title + description) displayed in the tooltip.
   * Can be any React node: JSX, text, fragments, etc.
   */
  content: React.ReactNode;

  /**
   * The HTML `id` attribute of the target element to highlight.
   * The element must exist in the DOM before this step runs.
   */
  selectorId: string;

  /**
   * Optional: Custom width for the spotlight (pixels).
   * If not provided, uses the actual element width.
   */
  width?: number;

  /**
   * Optional: Custom height for the spotlight (pixels).
   * If not provided, uses the actual element height.
   */
  height?: number;

  /**
   * Optional: Position of the tooltip relative to target element.
   * Default is "bottom".
   * - "top": Above the element
   * - "bottom": Below the element
   * - "left": To the left of the element
   * - "right": To the right of the element
   */
  position?: "top" | "bottom" | "left" | "right";

  /**
   * Optional: Callback invoked when user clicks within the spotlight area.
   * Useful for triggering actions (e.g., expanding a menu) during tour.
   */
  onClickWithinArea?: () => void;
}
```

#### Examples

**Basic step**:
```typescript
const basicStep: TourStep = {
  selectorId: "main-button",
  content: <p>Click this button to get started</p>,
};
```

**Step with custom positioning and size**:
```typescript
const advancedStep: TourStep = {
  selectorId: "sidebar",
  position: "right",
  width: 300,
  height: 600,
  content: (
    <div>
      <h3 className="font-bold">Navigation</h3>
      <p>This sidebar contains all your saved items.</p>
    </div>
  ),
};
```

**Step with click callback**:
```typescript
const interactiveStep: TourStep = {
  selectorId: "dropdown-trigger",
  position: "bottom",
  content: <p>Click this dropdown to see options</p>,
  onClickWithinArea: () => {
    console.log("User clicked dropdown during tour");
    // Optionally expand it automatically
  },
};
```

---

### `TourContextType` Interface

The object returned by `useTour()` hook.

```typescript
interface TourContextType {
  currentStep: number;
  totalSteps: number;
  nextStep: () => void;
  previousStep: () => void;
  endTour: () => void;
  isActive: boolean;
  startTour: () => void;
  setSteps: (steps: TourStep[]) => void;
  steps: TourStep[];
  isTourCompleted: boolean;
  setIsTourCompleted: (completed: boolean) => void;
}
```

---

### `TourProviderProps` Interface

Props accepted by `<TourProvider>`.

```typescript
interface TourProviderProps {
  children: React.ReactNode;
  onComplete?: () => void;
  onSkip?: (completedSteps: number) => void;
  className?: string;
  isTourCompleted?: boolean;
  tourId?: string;
}
```

---

## Usage Examples

### Example 1: Basic Tour with Two Steps

```tsx
import { TourProvider, useTour, TourStep } from "@/components/tour";
import { useEffect } from "react";

const steps: TourStep[] = [
  {
    selectorId: "search-box",
    position: "bottom",
    content: (
      <div>
        <h3 className="font-semibold">Search</h3>
        <p className="text-sm">Find anything you need here</p>
      </div>
    ),
  },
  {
    selectorId: "settings-gear",
    position: "left",
    content: (
      <div>
        <h3 className="font-semibold">Settings</h3>
        <p className="text-sm">Customize your preferences</p>
      </div>
    ),
  },
];

function DashboardTour() {
  const { setSteps } = useTour();

  useEffect(() => {
    setSteps(steps);
  }, [setSteps]);

  return null;
}

function Dashboard() {
  return (
    <>
      <input id="search-box" placeholder="Search..." />
      <button id="settings-gear">⚙</button>
    </>
  );
}

export default function App() {
  return (
    <TourProvider onComplete={() => alert("Tour complete!")}>
      <DashboardTour />
      <Dashboard />
    </TourProvider>
  );
}
```

---

### Example 2: Advanced - Conditional Steps & Callbacks

```tsx
import { TourProvider, useTour, TourStep } from "@/components/tour";
import { useEffect, useState } from "react";

function AdvancedTourExample() {
  const { setSteps, currentStep, isActive } = useTour();
  const [userRole, setUserRole] = useState<"admin" | "user">("user");

  useEffect(() => {
    // Build steps based on user role
    const steps: TourStep[] = [
      {
        selectorId: "home-btn",
        position: "bottom",
        content: <p>This is the home button</p>,
      },
    ];

    // Add admin-only step
    if (userRole === "admin") {
      steps.push({
        selectorId: "admin-panel",
        position: "right",
        content: (
          <div>
            <h3 className="font-semibold">Admin Panel</h3>
            <p>You have access to admin tools</p>
          </div>
        ),
      });
    }

    setSteps(steps);
  }, [userRole, setSteps]);

  // Monitor tour progress
  useEffect(() => {
    if (isActive) {
      console.log(`User is viewing step ${currentStep}`);
    }
  }, [currentStep, isActive]);

  return <div>Tour is {isActive ? "active" : "inactive"}</div>;
}
```

---

### Example 3: Interactive Tour with Click Actions

```tsx
import { TourProvider, useTour, TourStep } from "@/components/tour";
import { useEffect, useState } from "react";

function InteractiveTour() {
  const { setSteps } = useTour();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const steps: TourStep[] = [
      {
        selectorId: "menu-button",
        position: "bottom",
        content: (
          <div>
            <h3>Open the Menu</h3>
            <p>Click the button to see menu options</p>
          </div>
        ),
        // Auto-expand menu when user clicks it during tour
        onClickWithinArea: () => {
          setMenuOpen(true);
          console.log("Menu expanded automatically");
        },
      },
      {
        selectorId: "profile-option",
        position: "right",
        content: (
          <div>
            <h3>Your Profile</h3>
            <p>Click here to view your profile</p>
          </div>
        ),
        // Only visible if menu is open
      },
    ];

    setSteps(steps);
  }, [setSteps]);

  return (
    <>
      <button
        id="menu-button"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        Menu
      </button>
      {menuOpen && (
        <div id="profile-option">Profile</div>
      )}
    </>
  );
}
```

---

### Example 4: Using `TourAlertDialog` for Prompting

```tsx
import {
  TourProvider,
  useTour,
  TourAlertDialog,
  TourStep,
} from "@/components/tour";
import { useEffect, useState } from "react";

const tourSteps: TourStep[] = [
  {
    selectorId: "feature-1",
    position: "bottom",
    content: <div><h3>Feature 1</h3><p>New feature added</p></div>,
  },
];

function TourContent() {
  const { setSteps } = useTour();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setSteps(tourSteps);
    // Open welcome dialog on first load
    setDialogOpen(true);
  }, [setSteps]);

  return (
    <>
      <TourAlertDialog isOpen={dialogOpen} setIsOpen={setDialogOpen} />
      <div id="feature-1">Check out this new feature!</div>
    </>
  );
}

export default function App() {
  return (
    <TourProvider onComplete={() => console.log("Tour done")}>
      <TourContent />
    </TourProvider>
  );
}
```

---

### Example 5: Multi-Tour Application

```tsx
import { TourProvider, useTour, TourStep } from "@/components/tour";
import { useEffect } from "react";

const onboardingTour: TourStep[] = [
  { selectorId: "signup-form", position: "bottom", content: <p>Sign up here</p> },
];

const featureTour: TourStep[] = [
  { selectorId: "new-feature", position: "right", content: <p>New feature!</p> },
];

function DynamicTour({ tourType }: { tourType: "onboarding" | "feature" }) {
  const { setSteps } = useTour();

  useEffect(() => {
    const steps = tourType === "onboarding" ? onboardingTour : featureTour;
    setSteps(steps);
  }, [tourType, setSteps]);

  return null;
}

export default function App() {
  return (
    <TourProvider tourId="app-tours">
      <DynamicTour tourType="onboarding" />
      {/* Rest of app */}
    </TourProvider>
  );
}
```

---

## Integration Guide

### Step-by-Step Integration into Existing Page

#### 1. Add `<TourProvider>` at Page/App Level

```tsx
// pages/MyPage.tsx or App.tsx
import { TourProvider } from "@/components/tour";

export default function MyPage() {
  return (
    <TourProvider
      tourId="my-page"
      onComplete={() => {
        // Analytics, toast, redirect, etc.
        trackEvent("tour_completed");
      }}
      onSkip={(completedSteps) => {
        trackEvent("tour_skipped", { steps: completedSteps });
      }}
    >
      <YourPageContent />
    </TourProvider>
  );
}
```

#### 2. Add IDs to Target Elements

```tsx
// Make sure all target elements have unique IDs
<input id="search-input" placeholder="Search..." />
<button id="filter-btn">Filter</button>
<div id="results-panel">Results</div>
```

#### 3. Use `TOUR_STEP_IDS` for Consistency (Optional)

```tsx
import { TOUR_STEP_IDS } from "@/components/tour";

// Now use the constant instead of magic strings
<input id={TOUR_STEP_IDS.CHAT_INPUT} />
<button id={TOUR_STEP_IDS.IMAGE_MODE}>Image Mode</button>
```

Or extend `TOUR_STEP_IDS` with custom IDs:

```tsx
// tour-constants.ts
export const TOUR_STEP_IDS = {
  // ... existing
  MY_CUSTOM_BUTTON: "tour-my-custom-button",
  MY_CUSTOM_PANEL: "tour-my-custom-panel",
} as const;
```

#### 4. Create a Tour Content Component

```tsx
// components/MyPageTour.tsx
import { useTour, TourStep, TOUR_STEP_IDS } from "@/components/tour";
import { useEffect } from "react";

const tourSteps: TourStep[] = [
  {
    selectorId: TOUR_STEP_IDS.CHAT_INPUT,
    position: "top",
    content: (
      <div>
        <h3 className="font-semibold mb-2">Start Chatting</h3>
        <p className="text-sm text-muted-foreground">
          Type your message and press Enter
        </p>
      </div>
    ),
  },
  {
    selectorId: TOUR_STEP_IDS.IMAGE_MODE,
    position: "bottom",
    content: (
      <div>
        <h3 className="font-semibold mb-2">Generate Images</h3>
        <p className="text-sm text-muted-foreground">
          Click here to enable image generation
        </p>
      </div>
    ),
  },
];

export function MyPageTour() {
  const { setSteps } = useTour();

  useEffect(() => {
    setSteps(tourSteps);
  }, [setSteps]);

  return null; // Component is invisible; it just manages state
}
```

#### 5. Add Tour Controls (Optional)

```tsx
// components/TourControls.tsx
import { useTour } from "@/components/tour";
import { Button } from "@/components/ui/button";

export function TourControls() {
  const { startTour, isActive, isTourCompleted } = useTour();

  return (
    <Button
      onClick={startTour}
      disabled={isTourCompleted}
      variant={isActive ? "default" : "outline"}
    >
      {isActive ? "Tour In Progress..." : "Start Tour"}
    </Button>
  );
}
```

#### 6. Use in Your Page

```tsx
import { TourProvider } from "@/components/tour";
import { MyPageTour } from "./components/MyPageTour";
import { TourControls } from "./components/TourControls";

export default function MyPage() {
  return (
    <TourProvider tourId="my-page">
      <MyPageTour />

      <header>
        <h1>My Page</h1>
        <TourControls />
      </header>

      <main>
        <input id="tour-chat-input" placeholder="Message..." />
        <button id="tour-image-mode">Image</button>
        {/* Rest of content */}
      </main>
    </TourProvider>
  );
}
```

---

## Keyboard Navigation

The tour supports keyboard navigation automatically when active (without UI hints):

| Key Combination | Action | Behavior |
|-----------------|--------|----------|
| `ArrowRight` or `Enter` | Next step | Advances to next step; finishes tour on last step |
| `ArrowLeft` | Previous step | Goes to previous step; no-op if already at step 0 |
| `Escape` | End tour | Exits tour immediately and invokes `onSkip` callback |

### Keyboard Navigation Details

- **No visible hints** — Keyboard shortcuts are hidden from the UI (discovery-based)
- **Focus management** — Tooltip receives focus when step changes for screen reader users
- **Event capture** — `keydown` listeners are attached to `window`
- **Disabled when inactive** — Listeners are removed when tour is not running

### Example: Announcing Shortcuts

```tsx
function TourInfoPanel() {
  return (
    <div className="text-xs text-muted-foreground">
      <p>Tip: Use arrow keys to navigate (← →), or press Esc to exit</p>
    </div>
  );
}
```

---

## Styling & Customization

### Default Style

The tour uses shadcn/ui design tokens:

| Element | Color Token | CSS Class |
|---------|-------------|-----------|
| Tooltip background | `bg-popover` | `bg-popover text-popover-foreground` |
| Spotlight ring | `ring-primary` | `ring-primary ring-2 ring-offset-2` |
| Overlay | Black 50% | `bg-black/50` |
| Text | Muted foreground | `text-muted-foreground` |

### Customizing the Spotlight Ring

Pass a `className` prop to `<TourProvider>` to override the ring styles:

```tsx
<TourProvider className="ring-blue-500 ring-4">
  {/* Spotlight will now use blue color with thickness 4 */}
</TourProvider>
```

**Available Tailwind classes for spotlight**:
- `ring-{color}-{shade}` — Primary ring color (e.g., `ring-blue-400`)
- `ring-offset-{size}` — Gap between element and ring (e.g., `ring-offset-2`)
- `ring-{width}` — Ring thickness (e.g., `ring-2`, `ring-4`)
- `rounded-lg`, `rounded-full` — Corner radius of ring

### Customizing Tooltip Styles

Modify tooltip appearance by wrapping content in styled containers:

```tsx
const customStep: TourStep = {
  selectorId: "target",
  position: "bottom",
  content: (
    <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-lg text-white">
      <h3 className="font-bold text-lg">Premium Feature</h3>
      <p className="text-sm mt-2">Unlock this feature by upgrading</p>
    </div>
  ),
};
```

### Customizing Animations

Animations respect the user's `prefers-reduced-motion` preference:

- **Reduced motion enabled** — All animations use `duration: 0.1s` (instant)
- **Normal motion** — Animations use `duration: 0.3-0.5s` with easing curves

The component automatically detects this and adjusts:

```tsx
// Component does this internally
const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const prefersReducedMotion = mediaQuery.matches;
```

---

## Accessibility

### ARIA Attributes

| Element | Attribute | Value | Purpose |
|---------|-----------|-------|---------|
| Tooltip container | `role` | `dialog` | Announces as a dialog |
| Tooltip container | `aria-modal` | `true` | Indicates modal behavior |
| Tooltip container | `aria-label` | `Tour step X of Y` | Provides step context |
| Overlay | `aria-hidden` | `true` | Hides decorative overlay from screen readers |
| Spotlight ring | `aria-hidden` | `true` | Hides decorative ring from screen readers |
| Navigation section | `role` | `navigation` | Identifies navigation buttons |

### Focus Management

- **Focus on step change** — Tooltip receives focus via `tabIndex={-1}` and `focus()` call
- **Keyboard navigation** — Tab through Next/Previous buttons naturally
- **Return focus** — Closing tour returns focus to trigger button (optional implementation)

### Reduced Motion Support

The component automatically detects `prefers-reduced-motion: reduce` and:

```tsx
// Disables animations
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
transition={{ duration: 0.1 }}

// Instead of the normal:
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
transition={{ duration: 0.3 }}
```

### Testing Accessibility

```html
<!-- Enable reduced motion for testing -->
<style>
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>
```

### Screen Reader Testing

Use a screen reader (NVDA, JAWS, VoiceOver) to verify:
- Tooltip announces as "dialog" with step count
- Navigation buttons are announced with clear labels
- Decorative elements are hidden from screen readers

---

## Constants & Exports

### `TOUR_STEP_IDS` Constants

Pre-defined element IDs for common tour targets in Vana:

```typescript
export const TOUR_STEP_IDS = {
  CHAT_INPUT: "tour-chat-input",
  IMAGE_MODE: "tour-image-mode",
  ARTIFACT_MODE: "tour-artifact-mode",
  SUGGESTIONS: "tour-suggestions",
  SIDEBAR: "tour-sidebar",
} as const;

export type TourStepId = (typeof TOUR_STEP_IDS)[keyof typeof TOUR_STEP_IDS];
```

### Public Exports from `index.ts`

```typescript
// Components
export { TourProvider, useTour, TourAlertDialog };

// Types
export type { TourStep };

// Constants
export { TOUR_STEP_IDS };
export type { TourStepId };
```

### Default Constants in `tour.tsx`

| Constant | Value | Purpose |
|----------|-------|---------|
| `PADDING` | `16` | Padding around spotlight and tooltip in viewport |
| `CONTENT_WIDTH` | `380` | Default tooltip width (pixels) |
| `CONTENT_HEIGHT` | `200` | Default tooltip height (pixels) |
| `TOUR_STORAGE_KEY_PREFIX` | `"vana-tour-"` | localStorage key prefix |

---

## Common Patterns

### Pattern 1: Reset Tour on Route Change

```tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTour } from "@/components/tour";

export function TourResetOnRouteChange() {
  const { endTour } = useTour();
  const location = useLocation();

  useEffect(() => {
    endTour();
  }, [location.pathname, endTour]);

  return null;
}
```

### Pattern 2: Conditional Tour Based on User State

```tsx
import { useEffect } from "react";
import { useTour } from "@/components/tour";

function ConditionalTour({ isNewUser }: { isNewUser: boolean }) {
  const { startTour, isTourCompleted, setIsTourCompleted } = useTour();

  useEffect(() => {
    if (isNewUser && !isTourCompleted) {
      // Small delay to let page render
      const timer = setTimeout(() => startTour(), 500);
      return () => clearTimeout(timer);
    }
  }, [isNewUser, isTourCompleted, startTour]);

  return null;
}
```

### Pattern 3: Analytics Tracking

```tsx
import { useEffect } from "react";
import { useTour } from "@/components/tour";

function TourAnalytics() {
  const { isActive, currentStep, totalSteps } = useTour();

  useEffect(() => {
    if (isActive) {
      // Track tour step view
      gtag?.event("tour_step_viewed", {
        step: currentStep + 1,
        total_steps: totalSteps,
      });
    }
  }, [currentStep, isActive, totalSteps]);

  return null;
}
```

### Pattern 4: Chained Tooltips with Side Effects

```tsx
import { useEffect } from "react";
import { useTour, TourStep } from "@/components/tour";

function ChainedTour() {
  const { setSteps, currentStep } = useTour();

  useEffect(() => {
    const steps: TourStep[] = [
      {
        selectorId: "step-1",
        position: "bottom",
        content: <p>First step</p>,
        onClickWithinArea: () => console.log("Expanded step 1"),
      },
      {
        selectorId: "step-2",
        position: "right",
        content: <p>Second step (revealed by first)</p>,
      },
    ];

    setSteps(steps);

    // React to step changes
    if (currentStep === 0) {
      console.log("User is on step 1");
    }
  }, [setSteps, currentStep]);

  return null;
}
```

---

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge | Notes |
|---------|--------|---------|--------|------|-------|
| CSS `clip-path: polygon()` | ✅ 55+ | ✅ 49+ | ✅ 9.1+ | ✅ 79+ | Core feature |
| Framer Motion | ✅ Latest | ✅ Latest | ✅ Latest | ✅ Latest | Dependency |
| localStorage | ✅ All | ✅ All | ✅ All | ✅ All | Optional (graceful fallback) |
| `prefers-reduced-motion` | ✅ 74+ | ✅ 63+ | ✅ 10.1+ | ✅ 79+ | Accessibility |

### Graceful Degradation

If a feature isn't supported:
- **localStorage unavailable** — Tour still works; completion state not persisted
- **prefers-reduced-motion undetected** — Tour plays animations normally
- **CSS clip-path unavailable** — Overlay still renders; spotlight may not be visible

---

## Troubleshooting

### Tour Not Showing

**Problem**: Spotlight and tooltip don't appear

**Solutions**:
1. **Element IDs missing**: Verify all `selectorId` values match actual element IDs
   ```tsx
   // Make sure this div exists:
   <div id="my-element-id">Target</div>

   // And matches the step:
   const step = { selectorId: "my-element-id", ... };
   ```

2. **Element not in viewport**: Scroll target element into view
   ```tsx
   element?.scrollIntoView({ behavior: "smooth" });
   ```

3. **Element rendered after TourProvider**: Ensure steps are set AFTER elements mount
   ```tsx
   useEffect(() => {
     // This runs after render, so elements exist
     setSteps(tourSteps);
   }, [setSteps]);
   ```

4. **z-index conflicts**: Increase `z-50` (overlay) and `z-[100]` (spotlight) if needed
   ```tsx
   // Check your CSS for competing z-index values
   ```

### Tour Stuck on Same Step

**Problem**: `nextStep()` doesn't advance

**Solutions**:
1. **On last step**: `nextStep()` returns `-1` (inactive) on the last step
   ```tsx
   if (currentStep === totalSteps - 1) {
     // Clicking next here hides the tour
     nextStep();
   }
   ```

2. **Tour completed**: Check `isTourCompleted` flag
   ```tsx
   if (isTourCompleted) {
     startTour(); // Won't work, need to reset first
     setIsTourCompleted(false); // Reset it
     startTour(); // Now it works
   }
   ```

### Spotlight Ring Missing

**Problem**: Polygon clip-path doesn't create a visible cutout

**Solutions**:
1. **Browser doesn't support clip-path** — Upgrade browser
2. **Overlay opacity too low** — Check `bg-black/50` opacity
3. **Ring color matches background** — Override with `className`
   ```tsx
   <TourProvider className="ring-white ring-4">
   ```

### localStorage Errors in Console

**Problem**: Warnings about localStorage access

**Solutions**:
1. **Private browsing mode** — localStorage unavailable; function gracefully skips storage
2. **Storage quota exceeded** — Clear browser cache
3. **Cross-origin issues** — Ensure tour runs on same domain

---

## File Structure

```
src/components/tour/
├── tour.tsx              # Main component + hooks
│   ├── TourProvider      # Context provider
│   ├── useTour           # Context hook
│   ├── TourAlertDialog   # Welcome dialog
│   ├── useReducedMotion  # Accessibility hook
│   └── Utilities (3)     # Helper functions
├── tour-constants.ts     # TOUR_STEP_IDS enum
├── index.ts              # Public exports
└── README.md             # This file
```

---

## Demo & Examples

### Live Demos

- **shadcn/tour Demo**: `/demo-shadcn-tour` — Full interactive example
- **Feature Tour Demo**: `/demo-feature-tour` — Custom implementation comparison
- **React Joyride Demo**: `/demo-joyride-tour` — Alternative library

### Source Examples

- **ShadcnTourDemo.tsx** — Complete usage example with all features
- **CLAUDE.md** — Project integration notes

---

## Related Resources

- [shadcn/tour GitHub](https://github.com/NiazMorshed2007/shadcn-tour) — Original source
- [Framer Motion Docs](https://www.framer.com/motion/) — Animation library
- [shadcn/ui Components](https://ui.shadcn.com/) — UI component library
- [React Context Guide](https://react.dev/reference/react/useContext) — Context API

---

**Last Updated**: 2025-12-10
