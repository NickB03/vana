# Chrome DevTools MCP - Quick Reference

## Quick Start

```bash
# Basic installation
npx -y chrome-devtools-mcp@latest

# With headless mode
npx -y chrome-devtools-mcp@latest --headless

# With Chrome Canary
npx -y chrome-devtools-mcp@latest --channel=canary

# Isolated mode (temporary user data)
npx -y chrome-devtools-mcp@latest --isolated
```

## Common MCP Tool Categories

### Input & Navigation (14 tools)
- Click elements
- Type text
- Navigate pages
- Go back/forward
- Reload pages

### Performance & Debugging (7 tools)
- Start/stop tracing
- Capture screenshots
- Check console logs
- Analyze network

### Emulation (3 tools)
- Device emulation
- Network throttling
- Geolocation mocking

## Configuration for Claude Code (.mcp.json)

Add to project `.mcp.json`:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"],
      "type": "stdio"
    }
  }
}
```

## Available CLI Options

| Option | Description | Example |
|--------|-------------|---------|
| `--headless` | Run without UI | `--headless` |
| `--executablePath` | Custom Chrome path | `--executablePath=/Applications/Chrome.app` |
| `--channel` | Chrome channel | `--channel=canary` (stable/beta/dev/canary) |
| `--isolated` | Temporary user data | `--isolated` |
| `--browserUrl` | Connect to running instance | `--browserUrl=http://127.0.0.1:9222` |
| `--logFile` | Debug log file | `--logFile=/tmp/chrome-mcp.log` |

## Common Use Cases

1. **Web Scraping**: Navigate + Extract + Screenshot
2. **Testing**: Automate UI + Check Console + Performance Trace
3. **Debugging**: Network Inspection + Console Logs + Screenshots
4. **Performance**: Trace Recording + Metrics Analysis

## Security Checklist

- [ ] Use `--headless` in production
- [ ] Avoid authenticated sessions with sensitive data
- [ ] Clear browser data after sensitive operations
- [ ] Use `--isolated` for temporary tests
- [ ] Review network proxy settings

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Chrome not found | Use `--executablePath=/path/to/chrome` |
| Port already in use | Use `--browserUrl` to connect to existing instance |
| Performance slow | Enable `--headless` mode |
| Debug issues | Use `--logFile=/tmp/log.txt` with `DEBUG=*` |

## Integration Points with Vana

- **Research Agents**: Web data collection automation
- **Testing**: Frontend E2E testing
- **Monitoring**: Performance analysis of SSE streams
- **Documentation**: Automated screenshot generation

## Reload VS Code After Configuration

After adding to `.mcp.json`:
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "Developer: Reload Window"
3. Check with `/mcp` command in Claude Code
