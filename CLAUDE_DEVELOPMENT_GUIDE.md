# 📋 Claude Development Guide for VANA

## 🎯 Development Documentation Organization

When working on VANA, please follow these guidelines for creating development documentation:

### 📁 Use `.development/` Directory

All development artifacts, reports, and temporary documentation should be saved to the `.development/` directory, which is gitignored.

#### Directory Structure:
```
.development/
├── reports/         # Development reports (*_REPORT.md)
├── analysis/        # Analysis documents (*_ANALYSIS.md)
├── summaries/       # Summaries and status (*_SUMMARY.md, *_STATUS.md)
└── claude-artifacts/  # Other Claude-generated documentation
```

### 📝 File Naming Conventions

When creating development documentation:

1. **Reports**: `{TOPIC}_REPORT.md`
   - Example: `.development/reports/CLEANUP_REPORT.md`
   - Example: `.development/reports/SECURITY_AUDIT_REPORT.md`

2. **Analysis**: `{TOPIC}_ANALYSIS.md`
   - Example: `.development/analysis/ARCHITECTURE_ANALYSIS.md`
   - Example: `.development/analysis/PERFORMANCE_ANALYSIS.md`

3. **Summaries**: `{TOPIC}_SUMMARY.md` or `{TOPIC}_STATUS.md`
   - Example: `.development/summaries/SESSION_SUMMARY.md`
   - Example: `.development/summaries/DEPLOYMENT_STATUS.md`

4. **General Artifacts**: Use descriptive names
   - Example: `.development/claude-artifacts/implementation_notes.md`
   - Example: `.development/claude-artifacts/troubleshooting_guide.md`

### ✅ Benefits

- **No Repository Clutter**: All development docs are gitignored
- **Organized Structure**: Easy to find related documentation
- **Clear Separation**: Development artifacts vs. production docs
- **Local Reference**: Docs remain available locally for developers

### 🚫 What NOT to Put in `.development/`

Do NOT put these in `.development/`:
- Production documentation (use `docs/`)
- API references (use `docs/api/`)
- User guides (use `docs/user-guide/`)
- Permanent project documentation

### 💡 Examples

```bash
# Creating a cleanup report
Save to: .development/reports/CLEANUP_REPORT.md

# Creating an architecture analysis
Save to: .development/analysis/ARCHITECTURE_ANALYSIS.md

# Creating a session summary
Save to: .development/summaries/SESSION_SUMMARY.md

# Creating implementation notes
Save to: .development/claude-artifacts/redis_implementation_notes.md
```

### 🔧 Quick Reference for Claude

When asked to create documentation during development:
1. Determine the type (report, analysis, summary, or artifact)
2. Use the appropriate subdirectory in `.development/`
3. Follow the naming convention
4. The file will be automatically excluded from git

---

*This guide ensures consistent organization of development documentation while keeping the repository clean.*