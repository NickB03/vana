# VANA - Multi-Agent AI System

[![Python 3.13+](https://img.shields.io/badge/python-3.13+-blue.svg)](https://www.python.org/downloads/)
[![Last Tested](https://img.shields.io/badge/last%20tested-2025--01--10-green.svg)]()
[![Server Port](https://img.shields.io/badge/port-8081-blue.svg)]()

> **Reality Check**: This documentation reflects what actually works as of 2025-01-10, not aspirational features.

## Quick Start

```bash
# Requirements: Python 3.13+ (MANDATORY)
poetry install
poetry run python main.py

# Test the API (runs on port 8081, not 8000!)
curl http://localhost:8081/health
# Returns: {"status": "healthy"}
```

## What Actually Works Today

### ✅ Core Features (Verified 2025-01-10)
- **FastAPI Server**: 3 working endpoints on port 8081
- **VANA Orchestrator**: 8 functional tools (see list below)
- **Web Search**: DuckDuckGo integration (no API key needed)
- **File Operations**: Read/write files locally
- **Basic Math**: Mathematical problem solving
- **Chat API**: OpenAI-compatible `/v1/chat/completions`

### ⚠️ Limited Functionality
- **Memory System**: In-memory fallback only (no persistence)
- **Code Execution**: Basic Python only, sandboxing disabled
- **Specialist Agents**: Only 2 of 6 are integrated

### ❌ Known Issues
- Import error in `search_coordinator.py:425` 
- Vector search not configured (requires Google Cloud)
- Many test files were cluttering root (now cleaned up)
- Documentation references non-existent validation reports

## Real Working Examples

### Basic Query
```bash
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{"input": "What time is it in Dallas?"}'
  
# Actual Response:
{
  "result": {
    "output": "It is 13:31 UTC. Dallas is in the Central Time Zone...",
    "id": "session_1752154273.057734"
  }
}
```

### Available Tools (From Code Analysis)
1. `web_search` - Web search via DuckDuckGo
2. `mathematical_solve` - Math problem solving  
3. `logical_analyze` - Logical reasoning
4. `read_file` - Read local files
5. `write_file` - Write local files
6. `analyze_task` - Task classification
7. `transfer_to_agent` - Agent delegation (limited)
8. `simple_execute_code` - Basic Python execution

## Setup Requirements

### Environment Variables
Create `.env.local`:
```bash
GOOGLE_API_KEY=your-key-here  # Required for Gemini model
```

### Python Version
```bash
python --version  # MUST show 3.13.x or higher
poetry env info   # Verify poetry is using Python 3.13+
```

## Project Structure (Actual)
```
vana/
├── main.py              # FastAPI server (PORT 8081!)
├── agents/
│   ├── vana/           # ✅ Working orchestrator
│   ├── code_execution/ # ⚠️ Disabled
│   └── data_science/   # ⚠️ Untested
├── lib/_tools/
│   └── web_search_sync.py  # ✅ The ONE web search to use
└── tests/              # Now properly organized
```

## For Developers

### Important Files
- **Use**: `lib/_tools/web_search_sync.py` for web search
- **Avoid**: Any other web search implementations (deprecated)
- **Main Agent**: `agents/vana/team.py`
- **API**: `main.py` (FastAPI on port 8081)

### Common Pitfalls
1. Documentation says port 8000, but it's actually 8081
2. Many features mentioned in docs don't exist yet
3. No default parameters in tool functions (Gemini limitation)
4. Vector search requires Google Cloud setup (not local)

## Contributing

Before adding features:
1. Test it actually works
2. Document the real behavior
3. Update this README with truthful information
4. Don't add aspirational features without marking them as "PLANNED"

---

*Last verified: 2025-01-10 | Version: 0.1.0 | [Full Status Report](./docs/status/CURRENT_STATUS.md)*