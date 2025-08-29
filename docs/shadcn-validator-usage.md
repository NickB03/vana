# shadcn Validator Script Usage

## Overview
The `shadcn-validator.sh` script prevents manual UI component creation and enforces proper shadcn CLI usage.

## Features

### What It Does:
- **Blocks**: Creating NEW files in `components/ui/` directory
- **Allows**: Editing existing shadcn components
- **Allows**: All other file operations
- **Provides**: Bypass mechanism for exceptions

### What It Does NOT Block:
- ✅ Editing existing UI components
- ✅ Extending components in other directories
- ✅ Creating wrapper components outside `ui/`
- ✅ Any non-UI file operations

## Usage Options

### 1. Manual Validation (Current)
```bash
# Run manually before operations
bash scripts/shadcn-validator.sh [file] [action]

# Examples:
bash scripts/shadcn-validator.sh                              # General check
bash scripts/shadcn-validator.sh "components/ui/new.tsx" "create"  # Blocks
bash scripts/shadcn-validator.sh "src/app/page.tsx" "edit"    # Allows
```

### 2. Git Pre-Commit Hook (Optional)
```bash
# Add to git hooks
echo 'bash scripts/shadcn-validator.sh "$@"' >> .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### 3. Claude Code Hook (Not Configured)
Would need to be added to Claude Code settings to run automatically.

### 4. CI/CD Pipeline (Optional)
```yaml
# In GitHub Actions or similar
- name: Validate UI Components
  run: bash scripts/shadcn-validator.sh
```

## Bypass Mechanism

### Temporary Bypass:
```bash
# For single command
SHADCN_BYPASS=true bash scripts/shadcn-validator.sh

# For session
export SHADCN_BYPASS=true
bash scripts/shadcn-validator.sh  # Will be bypassed
```

### Silent Mode:
```bash
# Hide informational messages
export SHADCN_SILENT=true
```

## Exit Codes
- `0` - Operation allowed
- `1` - Operation blocked (manual UI creation detected)

## Examples

### Blocked Operation:
```bash
$ bash scripts/shadcn-validator.sh "components/ui/custom.tsx" "create"
🔍 shadcn Validator Active
❌ BLOCKED: Use npx shadcn@latest add @shadcn/[component]
💡 Bypass: export SHADCN_BYPASS=true
```

### Allowed Operation:
```bash
$ bash scripts/shadcn-validator.sh "src/app/page.tsx" "edit"
🔍 shadcn Validator Active
✅ Operation allowed
```

### With Bypass:
```bash
$ SHADCN_BYPASS=true bash scripts/shadcn-validator.sh "components/ui/test.tsx" "create"
🔓 Bypassed
```

## Integration Recommendations

1. **Development**: Run manually when needed
2. **Team Projects**: Add as git pre-commit hook
3. **CI/CD**: Include in build validation
4. **Claude Code**: Configure as pre-edit hook if issues persist

## When to Use Bypass

Use `SHADCN_BYPASS=true` only when:
- Extending an existing shadcn component with custom wrapper
- Creating test files for UI components
- Performing emergency fixes
- Working with non-standard component patterns

## Important Notes

- Script is **advisory** - not enforced unless configured as hook
- Allows all edits to existing components
- Only blocks NEW file creation in `components/ui/`
- Bypass is temporary per session/command

## Location
`/scripts/shadcn-validator.sh`