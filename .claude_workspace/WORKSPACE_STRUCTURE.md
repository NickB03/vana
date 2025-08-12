# Claude Workspace Structure

## Active Working Directories

### `/active/`
Current tasks and work in progress. Files here should be:
- Actively being worked on
- Referenced in current session
- Deleted when task completes

### `/reports/`  
Recent implementation reports and work summaries:
- Keep only last 48 hours of reports
- Archive older reports to prevent context poisoning
- Current focus: Frontend PRD implementation

### `/planning/`
Active planning documents:
- Current: Frontend build planning
- Keep minimal active plans only

### `/archive/`
Historical files organized by date:
- Prevents context poisoning
- Maintains history without cluttering active work
- User cleared on 2025-08-11

## Context Management Rules

1. **Minimize Active Files**: Only keep files actively being referenced
2. **Archive Aggressively**: Move completed work to archive immediately  
3. **Clear Naming**: Use descriptive names with dates
4. **Regular Cleanup**: Run cleanup every 3-5 days
5. **No Duplicates**: Avoid multiple versions of same document

## Current Active Context

### Primary Focus
- Frontend PRD: `/docs/vana-frontend-prd-final.md` (in main repo)
- Test Suite: `/tests/frontend/` (in main repo)

### Key References
- Backend: `/app/server.py` - SSE endpoints
- Auth: `/app/auth/` - JWT implementation
- Models: `/app/models.py` - LiteLLM config

## Cleanup Schedule
- Last cleanup: 2025-08-11
- Next cleanup: 2025-08-14 (or when needed)