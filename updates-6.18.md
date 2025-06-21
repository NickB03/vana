🎯 VANA Enhancement Plan v2.0 - Minimal & Realistic
Based on Actual Codebase Analysis
Version: 2.0
Date: June 19, 2025
Scope: Targeted improvements only - no unnecessary restructuring
Timeline: 2-3 weeks

📊 Actual Current State (Verified)
ComponentRealityStatusAgents7 agents (3 real + 4 proxy)✅ Working WellTools26 core ADK tools + 3 MCP tools✅ OperationalArchitectureSimple LlmAgent with conditional loading✅ No IssuesDeploymentCloud Run with Python 3.13✅ Live & StableMemorySession-based (non-persistent)⚠️ Enhancement OpportunityImport Issues1 sys.path.insert in team.py⚠️ Minor Fix Needed

🚀 Phase 1: Quick Fixes (2 Days)
1.1 Remove Single Import Hack
python# In agents/vana/team.py, remove line 34:
# DELETE: sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# No replacement needed - imports already work
1.2 Standardize Environment Variables
python# Create config/settings.py
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Model configuration
    vana_model: str = "gemini-2.0-flash-exp"

    # Google Cloud
    google_project_id: str
    google_location: str = "us-central1"

    # API Keys (from Secret Manager)
    openrouter_api_key: str = ""
    github_token: str = ""
    brave_api_key: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
1.3 Add Pre-commit Hooks
yaml# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.9
    hooks:
      - id: ruff
        args: [--fix]

  - repo: https://github.com/psf/black
    rev: 24.3.0
    hooks:
      - id: black
        language_version: python3.13

🚀 Phase 2: Add ADK-Native Memory (1 Week)
2.1 Implement Firestore Memory Service
python# lib/memory/firestore_memory.py
from google.adk.memory import BaseMemoryService, MemoryRecord
from google.cloud import firestore
from datetime import datetime
import json

class FirestoreMemoryService(BaseMemoryService):
    """ADK-native persistent memory using Firestore"""

    def __init__(self, collection_name: str = "vana_memories"):
        self.db = firestore.Client()
        self.memories = self.db.collection(collection_name)

    async def add_session_to_memory(
        self,
        session_id: str,
        content: str,
        metadata: dict
    ):
        """Store memory with automatic TTL"""
        doc_ref = self.memories.document()
        doc_ref.set({
            'session_id': session_id,
            'content': content,
            'metadata': metadata,
            'timestamp': datetime.now(),
            'ttl': datetime.now() + timedelta(days=30)  # 30-day TTL
        })

    async def search_memory(
        self,
        query: str,
        top_k: int = 5
    ) -> list[MemoryRecord]:
        """Simple keyword search - upgrade to vector search later"""
        memories = []

        # Query recent memories
        docs = (self.memories
                .where('ttl', '>', datetime.now())
                .order_by('timestamp', direction=firestore.Query.DESCENDING)
                .limit(50)
                .stream())

        for doc in docs:
            data = doc.to_dict()
            if query.lower() in data['content'].lower():
                memories.append(MemoryRecord(
                    content=data['content'],
                    metadata=data['metadata']
                ))

        return memories[:top_k]
2.2 Wire Memory into Main
python# main.py updates
from lib.memory.firestore_memory import FirestoreMemoryService
from google.adk.runner import Runner

# Initialize memory service
memory_service = FirestoreMemoryService()

# Create runner with memory
runner = Runner(
    agent=root_agent,
    memory_service=memory_service
)
2.3 Update SpecialistMemoryManager
python# Update agents/memory/specialist_memory_manager.py to use Firestore
# Instead of session_state, use the memory_service directly

🚀 Phase 3: Expand MCP Integration (1 Week)
3.1 Add High-Value MCP Tools
python# lib/_tools/adk_mcp_tools.py - add to existing file
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset

# Document processing
firecrawl_mcp = MCPToolset("https://mcp.firecrawl.dev/{API_KEY}/sse")

# Browser automation
playwright_mcp = MCPToolset("https://playwright.workers.dev/sse")

# Time utilities
time_mcp = MCPToolset("https://time-mcp.now.sh/mcp")

# Export new tools
__all__.extend(['firecrawl_mcp', 'playwright_mcp', 'time_mcp'])
3.2 Create MCP Configuration
python# config/mcp_config.py
MCP_SERVERS = {
    "firecrawl": {
        "url": "https://mcp.firecrawl.dev/{API_KEY}/sse",
        "needs_auth": True,
        "env_key": "FIRECRAWL_API_KEY"
    },
    "playwright": {
        "url": "https://playwright.workers.dev/sse",
        "needs_auth": False
    },
    "time": {
        "url": "https://time-mcp.now.sh/mcp",
        "needs_auth": False
    }
}

🚀 Phase 4: Performance Monitoring (3 Days)
4.1 Add Simple Metrics Collection
python# lib/monitoring/metrics.py
from datetime import datetime
import json

class SimpleMetrics:
    """Lightweight metrics without external dependencies"""

    def __init__(self, log_file="logs/metrics.jsonl"):
        self.log_file = log_file

    def log_request(self, agent: str, duration: float, tokens: int):
        metric = {
            "timestamp": datetime.now().isoformat(),
            "agent": agent,
            "duration_ms": duration * 1000,
            "tokens": tokens,
            "cost_estimate": tokens * 0.000002  # Rough estimate
        }

        with open(self.log_file, "a") as f:
            f.write(json.dumps(metric) + "\n")
4.2 Add Health Dashboard Endpoint
python# In main.py FastAPI app
@app.get("/metrics")
async def get_metrics():
    """Simple metrics dashboard data"""
    # Read last 100 metrics
    # Calculate averages
    # Return summary

📋 Implementation Checklist
Week 1

 Remove sys.path.insert (5 min)
 Create config/settings.py (30 min)
 Setup pre-commit hooks (30 min)
 Implement FirestoreMemoryService (2 hours)
 Wire memory into main.py (1 hour)
 Test memory persistence (1 hour)

Week 2

 Add 3 new MCP tools (2 hours)
 Create MCP configuration (1 hour)
 Update tool imports in team.py (30 min)
 Add metrics collection (2 hours)
 Create metrics endpoint (1 hour)

Week 3

 Performance testing (1 day)
 Documentation updates (1 day)
 Deploy to production (1 day)

🎯 Success Metrics

Memory Persistence: Users can reference previous conversations
Tool Expansion: 6+ total MCP tools integrated
Performance: Response time remains < 5s
Stability: Zero new deployment failures
Simplicity: No external infrastructure added
