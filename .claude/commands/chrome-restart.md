---
description: Restart Chrome DevTools MCP cleanly
model: haiku
---

Perform a clean restart of Chrome DevTools MCP without killing other processes.

Execute:

```bash
chrome-mcp restart
```

Then verify:

```bash
chrome-mcp status
```

Report the outcome to the user including:
- Whether restart was successful
- New Chrome PID
- Port 9222 accessibility status
