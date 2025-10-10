# Vana Migration Backup Manifest

## Backup Created: September 23, 2025
## Source: MacBook Air M3 16GB 
## Target: MacBook Pro (new system)

### 📦 Backup Contents

#### Environment Files (`environment/`)
- `.env` (601 bytes) - Main environment variables and API keys
- `.env.local` (932 bytes) - Local environment overrides  
- `.env.local.template` (1,019 bytes) - Template for app environment

**⚠️ SECURITY**: These files contain sensitive API keys and secrets

#### Configuration Files (`configs/`)
- `.mcp.json` (339 bytes) - Claude MCP server configuration
- `.claude-flow.config.json` (2,679 bytes) - System profiles for M3 MacBook Air
- `.claude-hooks.json` (3,292 bytes) - Claude Flow coordination hooks
- `.claude_session` (514 bytes) - Current Claude session state
- `.coderabbit.yml` (1,129 bytes) - CodeRabbit AI integration settings
- `.vscode/` directory - VS Code workspace settings and tasks

**🔧 UPDATE REQUIRED**: `.claude-flow.config.json` needs MacBook Pro specs

#### Database Files (`databases/`)
- `auth.db` (94,208 bytes) - Authentication database
- `hive.db` (143,360 bytes) - AI hive-mind coordination data
- `memory.db` (221,184 bytes) - Swarm memory and state
- `.hive-mind/` directory - Hive-mind coordination files
- `.swarm/` directory - Swarm coordination files

**💾 TOTAL DATABASE SIZE**: ~459KB

#### Global Configurations (`global-configs/`)
- `gitconfig.backup` (406 bytes) - Git user configuration
- `npm-config.json` (3,760 bytes) - NPM global settings
- `uv/` directory - UV Python package manager config

#### Documentation (`docs/`)
- `MIGRATION_INSTRUCTIONS.md` - Complete setup guide
- `BACKUP_MANIFEST.md` - This file

### 🚫 Excluded Files
- `.venv/` - Python virtual environment (will be rebuilt)
- `node_modules/` - Node dependencies (will be reinstalled)
- `__pycache__/` - Python cache files
- `*.pyc` - Compiled Python files
- `.DS_Store` - macOS system files
- `.git/` - Git repository (clone separately)

### 🔍 Verification Checksums
```
auth.db: MD5 checksum for integrity verification
hive.db: AI coordination data
memory.db: Swarm state data
.env: Environment variables (HANDLE SECURELY)
```

### 📋 Migration Priority
1. **CRITICAL**: Environment files (.env, .env.local)
2. **HIGH**: Configuration files (.mcp.json, .claude-flow.config.json)
3. **MEDIUM**: Database files (auth.db, hive.db, memory.db)
4. **LOW**: Global configurations (gitconfig, npm settings)

### 🛠️ Post-Restoration Actions Required
- Update `.claude-flow.config.json` for new hardware specs
- Rebuild Python virtual environment with `uv venv .venv`
- Reinstall Node dependencies with `npm install`
- Verify all environment variables are loaded
- Test database connectivity
- Restart Claude MCP servers

### 📱 Transfer Methods
- **Recommended**: AirDrop (encrypted by default)
- **Alternative**: Encrypted cloud storage (iCloud, Dropbox with encryption)
- **Secure**: Encrypted USB drive
- **NOT RECOMMENDED**: Email, Slack, unencrypted cloud storage

---

**Total Backup Size**: ~470KB (excluding documentation)
**Security Level**: HIGH (contains API keys and secrets)
**Compatibility**: macOS (may need path adjustments for other systems)