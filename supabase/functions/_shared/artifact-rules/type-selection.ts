/**
 * Artifact Type Selection
 *
 * Classification matrix for choosing the correct artifact type.
 * Uses trigger words and negative constraints instead of decision trees
 * for better AI pattern matching.
 */

export const TYPE_SELECTION = `
## Artifact Type Selection

[HIGH - CHOOSING WRONG TYPE DEGRADES QUALITY]

Use this classification matrix to select the optimal artifact type.
Match trigger words in the request to the appropriate category.

### IMAGE (via generate-image API)

**Trigger Words:** realistic, photograph, photo, picture, portrait, landscape, artwork, illustration (detailed), movie poster, album cover, product photo, background, wallpaper

**Use For:**
- Photo-realistic images and photographs
- Complex artwork with lighting, shadows, depth
- Detailed illustrations requiring realistic rendering
- Product photography and portraits
- Backgrounds and wallpapers with realistic elements

**NOT For:**
- Logos, icons, simple graphics (use SVG)
- Diagrams, flowcharts, sequences (use MERMAID)
- Interactive visualizations (use REACT)
- Simple flat designs (use SVG)

### SVG (Scalable Vector Graphics)

**Trigger Words:** logo, icon, badge, emblem, vector, flat design, simple graphic, geometric, minimalist, line art

**Use For:**
- Logos and brand marks
- Icons and badges
- Simple illustrations with clean lines
- Flat design and geometric shapes
- Minimalist graphics and line art

**NOT For:**
- Photo-realistic content (use IMAGE)
- Complex detailed artwork (use IMAGE)
- Flowcharts and diagrams (use MERMAID)
- Interactive graphics (use REACT with SVG)

**CRITICAL:** SVG tags MUST have \`viewBox="0 0 width height"\` OR explicit width/height attributes

### MERMAID (Diagrams)

**Trigger Words:** flowchart, diagram, sequence, timeline, process flow, system architecture, state diagram, entity relationship, class diagram, gantt chart

**Use For:**
- Flowcharts and process diagrams
- Sequence diagrams and timelines
- System architecture visualizations
- State machines and decision trees
- Entity-relationship diagrams
- Class diagrams (UML)
- Gantt charts and timelines

**NOT For:**
- Custom interactive visualizations (use REACT with Recharts/D3)
- Simple geometric graphics (use SVG)
- Complex custom diagrams (use REACT with custom rendering)

### REACT (Interactive Applications)

**Trigger Words:** app, tool, calculator, tracker, dashboard, game, interactive, form (complex), widget, component

**Indicators:**
- User input and interaction required
- State management needed (3+ useState or useEffect)
- Multiple components working together
- Data updates and real-time changes
- Complex user workflows

**Use For:**
- Interactive applications (todo apps, trackers, calculators)
- Dashboards with data visualization
- Games and interactive experiences
- Complex forms with validation
- Tools requiring state management
- Multi-step workflows

**NOT For:**
- Static content (use HTML)
- Simple forms with 1-2 inputs (use HTML)
- Pure presentation (use HTML)

### HTML (Static Content)

**Trigger Words:** landing page, website, page, static, presentation, portfolio, marketing site, simple form

**Indicators:**
- Primarily presentational content
- No complex state management (0-2 simple event handlers)
- Static or minimal interactivity
- Simple forms without complex validation

**Use For:**
- Landing pages and marketing sites
- Static websites and portfolios
- Presentation content
- Simple forms (contact forms, newsletters)
- Single-page sites without complex state

**NOT For:**
- Apps requiring state management (use REACT)
- Interactive tools (use REACT)
- Complex user workflows (use REACT)

### CODE (Code Snippets)

**Trigger Words:** function, algorithm, script, code example, implementation, snippet

**Use For:**
- Programming examples in any language
- Algorithms and data structures
- Utility functions and scripts
- Code documentation

**Requires:** \`language\` attribute (e.g., \`language="python"\`)

### MARKDOWN (Documents)

**Trigger Words:** document, guide, documentation, tutorial, article, notes, reference

**Use For:**
- Text documents with formatting
- Guides and tutorials
- Documentation and articles
- Structured reference material
- Notes and outlines

**NOT For:**
- Short creative writing (keep inline in chat)
- Simple lists (keep inline in chat)

## Quick Reference: State Complexity Guide

**No state at all:**
→ HTML (pure presentation)

**Simple state (1-2 variables, simple event handlers):**
→ HTML with \`<script>\` tag
→ Example: Click counter, show/hide toggle

**Complex state (3+ useState, useEffect, or data synchronization):**
→ REACT component
→ Example: Todo app, dashboard, game

**When in doubt:**
- Simple and static? → HTML
- Interactive and stateful? → REACT
- Visual and geometric? → SVG
- Diagram or flowchart? → MERMAID
- Photo-realistic? → IMAGE
`;
