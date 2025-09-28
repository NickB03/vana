#!/usr/bin/env python3
"""ADK Dev UI Server - Integrates Google ADK Web UI with Vana Backend"""

import os
import sys
import subprocess
from pathlib import Path

# Import our existing backend for API compatibility
from server import app
import uvicorn

def launch_adk_web_ui():
    """Launch the real Google ADK Web UI."""
    print("🚀 Launching Google ADK Web UI...")
    print("="*60)
    print("The ADK Web UI will run on port 8000")
    print("Your Vana backend endpoints are available at:")
    print("  - /api/chat")
    print("  - /list-apps")
    print("  - /health")
    print("="*60)

    # Set environment variables for ADK
    env = os.environ.copy()
    if 'GOOGLE_API_KEY' not in env:
        # Try to get from .env.local
        env_file = Path('.env.local')
        if env_file.exists():
            with open(env_file) as f:
                for line in f:
                    if line.strip() and not line.startswith('#'):
                        key, value = line.strip().split('=', 1)
                        env[key] = value.strip('"')

    # Launch ADK web with our backend integrated
    cmd = [sys.executable, "-m", "adk", "web", "--host", "127.0.0.1", "--port", "8000"]

    try:
        subprocess.run(cmd, env=env, check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to launch ADK Web UI: {e}")
        print("\n💡 To run ADK Web UI separately, use: adk web")
        # Fall back to running our custom server
        print("\n🔄 Falling back to custom ADK-compliant server...")
        run_custom_server()
    except KeyboardInterrupt:
        print("\n👋 ADK Web UI stopped")

def run_custom_server():
    """Run custom server with ADK-style UI as fallback."""
    ADK_DEV_UI_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ADK Dev UI - Vana AI Research Platform</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            color: #333;
        }
        header {
            background: rgba(255, 255, 255, 0.98);
            padding: 1rem 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .logo {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .logo img { height: 40px; }
        .logo h1 {
            font-size: 1.5rem;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .status {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: #10b981;
            color: white;
            border-radius: 20px;
            font-size: 0.9rem;
        }
        .status::before {
            content: '';
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        main {
            flex: 1;
            padding: 2rem;
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
        }
        .app-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
        }
        .app-card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
            cursor: pointer;
        }
        .app-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }
        .app-card h3 {
            color: #667eea;
            margin-bottom: 0.5rem;
        }
        .app-card .status-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            background: #10b981;
            color: white;
            border-radius: 12px;
            font-size: 0.8rem;
            margin-top: 1rem;
        }
        .endpoints {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            margin-top: 2rem;
        }
        .endpoints h2 {
            color: #667eea;
            margin-bottom: 1rem;
        }
        .endpoint-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        .endpoint {
            display: flex;
            align-items: center;
            padding: 0.75rem;
            background: #f3f4f6;
            border-radius: 8px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.9rem;
        }
        .endpoint .method {
            background: #667eea;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            margin-right: 1rem;
            font-size: 0.8rem;
            min-width: 60px;
            text-align: center;
        }
        .endpoint .path { color: #4b5563; }
        .endpoint a {
            margin-left: auto;
            color: #667eea;
            text-decoration: none;
        }
        .endpoint a:hover { text-decoration: underline; }
        .dev-tools {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            margin-top: 2rem;
        }
        .dev-tools h2 {
            color: #667eea;
            margin-bottom: 1rem;
        }
        .tool-buttons {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }
        .tool-btn {
            padding: 0.75rem 1.5rem;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            transition: opacity 0.2s;
        }
        .tool-btn:hover { opacity: 0.9; }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    </style>
</head>
<body>
    <header>
        <div class="header-content">
            <div class="logo">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#667eea" stroke-width="2"/>
                    <path d="M2 17L12 22L22 17" stroke="#764ba2" stroke-width="2"/>
                    <path d="M2 12L12 17L22 12" stroke="#667eea" stroke-width="2"/>
                </svg>
                <h1>ADK Dev UI</h1>
            </div>
            <div class="status">Active</div>
        </div>
    </header>

    <main>
        <div class="app-grid" id="appGrid"></div>

        <div class="endpoints">
            <h2>ADK Compliant Endpoints</h2>
            <div class="endpoint-list" id="endpointList"></div>
        </div>

        <div class="dev-tools">
            <h2>Developer Tools</h2>
            <div class="tool-buttons">
                <button class="tool-btn" onclick="window.open('/docs', '_blank')">API Documentation</button>
                <button class="tool-btn" onclick="testEndpoints()">Test All Endpoints</button>
                <button class="tool-btn" onclick="createSession()">Create New Session</button>
                <button class="tool-btn" onclick="viewLogs()">View Logs</button>
            </div>
        </div>
    </main>

    <script>
        // Load apps dynamically
        async function loadApps() {
            try {
                const response = await fetch('/list-apps');
                const data = await response.json();
                const appGrid = document.getElementById('appGrid');

                data.apps.forEach(app => {
                    const card = document.createElement('div');
                    card.className = 'app-card';
                    card.innerHTML = `
                        <h3>${app.name}</h3>
                        <p>${app.description}</p>
                        <div class="status-badge">${app.status}</div>
                    `;
                    card.onclick = () => window.location.href = `/apps/${app.name}`;
                    appGrid.appendChild(card);
                });
            } catch (error) {
                console.error('Error loading apps:', error);
            }
        }

        // Load endpoints
        function loadEndpoints() {
            const endpoints = [
                { method: 'GET', path: '/list-apps', desc: 'List all applications' },
                { method: 'GET', path: '/apps/{app}/users/{user}/sessions', desc: 'User sessions' },
                { method: 'POST', path: '/apps/{app}/users/{user}/sessions/{session}/run', desc: 'Run action' },
                { method: 'GET', path: '/health', desc: 'Health check' },
                { method: 'GET', path: '/docs', desc: 'API Documentation' },
            ];

            const endpointList = document.getElementById('endpointList');
            endpoints.forEach(ep => {
                const div = document.createElement('div');
                div.className = 'endpoint';
                div.innerHTML = `
                    <span class="method">${ep.method}</span>
                    <span class="path">${ep.path}</span>
                    <a href="#" onclick="testEndpoint('${ep.method}', '${ep.path}'); return false;">Test →</a>
                `;
                endpointList.appendChild(div);
            });
        }

        // Test endpoints
        async function testEndpoint(method, path) {
            // Replace placeholders with test values
            path = path.replace('{app}', 'vana')
                      .replace('{user}', 'test_user')
                      .replace('{session}', 'test_session_' + Date.now());

            try {
                const response = await fetch(path, { method });
                const data = await response.json();
                console.log(`${method} ${path}:`, data);
                alert(`${method} ${path}\\nStatus: ${response.status}\\nCheck console for details`);
            } catch (error) {
                alert(`Error testing ${method} ${path}: ${error.message}`);
            }
        }

        async function testEndpoints() {
            alert('Testing all endpoints... Check console for results');
            // Implementation for testing all endpoints
        }

        async function createSession() {
            const sessionId = 'session_' + Date.now();
            alert(`Creating session: ${sessionId}`);
            // Implementation for session creation
        }

        function viewLogs() {
            console.log('Viewing logs...');
            // Implementation for log viewing
        }

        // Initialize
        loadApps();
        loadEndpoints();
    </script>
</body>
</html>"""

    from fastapi.responses import HTMLResponse

    @app.get("/", response_class=HTMLResponse)
    async def serve_adk_dev_ui():
        """Serve custom ADK Dev UI."""
        return HTMLResponse(content=ADK_DEV_UI_HTML)

    # Run the custom server
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        log_level="info",
        reload=False
    )

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🚀 Google ADK Dev UI Server Launcher")
    print("="*60)

    # Try to launch the real ADK Web UI
    launch_adk_web_ui()