# Agent Prompting Best Practices for VANA Integration
## Analysis of Industry-Leading AI Agent Systems

**Date**: July 11, 2025  
**Source**: Analysis of ai-system-prompt-examples repository  
**Purpose**: Extract and integrate best practices into VANA's Phase 2-4 expansion

---

## Executive Summary

Analysis of leading AI agent systems (Manus, Windsurf/Cascade, Cursor) reveals critical patterns for effective agent design. These patterns emphasize autonomous problem-solving, structured tool usage, intelligent memory management, and clear communication protocols that can significantly enhance VANA's multi-agent orchestration.

---

## 🎯 Core Agent Design Principles

### 1. Autonomous Problem-Solving Architecture

**Pattern**: Agents should operate with high autonomy while maintaining clear boundaries

```python
# Best Practice from Cursor
agent_instruction = """
Keep going until the user's query is completely resolved.
Make tool calls autonomously without waiting for user confirmation.
Only end turn when problem is fully addressed.
"""

# VANA Integration
class VanaSpecialistAgent:
    instruction = """
    You are an autonomous specialist in {domain}.
    1. Analyze the complete scope of the task
    2. Use available tools proactively to gather information
    3. Continue working until you have a complete solution
    4. Only return control when task is fully resolved or blocked
    """
```

### 2. Structured Tool Usage Patterns

**Pattern**: Clear categorization and purposeful tool invocation

```python
# Best Practice from Manus
tool_categories = {
    "information_gathering": ["file_read", "search_web", "find_in_content"],
    "action_execution": ["file_write", "shell_exec", "deploy"],
    "user_interaction": ["message_notify", "message_ask"],
    "state_management": ["browser_navigate", "shell_view"]
}

# VANA Integration for Phase 2
class ToolRegistry:
    """Enhanced tool categorization for specialists"""
    
    CATEGORIES = {
        "analysis": {
            "description": "Information processing and evaluation",
            "examples": ["analyze_code", "evaluate_design", "scan_vulnerabilities"]
        },
        "execution": {
            "description": "Direct actions and modifications",
            "examples": ["run_code", "write_file", "execute_command"]
        },
        "integration": {
            "description": "External service connections",
            "examples": ["api_call", "search_knowledge", "query_database"]
        },
        "utility": {
            "description": "Support and transformation functions",
            "examples": ["format_output", "validate_input", "transform_data"]
        }
    }
    
    def assign_tools_to_agent(self, agent_type: str) -> List[Tool]:
        """Assign tools based on agent specialization"""
        # Maximum 6 tools per agent (ADK best practice)
        return self.get_optimal_tool_mix(agent_type)
```

### 3. Context-Aware Communication

**Pattern**: Agents must understand and utilize contextual information

```python
# Best Practice from Windsurf
context_utilization = """
- Use metadata about open files and cursor position
- Reference previous interactions through memory
- Adapt responses based on user preferences
- Maintain awareness of project state
"""

# VANA Integration
class ContextAwareAgent(LlmAgent):
    def __init__(self):
        super().__init__(
            instruction="""
            Before responding:
            1. Check session.state for relevant context
            2. Query memory for user preferences
            3. Consider project metadata
            4. Adapt communication style based on history
            """,
            tools=[
                FunctionTool(get_session_context),
                FunctionTool(query_memory),
                FunctionTool(analyze_project_state)
            ]
        )
```

---

## 🧠 Memory Management Patterns

### 1. Intelligent Memory Creation

**Pattern**: Selective, high-value memory storage

```python
# Best Practice from Cursor
memory_criteria = {
    "relevance": "Must be applicable to future interactions",
    "generality": "Should apply across multiple contexts",
    "specificity": "Must be actionable, not vague",
    "persistence": "Should remain valuable over time"
}

# VANA Integration for Phase 4
class EnhancedMemoryAgent:
    def evaluate_memory_value(self, memory: str, context: dict) -> int:
        """Score memory from 1-5 based on Cursor's criteria"""
        score = 0
        
        # Relevance to domain
        if self.is_domain_relevant(memory, context):
            score += 1
            
        # General applicability
        if self.is_generally_applicable(memory):
            score += 2
            
        # Actionable specificity
        if self.contains_actionable_insight(memory):
            score += 2
            
        return min(score, 5)
    
    def store_memory(self, memory: str, score: int):
        """Only store memories with score >= 4"""
        if score >= 4:
            self.memory_store.add(memory, metadata={"score": score})
```

### 2. Memory Citation and Updates

**Pattern**: Track and update memories with proper attribution

```python
# VANA Integration
class MemoryManagement:
    """Enhanced memory handling for Phase 4"""
    
    def cite_memory(self, memory_id: str) -> str:
        """Format: <memory id='{memory_id}'>content</memory>"""
        return f"<memory id='{memory_id}'>{self.get_memory(memory_id)}</memory>"
    
    def update_contradicted_memory(self, old_id: str, new_content: str):
        """Replace outdated memories when new information contradicts"""
        self.mark_deprecated(old_id)
        return self.create_memory(new_content, replaces=old_id)
```

---

## 🔧 Tool Design Best Practices

### 1. Clear Function Signatures

**Pattern**: Explicit parameters with descriptive names

```json
// Best Practice from Manus tools.json
{
    "name": "file_str_replace",
    "description": "Replace text in a file (used for complex edits)",
    "parameters": {
        "filepath": "File path",
        "old_str": "String to replace (exact match required)",
        "new_str": "Replacement string"
    }
}
```

**VANA Integration**:
```python
def create_adk_tool(func: Callable) -> FunctionTool:
    """Enhanced tool creation with clear descriptions"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Add logging and validation
        log_tool_usage(func.__name__, args, kwargs)
        validate_parameters(func, args, kwargs)
        return func(*args, **kwargs)
    
    # Ensure clear parameter descriptions
    wrapper.__doc__ = generate_clear_description(func)
    return FunctionTool(wrapper)
```

### 2. Tool Composition Patterns

**Pattern**: Tools should be composable for complex operations

```python
# VANA Integration for Phase 3
class ComposableTools:
    """Enable tool chaining for workflow agents"""
    
    def chain_tools(self, *tools) -> CompositeTool:
        """Create a composite tool from multiple tools"""
        return CompositeTool(
            name=f"chain_{'_'.join(t.name for t in tools)}",
            steps=tools,
            description=f"Composite: {' -> '.join(t.description for t in tools)}"
        )
    
    # Example: Code analysis workflow
    analyze_and_fix = chain_tools(
        scan_vulnerabilities,
        generate_fix_suggestions,
        apply_fixes,
        run_tests
    )
```

---

## 🎭 Agent Personality and Behavior

### 1. Adaptive Communication Style

**Pattern**: Agents should adapt their communication based on context

```python
# Best Practice synthesis
communication_modes = {
    "technical": "Use precise technical language, include code examples",
    "explanatory": "Break down concepts, use analogies",
    "concise": "Minimal output, direct answers only",
    "detailed": "Comprehensive analysis with rationale"
}

# VANA Integration
class AdaptiveAgent(LlmAgent):
    def select_communication_mode(self, context: dict) -> str:
        """Choose communication style based on user preference and task type"""
        if context.get("user_preference"):
            return context["user_preference"]
        elif self.is_debugging_task():
            return "detailed"
        elif self.is_quick_query():
            return "concise"
        return "technical"  # default
```

### 2. Proactive vs Reactive Balance

**Pattern**: Know when to take initiative vs await instruction

```python
# VANA Integration for all Phases
class ProactivityManager:
    """Manage agent proactivity levels"""
    
    PROACTIVITY_LEVELS = {
        "high": {
            "auto_fix_errors": True,
            "suggest_improvements": True,
            "explore_alternatives": True
        },
        "medium": {
            "auto_fix_errors": True,
            "suggest_improvements": True,
            "explore_alternatives": False
        },
        "low": {
            "auto_fix_errors": False,
            "suggest_improvements": False,
            "explore_alternatives": False
        }
    }
    
    def should_take_action(self, action: str, level: str) -> bool:
        """Determine if agent should act autonomously"""
        return self.PROACTIVITY_LEVELS[level].get(action, False)
```

---

## 📋 Integration Recommendations for VANA

### Phase 2: Enhanced Tool Distribution

1. **Implement Tool Categories**
   ```python
   # In lib/_tools/__init__.py
   class ToolCategory(Enum):
       ANALYSIS = "analysis"
       EXECUTION = "execution"
       INTEGRATION = "integration"
       UTILITY = "utility"
   
   # In agents/specialists/base_specialist.py
   class BaseSpecialist(LlmAgent):
       def __init__(self, tool_categories: List[ToolCategory]):
           tools = ToolRegistry.get_tools_for_categories(tool_categories)
           super().__init__(tools=tools[:6])  # ADK limit
   ```

2. **Add Autonomous Problem-Solving**
   ```python
   # Update specialist instructions
   SPECIALIST_INSTRUCTION_TEMPLATE = """
   You are a {domain} specialist. Your approach:
   1. Fully understand the problem scope
   2. Use tools autonomously to gather needed information
   3. Continue until you have a complete solution
   4. Only return when task is resolved or genuinely blocked
   
   Your tools are categorized as:
   {tool_categories}
   
   Use them proactively without waiting for permission.
   """
   ```

### Phase 3: Workflow Enhancement

1. **Implement Composable Tools**
   ```python
   # In agents/orchestration/workflow_manager.py
   class WorkflowManager:
       def create_tool_pipeline(self, agent_sequence: List[Agent]):
           """Create efficient tool pipelines for workflows"""
           return ToolPipeline(
               agents=agent_sequence,
               optimization="parallel_where_possible"
           )
   ```

2. **Add Context Propagation**
   ```python
   # In lib/_shared_libraries/context_manager.py
   class EnhancedContextManager:
       def propagate_context(self, from_agent: str, to_agent: str):
           """Intelligent context passing between agents"""
           relevant_context = self.extract_relevant_context(
               source=from_agent,
               target=to_agent
           )
           return self.format_for_agent(relevant_context, to_agent)
   ```

### Phase 4: Advanced Memory

1. **Implement Scoring System**
   ```python
   # In agents/maintenance/memory_agent.py
   class MemoryAgent:
       def create_memory(self, content: str, context: dict):
           score = self.evaluate_memory_value(content, context)
           if score >= 4:  # High-value threshold
               return self.store_memory(content, {
                   "score": score,
                   "domain": context.get("domain"),
                   "created_by": context.get("agent"),
                   "citations": self.extract_citations(content)
               })
   ```

2. **Add Memory Evolution**
   ```python
   class MemoryEvolution:
       def update_memory_network(self):
           """Evolve memories based on usage patterns"""
           for memory in self.all_memories():
               if memory.contradicted_by_newer():
                   self.deprecate(memory)
               elif memory.frequently_accessed():
                   self.promote(memory)
               elif memory.never_accessed_in_30_days():
                   self.archive(memory)
   ```

---

## 🚀 Quick Wins for Immediate Implementation

### 1. Enhanced Agent Instructions (All Phases)
```python
# Template for all specialists
ENHANCED_SPECIALIST_TEMPLATE = """
You are the {name} specialist in the VANA system.

Core Principles:
- Operate autonomously within your domain
- Use tools proactively to solve problems completely
- Communicate clearly using appropriate technical level
- Remember: You have {tool_count} specialized tools - use them

Your specific expertise: {expertise}
Your tool categories: {tool_categories}

Approach every task with the goal of complete resolution.
"""
```

### 2. Tool Usage Logger (Phase 2)
```python
# Add to all agents
class ToolUsageLogger:
    def log_tool_call(self, agent: str, tool: str, params: dict, result: Any):
        """Track tool usage for optimization"""
        self.metrics.record({
            "agent": agent,
            "tool": tool,
            "success": result is not None,
            "timestamp": datetime.now(),
            "duration": self.measure_duration()
        })
```

### 3. Communication Style Adapter (Immediate)
```python
# Add to VANA Chat Agent
def adapt_response_style(self, raw_response: str, user_preference: str) -> str:
    """Adapt specialist responses to user preferences"""
    styles = {
        "verbose": lambda r: self.add_explanations(r),
        "concise": lambda r: self.extract_key_points(r),
        "technical": lambda r: self.add_technical_details(r),
        "simple": lambda r: self.simplify_language(r)
    }
    return styles.get(user_preference, lambda r: r)(raw_response)
```

---

## 📊 Success Metrics

### Phase 2 Metrics
- Tool usage efficiency: >80% successful first attempts
- Autonomous resolution rate: >70% without user clarification
- Context utilization: 100% of relevant context used

### Phase 3 Metrics
- Workflow completion rate: >90% 
- Tool composition usage: >50% of complex tasks
- Context propagation accuracy: >95%

### Phase 4 Metrics
- High-value memory ratio: >60% scored 4-5
- Memory citation rate: >30% in relevant responses
- Memory evolution efficiency: <10% deprecated monthly

---

## Conclusion

The analysis reveals that leading AI agents share common patterns around autonomy, intelligent tool usage, adaptive communication, and sophisticated memory management. By integrating these patterns into VANA's phased expansion, we can create a more capable and efficient multi-agent system that rivals industry leaders while maintaining ADK compliance.

The key differentiator will be VANA's hierarchical orchestration combined with these best practices, creating a system that's both powerful and maintainable.

---

*Next Steps: Implement Phase 2 enhancements with focus on tool categorization, autonomous problem-solving, and enhanced agent instructions.*