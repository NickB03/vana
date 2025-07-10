# Web Search Implementation Guide

## Current Active Implementation
Use only: `web_search_sync.py` - Synchronous implementation for ADK compatibility

## Deprecated Implementations (DO NOT USE)
- web_search_fixed.py - Old fix attempt
- web_search_no_defaults.py - Intermediate fix
- fixed_web_search.py - Another old fix
- simple_web_search.py - Fallback implementation
- mock_web_search.py - Moved to tests/mocks/
- search_coordinator_fixed.py - Old coordinator fix

## For AI Agents
When implementing web search functionality, ONLY import from:
```python
from lib._tools.web_search_sync import create_web_search_sync_tool
```
