# Artifact Sample Prompt Optimization v2.0

**Date**: 2025-11-08 (Updated)
**Goal**: Improve artifact sample prompts using structured prompt engineering methodology
**Approach**: Context → Task → Requirements → Output format

## Research Findings

### Prompt Engineering Best Practices (from Claude 4.x & Anthropic's methodology)

1. **Structured Format**: Use consistent section headers (Context | Task | Requirements | Output)
2. **XML Tags**: Claude is fine-tuned to pay special attention to XML-style structure
3. **Be Specific and Explicit**: Detailed, unambiguous instructions yield better results
4. **Provide Context**: Include the "why" - helps Claude make better decisions
5. **Define Requirements**: Clear constraints, features, libraries to use
6. **Specify Output**: Visual style, interactions, technical format
7. **Reference Libraries**: Explicit mentions guide proper imports (Radix UI, Recharts, D3, Framer Motion)

### Analysis of Claude.ai Artifact Examples

From the 60+ examples on Claude.ai's artifact gallery, successful prompts share these characteristics:

- **Specificity**: Describe exact functionality, not general concepts
- **Feature-Rich**: List 3-5 specific features users can interact with
- **Visually Descriptive**: Mention colors, animations, layouts, aesthetic themes
- **Interaction-Focused**: Describe how users will interact (click, hover, drag, keyboard)
- **Creative/Engaging**: Many examples are playful and visually interesting

### Our System Capabilities

**Artifact Types Supported:**
- Code (syntax highlighted)
- HTML (interactive with JS)
- React (components with Radix UI + Tailwind)
- SVG (vector graphics)
- Mermaid (diagrams)
- Markdown (formatted text)

**Available Libraries (27+ for HTML, 25+ for React):**
- **Charts**: D3, Chart.js, Recharts, Plotly
- **3D**: Three.js (r128)
- **Animation**: GSAP, Framer Motion, Anime.js
- **UI Components**: Radix UI primitives (Dialog, Dropdown, Popover, Tabs, etc.)
- **Styling**: Tailwind CSS (auto-loaded)

**Critical Restrictions:**
- ❌ Cannot use `@/components/ui/*` (local imports unavailable)
- ❌ Cannot use localStorage/sessionStorage
- ✅ Must use Radix UI primitives + Tailwind for React UI
- ✅ Only use approved CDN libraries

## Optimization Strategy v2.0: Structured Prompts

### The Structured Format

Based on Anthropic's methodology and Claude 4.x best practices, we use this template:

```
[Action verb] a [type] artifact.
Context: [Why/background/use case]
Task: [What to create specifically]
[Feature Category 1]: [Specific details]
[Feature Category 2]: [Specific details]
[Technology/Library]: [Which tools to use]
[Visual/Styling]: [Design specifications]
[Constraints]: [What NOT to do]
```

### Before vs After Comparison

**❌ Before (Iteration 1):**
```
"Build a React protein and nutrition tracker with meal logging, macro breakdown
(protein/carbs/fats) displayed in colorful progress rings, daily goal setting,
meal history with timestamps, searchable food database, and an animated progress
dashboard using Recharts for visualizing weekly protein intake trends"
```
Problems: Run-on sentence, features buried in commas, no clear structure

**✅ After (Iteration 2 - Structured):**
```
Build a React artifact.
Context: Fitness and nutrition tracking.
Task: Create a protein and nutrition tracker.
Core Features: Meal logging form, macro breakdown (protein/carbs/fats), daily goal
  setting, meal history with timestamps, searchable food database.
Visualizations: Colorful circular progress rings for each macro, Recharts line
  chart showing weekly protein intake trends.
State Management: React useState for in-memory data.
Styling: Clean card-based layout with Tailwind CSS, gradient accent colors.
Interactions: Smooth animations on progress updates, hover effects on meal entries.
```
Benefits: Clear sections, scannable structure, explicit library mentions, organized by concern

### Why This Works Better

1. **Claude's Training**: Fine-tuned to recognize structured sections and XML-like labels
2. **Cognitive Load**: Easier for AI to parse labeled sections than long prose
3. **Completeness**: Each section prompts consideration of that aspect
4. **Debugging**: When generation fails, easy to identify which section was unclear
5. **Consistency**: Same structure across all prompts creates predictable patterns

## Changes Made (v2.0 - Structured Format)

### Image Generation (5 prompts)

**Structure Applied:**
- Context: Art purpose/use case (fan art, game concept, product ad)
- Task: Main subject and action
- Elements/Setting: Scene components
- Style: Art style specification
- Colors: Color palette
- Quality/Mood: Technical details and atmosphere

**Example - Cyberpunk Cityscape:**
```
V1 (Basic): "Generate a cyberpunk cityscape at sunset with flying cars"

V2 (Structured):
"Generate an image.
Context: Concept art for cyberpunk game.
Task: Create a breathtaking city scene.
Time: Golden hour sunset.
Elements: Neon-lit skyscrapers, flying cars leaving light trails, holographic
  billboards, rain-slicked streets reflecting lights.
Colors: Purple and pink neon dominance.
Composition: Cinematic wide angle.
Mood: Dystopian but beautiful."
```

### Web Apps (5 prompts)

**Structure Applied:**
- Context: Application purpose
- Task: What to build
- Features: Core functionality list
- UI Components: Specific Radix UI components (Dialog, Tabs, Select, Popover)
- State Management: Explicit "React useState (no localStorage)"
- Visualizations: Chart library and types (Recharts specifically)
- Styling: Design aesthetic with Tailwind CSS
- Interactions: Animations and user feedback

**Example - Budget Tracker:**
```
V1 (Descriptive):
"Build a personal budget tracker with expense categories and spending insights"

V2 (Structured):
"Build a React artifact.
Context: Personal finance management.
Task: Create a budget tracking application.
Features: Expense entry form, categorized spending (food/transport/entertainment/bills),
  monthly budget limits, visual progress bars for each category, transaction
  history table with sort/filter.
UI Components: Radix UI Dialog for expense entry, Radix UI Select for categories.
Charts: Recharts pie chart showing spending breakdown.
Export: Generate CSV download of transactions.
Styling: Professional financial dashboard aesthetic with Tailwind CSS, green=under
  budget, red=over budget color coding."
```

**Critical Improvements:**
- ✅ Explicitly states "Radix UI Dialog" (prevents shadcn/ui mistakes)
- ✅ "React useState (no localStorage)" constraint clearly stated
- ✅ "Recharts" specified (not generic "charts")
- ✅ Features organized by category, not comma-separated list

### Data Visualization (5 prompts)

**Structure Applied:**
- Context: Dashboard purpose
- Task: Create visualization
- Library: Explicit "Recharts" or "D3" specification
- Charts: Numbered list of specific chart types
- Data: Mock data structure
- Interactions: Tooltips, filters, toggles
- Features: Additional capabilities
- Styling: Visual theme with Tailwind CSS

**Example - Habit Tracker:**
```
V1 (Feature list):
"Build a habit tracking dashboard with streaks visualization and progress stats"

V2 (Structured):
"Build a React artifact.
Context: Personal habit tracking.
Task: Create a habit visualization dashboard.
Libraries: D3 for heat map calendar, Recharts for other charts.
Visualizations: 1) GitHub-style contribution heat map showing daily habit completion
  using D3 (365 days, darker=more habits completed), 2) Radial bar charts (Recharts)
  showing completion rate for each habit, 3) Bar chart showing weekly consistency trends.
Features: Streak counter with fire emoji and animation when streak increases, habit
  checklist, completion celebration effects.
Stats: Total completions, longest streak, current streak cards with animated count-ups.
Styling: Motivational color scheme with Tailwind CSS."
```

**Critical Improvements:**
- ✅ "D3 for heat map, Recharts for other charts" - library roles clear
- ✅ Numbered visualizations list (easier to parse than commas)
- ✅ Separate Features vs Stats vs Styling sections

### Games (5 prompts)

**Structure Applied:**
- Context: Game type/genre
- Rendering: Canvas vs React components
- Controls: Exact keyboard/mouse inputs
- Game Mechanics: Rules and physics
- Collision: Detection logic
- Scoring: Point system
- Progression: Difficulty scaling
- Visual Style: Art direction
- UI: HUD elements and modals
- State: React useState specification

**Example - Tic Tac Toe:**
```
V1 (Feature list):
"Build a tic-tac-toe game with AI opponent and win detection"

V2 (Structured):
"Build a React artifact game.
Context: Tic-tac-toe with AI opponent.
Board: 3x3 grid.
Players: User chooses X or O, AI takes the other.
AI Logic: Implement minimax algorithm for unbeatable AI on 'Impossible' difficulty.
Difficulty: Radix UI Select with Easy (random moves), Medium (mix of smart/random),
  Impossible (minimax).
Animations: Scale effect on piece placement using Framer Motion, winning line
  highlight animation.
Win Detection: Check rows, columns, diagonals, detect draws.
Scoring: Track wins/losses/draws across multiple rounds displayed in score cards.
UI: Reset button, difficulty selector, celebration confetti on player win.
Styling: Modern board with gradient cells, smooth animations with Tailwind CSS."
```

**Critical Improvements:**
- ✅ "Rendering: HTML5 Canvas" makes tech choice explicit
- ✅ "Controls: Arrow keys" prevents ambiguity
- ✅ "State: React useState" prevents localStorage usage
- ✅ "Framer Motion" explicitly mentioned for animations

## Expected Improvements (v2.0 - Structured Approach)

### Quality Improvements
- ✅ **Structured parsing**: Claude can more easily extract requirements from labeled sections
- ✅ **Complete implementations**: Less likely to miss features when they're in dedicated sections
- ✅ **Correct libraries**: Explicit "Radix UI Dialog" prevents shadcn/ui imports
- ✅ **No localStorage**: "State: React useState (no localStorage)" prevents browser storage errors
- ✅ **Proper charts**: "Library: Recharts" or "Library: D3" guides correct tool selection

### User Experience Improvements
- ✅ **Concise summaries**: 10-15 words vs 30+ word run-on sentences
- ✅ **Scannable prompts**: Users can quickly understand what will be built
- ✅ **Predictable results**: Structured format creates consistent output quality
- ✅ **Fewer iterations**: Clear requirements reduce back-and-forth refinement

### Technical Improvements
- ✅ **Parsing efficiency**: Labeled sections easier for LLM to process than prose
- ✅ **Error prevention**: Constraints stated upfront (no localStorage, use Radix UI)
- ✅ **Library guidance**: Each technology explicitly named with usage context
- ✅ **Debugging**: If generation fails, can identify which section was ambiguous

### Prompt Engineering Benefits
- ✅ **Reproducible**: Same structure applied across all 20 prompts
- ✅ **Maintainable**: Easy to update specific sections without rewriting entire prompt
- ✅ **Scalable**: Template can be used for future prompt additions
- ✅ **Teachable**: Structure documents best practices for team

## Metrics to Track

After deployment, monitor:
- Artifact generation success rate (should increase)
- Import errors per artifact (should decrease)
- User regeneration requests (should decrease)
- Artifact visual quality ratings
- Time to complete artifact (may increase slightly due to complexity, but should be offset by fewer iterations)

## Future Optimizations

Consider adding:
1. **Category-specific templates**: Pre-built starter code for common patterns
2. **Prompt suggestions**: Auto-suggest improvements when users type basic prompts
3. **Example gallery**: Show actual generated artifacts from these prompts
4. **A/B testing**: Compare old vs new prompts to measure improvement
5. **User feedback**: Collect ratings on generated artifacts

## Files Modified

- `/src/pages/Home.tsx` (lines 451-596): Updated all 20 artifact suggestion prompts

## Testing Recommendations

1. ✅ **Visual Verification**: Check that carousel displays all prompts correctly
2. **Generation Testing**: Test each category with 1-2 sample prompts
   - Verify artifacts generate successfully
   - Check for import errors
   - Validate visual appearance
3. **Performance Testing**: Ensure longer prompts don't cause UI issues
4. **Mobile Testing**: Verify truncation works on mobile devices

## Rollback Plan

If issues arise:
```bash
git revert <commit-hash>
git push origin claude/optimize-artifact-sample-prompts-*
```

Original prompts are preserved in git history for comparison.

---

**Status**: ✅ Implementation Complete
**Next Steps**: Testing and monitoring in production
