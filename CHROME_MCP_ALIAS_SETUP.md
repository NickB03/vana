# Chrome MCP Shell Alias Setup

## Quick Setup

Add this alias to your shell profile for convenient Chrome MCP access:

### For zsh (macOS default):
```bash
echo 'alias chrome-mcp="npx chrome-devtools-mcp"' >> ~/.zshrc
source ~/.zshrc
```

### For bash:
```bash
echo 'alias chrome-mcp="npx chrome-devtools-mcp"' >> ~/.bashrc
source ~/.bashrc
```

## Verification

After adding the alias, you can use the original documented commands:

```bash
chrome-mcp start     # Start Chrome instance
chrome-mcp status    # Check status
chrome-mcp restart   # Restart cleanly
```

## Current Status

✅ **Fixed**: All command references updated in `.claude/commands/` and `AGENTS.md`  
✅ **Verified**: `npx chrome-devtools-mcp` works correctly  
✅ **Available**: 14 browser automation tools ready for use  
⚠️ **Known**: Commands timeout after 30s (normal behavior - requires manual termination)

## Usage Notes

- Chrome MCP server runs on stdio and requires manual termination (Ctrl+C)
- Commands will show "Chrome MCP Server running on stdio" message
- Use `pkill -f chrome-devtools-mcp` to force termination if needed
- All browser automation tools are available when server is running
