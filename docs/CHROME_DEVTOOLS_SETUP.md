# Chrome DevTools Setup Guide

## Quick Start

Chrome DevTools is now configured for debugging your Vana project. Here's how to use it:

## Available Debug Configurations

### 1. **Next.js: Chrome Debug**
   - Launches Chrome with DevTools enabled
   - Sets breakpoints directly in VS Code
   - Auto-opens DevTools on launch
   - Port: http://localhost:3000

### 2. **Next.js: Node Debug**
   - Debugs server-side Next.js code
   - Inspects API routes and SSR
   - Uses Node.js inspector

### 3. **Next.js: Full Stack Debug**
   - Combines Chrome and Node debugging
   - Launches dev server automatically
   - Debug both frontend and backend

### 4. **Attach to Chrome**
   - Connects to existing Chrome instance
   - Useful for debugging already-running apps
   - Requires Chrome launched with `--remote-debugging-port=9222`

## How to Start Debugging

### Method 1: VS Code Debug Panel
1. Open VS Code
2. Press `Cmd+Shift+D` (Mac) or `Ctrl+Shift+D` (Windows/Linux)
3. Select a configuration from the dropdown
4. Click the green play button or press `F5`

### Method 2: Full Stack Debugging
1. Select "Full Stack Debug (Client + Server)" from the dropdown
2. This launches both Chrome and Node debuggers simultaneously
3. Set breakpoints in both frontend and backend code

### Method 3: Manual Chrome Launch with DevTools
```bash
# Start your dev server
npm run dev

# For Chrome with remote debugging
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Then use "Attach to Chrome" configuration in VS Code
```

## Setting Breakpoints

### In VS Code:
- Click the red dot in the gutter next to any line number
- Use `debugger;` statements in your code
- Right-click → "Add Conditional Breakpoint" for advanced debugging

### In Chrome DevTools:
- Press `Cmd+P` (Mac) or `Ctrl+P` (Windows/Linux) to search files
- Click line numbers to set breakpoints
- Use the Sources panel for advanced debugging

## Chrome DevTools Features

### Network Panel
- Monitor API calls
- Check request/response headers
- Analyze loading performance

### Console
- Execute JavaScript in context
- View console.log outputs
- Access React DevTools

### Performance Panel
- Profile your application
- Identify performance bottlenecks
- Analyze rendering issues

### React DevTools
```bash
# Install React DevTools extension if not already installed
# Chrome Web Store: React Developer Tools
```

## Troubleshooting

### Issue: Breakpoints not working
**Solution**: Ensure source maps are enabled in your Next.js config:
```javascript
// next.config.js
module.exports = {
  productionBrowserSourceMaps: true,
  webpack: (config, { dev }) => {
    if (dev) {
      config.devtool = 'source-map'
    }
    return config
  }
}
```

### Issue: Chrome won't connect
**Solution**: Kill any existing Chrome processes and restart:
```bash
# Mac
killall "Google Chrome"

# Windows
taskkill /F /IM chrome.exe
```

### Issue: Port 9222 already in use
**Solution**: Use a different port:
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9223
```
Then update the port in `.vscode/launch.json`

## Advanced Tips

### Enable React Profiler
Add to your launch configuration:
```json
"env": {
  "REACT_APP_PROFILER": "true"
}
```

### Debug Production Builds
```bash
# Build with source maps
npm run build
NODE_OPTIONS='--inspect' npm start
```

### Use Chrome DevTools Protocol
For advanced debugging scenarios:
```javascript
// In your code
if (typeof window !== 'undefined' && window.chrome) {
  window.chrome.runtime.sendMessage('your-extension-id', {
    // Custom debugging data
  })
}
```

## Keyboard Shortcuts

### VS Code:
- `F5` - Start debugging
- `F9` - Toggle breakpoint
- `F10` - Step over
- `F11` - Step into
- `Shift+F11` - Step out
- `Shift+F5` - Stop debugging

### Chrome DevTools:
- `Cmd+Shift+C` - Inspect element
- `Cmd+Opt+I` - Open DevTools
- `Cmd+Opt+J` - Open console
- `Cmd+P` - Quick file search
- `Cmd+Shift+P` - Command palette

## Next Steps

1. Try setting a breakpoint in `frontend/pages/index.js`
2. Launch "Next.js: Chrome Debug" configuration
3. Refresh the page to hit your breakpoint
4. Explore the Chrome DevTools panels

Your Chrome DevTools is now fully configured and ready to use! 🚀