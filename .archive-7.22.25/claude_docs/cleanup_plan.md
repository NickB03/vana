# VANA Repository Cleanup Plan

## Issues Identified

### 1. Duplicate Library Structure
- `/lib/` directory exists at root level
- `/agents/vana/lib/` contains the same structure
- This duplication causes confusion and maintenance issues

### 2. Obsolete Deployment Files
- `cloudbuild.yaml` at root (old, should use deployment/cloudbuild-dev.yaml)
- `deploy.sh` at root (old, should use deployment/deploy-dev.sh)

### 3. Database Files
- `sessions.db` - SQLite database should be gitignored

### 4. Temporary Files in .claude_workspace
- Contains 40+ temporary analysis and debug files
- Should be cleaned periodically

### 5. Unnecessary Test Files
- Multiple test files that were created during debugging
- Some are duplicates or temporary versions

### 6. Missing .gitignore entries
- Need to add sessions.db and other runtime files

## Cleanup Actions

### Phase 1: Remove Duplicates
1. Remove duplicate lib structure in agents/vana/lib
2. Remove obsolete deployment files at root
3. Clean .claude_workspace temporary files

### Phase 2: Reorganize
1. Ensure all imports use the root lib/ directory
2. Update .gitignore to exclude runtime files
3. Remove temporary test files

### Phase 3: Verify
1. Test that imports still work
2. Verify deployment still functions
3. Document the cleaned structure