# Claude-Style Ticker Reasoning UI - Implementation Plan

**Goal**: Transform the current detailed reasoning display into a minimal "ticker" pill that shows progressive status updates, matching Claude's UX pattern.

**Timeline**: 4 changes across frontend and backend

---

## Change 1: Simplify Display Logic (Ticker Mode)

### Current Behavior
- Shows multiple steps simultaneously during streaming
- Displays progress dots (1/3, 2/3, etc.)
- Shows all step titles in expanded view
- Streaming text visible in real-time

### Target Behavior
- Shows **only current step title** in pill (ticker)
- Smooth crossfade transitions between steps (150ms)
- After completion: "Thought for X seconds"
- No progress dots

### Files to Modify
- `src/components/ReasoningDisplay.tsx` (lines 234-266, 404-430)

### Implementation Steps

#### 1.1 Update `getPillText()` Function
**Location**: `ReasoningDisplay.tsx:234-266`

**Current**:
```typescript
const getPillText = (): string => {
  if (isStreaming) {
    if (validatedSteps && currentSection) {
      return currentSection.title || "Processing...";
    }
    if (hasStreamingText && streamingReasoningText) {
      return getLastStreamingLine(streamingReasoningText);
    }
    return "Thinking...";
  }

  // Shows summary or ticker of all steps
  if (validatedSteps) {
    const summary = validatedSteps.summary;
    if (summary) return summary;
    if (totalSections === 1) return validatedSteps.steps[0].title;
    const fullTicker = formatTitlesAsTicker(validatedSteps.steps);
    return fullTicker;
  }

  return "Show reasoning";
};
```

**Target**:
```typescript
const getTickerText = (): string => {
  if (isStreaming) {
    // During streaming: show current step title only
    if (validatedSteps && currentSection) {
      return currentSection.title; // e.g., "Analyzing requirements..."
    }
    return "Thinking..."; // Initial state before first step
  }

  // After streaming: show completion message
  return `Thought for ${elapsedTime}`;
};
```

**Key Changes**:
- Rename to `getTickerText()` for clarity
- Remove multi-step ticker logic (`formatTitlesAsTicker`)
- Remove streaming text fallback (GLM raw text)
- Use timer for completion message

#### 1.2 Remove Progress Dots
**Location**: `ReasoningDisplay.tsx:404-430`

**Current**:
```typescript
{!showThinkingBar && isStreaming && hasStructuredContent && validatedSteps && (
  <div className="flex gap-1 mr-1" aria-hidden="true">
    {validatedSteps.steps.map((_, idx) => (
      <div
        key={idx}
        className={cn(
          "w-1.5 h-1.5 rounded-full transition-colors",
          getDotColor()
        )}
      />
    ))}
  </div>
)}
```

**Target**:
```typescript
// Remove entirely - no progress dots in Claude's design
```

**Rationale**: Progress dots add visual clutter and aren't necessary when ticker text shows progress

#### 1.3 Update Icon Logic for Completion
**Location**: `ReasoningDisplay.tsx:316-342`

**Current**: Shows last step's icon when complete
**Target**: Show checkmark icon when complete

```typescript
// Add import
import { Check } from "lucide-react";

// Update icon rendering
{showThinkingBar ? (
  // Orange spinner during thinking
  <div className="w-4 h-4 border-2 border-orange-400/30 border-t-orange-500 rounded-full animate-spin" />
) : !isStreaming ? (
  // Green checkmark when complete
  <Check className="size-4 text-green-500 transition-opacity" />
) : hasStreamingText ? (
  // Sparkles for GLM streaming
  <Sparkles className="size-4 text-orange-500" />
) : IconComponent ? (
  // Step icon during streaming
  <IconComponent className="size-4 text-orange-500" />
) : null}
```

#### 1.4 Add Smooth Crossfade Transitions
**Location**: `ReasoningDisplay.tsx:344-370`

**Enhancement**: Add opacity transition classes

```typescript
<span
  className={cn(
    "flex-1 text-sm line-clamp-1",
    "text-muted-foreground",
    "transition-all duration-150", // Add smooth transition
    isTransitioning && "opacity-50" // Fade during transition
  )}
>
  {getTickerText()}
</span>
```

### Testing Checklist
- [ ] Ticker text updates smoothly as steps arrive
- [ ] No progress dots visible during streaming
- [ ] Checkmark appears on completion (not last step icon)
- [ ] "Thought for X seconds" appears after streaming
- [ ] Crossfade animation is smooth (150ms)
- [ ] Initial "Thinking..." shows before first step

---

## Change 2: Improve Summary Generation (Backend)

### Current Behavior
- Summary uses last section's first item or raw text
- May be too verbose or technical
- Limited to 150 characters

### Target Behavior
- Natural language summary: "Did X, then Y, then Z"
- Concise and user-friendly
- Always grammatically correct

### Files to Modify
- `supabase/functions/_shared/glm-reasoning-parser.ts` (lines 385-425)

### Implementation Steps

#### 2.1 Enhance `generateSummary()` Function
**Location**: `glm-reasoning-parser.ts:385-400`

**Current**:
```typescript
function generateSummary(sections: ReasoningSection[]): string | undefined {
  if (sections.length === 0) return undefined;

  const lastSection = sections[sections.length - 1];
  let summary = lastSection.items[0] || lastSection.rawText || lastSection.title;

  if (summary.length > 150) {
    summary = summary.substring(0, 147) + '...';
  }

  return summary || undefined;
}
```

**Target**:
```typescript
/**
 * Generate a natural language summary from reasoning steps
 *
 * Examples:
 * - 1 step: "Analyzed the request."
 * - 2 steps: "Analyzed requirements, then planned the implementation."
 * - 3+ steps: "Analyzed requirements, planned the structure, and built the solution."
 *
 * @param sections - Reasoning sections to summarize
 * @returns Natural language summary (max 150 chars)
 */
function generateSummary(sections: ReasoningSection[]): string | undefined {
  if (sections.length === 0) return undefined;

  // Extract clean action phrases from step titles
  const actions = sections.map(section => {
    let title = section.title.trim();

    // Remove common prefixes
    title = title.replace(/^(Step\s+\d+:?\s*|Section\s+\d+:?\s*)/i, '');

    // Convert to past tense if present tense action verb
    // "Analyzing requirements" → "analyzed requirements"
    // "Planning implementation" → "planned the implementation"
    title = convertToPastTense(title);

    // Ensure lowercase for sentence construction
    return title.toLowerCase();
  });

  // Construct natural sentence
  let summary: string;

  if (actions.length === 1) {
    summary = capitalize(actions[0]) + ".";
  } else if (actions.length === 2) {
    summary = `${capitalize(actions[0])}, then ${actions[1]}.`;
  } else {
    const first = capitalize(actions[0]);
    const middle = actions.slice(1, -1).join(", ");
    const last = actions[actions.length - 1];
    summary = `${first}, ${middle}, and ${last}.`;
  }

  // Trim to max length
  if (summary.length > 150) {
    summary = summary.substring(0, 147) + '...';
  }

  return summary;
}

/**
 * Convert present continuous tense to simple past
 * "Analyzing requirements" → "analyzed requirements"
 */
function convertToPastTense(phrase: string): string {
  const conversions: Record<string, string> = {
    'analyzing': 'analyzed',
    'planning': 'planned',
    'building': 'built',
    'creating': 'created',
    'designing': 'designed',
    'implementing': 'implemented',
    'generating': 'generated',
    'evaluating': 'evaluated',
    'considering': 'considered',
    'processing': 'processed',
    'researching': 'researched',
    'examining': 'examined',
    'investigating': 'investigated',
    'exploring': 'explored',
    'assessing': 'assessed',
    'reviewing': 'reviewed',
    'validating': 'validated',
    'optimizing': 'optimized',
  };

  let result = phrase;
  for (const [present, past] of Object.entries(conversions)) {
    const regex = new RegExp(`\\b${present}\\b`, 'gi');
    result = result.replace(regex, past);
  }

  return result;
}

/**
 * Capitalize first letter of string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
```

#### 2.2 Add Helper Function Export
Add these helpers to the public API:

```typescript
// At end of file
export { generateSummary, convertToPastTense, capitalize };
```

#### 2.3 Update Tests
**Location**: Create `supabase/functions/_shared/__tests__/glm-reasoning-parser.test.ts`

```typescript
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { convertToPastTense, capitalize } from "../glm-reasoning-parser.ts";

Deno.test("convertToPastTense - converts present continuous to past", () => {
  assertEquals(convertToPastTense("Analyzing requirements"), "analyzed requirements");
  assertEquals(convertToPastTense("Planning implementation"), "planned implementation");
  assertEquals(convertToPastTense("Building solution"), "built solution");
});

Deno.test("capitalize - capitalizes first letter", () => {
  assertEquals(capitalize("hello world"), "Hello world");
  assertEquals(capitalize("test"), "Test");
  assertEquals(capitalize(""), "");
});
```

### Testing Checklist
- [ ] Single step generates simple sentence
- [ ] Two steps use "then" conjunction
- [ ] Three+ steps use commas and "and"
- [ ] Summary is always under 150 characters
- [ ] Past tense conversion works correctly
- [ ] Summary is grammatically correct

---

## Change 3: Remove Visual Clutter

### Current Behavior
- Shows all steps in expanded view with bullet items
- Shows raw streaming text for GLM
- Shows progress dots
- Shows multiple icons during streaming

### Target Behavior
- Expanded view shows **summary only** (1-2 sentences)
- No bullet points, no step breakdowns
- Clean, minimal design

### Files to Modify
- `src/components/ReasoningDisplay.tsx` (lines 447-549)

### Implementation Steps

#### 3.1 Simplify Expanded Content
**Location**: `ReasoningDisplay.tsx:447-549`

**Current**:
```typescript
<div className={cn("overflow-hidden transition-[max-height,opacity]", ...)}>
  {hasStructuredContent && sanitizedSteps && (
    <div className="pt-2 pl-6 border-l-2 border-border/40 ml-0.5 mt-2">
      <div className="space-y-4">
        {sanitizedSteps.steps.map((step, index) => (
          <div key={index} className="space-y-1.5">
            {/* Step header with icon and title */}
            <div className="flex items-start gap-2">
              {StepIcon && <StepIcon />}
              <h4>{step.title}</h4>
            </div>
            {/* Items as bullet points */}
            <ul className="space-y-1 pl-6">
              {step.items.map((item, itemIndex) => (
                <li key={itemIndex} className="text-sm list-disc">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )}

  {/* GLM streaming text fallback */}
  {hasStreamingText && ...}

  {/* Non-structured reasoning fallback */}
  {!validatedSteps && ...}
</div>
```

**Target**:
```typescript
<div
  className={cn(
    "overflow-hidden transition-all duration-300",
    isExpanded ? "max-h-32 opacity-100 mt-2" : "max-h-0 opacity-0"
  )}
>
  <div className="pt-2 pl-6 border-l-2 border-border/40">
    <p className="text-sm text-muted-foreground leading-relaxed">
      {sanitizedSteps?.summary ||
       "Analyzed the request and processed it thoughtfully."}
    </p>
  </div>
</div>
```

**Key Changes**:
- Remove step iteration (no `map` over steps)
- Remove bullet list rendering
- Show **only** the summary paragraph
- Simpler fallback text
- Keep border-left for visual hierarchy

#### 3.2 Remove Unused Helper Functions
**Location**: `ReasoningDisplay.tsx:60-63`

**Remove**:
```typescript
function formatTitlesAsTicker(steps: ReasoningStep[]): string {
  return steps.map(step => step.title).join(" → ");
}
```

**Remove**:
```typescript
function getLastStreamingLine(text: string): string {
  // ... (lines 224-230)
}
```

**Rationale**: No longer needed with ticker-only display

#### 3.3 Clean Up State Variables
**Location**: `ReasoningDisplay.tsx:83-95`

**Remove**:
```typescript
const [displayedSectionIndex, setDisplayedSectionIndex] = useState(0);
```

**Keep**:
```typescript
const [isExpanded, setIsExpanded] = useState(false);
const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
const [isTransitioning, setIsTransitioning] = useState(false);
```

**Rationale**: Simplify state management - only need current index, not displayed index

### Testing Checklist
- [ ] Expanded view shows only summary text
- [ ] No bullet points visible
- [ ] No step headers in expanded view
- [ ] Border-left provides visual hierarchy
- [ ] Fallback text works when summary is missing
- [ ] Transition is smooth (300ms)

---

## Change 4: Simplify Expanded View

### Current Behavior
- Multiple sections with icons and titles
- Bullet-point items under each section
- Different opacity for past/current/future steps
- Complex layout with nested divs

### Target Behavior
- Single paragraph summary
- No icons, no sections
- Clean typography
- Maximum 2-3 sentences

### Files to Modify
- `src/components/ReasoningDisplay.tsx` (expanded content section)
- `src/types/reasoning.ts` (ensure summary field is prioritized)

### Implementation Steps

#### 4.1 Update StructuredReasoning Type Documentation
**Location**: `src/types/reasoning.ts:17-24`

**Add JSDoc**:
```typescript
export const StructuredReasoningSchema = z.object({
  steps: z.array(ReasoningStepSchema).min(1).max(10),
  /**
   * Summary of the entire reasoning process
   * CRITICAL: This should be a natural language summary (1-3 sentences)
   * used in the collapsed reasoning pill's expanded view.
   *
   * Examples:
   * - "Analyzed requirements, planned the structure, and built the solution."
   * - "Researched best practices, then designed the component architecture."
   *
   * Max length: 150 characters
   */
  summary: z.string().max(150).optional(),
});
```

#### 4.2 Add Summary Validation in Frontend
**Location**: `ReasoningDisplay.tsx` (add after imports)

```typescript
/**
 * Ensure summary is user-friendly and concise
 * Fallback to generated summary if missing or too verbose
 */
function getSafeReasoningSummary(steps: StructuredReasoning | null): string {
  if (!steps) {
    return "Analyzed and processed the request.";
  }

  // Use provided summary if available and reasonable length
  if (steps.summary && steps.summary.length > 0 && steps.summary.length <= 150) {
    return steps.summary;
  }

  // Generate fallback summary from step titles
  if (steps.steps.length === 1) {
    return `${steps.steps[0].title}.`;
  }

  if (steps.steps.length === 2) {
    const first = steps.steps[0].title.toLowerCase();
    const second = steps.steps[1].title.toLowerCase();
    return `${capitalize(first)}, then ${second}.`;
  }

  // For 3+ steps, create a simple list
  const actions = steps.steps.map(s => s.title.toLowerCase());
  const last = actions.pop();
  return `${capitalize(actions.join(", "))}, and ${last}.`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
```

#### 4.3 Use Safe Summary in Expanded View
**Location**: Update expanded content to use helper

```typescript
<div className="pt-2 pl-6 border-l-2 border-border/40">
  <p className="text-sm text-muted-foreground leading-relaxed">
    {getSafeReasoningSummary(sanitizedSteps)}
  </p>
</div>
```

#### 4.4 Add Typography Enhancement
**Styling improvements**:

```typescript
<p className={cn(
  "text-sm text-muted-foreground",
  "leading-relaxed",        // Better readability
  "max-w-prose",            // Limit line length
  "hyphens-auto"            // Hyphenation for long words
)}>
  {getSafeReasoningSummary(sanitizedSteps)}
</p>
```

### Testing Checklist
- [ ] Summary is always 1-3 sentences
- [ ] Typography is readable and well-spaced
- [ ] Fallback summary works when backend doesn't provide one
- [ ] Summary never exceeds 150 characters
- [ ] Line length is comfortable to read
- [ ] Works in both light and dark mode

---

## Integration Testing Plan

### Test Scenarios

#### Scenario 1: First-Time Streaming (No Steps Yet)
**Expected**:
- Pill shows: `◐ Thinking...` with spinner
- Timer: Hidden (0s)
- Expanded: Disabled (no chevron)

#### Scenario 2: First Step Arrives
**Expected**:
- Pill shows: `🔍 Analyzing requirements...` with shimmer
- Timer: `1s` (orange)
- Icon: Search icon (orange)
- Expanded: Enabled (chevron visible)
- Transition: Smooth crossfade from "Thinking..."

#### Scenario 3: Second Step Arrives
**Expected**:
- Pill shows: `💡 Planning implementation...`
- Timer: `2s`
- Icon: Lightbulb (orange)
- Transition: 150ms crossfade from previous step

#### Scenario 4: Streaming Complete
**Expected**:
- Pill shows: `✓ Thought for 3s`
- Timer: Hidden
- Icon: Checkmark (green)
- Expanded: Enabled, shows summary when clicked

#### Scenario 5: User Expands Reasoning
**Expected**:
- Pill chevron rotates 180°
- Content slides down (300ms)
- Shows: "Analyzed requirements, planned the structure, and built the solution."
- No bullets, no step headers

#### Scenario 6: Mobile Device
**Expected**:
- Pill height: 44px minimum (touch target)
- Text readable at arm's length
- Smooth transitions on lower-end devices

### Performance Testing

**Metrics to Track**:
- Time to first render: < 50ms
- Crossfade transition smoothness: 60fps
- Memory usage during streaming: < 5MB increase
- Re-render count: < 1 per step (memoization working)

### Accessibility Testing

**WCAG Compliance**:
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Screen reader announces ticker changes
- [ ] Color contrast meets AA standards (4.5:1 for text)
- [ ] Focus indicators visible
- [ ] ARIA labels accurate

---

## Rollout Strategy

### Phase 1: Frontend Changes (Changes 1, 3, 4)
**Tasks**:
1. Update `ReasoningDisplay.tsx` component
2. Add helper functions for summary fallback
3. Remove progress dots and complex expanded view
4. Add crossfade transitions

**Deployment**: Can deploy independently (graceful degradation with existing summaries)

### Phase 2: Backend Enhancement (Change 2)
**Tasks**:
1. Update `generateSummary()` in `glm-reasoning-parser.ts`
2. Add past-tense conversion logic
3. Add unit tests for summary generation

**Deployment**: Can deploy independently (backwards compatible)

### Phase 3: Testing & Refinement
**Tasks**:
1. Test with real GLM-4.6 reasoning streams
2. Gather user feedback on ticker UX
3. Adjust timing/transitions if needed
4. Optimize for mobile devices

---

## Success Metrics

### User Experience
- [ ] Ticker text updates are smooth and non-jarring
- [ ] Users understand what the AI is doing without expanding
- [ ] Completion message is clear and reassuring
- [ ] Summary provides value when expanded (not redundant)

### Performance
- [ ] No layout shifts during ticker updates
- [ ] Smooth 60fps transitions
- [ ] Low memory footprint (< 5MB for component)

### Accessibility
- [ ] WCAG AA compliance maintained
- [ ] Screen reader announces changes appropriately
- [ ] Keyboard navigation works smoothly

### Code Quality
- [ ] Component complexity reduced (fewer lines of code)
- [ ] Easier to maintain (fewer states, simpler logic)
- [ ] Well-tested (unit tests for all helpers)
- [ ] TypeScript types are accurate

---

## Risk Mitigation

### Risk 1: Summary Generation Fails
**Mitigation**: Always provide fallback summary
**Implementation**: `getSafeReasoningSummary()` helper with multiple fallback levels

### Risk 2: Ticker Updates Too Fast
**Mitigation**: Debounce step updates (minimum 500ms between transitions)
**Implementation**: Add `ANIMATION.MIN_STEP_DURATION_MS = 500` constant

### Risk 3: Mobile Performance Issues
**Mitigation**: Test on low-end devices, reduce animation complexity if needed
**Implementation**: Add `prefers-reduced-motion` media query support

### Risk 4: Backend Summary Too Verbose
**Mitigation**: Frontend validation and truncation
**Implementation**: `getSafeReasoningSummary()` enforces 150 char limit

---

## Files Summary

### Frontend Files to Modify
1. `src/components/ReasoningDisplay.tsx` - Main component (Changes 1, 3, 4)
2. `src/types/reasoning.ts` - Add JSDoc for summary field (Change 4)

### Backend Files to Modify
1. `supabase/functions/_shared/glm-reasoning-parser.ts` - Summary generation (Change 2)

### New Files to Create
1. `supabase/functions/_shared/__tests__/glm-reasoning-parser.test.ts` - Unit tests (Change 2)

### Files to Update (Documentation)
1. `.claude/CLAUDE.md` - Update reasoning UI documentation
2. `README.md` - Update screenshots if needed

---

## Timeline Estimate

| Change | Estimated Time | Complexity |
|--------|---------------|------------|
| Change 1: Ticker Display | 2-3 hours | Medium |
| Change 2: Summary Generation | 1-2 hours | Low |
| Change 3: Remove Clutter | 1 hour | Low |
| Change 4: Simplify Expanded | 1 hour | Low |
| Testing & Refinement | 2-3 hours | Medium |
| **Total** | **7-10 hours** | **Medium** |

---

## Next Steps

1. **Review this plan** - Ensure alignment with product vision
2. **Get approval** - Confirm design decisions
3. **Start with Change 1** - Frontend ticker display (most visible)
4. **Test incrementally** - Deploy and test each change
5. **Iterate based on feedback** - Refine timing and transitions

---

## Questions for Product Owner

1. **Timer visibility**: Should timer persist after completion, or hide immediately?
2. **Summary length**: Is 150 characters the right limit, or adjust to 100/200?
3. **Transition speed**: Is 150ms crossfade fast enough, or prefer 200ms?
4. **Mobile priority**: Should we optimize for mobile first, or desktop?
5. **Fallback behavior**: If backend provides no summary, is auto-generated acceptable?

---

**Plan Created**: 2025-11-30
**Author**: Frontend Developer Agent
**Status**: Ready for Implementation
