# Aceternity UI Registry Integration with shadcn MCP

## Overview
Aceternity UI is a premium component library that extends shadcn/ui with advanced animated and interactive components. It uses the same CLI structure as shadcn but with its own registry endpoint.

## Registry Structure

### Base Registry URL
```
https://ui.aceternity.com/registry/{component-name}.json
```

### Registry Configuration
Add to `components.json`:
```json
{
  "registries": {
    "@aceternity": "https://ui.aceternity.com/registry/{name}.json"
  }
}
```

## Component Schema
Each Aceternity component follows this JSON structure:
```json
{
  "name": "component-name",
  "type": "registry:ui",
  "dependencies": ["package-dependencies"],
  "files": [
    {
      "path": "components/ui/component.tsx",
      "content": "// Component source code",
      "type": "registry:ui",
      "target": "deployment/path"
    }
  ],
  "author": "contact@aceternity.com",
  "title": "Human Readable Component Name"
}
```

## Available Components Categories

### 1. Backgrounds & Effects (22 components)
- sparkles
- background-gradient
- gradient-animation
- wavy-background
- background-boxes
- background-beams
- background-beams-with-collision
- background-lines
- aurora-background
- meteors
- glowing-stars
- shooting-stars
- vortex
- spotlight
- canvas-reveal-effect
- svg-mask-effect
- tracing-beam
- lamp-effect
- background-ripple-effect
- grid-and-dot-backgrounds
- glowing-effect
- google-gemini-effect

### 2. Card Components (14 components)
- pixelated-canvas
- 3d-card-effect
- evervault-card
- card-stack
- card-hover-effect
- wobble-card
- expandable-card
- card-spotlight
- focus-cards
- infinite-moving-cards
- draggable-card
- comet-card
- glare-card
- direction-aware-hover

### 3. Text & Typography
- text-generate-effect
- typewriter-effect
- text-reveal-card
- animated-text
- sparkles-text
- moving-border-text

### 4. Navigation & Layout
- floating-navbar
- navbar-menu
- sidebar
- bento-grid
- sticky-scroll-reveal
- tabs

### 5. Interactive Elements
- animated-button
- moving-border-button
- shimmer-button
- tailwindcss-buttons
- multi-step-loader
- animated-pin
- link-preview
- hover-border-gradient

### 6. Forms & Inputs
- input-fields
- placeholders-and-vanish-input
- signup-form-demo

### 7. Scroll & Parallax Effects
- parallax-scroll
- infinite-scroll
- scroll-based-velocity
- container-scroll-animation

### 8. Hero & Feature Sections
- hero-parallax
- hero-highlight
- features-section-demo-1
- features-section-demo-2
- features-section-demo-3

### 9. 3D & Advanced Effects
- 3d-pin
- globe
- floating-elements
- lens-effect
- macbook-scroll

## CLI Installation Commands

### Using shadcn CLI (v3.0+)
```bash
# Add a specific component
npx shadcn@latest add https://ui.aceternity.com/registry/bento-grid.json

# With namespace
npx shadcn@latest add @aceternity/bento-grid
```

### Direct NPM Package
```bash
npm i aceternity-ui
```

## Integration Proposal for shadcn MCP

### 1. Add Aceternity Registry Support
Extend the shadcn MCP server to support Aceternity registry endpoints:

```typescript
// New MCP tool functions to add
interface AceternityMCPTools {
  // List all Aceternity components
  'mcp__aceternity__list_components': () => ComponentList;
  
  // Get specific component
  'mcp__aceternity__get_component': (name: string) => ComponentData;
  
  // Get component demo/preview
  'mcp__aceternity__get_component_demo': (name: string) => DemoData;
  
  // Search components by category
  'mcp__aceternity__search_components': (category: string) => ComponentList;
}
```

### 2. Registry Endpoint Mapping
```typescript
const ACETERNITY_REGISTRY = {
  base: 'https://ui.aceternity.com/registry',
  components: '/[component].json',
  categories: {
    backgrounds: ['sparkles', 'aurora-background', ...],
    cards: ['3d-card-effect', 'wobble-card', ...],
    text: ['text-generate-effect', 'typewriter-effect', ...],
    // ... more categories
  }
};
```

### 3. Component Fetching Logic
```typescript
async function fetchAceternityComponent(name: string) {
  const url = `${ACETERNITY_REGISTRY.base}/${name}.json`;
  const response = await fetch(url);
  return response.json();
}
```

### 4. Integration Benefits
- **Unified Interface**: Access both shadcn and Aceternity components through one MCP server
- **AI-Friendly**: Allow AI agents to discover and use premium animated components
- **Consistent API**: Same tool patterns as existing shadcn MCP tools
- **Extended Capabilities**: Add 50+ animated and interactive components to the available library

## Implementation Steps

1. **Extend MCP Server Schema**
   - Add Aceternity registry configuration
   - Define new tool functions
   - Map component categories

2. **Create Registry Adapter**
   - Fetch component definitions from Aceternity registry
   - Transform to shadcn MCP format if needed
   - Handle authentication for premium components

3. **Add Discovery Features**
   - List available Aceternity components
   - Search by category or feature
   - Preview component demos

4. **Testing & Validation**
   - Test component fetching
   - Validate JSON schema compatibility
   - Ensure proper error handling

## Usage Example

```javascript
// After integration, AI agents could:

// List all Aceternity animated backgrounds
mcp__aceternity__search_components({ category: "backgrounds" })

// Get the Aurora Background component
mcp__aceternity__get_component({ name: "aurora-background" })

// Get demo code for 3D card effect
mcp__aceternity__get_component_demo({ name: "3d-card-effect" })
```

## Notes

- Aceternity UI requires a license for commercial use
- Components are built on top of Framer Motion and require additional dependencies
- Full TypeScript support with proper typing
- Dark mode compatible
- Responsive by default
- Accessibility considerations included

## Registry Endpoints Reference

Common component endpoints:
- Bento Grid: `https://ui.aceternity.com/registry/bento-grid.json`
- Aurora Background: `https://ui.aceternity.com/registry/aurora-background.json`
- 3D Card: `https://ui.aceternity.com/registry/3d-card-effect.json`
- Text Generate: `https://ui.aceternity.com/registry/text-generate-effect.json`
- Infinite Moving Cards: `https://ui.aceternity.com/registry/infinite-moving-cards.json`