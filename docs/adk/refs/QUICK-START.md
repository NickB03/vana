# ADK Reference Library - Quick Start Guide

**⚡ Fast navigation to the most useful examples and patterns**

---

## 🏆 NEW: Agent Bake-Off Examples (Real-World Production Patterns)

The 4 newest repositories are from Google's AI Agent Bake-Off competition and showcase **production-ready patterns** not found in official samples:

### Quick Navigation to Bake-Off Examples

| Repository | Best For | Key Innovation |
|-----------|----------|----------------|
| **marcus-ng-cymbal-bank** | Hierarchical agents, WebSocket streaming | Root agent orchestrating 7+ specialized sub-agents |
| **luis-sala-agent-bakeoff** | Real-time audio/video, debugging tools | Comprehensive debugging with adaptive buffering |
| **brandon-hancock-agent-bakeoff** | A2A protocol, microservices architecture | 6 independent agents with orchestrator routing |
| **ayo-adedeji-finserv-agents** | Hybrid AI + algorithms, visual generation | Trust through algorithmic precision + AI understanding |

**Why Start Here?**
- ✅ Production-ready code (not just samples)
- ✅ Advanced patterns beyond official docs
- ✅ Real-world financial services use cases
- ✅ Full-stack implementations with security
- ✅ Innovative architectural approaches

---

## 🎯 I Want To...

### Build My First Agent
**Start Here:** `official-adk-samples/python/agents/`

```bash
cd docs/adk/refs/official-adk-samples/python/agents/
ls -la
# Explore: simple_agent/, tool_agent/, multi_agent/
```

**Key Files:**
- Simple agent example
- Tool integration examples
- Basic conversation patterns

---

### Create a Production-Ready Agent
**Start Here:** `agent-starter-pack/`

```bash
cd docs/adk/refs/agent-starter-pack/
cat README.md
# Review: src/base_template/, .github/workflows/, .cloudbuild/
```

**What You'll Find:**
- Complete project templates
- CI/CD pipelines (GitHub Actions + Cloud Build)
- Deployment configs (Cloud Run + Agent Engine)
- Authentication patterns
- Session management
- Data ingestion patterns

**Quick Command:**
```bash
# Create new agent from template
uvx agent-starter-pack create my-agent --output-dir ./my-agent
```

---

### Build a Multi-Agent System
**Start Here:** `brandon-hancock-agent-bakeoff/` (Production A2A) or `marketing-multi-agent-example/` (Progressive learning)

**Option 1: Production Multi-Agent with A2A**
```bash
cd docs/adk/refs/brandon-hancock-agent-bakeoff/
cat README.md
# 6 specialized agents with A2A protocol
# agents/: chat orchestrator + 5 domain agents
# frontend/: Next.js 15 + shadcn/ui
```

**Option 2: Progressive Learning**
```bash
cd docs/adk/refs/marketing-multi-agent-example/
ls -la
# Explore: 5-sessions-and-agents/, 7-agents-and-callbacks/
```

**Progressive Examples:**
1. `1-marketing_campaign_agent/` - Single agent
2. `2-tools_agent/` - Agent with tools
3. `5-sessions-and-agents/` - Multi-agent coordination
4. `7-agents-and-callbacks/` - Advanced patterns

**Option 3: Hierarchical Multi-Agent**
```bash
cd docs/adk/refs/marcus-ng-cymbal-bank/
cat README.md
# Hierarchical agent system with root orchestrator
# backend/no-name-agent/: 7+ specialized sub-agents
# frontend/: React + WebSocket streaming
```

---

### Implement Agent-to-Agent Communication
**Start Here:** `a2a-official-samples/`

```bash
cd docs/adk/refs/a2a-official-samples/
cat README.md
# Explore: samples/, demo/
```

**Key Directories:**
- `samples/` - A2A protocol examples
- `demo/` - Working demonstrations
- `notebooks/` - Interactive tutorials

**Also Check:** `a2a-multi-agent-samples/`
```bash
cd docs/adk/refs/a2a-multi-agent-samples/
# Progressive versions: version_1_simple/ → version_7_mcp_a2a_master/
```

---

### Build a Frontend for My Agent
**Start Here:** `frontend-nextjs-fullstack/`

```bash
cd docs/adk/refs/frontend-nextjs-fullstack/
cat README.md
# Explore: nextjs/, app/
```

**What You'll Find:**
- Next.js + ADK integration
- SSE streaming implementation
- Real-time chat UI
- Activity timeline component
- Make-based build system

**Key Files:**
- `nextjs/src/app/` - Next.js frontend
- `app/` - Python ADK backend
- `Makefile` - Build commands

**Run Example:**
```bash
cd docs/adk/refs/frontend-nextjs-fullstack/
make install  # Install dependencies
make dev      # Start dev servers
```

---

### Understand Core ADK Patterns
**Start Here:** `official-adk-python/`

```bash
cd docs/adk/refs/official-adk-python/
cat README.md
# Explore: src/google/adk/, tests/
```

**Key Directories:**
- `src/google/adk/` - Core ADK implementation
- `tests/` - Testing patterns
- `contributing/` - Development guidelines

**What to Study:**
- Agent base classes
- Tool integration patterns
- Session management
- Memory and context handling
- Streaming and SSE

---

### Deploy to Production
**Start Here:** `agent-starter-pack/`

```bash
cd docs/adk/refs/agent-starter-pack/
# Review deployment configs
cat .github/workflows/deploy.yml
cat .cloudbuild/deploy.yaml
```

**Deployment Targets:**
1. **Cloud Run:** `src/deployment_targets/cloud_run/`
2. **Agent Engine:** `src/deployment_targets/agent_engine/`

**Also Check:** `frontend-nextjs-fullstack/Makefile`
```bash
cd docs/adk/refs/frontend-nextjs-fullstack/
cat Makefile
# Review: deploy-backend, deploy-frontend targets
```

---

### Write Tests for My Agent
**Start Here:** `official-adk-python/tests/`

```bash
cd docs/adk/refs/official-adk-python/tests/
ls -la
# Explore: unit tests, integration tests, fixtures
```

**Also Check:** `agent-starter-pack/tests/`
```bash
cd docs/adk/refs/agent-starter-pack/tests/
# Review: test structure, mocking patterns
```

---

### Implement Tool Calling
**Start Here:** `official-adk-samples/python/agents/tool_agent/`

```bash
cd docs/adk/refs/official-adk-samples/python/agents/
# Find tool examples
```

**Also Check:** `marketing-multi-agent-example/2-tools_agent/`
```bash
cd docs/adk/refs/marketing-multi-agent-example/2-tools_agent/
# Real-world tool integration
```

---

### Handle Sessions and State
**Start Here:** `official-adk-python/src/google/adk/`

```bash
cd docs/adk/refs/official-adk-python/src/google/adk/
# Study: session management, state handling
```

**Also Check:** `marketing-multi-agent-example/5-sessions-and-agents/`
```bash
cd docs/adk/refs/marketing-multi-agent-example/5-sessions-and-agents/
# Real-world session patterns
```

---

### Implement Callbacks and Monitoring
**Start Here:** `marketing-multi-agent-example/7-agents-and-callbacks/`

```bash
cd docs/adk/refs/marketing-multi-agent-example/7-agents-and-callbacks/
# Study: callback patterns, monitoring, logging
```

---

### Implement Real-Time Streaming
**Start Here:** `luis-sala-agent-bakeoff/`

```bash
cd docs/adk/refs/luis-sala-agent-bakeoff/
cat README.md
# Real-time audio/video streaming with debugging tools
# static/live/: Modular web application
```

**Key Features:**
- Bidirectional audio streaming (16kHz input, 24kHz output)
- Video streaming (webcam + screen sharing)
- Advanced message queuing with priority handling
- Comprehensive debugging tools (browser console)
- Adaptive buffering for network resilience

**Debugging Commands:**
```javascript
// In browser console (F12)
checkTransmission()        // Quick status
debugTransmission()        // Detailed stats
monitorTransmission(30)    // Monitor for 30 seconds
setPlaybackVolume(0.5)     // Adjust volume
```

---

### Build Hybrid AI + Algorithm Systems
**Start Here:** `ayo-adedeji-finserv-agents/`

```bash
cd docs/adk/refs/ayo-adedeji-finserv-agents/
cat README.md
# Hybrid intelligence: AI for understanding + algorithms for precision
# a2a_agent/: Main agent with tools and visual generation
# ep2-sandbox/: Full-stack sandbox
```

**Key Innovation:**
- AI understands user intent
- Deterministic algorithms ensure calculation accuracy
- AI formats human-friendly responses
- Visual generation with Gemini 2.5 Flash (Nano Banana)

**Use Cases:**
- Financial calculations requiring precision
- Trust-building through transparency
- Visual goal connection for engagement
- Production security patterns

---

### Find Community Examples
**Start Here:** `awesome-adk-agents/`

```bash
cd docs/adk/refs/awesome-adk-agents/
cat README.md
# Browse: curated list of agents, templates, resources
```

**Also Check:** `awesome-a2a-protocol/`
```bash
cd docs/adk/refs/awesome-a2a-protocol/
cat README.md
# Browse: A2A resources, tools, implementations
```

---

## 📚 Learning Paths

### Path 1: Beginner → Production (Fast Track)
```bash
# 1. Learn basics (30 min)
cd docs/adk/refs/official-adk-samples/python/agents/
# Explore simple examples

# 2. Build first agent (1 hour)
cd docs/adk/refs/agent-starter-pack/
uvx agent-starter-pack create my-first-agent

# 3. Add frontend (1 hour)
cd docs/adk/refs/frontend-nextjs-fullstack/
# Study Next.js integration

# 4. Deploy (30 min)
cd docs/adk/refs/agent-starter-pack/
# Review deployment configs
```

### Path 2: Multi-Agent Systems (Deep Dive)
```bash
# 1. Single agent (30 min)
cd docs/adk/refs/marketing-multi-agent-example/1-marketing_campaign_agent/

# 2. Tools (30 min)
cd docs/adk/refs/marketing-multi-agent-example/2-tools_agent/

# 3. Multi-agent (1 hour)
cd docs/adk/refs/marketing-multi-agent-example/5-sessions-and-agents/

# 4. A2A communication (1 hour)
cd docs/adk/refs/a2a-official-samples/samples/

# 5. Advanced patterns (1 hour)
cd docs/adk/refs/a2a-multi-agent-samples/version_7_mcp_a2a_master/
```

### Path 3: Frontend Integration (UI Focus)
```bash
# 1. Study full-stack example (1 hour)
cd docs/adk/refs/frontend-nextjs-fullstack/
cat README.md
# Study: nextjs/, app/

# 2. Run example (30 min)
make install
make dev

# 3. Study SSE streaming (30 min)
# Review: nextjs/src/app/api/, nextjs/src/components/

# 4. Adapt to your project (2 hours)
# Apply patterns to Vana frontend
```

---

## 🔍 Quick Reference by File Type

### Python Agent Files
```bash
# Official examples
docs/adk/refs/official-adk-samples/python/agents/

# Core implementation
docs/adk/refs/official-adk-python/src/google/adk/

# Real-world examples
docs/adk/refs/marketing-multi-agent-example/
```

### Frontend Files (Next.js/React)
```bash
# Full-stack example
docs/adk/refs/frontend-nextjs-fullstack/nextjs/

# Starter pack frontend options
docs/adk/refs/agent-starter-pack/src/base_template/frontend/
```

### Deployment Configs
```bash
# GitHub Actions
docs/adk/refs/agent-starter-pack/.github/workflows/

# Cloud Build
docs/adk/refs/agent-starter-pack/.cloudbuild/

# Makefile-based
docs/adk/refs/frontend-nextjs-fullstack/Makefile
```

### Test Files
```bash
# Official tests
docs/adk/refs/official-adk-python/tests/

# Starter pack tests
docs/adk/refs/agent-starter-pack/tests/
```

---

## 💡 Pro Tips

### Searching Across All References
```bash
# Find all Python agent files
find docs/adk/refs -name "agent.py" -type f

# Find all tool examples
find docs/adk/refs -name "*tool*" -type f | grep -E "\.(py|java)$"

# Find all deployment configs
find docs/adk/refs -name "deploy*" -type f

# Find all test files
find docs/adk/refs -name "test_*.py" -type f
```

### Comparing Implementations
```bash
# Compare agent implementations
diff docs/adk/refs/official-adk-samples/python/agents/simple_agent/ \
     docs/adk/refs/marketing-multi-agent-example/1-marketing_campaign_agent/

# Compare deployment configs
diff docs/adk/refs/agent-starter-pack/.github/workflows/ \
     docs/adk/refs/frontend-nextjs-fullstack/.github/workflows/
```

### Updating References
```bash
# Update all references
cd docs/adk/refs
for dir in */; do
  echo "Updating $dir..."
  cd "$dir"
  git pull origin main || git pull origin master
  cd ..
done
```

---

## 🎓 Common Patterns

### Pattern: Simple Agent
**Location:** `official-adk-samples/python/agents/simple_agent/`
**Use When:** Building basic conversational agent

### Pattern: Tool-Using Agent
**Location:** `marketing-multi-agent-example/2-tools_agent/`
**Use When:** Agent needs to call external functions/APIs

### Pattern: Multi-Agent Orchestration
**Location:** `marketing-multi-agent-example/5-sessions-and-agents/`
**Use When:** Multiple specialized agents working together

### Pattern: A2A Communication
**Location:** `a2a-official-samples/samples/`
**Use When:** Agents need to communicate across services

### Pattern: Frontend Integration
**Location:** `frontend-nextjs-fullstack/`
**Use When:** Building UI for agent interaction

### Pattern: Production Deployment
**Location:** `agent-starter-pack/`
**Use When:** Deploying to Cloud Run or Agent Engine

---

## 📞 Need Help?

### Can't Find What You Need?
1. Check `README.md` for comprehensive index
2. Search across all repos: `grep -r "pattern" docs/adk/refs/`
3. Review `SUMMARY.md` for detailed descriptions

### Want to Add a Reference?
1. Clone into `docs/adk/refs/{descriptive-name}/`
2. Update `README.md` with description
3. Add to this quick-start guide

### Found a Better Example?
1. Update the relevant section
2. Document why it's better
3. Keep old reference for comparison

---

**Last Updated:** 2025-10-15
**Total References:** 14 repositories (10 original + 4 Agent Bake-Off)
**Total Examples:** 120+ agent examples, patterns, and templates
**NEW**: 4 production-ready Agent Bake-Off examples with advanced patterns

