# VANA Memory Implementation Plan

## 🎯 Objective
Implement proactive memory collection and cross-session persistence for VANA, enabling the system to remember important information like user names across sessions.

## 📋 Requirements (from user)
1. **Proactive Memory Saving**: System should automatically recognize and save important information
2. **Cross-Session Persistence**: Information persists across different sessions
3. **Memory Agent**: Background agent for memory collection and management  
4. **Test Case**: "My name is Nick" → New session → "Do you know my name?" → "Yes, it's Nick"

## 🏗️ Implementation Chunks

### Chunk 1.0: Memory Detection Patterns (30 min)
**Goal**: Create patterns to detect important information worth remembering

**Tasks**:
1. Create `/lib/_tools/memory_detection_patterns.py`
2. Implement pattern matching for:
   - User identity (name, preferences)
   - Important facts and relationships
   - User goals and context
   - Recurring topics
3. Create importance scoring system

**Validation**:
- Pattern correctly identifies "My name is X" statements
- Returns structured memory objects with importance scores
- Unit tests pass

### Chunk 1.1: Memory Storage Tool (45 min)
**Goal**: Create tool for agents to save memories using ADK state

**Tasks**:
1. Create `/lib/_tools/adk_memory_tool.py`
2. Implement functions:
   - `save_user_memory(key, value, context)` - Uses user: prefix
   - `retrieve_user_memory(key)` - Gets from user: state
   - `search_user_memories(query)` - Basic search
3. Integrate with `ToolContext.state`

**Validation**:
- Tool correctly saves to user: prefixed state
- Retrieval works across tool calls
- Search returns relevant memories

### Chunk 1.2: Agent Memory Integration (60 min)
**Goal**: Integrate memory detection and storage into agents

**Tasks**:
1. Create `/lib/agents/callbacks/memory_callbacks.py`
2. Implement `after_agent_callback` to:
   - Analyze agent responses for memorable info
   - Use detection patterns from Chunk 1.0
   - Call memory tool to save important info
3. Add callback to orchestrator and specialists

**Validation**:
- Agents detect "My name is Nick" in conversations
- Memory is saved with user: prefix
- Callbacks don't interfere with normal operation

### Chunk 1.3: Session Initialization with Memory (45 min)
**Goal**: Load user memories when sessions start

**Tasks**:
1. Create `/lib/_tools/session_memory_loader.py`
2. Implement session initialization hook
3. Load relevant user memories into agent context
4. Update agent instructions dynamically with user info

**Validation**:
- New sessions load user: prefixed data
- Agent instructions include user context
- Memory appears in agent responses

### Chunk 1.4: Memory Agent Implementation (90 min)
**Goal**: Create dedicated memory management agent

**Tasks**:
1. Create `/agents/vana/memory_agent.py`
2. Implement memory agent with:
   - Conversation analysis capabilities
   - Memory consolidation logic
   - Duplicate detection
   - Memory importance ranking
3. Add to orchestrator as background agent

**Validation**:
- Memory agent analyzes conversations
- Consolidates related memories
- Maintains memory quality

### Chunk 1.5: Enhanced Memory Search (60 min)
**Goal**: Implement semantic memory search

**Tasks**:
1. Enhance memory search in tool
2. Add memory context injection to agents
3. Implement relevance scoring
4. Add memory to agent decision making

**Validation**:
- Semantic search finds related memories
- Agents use memory context in responses
- Search performance is acceptable

### Chunk 1.6: Memory Persistence Testing (45 min)
**Goal**: Ensure cross-session persistence works

**Tasks**:
1. Create `/tests/test_cross_session_memory.py`
2. Test user: prefix persistence with:
   - InMemorySessionService (dev)
   - Mock VertexAiSessionService (prod simulation)
3. Test the specific user flow

**Validation**:
- Session 1: "My name is Nick" → Saved
- Session 2: "Do you know my name?" → "Yes, it's Nick"
- Tests pass with both session services

### Chunk 1.7: Memory UI Integration (Optional - 30 min)
**Goal**: Show memory status in responses

**Tasks**:
1. Add memory indicators to agent responses
2. Create memory summary tool
3. Add debug mode for memory visibility

**Validation**:
- Users can see when memories are saved
- Memory summary available on request
- Debug mode shows memory operations

### Chunk 1.8: Production Configuration (30 min)
**Goal**: Configure for production deployment

**Tasks**:
1. Update environment variables
2. Configure VertexAiSessionService
3. Set memory retention policies
4. Add memory metrics

**Validation**:
- Production config documented
- Memory limits configured
- Metrics collection enabled

## 🔄 Implementation Order
1. Start with Chunks 1.0-1.1 (Core memory functionality)
2. Then Chunk 1.2-1.3 (Agent integration)
3. Test with Chunk 1.6 (Verify persistence)
4. Enhance with Chunks 1.4-1.5 (Advanced features)
5. Polish with Chunks 1.7-1.8 (Production ready)

## 📊 Success Metrics
- ✅ User says "My name is Nick" → Automatically saved
- ✅ New session → "Do you know my name?" → "Yes, it's Nick"
- ✅ No manual memory management required
- ✅ Works with both dev and prod session services
- ✅ Scales to multiple users and memories

## 🚀 Quick Test Script
```python
# Test memory implementation
async def test_memory_flow():
    # Session 1
    runner1 = create_runner()
    response1 = await runner1.run("My name is Nick")
    assert "user:name" in session1.state
    
    # Session 2 (new session, same user)
    runner2 = create_runner(user_id=same_user)
    response2 = await runner2.run("Do you know my name?")
    assert "Nick" in response2.text
```

## 📝 Notes
- Uses ADK native patterns (no custom memory systems)
- Leverages user: prefix for cross-session persistence
- Callbacks for proactive detection
- Background memory agent for advanced features
- Compatible with existing VANA architecture