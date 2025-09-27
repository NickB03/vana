# Backend API Restoration Guide

## Issue Summary

The backend server based on Google ADK Sample Kit is currently only serving API endpoints and not the ADK UI interface. This is a result of architectural changes made to support a separate React frontend.

## Root Cause Analysis

### Original Google ADK Architecture
- The Google ADK `get_fast_api_app()` with `web=True` parameter is designed to serve both:
  - API endpoints for agent interactions
  - Web UI interface for direct agent interaction

### Current Implementation Issues
1. **API-Only Mode**: Backend configured as API server at lines 347-353 in `app/server.py`
2. **Session Management Errors**: Chat endpoint has broken session store calls
3. **Missing ADK UI Routes**: The ADK web interface routes are not accessible

## Identified Problems

### 1. Chat Endpoint Session Management (Fixed)
**Error**: `AttributeError: 'SessionStore' object has no attribute 'create_or_update_session'`
**Location**: `/app/server.py:694`
**Fix Applied**: Changed to use `ensure_session()` method

### 2. Backend Serving Mode
**Current State**: Backend serves only API endpoints
**Expected**: Backend should serve both API and ADK UI

## Solution Options

### Option 1: Restore Full ADK UI (Recommended for ADK Development)
```python
# In app/server.py, ensure web=True and proper agent directory
app: FastAPI = get_fast_api_app(
    agents_dir=AGENTS_DIR,  # Should point to agents/ directory
    web=True,                # Enable web UI
    artifact_service_uri=artifact_uri,
    allow_origins=allow_origins,
    session_service_uri=session_service_uri,
)
```

### Option 2: Dual Mode - API + ADK UI
Keep current API endpoints and add ADK UI on a different route prefix:
- `/api/*` - Custom API endpoints for React frontend
- `/agents/*` - ADK UI interface
- `/` - ADK default UI

### Option 3: API-Only Mode (Current State)
Continue with API-only backend and React frontend separation.
This requires:
- Fixing all API endpoint issues
- Ensuring proper CORS configuration
- Maintaining session management compatibility

## Quick Fixes Applied

1. **Session Management Fix**:
```python
# Fixed in /app/server.py line 694
session_store.ensure_session(
    session_id,
    user_id=current_user.id if current_user else None,
    title=message[:60] if message else "New Chat",
    status="active"
)
```

## Rollback Strategy

### To Restore Previous Working Version

1. **Identify Last Working Commit**:
```bash
# Last major working commit before changes
git checkout 4876bd83  # "fix: skip GCS credentials for local development"
```

2. **Create Backup Branch**:
```bash
git checkout -b backup/current-state
git checkout main
```

3. **Selective Rollback**:
```bash
# Rollback only server.py to previous version
git checkout 4876bd83 -- app/server.py
```

## Testing Commands

### Test API Endpoints
```bash
# Health check
curl http://localhost:8000/health

# Chat endpoint
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "session_id": "test_session_1234567890"}'

# FastAPI docs
curl http://localhost:8000/docs
```

### Test ADK UI (if restored)
```bash
# ADK default UI
curl http://localhost:8000/

# Agent endpoint
curl http://localhost:8000/agents/vana
```

## Environment Requirements

### Required Environment Variables
```bash
export GOOGLE_API_KEY="your-key"
export ENVIRONMENT="development"
export NODE_ENV="development"
```

### Python Dependencies
```bash
pip install google-generativeai
pip install google-adk
```

## Current Architecture

```
Frontend (React) :3000
    ↓
Backend (FastAPI) :8000
    ├── /api/* - Custom API endpoints
    ├── /health - Health check
    ├── /docs - FastAPI documentation
    └── /agents/* - ADK agents (currently not serving UI)
```

## Recommended Action

1. **For ADK Development**: Restore full ADK UI by ensuring `web=True` and proper routing
2. **For Production**: Fix all API endpoints and maintain separation
3. **For Testing**: Use dual mode to test both interfaces

## Monitoring

Check server logs for:
- `INFO:app.server:Chat endpoint called` - Chat requests
- `ERROR` - Any endpoint failures
- `WARNING:StatReload` - File change detections

## Related Files

- `/app/server.py` - Main server configuration
- `/app/agent.py` - ADK agent definition
- `/agents/vana/agent.py` - Agent wrapper for ADK discovery
- `/app/utils/session_store.py` - Session management