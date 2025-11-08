# Artifact Sample Prompt Optimization

**Date**: 2025-11-08
**Goal**: Improve artifact sample prompts to generate higher-quality, visually appealing, error-free artifacts

## Research Findings

### Prompt Engineering Best Practices (from Claude 4.x documentation)

1. **Be Specific and Explicit**: Claude performs best when instructions are detailed and unambiguous
2. **Use XML-Structured Prompts**: Claude excels with well-structured prompts that separate components
3. **Provide Context**: Include the "why" and intended use case
4. **Specify Output Format**: Be clear about format, style, and features
5. **Reference Libraries**: Mention specific libraries when relevant (D3, Recharts, Three.js, etc.)

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

## Optimization Strategy

### Before: Vague, Basic Prompts

Example problems with original prompts:
- "Build a protein tracker web app" - Too vague, no features specified
- "Generate a cyberpunk cityscape" - Missing visual details, style, composition
- "Create a snake game" - No mention of controls, scoring, visual style

### After: Detailed, Feature-Rich Prompts

Each optimized prompt now includes:

1. **Artifact Type**: Explicitly mentions "React", "HTML5 Canvas", etc.
2. **Key Features**: Lists 5-8 specific features users can interact with
3. **Visual Design**: Describes colors, animations, layout, aesthetic theme
4. **Libraries**: Specifies which libraries to use (Recharts, D3, Framer Motion, etc.)
5. **Interaction Patterns**: Details controls (keyboard, mouse, touch)
6. **UI Components**: References Radix UI components where appropriate
7. **Technical Details**: Mentions specific chart types, animation effects, data handling

## Changes Made

### Image Generation (5 prompts)

Enhanced with:
- Art style specifications (pixel art, photorealistic, cinematic)
- Composition details (wide angle, rim lighting, color palette)
- Scene elements (background, lighting, mood)
- Technical quality markers (8K resolution, professional product photography)

**Example:**
```
Before: "Generate an image of Pikachu in a banana costume"
After: "Generate a vibrant pixel art style image of Pikachu wearing a banana costume, standing in a sunny tropical beach scene with palm trees and coconuts, retro 16-bit gaming aesthetic with bright yellow and orange color palette"
```

### Web Apps (5 prompts)

Enhanced with:
- Specific React component architecture
- Radix UI component mentions (Dialog, Popover, Tabs)
- Data visualization with Recharts
- Interaction patterns (drag-and-drop, filters, search)
- State management mentions (useState)
- Visual design (glassmorphism, dark mode, animations)

**Example:**
```
Before: "Build a protein tracker web app"
After: "Build a React protein and nutrition tracker with meal logging, macro breakdown (protein/carbs/fats) displayed in colorful progress rings, daily goal setting, meal history with timestamps, searchable food database, and an animated progress dashboard using Recharts for visualizing weekly protein intake trends"
```

### Data Visualization (5 prompts)

Enhanced with:
- Specific chart libraries (Recharts, D3)
- Chart types (line, area, pie, heat map, funnel, gauge)
- Interactive features (tooltips, filters, date range pickers)
- Visual design (gradients, color coding, animations)
- Data refresh patterns (real-time mock updates)
- Multiple visualization types per dashboard

**Example:**
```
Before: "Create an interactive sales dashboard with revenue trends and customer analytics"
After: "Create a React sales analytics dashboard using Recharts with a multi-line revenue trend chart (monthly/quarterly/yearly views), donut chart showing sales by category, bar chart for top performing products, key metrics cards with percentage changes, date range selector with Radix UI Popover, and smooth animations on data updates with gradient fills"
```

### Games (5 prompts)

Enhanced with:
- Specific game mechanics
- Control schemes (arrow keys, WASD, mouse, touch)
- Scoring systems and progression
- Visual style (pixel art, neon, gradient)
- Animation details (Framer Motion, Canvas animations)
- Game states (lives, levels, game over, restart)
- Win/lose conditions
- Celebration effects (confetti, animations)

**Example:**
```
Before: "Build a web-based Frogger game with arrow key controls"
After: "Build a React Frogger-style game using HTML5 Canvas with arrow key controls, animated traffic lanes with cars moving at different speeds, safe lily pads on water, collision detection, lives system with heart icons, score counter, progressive difficulty (faster cars each level), retro pixel art graphics, sound effect triggers, and a game over modal with restart button"
```

## Expected Improvements

### Quality Improvements
- ✅ More complete, functional artifacts on first generation
- ✅ Fewer missing features or placeholder implementations
- ✅ Better visual design and aesthetics
- ✅ Proper use of approved libraries (Radix UI, Recharts, etc.)
- ✅ Reduced import errors (no @/components/ui/* mistakes)

### User Experience Improvements
- ✅ Users see exactly what they can create before clicking
- ✅ Generated artifacts match user expectations
- ✅ Less need for follow-up refinement prompts
- ✅ More visually impressive showcase of capabilities

### Technical Improvements
- ✅ Prompts guide AI to use correct libraries
- ✅ Explicit mentions of Radix UI prevent shadcn/ui mistakes
- ✅ Recharts specifications ensure proper chart library usage
- ✅ Animation library mentions (Framer Motion, GSAP) trigger proper imports

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
