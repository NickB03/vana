# Interaction States

**Last Updated:** 2025-11-04

## Overview

Standardized hover, focus, and active states ensure consistent interactive feedback across the application. These constants handle scale transforms, shadows, colors, and focus rings while respecting accessibility preferences.

### Key Features
- Consistent visual feedback for user actions
- Built-in accessibility (focus-visible, motion-safe)
- Disabled state handling
- GPU-accelerated transforms
- Theme-aware colors

## Import

```tsx
import {
  BUTTON_STATES,
  CARD_STATES,
  LINK_STATES,
  INPUT_STATES,
  withInteraction
} from '@/utils/interactionConstants';
```

---

## BUTTON_STATES

Provides scale, shadow, and ring effects for button interactions.

### Default

Prominent feedback with scale and shadow - use for primary actions.

**Features:**
- Scale up on hover (105%)
- Drop shadow on hover
- Scale down on active (95%)
- Focus ring (2px)
- Disabled state handling

```tsx
import { BUTTON_STATES } from '@/utils/interactionConstants';

<button className={BUTTON_STATES.default}>
  Primary Action
</button>
```

**Includes:**
- `transition-all duration-200` - Smooth 200ms transitions
- `hover:scale-105 motion-safe:hover:scale-105` - Scale up on hover (respects reduced motion)
- `hover:shadow-lg` - Large drop shadow on hover
- `active:scale-95 motion-safe:active:scale-95` - Scale down on click
- `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` - Focus ring for keyboard navigation
- `disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed` - Disabled state

**Example:**
```tsx
<button
  className={`${BUTTON_STATES.default} bg-primary text-primary-foreground px-6 py-3 rounded-md`}
  onClick={handleClick}
>
  Get Started
</button>
```

### Subtle

Background color change only - use for secondary actions.

**Features:**
- Background color change on hover
- Text color change on hover
- Focus ring (2px, 1px offset)
- No scale transform

```tsx
<button className={BUTTON_STATES.subtle}>
  Secondary Action
</button>
```

**Includes:**
- `transition-colors duration-200` - Color transitions only
- `hover:bg-accent hover:text-accent-foreground` - Accent background on hover
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1` - Focus ring

**Example:**
```tsx
<button
  className={`${BUTTON_STATES.subtle} px-4 py-2 rounded-md`}
  onClick={handleSecondaryAction}
>
  Learn More
</button>
```

### Ghost

Minimal visual change - use for tertiary actions.

**Features:**
- Semi-transparent background on hover
- Focus ring (1px)
- Fastest transition (150ms)

```tsx
<button className={BUTTON_STATES.ghost}>
  Tertiary Action
</button>
```

**Includes:**
- `transition-colors duration-150` - Fast color transition
- `hover:bg-accent/50` - 50% opacity accent background
- `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring` - Minimal focus ring

**Example:**
```tsx
<button
  className={`${BUTTON_STATES.ghost} px-3 py-2 rounded-md text-muted-foreground`}
  onClick={handleMinorAction}
>
  Cancel
</button>
```

### Button Comparison

```tsx
function ButtonShowcase() {
  return (
    <div className="flex gap-4">
      {/* Default - Primary actions */}
      <button className={`${BUTTON_STATES.default} bg-primary text-white px-6 py-3 rounded-md`}>
        Save Changes
      </button>

      {/* Subtle - Secondary actions */}
      <button className={`${BUTTON_STATES.subtle} px-6 py-3 rounded-md`}>
        Preview
      </button>

      {/* Ghost - Tertiary actions */}
      <button className={`${BUTTON_STATES.ghost} px-6 py-3 rounded-md`}>
        Cancel
      </button>
    </div>
  );
}
```

---

## CARD_STATES

Provides lift effect and shadow for clickable cards.

### Interactive

Full lift effect with shadow - use for important clickable cards.

**Features:**
- Lifts on hover (-4px Y transform)
- Large shadow on hover
- Returns to position on active
- GPU accelerated
- Focus ring (2px)

```tsx
import { CARD_STATES } from '@/utils/interactionConstants';

<div className={CARD_STATES.interactive}>
  <h3>Clickable Card</h3>
  <p>Content...</p>
</div>
```

**Includes:**
- `cursor-pointer` - Pointer cursor
- `transition-all duration-300` - Smooth 300ms transition
- `transform-gpu` - GPU acceleration for better performance
- `hover:shadow-xl hover:-translate-y-1 motion-safe:hover:-translate-y-1` - Lift and shadow
- `active:translate-y-0 motion-safe:active:translate-y-0` - Reset on click
- `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` - Focus ring
- `focus-visible:outline-none` - Remove default outline

**Example:**
```tsx
<div
  className={`${CARD_STATES.interactive} p-6 border rounded-lg bg-card`}
  onClick={handleCardClick}
  role="button"
  tabIndex={0}
>
  <h3 className="text-lg font-semibold">Feature Card</h3>
  <p className="text-muted-foreground mt-2">
    Click to explore this feature in detail
  </p>
</div>
```

### Subtle

Shadow change only - use for less prominent cards.

**Features:**
- Shadow increases on hover
- Focus ring (2px)
- No transform
- Faster transition (200ms)

```tsx
<div className={CARD_STATES.subtle}>
  <h3>Subtle Card</h3>
  <p>Content...</p>
</div>
```

**Includes:**
- `cursor-pointer` - Pointer cursor
- `transition-shadow duration-200` - Shadow transitions only
- `hover:shadow-md` - Medium shadow on hover
- `focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none` - Focus ring

**Example:**
```tsx
<div
  className={`${CARD_STATES.subtle} p-4 border rounded bg-card`}
  onClick={handleSubtleClick}
  role="button"
  tabIndex={0}
>
  <h4 className="text-sm font-medium">Quick Link</h4>
</div>
```

### Card Examples

```tsx
function CardShowcase() {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Interactive - Primary cards */}
      <div className={`${CARD_STATES.interactive} p-6 border rounded-lg`}>
        <h3 className="text-xl font-bold">Premium Feature</h3>
        <p className="text-muted-foreground">
          Click to learn more about this feature
        </p>
      </div>

      {/* Subtle - Secondary cards */}
      <div className={`${CARD_STATES.subtle} p-4 border rounded`}>
        <h4 className="text-sm font-medium">Quick Action</h4>
        <p className="text-xs text-muted-foreground">Tap to execute</p>
      </div>
    </div>
  );
}
```

---

## LINK_STATES

Provides underline and color change for links.

### Default

Standard link behavior with underline and color change.

**Features:**
- Color change on hover
- Underline on hover
- Underline on focus
- Double underline on focus

```tsx
import { LINK_STATES } from '@/utils/interactionConstants';

<a href="/page" className={LINK_STATES.default}>
  Learn More
</a>
```

**Includes:**
- `transition-colors duration-200` - Color transitions
- `hover:text-primary hover:underline` - Primary color and underline on hover
- `focus-visible:outline-none focus-visible:underline focus-visible:decoration-2 focus-visible:text-primary` - Focus state with thick underline

**Example:**
```tsx
<a
  href="/docs"
  className={`${LINK_STATES.default} text-blue-600`}
>
  View Documentation
</a>

<p className="text-muted-foreground">
  Need help?{' '}
  <a href="/support" className={LINK_STATES.default}>
    Contact Support
  </a>
</p>
```

### Subtle

Color change only - use for inline links that shouldn't distract.

**Features:**
- Color change on hover and focus
- No underline
- Faster transition (150ms)

```tsx
<a href="/page" className={LINK_STATES.subtle}>
  Subtle Link
</a>
```

**Includes:**
- `transition-colors duration-150` - Fast color transition
- `hover:text-primary` - Primary color on hover
- `focus-visible:outline-none focus-visible:text-primary` - Primary color on focus

**Example:**
```tsx
<nav className="flex gap-4">
  <a href="/" className={LINK_STATES.subtle}>
    Home
  </a>
  <a href="/about" className={LINK_STATES.subtle}>
    About
  </a>
  <a href="/contact" className={LINK_STATES.subtle}>
    Contact
  </a>
</nav>
```

---

## INPUT_STATES

Border and ring effects for form inputs.

### Default

Standard form input interactions.

**Features:**
- Focus ring (2px)
- Border color change on focus
- Disabled state handling

```tsx
import { INPUT_STATES } from '@/utils/interactionConstants';

<input
  type="text"
  className={INPUT_STATES.default}
  placeholder="Enter text..."
/>
```

**Includes:**
- `transition-all duration-200` - Smooth transitions
- `focus:ring-2 focus:ring-ring focus:ring-offset-0` - Focus ring without offset
- `focus:border-primary` - Primary border color on focus
- `disabled:opacity-50 disabled:cursor-not-allowed` - Disabled state

**Examples:**

**Text Input:**
```tsx
<input
  type="text"
  className={`${INPUT_STATES.default} w-full px-3 py-2 border rounded-md`}
  placeholder="Your name"
/>
```

**Textarea:**
```tsx
<textarea
  className={`${INPUT_STATES.default} w-full px-3 py-2 border rounded-md`}
  rows={4}
  placeholder="Your message..."
/>
```

**Select:**
```tsx
<select className={`${INPUT_STATES.default} px-3 py-2 border rounded-md`}>
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

**Form Example:**
```tsx
function ContactForm() {
  return (
    <form className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          type="text"
          className={`${INPUT_STATES.default} w-full px-3 py-2 border rounded-md`}
          placeholder="John Doe"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          className={`${INPUT_STATES.default} w-full px-3 py-2 border rounded-md`}
          placeholder="john@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Message</label>
        <textarea
          className={`${INPUT_STATES.default} w-full px-3 py-2 border rounded-md`}
          rows={4}
          placeholder="Your message here..."
        />
      </div>

      <button className={BUTTON_STATES.default}>Submit</button>
    </form>
  );
}
```

---

## Helper Functions

### withInteraction

Combine interaction states with custom classes.

```tsx
import { withInteraction, BUTTON_STATES } from '@/utils/interactionConstants';

<button className={withInteraction(
  BUTTON_STATES.default,
  'bg-primary text-white px-6 py-3 rounded-lg'
)}>
  Custom Button
</button>
```

**With Conditional Classes:**
```tsx
<button className={withInteraction(
  BUTTON_STATES.default,
  isActive ? 'bg-primary' : 'bg-secondary'
)}>
  Toggle Button
</button>
```

---

## Accessibility Features

### Focus-Visible

All interaction states use `focus-visible` instead of `focus`:
- Only shows focus ring when navigating with keyboard
- Doesn't show ring when clicking with mouse
- Better UX for mouse and keyboard users

```tsx
// Good - Only shows ring on keyboard focus
<button className="focus-visible:ring-2">Button</button>

// Avoid - Shows ring on mouse click too
<button className="focus:ring-2">Button</button>
```

### Motion-Safe

All transform animations respect `prefers-reduced-motion`:
- Users can disable animations in OS settings
- Scale and translate transforms are skipped if motion is reduced
- Color and shadow changes still work

```tsx
// Automatically respects user preference
<button className={BUTTON_STATES.default}>
  {/* Scale animations disabled if user prefers reduced motion */}
</button>
```

### Keyboard Navigation

All interactive states support keyboard navigation:
- Tab to focus
- Enter/Space to activate
- Focus rings clearly visible
- Logical tab order

**Example:**
```tsx
<div
  className={CARD_STATES.interactive}
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  role="button"
  tabIndex={0}
>
  Keyboard Accessible Card
</div>
```

---

## Performance Optimization

### GPU Acceleration

Cards use `transform-gpu` for better performance:
```tsx
// CARD_STATES.interactive includes transform-gpu
<div className={CARD_STATES.interactive}>
  {/* Animations run on GPU for smooth 60fps */}
</div>
```

### Transition Durations

Optimized for perceived speed:
- **150ms (fast):** Ghost buttons, subtle links
- **200ms (normal):** Default buttons, inputs, subtle cards
- **300ms (moderate):** Interactive cards with transforms

---

## Best Practices

### DO
- Use appropriate state for context (default/subtle/ghost)
- Combine with semantic HTML (button, a, input)
- Add `role` and `tabIndex` for non-native interactive elements
- Use `withInteraction()` to combine with custom classes
- Test keyboard navigation (Tab, Enter, Space)

### DON'T
- Apply button states to non-interactive elements
- Forget `role` and `tabIndex` for custom interactive elements
- Override focus-visible styles (breaks accessibility)
- Disable motion-safe animations
- Use multiple interaction states on same element

### Accessibility Checklist
- [ ] Focus ring visible on keyboard navigation
- [ ] Works with Tab key
- [ ] Works with Enter/Space keys
- [ ] Has proper `role` attribute
- [ ] Has proper `aria-label` if needed
- [ ] Respects `prefers-reduced-motion`
- [ ] Sufficient color contrast (4.5:1 minimum)

---

## Component Examples

### Button Group
```tsx
function ButtonGroup() {
  return (
    <div className="flex gap-2">
      <button className={`${BUTTON_STATES.default} bg-primary text-white px-4 py-2 rounded-md`}>
        Save
      </button>
      <button className={`${BUTTON_STATES.subtle} px-4 py-2 rounded-md`}>
        Preview
      </button>
      <button className={`${BUTTON_STATES.ghost} px-4 py-2 rounded-md`}>
        Cancel
      </button>
    </div>
  );
}
```

### Feature Cards
```tsx
function FeatureGrid() {
  const features = [
    { title: 'Fast', description: 'Lightning quick responses' },
    { title: 'Secure', description: 'End-to-end encryption' },
    { title: 'Smart', description: 'AI-powered insights' },
  ];

  return (
    <div className="grid grid-cols-3 gap-6">
      {features.map((feature) => (
        <div
          key={feature.title}
          className={`${CARD_STATES.interactive} p-6 border rounded-lg`}
          onClick={() => handleFeatureClick(feature)}
          role="button"
          tabIndex={0}
        >
          <h3 className="text-lg font-semibold">{feature.title}</h3>
          <p className="text-muted-foreground mt-2">{feature.description}</p>
        </div>
      ))}
    </div>
  );
}
```

### Navigation Links
```tsx
function Navigation() {
  return (
    <nav className="flex gap-6">
      <a href="/" className={LINK_STATES.subtle}>
        Home
      </a>
      <a href="/features" className={LINK_STATES.subtle}>
        Features
      </a>
      <a href="/pricing" className={LINK_STATES.subtle}>
        Pricing
      </a>
      <a href="/docs" className={LINK_STATES.default}>
        Documentation
      </a>
    </nav>
  );
}
```

---

## See Also

- [Design System Overview](./OVERVIEW.md) - Introduction to the design system
- [Typography System](./TYPOGRAPHY.md) - Text styling
- [Spacing System](./SPACING.md) - Layout spacing
- [Animation System](./ANIMATIONS.md) - Motion and transitions

---

## Technical Details

**File Location:** `/src/utils/interactionConstants.ts`

**Dependencies:**
- Tailwind CSS 3.4+
- `@/lib/utils` (cn utility)

**TypeScript:** Fully typed with `as const` for autocomplete

**Bundle Size:** ~1.5KB minified (tree-shakeable)
