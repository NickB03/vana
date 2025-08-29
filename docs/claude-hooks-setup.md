# Claude Code Hooks Setup for shadcn UI

## Overview
Automated hooks to prevent manual UI component creation and enforce shadcn CLI usage in Claude Code.

## Files Created

### 1. Hook Scripts
- `/scripts/shadcn-validator.sh` - Simple validation script
- `/scripts/claude-hooks.sh` - Claude Code integration script

### 2. Configuration Files
- `/.claude-hooks.json` - Hook definitions and patterns
- `/.claude/settings.json` - Claude Code settings

## How Hooks Work

### Pre-Write Hook
**Triggers**: Before creating new files in `components/ui/`
**Action**: Blocks creation, suggests shadcn CLI command
**Bypass**: `export SHADCN_BYPASS=true`

### Pre-Edit Hook  
**Triggers**: Before editing files in `components/ui/`
**Action**: Allows editing, shows confirmation
**Bypass**: Not needed (edits always allowed)

## Activation Methods

### Method 1: Project-Level (Recommended)
The hooks are already configured in:
- `.claude-hooks.json` - Defines all hooks
- `.claude/settings.json` - Enables hooks

These will activate automatically when Claude Code operates in this project.

### Method 2: Global Claude Code Settings
Add to your Claude Code global settings:
```json
{
  "hooks": {
    "pre-write": {
      "command": "bash ${projectRoot}/scripts/claude-hooks.sh pre-write ${file}",
      "pattern": "**/components/ui/**",
      "blocking": true
    }
  }
}
```

### Method 3: Git Hooks
```bash
# Add to .git/hooks/pre-commit
#!/bin/bash
if [[ "$1" == *"components/ui"* ]]; then
  bash scripts/claude-hooks.sh pre-write "$1"
fi
```

## Testing Hooks

### Test Blocking (Should Fail)
```bash
# This should be blocked
bash scripts/claude-hooks.sh pre-write "frontend/src/components/ui/new.tsx"
# Output: ❌ BLOCKED: Use npx shadcn@latest add @shadcn/[component]
```

### Test Editing (Should Pass)
```bash
# This should be allowed
bash scripts/claude-hooks.sh pre-edit "frontend/src/components/ui/button.tsx"
# Output: ✅ Editing UI component
```

### Test Bypass
```bash
# With bypass enabled
export SHADCN_BYPASS=true
bash scripts/claude-hooks.sh pre-write "frontend/src/components/ui/new.tsx"
# Output: (no error, proceeds)
```

## Environment Variables

### `SHADCN_BYPASS`
- **Purpose**: Temporarily disable all blocking
- **Usage**: `export SHADCN_BYPASS=true`
- **Scope**: Current session only

### `SHADCN_SILENT`
- **Purpose**: Hide informational messages
- **Usage**: `export SHADCN_SILENT=true`
- **Scope**: Current session only

## Hook Behavior

### What Gets Blocked
- ❌ Creating NEW files in `components/ui/`
- ❌ Writing new UI components manually
- ❌ Copy-pasting component code

### What's Always Allowed
- ✅ Editing existing UI components
- ✅ Creating components outside `ui/` directory
- ✅ Extending components via imports
- ✅ All non-UI file operations

## Troubleshooting

### Hooks Not Running
1. Check scripts are executable:
   ```bash
   chmod +x scripts/claude-hooks.sh
   chmod +x scripts/shadcn-validator.sh
   ```

2. Verify hook configuration:
   ```bash
   cat .claude-hooks.json
   cat .claude/settings.json
   ```

### Too Restrictive
- Use bypass: `export SHADCN_BYPASS=true`
- Or disable in `.claude/settings.json`

### Not Blocking
- Check file patterns in `.claude-hooks.json`
- Ensure scripts return exit code 1 for blocking

## Integration with shadcn CLI

### Correct Workflow (Enforced by Hooks)
```bash
# 1. Search for component
npx shadcn@latest search @shadcn

# 2. View component details
npx shadcn@latest view @shadcn/accordion

# 3. Add component (ONLY way to add)
npx shadcn@latest add @shadcn/accordion

# 4. Edit component (allowed by hooks)
# Now you can edit frontend/src/components/ui/accordion.tsx
```

### Blocked Workflow (Prevented by Hooks)
```bash
# ❌ These will be blocked:
touch frontend/src/components/ui/custom.tsx  # Blocked
echo "..." > frontend/src/components/ui/new.tsx  # Blocked
# Manual component creation in editor  # Blocked
```

## Benefits

1. **Consistency**: All UI components use shadcn standards
2. **Updates**: Easy to update components via CLI
3. **Discovery**: Encourages using shadcn registry
4. **Quality**: Prevents copy-paste errors
5. **Learning**: Shows correct commands

## Quick Reference

```bash
# Check if hooks are working
bash scripts/claude-hooks.sh pre-write "components/ui/test.tsx"

# List installed components
ls frontend/src/components/ui/*.tsx

# Add new component (correct way)
npx shadcn@latest add @shadcn/[component]

# Temporarily disable hooks
export SHADCN_BYPASS=true

# Re-enable hooks
unset SHADCN_BYPASS
```

---

The hooks are now configured and will help ensure all UI components are added via the shadcn CLI, preventing manual creation issues.