// Temporary debug version of SSE client to add visual debugging

export function debugSSEConnection() {
  // Create a debug panel
  const debugPanel = document.createElement('div');
  debugPanel.id = 'sse-debug-panel';
  debugPanel.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 400px;
    max-height: 300px;
    background: rgba(0, 0, 0, 0.9);
    color: #0f0;
    padding: 10px;
    font-family: monospace;
    font-size: 12px;
    overflow-y: auto;
    z-index: 9999;
    border: 1px solid #0f0;
    border-radius: 4px;
  `;
  debugPanel.innerHTML = '<div style="color: yellow; margin-bottom: 10px;">SSE Debug Panel</div>';
  document.body.appendChild(debugPanel);

  const log = (message: string, color: string = '#0f0') => {
    const entry = document.createElement('div');
    entry.style.color = color;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    debugPanel.appendChild(entry);
    debugPanel.scrollTop = debugPanel.scrollHeight;
  };

  // Override console.log temporarily to capture SSE logs
  const originalLog = console.log;
  console.log = (...args) => {
    originalLog(...args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    ).join(' ');
    
    if (message.includes('[SSE]') || message.includes('[SessionManager]') || message.includes('[ChatInterface]')) {
      log(message, message.includes('Error') ? '#f00' : '#0f0');
    }
  };

  // Also capture errors
  const originalError = console.error;
  console.error = (...args) => {
    originalError(...args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    ).join(' ');
    log(`ERROR: ${message}`, '#f00');
  };

  log('Debug panel initialized. Send a message to see SSE activity.', 'yellow');
  
  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'X';
  closeBtn.style.cssText = 'position: absolute; top: 5px; right: 5px; background: red; color: white; border: none; cursor: pointer;';
  closeBtn.onclick = () => {
    document.body.removeChild(debugPanel);
    console.log = originalLog;
    console.error = originalError;
  };
  debugPanel.appendChild(closeBtn);
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(debugSSEConnection, 1000);
  });
}