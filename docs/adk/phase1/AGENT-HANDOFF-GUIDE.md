# ADK Agent-to-Agent Handoff Implementation Guide

## Executive Summary

Based on Google's Agent Development Kit (ADK) official documentation and examples, this guide outlines the **recommended method for seamless agent-to-agent handoff** using ADK's built-in `transfer_to_agent` mechanism with **LLM-driven delegation**.

**Key Takeaway**: ADK uses an intelligent, LLM-powered routing system where agents automatically transfer control to peer agents based on conversation context, not manual sub-agent parent-child relationships.

---

## 🎯 Core Concept: LLM-Driven Agent Transfer

### What It Is

**LLM-Driven Delegation** is ADK's primary mechanism for agent handoff where:
1. The current agent's LLM analyzes the user's request
2. The LLM determines which peer agent is best suited to handle the request
3. The LLM generates a **function call**: `transfer_to_agent(agent_name='target_agent')`
4. ADK's Auto-Flow mechanism intercepts this call and **routes execution** to the target agent
5. The target agent receives full conversation history and context

### Why This Method?

- ✅ **Intelligent Routing**: LLM decides based on semantic understanding, not rigid rules
- ✅ **Seamless Context Transfer**: Conversation history automatically flows to next agent
- ✅ **Flexible Peer Relationships**: Agents are siblings, not parent-child (unlike sub-agents)
- ✅ **Natural Conversations**: Users experience smooth transitions without explicit handoff commands

---

## 📐 Architecture Pattern

### Hierarchical Multi-Agent Structure

```
Coordinator Agent (Root)
├── Researcher Agent (Peer/Sibling)
├── Travel Agent (Peer/Sibling)
├── Booking Agent (Peer/Sibling)
└── Info Agent (Peer/Sibling)
```

**Key Points**:
- **Coordinator** = Parent agent with routing logic
- **Peers** = Sibling agents at same hierarchy level
- **Transfer Scope**: Agents can transfer to:
  - Their parent
  - Their siblings (other sub-agents of same parent)
  - Their own sub-agents

---

## 💻 Implementation: Researcher → Travel Agent Example

### Complete Working Example

```python
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

# Define specialized peer agents
researcher_agent = LlmAgent(
    name="Researcher",
    model="gemini-2.0-flash",
    description="Handles research questions, factual inquiries, and general knowledge.",
    instruction="""You are a research specialist. Answer factual questions and
    provide detailed information. If the user asks about travel, vacation planning,
    hotels, or trips, transfer to the Travel agent."""
)

travel_agent = LlmAgent(
    name="Travel",
    model="gemini-2.0-flash",
    description="Handles travel planning, vacation recommendations, and trip bookings.",
    instruction="""You are a travel specialist. Help users plan trips, recommend
    destinations, and assist with travel logistics. If the user asks about research
    or factual information, transfer to the Researcher agent."""
)

# Define coordinator that manages peer agents
coordinator_agent = LlmAgent(
    name="Coordinator",
    model="gemini-2.0-flash",
    instruction="""You are a helpful coordinator. Route user requests to specialists:
    - Use Researcher agent for factual questions, research, and general knowledge
    - Use Travel agent for vacation planning, trips, hotels, and travel advice

    Transfer immediately when the user's intent matches a specialist.""",
    description="Main coordinator that routes to specialized agents.",
    sub_agents=[researcher_agent, travel_agent]  # Define peer relationship
)

# Initialize ADK runtime
session_service = InMemorySessionService()
runner = Runner(
    agent=coordinator_agent,
    session_service=session_service
)

# Example conversation demonstrating handoff
async def demonstrate_handoff():
    session_id = "demo_session_001"

    # User starts with research question
    print("User: What is the capital of France?")
    response1 = await runner.run(session_id, "What is the capital of France?")
    print(f"Agent: {response1.text}")  # Researcher handles this

    # User pivots to travel - automatic handoff occurs
    print("\nUser: I want to plan a trip there. What should I visit?")
    response2 = await runner.run(session_id, "I want to plan a trip there. What should I visit?")
    print(f"Agent: {response2.text}")  # Travel agent takes over seamlessly

    # User asks follow-up travel question - stays with Travel agent
    print("\nUser: What about hotels?")
    response3 = await runner.run(session_id, "What about hotels?")
    print(f"Agent: {response3.text}")  # Travel agent continues

# Run the demo
import asyncio
asyncio.run(demonstrate_handoff())
```

---

## 🔑 Key Implementation Details

### 1. Agent Relationship Definition

```python
# Define peers as siblings under coordinator
coordinator_agent = LlmAgent(
    name="Coordinator",
    sub_agents=[researcher_agent, travel_agent]  # Sibling relationship
)
```

**Critical**: The `sub_agents` list defines the **transfer scope**. Only agents in this list can be transferred to.

### 2. Agent Instructions for Handoff

```python
researcher_agent = LlmAgent(
    instruction="""... If the user asks about travel, vacation planning,
    hotels, or trips, transfer to the Travel agent."""
)
```

**Best Practice**: Explicitly tell the agent **when** and **to whom** to transfer in the instruction.

### 3. Auto-Flow Mechanism

ADK's Auto-Flow is **enabled by default** when `sub_agents` are present. It:
- Intercepts `transfer_to_agent` function calls
- Routes execution to target agent
- Preserves conversation history
- Returns control flow to user

**No manual implementation required** - ADK handles this automatically!

### 4. Context Sharing

```python
# Conversation history automatically transfers
# User's message: "I want to plan a trip there"
# - "there" refers to Paris from previous context
# - Travel agent receives full history to understand reference
```

**Automatic**: ADK passes `session.events` (conversation history) to the next agent.

---

## 🎨 Advanced Patterns

### Pattern 1: Explicit Transfer Tool

For more control, define a custom tool:

```python
from google.adk.tools import FunctionTool
from google.adk.context import ToolContext

def check_and_transfer(query: str, tool_context: ToolContext) -> str:
    """Check if query requires agent transfer."""
    # Custom logic for transfer decision
    if "urgent" in query.lower():
        tool_context.actions.transfer_to_agent("SupportAgent")
        return "Transferring to urgent support..."
    return "Handling query normally"

researcher_agent = LlmAgent(
    name="Researcher",
    tools=[FunctionTool(check_and_transfer)]
)
```

**Use Case**: When you need custom logic beyond LLM decision-making.

### Pattern 2: Conditional Routing

```python
coordinator_agent = LlmAgent(
    instruction="""Route based on these rules:
    1. If user mentions emergency, urgency, or critical → Transfer to SupportAgent
    2. If user asks about facts, research, data → Transfer to Researcher
    3. If user asks about travel, vacation, trip → Transfer to Travel
    4. If uncertain, stay with me and ask clarifying questions."""
)
```

**Use Case**: Multi-tier routing with fallback logic.

### Pattern 3: State-Based Handoff

```python
from google.adk.types import EventActions

def context_aware_transfer(tool_context: ToolContext) -> str:
    # Check session state for context
    user_history = tool_context.state.get("user:conversation_history", [])

    if len(user_history) > 5:
        # Transfer to specialized agent after extended conversation
        tool_context.actions.transfer_to_agent("SpecialistAgent")
        return "Connecting you with a specialist..."

    return "Continuing conversation"
```

**Use Case**: Transfer based on conversation length or session state.

---

## ⚠️ Common Pitfalls & Solutions

### Pitfall 1: Agent Not in Transfer Scope

**Problem**:
```python
coordinator = LlmAgent(sub_agents=[researcher_agent])
# Trying to transfer to travel_agent fails!
```

**Solution**: Ensure target agent is in `sub_agents` list:
```python
coordinator = LlmAgent(sub_agents=[researcher_agent, travel_agent])
```

### Pitfall 2: Ambiguous Instructions

**Problem**:
```python
instruction="Help users with questions."  # Too vague!
```

**Solution**: Be explicit about transfer conditions:
```python
instruction="""Answer research questions. If user asks about travel
(keywords: trip, vacation, hotel, destination), transfer to Travel agent."""
```

### Pitfall 3: Missing Context

**Problem**: Agent doesn't understand pronoun references ("there", "it", "that").

**Solution**: ADK automatically passes conversation history. Ensure your agent instruction acknowledges this:
```python
instruction="""You receive conversation history. Use context from previous
messages to understand user references."""
```

---

## 📊 Comparison: Sub-Agents vs Peer Transfer

| Aspect | Sub-Agents (Parent-Child) | Peer Transfer (Siblings) |
|--------|---------------------------|--------------------------|
| **Relationship** | Hierarchical (parent owns child) | Flat (siblings at same level) |
| **Use Case** | Task decomposition | Specialized domain routing |
| **Control Flow** | Parent orchestrates children | LLM decides routing |
| **Context** | Parent controls what child sees | Full history shared |
| **Example** | Planning → Research → Report | Researcher → Travel |

**Recommendation**: Use **Peer Transfer** (this guide) for domain switching (research → travel). Use **Sub-Agents** for task decomposition within a single domain.

---

## 🚀 Production Best Practices

### 1. Clear Agent Descriptions

```python
researcher_agent = LlmAgent(
    description="Handles research questions, factual inquiries, and general knowledge."
    # LLM reads this to decide when to transfer!
)
```

### 2. Logging & Observability

```python
from google.adk.callbacks import before_agent_callback, after_agent_callback

def log_transfer(context):
    agent_name = context.agent.name
    print(f"[Transfer] Now running: {agent_name}")
    return None  # Allow execution to continue

coordinator_agent = LlmAgent(
    before_agent_callback=log_transfer
)
```

### 3. Error Handling

```python
def safe_transfer_check(tool_context: ToolContext) -> str:
    try:
        if condition_for_transfer:
            tool_context.actions.transfer_to_agent("TargetAgent")
            return "Transferred successfully"
    except Exception as e:
        return f"Transfer failed: {str(e)}. Continuing with current agent."
```

### 4. Session Management

```python
# Use persistent session service in production
from google.adk.sessions import VertexAiSessionService

session_service = VertexAiSessionService(
    project_id="your-project",
    location="us-central1"
)
```

---

## 📚 References & Resources

### Official Documentation
- **Multi-Agent Systems**: https://google.github.io/adk-docs/agents/multi-agents/
- **LLM Agents**: https://google.github.io/adk-docs/agents/llm-agents/
- **Tools Overview**: https://google.github.io/adk-docs/tools/

### Examples in ADK Repository
- `examples/python/snippets/tools/overview/customer_support_agent.py`
- `examples/python/tutorial/agent_team/`

### Related GitHub Issues
- Agent Handoff Behavior: https://github.com/google/adk-python/issues/714
- Transfer_to_agent Discussion: https://github.com/google/adk-docs/issues/644

---

## ✅ Summary: The Recommended Method

**For seamless researcher → travel agent handoff:**

1. **Define both agents as peers** (siblings under a coordinator)
2. **Use LLM-driven delegation** (let the LLM decide when to transfer)
3. **Provide clear instructions** (tell agents when to transfer and to whom)
4. **Let ADK's Auto-Flow handle the mechanics** (automatic context transfer)
5. **Trust the conversation history** (agents automatically receive full context)

**Code Template**:
```python
coordinator = LlmAgent(
    name="Coordinator",
    instruction="Route to specialists: Researcher for facts, Travel for trips.",
    sub_agents=[researcher_agent, travel_agent]
)
```

That's it! ADK handles the rest automatically. 🎉

---

**Last Updated**: 2025-10-15
**ADK Version**: 1.8.0+
**Python Version**: 3.10+
