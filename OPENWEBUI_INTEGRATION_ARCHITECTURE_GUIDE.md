# OpenWebUI Integration Architecture Guide

**Date**: July 1, 2025  
**Purpose**: Comprehensive architectural guide to prevent future integration errors  
**Status**: Critical Reference Document  

## 🚨 CRITICAL ARCHITECTURAL REQUIREMENTS

### Google ADK Compliance is Mandatory

VANA is built on Google's Agent Development Kit (ADK). **ALL API integrations MUST follow ADK patterns** or they will fail with configuration errors.

#### ❌ WRONG: Custom FastAPI Setup
```python
# This approach will fail - DO NOT USE
app = FastAPI()
@app.post("/chat")
def chat(request):
    # Direct agent invocation
    agent = VanaOrchestrator()
    return agent.run(request)
```

#### ✅ CORRECT: ADK-Compliant API Server
```python
# This is the ONLY supported approach
import os
import uvicorn
from google.adk.cli.fast_api import get_fast_api_app

AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
SESSION_DB_URL = "sqlite:///./sessions.db"
ALLOWED_ORIGINS = ["http://localhost", "http://localhost:8080", "*"]

app = get_fast_api_app(
    agents_dir=AGENT_DIR,
    session_service_uri=SESSION_DB_URL,
    allow_origins=ALLOWED_ORIGINS,
    web=True,
)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
```

### ADK API Endpoints

Google ADK provides these standard endpoints (NOT OpenAI format):

- **Chat**: `/run_sse` (NOT `/v1/chat/completions`)
- **List Apps**: `/list-apps` 
- **Health**: `/health`
- **Web UI**: served automatically when `web=True`

## 🏗️ CORRECT INTEGRATION ARCHITECTURE

### Three-Layer Architecture

```
OpenWebUI → API Adapter → VANA (ADK API Server)
```

#### Layer 1: VANA (ADK API Server)
- **Technology**: Google ADK + FastAPI via `get_fast_api_app()`
- **Endpoints**: `/run_sse`, `/list-apps`, `/health`
- **Port**: 8080 (internal Docker network)
- **Purpose**: Serves VANA agents using ADK patterns

#### Layer 2: API Adapter (Translation Layer)
- **Technology**: FastAPI (custom)
- **Endpoints**: `/v1/chat/completions` (OpenAI-compatible)
- **Port**: 8080 (exposed to OpenWebUI)
- **Purpose**: Translates OpenAI format to ADK `/run_sse` format

#### Layer 3: OpenWebUI (Frontend)
- **Technology**: SvelteKit + Python backend
- **Configuration**: Points to API Adapter as OpenAI endpoint
- **Port**: 3000 (user interface)
- **Purpose**: Provides chat interface

## 📋 IMPLEMENTATION CHECKLIST

### Prerequisites
- [ ] Python 3.13+ (MANDATORY for VANA)
- [ ] Docker and Docker Compose running
- [ ] Google API key obtained
- [ ] VANA agents directory exists (`agents/`)

### Step 1: ADK-Compliant VANA Server

#### 1.1 Create Proper main.py
Replace current main.py with ADK-compliant version:

```python
import os
import uvicorn
from google.adk.cli.fast_api import get_fast_api_app

# Get the directory where main.py is located
AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
SESSION_DB_URL = "sqlite:///./sessions.db"
ALLOWED_ORIGINS = ["http://localhost", "http://localhost:8080", "*"]
SERVE_WEB_INTERFACE = True

app = get_fast_api_app(
    agents_dir=AGENT_DIR,
    session_service_uri=SESSION_DB_URL,
    allow_origins=ALLOWED_ORIGINS,
    web=SERVE_WEB_INTERFACE,
)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
```

#### 1.2 Create Environment Configuration
Create `.env.local` file:

```bash
# Core Configuration
GOOGLE_API_KEY=your_actual_google_api_key_here
GOOGLE_CLOUD_PROJECT=your-project-id
ENVIRONMENT=development
VANA_MODEL=gemini-2.0-flash
```

### Step 2: Update API Adapter

#### 2.1 Fix Endpoint URL
Update `vana-api-adapter/main.py`:

```python
# Change from /chat to ADK's standard endpoint
VANA_ORCHESTRATOR_URL = "http://vana-orchestrator-local:8080/run_sse"
```

#### 2.2 Update Request Format
ADK expects this format for `/run_sse`:

```python
vana_request = {
    "app_name": "vana",  # Agent app name
    "user_id": "user_123",
    "session_id": request.get("session_id", "default"),
    "new_message": {
        "role": "user",
        "parts": [{"text": user_prompt}]
    },
    "streaming": False
}
```

### Step 3: Docker Configuration

#### 3.1 Update docker-compose.local.yml
```yaml
services:
  vana-orchestrator:
    build:
      context: .
    container_name: vana-orchestrator-local
    ports:
      - "8081:8080"
    environment:
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT}
    restart: always

  vana-api-adapter:
    build:
      context: ./vana-api-adapter
    container_name: vana-api-adapter-local
    ports:
      - "8080:8080"
    depends_on:
      - vana-orchestrator
    environment:
      - VANA_ORCHESTRATOR_URL=http://vana-orchestrator-local:8080/run_sse

  open-webui:
    build:
      context: ./open-webui
    container_name: open-webui-local
    ports:
      - "3000:8080"
    depends_on:
      - vana-api-adapter
    environment:
      - OPENAI_API_BASE_URL=http://vana-api-adapter-local:8080/v1
      - OPENAI_API_KEY=dummy-key
```

## 🔧 TESTING PROCEDURES

### Test 1: ADK Server Direct
```bash
# Test VANA ADK server directly
curl -X GET http://localhost:8081/list-apps

# Test chat endpoint
curl -X POST http://localhost:8081/run_sse \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "vana",
    "user_id": "test_user",
    "session_id": "test_session",
    "new_message": {
      "role": "user",
      "parts": [{"text": "Hello, can you help me?"}]
    },
    "streaming": false
  }'
```

### Test 2: API Adapter
```bash
# Test OpenAI-compatible endpoint
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

### Test 3: Full Integration
1. Open http://localhost:3000 (OpenWebUI)
2. Configure API endpoint to http://localhost:8080/v1
3. Send test message
4. Verify response flows through all layers

## 🚫 COMMON MISTAKES TO AVOID

### 1. **Direct Agent Invocation**
Never try to import and run agents directly in web servers. Always use ADK's API patterns.

### 2. **Wrong Endpoint Formats**
- ADK uses `/run_sse`, not `/chat` or `/v1/chat/completions`
- ADK message format has `parts` array, not simple `content` string

### 3. **Missing Environment Variables**
ADK requires `GOOGLE_API_KEY` and other environment variables. Server will fail without them.

### 4. **Incorrect Docker Networking**
Container names must match the URLs used in service communication.

### 5. **Non-ADK FastAPI Setup**
Using plain FastAPI() instead of get_fast_api_app() breaks agent discovery and tool integration.

## 📊 TROUBLESHOOTING GUIDE

### Error: "GOOGLE_API_KEY not set"
**Solution**: Create `.env.local` with proper API key and ensure it's loaded in Docker

### Error: "Cannot connect to VANA server"
**Solutions**:
1. Verify VANA is using ADK's get_fast_api_app()
2. Check Docker container networking
3. Confirm port mappings in docker-compose.yml

### Error: "Agent not found"
**Solutions**:
1. Verify agents directory structure
2. Ensure agents_dir parameter points to correct path
3. Check agent.py files for proper ADK patterns

### Error: "Tool integration failed"
**Solutions**:
1. Use ADK's proper tool registration patterns
2. Verify ADK tool imports and configurations
3. Check tool dependencies and permissions

## 📚 REFERENCE DOCUMENTATION

### ADK Official Resources
- [ADK Documentation](https://github.com/google/adk-docs)
- [FastAPI Integration Guide](https://github.com/google/adk-docs/blob/main/docs/deploy/cloud-run.md)
- [API Server Setup](https://github.com/google/adk-docs/blob/main/docs/get-started/testing.md)

### Key ADK Patterns
- Always use `get_fast_api_app()` for API servers
- Agent directory structure must follow ADK conventions
- Environment variables are required for proper operation
- Use `/run_sse` endpoint for chat interactions

## 🎯 SUCCESS CRITERIA

### ✅ Architecture Compliance
- [ ] VANA uses ADK's get_fast_api_app()
- [ ] API adapter calls correct ADK endpoints
- [ ] Docker networking properly configured
- [ ] Environment variables set correctly

### ✅ Functional Testing
- [ ] VANA server starts without errors
- [ ] API adapter translates requests correctly
- [ ] OpenWebUI connects and receives responses
- [ ] Full chat workflow operational

### ✅ Production Readiness
- [ ] Error handling throughout the chain
- [ ] Proper logging and monitoring
- [ ] Security configurations in place
- [ ] Performance acceptable for intended use

---

**IMPORTANT**: This document represents the definitive architectural approach based on Google ADK documentation and sequential analysis. Future agents should follow this guide exactly to avoid the architectural errors that caused previous integration failures.
