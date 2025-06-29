# 🚨 Preventing Auto-Compaction Issues During Parallel Documentation Work

## The Risk
When 4 Claude Code agents run simultaneously creating large documentation files, they may trigger auto-compaction, which could:
- Lose important context mid-task
- Cause agents to forget their specific instructions
- Result in incomplete or inconsistent documentation
- Waste time re-explaining tasks to agents

## 🛡️ Prevention Strategies

### 1. Disable Auto-Compaction (Recommended)
In each agent's terminal before starting:
```bash
# Set very high threshold to effectively disable auto-compaction
export CLAUDE_AUTO_COMPACT_THRESHOLD=95  # Default is usually 70-80%
claude
```

Or use the `/config` command in each Claude session to disable auto-compaction.

### 2. Proactive Manual Compaction
Before starting major documentation sections:
```
/compact
```
This gives you control over when compaction happens.

### 3. Context Management Commands
Each agent should use these commands frequently:
```
/memory-consolidate    # Save important context to ChromaDB before compacting
/memory-status        # Check memory is working
/compact             # Manual compaction when ready
```

### 4. Work in Smaller Chunks
Instead of creating massive files at once:
- Create documentation in 5-10KB sections
- Commit frequently
- Use incremental approach

### 5. Agent-Specific .claude/settings.local.json
Create settings in each worktree to manage context:
```bash
# In each worktree
mkdir -p .claude
cat > .claude/settings.local.json << 'EOF'
{
  "autoCompact": false,
  "compactThreshold": 95,
  "permissions": {
    "allow": ["*"]
  }
}
EOF
```

## 📋 Recommended Workflow for Each Agent

### Starting Each Agent:
```bash
# 1. Navigate to worktree
cd /Users/nick/Development/vana-docs-[area]

# 2. Create local settings to prevent auto-compact
mkdir -p .claude
echo '{"autoCompact": false}' > .claude/settings.local.json

# 3. Launch with high threshold
export CLAUDE_AUTO_COMPACT_THRESHOLD=95
code .
claude

# 4. First commands in Claude:
/memory-status       # Verify memory is working
/config             # Check auto-compact is disabled
```

### During Work:
1. **Every 30 minutes:** 
   - `/memory-consolidate` - Save progress to memory
   - Check context percentage in bottom right

2. **Before large tasks:**
   - `/compact` - Manual compaction
   - Provide brief context reminder after compaction

3. **After completing sections:**
   - Commit to git
   - `/memory-consolidate`
   - Continue to next section

## 🔄 Recovery Protocol

If an agent loses context due to compaction:

### Quick Recovery:
```
Check CLAUDE.md for your role. You're the [Architecture/API/Deployment/User] documentation agent. Current task: [check git log for last commit]. Continue from there.
```

### Full Recovery:
```
/memory-status
Search memory for: "documentation agent [area] current task"
Review CLAUDE.md and git log --oneline to see progress
Continue documenting from last commit
```

## 💡 Best Practices

1. **Frequent Git Commits**
   ```bash
   git add -A && git commit -m "docs: checkpoint - [description]"
   ```

2. **Context Markers**
   Each agent should create a STATUS.md in their worktree:
   ```markdown
   # Current Status
   - Working on: [specific section]
   - Completed: [list of done items]
   - Next: [planned work]
   ```

3. **Shared Progress Tracking**
   Update main repo's DOCUMENTATION_PROGRESS.md frequently

4. **Test in Chunks**
   Run validation tests on completed sections:
   ```bash
   python /Users/nick/Development/vana/docs/validation/validate_documentation.py ./section.md
   ```

## 🚀 Optimized Launch Sequence

```bash
# For each agent terminal:
cd /Users/nick/Development/vana-docs-[area]
mkdir -p .claude
echo '{"autoCompact": false, "compactThreshold": 95}' > .claude/settings.local.json
export CLAUDE_AUTO_COMPACT_THRESHOLD=95
code .
claude

# First commands in Claude:
/config
/memory-status
# Then give the initial documentation prompt
```

This strategy ensures all 4 agents can work efficiently without losing context!