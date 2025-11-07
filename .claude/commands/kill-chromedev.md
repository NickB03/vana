---
description: Kill all Chrome DevTools MCP processes and restart clean
model: haiku
---

Kill all Chrome DevTools MCP processes, Chrome debug instances, and restart with a clean state.

Execute these commands in sequence:

1. **Kill all chrome-devtools-mcp processes**:
```bash
pkill -f "chrome-devtools-mcp"
```

2. **Kill Chrome debug instance on port 9222**:
```bash
lsof -ti :9222 | xargs kill -9 2>/dev/null || true
```

3. **Clean up stale lock file**:
```bash
rm -f ~/.cache/chrome-mcp.lock
```

4. **Restart Chrome debug instance**:
```bash
chrome-mcp start
```

5. **Verify status**:
```bash
chrome-mcp status
ps aux | grep chrome-devtools-mcp | grep -v grep | wc -l | xargs echo "Active MCP processes:"
```

Report to the user:
- Number of processes killed
- Chrome restart status
- Current state (ready/not ready)
