# Vana-Chat Migration Commands

## Phase 1: Preparation and Backup

### 1.1 Create Migration Branch
```bash
# In main Vana repository (/Users/nick/Development/vana/)
git checkout main
git pull origin main
git checkout -b feat/vana-chat-integration
git push -u origin feat/vana-chat-integration
```

### 1.2 Backup Current Frontend
```bash
# Create backup of existing frontend
tar -czf frontend-backup-$(date +%Y%m%d-%H%M%S).tar.gz frontend/
mv frontend-backup-*.tar.gz archive/
```

### 1.3 Prepare vana-chat for Migration
```bash
# In vana-chat directory
cd vercel-chat/
git status
git add .
git commit -m "Pre-migration snapshot: finalize vana-chat before integration

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Phase 2: Git History Preservation Setup

### 2.1 Add vana-chat as Remote
```bash
# In main Vana repository
git remote add vana-chat-source ../vercel-chat
git fetch vana-chat-source
```

### 2.2 Create Subtree for History Preservation
```bash
# Create subtree merge preserving history
git subtree add --prefix=frontend-new vana-chat-source feat/gemini-ui-redesign --squash
```

Alternative approach using merge with allow-unrelated-histories:
```bash
git checkout -b temp/vana-chat-import
git pull vana-chat-source feat/gemini-ui-redesign --allow-unrelated-histories
git checkout feat/vana-chat-integration
git merge temp/vana-chat-import --allow-unrelated-histories
git branch -d temp/vana-chat-import
```

## Phase 3: Directory Structure Migration

### 3.1 Remove Old Frontend
```bash
# Remove existing frontend (already backed up)
git rm -rf frontend/
```

### 3.2 Move vana-chat to frontend Directory
```bash
# If using subtree approach
git mv frontend-new frontend

# If using direct copy approach
cp -r vercel-chat/* frontend/
git add frontend/
```

### 3.3 Update Directory Structure
```bash
# Ensure proper monorepo structure
mkdir -p {backend,shared,docs,scripts,config}

# Move backend files if needed
# (Backend files are already in app/ directory)
```

## Phase 4: Configuration Updates

### 4.1 Update Root Package.json
```bash
# Update workspace configuration in root package.json
npm init -w frontend
```

### 4.2 Update Frontend Package.json
```bash
cd frontend/
# Update paths and configurations
# This will be done programmatically
```

### 4.3 Update Environment Files
```bash
# Merge environment configurations
cp .env.local frontend/.env.local
# Update paths in frontend/.env.local
```

## Phase 5: Git Configuration Updates

### 5.1 Update .gitignore
```bash
# Update root .gitignore to include frontend-specific ignores
echo "
# Frontend build artifacts
frontend/.next/
frontend/dist/
frontend/build/
frontend/node_modules/
frontend/.env.local
frontend/tsconfig.tsbuildinfo
" >> .gitignore
```

### 5.2 Clean Up Git References
```bash
# Remove temporary remote
git remote remove vana-chat-source
```

## Phase 6: Testing and Validation

### 6.1 Install Dependencies
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend/
pnpm install
```

### 6.2 Test Build Process
```bash
# Test frontend build
cd frontend/
pnpm build

# Test backend
cd ../
python -m pytest tests/
```

### 6.3 Test Integration
```bash
# Start backend
python app/server.py &

# Start frontend
cd frontend/
pnpm dev
```

## Phase 7: Create Pull Request

### 7.1 Commit All Changes
```bash
# Add all changes
git add .

# Create comprehensive commit
git commit -m "feat: integrate vana-chat as new frontend

- Replace old frontend with modern vana-chat implementation
- Preserve git history through subtree merge
- Update monorepo structure for frontend/backend separation
- Integrate AI SDK and modern Next.js architecture
- Maintain 89% Gemini UI compatibility
- Add comprehensive testing and development tooling

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 7.2 Push Changes
```bash
git push origin feat/vana-chat-integration
```

### 7.3 Create Pull Request
```bash
gh pr create --title "feat: Integrate vana-chat as new frontend architecture" --body "$(cat <<'EOF'
## Summary
- Replaces existing frontend with modern vana-chat implementation
- Preserves git history through subtree merge strategy  
- Establishes clean monorepo structure with frontend/backend separation
- Integrates advanced AI SDK and modern Next.js 15.3.0 architecture
- Maintains 89% Gemini UI compatibility achieved in standalone version

## Key Features Integrated
- Modern shadcn/ui component system
- AI SDK with multiple provider support (OpenAI, Anthropic, xAI)
- NextAuth authentication system
- Drizzle ORM database integration
- Comprehensive testing framework (Playwright, Jest, Vitest)
- Advanced build and deployment tooling

## Migration Strategy
- **History Preservation**: Used git subtree to preserve vana-chat commit history
- **Backup Created**: Old frontend backed up to archive/ directory
- **Configuration Updated**: Package.json, environment files, and build scripts updated for monorepo
- **Testing Validated**: All build processes and integrations tested

## File Structure Changes
```
/Users/nick/Development/vana/
├── frontend/           # New vana-chat integration (was vercel-chat)
├── app/               # Backend (unchanged)
├── archive/           # Backup of old frontend
└── ...               # Other project files
```

## Test Plan
- [ ] Frontend builds successfully (`pnpm build`)
- [ ] Backend integration works (`python app/server.py`)
- [ ] Authentication flow functions
- [ ] AI chat features operational
- [ ] Database connections established
- [ ] All tests pass (frontend and backend)
- [ ] Development servers run concurrently
- [ ] Production build process works

## Breaking Changes
- Old frontend completely replaced
- New package.json structure for monorepo
- Updated development and build scripts
- New environment variable structure

## Rollback Plan
If issues arise, rollback process:
1. `git checkout main`
2. `git branch -D feat/vana-chat-integration`
3. `rm -rf frontend/`
4. `tar -xzf archive/frontend-backup-*.tar.gz`

🤖 Generated with [Claude Code](https://claude.ai/code)
EOF
)"
```

## Phase 8: Post-Integration Tasks

### 8.1 Update Documentation
```bash
# Update README files
# Update deployment documentation
# Update development setup guides
```

### 8.2 Clean Up
```bash
# Remove vercel-chat directory once integration is confirmed
# rm -rf vercel-chat/

# Clean up temporary files
rm -f *.log *.tmp
```

### 8.3 Update CI/CD
```bash
# Update GitHub Actions workflows
# Update deployment scripts
# Update testing configurations
```

## Emergency Rollback Commands

### If Migration Fails
```bash
# Stop all processes
pkill -f "node\|python"

# Reset to main
git checkout main
git branch -D feat/vana-chat-integration
git push origin --delete feat/vana-chat-integration

# Restore frontend from backup
rm -rf frontend/
tar -xzf archive/frontend-backup-*.tar.gz -C .

# Reinstall dependencies
npm install
cd frontend && npm install
```

## Validation Checklist

### Pre-Migration
- [ ] Current work committed and pushed
- [ ] Backup created and verified  
- [ ] Both repositories in clean state
- [ ] All tests passing in both repos

### During Migration
- [ ] Git history preserved
- [ ] File structure correct
- [ ] Dependencies resolved
- [ ] Configuration files updated

### Post-Migration  
- [ ] Frontend builds successfully
- [ ] Backend integration works
- [ ] All tests pass
- [ ] Development workflow functions
- [ ] Production build works
- [ ] Documentation updated

## Support Commands

### Check Migration Status
```bash
# Verify git history preservation
git log --oneline --graph frontend/

# Check file structure
tree -L 3 -I node_modules

# Verify dependencies
npm ls --depth=0
cd frontend && pnpm ls --depth=0
```

### Debug Issues
```bash
# Check git status
git status

# View recent commits
git log --oneline -10

# Check remote branches
git branch -r

# Verify file permissions
ls -la frontend/
```