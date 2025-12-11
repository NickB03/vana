# Tour Component - Quick Reference Card

## Imports

```typescript
import {
  TourProvider,
  useTour,
  TourAlertDialog,
  TOUR_STEP_IDS,
  type TourStep,
} from "@/components/tour";
```

## Basic Setup (3 Lines)

```tsx
<TourProvider tourId="my-tour">
  <YourComponent />
</TourProvider>
```

## Define Steps

```typescript
const steps: TourStep[] = [
  {
    selectorId: "element-id",
    position: "bottom",
    content: <div><h3>Title</h3><p>Description</p></div>,
  },
];
```

## Use in Component

```typescript
function MyComponent() {
  const { setSteps, startTour } = useTour();

  useEffect(() => {
    setSteps(steps);
  }, [setSteps]);

  return <button onClick={startTour}>Start Tour</button>;
}
```

## TourProvider Props

| Prop | Type | Default |
|------|------|---------|
| `children` | ReactNode | required |
| `onComplete` | () => void | - |
| `onSkip` | (steps) => void | - |
| `className` | string | - |
| `isTourCompleted` | boolean | false |
| `tourId` | string | "default" |

## useTour() Properties

| Property | Returns | Use |
|----------|---------|-----|
| `currentStep` | number | Check current step |
| `totalSteps` | number | Show "X of Y" |
| `isActive` | boolean | Check if running |
| `nextStep` | () => void | Go next |
| `previousStep` | () => void | Go back |
| `startTour` | () => void | Start tour |
| `endTour` | () => void | Exit tour |
| `setSteps` | (TourStep[]) => void | Define steps |
| `isTourCompleted` | boolean | Check completion |

## TourStep Properties

| Property | Type | Required | Default |
|----------|------|----------|---------|
| `selectorId` | string | Yes | - |
| `content` | ReactNode | Yes | - |
| `position` | "top" \| "bottom" \| "left" \| "right" | No | "bottom" |
| `width` | number | No | element width |
| `height` | number | No | element height |
| `onClickWithinArea` | () => void | No | - |

## Tour Step IDs

```typescript
TOUR_STEP_IDS.CHAT_INPUT        // "tour-chat-input"
TOUR_STEP_IDS.IMAGE_MODE        // "tour-image-mode"
TOUR_STEP_IDS.ARTIFACT_MODE     // "tour-artifact-mode"
TOUR_STEP_IDS.SUGGESTIONS       // "tour-suggestions"
TOUR_STEP_IDS.SIDEBAR           // "tour-sidebar"
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `→` or `Enter` | Next step |
| `←` | Previous step |
| `Esc` | End tour |

## Callbacks

```typescript
<TourProvider
  onComplete={() => {
    console.log("Tour finished");
  }}
  onSkip={(completedSteps) => {
    console.log(`Skipped after ${completedSteps} steps`);
  }}
>
```

## Show/Hide Tour Dialog

```typescript
const [dialogOpen, setDialogOpen] = useState(false);

<TourAlertDialog isOpen={dialogOpen} setIsOpen={setDialogOpen} />
```

## Reset Tour

```typescript
const { setIsTourCompleted, endTour } = useTour();

// Reset completion state
setIsTourCompleted(false);

// Also stop active tour
endTour();
```

## Customize Spotlight

```typescript
<TourProvider className="ring-blue-500 ring-4">
```

## Position Options

```typescript
position: "top"     // Above element
position: "bottom"  // Below element (default)
position: "left"    // To the left
position: "right"   // To the right
```

## Common Patterns

### 1. Check if Completed

```typescript
const { isTourCompleted } = useTour();

if (isTourCompleted) {
  // Show something else
}
```

### 2. Disable After Completion

```typescript
<button
  onClick={startTour}
  disabled={isTourCompleted}
>
  Start Tour
</button>
```

### 3. Show Step Counter

```typescript
const { currentStep, totalSteps, isActive } = useTour();

{isActive && <span>{currentStep + 1}/{totalSteps}</span>}
```

### 4. Interactive Steps

```typescript
{
  selectorId: "menu",
  content: "Click to expand",
  onClickWithinArea: () => {
    setMenuOpen(true); // Auto-expand
  },
}
```

### 5. Multiple Tours

```typescript
<TourProvider tourId="onboarding">
  // Each tourId = separate completion state
</TourProvider>

<TourProvider tourId="feature-v2">
  // Different tour, different state
</TourProvider>
```

## HTML Requirements

Every step needs a matching element:

```tsx
{/* Define step */}
const step = { selectorId: "my-button", ... };

{/* Add to HTML */}
<button id="my-button">Click me</button>
```

## Styling Guide

**Tooltip styling**:
```tsx
content: (
  <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
    <h3>Custom styled step</h3>
  </div>
)
```

**Spotlight customization**:
```tsx
<TourProvider className="ring-white ring-4 rounded-full">
```

## Accessibility

- Keyboard navigation built-in
- ARIA labels automatically added
- Respects `prefers-reduced-motion`
- Focus management handled
- Works with screen readers

## localStorage Behavior

- Saves completion state per `tourId`
- Key format: `vana-tour-{tourId}`
- Data: `{ completed, lastStep }`
- Gracefully handles errors (private mode, etc.)

## Browser Support

- Chrome 55+
- Firefox 49+
- Safari 9.1+
- Edge 79+

## Common Issues

| Issue | Solution |
|-------|----------|
| Tour not showing | Check element ID exists |
| Step doesn't advance | Verify it's not the last step |
| Won't start again | Reset with `setIsTourCompleted(false)` |
| Overlay too dark | Adjust `bg-black/50` opacity |

## Full Documentation

See `README.md` in this directory for complete API reference, examples, and integration guide.
