# Technical Context - VANA Multi-Agent System

## ✅ CONFIRMED WORKING ENVIRONMENT

### Python Environment (WORKING)
- **Version**: Python 3.13.2 ✅
- **Location**: `/opt/homebrew/bin/python3.13` ✅
- **Command**: `/opt/homebrew/bin/python3.13 main.py` ✅
- **Poetry**: Available but has hanging issues ❌
- **Recommendation**: Use system Python directly ✅

### Google ADK Configuration (WORKING)
- **Version**: google-adk 1.1.1 ✅
- **Authentication**: Google API key (not Vertex AI) ✅
- **Model**: gemini-2.0-flash-exp ✅
- **Server**: FastAPI integration working ✅

### Working Directory Structure (CONFIRMED)
- **Primary**: `/Users/nick/Development/vana/` ✅
- **Agents**: `agents/vana/team.py` (minimal working) ✅
- **Tools**: `lib/_tools/` (13 files exist, imports disabled) ⚠️
- **Server**: `main.py` (FastAPI working) ✅
- **Environment**: `.env` (API key configured) ✅

### Current Dependencies (WORKING)
- **google-adk**: 1.1.1 ✅
- **fastapi**: 0.115.12 ✅
- **uvicorn**: 0.34.2 ✅
- **pydantic**: 2.11.5 ✅
- **python-dotenv**: For environment loading ✅

## ⚠️ KNOWN ISSUES & SOLUTIONS

### Poetry Environment Issues
- **Problem**: Poetry commands hang indefinitely
- **Root Cause**: Dependency conflicts or environment corruption
- **Solution**: Use system Python directly
- **Status**: Bypassed successfully ✅

### Tool Import Dependencies
- **Problem**: `vana_multi_agent.core.tool_standards` missing
- **Impact**: Advanced tools disabled
- **Solution**: Create replacement tool standards or fix imports
- **Status**: Planned for Phase 2 ⏳

### Agent Tool Complexity
- **Problem**: 24-agent complex structure causes import issues
- **Solution**: Simplified to minimal LlmAgent
- **Status**: Working baseline established ✅

## 🎯 TECHNICAL ROADMAP

### Phase 1: API Validation (CURRENT)
- Test session-based endpoints
- Debug `/run` endpoint 404
- Validate agent responses
- Confirm Google ADK integration

### Phase 2: Tool Restoration (NEXT)
- Incremental tool enabling
- Fix tool standards dependencies
- Restore agents-as-tools pattern
- Test all 42+ tools

### Phase 3: Production Readiness (FINAL)
- Performance optimization
- Error handling
- Cloud Run deployment
- Monitoring and logging

## 📊 DEPLOYMENT CONTEXT

### Local Development (CURRENT)
- **Server**: http://localhost:8080 ✅
- **Command**: `/opt/homebrew/bin/python3.13 main.py` ✅
- **Environment**: macOS with Homebrew Python ✅

### Production Target
- **Platform**: Google Cloud Run
- **URL**: https://vana-multi-agent-960076421399.us-central1.run.app
- **Status**: Needs sync with local fixes ⏳

### Testing Commands (WORKING)
- **Agent Discovery**: `curl http://localhost:8080/list-apps` ✅
- **Health Check**: `curl http://localhost:8080/health` ✅
- **Session Create**: `curl -X POST http://localhost:8080/apps/vana/users/test/sessions` ✅
