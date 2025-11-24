---
description: Restart Chrome DevTools MCP cleanly
model: haiku
---

Perform a clean restart of Chrome DevTools MCP without killing other processes.

Execute:

```bash
npx chrome-devtools-mcp restart
```

Then verify:

```bash
npx chrome-devtools-mcp status
```

Report the outcome to the user including:
- Whether restart was successful
- New Chrome PID
- Port 9222 accessibility status
