# Claude-Style Ticker Reasoning UI - CORRECT Implementation Plan

**Based on actual Claude screenshots analysis**

---

## Key Distinctions (From Screenshots)

### Streaming State (Images #1-3)
```
┌────────────────────────────────────────────────────────┐
│ Thinking...                                          ▼ │  ← Initial
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ Scrutinizing feasibility of local LLM migration...  ▼ │  ← Update #1
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ Interrogated feasibility gaps between...       18s  ▼ │  ← Update #2
└────────────────────────────────────────────────────────┘
```

### Complete State - Collapsed (Image #4)
```
┌────────────────────────────────────────────────────────┐
│ Interrogated feasibility gaps between...       18s  ▼ │  ← Last status
└────────────────────────────────────────────────────────┘
[Response content appears below - NOT in pill]
```

### Complete State - Expanded (Images #5-6)
```
┌────────────────────────────────────────────────────────┐
│ Thought process                                 18s  ▲ │  ← Label changes!
├────────────────────────────────────────────────────────┤
│ The user is pushing me to think harder about what's   │
│ missing from my understanding. Let me think through    │
│ this more carefully...                                 │
│                                                         │
│ They want to replace Claude Code with local LLMs...    │
│                                                         │
│ • Claude Code with Sonnet 4 and Opus 4.1               │
│ • Augment Code                                         │
│ • Extensions like Cline, Roo Code                      │
│ • VS Code for agentic AI coding                        │
└────────────────────────────────────────────────────────┘
[Background is LIGHTER GRAY when expanded]
```

---

## Implementation Changes Required

### Change 1: Ticker Shows Last Status (Not "Thought for X seconds")

**Current behavior**: After streaming, shows "Thought for 3s"
**Target behavior**: Keep showing last status update + timer

**Location**: `ReasoningDisplay.tsx:234-266`

**Current**:
```typescript
const getPillText = (): string => {
  if (isStreaming) {
    if (validatedSteps && currentSection) {
      return currentSection.title;
    }
    return "Thinking...";
  }

  // WRONG: Shows "Thought for X seconds"
  return `Thought for ${elapsedTime}`;
};
```

**Target**:
```typescript
const getPillText = (): string => {
  if (isStreaming) {
    // During streaming: show current step title
    if (validatedSteps && currentSection) {
      return currentSection.title; // e.g., "Scrutinizing feasibility..."
    }
    return "Thinking..."; // Initial state
  }

  // CORRECT: After streaming, keep showing last status
  if (validatedSteps && validatedSteps.steps.length > 0) {
    const lastStep = validatedSteps.steps[validatedSteps.steps.length - 1];
    return lastStep.title; // e.g., "Interrogated feasibility gaps..."
  }

  return "Completed reasoning"; // Fallback
};
```

### Change 2: Label Changes to "Thought process" When Expanded

**Current behavior**: No label, just shows step titles
**Target behavior**: When expanded, pill shows "Thought process" label

**Location**: `ReasoningDisplay.tsx` (new conditional rendering)

**Implementation**:
```typescript
const getPillLabel = (): string => {
  if (isExpanded && !isStreaming) {
    // When expanded after streaming: show "Thought process"
    return "Thought process";
  }

  // When collapsed or streaming: show current/last status
  return getPillText();
};
```

**Update pill rendering**:
```typescript
<div className="flex items-center gap-2 flex-1">
  {/* Icon logic stays the same */}

  {/* Text changes based on state */}
  {isStreaming ? (
    <TextShimmer className="text-sm flex-1">
      {getPillLabel()}
    </TextShimmer>
  ) : (
    <span className={cn(
      "text-sm flex-1",
      isExpanded ? "text-muted-foreground" : "text-foreground"
    )}>
      {getPillLabel()}
    </span>
  )}
</div>
```

### Change 3: Background Lightens When Expanded

**Current behavior**: Same background always
**Target behavior**: Lighter gray background when expanded (like Claude)

**Location**: `ReasoningDisplay.tsx:274-280`

**Current**:
```typescript
const pillBaseClasses = cn(
  "flex w-full cursor-pointer items-center justify-between gap-2",
  "rounded-md border border-border/40 bg-transparent",
  "px-3 py-1.5 text-left",
  "transition-all",
  "hover:border-border/60 hover:bg-muted/10"
);
```

**Target**:
```typescript
const pillBaseClasses = cn(
  "flex w-full cursor-pointer items-center justify-between gap-2",
  "rounded-md border border-border/40",
  "px-3 py-1.5 text-left",
  "transition-all duration-300",
  // CRITICAL: Background changes when expanded
  isExpanded && !isStreaming
    ? "bg-muted/30 border-border/60"  // Lighter gray when expanded
    : "bg-transparent",                 // Transparent when collapsed
  "hover:border-border/60 hover:bg-muted/10"
);
```

### Change 4: Expanded View Shows FULL Reasoning (Not Summary)

**Current behavior**: Shows summary only (wrong!)
**Target behavior**: Shows FULL reasoning text with formatting

**Location**: `ReasoningDisplay.tsx:447-549`

**Target**:
```typescript
<div
  className={cn(
    "overflow-hidden transition-all duration-300",
    isExpanded ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0"
  )}
>
  <div className={cn(
    "pt-3 px-4 pb-4",
    "rounded-md",
    "bg-muted/30",  // Lighter gray background (matching Claude)
    "border border-border/40"
  )}>
    {/* Show FULL reasoning text */}
    {validatedSteps ? (
      <div className="space-y-3">
        {validatedSteps.steps.map((step, index) => (
          <div key={index} className="space-y-2">
            {/* Step content (paragraphs) */}
            {step.items.map((item, itemIndex) => (
              <p key={itemIndex} className="text-sm text-muted-foreground leading-relaxed">
                {item}
              </p>
            ))}

            {/* If step has bullet points, show them */}
            {step.items.some(item => item.startsWith('•')) && (
              <ul className="space-y-1 pl-6">
                {step.items
                  .filter(item => item.startsWith('•'))
                  .map((item, bulletIndex) => (
                    <li key={bulletIndex} className="text-sm text-muted-foreground list-disc">
                      {item.replace(/^•\s*/, '')}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">
        {sanitizedReasoning || "No reasoning data available."}
      </p>
    )}
  </div>
</div>
```

### Change 5: Timer Persists After Streaming

**Current behavior**: Timer may hide after streaming
**Target behavior**: Timer shows "18s" and persists when expanded

**Location**: `ReasoningDisplay.tsx:376-380`

**Current**:
```typescript
{elapsedTime && isStreaming && hasContent && (
  <span className="text-xs text-orange-500 font-mono">
    {elapsedTime}
  </span>
)}
```

**Target**:
```typescript
{elapsedTime && (isStreaming || isExpanded) && (
  <span className={cn(
    "text-xs font-mono tabular-nums",
    isStreaming ? "text-orange-500" : "text-muted-foreground"
  )}>
    {elapsedTime}
  </span>
)}
```

**Key change**: Timer shows during streaming AND when expanded (matches screenshots)

---

## Visual Design Updates

### Color Palette (From Screenshots)

| State | Pill Background | Pill Text | Timer Color |
|-------|----------------|-----------|-------------|
| Streaming | `bg-transparent` | `text-foreground` | `text-orange-500` |
| Collapsed (done) | `bg-transparent` | `text-foreground` | Hidden |
| Expanded (done) | `bg-muted/30` | `text-muted-foreground` | `text-muted-foreground` |

### Expanded Content Box

```typescript
className={cn(
  "pt-3 px-4 pb-4",
  "rounded-md",
  "bg-muted/30",           // Lighter gray (matches Claude #5-6)
  "border border-border/40",
  "text-sm text-muted-foreground",
  "leading-relaxed"
)}
```

---

## Implementation Summary

### Files to Modify

1. **`src/components/ReasoningDisplay.tsx`**
   - Update `getPillText()` to keep last status (not "Thought for X")
   - Add `getPillLabel()` to show "Thought process" when expanded
   - Add background lightening when expanded
   - Show FULL reasoning in expanded view (not summary)
   - Keep timer visible when expanded

2. **`src/types/reasoning.ts`**
   - No changes needed (structure is fine)

3. **Backend** (`glm-reasoning-parser.ts`)
   - No changes needed for now
   - Current step titles work as status updates

### What NOT to Change

- ❌ Don't show "Thought for X seconds" text
- ❌ Don't hide status text after streaming
- ❌ Don't show only summary in expanded view
- ❌ Don't remove timer after streaming

### What TO Change

- ✅ Keep showing last status update after streaming
- ✅ Show "Thought process" label when expanded
- ✅ Lighten background when expanded (like Claude)
- ✅ Show FULL reasoning text in expanded view
- ✅ Keep timer visible when expanded

---

## Code Example - Complete Component

```typescript
export const ReasoningDisplay = memo(function ReasoningDisplay({
  reasoningSteps,
  isStreaming,
  onStop,
}: ReasoningDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const elapsedTime = useReasoningTimer(isStreaming);

  const currentStep = reasoningSteps?.steps[currentStepIndex];
  const lastStep = reasoningSteps?.steps[reasoningSteps.steps.length - 1];

  // Get pill label/text
  const getPillLabel = (): string => {
    if (isExpanded && !isStreaming) {
      return "Thought process"; // CRITICAL: Label changes when expanded
    }

    if (isStreaming) {
      return currentStep?.title || "Thinking...";
    }

    // After streaming: show last status (NOT "Thought for X seconds")
    return lastStep?.title || "Completed reasoning";
  };

  return (
    <div className="w-full">
      {/* Pill */}
      <div
        className={cn(
          "flex items-center justify-between gap-2",
          "rounded-md border border-border/40",
          "px-3 py-1.5 cursor-pointer",
          "transition-all duration-300",
          // Background lightens when expanded (like Claude)
          isExpanded && !isStreaming
            ? "bg-muted/30 border-border/60"
            : "bg-transparent",
          "hover:border-border/60 hover:bg-muted/10"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Left: Text */}
        <div className="flex items-center gap-2 flex-1">
          {isStreaming ? (
            <TextShimmer className="text-sm flex-1">
              {getPillLabel()}
            </TextShimmer>
          ) : (
            <span className={cn(
              "text-sm flex-1",
              isExpanded ? "text-muted-foreground" : "text-foreground"
            )}>
              {getPillLabel()}
            </span>
          )}
        </div>

        {/* Right: Timer + Chevron */}
        <div className="flex items-center gap-2">
          {/* Timer shows during streaming AND when expanded */}
          {elapsedTime && (isStreaming || isExpanded) && (
            <span className={cn(
              "text-xs font-mono tabular-nums",
              isStreaming ? "text-orange-500" : "text-muted-foreground"
            )}>
              {elapsedTime}
            </span>
          )}

          <ChevronDown className={cn(
            "size-3.5 text-muted-foreground transition-transform duration-300",
            isExpanded && "rotate-180"
          )} />
        </div>
      </div>

      {/* Expanded content - FULL reasoning */}
      <div className={cn(
        "overflow-hidden transition-all duration-300",
        isExpanded ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0"
      )}>
        <div className={cn(
          "pt-3 px-4 pb-4",
          "rounded-md",
          "bg-muted/30",  // Lighter gray background (Claude style)
          "border border-border/40"
        )}>
          {reasoningSteps ? (
            <div className="space-y-3">
              {reasoningSteps.steps.map((step, index) => (
                <div key={index} className="space-y-2">
                  {/* Paragraphs */}
                  {step.items.map((item, itemIndex) => (
                    <p key={itemIndex} className="text-sm text-muted-foreground leading-relaxed">
                      {item}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No reasoning data available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
});
```

---

## Testing Checklist

### Streaming State
- [ ] Shows "Thinking..." initially
- [ ] Updates to status text as steps arrive ("Scrutinizing...", "Interrogated...")
- [ ] Timer counts up during streaming (orange color)
- [ ] Chevron points down

### Collapsed (After Streaming)
- [ ] Shows LAST status text (not "Thought for X")
- [ ] Timer hidden (or shows final time)
- [ ] Background is transparent
- [ ] Chevron points down

### Expanded (After Streaming)
- [ ] Label changes to "Thought process"
- [ ] Background lightens to `bg-muted/30`
- [ ] Timer shows final time (gray color)
- [ ] Shows FULL reasoning text (all paragraphs)
- [ ] Chevron points up

### Visual Polish
- [ ] Smooth 300ms transitions
- [ ] No layout shifts
- [ ] Colors match Claude (lighter gray when expanded)
- [ ] Typography is readable

---

## Timeline

| Task | Duration |
|------|----------|
| Update pill label logic | 30 min |
| Add background lightening | 15 min |
| Fix expanded view (show full reasoning) | 45 min |
| Update timer persistence | 15 min |
| Testing & refinement | 1 hour |
| **Total** | **~2.5 hours** |

---

**Status**: Ready for implementation
**Priority**: High (core UX feature)
