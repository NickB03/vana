# Claude Code Hooks Documentation

**Purpose:** Prevent Claude Code from making dangerous git operations that could break Lovable Cloud production.

**Status:** ✅ Active and configured

---

## 📋 Hook Configuration

**Location:** `.claude/settings.json`

**Format:** JSON configuration file

---

## 🔒 Configured Safety Rules

### Rule 1: Block Commits to Main Branch

**Event:** `PreToolUse` (Before Bash tool executes)

**Triggers When:**
- Current branch is `main`
- Command contains `git commit`

**Action:**
```
🔒 BLOCKED: Cannot commit to main branch!

Why: Lovable Cloud deploys from main. Direct commits bypass testing.

What to do:
  1. Create feature branch: git checkout -b feature/your-feature
  2. Commit to feature branch
  3. Test in Lovable preview
  4. Merge when ready

For EMERGENCY hotfix, tell me: I need to commit to main for emergency: [reason]
```

---

### Rule 2: Block Git-Ignored Environment Files

**Event:** `PreToolUse` (Before Bash tool executes)

**Triggers When:**
- Command contains `git add .env.local` or `.env.development`

**Action:**
```
🔒 BLOCKED: Cannot stage git-ignored environment files!

Files that should NEVER be committed:
  • .env.local (personal secrets)
  • .env.development (development config)

These contain sensitive data and are git-ignored for safety.
```

---

### Rule 3: Warn When On Main Branch

**Event:** `SessionStart` (When Claude Code session starts)

**Triggers When:**
- Starting a session while on `main` branch

**Action:**
```
⚠️  WARNING: You are on the main branch!
   Consider creating a feature branch to protect production.
   Command: git checkout -b feature/your-feature
```

---

## 🎯 How It Works

```
User: "Claude, commit these changes"
         ↓
Claude prepares: Bash tool with "git commit -m 'message'"
         ↓
🔒 PreToolUse HOOK TRIGGERS
         ↓
Hook script checks current branch
         ↓
    Is branch 'main'?
    ├─ YES → ❌ BLOCK (exit 1) + Show error
    └─ NO  → ✅ Allow (exit 0)
         ↓
    If blocked: Tool doesn't execute
    If allowed: Tool executes normally
```

---

## 📁 File Structure

```
.claude/
└── settings.json       # Hook configuration (JSON format)
```

**Important:**
- `.claude/settings.json` is committed to git
- Everyone on the team gets the same protections
- Works immediately (no setup needed)

---

## ⚠️ Emergency Override

**If you MUST commit to main:**

Tell Claude:
```
"I need to commit to main for emergency: [describe critical issue]"
```

Claude will:
1. Evaluate if it's truly an emergency
2. Ask for user confirmation
3. If approved, explain the risks
4. Use `--no-verify` or modify command to bypass hook

**Use only for:**
- Critical production bugs
- Security hotfixes
- Emergency rollbacks
- Data loss prevention

---

## 🧪 Testing the Hooks

### Expected Behavior

| Scenario | Branch | Command | Result |
|----------|--------|---------|--------|
| Normal commit | `feature/test` | `git commit -m "test"` | ✅ Allowed |
| Commit on main | `main` | `git commit -m "test"` | ❌ Blocked |
| Add .env.local | any | `git add .env.local` | ❌ Blocked |
| Add .env.development | any | `git add .env.development` | ❌ Blocked |
| Session starts on main | `main` | (session start) | ⚠️ Warning shown |

---

## 🔧 Hook Configuration Details

### JSON Structure

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash script that checks conditions"
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "type": "command",
        "command": "bash script that warns user"
      }
    ]
  }
}
```

---

### Available Events

| Event | When It Triggers | Use For |
|-------|------------------|---------|
| `PreToolUse` | Before tool executes | Blocking dangerous operations |
| `PostToolUse` | After tool succeeds | Logging, notifications |
| `SessionStart` | New session begins | Warnings, setup checks |
| `UserPromptSubmit` | User sends message | Input validation |
| `Stop` | AI completes response | Cleanup, summaries |

---

### Matcher Patterns

| Pattern | Matches | Example |
|---------|---------|---------|
| `"Bash"` | Exact match | Only Bash tool |
| `"Edit\|Write"` | Multiple tools | Edit OR Write |
| `"Notebook.*"` | Regex | NotebookEdit, NotebookRead |

---

## 🚀 Advantages of Claude Code Hooks

**vs Git Hooks:**
- ✅ Work immediately (no merge needed)
- ✅ JSON configuration (easy to read/edit)
- ✅ Committed to repo (everyone protected)
- ✅ Can show rich error messages
- ✅ Claude-specific (only affect AI actions)

**vs Manual Checking:**
- ✅ Automated protection
- ✅ Consistent enforcement
- ✅ Can't be forgotten
- ✅ Clear error messages

---

## 🛠️ Customizing Hooks

### Add New Rule

Edit `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          // Existing hooks...
          {
            "type": "command",
            "command": "your new safety check here"
          }
        ]
      }
    ]
  }
}
```

---

### Common Customizations

**Block force push:**
```json
{
  "type": "command",
  "command": "bash -c 'COMMAND=$(echo \"$CLAUDE_TOOL_INPUT\" | jq -r \".command\"); if echo \"$COMMAND\" | grep -qE \"git\\s+push.*--force\"; then echo \"🔒 BLOCKED: Force push not allowed!\"; exit 1; fi'"
}
```

**Require commit message format:**
```json
{
  "type": "command",
  "command": "bash -c 'COMMAND=$(echo \"$CLAUDE_TOOL_INPUT\" | jq -r \".command\"); if echo \"$COMMAND\" | grep -q \"git commit\" && ! echo \"$COMMAND\" | grep -qE \"feat:|fix:|docs:|chore:\"; then echo \"⚠️  Commit message should start with: feat:|fix:|docs:|chore:\"; exit 1; fi'"
}
```

---

## 📚 Related Documentation

- **DUAL_ENVIRONMENT_SETUP.md** - Local dev environment setup
- **ACTUAL_WORKFLOW.md** - Lovable + Claude Code workflow
- **NEXT_AGENT_PROMPT.md** - Complete project guide
- **CLAUDE.md** - Project-specific patterns

---

## ⚠️ Important Notes

1. **Hooks are project-specific**
   - Only active in this repository
   - Other projects need their own configuration

2. **Hooks affect Claude Code only**
   - Don't prevent manual git commands
   - You can still manually commit to main (don't!)
   - Only protect AI-generated actions

3. **Hooks are committed to git**
   - `.claude/settings.json` is in version control
   - Everyone gets the same protections
   - No per-developer setup needed

4. **Emergency override available**
   - Tell Claude it's an emergency
   - Claude will evaluate and potentially bypass
   - Used only for critical fixes

5. **Hooks can be tested**
   - Try committing on feature branch (should work)
   - Try committing on main (should block)
   - Check error messages are clear

---

## 🔍 Troubleshooting

### Hook Not Triggering

**Check:**
1. `.claude/settings.json` exists in project root
2. JSON is valid (use `jq . .claude/settings.json`)
3. You're using Claude Code (not manual git)
4. Hook matcher matches tool name

**Test:**
```bash
# Validate JSON
jq . .claude/settings.json

# Check if hook would trigger
echo '{"command":"git commit -m test"}' | \
  CLAUDE_TOOL_INPUT='{"command":"git commit -m test"}' \
  bash -c 'your hook command here'
```

---

### Hook Blocking Too Much

**Solution:** Refine matcher or add exceptions

```json
{
  "matcher": "Bash",
  "hooks": [
    {
      "type": "command",
      "command": "bash -c 'if [ specific condition ]; then exit 1; fi'"
    }
  ]
}
```

---

### Need to Bypass Hook

**Option 1:** Tell Claude it's an emergency
```
"Claude, I need to commit to main for emergency hotfix: [reason]"
```

**Option 2:** Temporarily disable
```
# Rename settings file
mv .claude/settings.json .claude/settings.json.disabled
# Do your work
# Re-enable
mv .claude/settings.json.disabled .claude/settings.json
```

**Option 3:** Manual git command
```bash
# Hooks don't affect manual commands
git commit -m "manual commit"
```

---

## ✅ Setup Checklist

After adding hooks:

- [ ] `.claude/settings.json` exists
- [ ] JSON is valid (`jq . .claude/settings.json`)
- [ ] Committed to git
- [ ] Tested: Try committing on feature branch (works)
- [ ] Tested: Try committing on main (blocked)
- [ ] Tested: Try adding .env.local (blocked)
- [ ] Team informed about new protections

---

**Status:** ✅ Active and protecting production

**Last Updated:** 2025-10-29

**Questions?** Review the hooks configuration in `.claude/settings.json` or ask Claude Code for help!
