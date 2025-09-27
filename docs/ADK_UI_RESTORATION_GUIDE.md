# ADK UI Restoration Guide

## Problem Analysis

Your backend based on Google ADK's gemini-fullstack sample has been modified to serve only as an API backend, removing the ADK's built-in Web UI interface. The original Google ADK is designed to serve both UI and API endpoints through the same server.

## Root Cause

The issue stems from how the server is initialized in `app/server.py`:

### Current Implementation (API-only):
```python
# app/server.py lines 347-353
app: FastAPI = get_fast_api_app(
    agents_dir=AGENTS_DIR,
    web=True,  # This flag is set but UI routes aren't properly mounted
    artifact_service_uri=artifact_uri,
    allow_origins=allow_origins,
    session_service_uri=session_service_uri,
)
```

### Proper ADK Implementation:
The Google ADK provides two CLI commands:
- `adk web` - Starts server with Web UI
- `adk api_server` - Starts API-only server

## Solution Options

### Option 1: Use ADK CLI Commands (Recommended)

#### Quick Start:
```bash
# For Web UI + API (original ADK behavior)
./start_adk_server.sh

# Or manually:
source venv/bin/activate
python -m google.adk.cli web --port 8000 agents/
```

#### Using the restoration script:
```bash
# Web server with UI
python scripts/restore_adk_ui.py web

# API-only server
python scripts/restore_adk_ui.py api

# Current custom implementation
python scripts/restore_adk_ui.py custom
```

### Option 2: Fix Current Implementation

Modify `app/server.py` to properly integrate ADK UI routes:

```python
from google.adk.cli.fast_api import get_fast_api_app
from fastapi.staticfiles import StaticFiles

# Get the ADK app with web=True
app = get_fast_api_app(
    agents_dir=AGENTS_DIR,
    web=True,
    # ... other params
)

# The ADK should automatically mount UI routes when web=True
# Check if routes are properly registered:
# - "/" should serve the ADK UI
# - "/agents/*" should serve agent-specific UI
# - "/api/*" should serve API endpoints
```

### Option 3: Dual Server Setup

Run both servers on different ports:

```bash
# Terminal 1: ADK Web UI on port 8000
python -m google.adk.cli web --port 8000 agents/

# Terminal 2: Custom API on port 8001
python -m uvicorn app.server:app --port 8001
```

## Directory Structure Requirements

```
vana/
├── agents/                 # ADK agents directory
│   └── vana/              # Your agent
│       ├── __init__.py
│       └── agent.py       # Points to app.agent
├── app/
│   ├── server.py          # Current server implementation
│   └── agent.py           # Actual agent code
└── frontend/              # React frontend
```

## Testing the Restoration

### 1. Test ADK Web UI:
```bash
# Start with ADK web command
source venv/bin/activate
python -m google.adk.cli web --port 8000 agents/

# Visit these URLs:
# - http://localhost:8000/          # ADK main UI
# - http://localhost:8000/docs      # API documentation
# - http://localhost:8000/agents/vana  # Agent-specific UI
```

### 2. Test API Endpoints:
```bash
# Health check
curl http://localhost:8000/health

# Chat endpoint (after fixing session management)
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "session_id": "test_session_1234567890"}'
```

## Comparison with Original ADK Samples

### Google ADK gemini-fullstack Structure:
- Uses FastAPI with React frontend
- Serves both UI and API from same server
- Agent defined in `app/agent.py`
- UI served at root path `/`
- API endpoints under `/api/*`

### Your Current Implementation:
- Modified to API-only mode
- React frontend runs separately on port 3000
- Custom endpoints added for session management
- ADK UI routes not mounted

## Environment Variables Required

```bash
export GOOGLE_API_KEY="your-api-key"
export ENVIRONMENT="development"
export NODE_ENV="development"

# Optional for advanced features
export SESSION_INTEGRITY_KEY="your-key"
export JWT_SECRET_KEY="your-jwt-key"
export OPENROUTER_API_KEY="your-openrouter-key"
```

## Migration Path

### To restore full ADK functionality:

1. **Stop current servers**
2. **Use ADK CLI command**:
   ```bash
   python -m google.adk.cli web --port 8000 --reload agents/
   ```
3. **Update frontend** to use ADK endpoints if needed
4. **Test both UI and API** functionality

### To keep current architecture:

1. **Fix session management** issues (already done)
2. **Ensure API endpoints** work correctly
3. **Document the architectural** decision
4. **Consider adding ADK UI** on separate port for debugging

## Benefits of Restoration

### ADK Web UI Provides:
- Built-in chat interface for testing agents
- Session management UI
- Debug console for agent interactions
- Real-time streaming responses
- Agent configuration interface

### Current React Frontend Provides:
- Custom UI/UX design
- Tailored user experience
- Additional features beyond ADK

## Recommendation

For development and testing, use the ADK web UI alongside your React frontend:

```bash
# ADK UI for agent testing (port 8000)
python -m google.adk.cli web --port 8000 agents/

# React frontend (port 3000)
npm run dev
```

For production, decide whether to:
1. Use ADK as the primary backend with its UI
2. Keep current API-only backend with React frontend
3. Hybrid approach with both interfaces available

## Troubleshooting

### If ADK UI doesn't load:
1. Check `agents/` directory structure
2. Verify `agents/vana/agent.py` imports correctly
3. Ensure environment variables are set
4. Check for port conflicts

### If API endpoints fail:
1. Verify session store configuration
2. Check authentication middleware
3. Review CORS settings
4. Check error logs for details

## Additional Resources

- [Google ADK Documentation](https://developers.google.com/agent-development-kit)
- [ADK Samples Repository](https://github.com/google/adk-samples)
- [Agent Starter Pack](https://github.com/GoogleCloudPlatform/agent-starter-pack)