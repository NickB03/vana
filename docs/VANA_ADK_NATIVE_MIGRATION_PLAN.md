# VANA to ADK Native Migration Plan

## Executive Summary

This document outlines a comprehensive plan to migrate VANA from its current custom orchestration system to fully native ADK patterns. The migration will be executed in 11 phases over approximately 12 weeks, ensuring zero downtime and maintaining backward compatibility.

## Migration Objectives

1. Replace custom orchestration with ADK's native workflow agents (Sequential, Parallel, Loop)
2. Implement Pydantic models for all inter-agent communication
3. Enforce ADK's 6-tool limit per agent through tool consolidation
4. Migrate to ADK's native session management
5. Replace custom metrics with ADK callback patterns
6. Achieve better performance and maintainability

## Phase 1: Assessment and Preparation (Week 1)

### Components to Convert
- **Enhanced Orchestrator** (`enhanced_orchestrator.py`, `enhanced_orchestrator_v2.py`)
- **VANA Chat Agent** (`agents/vana/team.py`)
- **8 Specialist Agents** (all in `agents/specialists/`)
- **Custom State Management** (`lib/_shared_libraries/adk_memory_service.py`)
- **Tool Registry** (`lib/_tools/registry.py`)
- **Metrics System** (`lib/_shared_libraries/orchestrator_metrics.py`)

### Deliverables
- [x] Complete component inventory
- [ ] Dependency analysis document
- [ ] Risk assessment matrix
- [ ] Rollback procedures

## Phase 2: Pydantic Model Design (Week 1-2)

### Core Models to Create

```python
# Base Models
class ToolResult(BaseModel):
    tool_name: str
    success: bool
    result: Any
    error: Optional[str] = None
    execution_time_ms: float

class RoutingDecision(BaseModel):
    target_specialist: str
    confidence: float = Field(ge=0, le=1)
    reasoning: str
    is_security_critical: bool = False
    alternative_specialists: List[str] = []

class SpecialistResponse(BaseModel):
    specialist_name: str
    task_id: str
    success: bool
    result: str
    detailed_findings: Dict[str, Any]
    tools_used: List[ToolResult]
    confidence_score: float = Field(ge=0, le=1)
    recommendations: List[str]
    requires_human_review: bool = False
    execution_time_ms: float

# Specialist-Specific Models
class SecurityScanResult(BaseModel):
    vulnerabilities_found: int
    critical_issues: List[str]
    risk_score: float = Field(ge=0, le=10)
    affected_files: List[str]
    remediation_steps: List[str]

class ArchitectureAnalysis(BaseModel):
    component_map: Dict[str, List[str]]
    design_patterns: List[str]
    quality_score: float = Field(ge=0, le=100)
    dependencies: Dict[str, List[str]]
    improvement_suggestions: List[str]

class DataAnalysisResult(BaseModel):
    summary_statistics: Dict[str, float]
    insights: List[str]
    data_quality_score: float
    visualizations: List[str]  # URLs or base64
    anomalies_detected: List[Dict[str, Any]]
```

### Implementation Tasks
- [ ] Create `lib/models/` directory
- [ ] Implement all Pydantic models
- [ ] Add comprehensive validation
- [ ] Create model unit tests
- [ ] Document model usage

## Phase 3: Workflow Architecture Design (Week 2-3)

### New ADK-Native Architecture

```python
# Main Orchestrator Structure
from google.adk.agents import SequentialAgent, ParallelAgent, Agent

# Security pre-checker
security_checker = Agent(
    name="security_checker",
    model="gemini-2.0-flash",
    output_schema=SecurityCheckResult,
    output_key="security_check",
    instruction="Check for security keywords and threats..."
)

# Task analyzer
task_analyzer = Agent(
    name="task_analyzer",
    model="gemini-2.0-flash",
    output_schema=RoutingDecision,
    output_key="routing",
    instruction="Analyze task and determine routing..."
)

# Specialist coordinator (dynamic)
def create_specialist_coordinator(routing_decision):
    if routing_decision.requires_parallel:
        return ParallelAgent(
            name="specialist_pool",
            sub_agents=get_required_specialists(routing_decision)
        )
    else:
        return get_specialist(routing_decision.target_specialist)

# Result synthesizer
synthesizer = Agent(
    name="synthesizer",
    model="gemini-2.0-flash",
    output_schema=FinalResponse,
    instruction="Synthesize specialist results..."
)

# Main orchestrator
vana_orchestrator = SequentialAgent(
    name="vana_orchestrator",
    sub_agents=[
        security_checker,
        task_analyzer,
        # Dynamic specialist selection
        synthesizer
    ]
)
```

### Workflow Patterns

1. **Simple Query**: Security Check → Task Analysis → Single Specialist → Synthesis
2. **Complex Query**: Security Check → Task Analysis → Parallel Specialists → Synthesis
3. **Iterative Query**: Security Check → Task Analysis → Loop(Specialist → Reviewer) → Synthesis

## Phase 4: Specialist Agent Conversion (Week 3-5)

### Conversion Template

```python
from google.adk.agents import Agent
from lib.models import SpecialistResponse

def create_specialist(name: str, tools: List, instruction: str):
    """Factory for creating ADK-compliant specialists"""
    
    # Validate tool limit
    if len(tools) > 6:
        raise ValueError(f"{name} has {len(tools)} tools, max is 6")
    
    return Agent(
        name=name,
        model="gemini-2.0-flash",
        output_schema=SpecialistResponse,
        output_key=f"{name}_result",
        tools=tools,
        instruction=instruction
    )
```

### Tool Consolidation Strategy

#### Security Specialist (6 tools max)
1. `comprehensive_security_scan` (combines multiple scans)
2. `check_vulnerabilities` 
3. `analyze_dependencies`
4. `generate_security_report`
5. `check_authentication`
6. `assess_encryption`

#### Architecture Specialist (6 tools max)
1. `analyze_codebase_structure` (combines AST analysis)
2. `detect_design_patterns`
3. `evaluate_code_quality`
4. `check_dependencies`
5. `generate_architecture_diagram`
6. `suggest_improvements`

### Migration Order
1. Architecture Specialist (proof of concept)
2. Security Specialist (high priority)
3. Data Science & DevOps (parallel)
4. QA & UI/UX (parallel)
5. Content & Research (final)

## Phase 5: State Management Migration (Week 5-6)

### ADK Session Implementation

```python
from google.adk.sessions import SessionService
import redis
import json

class RedisSessionService(SessionService):
    """Production session service with Redis backing"""
    
    def __init__(self, redis_client):
        self.redis = redis_client
        self.ttl = 3600  # 1 hour
    
    def create_session(self, app_name, user_id, session_id, state=None):
        session_data = {
            "app_name": app_name,
            "user_id": user_id,
            "session_id": session_id,
            "state": state or {},
            "created_at": datetime.now().isoformat()
        }
        
        self.redis.setex(
            f"session:{session_id}",
            self.ttl,
            json.dumps(session_data)
        )
        
        return Session(app_name, user_id, session_id, state)
    
    def get_session(self, session_id):
        data = self.redis.get(f"session:{session_id}")
        if not data:
            return None
        
        session_data = json.loads(data)
        return Session(
            session_data["app_name"],
            session_data["user_id"],
            session_data["session_id"],
            session_data["state"]
        )
```

### State Structure

```python
# Standard VANA session state
{
    "user_id": "uuid",
    "conversation_id": "uuid",
    "routing_history": [
        {
            "timestamp": "2024-01-01T00:00:00Z",
            "query": "user query",
            "specialist": "security_specialist",
            "confidence": 0.95
        }
    ],
    "specialist_results": {
        "security_specialist": {...},
        "architecture_specialist": {...}
    },
    "metrics": {
        "total_queries": 10,
        "average_response_time_ms": 850,
        "tool_usage": {...}
    },
    "context": {
        "project_type": "web_app",
        "tech_stack": ["python", "react"],
        "security_level": "high"
    }
}
```

## Phase 6: Tool Registry Refactoring (Week 6-7)

### New Tool Organization

```python
# lib/tools/specialist_tools.py
from typing import Dict, List, Callable

class SpecialistToolRegistry:
    """Manages tools with ADK 6-tool limit"""
    
    def __init__(self):
        self.tools: Dict[str, List[Callable]] = {}
        self.extended_tools: Dict[str, List[Callable]] = {}
    
    def register_specialist_tools(
        self, 
        specialist: str, 
        primary_tools: List[Callable],
        extended_tools: List[Callable] = None
    ):
        if len(primary_tools) > 6:
            raise ValueError(f"Primary tools exceed limit: {len(primary_tools)}")
        
        self.tools[specialist] = primary_tools
        if extended_tools:
            self.extended_tools[specialist] = extended_tools
    
    def get_tools(self, specialist: str) -> List[Callable]:
        return self.tools.get(specialist, [])
    
    def create_extended_toolkit_agent(self, specialist: str):
        """Creates a sub-agent with extended tools"""
        extended = self.extended_tools.get(specialist, [])
        if not extended:
            return None
        
        return Agent(
            name=f"{specialist}_extended_toolkit",
            tools=extended[:6],  # Still respect limit
            instruction="Extended tools for specialized tasks"
        )
```

## Phase 7: Callback Implementation (Week 7-8)

### Unified Callback System

```python
# lib/callbacks/vana_callbacks.py
from datetime import datetime
from typing import Dict, Any

class VanaCallbacks:
    """ADK callbacks for monitoring and metrics"""
    
    @staticmethod
    def before_model_callback(messages, tools, tool_context):
        """Log model invocations"""
        metrics = tool_context.state.get("metrics", {})
        metrics["model_calls"] = metrics.get("model_calls", 0) + 1
        metrics["last_model_call"] = datetime.now().isoformat()
        
        # Log to external monitoring if configured
        if tool_context.state.get("enable_monitoring"):
            log_model_call(messages, tool_context.state.get("user_id"))
        
        tool_context.state["metrics"] = metrics
        return None
    
    @staticmethod
    def after_tool_callback(tool, args, tool_context, tool_response):
        """Track tool usage and performance"""
        tool_name = tool.__name__
        metrics = tool_context.state.get("metrics", {})
        
        tool_metrics = metrics.get("tool_usage", {})
        tool_metrics[tool_name] = tool_metrics.get(tool_name, 0) + 1
        
        # Track execution time if available
        if "execution_time_ms" in tool_response:
            perf = metrics.get("tool_performance", {})
            if tool_name not in perf:
                perf[tool_name] = []
            perf[tool_name].append(tool_response["execution_time_ms"])
            metrics["tool_performance"] = perf
        
        metrics["tool_usage"] = tool_metrics
        tool_context.state["metrics"] = metrics
        
        return tool_response
```

## Phase 8: API Layer Updates (Week 8-9)

### Updated FastAPI Integration

```python
# main.py updates
from google.adk.runners import Runner
from lib.models import VanaRequest, VanaResponse

class ADKNativeVana:
    def __init__(self):
        self.runner = Runner(
            agent=vana_orchestrator,
            session_service=RedisSessionService(redis_client)
        )
    
    async def process_request(
        self, 
        request: VanaRequest, 
        session_id: str
    ) -> VanaResponse:
        # Get or create session
        session = self.runner.session_service.get_session(session_id)
        if not session:
            session = self.runner.session_service.create_session(
                app_name="VANA",
                user_id=request.user_id,
                session_id=session_id,
                state={"context": request.context}
            )
        
        # Run with ADK
        result = await self.runner.run_async(
            query=request.query,
            session=session
        )
        
        # Convert to API response
        return VanaResponse(
            success=True,
            result=result.answer,
            specialist_used=result.state.get("routing", {}).get("target_specialist"),
            confidence=result.state.get("routing", {}).get("confidence"),
            session_id=session_id
        )
```

## Phase 9: Testing Strategy (Week 9-10)

### Test Categories

1. **Unit Tests**
   - All Pydantic models
   - Individual tools
   - Callback functions
   - Session management

2. **Integration Tests**
   - Workflow patterns
   - Agent communication
   - State propagation
   - Tool execution

3. **E2E Tests**
   - Common user scenarios
   - Complex queries
   - Error handling
   - Performance benchmarks

### Test Implementation

```python
# tests/test_adk_migration.py
import pytest
from google.adk.runners import Runner

class TestADKMigration:
    
    @pytest.fixture
    def runner(self):
        return Runner(agent=vana_orchestrator)
    
    def test_simple_routing(self, runner):
        result = runner.run("Check my code for security issues")
        assert result.state["routing"]["target_specialist"] == "security_specialist"
        assert result.state["security_check"]["is_critical"] == True
    
    def test_parallel_execution(self, runner):
        result = runner.run("Analyze architecture and create tests")
        assert "architecture_specialist_result" in result.state
        assert "qa_specialist_result" in result.state
    
    def test_tool_limit_enforcement(self):
        with pytest.raises(ValueError, match="exceed.*6"):
            create_specialist("bad_specialist", tools=[...] * 7, instruction="")
```

## Phase 10: Deployment Strategy (Week 10-11)

### Feature Flag Implementation

```python
# lib/config/feature_flags.py
class FeatureFlags:
    USE_ADK_NATIVE_ORCHESTRATOR = "use_adk_native_orchestrator"
    USE_PYDANTIC_MODELS = "use_pydantic_models"
    USE_ADK_SESSIONS = "use_adk_sessions"
    USE_CALLBACK_METRICS = "use_callback_metrics"
    
    @staticmethod
    def is_enabled(flag: str, user_id: str = None) -> bool:
        # Start with percentage rollout
        if flag == FeatureFlags.USE_ADK_NATIVE_ORCHESTRATOR:
            return hash(user_id) % 100 < 10  # 10% initially
        return False
```

### Rollout Plan

1. **Week 10**: 10% of traffic to new system
2. **Week 11**: 50% of traffic if metrics are good
3. **Week 12**: 100% deployment with instant rollback capability

### Monitoring Metrics

- Response time (target: <1s average)
- Success rate (target: >95%)
- Tool execution time
- Session size growth
- Memory usage
- Error rates by specialist

## Phase 11: Documentation and Training (Week 11-12)

### Documentation Updates

1. **Developer Guide**: ADK patterns and best practices
2. **API Documentation**: New request/response formats
3. **Operations Guide**: Monitoring and troubleshooting
4. **Migration Guide**: For external integrations

### Team Training

1. ADK fundamentals workshop
2. Pydantic model design patterns
3. Debugging ADK applications
4. Performance optimization techniques

## Success Criteria

1. **Performance**: No regression in response times
2. **Reliability**: Error rate <1%
3. **Scalability**: Support 10x current load
4. **Maintainability**: 50% reduction in custom code
5. **Developer Experience**: Faster feature development

## Risk Mitigation

### Technical Risks

1. **Tool Limit Constraints**
   - Mitigation: Tool consolidation and extended toolkit pattern
   
2. **State Size Growth**
   - Mitigation: TTL policies and selective state storage
   
3. **Model Behavior Changes**
   - Mitigation: Extensive testing and gradual rollout

### Rollback Plan

1. Feature flags enable instant rollback
2. Both systems run in parallel during transition
3. Session data is compatible between systems
4. Database migrations are reversible

## Timeline Summary

- **Weeks 1-2**: Foundation (Models, Architecture)
- **Weeks 3-5**: Core Implementation (Agents, Tools)
- **Weeks 6-8**: Infrastructure (State, Callbacks, API)
- **Weeks 9-10**: Testing and Validation
- **Weeks 11-12**: Deployment and Training

## Conclusion

This migration plan transforms VANA into a fully ADK-native system while maintaining stability and performance. The phased approach ensures minimal risk and allows for continuous validation at each step. Upon completion, VANA will be more maintainable, scalable, and aligned with Google ADK best practices.