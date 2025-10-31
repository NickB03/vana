# Duplicate Plugins Cleanup Guide

## Problem
You have 4 plugin marketplaces installed, causing **109+ duplicate agents** to load:
- `claude-code-workflows` (wshobson/agents) - 65 plugins
- `claude-code-plugins` (anthropics/claude-code) - 7 official plugins
- `claude-code-templates` (davila7/claude-code-templates) - Templates
- `anthropic-agent-skills` (anthropics/skills) - Official skills

## Solution: Selective Disable

### Option A: Automated Script (Recommended)

Run the provided script to disable all duplicate plugins from `claude-code-workflows`:

```bash
./disable-duplicate-plugins.sh
```

This will:
- Disable 109 duplicate agents from the `claude-code-workflows` marketplace
- Keep official Anthropic plugins active
- Preserve all functionality while eliminating clutter

### Option B: Manual Selective Disable

To manually disable specific duplicates:

#### 1. Check which plugins are causing duplicates

From your agent list, these are duplicated (appearing 2+ times):
- `code-documentation:code-reviewer`
- `debugging-toolkit:debugger`
- `backend-development:backend-architect`
- `full-stack-orchestration:test-automator`
- ... and 105 more

#### 2. Disable duplicates from workflows marketplace

```bash
# Syntax: claude plugin disable <marketplace>:<plugin>:<agent>

# Examples:
claude plugin disable claude-code-workflows:code-documentation:code-reviewer
claude plugin disable claude-code-workflows:debugging-toolkit:debugger
claude plugin disable claude-code-workflows:backend-development:backend-architect
```

#### 3. Verify with /doctor

After disabling, check results:
```bash
/doctor
```

### Option C: Disable Entire Plugin Categories

If you want to disable all agents from a specific plugin:

```bash
# This will disable ALL agents from the code-documentation plugin in workflows marketplace
# You'll need to do this one agent at a time, or use the script

# Check which agents are in a plugin:
ls ~/.claude/plugins/marketplaces/claude-code-workflows/plugins/code-documentation/agents/
```

## Understanding Plugin Naming

Plugins follow this structure:
```
marketplace:plugin:agent
└─ claude-code-workflows:code-documentation:code-reviewer
   │                     │                   │
   └─ Marketplace        └─ Plugin           └─ Agent
```

## What Gets Kept?

After running the script, you'll retain:
- ✅ Official `claude-code-plugins` agents (feature-dev, pr-review-toolkit, etc.)
- ✅ Official `anthropic-agent-skills` skills
- ✅ Templates from `claude-code-templates`
- ✅ Project-specific agents in `.claude/agents/`

## What Gets Disabled?

Duplicates from `claude-code-workflows` marketplace:
- ❌ 109 duplicate agents that overlap with official plugins
- ❌ Agents like code-reviewer, debugger, backend-architect (when duplicated)

## Expected Results

**Before:**
- 300+ total agents (with ~109 duplicates)
- Confusing agent selection
- Slower startup

**After:**
- ~191 unique agents
- Clear agent selection
- Faster startup
- No functionality loss

## Rollback

To re-enable a plugin if needed:

```bash
claude plugin enable claude-code-workflows:code-documentation:code-reviewer
```

## Alternative: Remove Entire Marketplace

If you prefer a cleaner approach, remove the workflows marketplace entirely:

```bash
claude plugin marketplace remove claude-code-workflows
```

**Pros:**
- Cleanest solution
- Fastest startup
- No manual disabling needed

**Cons:**
- Loses any unique agents from that marketplace
- Can't selectively enable specific agents later

## Verification

After cleanup, verify with:
```bash
# Check diagnostics
/doctor

# Check marketplace status
claude plugin marketplace list

# Count remaining agents (should be ~191)
# Look at the agent list in next Claude Code session
```

## Support

If you encounter issues:
1. Check ~/.claude.json for plugin configuration
2. Run `/doctor` in Claude Code
3. Report issues at: https://github.com/anthropics/claude-code/issues
