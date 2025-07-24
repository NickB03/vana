# VANA Archive & Replace Implementation Plan

## Overview
This plan outlines the structured approach to archive VANA's current agent implementation and replace it with ADK-native examples, preserving only the valuable unique components.

## Phase 1: Archive Current Implementation

### 1.1 Create Archive Structure
```bash
# Create archive directory with timestamp
mkdir -p agents/vana_v1_archived_2025_01_22
mkdir -p agents/vana_v1_archived_2025_01_22/specialists
mkdir -p agents/vana_v1_archived_2025_01_22/callbacks
```

### 1.2 Archive Agent Files
```bash
# Move all current agent implementations
mv agents/vana/*.py agents/vana_v1_archived_2025_01_22/
mv lib/agents/specialists/*.py agents/vana_v1_archived_2025_01_22/specialists/
mv lib/agents/callbacks/*.py agents/vana_v1_archived_2025_01_22/callbacks/

# Create archive README
echo "# VANA V1 Agent Implementation (Archived 2025-01-22)
This directory contains the original VANA agent implementation before the ADK-native refactor.
Preserved for reference and to extract valuable components." > agents/vana_v1_archived_2025_01_22/README.md
```

### 1.3 Document What to Preserve
Create `agents/vana_v1_archived_2025_01_22/PRESERVE.md`:
```markdown
# Components to Preserve in V2

## High Value (Unique to VANA)
1. **Memory Detection System** 
   - `/lib/_tools/memory_detection_patterns.py` (562 lines)
   - Sophisticated pattern matching for 12+ memory types
   - Importance scoring algorithm

2. **Memory Callbacks**
   - `/lib/agents/callbacks/memory_callbacks.py`
   - Automatic memory detection and storage
   - Context injection patterns

3. **Custom Tools**
   - `/lib/_tools/adk_memory_tool.py` - Memory storage/retrieval
   - `/lib/_tools/adk_analyze_task.py` - Task analysis
   - Other VANA-specific tools

## Medium Value (Can Adapt)
1. **Agent Instructions/Prompts**
   - Personality and context from specialists
   - State variable usage patterns
   - Domain-specific knowledge

## Low Value (Replace with ADK)
1. **Basic Agent Structure** - Use ADK examples
2. **Factory Functions** - ADK examples already have these
3. **Simple Orchestration** - Replace with SequentialAgent
```

## Phase 2: Obtain ADK Examples

### 2.1 Locate ADK Examples
```python
# Sources to check:
# 1. Google ADK GitHub samples
# 2. ADK documentation examples
# 3. agent-starter-pack repository

# Key examples needed:
- sequential_agent_example.py  # Code pipeline example
- loop_agent_example.py        # Iterative refinement example  
- multi_agent_example.py       # Hierarchical patterns
- callback_examples.py         # State management patterns
```

### 2.2 Create Clean Agent Directory
```bash
# Clean slate for new implementation
mkdir -p agents/vana_v2
mkdir -p agents/vana_v2/workflows
mkdir -p agents/vana_v2/specialists  
mkdir -p agents/vana_v2/core
```

## Phase 3: Build New Structure

### 3.1 Core System Architecture
```python
# agents/vana_v2/core/vana_system.py
from google.adk.agents import SequentialAgent, LlmAgent
from google.adk.agents.callback_context import CallbackContext

class VanaSystem(SequentialAgent):
    """Main VANA system using ADK-native patterns."""
    
    def __init__(self):
        super().__init__(
            name="vana_system",
            sub_agents=[
                self._create_request_analyzer(),
                self._create_workflow_router(),
                self._create_response_enhancer()
            ]
        )
```

### 3.2 Workflow Patterns
```python
# agents/vana_v2/workflows/research_workflow.py
research_workflow = SequentialAgent(
    name="research_workflow",
    sub_agents=[
        memory_context_loader,    # Load user context
        domain_knowledge_loader,  # Load VANA knowledge
        research_executor,        # Perform research
        source_validator,         # Validate sources
        response_formatter        # Format response
    ]
)
```

### 3.3 Memory Integration Points
```python
# agents/vana_v2/core/memory_integration.py

# 1. Before agent execution - inject context
def vana_context_injection_callback(callback_context: CallbackContext):
    """Load user and domain context before agent runs."""
    # Import preserved memory detection system
    from lib._tools.memory_detection_patterns import create_memory_detector
    # ... integrate memory loading

# 2. After agent execution - detect and save  
def vana_memory_collection_callback(callback_context: CallbackContext):
    """Detect and save important information."""
    # ... integrate memory detection
```

## Phase 4: Integration Steps

### 4.1 Week 1: Foundation
1. **Day 1-2**: Archive current implementation
2. **Day 3-4**: Set up ADK examples as base
3. **Day 5**: Integrate memory callbacks

### 4.2 Week 2: Enhancement  
1. **Day 1-2**: Port custom tools
2. **Day 3-4**: Adapt agent instructions
3. **Day 5**: Integration testing

### 4.3 Week 3: Migration
1. **Day 1-2**: A/B testing setup
2. **Day 3-4**: Gradual traffic migration
3. **Day 5**: Full cutover

## Phase 5: Validation Checklist

### Before Cutover
- [ ] All memory patterns working
- [ ] Custom tools integrated
- [ ] State management via callbacks
- [ ] Hierarchical workflows functional
- [ ] Quality scores improving
- [ ] Response times acceptable

### After Cutover
- [ ] Remove v1 imports
- [ ] Update documentation
- [ ] Archive v1 to cold storage
- [ ] Update deployment configs

## Implementation Commands

### Quick Start
```bash
# 1. Archive current
./scripts/archive_v1_agents.sh

# 2. Setup new structure
./scripts/setup_v2_agents.sh

# 3. Copy ADK examples
cp examples/sequential_agent.py agents/vana_v2/base/
cp examples/loop_agent.py agents/vana_v2/base/

# 4. Run tests
pytest tests/agents/v2/
```

## Risk Mitigation

1. **Parallel Running**: Keep v1 available during transition
2. **Feature Flags**: Toggle between v1/v2 per request
3. **Rollback Plan**: Simple import switch if issues
4. **Preserve State**: Memory data compatible between versions

## Success Metrics

1. **Code Reduction**: Expect 50% less code with ADK patterns
2. **Performance**: Target 20% faster response times
3. **Reliability**: Zero v1 pattern errors (parent conflicts, etc.)
4. **Maintainability**: Following Google's patterns exactly

## Next Immediate Steps

1. Create archive directories
2. Move current files
3. Find/download ADK examples
4. Create minimal proof-of-concept
5. Test memory integration

This approach gives us a clean ADK-native implementation while preserving VANA's unique value - the memory system and custom tools.