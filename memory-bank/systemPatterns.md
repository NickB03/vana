# System Patterns - VANA Multi-Agent Architecture

## ✅ CONFIRMED WORKING STRUCTURE

### Directory Structure (VERIFIED WORKING)
```
/Users/nick/Development/vana/
├── agents/                  # Agents directory (working)
│   └── vana/               # Individual agent directory
│       ├── __init__.py     # Agent package init
│       ├── agent.py        # Agent entry point (working)
│       └── team.py         # Minimal agent implementation (working)
├── lib/                    # Supporting libraries
│   ├── _tools/            # Tool implementations (13 files exist)
│   ├── _shared_libraries/ # Shared utilities
│   └── _sub_agents/       # Sub-agent definitions
├── tools/                  # Additional tools
├── config/                 # Configuration
├── deployment/             # Deployment configurations
├── secrets/                # Environment secrets (working)
├── main.py                 # FastAPI server (working)
├── pyproject.toml         # Poetry configuration
├── poetry.lock            # Poetry lock file
├── requirements.txt       # Pip requirements
├── sessions.db            # Session database
├── .env                   # Environment variables (working)
└── memory-bank/           # Memory bank files
```

### Current Agent Configuration (WORKING)
```python
# agents/vana/team.py (MINIMAL WORKING VERSION)
from google.adk.agents import LlmAgent

root_agent = LlmAgent(
    name="vana",
    model="gemini-2.0-flash-exp",
    instruction="You are VANA, a basic AI assistant...",
    tools=[]  # No tools currently
)
```

### Environment Configuration (WORKING)
```bash
# .env (WORKING CONFIGURATION)
GOOGLE_GENAI_USE_VERTEXAI=False
GOOGLE_API_KEY=<configured>
VANA_MODEL=gemini-2.0-flash-exp
```

### Server Configuration (WORKING)
```python
# main.py (WORKING)
from google.adk.cli.fast_api import get_fast_api_app

app = get_fast_api_app(
    agents_dir="/Users/nick/Development/vana/agents",
    session_db_url="sqlite:///./sessions.db",
    allow_origins=["*"],
    web=True
)
```

## 🎯 PLANNED ARCHITECTURE RESTORATION

### Tool Types (TO BE RESTORED)
1. **Function Tools** (Basic)
   - File operations: read, write, list, exists
   - Search tools: vector, web, knowledge  
   - System tools: echo, health status

2. **Long Running Tools** (Advanced)
   - Approval workflows, dataset processing
   - Report generation, task status

3. **Agents-as-Tools** (22 Specialist Agents)
   - Architecture, UI, DevOps, QA specialists
   - Travel, research, development orchestrators
   - Intelligence and utility agents

4. **Third-Party Tools** (Integration)
   - LangChain/CrewAI integration
   - External tool registry

5. **Built-in Tools** (ADK Native)
   - Agent coordination, delegation
   - Status monitoring, health checks

### Google ADK Orchestration Patterns (TO BE IMPLEMENTED)
- Sequential Pipeline: Task → Agent1 → Agent2 → Result
- Parallel Fan-Out/Gather: Task → [Agent1, Agent2, Agent3] → Synthesis  
- Generator-Critic: Generate → Validate → Refine → Output
- Hierarchical Task Decomposition: Complex task → Subtasks → Execution
- Agents-as-Tools: Specialist agents wrapped as callable tools
