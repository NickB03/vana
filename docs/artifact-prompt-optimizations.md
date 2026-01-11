# Artifact Prompt Optimizations

**Date**: 2026-01-11
**Goal**: Optimize all artifact suggestions for maximum success with the artifact generation system

## Optimization Principles

Based on artifact system constraints:

1. **NO @/ imports** - Cannot use local components
2. **NO complex external libraries** - Avoid D3, Framer Motion (use CSS instead)
3. **Remove Radix UI when possible** - Use inline components for simple dialogs/selects
4. **ALWAYS include sample data** - Never show empty states
5. **Emphasize immutability** - Use .map()/.filter()/spread operators, never mutate arrays directly
6. **Simplify features** - Remove drag-and-drop, localStorage, complex state
7. **Use built-in tools** - Canvas API, CSS animations, CSS Grid, Tailwind

## Completed Optimizations (React Artifacts)

### ✅ 1. Frogger Game (game-1)
**Changes**:
- Removed Radix UI Dialog → simple overlay div
- Added explicit Canvas size (600x400px)
- Added sample data requirement (6 cars)
- Added immutability warning for cars array
- Specified exact game loop timing (60fps with setInterval)

### ✅ 3. Sales Dashboard (data-viz-1)
**Changes**:
- Removed Radix UI Popover → simple button toggle group
- Added explicit sample data (12 months x 2 years, 5 categories, 5 products)
- Added exact KPI values ($2.4M, +15.3%, etc.)
- Removed external dependencies warning
- Added immutability for data transformations

### ✅ 5. Todo List App (web-app-1)
**Changes**:
- Removed Radix UI Dialog → inline form
- Removed Radix UI Tabs → simple filter buttons
- Removed drag-and-drop (too complex)
- Removed due date picker (simplify)
- Added 5 sample tasks requirement
- Simplified to: add, complete, delete, filter, priority badges

###✅ 7. Snake Game (game-2)
**Changes**:
- Removed localStorage for high score
- Removed pause feature (simplify)
- Removed particle effects (too complex)
- Added explicit Canvas size (400x400px)
- Added immutability for snake array growth

### ✅ 9. Weather Dashboard (data-viz-2)
**Changes**:
- Removed lucide-react icons → Unicode symbols (☀️☁️🌧️)
- Added explicit 7-day sample data requirement
- Simplified UV gauge to radial progress (no complex gauge)
- Added data structure specification

### ✅ 12. Memory Match (game-3)
**Changes**:
- Removed Framer Motion → CSS rotateY transforms
- Removed Radix UI Select → simple difficulty buttons
- Added explicit card flip CSS animation
- Added immutability for cards array

### ✅ 17. Habit Tracker (data-viz-4)
**Changes**:
- Removed D3 completely → CSS Grid calendar
- Simplified heat map to CSS Grid with colored divs
- Added 30 days sample data requirement
- Added explicit data structure (completions object)

## Remaining React Artifacts to Optimize

### 11. Nutrition Tracker (web-app-2)
**Needed Changes**:
- ✅ Looks good - uses Recharts, no complex dependencies
- Minor: Add sample data requirement (meals, food database)
- Minor: Specify circular progress implementation (CSS or inline SVG)

### 13. Budget Tracker (web-app-3)
**Needed Changes**:
- Remove Radix UI Dialog → inline form
- Remove Radix UI Select → simple buttons/radio
- Simplify CSV export → just download data as JSON or simple CSV string
- Add sample transactions data

### 14. Stock Portfolio (data-viz-3)
**Needed Changes**:
- Remove Radix UI Tabs → simple button toggle
- Simplify real-time updates (just mock updates every 2s)
- Add sample stock data (5 stocks with price history)

### 15. Recipe Manager (web-app-4)
**Needed Changes**:
- Remove Radix UI Dialog → inline forms or simple modals
- Simplify timer to basic countdown
- Add sample recipes (3-5 recipes)
- Remove audio alerts (too complex)

### 16. Trivia Quiz (game-4)
**Needed Changes**:
- ✅ Looks mostly good
- Minor: Add 10 sample questions with answers
- Minor: Simplify share button (just copy score to clipboard)

### 18. Workout Logger (web-app-5)
**Needed Changes**:
- Remove Radix UI Tabs → simple buttons
- Remove Radix UI Dialog → inline forms
- Remove Framer Motion badges → CSS animations
- Simplify to basic workout logging, remove PR tracking
- Add sample exercises and workout data

### 19. Tic Tac Toe AI (game-5)
**Needed Changes**:
- Remove Radix UI Select → simple difficulty buttons
- Remove Framer Motion → CSS transforms
- ✅ Minimax AI is fine (good algorithm exercise)
- Add explicit board state management

### 20. Analytics Dashboard (data-viz-5)
**Needed Changes**:
- ✅ Looks good - uses Recharts
- Minor: Add sample analytics data
- Minor: Simplify funnel chart (regular bar chart is fine)
- Remove geographic heat map (too complex)

## HTML, Markdown, SVG, Code, Mermaid Artifacts

### HTML Artifacts (21-25)
**Status**: ✅ No changes needed - all use vanilla HTML/CSS/JS

### Markdown Artifacts (26-30)
**Status**: ✅ No changes needed - all are text-based

### SVG Artifacts (31-35)
**Status**: ✅ No changes needed - all use standard SVG

### Code Artifacts (36-40)
**Status**: ✅ No changes needed - language-specific code samples

### Mermaid Diagrams (41-45)
**Status**: ✅ No changes needed - standard Mermaid syntax

## Optimization Pattern Template

For remaining React artifacts, follow this pattern:

```
Build a React artifact using [specific libraries from npm]. NO local imports, NO @/ imports.
Context: [what it does]
Task: [main goal]
Sample Data: MUST include [specific data requirement] - never show empty states.

Features: [simplified feature list]
UI: [simplified UI without Radix components]
State: Use useState for [list state variables]
Immutability: CRITICAL - when updating [arrays/objects], use .map()/.filter()/spread, never mutate directly.

Styling: Tailwind CSS - [specific classes]
Keep it simple and working - no [complex features to avoid]
```

## Testing Checklist

After all optimizations:
- [ ] All React artifacts use only npm packages or inline code
- [ ] No Radix UI Dialogs/Selects (use inline/simple alternatives)
- [ ] No D3 (use CSS Grid/Recharts)
- [ ] No Framer Motion (use CSS animations)
- [ ] Every artifact has sample data specified
- [ ] Immutability emphasized in all state updates
- [ ] Simplified features (no drag-drop, no complex interactions)

## Next Steps

1. Complete remaining React artifact optimizations (11, 13-16, 18-20)
2. Test each optimized suggestion in the app
3. Verify artifacts generate successfully
4. Monitor success rate improvements
