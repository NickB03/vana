# shadcn/ui v3.0 Implementation Guide

## Current Setup Status

### ✅ Completed
- shadcn/ui CLI v3.0 installed and tested
- MCP server configured and connected
- 20 existing components in `frontend/src/components/ui/`
- components.json properly configured with RSC support

### 📦 Installed Components
- avatar, badge, button, card, form, input, label
- progress, scroll-area, select, separator, sheet
- sidebar, skeleton, tabs, tooltip, dialog, alert
- dropdown-menu, icons

## New v3.0 Features Available

### 1. Namespaced Registry System
Components are now accessed with `@registry/name` format:
```bash
# Add components from shadcn registry
npx shadcn@latest add @shadcn/button
npx shadcn@latest add @shadcn/calendar

# Search available components
npx shadcn@latest search @shadcn
```

### 2. Component Discovery
```bash
# Search for specific components
npx shadcn@latest search @shadcn --limit 10

# View component details
npx shadcn@latest view @shadcn/button
```

### 3. Check for Updates
```bash
# Check if your components need updates
npx shadcn@latest diff button
```

## Usage Examples

### Adding New Components
```bash
# Navigate to frontend directory
cd frontend

# Add a single component
npx shadcn@latest add @shadcn/accordion

# Add multiple components
npx shadcn@latest add @shadcn/accordion @shadcn/toast

# Add with overwrite
npx shadcn@latest add @shadcn/button --overwrite
```

### Using Community Registries
```bash
# Example: Add from v0 registry
npx shadcn@latest add @v0/hero-section
```

### Project Information
```bash
# Get project configuration info
npx shadcn@latest info
```

## MCP Server Integration

The shadcn MCP server is configured and provides programmatic access to shadcn operations. Status:
- Server: `bunx @jpisnice/shadcn-ui-mcp-server`
- Status: ✓ Connected
- Location: Configured in `~/.claude.json`

## Best Practices

1. **Before Adding Components:**
   - Check if component already exists: `ls frontend/src/components/ui/`
   - Review component with `view` command first
   - Use `diff` to check for updates

2. **Component Management:**
   - Use `--overwrite` flag carefully to preserve customizations
   - Keep components.json in sync
   - Test after adding new components

3. **Performance Tips:**
   - CLI v3.0 has faster dependency resolution
   - Use search to find components quickly
   - Batch add multiple components in one command

## Common Commands Reference

```bash
# Initialize/reinitialize project
npx shadcn@latest init

# Add components
npx shadcn@latest add @shadcn/[component-name]

# Check for updates
npx shadcn@latest diff [component]

# Search registry
npx shadcn@latest search @shadcn

# View component before adding
npx shadcn@latest view @shadcn/[component]

# Get project info
npx shadcn@latest info
```

## Migration Notes

No breaking changes from previous versions. All existing components continue to work without modification.

## Resources

- [Official Changelog](https://ui.shadcn.com/docs/changelog)
- [Components Documentation](https://ui.shadcn.com/docs/components)
- [GitHub Repository](https://github.com/shadcn-ui/ui)