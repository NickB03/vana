# VANA Workspace Cleanup Plan
**Date**: January 21, 2025  
**Following**: CLAUDE.md workspace rules

## 🎯 Files to Review for Cleanup

### 1. Documentation Directory (`/docs`)
These files appear to be temporary analysis/reports that should be in `.claude_workspace/`:

```bash
# Potentially temporary files in /docs:
/docs/current-agent-architecture.md  # Analysis document with mermaid diagram
/docs/PHASE1_COMPLETION.md          # Phase completion report
```

**Recommendation**: 
- If these are temporary analysis → Move to `.claude_workspace/`
- If these are permanent project docs → Keep in `/docs`

### 2. Development Analysis Directory (`.development/analysis/`)
These Python files appear to be proposals/analysis scripts:

```bash
# Analysis/proposal scripts:
/.development/analysis/adk_a2a_integration_proposal.py
/.development/analysis/vana_adk_tool_enhancements.py
```

**Recommendation**: Move to `.claude_workspace/` as they appear to be temporary analysis work

## ✅ Files Correctly Placed

### Legitimate Project Files (Keep in Place)
- `/INITIAL.md` - User-created feature request (VALID in root)
- `/PRPs/*.md` - Project planning documents (VALID)
- `.development/adk-crash-course/` - ADK reference materials (VALID)
- `.development/adk-knowledge-base/` - Knowledge base (VALID)
- All source code in `/lib/`, `/agents/`, `/tests/`
- All config files in root

### Already in Workspace
- 43 files already correctly in `.claude_workspace/`
- All properly gitignored

## 🧹 Cleanup Commands

If you want to proceed with cleanup:

```bash
# 1. Move potential temporary docs to workspace
mkdir -p .claude_workspace/docs_archive
mv /docs/current-agent-architecture.md .claude_workspace/docs_archive/
mv /docs/PHASE1_COMPLETION.md .claude_workspace/docs_archive/

# 2. Move analysis scripts to workspace
mkdir -p .claude_workspace/development_analysis
mv .development/analysis/adk_a2a_integration_proposal.py .claude_workspace/development_analysis/
mv .development/analysis/vana_adk_tool_enhancements.py .claude_workspace/development_analysis/
```

## 📋 Summary

- **Total files needing review**: 4
- **Already compliant**: 95% of project
- **Main issue**: Unclear if some docs are permanent or temporary

**Note**: Before moving files, confirm whether the `/docs` files are intended as permanent project documentation or temporary analysis.