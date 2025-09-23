# Vana Project Migration Instructions
## MacBook Air → MacBook Pro Setup Guide

### 🚀 Quick Start on New MacBook Pro

#### 1. Install Prerequisites
```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install core development tools
brew install git node python
curl -fsSL https://github.com/astral-sh/uv/install.sh | sh

# Install global npm packages
npm install -g npm@latest

# Install Claude CLI (if needed)
curl -fsSL https://claude.ai/install.sh | sh
```

#### 2. Clone Repository
```bash
git clone <your-repo-url> vana
cd vana
```

#### 3. Restore Environment Files (SECURE)
```bash
# Extract the migration backup (secure transfer required)
# Copy vana-migration-backup.zip to your new MacBook Pro via:
# - AirDrop (recommended)
# - Encrypted cloud storage
# - Secure USB drive

unzip vana-migration-backup.zip
```

#### 4. Restore Environment Variables
```bash
# Copy environment files to proper locations
cp vana-migration-backup/environment/.env ./
cp vana-migration-backup/environment/.env.local ./

# App-specific environment files
cp vana-migration-backup/environment/.env.local.template app/
# Note: You may need to create app/.env.local manually if it was system-specific

# Frontend environment
mkdir -p frontend
cp vana-migration-backup/environment/.env.local frontend/ 2>/dev/null

# Set proper permissions for security
chmod 600 .env .env.local
chmod 600 app/.env.local 2>/dev/null
chmod 600 frontend/.env.local 2>/dev/null
```

#### 5. Restore Configuration Files
```bash
# Claude Code and AI tool configurations
cp vana-migration-backup/configs/.mcp.json ./
cp vana-migration-backup/configs/.claude-flow.config.json ./
cp vana-migration-backup/configs/.claude-hooks.json ./
cp vana-migration-backup/configs/.claude_session ./
cp vana-migration-backup/configs/.coderabbit.yml ./

# VS Code workspace settings
cp -r vana-migration-backup/configs/.vscode ./
```

#### 6. Update System-Specific Configurations
```bash
# IMPORTANT: Update .claude-flow.config.json for your new MacBook Pro specs
# Edit the system profile detection section to match your new hardware:
# - Memory amount (16GB/24GB/32GB+)
# - Processor type (M3 Pro/Max, M4, etc.)
# - Adjust maxAgents and memory limits accordingly

# Example for M3 MacBook Pro 24GB:
# Change "m3_macbook_air_16gb" to "m3_macbook_pro_24gb" 
# Update maxMemoryGB from 16 to 24
# Increase maxAgents from 4 to 6-8
```

#### 7. Restore Database Files
```bash
# Copy databases to proper locations
cp vana-migration-backup/databases/auth.db ./
cp vana-migration-backup/databases/*.db ./

# Restore AI coordination databases
cp -r vana-migration-backup/databases/.hive-mind ./
cp -r vana-migration-backup/databases/.swarm ./
```

#### 8. Create Fresh Python Environment
```bash
# Create new virtual environment with UV (recommended)
uv venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install Python dependencies
uv pip install -r requirements.txt
# OR if using pyproject.toml:
uv sync
```

#### 9. Install Node Dependencies
```bash
# Install root level dependencies (if any)
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

#### 10. Restore Global Development Configurations
```bash
# Git configuration
cp vana-migration-backup/global-configs/gitconfig.backup ~/.gitconfig

# UV Python package manager config
cp -r vana-migration-backup/global-configs/uv ~/.config/ 2>/dev/null

# NPM configurations (reference only - don't overwrite)
# Check vana-migration-backup/global-configs/npm-config.json for any custom settings
```

#### 11. Verify Setup
```bash
# Test Python environment
python --version
pip list

# Test Node environment
node --version
npm --version

# Test database connections
python -c "import sqlite3; print('SQLite OK')"

# Test environment variables
python -c "import os; print('ENV OK' if os.getenv('SECRET_KEY') else 'ENV MISSING')"

# Test Claude Code integration
claude --version 2>/dev/null || echo "Claude CLI not installed"
```

#### 12. Test Application
```bash
# Start the development server
python -m uvicorn app.server:app --reload

# In another terminal, test the API
curl http://localhost:8000/health

# If frontend exists, test it
cd frontend && npm run dev
```

### 🔧 Troubleshooting

#### Python Environment Issues
```bash
# If UV sync fails, try pip
pip install -r requirements.txt

# If dependencies conflict, create clean environment
rm -rf .venv
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

#### Database Issues
```bash
# If auth.db is corrupted, remove and restart
rm auth.db
python app/database/init_db.py  # If this script exists
```

#### Environment Variable Issues
```bash
# Check if all required variables are set
python -c "import os; print([k for k in os.environ.keys() if 'API' in k or 'SECRET' in k])"

# Copy template and fill manually if needed
cp app/.env.local.template app/.env.local
# Edit app/.env.local with your API keys
```

#### Claude Code Configuration Issues
```bash
# Reinitialize Claude MCP servers
claude mcp add claude-flow npx claude-flow@alpha mcp start
claude mcp add ruv-swarm npx ruv-swarm@latest mcp start

# Test MCP connectivity
claude mcp list
```

### 📁 Backup Contents Summary

- **environment/**: All .env files with API keys and secrets
- **configs/**: Claude Code, VS Code, and tool configurations  
- **databases/**: SQLite databases and AI coordination data
- **global-configs/**: Git, NPM, and UV global settings
- **docs/**: This instruction file

### 🔒 Security Notes

1. **Environment files contain sensitive API keys** - transfer securely
2. **Database files may contain user data** - handle with care
3. **Configuration files may contain local paths** - update as needed
4. **Set proper file permissions** after restoration (chmod 600 for .env files)

### 🎯 Post-Migration Checklist

- [ ] All environment variables loaded correctly
- [ ] Python virtual environment working
- [ ] Node dependencies installed
- [ ] Databases accessible
- [ ] Claude Code MCP servers connected
- [ ] VS Code workspace settings applied
- [ ] Git configuration restored
- [ ] Application starts without errors
- [ ] API endpoints responding
- [ ] Frontend (if applicable) working

---

**Migration completed successfully!** 🎉

Your Vana development environment should now be fully functional on your new MacBook Pro.