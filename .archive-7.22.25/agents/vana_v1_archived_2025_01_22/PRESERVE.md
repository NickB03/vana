# Components to Preserve in V2

## High Value (Unique to VANA) - MUST PRESERVE

### 1. Memory Detection System
**Location**: `/lib/_tools/memory_detection_patterns.py`
- 562 lines of sophisticated pattern matching
- Detects 12+ memory types:
  - USER_IDENTITY (name, occupation, location)
  - USER_PREFERENCE (likes, dislikes, favorites)
  - USER_GOAL (wants, needs, objectives)
  - TECHNICAL_PREFERENCE (tech stack, tools)
  - EXPERTISE (skills, experience levels)
  - CHALLENGE (current problems)
  - SUCCESS_PATTERN (what works well)
- Importance scoring (0.0-1.0)
- Validation logic for names and content

### 2. Memory Callbacks
**Location**: `/lib/agents/callbacks/memory_callbacks.py`
- `memory_detection_callback` - Runs after agent responses
- `memory_context_injection_callback` - Runs before agent execution
- Integrates with CallbackContext for state access

### 3. Memory Storage Tools
**Location**: `/lib/_tools/adk_memory_tool.py`
- Cross-session persistence using `user:` prefix
- Functions: save, retrieve, search, clear memories
- User context summarization

### 4. Custom Analysis Tools
**Location**: `/lib/_tools/`
- `adk_analyze_task.py` - Intelligent task analysis
- `adk_read_file.py` - File operations
- `adk_write_file.py` - File operations
- `adk_simple_execute_code.py` - Code execution

## Medium Value (Adapt for V2)

### 1. Agent Instructions/Personalities
Extract the unique parts of instructions:
- State variable usage: `{user:name?}`, `{user:role?}`
- Personalization patterns
- Domain expertise descriptions
- Tool selection guidance

### 2. Memory Service Integration
**Location**: `/lib/_shared_libraries/adk_memory_service.py`
- VertexAI RAG integration patterns
- Session state management
- Keep the integration approach, update implementation

## Low Value (Replace Completely)

### 1. Basic Agent Structure
- Simple LlmAgent definitions → Replace with SequentialAgent
- Flat orchestrator pattern → Replace with hierarchical workflows
- Factory functions → ADK examples have better patterns

### 2. Simple Routing Logic
- Current: LLM-based routing → Replace with deterministic BaseAgent
- No state passing → Add proper state management
- No workflow control → Add LoopAgent patterns

## Migration Strategy

### Phase 1: Extract & Preserve
```python
# Copy memory system to safe location
cp lib/_tools/memory_detection_patterns.py lib/_tools/memory_detection_patterns_v1.py
cp lib/agents/callbacks/memory_callbacks.py lib/agents/callbacks/memory_callbacks_v1.py
```

### Phase 2: Adapt for V2
1. Update callbacks to work with new agent structure
2. Integrate memory detection with ADK state patterns
3. Convert tool functions to proper FunctionTool format

### Phase 3: Enhanced Integration
- Add memory detection to multiple points in workflow
- Use callbacks for cross-agent memory sharing
- Implement memory-aware routing decisions