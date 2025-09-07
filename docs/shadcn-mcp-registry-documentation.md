# shadcn/ui MCP Server Registry Documentation

## Overview
The shadcn MCP (Model Context Protocol) server provides programmatic access to the shadcn/ui v4 component registry, blocks, and documentation. This allows AI agents and tools to explore, retrieve, and integrate shadcn/ui components directly.

## Available Components (46 Total)
- **Forms & Inputs**: form, input, input-otp, label, textarea, checkbox, radio-group, select, slider, switch, toggle, toggle-group
- **Layout**: accordion, aspect-ratio, card, collapsible, resizable, scroll-area, separator, tabs
- **Navigation**: breadcrumb, dropdown-menu, menubar, navigation-menu, pagination, sidebar
- **Overlays**: alert-dialog, dialog, drawer, hover-card, popover, sheet, tooltip, context-menu
- **Data Display**: avatar, badge, calendar, chart, progress, skeleton, table
- **Feedback**: alert, sonner
- **Actions**: button, command, carousel

## Available Blocks (55 Total)

### Calendar Blocks (32 variations)
- Simple calendar displays (calendar-01 to calendar-15)
- Advanced calendar features (calendar-16 to calendar-32)
- Features include: date selection, scheduling, event management, time zones

### Dashboard Blocks (1 complex block)
- **dashboard-01**: Complete dashboard layout with:
  - Charts and metrics visualization
  - Data tables
  - Navigation components
  - Responsive layout

### Login/Authentication Blocks (5 variations)
- **login-01 to login-05**: Authentication interfaces with:
  - Form validation
  - Social login options
  - Password recovery flows
  - Two-factor authentication

### Sidebar Navigation Blocks (16 variations)
- **sidebar-01 to sidebar-16**: Navigation sidebars with:
  - Collapsible menus
  - Icon navigation
  - Multi-level navigation
  - Responsive behavior

### Product/E-commerce Blocks (1 complex block)
- **products-01**: Product listing and management

## Registry Structure (v4)

```
apps/v4/registry/
├── __blocks__.json          # Block definitions
├── __index__.tsx            # Registry index
├── new-york-v4/            # New York theme (primary)
│   ├── blocks/             # UI blocks (complex components)
│   ├── charts/             # Chart components
│   ├── examples/           # Usage examples
│   ├── hooks/              # React hooks
│   ├── internal/           # Internal utilities
│   ├── lib/                # Library functions
│   └── ui/                 # Core UI components
├── registry-blocks.ts       # Block registry
├── registry-categories.ts   # Category definitions
├── registry-charts.ts       # Chart registry
├── registry-colors.ts       # Color schemes
├── registry-examples.ts     # Example registry
├── registry-hooks.ts        # Hook registry
├── registry-icons.ts        # Icon registry
├── registry-lib.ts          # Library registry
├── registry-themes.ts       # Theme definitions
└── registry-ui.ts           # UI component registry
```

## MCP Tool Functions

### Component Management
- `mcp__shadcn__list_components` - List all available components
- `mcp__shadcn__get_component` - Get component source code
- `mcp__shadcn__get_component_demo` - Get component demo/example
- `mcp__shadcn__get_component_metadata` - Get component metadata

### Block Management
- `mcp__shadcn__list_blocks` - List all blocks with categories
- `mcp__shadcn__get_block` - Get block source code (supports complex multi-file blocks)

### Registry Navigation
- `mcp__shadcn__get_directory_structure` - Explore registry file structure

## Key Features

### 1. Component Types
- **Simple Components**: Single-file components (buttons, inputs, etc.)
- **Complex Blocks**: Multi-file components with sub-components (dashboards, sidebars)

### 2. Theme Support
- New York theme (default v4 theme)
- Customizable color schemes
- Dark/light mode support

### 3. Integration Patterns
- Direct source code access
- Demo/example retrieval
- Metadata for proper integration
- Dependency information

## Usage Examples

### Get a Component
```javascript
// Get button component source
mcp__shadcn__get_component({ componentName: "button" })

// Get component demo
mcp__shadcn__get_component_demo({ componentName: "button" })
```

### Get a Block
```javascript
// Get dashboard block (complex, multi-file)
mcp__shadcn__get_block({ 
  blockName: "dashboard-01",
  includeComponents: true  // Include sub-components
})

// Get simple calendar block
mcp__shadcn__get_block({ blockName: "calendar-01" })
```

### List Available Resources
```javascript
// List all components
mcp__shadcn__list_components()

// List blocks by category
mcp__shadcn__list_blocks({ category: "dashboard" })
```

## Best Practices

1. **Check Available Components First**: Use `list_components` before attempting to get specific components
2. **Use Blocks for Complex UIs**: Blocks provide complete, production-ready UI sections
3. **Include Components for Blocks**: Set `includeComponents: true` for complex blocks to get all files
4. **Review Metadata**: Check component metadata for dependencies and requirements
5. **Test Integration**: Always test components after integration

## Component Categories

### Essential UI Components
- Forms and validation
- Navigation and menus
- Data display and tables
- Modals and overlays
- Charts and visualizations

### Complex UI Patterns
- Complete dashboards
- Authentication flows
- E-commerce interfaces
- Admin panels
- Calendar applications

## Integration with Projects

The shadcn MCP server integrates seamlessly with:
- Next.js applications
- React projects
- TypeScript codebases
- Tailwind CSS styling
- Radix UI primitives

## Notes

- All components are built with accessibility in mind
- Components follow WAI-ARIA guidelines
- Fully typed with TypeScript
- Styled with Tailwind CSS
- Built on Radix UI primitives
- Production-ready and tested