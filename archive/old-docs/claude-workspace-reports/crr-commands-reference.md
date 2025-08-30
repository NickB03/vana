# CodeRabbit Review (/crr) Commands - Quick Reference

## 🐰 Available Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/crr` | Apply suggestions from current PR | Auto-detects PR from branch |
| `/crr 123` | Apply suggestions from PR #123 | Specify PR number |
| `/crr list` | List recent PRs | Shows last 10 PRs |
| `/crr review` | Request CodeRabbit review | Posts @coderabbitai review |
| `/crr status` | Check review status | Shows if review complete |
| `/crr help` | Show help | Lists all commands |

## 📊 Status Command Output

### Review States
- ✅ **Review Complete** - Analysis finished
- 🔄 **Review in progress** - Currently analyzing (1-3 min)
- ⏳ **No review yet** - Not started

### Issue Severity
- 🔴 **Critical** - Blocks merge, must fix
- 🟠 **High Priority** - Should fix soon
- ⚠️ **Warnings** - Consider fixing
- 💡 **Suggestions** - Optional improvements

## 🔄 Standard Workflow

```bash
# 1. Check review status
/crr status

# 2. Apply suggestions (if review complete)
/crr

# 3. Review changes
git diff

# 4. Commit and push
git push

# 5. Request new review
/crr review
```

## ⚡ Quick Commands

```bash
# Auto-apply from current PR
/crr

# Check if CodeRabbit finished
/crr status

# Request fresh review
/crr review

# See available PRs
/crr list
```

## 🔧 Configuration

- **Confidence Threshold**: 85% (only applies high-confidence suggestions)
- **Supported Files**: `.py`, `.ts`, `.tsx`, `.js`, `.jsx`
- **Auto-detection**: Uses branch name, commit messages, or gh CLI
- **Authentication**: Requires `GITHUB_TOKEN` or `gh` CLI

## 💡 Tips

1. **Wait for completion**: Check `/crr status` before applying suggestions
2. **Review changes**: Always check `git diff` after `/crr`
3. **Re-review**: Use `/crr review` after fixing issues
4. **Specific PR**: Use `/crr 123` to apply from different PR

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| No PR detected | Ensure you're on feature branch with open PR |
| No suggestions | Check `/crr status` - review may be in progress |
| Failed applications | Some complex changes need manual application |
| Auth error | Set `GITHUB_TOKEN` or install `gh` CLI |

## 📁 File Locations

- **Script**: `/scripts/crr.sh`
- **Apply Logic**: `/scripts/coderabbit-simple-apply.js`
- **Config**: `/.coderabbit.yml`
- **Workflow**: `/.github/workflows/coderabbit-feedback-loop.yml`

---

*Last Updated: 2025-01-23 | Version: 2.0.0*