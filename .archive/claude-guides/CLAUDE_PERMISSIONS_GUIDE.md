# Claude Code Permissions Configuration Guide

## 🚀 Overview

This guide explains the improved permission system for Claude Code that significantly reduces unnecessary confirmation prompts while maintaining security for dangerous operations.

## 📊 Impact

- **~80% fewer confirmation prompts** during typical development workflows
- **Maintained security** for system-level and destructive operations
- **Improved developer experience** with faster command execution
- **Context-aware permissions** that understand safe vs. dangerous operations

## 🔧 Implementation

The permission configuration is stored in `.claude/settings.local.json` within your project directory.

### Key Changes:

1. **Comprehensive Allow List**: Added 180+ safe commands that no longer require confirmation
2. **Explicit Deny List**: Dangerous commands that always require user confirmation
3. **Pattern-Based Rules**: Uses wildcards for flexible command matching

## ✅ Auto-Allowed Commands

### Read-Only Operations
- File viewing: `cat`, `head`, `tail`, `less`, `more`
- Directory listing: `ls`, `ll`, `la`, `tree`
- Searching: `grep`, `find`, `rg` (ripgrep), `ag` (silver searcher)
- File info: `stat`, `file`, `wc`, `du`, `df`

### Development Tools
- Version control: All `git` and `gh` (GitHub CLI) commands
- Package managers: `npm`, `yarn`, `poetry`, `pip`, `cargo`, etc.
- Languages: `python`, `node`, `ruby`, `go`, etc.
- Testing: `pytest`, `jest`, `mocha`, `vitest`
- Linting: `eslint`, `prettier`, `black`, `ruff`

### Safe File Operations
- Creating: `mkdir`, `touch`
- Copying: `cp`
- Moving/Renaming: `mv` (within project)
- Permissions: `chmod` (within project)
- Deleting: `rm` (within project, but not `rm -rf /`)

### Process Management
- Viewing: `ps`, `lsof`, `netstat`
- Killing: `kill`, `pkill` (your own processes)

### Network Tools
- HTTP: `curl`, `wget`
- DNS: `dig`, `nslookup`, `host`
- Testing: `ping`, `nc`

## 🚫 Always Requires Confirmation

### System Operations
- `sudo` - Any command with elevated privileges
- `su` - Switching users
- System services: `systemctl`, `service`, `launchctl`

### Destructive Operations
- `rm -rf /` or any system directory
- `dd` - Direct disk operations
- `mkfs`, `format` - Disk formatting
- `shred` - Secure file deletion

### System Modifications
- Package installation at system level: `apt install`, `brew install`
- User management: `useradd`, `passwd`
- Network configuration: `ifconfig`, `iptables`
- System control: `reboot`, `shutdown`

## 🛡️ Security Principles

1. **Principle of Least Surprise**: Common development commands work without interruption
2. **Defense in Depth**: Truly dangerous operations always require explicit consent
3. **Context Awareness**: Commands are evaluated based on their potential impact
4. **No Privilege Escalation**: `sudo` and similar commands always require confirmation

## 📝 Customization

You can customize permissions for your specific needs:

### Adding New Allowed Commands:
```json
{
  "permissions": {
    "allow": [
      // ... existing rules ...
      "Bash(your-safe-command:*)"
    ]
  }
}
```

### Blocking Specific Commands:
```json
{
  "permissions": {
    "deny": [
      // ... existing rules ...
      "Bash(dangerous-command:*)"
    ]
  }
}
```

## 🔍 Troubleshooting

### Still Getting Prompts?
1. Check if the command is in the allow list
2. Ensure `.claude/settings.local.json` is properly formatted (valid JSON)
3. Restart Claude Code after making changes

### Command Not Working?
1. Check if it's in the deny list
2. For system operations, confirmation is always required (by design)
3. Consider if the command truly needs to be auto-allowed

## 💡 Best Practices

1. **Review Regularly**: Periodically review your permission settings
2. **Project-Specific**: Keep `.claude/` directory in your project (gitignored)
3. **Team Sharing**: Share safe permission configurations with your team
4. **Security First**: When in doubt, require confirmation

## 🎯 Examples

### Before (Required Confirmation):
```bash
> ls -la
[Confirm to proceed? Y/n]
> grep "TODO" -r .
[Confirm to proceed? Y/n]
> git status
[Confirm to proceed? Y/n]
```

### After (Auto-Allowed):
```bash
> ls -la
# Executes immediately
> grep "TODO" -r .
# Executes immediately
> git status
# Executes immediately
```

### Still Requires Confirmation:
```bash
> sudo apt install package
[Confirm to proceed? Y/n] # Always requires confirmation
> rm -rf /
[Blocked - Dangerous operation]
```

---

## 📚 Additional Resources

- Permission analysis: `.development/analysis/CLAUDE_PERMISSIONS_ANALYSIS.md`
- Claude development guide: `CLAUDE_DEVELOPMENT_GUIDE.md`
- Settings file: `.claude/settings.local.json`

This configuration significantly improves the Claude Code development experience while maintaining security for critical operations.