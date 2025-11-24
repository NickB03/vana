---
description: Check Chrome DevTools MCP status and resource usage
model: haiku
---

Show comprehensive Chrome DevTools MCP status including processes, memory, and connections.

Execute these commands:

1. **Chrome MCP Status**:
```bash
npx chrome-devtools-mcp status
```

2. **MCP Process Count**:
```bash
echo "=== MCP Processes ==="
ps aux | grep chrome-devtools-mcp | grep -v grep | wc -l | xargs echo "Active MCP processes:"
```

3. **Chrome Process Info**:
```bash
echo "=== Chrome Debug Instance ==="
ps aux | grep "remote-debugging-port=9222" | grep -v grep | head -1 | awk '{print "PID:", $2, "- RAM:", $4"%", "- Started:", $9}'
```

4. **Port Status**:
```bash
echo "=== Port 9222 Status ==="
lsof -ti :9222 >/dev/null 2>&1 && echo "✅ Port 9222 is ACTIVE" || echo "❌ Port 9222 is CLOSED"
```

5. **Total Resource Usage**:
```bash
echo "=== Resource Usage ==="
ps aux | grep -E "(chrome-devtools-mcp|remote-debugging-port=9222)" | grep -v grep | awk '{sum+=$4} END {printf "Total Chrome MCP RAM: %.1f%%\n", sum}'
```

Report summary to the user in a clean format.
