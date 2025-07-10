# AI Agent Guide - VANA Project

## ⚠️ IMPORTANT: Read This First

This guide helps AI coding agents navigate the VANA codebase and avoid common pitfalls.

## ✅ Authoritative Sources

### Core Implementation Files
- **Main Application**: `main.py`
- **VANA Agent**: `agents/vana/team.py`
- **Active Tools**: Files in `lib/_tools/` (see specific list below)
- **Shared Libraries**: `lib/_shared_libraries/`

### Active Tool Implementations (USE THESE)
- **Web Search**: `lib/_tools/web_search_sync.py` ONLY
- **File Operations**: `lib/_tools/adk_tools.py`
- **Task Analysis**: `lib/_tools/adk_analyze_task.py`
- **Agent Transfer**: `lib/_tools/adk_transfer_to_agent.py`

### Documentation (CURRENT)
- **Setup**: `README.md` (Note: Infrastructure % may be outdated)
- **Claude.md**: Configuration for Claude Code
- **API Docs**: `docs/api/`

## ❌ DO NOT USE These Files

### Deprecated Web Search Implementations
- `web_search_fixed.py`
- `web_search_no_defaults.py` 
- `fixed_web_search.py`
- `simple_web_search.py`
- `search_coordinator_fixed.py`

### Test Files (Not for Production)
- Any `test_*.py` files in root directory
- Files in `tests/one_time_tests/`
- Mock implementations (`mock_*.py`)

### Outdated Documentation
- `ARCHITECTURE_ANALYSIS.md`
- `VECTOR_SEARCH_ANALYSIS.md`
- Any `*_STRATEGY.md` files
- `blockers.md`, `status.md`

## 🎯 Current Project State

### Working Components
- ✅ Basic ADK integration
- ✅ Web search (via DuckDuckGo)
- ✅ File operations
- ✅ FastAPI backend
- ✅ Streaming API

### Known Issues
- ⚠️ Vector search not configured (requires Google Cloud)
- ⚠️ Only 2 of 6 specialist agents integrated
- ⚠️ Many tools need consolidation

### Environment
- **Python**: 3.13+ REQUIRED
- **Backend Port**: 8081
- **Frontend Port**: 5173
- **Model**: Gemini 2.0 Flash

## 📝 When Writing Code

1. **Always check imports** - Use only active implementations listed above
2. **Ignore test files** - Don't import from `test_*.py` files
3. **Use latest patterns** - Reference `main.py` and `agents/vana/team.py`
4. **No default parameters** - Gemini doesn't support them in function calls
5. **Check git status** - Many files may be untracked or modified

## 🔧 Common Tasks

### Adding a Tool
1. Create in `lib/_tools/`
2. Follow pattern from `web_search_sync.py`
3. No default parameters in function signature
4. Add to agent's tool list in `team.py`

### Debugging Issues
1. Check `backend_log.txt` for errors
2. Verify environment variables in `.env.local`
3. Ensure Python 3.13+ is being used
4. Check if service is running on correct port

---
Last Updated: July 10, 2025
Note: This is a living document. Update when major changes occur.