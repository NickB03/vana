# 🤝 Agent Handoff Document - Vana Project

**Handoff Date:** 2025-08-23  
**Current Sprint:** Ready for Sprint 1  
**Phase 0:** ✅ COMPLETE (PR #103 merged)  
**Repository:** https://github.com/NickB03/vana

---

## 🎯 PROJECT OVERVIEW

### What is Vana?
**Vana** (Virtual Autonomous Network Agents) is an enterprise-grade multi-agent AI research system powered by Google's ADK (AI Development Kit). It features 8 specialized AI agents that collaborate to transform complex research questions into comprehensive reports.

### Core Architecture:
- **Backend:** FastAPI with real-time SSE streaming, SQLite + GCS session persistence
- **Frontend:** Next.js 15.4.6 (being rebuilt), React 19, TypeScript 5.7.2
- **AI Framework:** Google ADK with Gemini models
- **Deployment:** Google Cloud Run (when ready)

### Two-Phase Workflow:
1. **Planning Phase:** Interactive planning with user
2. **Execution Phase:** Autonomous agent execution

---

## 📊 CURRENT STATUS

### ✅ What's Complete:
1. **Phase 0 Foundation** (Just finished - PR #103)
   - Environment configuration templates
   - CSP headers for Monaco Editor
   - SSE event type alignment
   - Jest testing with 80% coverage
   - Backend validation tooling

2. **Backend** (Fully functional)
   - FastAPI server running on port 8000
   - SSE streaming working
   - Authentication system ready
   - Session management operational

3. **Frontend** (Partial - needs Sprint 1-6)
   - Basic Next.js structure exists
   - Some components built
   - SSE hooks configured
   - Ready for full rebuild

### 🚧 What's In Progress:
- **Frontend Rebuild:** 12-week sprint plan (6 sprints × 2 weeks)
- **Sprint 1:** Ready to start - Foundation & Core Setup

---

## 📁 PROJECT STRUCTURE

```
/Users/nick/Development/vana/
├── app/                    # Backend (FastAPI)
│   ├── server.py          # Main server - SSE endpoints
│   ├── agent.py           # ADK agent implementation
│   ├── auth/              # Authentication system
│   └── utils/             # SSE broadcaster, session management
├── frontend/              # Frontend (Next.js)
│   ├── src/               # Source code
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks (SSE, auth)
│   │   ├── store/         # Zustand state management
│   │   └── types/         # TypeScript types
│   └── next.config.ts     # CSP headers configured
├── scripts/               # Utility scripts
│   ├── validate-backend.sh # Backend validation
│   └── crr.sh            # CodeRabbit helper
├── .claude_workspace/     # Claude documentation
│   └── active-sprint-planning/ # Sprint plans
└── CLAUDE.md             # Claude-specific instructions
```

---

## 🚀 ESSENTIAL COMMANDS

### Daily Development:
```bash
# Start backend (port 8000)
make dev-backend

# Start frontend (port 5173)
make dev-frontend

# Run both
make dev

# Validate backend
./scripts/validate-backend.sh

# Run tests
make test
make lint
make typecheck
```

### Git Workflow:
```bash
# Check CodeRabbit review status
./crr status

# Apply CodeRabbit suggestions
./crr

# Request CodeRabbit review
./crr review
```

### SPARC Commands (AI Agents):
```bash
# Run SPARC mode
npx claude-flow sparc run <mode> "<task>"

# Common modes:
# - architect: System design
# - code: Implementation
# - tdd: Test-driven development
# - review: Code review
# - analyze: Analysis tasks
```

---

## 🛠️ KEY TOOLS & INTEGRATIONS

### 1. **MCP (Model Context Protocol) Tools:**
- `mcp__github__*` - GitHub operations (PRs, issues, etc.)
- `mcp__claude-flow__*` - SPARC swarm orchestration
- `mcp__playwright__*` - Browser automation
- `mcp__shadcn__*` - UI component library

### 2. **SPARC/Claude Flow:**
- Swarm orchestration for multi-agent tasks
- Memory-optimized for M3 MacBook Air (4 agent limit)
- Located in `node_modules/@ruvnet/claude-flow`

### 3. **CodeRabbit:**
- Automated PR reviews
- Use `@coderabbitai` in PR comments
- Config in `.coderabbit.yml`

---

## 📋 SPRINT PLAN OVERVIEW

### Sprint Timeline (12 weeks total):
| Sprint | Duration | Focus | Status |
|--------|----------|-------|--------|
| **0** | 1 day | Pre-Development Foundation | ✅ COMPLETE |
| **1** | Weeks 1-2 | Foundation & Core Setup | 🎯 READY TO START |
| **2** | Weeks 3-4 | Authentication & State | Pending |
| **3** | Weeks 5-6 | Chat & SSE Integration | Pending |
| **4** | Weeks 7-8 | Canvas System (Monaco) | Pending |
| **5** | Weeks 9-10 | Agent Features | Pending |
| **6** | Weeks 11-12 | Testing & Production | Pending |

### Sprint 1 Deliverables:
- Next.js 15.4.6 with App Router
- TypeScript strict mode
- Tailwind CSS with dark theme
- shadcn/ui components
- Core layout structure

---

## 🔥 CRITICAL FILES TO REVIEW

### Configuration:
- `/CLAUDE.md` - Claude-specific instructions and rules
- `/.env.local.template` - Environment variables template
- `/frontend/next.config.ts` - CSP headers for Monaco

### Backend Core:
- `/app/server.py` - Main FastAPI server
- `/app/agent.py` - ADK agent implementation
- `/app/utils/sse_broadcaster.py` - SSE event system

### Frontend Core:
- `/frontend/src/hooks/use-sse.ts` - SSE connection hook
- `/frontend/src/components/chat/sse-provider.tsx` - SSE context
- `/frontend/src/types/session.ts` - TypeScript types

### Planning Docs:
- `/.claude_workspace/active-sprint-planning/vana-frontend-sprint-plan.md`
- `/.claude_workspace/active-sprint-planning/phase-0-completed.md`

---

## ⚠️ IMPORTANT CONTEXT

### Environment Setup Required:
```bash
# Copy templates
cp .env.local.template .env.local
cp app/.env.local.template app/.env.local
cp frontend/.env.local.template frontend/.env.local

# Add API keys from Google Secret Manager:
# - BRAVE_API_KEY
# - GOOGLE_CLOUD_PROJECT=analystai-454200
```

### M3 MacBook Air Limitations:
- Max 4 SPARC agents (16GB RAM limit)
- Use `--agents 4` flag with claude-flow
- Memory monitoring automatic via `.claude-flow.config.json`

### SSE Event Names (Fixed in Phase 0):
- Backend sends: `connection`, `heartbeat`, `agent_network_update`
- Frontend expects same (was mismatched, now fixed)

### CSP Headers:
- Already configured for Monaco Editor
- Check `/frontend/next.config.ts` for settings
- Required for Canvas system in Sprint 4

---

## 🎯 IMMEDIATE NEXT STEPS

### 1. Environment Setup:
```bash
# Verify backend runs
make dev-backend
./scripts/validate-backend.sh

# Should see:
# ✅ Backend Health
# ✅ Database accessible
```

### 2. Start Sprint 1:
```bash
# Create feature branch
git checkout -b feat/sprint-1-foundation

# Review sprint plan
cat .claude_workspace/active-sprint-planning/vana-frontend-sprint-plan.md

# Begin implementation
cd frontend
npm install  # Ensure dependencies
npm run dev  # Start development
```

### 3. First PR Pattern:
```bash
# After implementing features
git add .
git commit -m "feat: Sprint 1 - Project foundation setup"
git push origin feat/sprint-1-foundation

# Create PR
gh pr create --title "Sprint 1: Foundation & Core Setup" \
  --body "@coderabbitai review" \
  --base main
```

---

## 📚 DOCUMENTATION LOCATIONS

### Project Docs:
- `/docs/` - General documentation
- `/docs/frontend/` - Frontend architecture
- `/docs/git-hooks/` - Git workflow docs

### Planning:
- `/.claude_workspace/active-sprint-planning/` - All sprint plans
- `/CLAUDE.md` - Claude configuration

### API:
- `/docs/API.md` - Backend API documentation
- FastAPI docs: http://localhost:8000/docs (when running)

---

## 🔧 TROUBLESHOOTING

### Common Issues:

1. **Backend won't start:**
```bash
# Check Python environment
uv sync
uv run --env-file .env.local uvicorn app.server:app --reload
```

2. **Frontend SSE not connecting:**
```bash
# Verify backend is running
curl http://localhost:8000/health
# Check CORS in browser console
```

3. **Memory issues (M3 MacBook):**
```bash
# Kill node processes
pkill -f node
# Use fewer agents
npx claude-flow --agents 2
```

---

## 🤖 AGENT RECOMMENDATIONS

### For Sprint 1 Implementation:
1. Focus on getting basic Next.js structure perfect
2. Ensure TypeScript strict mode from start
3. Setup shadcn/ui properly (use mcp__shadcn__ tools)
4. Create comprehensive component library foundation
5. Write tests as you go (80% coverage required)

### Use SPARC Modes:
```bash
# For architecture decisions
npx claude-flow sparc run architect "Design Sprint 1 component architecture"

# For implementation
npx claude-flow sparc run code "Implement Sprint 1 foundation"

# For testing
npx claude-flow sparc run tdd "Create Sprint 1 test suite"
```

### PR Strategy:
- Keep PRs focused (3-4 per sprint)
- Always tag @coderabbitai for review
- Use conventional commits
- Update documentation as you go

---

## 📞 SUPPORT & RESOURCES

### Key Links:
- **Repository:** https://github.com/NickB03/vana
- **Last PR:** https://github.com/NickB03/vana/pull/103
- **ADK Docs:** Query ChromaDB for `adk_documentation`
- **Claude Flow:** https://github.com/ruvnet/claude-flow

### Project IDs:
- **GCP Project:** analystai-454200
- **Project Number:** 960076421399
- **Region:** us-central1

---

## ✅ HANDOFF CHECKLIST

Before starting work:
- [ ] Read this entire document
- [ ] Review `/CLAUDE.md` for rules
- [ ] Check sprint plan in `.claude_workspace/`
- [ ] Verify backend runs with `make dev-backend`
- [ ] Run `./scripts/validate-backend.sh`
- [ ] Setup environment files from templates
- [ ] Review Phase 0 PR #103 for context

---

## 💡 FINAL NOTES

This project is in active development with a clear 12-week sprint plan. Phase 0 is complete, providing a solid foundation. The backend is fully functional, but the frontend needs to be rebuilt according to the sprint plan.

The most important thing: **Follow the sprint plan sequentially**. Each sprint builds on the previous one. Sprint 1 must be solid before moving to Sprint 2.

Good luck! The foundation is ready, and all blockers have been resolved. Time to build! 🚀

---

**Handoff prepared by:** Claude  
**Date:** 2025-08-23  
**Status:** Ready for next agent