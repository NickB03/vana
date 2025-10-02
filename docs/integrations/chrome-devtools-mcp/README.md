# Chrome DevTools MCP Integration

## Overview

Chrome DevTools MCP is a Model-Context-Protocol (MCP) server that enables AI coding agents to control and inspect a live Chrome browser, providing reliable automation, in-depth debugging, and performance analysis capabilities.

**Repository**: https://github.com/ChromeDevTools/chrome-devtools-mcp

## Key Capabilities

### 1. Performance Insights
- Records browser traces
- Extracts actionable performance data
- Integrates with Chrome DevTools frontend

### 2. Browser Debugging
- Analyze network requests
- Capture screenshots
- Monitor browser console output

### 3. Browser Automation
- Uses Puppeteer for browser control
- Automatic waiting for action completion
- Reliable execution of browser operations

## Technical Requirements

- **Node.js**: Version 20 or latest LTS
- **Chrome**: Current stable version
- **Package Manager**: npm

## Installation

```bash
# Add to Claude Desktop or compatible MCP client
npx -y @executeautomation/chrome-devtools-mcp
```

## Configuration Options

| Option | Description | Example |
|--------|-------------|---------|
| `--headless` | Run browser without UI | `--headless` |
| `--executablePath` | Custom Chrome executable path | `--executablePath=/path/to/chrome` |
| `--channel` | Choose Chrome channel | `--channel=canary` (stable/beta/dev/canary) |
| `--viewport` | Set initial viewport size | `--viewport=1920x1080` |
| `--proxyServer` | Configure network proxy | `--proxyServer=proxy.example.com:8080` |

## Available Tools (26 Total)

### Input Automation (7 tools)
- Mouse clicks and movements
- Keyboard input
- Form interactions

### Navigation Automation (7 tools)
- Page navigation
- URL management
- Browser history control

### Emulation (3 tools)
- Device emulation
- Network conditions
- Geolocation

### Performance Analysis (3 tools)
- Trace recording
- Performance metrics
- Resource timing

### Network Inspection (2 tools)
- Request/response analysis
- Network timing data

### Debugging (4 tools)
- Console log access
- Screenshot capture
- DOM inspection
- Error tracking

## Security Considerations

⚠️ **Important Security Notice**:
- Exposes browser instance content to MCP clients
- Avoid sharing sensitive information
- Be cautious with cookies, session data, and credentials

## Data Management

- Automatically manages user data directory across browser instances
- Option to use isolated temporary directories for testing
- Persistent browser state between sessions

## Integration with Vana

### Potential Use Cases

1. **Web Research Automation**
   - Automated data collection from web sources
   - Screenshot capture for research documentation
   - Performance analysis of research targets

2. **Testing & QA**
   - Automated UI testing
   - Performance regression detection
   - Visual regression testing via screenshots

3. **Development Workflows**
   - Live debugging of web applications
   - Network request inspection
   - Browser console monitoring

### Example MCP Configuration

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "-y",
        "@executeautomation/chrome-devtools-mcp",
        "--viewport=1920x1080"
      ]
    }
  }
}
```

## Best Practices

1. **Use Headless Mode for CI/CD**
   - Faster execution
   - Lower resource usage
   - Better for automated workflows

2. **Viewport Configuration**
   - Set consistent viewport for reproducible results
   - Match target device dimensions

3. **Security**
   - Use isolated temporary directories for sensitive operations
   - Clear browser data after sensitive sessions
   - Avoid automation with authenticated sessions containing sensitive data

4. **Performance**
   - Use trace recording sparingly (resource intensive)
   - Clean up browser instances after use
   - Monitor memory usage with long-running sessions

## Comparison with Other Tools

| Feature | Chrome DevTools MCP | Puppeteer Direct | Selenium |
|---------|-------------------|------------------|----------|
| MCP Integration | ✅ Native | ❌ Manual | ❌ Manual |
| AI Agent Control | ✅ Built-in | ⚠️ Custom | ⚠️ Custom |
| Performance Tracing | ✅ Advanced | ⚠️ Basic | ❌ Limited |
| Setup Complexity | ✅ Simple | ⚠️ Moderate | ❌ Complex |

## Limitations

- Requires Chrome browser installation
- Resource intensive for long-running sessions
- Security concerns with sensitive data exposure
- Limited to Chrome/Chromium browsers

## Future Integration Ideas

1. **Research Pipeline Enhancement**
   - Integrate with Vana's web search agents
   - Automated data extraction workflows
   - Visual documentation generation

2. **Quality Assurance**
   - Automated testing of Vana frontend
   - Performance monitoring of SSE streams
   - Visual regression testing

3. **Development Tools**
   - Live debugging assistance
   - Network inspection for API development
   - Browser automation for testing

## Resources

- **GitHub Repository**: https://github.com/ChromeDevTools/chrome-devtools-mcp
- **MCP Documentation**: https://modelcontextprotocol.io
- **Puppeteer Docs**: https://pptr.dev
- **Chrome DevTools Protocol**: https://chromedevtools.github.io/devtools-protocol/

## Notes

- Part of the broader MCP ecosystem
- Maintained by Chrome DevTools team
- Actively developed and supported
- Production-ready for automation workflows
