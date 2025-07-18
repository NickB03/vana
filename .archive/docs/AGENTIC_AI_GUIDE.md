# VANA Agentic AI Developer Guide

**Version**: 3.0  
**Phase**: 3 Complete  
**Updated**: July 11, 2025

## Overview

This guide provides comprehensive information for developers working with VANA's agentic AI system. Learn how to understand the hierarchical architecture, add new agents, implement tools, and contribute to the system's evolution.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Understanding Agent Hierarchy](#understanding-agent-hierarchy)
3. [Working with Agents](#working-with-agents)
4. [Tool Development](#tool-development)
5. [Testing Agents](#testing-agents)
6. [Phase Roadmap](#phase-roadmap)

## Architecture Overview

VANA implements a 5-level hierarchical agent system following Google ADK best practices:

```mermaid
graph LR
    subgraph "User Interface"
        User[fa:fa-user User]
    end
    
    subgraph "Level 1"
        Chat[VANA Chat<br/>2 tools]
    end
    
    subgraph "Level 2 ✨"
        Orch[Enhanced Orchestrator<br/>🚀 Routing + Cache<br/>📊 Metrics<br/>5 tools]
    end
    
    subgraph "Level 3 (Phase 4)"
        SEQ[Sequential PM]
        PAR[Parallel PM]
        LOOP[Loop PM]
    end
    
    subgraph "Level 4 ✅"
        ARCH[Architecture<br/>✅ 6 tools]
        SEC[🔴 Security<br/>ELEVATED<br/>✅ 4 tools]
        DEV[DevOps<br/>✅ 6 tools]
        DATA[Data Science<br/>✅ 6 tools]
        QA[QA (Phase 4)]
        UI[UI/UX (Phase 4)]
    end
    
    subgraph "Level 5 (Phase 4)"
        MEM[Memory Agent]
        PLAN[Planning Agent]
        LEARN[Learning Agent]
    end
    
    User -->|query| Chat
    Chat -->|delegate| Orch
    Orch ==>|"🔴 priority"| SEC
    Orch -->|route| ARCH
    Orch -->|route| DEV
    Orch -->|route| DATA
    Orch -.->|Phase 4| SEQ
    Orch -.->|Phase 4| PAR
    Orch -.->|Phase 4| LOOP
    Orch -.->|Phase 4| QA
    Orch -.->|Phase 4| UI
    Orch -.->|Phase 4| MEM
    Orch -.->|Phase 4| PLAN
    Orch -.->|Phase 4| LEARN
    
    style Chat fill:#e1f5fe
    style Orch fill:#fff3e0,stroke:#ff9800,stroke-width:3px
    style SEC fill:#ffebee,stroke:#f44336,stroke-width:3px
    style ARCH fill:#e8f5e9
    style DEV fill:#e8f5e9
    style DATA fill:#e8f5e9
    style SEQ fill:#f5f5f5,stroke-dasharray: 5 5
    style PAR fill:#f5f5f5,stroke-dasharray: 5 5
    style LOOP fill:#f5f5f5,stroke-dasharray: 5 5
    style QA fill:#f5f5f5,stroke-dasharray: 5 5
    style UI fill:#f5f5f5,stroke-dasharray: 5 5
    style MEM fill:#f5f5f5,stroke-dasharray: 5 5
    style PLAN fill:#f5f5f5,stroke-dasharray: 5 5
    style LEARN fill:#f5f5f5,stroke-dasharray: 5 5
```

### Key Principles

1. **Separation of Concerns**: Each agent has a specific role and limited tools
2. **Tool Distribution**: Maximum 6 tools per agent (ADK best practice)
3. **Hierarchical Routing**: Tasks flow down based on complexity
4. **Fault Tolerance**: Circuit breakers prevent cascading failures

## Understanding Agent Hierarchy

### Level 1: VANA Chat Agent

**File**: `agents/vana/team_agentic.py`

```python
vana_chat_agent = LlmAgent(
    name="VANA_Chat",
    model="gemini-2.5-flash",
    tools=[
        adk_transfer_to_agent,  # Delegate to orchestrator
        adk_analyze_task,       # Basic task understanding
    ],
    sub_agents=[master_orchestrator]
)
```

**Purpose**: User interface, conversation management  
**Key Responsibility**: Determine if task needs technical expertise

### Level 2: Enhanced Master Orchestrator (Phase 3 ✅)

**File**: `agents/vana/enhanced_orchestrator.py`

```python
class EnhancedOrchestrator:
    """Production-ready orchestrator with intelligent features"""
    
    def __init__(self):
        self.task_analyzer = EnhancedComplexityAnalyzer()
        self.response_cache = LRUCache(max_size=100)  # 40x speedup
        self.metrics = OrchestratorMetrics()          # <10% overhead
        self.specialists = {
            "architecture": architecture_specialist,    # 6 tools
            "security": security_specialist,           # 4 tools, ELEVATED
            "devops": devops_specialist,              # 6 tools
            "data_science": data_science_specialist   # 6 tools
        }
```

**Enhanced Features**:
- **🔴 Security Priority**: ELEVATED routing for security concerns
- **🚀 Response Cache**: 40x speedup for repeated queries
- **📊 Metrics Collection**: Performance tracking with <10% overhead
- **🎯 Intelligent Routing**: Context-aware specialist selection

**Complexity Analysis**:
- **SIMPLE**: Single tool execution (<100ms)
- **MODERATE**: Single specialist (200-500ms)
- **COMPLEX**: Multiple specialists (500ms-1s)
- **ENTERPRISE**: Workflow coordination (1-2s)

### Level 4: Working Specialist Agents (Phase 3 ✅)

Each specialist has real, functional tools:

```python
# Architecture Specialist - Real AST Analysis
architecture_specialist = LlmAgent(
    name="architecture_specialist",
    model="gemini-2.5-flash",
    tools=[
        detect_design_patterns,      # AST-based pattern detection
        analyze_dependencies,        # Real dependency graphs
        suggest_refactoring,        # Actionable improvements
        review_architecture,        # Comprehensive analysis
        generate_documentation,     # Auto-doc generation
        validate_structure         # Structure validation
    ]  # 6 real tools, not templates!
)

# 🔴 Security Specialist - ELEVATED Priority
security_specialist = LlmAgent(
    name="security_specialist",
    model="gemini-2.5-flash",
    tools=[
        scan_code_vulnerabilities,      # Real vulnerability detection
        validate_security_compliance,   # OWASP/PCI-DSS checks
        generate_security_report,       # Comprehensive reports
        assess_input_validation        # Input sanitization
    ]  # 4 security-focused tools
)

# DevOps Specialist - Config Generation
devops_specialist = LlmAgent(
    name="devops_specialist",
    model="gemini-2.5-flash",
    tools=[
        generate_ci_cd_pipeline,    # GitHub Actions, GitLab CI
        create_deployment_config,   # K8s manifests, Docker
        setup_monitoring,          # Prometheus/Grafana
        analyze_infrastructure,    # Current state analysis
        optimize_deployment,       # Performance tuning
        generate_iac              # Terraform/Ansible
    ]  # 6 infrastructure tools
)

# Data Science Specialist - Pure Python
data_science_specialist = LlmAgent(
    name="data_science_specialist",
    model="gemini-2.5-flash",
    tools=[
        analyze_data_simple,       # Statistics without pandas
        generate_data_insights,    # Pattern recognition
        clean_data_basic,         # Data preprocessing
        create_data_summary,      # Comprehensive summaries
        recommend_ml_approach,    # ML algorithm selection
        explain_statistical_concept  # Clear explanations
    ]  # 6 pure Python tools
)
```

## Working with Agents

### Adding a New Specialist Agent

1. **Create Agent File**:
```python
# agents/specialists/new_specialist.py
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

def specialist_tool(context: str) -> str:
    """Domain-specific functionality."""
    return f"Processed: {context}"

new_specialist = LlmAgent(
    name="new_specialist",
    model="gemini-2.5-flash",
    description="Expert in [domain]",
    instruction="You are an expert...",
    tools=[
        FunctionTool(specialist_tool),
        # Add up to 6 tools
    ]
)
```

2. **Register with Orchestrator**:
```python
# In agents/vana/team_agentic.py
from agents.specialists.new_specialist import new_specialist

master_orchestrator.sub_agents.append(new_specialist)
```

3. **Update Routing Logic**:
```python
# In agents/orchestration/hierarchical_task_manager.py
specialist_functions["new_domain"] = analyze_new_domain
```

### Agent Communication Patterns

#### Pattern 1: LLM Transfer (Preferred)
```python
# Agent decides to delegate
transfer_to_agent(agent_name="specialist_name")
```

#### Pattern 2: Direct Tool Call
```python
# Wrap agent as tool
from google.adk.tools import agent_tool
tools=[agent_tool.AgentTool(agent=specialist)]
```

#### Pattern 3: State Propagation
```python
# Use output_key for automatic state saving
agent = LlmAgent(
    name="agent",
    output_key="result_key",  # Saves to session.state
)
```

## Tool Development

### Creating ADK-Compatible Tools

1. **Basic Function Tool**:
```python
from google.adk.tools import FunctionTool

def my_tool(param1: str, param2: int = 10) -> str:
    """Tool description for LLM."""
    return f"Processed {param1} with {param2}"

adk_my_tool = FunctionTool(my_tool)
```

2. **Async Tool**:
```python
async def async_tool(query: str) -> str:
    """Async tool for I/O operations."""
    result = await external_api_call(query)
    return result

adk_async_tool = FunctionTool(async_tool)
```

3. **Tool with Context**:
```python
def context_aware_tool(data: str, tool_context=None) -> str:
    """Access session state via tool_context."""
    if tool_context:
        session_data = tool_context.session.state.get("key")
    return process_with_context(data, session_data)
```

### Tool Best Practices

1. **Clear Descriptions**: Help LLM understand when to use
2. **Type Hints**: Enable proper parameter inference
3. **Error Handling**: Return helpful error messages
4. **Idempotency**: Tools should be safe to retry

## Testing Agents

### Unit Testing Agents

```python
# tests/agents/test_specialist.py
import pytest
from agents.specialists.my_specialist import my_specialist

@pytest.mark.asyncio
async def test_specialist_routing():
    """Test specialist handles appropriate tasks."""
    context = create_test_context()
    result = await my_specialist.run_async(context)
    assert result.success
    assert "expected_output" in result.content
```

### Integration Testing

```python
# tests/integration/test_routing.py
def test_orchestrator_routing():
    """Test task routing to correct specialist."""
    task = "Design a microservices architecture"
    routing_decision = orchestrator.analyze_task(task)
    assert routing_decision.specialist == "architecture_specialist"
    assert routing_decision.complexity == "SIMPLE"
```

### Testing Checklist

- [ ] Agent responds to appropriate queries
- [ ] Tools execute correctly
- [ ] Error handling works
- [ ] Circuit breakers activate on failure
- [ ] State propagation functions

## Phase Progress

### Phase 1: Foundation ✅
- ✅ Activated dormant specialists
- ✅ Implemented hierarchical routing
- ✅ Basic task complexity analysis
- ✅ 5-level agent hierarchy

### Phase 2: Stabilization ✅
- ✅ Fixed thread safety issues
- ✅ Resolved import errors
- ✅ Enhanced error handling
- ✅ Comprehensive testing

### Phase 3: Code Enhancement ✅ 🎉
- ✅ Enhanced Orchestrator with caching/metrics
- ✅ 4 Working Specialists with real tools:
  - Architecture: AST analysis, pattern detection
  - Security: ELEVATED priority, vulnerability scanning
  - DevOps: CI/CD generation, K8s/Docker configs
  - Data Science: Pure Python statistics
- ✅ Performance: <1s average response
- ✅ Testing: 100% coverage

### Phase 4: Workflow Management (Next) 🚧
- ⏳ Sequential/Parallel/Loop workflow managers
- ⏳ Complex task orchestration
- ⏳ Multi-agent collaboration
- ⏳ QA and UI/UX specialists

### Phase 5: Intelligence & Learning 📅
- Memory Agent for context persistence
- Planning Agent for strategic planning
- Learning Agent for self-improvement
- Vector database integration

## Development Workflow

### 1. Quick Start (Phase 3 Ready!)
```bash
# One-command setup and run
make setup && make dev

# Or run enhanced backend directly
python main_agentic.py
```

### 2. Test Specialist Functionality
```bash
# Test all specialists
poetry run pytest -m "unit or agent" -v

# Test specific specialist
poetry run pytest tests/specialists/test_architecture_specialist.py -v

# Performance benchmarks
poetry run pytest tests/performance/ -v
```

### 3. Monitor Enhanced Features
```bash
# Watch orchestrator metrics
tail -f logs/vana.log | grep -E "(ELEVATED|Cache hit|Metrics)"

# View performance stats
python -c "from agents.vana.enhanced_orchestrator import get_orchestrator_stats; print(get_orchestrator_stats())"
```

### 4. Try Real Examples
```python
# Security (ELEVATED priority)
result = analyze_and_route("Check for SQL injection vulnerabilities")

# Architecture analysis
result = analyze_and_route("Analyze the design patterns in my codebase")

# DevOps automation
result = analyze_and_route("Generate a CI/CD pipeline for my Python project")

# Data analysis
result = analyze_and_route("Analyze this dataset and show statistics")
```

## Common Issues

### Issue: Agent Not Responding
**Solution**: Check agent registration in orchestrator

### Issue: Tool Not Found
**Solution**: Ensure tool is in agent's tool list (max 6)

### Issue: Routing Fails
**Solution**: Verify complexity analysis patterns match

### Issue: Circuit Breaker Open
**Solution**: Check failure threshold, wait for timeout

## Best Practices

1. **Keep Agents Focused**: Single responsibility principle
2. **Limit Tools**: 4-6 tools per agent maximum
3. **Clear Instructions**: Help LLM understand agent's role
4. **Test Routing**: Ensure tasks go to correct specialist
5. **Monitor Performance**: Track response times and success rates

## Contributing

1. Follow ADK patterns strictly
2. Add tests for new agents/tools
3. Update routing logic in orchestrator
4. Document in this guide
5. Submit PR with clear description

## Resources

- [Google ADK Documentation](https://github.com/google/adk)
- [VANA Architecture](./ARCHITECTURE.md)
- [Development Plan](.development/analysis/VANA_AGENTIC_AI_DEVELOPMENT_PLAN.md)
- [Phase 1 Report](.development/analysis/PHASE_1_IMPLEMENTATION_REPORT.md)

---

*Building the future of agentic AI, one specialist at a time.*