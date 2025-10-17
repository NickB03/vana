# Google ADK Reference Library

**Last Updated:** 2025-10-15

This directory contains a curated collection of high-quality reference repositories for Google Agent Development Kit (ADK) development. These references serve as authoritative examples and patterns for building production-ready AI agents in the Vana project.

---

## 📚 Table of Contents

- [Official Google ADK Repositories](#official-google-adk-repositories)
- [Agent-to-Agent (A2A) Communication](#agent-to-agent-a2a-communication)
- [Multi-Agent Patterns & Orchestration](#multi-agent-patterns--orchestration)
- [Frontend & Full-Stack Examples](#frontend--full-stack-examples)
- [Production Templates & Starter Packs](#production-templates--starter-packs)
- [Curated Resource Collections](#curated-resource-collections)
- [Quick Reference Guide](#quick-reference-guide)

---

## 🎯 Official Google ADK Repositories

### 1. **official-adk-python** 
**Repository:** [google/adk-python](https://github.com/google/adk-python)  
**Cloned:** 2025-10-15

The official Python SDK for Google's Agent Development Kit. This is the **primary reference** for ADK development.

**Key Features:**
- Complete ADK Python implementation
- Core agent patterns and abstractions
- Tool integration examples
- Session and state management
- Memory management patterns
- Streaming and SSE support
- Authentication patterns

**Use Cases:**
- Understanding core ADK architecture
- Learning official API patterns
- Reference for tool development
- Session management implementation
- Memory and context handling

**Key Files to Explore:**
- `src/google/adk/` - Core ADK implementation
- `examples/` - Official examples
- `tests/` - Testing patterns

---

### 2. **official-adk-samples**
**Repository:** [google/adk-samples](https://github.com/google/adk-samples)  
**Cloned:** 2025-10-15

Official collection of sample agents demonstrating various ADK capabilities and use cases.

**Key Features:**
- Ready-to-use agent examples
- Multi-agent workflows
- Tool integration patterns
- Real-world use case implementations
- Best practices demonstrations

**Use Cases:**
- Quick-start agent templates
- Learning agent composition
- Understanding tool usage
- Multi-agent coordination examples

**Key Directories:**
- `python/agents/` - Python agent examples
- `java/agents/` - Java agent examples

---

### 3. **official-adk-java**
**Repository:** [google/adk-java](https://github.com/google/adk-java)  
**Cloned:** 2025-10-15

Official Java SDK for ADK. Useful for understanding cross-language patterns and enterprise Java implementations.

**Key Features:**
- Java ADK implementation
- Enterprise patterns
- Type-safe agent development
- Spring Boot integration examples

**Use Cases:**
- Cross-language pattern comparison
- Enterprise Java patterns
- Type system reference

---

## 🔗 Agent-to-Agent (A2A) Communication

### 4. **a2a-official-samples**
**Repository:** [a2aproject/a2a-samples](https://github.com/a2aproject/a2a-samples)  
**Cloned:** 2025-10-15

Official A2A protocol samples demonstrating agent-to-agent communication patterns.

**Key Features:**
- A2A protocol implementation examples
- Inter-agent communication patterns
- Discovery and routing examples
- Security and authentication patterns
- Multi-agent coordination

**Use Cases:**
- Implementing A2A communication
- Agent discovery patterns
- Secure agent-to-agent messaging
- Distributed agent systems

**Key Directories:**
- `python/` - Python A2A examples
- `java/` - Java A2A examples
- `docs/` - A2A protocol documentation

---

### 5. **a2a-multi-agent-samples**
**Repository:** [theailanguage/a2a_samples](https://github.com/theailanguage/a2a_samples)  
**Cloned:** 2025-10-15

Community-driven A2A samples with advanced multi-agent orchestration patterns.

**Key Features:**
- Dynamic agent discovery
- Multi-agent orchestration
- ADK integration examples
- Real-world A2A scenarios

**Use Cases:**
- Advanced A2A patterns
- Dynamic agent systems
- Orchestration strategies

---

### 6. **awesome-a2a-protocol**
**Repository:** [ai-boost/awesome-a2a](https://github.com/ai-boost/awesome-a2a)  
**Cloned:** 2025-10-15

Curated list of A2A protocol resources, tools, and implementations.

**Key Features:**
- Comprehensive A2A resource directory
- Protocol specifications
- Implementation guides
- Community tools and libraries

**Use Cases:**
- Finding A2A tools and libraries
- Understanding A2A ecosystem
- Discovering community implementations

---

## 🤖 Multi-Agent Patterns & Orchestration

### 7. **marketing-multi-agent-example**
**Repository:** [AhsanAyaz/marketing-agents-adk](https://github.com/AhsanAyaz/marketing-agents-adk)  
**Cloned:** 2025-10-15

Real-world multi-agent system for marketing campaign automation.

**Key Features:**
- Multi-agent orchestration
- Specialized agent roles
- Workflow coordination
- Production-ready patterns

**Use Cases:**
- Multi-agent system design
- Agent specialization patterns
- Workflow orchestration
- Real-world agent collaboration

**Key Concepts:**
- Agent hierarchy
- Task delegation
- Result aggregation
- Context sharing

---

## 🎨 Frontend & Full-Stack Examples

### 8. **frontend-nextjs-fullstack**
**Repository:** [bhancockio/adk-fullstack-deploy-tutorial](https://github.com/bhancockio/adk-fullstack-deploy-tutorial)  
**Cloned:** 2025-10-15

Complete full-stack ADK application with Next.js frontend and deployment guide.

**Key Features:**
- Next.js + ADK integration
- SSE streaming implementation
- Real-time chat UI
- Activity timeline
- Production deployment patterns
- Make-based build system

**Use Cases:**
- Frontend-backend integration
- SSE streaming in React
- Real-time UI patterns
- Deployment strategies

**Key Files:**
- `backend/` - Python ADK backend
- `frontend/` - Next.js frontend
- `Makefile` - Build and deployment commands

---

## 🚀 Production Templates & Starter Packs

### 9. **agent-starter-pack**
**Repository:** [GoogleCloudPlatform/agent-starter-pack](https://github.com/GoogleCloudPlatform/agent-starter-pack)  
**Cloned:** 2025-10-15

**⭐ CRITICAL REFERENCE** - Official Google Cloud production-ready agent templates.

**Key Features:**
- Production-ready templates
- Cloud Run deployment
- Agent Engine deployment
- CI/CD pipelines (Cloud Build & GitHub Actions)
- Authentication patterns
- Session management
- Data ingestion patterns
- Frontend integration options

**Use Cases:**
- Starting new ADK projects
- Production deployment patterns
- CI/CD setup
- Cloud infrastructure templates
- Authentication implementation

**Key Directories:**
- `src/base_template/` - Core template structure
- `src/deployment_targets/` - Cloud Run, Agent Engine configs
- `.github/workflows/` - GitHub Actions
- `.cloudbuild/` - Cloud Build configs

**Template Enhancement:**
```bash
# Enhance existing agent with starter pack features
uvx agent-starter-pack enhance --adk -d agent_engine
```

---

## 📖 Curated Resource Collections

### 10. **awesome-adk-agents**
**Repository:** [Sri-Krishna-V/awesome-adk-agents](https://github.com/Sri-Krishna-V/awesome-adk-agents)
**Cloned:** 2025-10-15

Comprehensive curated collection of ADK agents, templates, and resources.

**Key Features:**
- Agent templates catalog
- Best practices documentation
- Community agent examples
- Tutorial links
- Tool integrations

**Use Cases:**
- Discovering community agents
- Finding agent templates
- Learning from community examples
- Exploring ADK ecosystem

---

## 🏦 Real-World Financial Services Examples (Agent Bake-Off)

### 11. **marcus-ng-cymbal-bank** (Cymbal Bank Orchestra)
**Repository:** [Marcus990/Cymbal-Bank-Orchestra](https://github.com/Marcus990/Cymbal-Bank-Orchestra)
**Cloned:** 2025-10-15
**Source:** Google Cloud AI Agent Bake-Off Episode 2

**⭐ FEATURED** - Comprehensive multi-agent banking platform with hierarchical agent architecture.

**Key Features:**
- **Hierarchical Multi-Agent System**: Root agent orchestrating 7+ specialized sub-agents
- **Real-time WebSocket Communication**: Streaming responses with text and audio support
- **Comprehensive Banking Features**: Accounts, transactions, goals, calendar scheduling
- **Modern React Frontend**: Real-time updates with interactive visualizations
- **Specialized Agents**:
  - Financial Agent (core banking operations)
  - Daily Spendings Agent (subscriptions, discounts, duplicate detection)
  - Big Spendings Agent (affordability analysis, mortgage eligibility)
  - Investments Agent (market data, financial news)
  - Calendar Agent (advisor appointments)
  - Transaction History Agent
  - Proactive Insights Agent

**Use Cases:**
- Hierarchical agent orchestration patterns
- WebSocket streaming implementation
- Multi-agent banking workflows
- Real-time financial insights
- Audio-enabled agent interactions

**Key Directories:**
- `backend/no-name-agent/` - Python ADK backend with agent hierarchy
- `frontend/` - React + TypeScript + Vite frontend
- `frontend/docs/` - Integration guides (permissions, speech-to-text, JSON tables)

**Technology Stack:**
- Backend: ADK, Gemini 2.0/2.5 Flash, FastAPI, WebSockets
- Frontend: React 18, TypeScript, Vite, Recharts, Tailwind CSS

---

### 12. **luis-sala-agent-bakeoff** (ADK Live Streaming)
**Repository:** [LuisSala/agent-bakeoff-ep2-vlad-and-luis](https://github.com/LuisSala/agent-bakeoff-ep2-vlad-and-luis)
**Cloned:** 2025-10-15
**Source:** Google Cloud AI Agent Bake-Off Episode 2

**⭐ FEATURED** - Advanced real-time multimodal streaming with comprehensive debugging tools.

**Key Features:**
- **Real-time Audio/Video Streaming**: Bidirectional audio + webcam/screen sharing
- **Advanced Message Queuing**: Priority-based message handling with overflow protection
- **Performance Monitoring**: Real-time queue health and transmission statistics
- **Comprehensive Debugging**: Built-in browser console tools for troubleshooting
- **Adaptive Buffering**: Dynamic buffer sizing based on network conditions
- **AudioWorklet Processing**: Low-latency audio in dedicated thread
- **Modular Architecture**: Clean separation of concerns with ES6 modules

**Use Cases:**
- Real-time audio/video streaming patterns
- WebSocket message queue optimization
- Performance monitoring and debugging
- Adaptive network handling
- Live API integration (16kHz input, 24kHz output)

**Key Directories:**
- `agents/` - Banking agent, A2A remote agent, live API agent
- `static/live/` - Modular web application with debugging tools
- `static/basic/` - Basic chat interface

**Technology Stack:**
- Backend: Python, ADK, FastAPI, WebSockets
- Frontend: Vanilla JS with modular architecture, AudioWorklet API
- Audio: 16kHz input, 24kHz output, adaptive buffering

**Debugging Tools:**
- `checkTransmission()` - Quick status check
- `debugTransmission()` - Detailed system status
- `monitorTransmission(seconds)` - Real-time monitoring
- `setPlaybackVolume(level)` - Audio control

---

### 13. **brandon-hancock-agent-bakeoff** (Multi-Agent Banking)
**Repository:** [bhancockio/ai_agent_bake_off_ep_2](https://github.com/bhancockio/ai_agent_bake_off_ep_2)
**Cloned:** 2025-10-15
**Source:** Google Cloud AI Agent Bake-Off 2025

**⭐ FEATURED** - Production-ready multi-agent orchestration with A2A protocol integration.

**Key Features:**
- **6 Specialized Agents**: Chat orchestrator + 5 domain-specific agents
- **A2A Protocol Integration**: Standardized agent-to-agent communication
- **Intelligent Routing**: Orchestrator routes queries to appropriate specialist
- **Next.js 15 + React 19**: Modern frontend with shadcn/ui components
- **Production Architecture**: Each agent on dedicated port with independent deployment
- **Cymbal Bank Integration**: Real backend service integration via A2A

**Agents:**
- Chat Orchestrator (port 8090) - Intelligent query routing
- Spending Agent (port 8081) - Transaction analysis and budgeting
- Perks Agent (port 8082) - Rewards and benefits management
- Portfolio Agent (port 8083) - Investment analysis and insights
- Goals Agent (port 8084) - Financial goal tracking
- Advisors Agent (port 8085) - Professional guidance services

**Use Cases:**
- Multi-agent orchestration patterns
- A2A protocol implementation
- Microservices-style agent deployment
- Domain-specific agent specialization
- Production agent architecture

**Key Directories:**
- `agents/` - 6 independent agent implementations with Makefile
- `frontend/` - Next.js 15 + shadcn/ui
- `refs/` - Reference materials and samples

**Technology Stack:**
- Backend: Python 3.10+, ADK, A2A Protocol, Gemini 2.5 Flash, uv package manager
- Frontend: Next.js 15.4.6, React 19, TypeScript, Tailwind CSS, shadcn/ui

---

### 14. **ayo-adedeji-finserv-agents** (Hybrid Intelligence)
**Repository:** [ayoisio/ep2-agent-bake-off-finserv-agents](https://github.com/ayoisio/ep2-agent-bake-off-finserv-agents)
**Cloned:** 2025-10-15
**Source:** Google Cloud AI Agent Bake-Off 2025

**⭐ FEATURED** - Innovative hybrid architecture combining AI with deterministic algorithms.

**Key Features:**
- **Hybrid Intelligence Architecture**: AI for understanding + algorithms for precision
- **3 Specialized Financial Agents**:
  - Daily Spending Agent (conversational financial companion)
  - Big Purchases Agent (AI + algorithmic precision for major purchases)
  - Travel Planning Agent (visual intelligence with Nano Banana/Gemini 2.5 Flash)
- **Visual Goal Connection**: Generative imagery for destinations and savings goals
- **Production-Grade Security**: Firebase Auth, Cloud Run, full GCP stack
- **Zero Hallucination**: Critical calculations always accurate via deterministic algorithms
- **Docker Deployment**: Full containerization with docker-compose

**Core Innovation:**
```
AI Layer (understanding) → Algorithmic Layer (precision) → AI Layer (formatting)
```

**Use Cases:**
- Hybrid AI + algorithmic architecture
- Financial calculation accuracy patterns
- Visual generation for user engagement
- Production security implementation
- Trust-building through transparency

**Key Directories:**
- `a2a_agent/` - Main agent implementation with tools and visual generation
- `a2a_example/` - A2A protocol examples (bake-off agent, Cymbal Bank agent, UI tool)
- `ep2-sandbox/` - Full-stack sandbox with backend/frontend/tests
- `characters/` - Team member avatars

**Technology Stack:**
- AI: Gemini 2.5 Flash (Nano Banana), Vertex AI
- Backend: FastAPI, Python 3.11, Pydantic
- Frontend: Next.js 14, TypeScript, Tailwind CSS
- Infrastructure: Cloud Run, Firebase Auth, Cloud Storage, Secret Manager
- Deployment: Docker, docker-compose

**Security Features:**
- Firebase Authentication with JWT
- Google Cloud ID tokens for service-to-service auth
- CORS configuration
- VPC Service Controls
- Encrypted data transmission

---

## 🔍 Quick Reference Guide

### By Use Case

| Use Case | Primary Reference | Secondary References |
|----------|------------------|---------------------|
| **Starting a new agent** | `agent-starter-pack` | `official-adk-samples` |
| **Multi-agent systems** | `brandon-hancock-agent-bakeoff` | `marcus-ng-cymbal-bank`, `marketing-multi-agent-example` |
| **Hierarchical agents** | `marcus-ng-cymbal-bank` | `marketing-multi-agent-example` |
| **A2A communication** | `a2a-official-samples` | `brandon-hancock-agent-bakeoff`, `awesome-a2a-protocol` |
| **Frontend integration** | `frontend-nextjs-fullstack` | `brandon-hancock-agent-bakeoff`, `agent-starter-pack` |
| **Real-time streaming** | `luis-sala-agent-bakeoff` | `marcus-ng-cymbal-bank` |
| **WebSocket patterns** | `marcus-ng-cymbal-bank` | `luis-sala-agent-bakeoff` |
| **Audio/video streaming** | `luis-sala-agent-bakeoff` | `marcus-ng-cymbal-bank` |
| **Financial services** | `ayo-adedeji-finserv-agents` | `marcus-ng-cymbal-bank`, `brandon-hancock-agent-bakeoff` |
| **Hybrid AI + algorithms** | `ayo-adedeji-finserv-agents` | N/A |
| **Visual generation** | `ayo-adedeji-finserv-agents` | N/A |
| **Core ADK patterns** | `official-adk-python` | `official-adk-samples` |
| **Production deployment** | `agent-starter-pack` | `ayo-adedeji-finserv-agents`, `brandon-hancock-agent-bakeoff` |
| **Production security** | `ayo-adedeji-finserv-agents` | `agent-starter-pack` |
| **Tool development** | `official-adk-python` | `official-adk-samples` |
| **Session management** | `official-adk-python` | `agent-starter-pack` |
| **Testing patterns** | `official-adk-python` | `agent-starter-pack` |
| **Debugging tools** | `luis-sala-agent-bakeoff` | N/A |

### By Technology

| Technology | References |
|-----------|-----------|
| **Python** | `official-adk-python`, `official-adk-samples`, `agent-starter-pack`, All Bake-Off examples |
| **Java** | `official-adk-java`, `a2a-official-samples` |
| **Next.js** | `frontend-nextjs-fullstack`, `brandon-hancock-agent-bakeoff`, `ayo-adedeji-finserv-agents` |
| **React** | `frontend-nextjs-fullstack`, `marcus-ng-cymbal-bank`, `brandon-hancock-agent-bakeoff` |
| **FastAPI** | `frontend-nextjs-fullstack`, `marcus-ng-cymbal-bank`, `ayo-adedeji-finserv-agents` |
| **WebSockets** | `marcus-ng-cymbal-bank`, `luis-sala-agent-bakeoff` |
| **AudioWorklet** | `luis-sala-agent-bakeoff` |
| **Firebase Auth** | `ayo-adedeji-finserv-agents` |
| **Docker** | `ayo-adedeji-finserv-agents` |
| **Cloud Run** | `agent-starter-pack`, `ayo-adedeji-finserv-agents` |
| **Agent Engine** | `agent-starter-pack` |
| **shadcn/ui** | `brandon-hancock-agent-bakeoff` |
| **Tailwind CSS** | `marcus-ng-cymbal-bank`, `brandon-hancock-agent-bakeoff`, `ayo-adedeji-finserv-agents` |

---

## 🎓 Learning Path

### Beginner
1. Start with `official-adk-samples` - Explore basic agent examples
2. Review `official-adk-python` - Understand core concepts
3. Try `agent-starter-pack` - Create your first production agent

### Intermediate
4. Study `frontend-nextjs-fullstack` - Learn frontend integration
5. Explore `brandon-hancock-agent-bakeoff` - Multi-agent orchestration with A2A
6. Review `marketing-multi-agent-example` - Multi-agent patterns
7. Study `marcus-ng-cymbal-bank` - Hierarchical agent architecture

### Advanced
8. Deep dive into `official-adk-python` source code
9. Study `ayo-adedeji-finserv-agents` - Hybrid AI + algorithmic architecture
10. Implement real-time streaming from `luis-sala-agent-bakeoff`
11. Study `agent-starter-pack` deployment patterns
12. Implement custom A2A patterns from `a2a-multi-agent-samples`

### Real-World Applications (Agent Bake-Off Examples)
13. **Financial Services**: Study all 4 bake-off examples for production patterns
14. **Hierarchical Systems**: `marcus-ng-cymbal-bank` for complex agent orchestration
15. **Real-time Communication**: `luis-sala-agent-bakeoff` for streaming and debugging
16. **Production Security**: `ayo-adedeji-finserv-agents` for enterprise-grade auth

---

## 📝 Notes for Vana Development

### Critical References for Vana
1. **agent-starter-pack** - Our deployment and CI/CD patterns should align with this
2. **frontend-nextjs-fullstack** - SSE streaming patterns match our implementation
3. **official-adk-python** - Core patterns for our agent implementations
4. **brandon-hancock-agent-bakeoff** - Multi-agent orchestration with A2A protocol
5. **marcus-ng-cymbal-bank** - Hierarchical agent patterns and WebSocket streaming
6. **luis-sala-agent-bakeoff** - Real-time streaming and debugging tools
7. **ayo-adedeji-finserv-agents** - Hybrid AI + algorithmic architecture for accuracy

### Patterns to Adopt
- ✅ Session management from `official-adk-python`
- ✅ SSE streaming from `frontend-nextjs-fullstack`
- ✅ Deployment patterns from `agent-starter-pack`
- 🔄 A2A communication from `brandon-hancock-agent-bakeoff` for peer transfer enhancements
- 🔄 Hierarchical orchestration from `marcus-ng-cymbal-bank` for complex agent systems
- 🔄 WebSocket streaming from `marcus-ng-cymbal-bank` for real-time features
- 🔄 Debugging tools from `luis-sala-agent-bakeoff` for development experience
- 🔄 Hybrid architecture from `ayo-adedeji-finserv-agents` for calculation accuracy
- 🔄 Production security from `ayo-adedeji-finserv-agents` (Firebase Auth, Cloud Run)

### Patterns Already Implemented
- ✅ FastAPI + ADK integration (similar to `frontend-nextjs-fullstack`)
- ✅ Next.js frontend with SSE (matches `frontend-nextjs-fullstack`)
- ✅ Session persistence (aligned with `official-adk-python`)
- ✅ Multi-agent dispatcher pattern (inspired by `official-adk-samples`)

### New Insights from Bake-Off Examples
- **Hierarchical vs. Flat**: `marcus-ng-cymbal-bank` shows benefits of hierarchical agent orchestration
- **Real-time Debugging**: `luis-sala-agent-bakeoff` demonstrates comprehensive debugging tools
- **A2A at Scale**: `brandon-hancock-agent-bakeoff` shows production A2A implementation
- **Trust through Precision**: `ayo-adedeji-finserv-agents` shows hybrid AI + algorithm approach
- **Visual Engagement**: `ayo-adedeji-finserv-agents` uses Gemini 2.5 Flash for visual generation

---

## 🔄 Maintenance

### Updating References
To update all references to their latest versions:

```bash
cd docs/adk/refs
for dir in */; do
  cd "$dir"
  git pull origin main || git pull origin master
  cd ..
done
```

### Adding New References
When adding new references:
1. Clone into `docs/adk/refs/{descriptive-name}/`
2. Update this README.md with description and use cases
3. Add to appropriate category
4. Update Quick Reference Guide tables

---

## 📚 Additional Resources

### Official Documentation
- [ADK Documentation](https://google.github.io/adk-docs/)
- [A2A Protocol Specification](https://google.github.io/A2A/)
- [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview)

### Community Resources
- [awesome-adk-agents](https://github.com/Sri-Krishna-V/awesome-adk-agents)
- [awesome-a2a](https://github.com/ai-boost/awesome-a2a)

---

**Repository Structure:**
```
docs/adk/refs/
├── README.md (this file)
│
├── # Official Google ADK
├── official-adk-python/          # Core Python SDK
├── official-adk-samples/         # Official examples
├── official-adk-java/            # Java SDK
│
├── # Production Templates
├── agent-starter-pack/           # Production templates ⭐
│
├── # A2A Communication
├── a2a-official-samples/         # A2A protocol samples
├── a2a-multi-agent-samples/      # Advanced A2A patterns
├── awesome-a2a-protocol/         # A2A resources
│
├── # Full-Stack Examples
├── frontend-nextjs-fullstack/    # Full-stack example
│
├── # Multi-Agent Patterns
├── marketing-multi-agent-example/ # Real-world multi-agent
│
├── # Community Resources
├── awesome-adk-agents/           # Community catalog
│
└── # Real-World Financial Services (Agent Bake-Off)
    ├── marcus-ng-cymbal-bank/           # Hierarchical banking agents ⭐
    ├── luis-sala-agent-bakeoff/         # Real-time streaming + debugging ⭐
    ├── brandon-hancock-agent-bakeoff/   # Multi-agent A2A orchestration ⭐
    └── ayo-adedeji-finserv-agents/      # Hybrid AI + algorithms ⭐
```

---

**For Questions or Contributions:**
- Review the specific repository's README for detailed documentation
- Check official ADK docs for latest patterns
- Refer to Vana's `docs/adk/` for project-specific implementations

