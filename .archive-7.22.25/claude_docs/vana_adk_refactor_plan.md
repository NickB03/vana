# VANA ADK-Compliant Refactoring Plan

## Executive Summary

This plan outlines a comprehensive refactoring of VANA's agent architecture to achieve 100% compliance with Google ADK standards as demonstrated in their official samples. The refactoring focuses on adopting hierarchical agent patterns, callback-based state management, and proper workflow orchestration while maintaining VANA's core functionality.

## Current Architecture Analysis

### ❌ Non-Compliant Patterns in VANA

1. **Flat Orchestrator Structure**
   ```python
   # Current VANA pattern
   orchestrator = LlmAgent(
       tools=[specialist1, specialist2, specialist3]  # Direct tool list
   )
   ```

2. **Basic Callback Usage**
   - Only using callbacks for memory detection
   - Not leveraging callbacks for state passing or flow control
   - No callback-based data collection between agents

3. **Limited State Management**
   - Minimal use of session.state for agent communication
   - State variables used mainly for templating, not data passing
   - No structured state keys for inter-agent communication

4. **No Workflow Agents**
   - Not using SequentialAgent, LoopAgent, or ParallelAgent
   - Missing hierarchical agent composition
   - No deterministic workflow patterns

## ADK-Compliant Architecture Design

### ✅ Target Architecture

```python
# ADK-compliant hierarchical structure
vana_system = SequentialAgent(
    name="vana_system",
    sub_agents=[
        request_analyzer,      # Determines request type and requirements
        specialist_router,     # Routes to appropriate specialist pipeline
        quality_controller     # Ensures response quality
    ]
)

# Each specialist becomes a workflow
research_pipeline = SequentialAgent(
    name="research_pipeline",
    sub_agents=[
        context_loader,        # Loads relevant context from memory/RAG
        research_executor,     # Performs actual research
        source_validator,      # Validates and cites sources
        response_formatter     # Formats final response
    ]
)
```

## Implementation Phases

### Phase 1: State Management Foundation

#### 1.1 Define State Schema
```python
# State keys for inter-agent communication
STATE_KEYS = {
    # Request Analysis
    "request_type": "request_type",           # simple_search, research, architecture, etc.
    "request_complexity": "request_complexity", # low, medium, high
    "user_intent": "user_intent",             # Parsed user intent
    
    # Context Management
    "user_context": "user_context",           # User preferences and history
    "domain_context": "domain_context",       # VANA-specific knowledge from RAG
    "search_results": "search_results",       # External search results
    
    # Workflow Control
    "specialist_selection": "specialist_selection",  # Which specialist to use
    "quality_score": "quality_score",         # Response quality assessment
    "needs_refinement": "needs_refinement",   # Boolean for loop control
    
    # Response Building
    "draft_response": "draft_response",       # Initial response
    "final_response": "final_response",       # Polished response
    "sources": "sources",                     # Citation information
}
```

#### 1.2 Callback Infrastructure
```python
def state_collection_callback(callback_context: CallbackContext) -> None:
    """Collects and structures data in state after agent execution."""
    agent_name = callback_context.agent_name
    
    if agent_name == "request_analyzer":
        # Extract request analysis results
        callback_context.state[STATE_KEYS["request_type"]] = extracted_type
        callback_context.state[STATE_KEYS["user_intent"]] = parsed_intent
    
    elif agent_name == "research_executor":
        # Collect research results
        callback_context.state[STATE_KEYS["search_results"]] = results
        callback_context.state[STATE_KEYS["sources"]] = sources
    
    return None  # Continue normal flow

def state_injection_callback(callback_context: CallbackContext) -> None:
    """Injects relevant state before agent execution."""
    # Make previous agent outputs available via state templating
    return None
```

### Phase 2: Hierarchical Agent Structure

#### 2.1 Request Analysis Layer
```python
class RequestAnalyzer(BaseAgent):
    """Deterministic agent that analyzes requests and populates state."""
    
    async def _run_async_impl(self, ctx: InvocationContext):
        user_message = ctx.new_message
        
        # Analyze request type
        request_type = self._determine_request_type(user_message)
        ctx.session.state[STATE_KEYS["request_type"]] = request_type
        
        # Extract user intent
        user_intent = self._parse_user_intent(user_message)
        ctx.session.state[STATE_KEYS["user_intent"]] = user_intent
        
        # Determine complexity
        complexity = self._assess_complexity(user_message)
        ctx.session.state[STATE_KEYS["request_complexity"]] = complexity
        
        yield Event(
            author=self.name,
            content=Content(parts=[Part(text=f"Request analyzed: {request_type}")]),
            actions=EventActions(state_delta={
                STATE_KEYS["request_type"]: request_type,
                STATE_KEYS["user_intent"]: user_intent,
                STATE_KEYS["request_complexity"]: complexity
            })
        )
```

#### 2.2 Specialist Router
```python
class SpecialistRouter(BaseAgent):
    """Routes to appropriate specialist pipeline based on request analysis."""
    
    def __init__(self, specialist_pipelines: Dict[str, BaseAgent]):
        super().__init__(name="specialist_router")
        self.specialists = specialist_pipelines
    
    async def _run_async_impl(self, ctx: InvocationContext):
        request_type = ctx.session.state.get(STATE_KEYS["request_type"])
        
        # Select appropriate specialist
        selected_specialist = self.specialists.get(request_type, self.specialists["default"])
        ctx.session.state[STATE_KEYS["specialist_selection"]] = selected_specialist.name
        
        # Execute the selected specialist pipeline
        async for event in selected_specialist.run_async(ctx):
            yield event
```

#### 2.3 Quality Control Loop
```python
quality_loop = LoopAgent(
    name="quality_refinement_loop",
    sub_agents=[
        response_evaluator,    # Evaluates response quality
        response_refiner,      # Refines if needed
    ],
    max_iterations=3
)

class ResponseEvaluator(LlmAgent):
    """Evaluates response quality and determines if refinement needed."""
    
    def __init__(self):
        super().__init__(
            name="response_evaluator",
            model="gemini-2.5-flash",
            instruction="""Evaluate the response quality.
            
            Response: {draft_response}
            User Intent: {user_intent}
            
            Score the response (1-10) and identify any issues.
            If score >= 8, set needs_refinement to false.
            """,
            output_key=STATE_KEYS["quality_score"],
            after_agent_callback=quality_assessment_callback
        )

def quality_assessment_callback(callback_context: CallbackContext) -> None:
    """Determines if refinement loop should continue."""
    quality_score = callback_context.state.get(STATE_KEYS["quality_score"], 0)
    
    if quality_score >= 8:
        callback_context.state[STATE_KEYS["needs_refinement"]] = False
        # Signal loop exit
        callback_context.actions.escalate = True
    else:
        callback_context.state[STATE_KEYS["needs_refinement"]] = True
```

### Phase 3: Specialist Pipeline Refactoring

#### 3.1 Research Specialist Pipeline
```python
research_pipeline = SequentialAgent(
    name="research_pipeline",
    sub_agents=[
        # Step 1: Load context
        LlmAgent(
            name="context_loader",
            instruction="Load relevant context from user history and domain knowledge",
            tools=[load_memory, retrieve_user_context],
            output_key=STATE_KEYS["domain_context"],
            after_agent_callback=context_collection_callback
        ),
        
        # Step 2: Execute research
        LlmAgent(
            name="research_executor",
            instruction="""Research the topic using available context and tools.
            Domain Context: {domain_context}
            User Intent: {user_intent}
            """,
            tools=[google_search],
            output_key=STATE_KEYS["search_results"],
            after_agent_callback=research_collection_callback
        ),
        
        # Step 3: Validate sources
        SourceValidator(),  # Custom BaseAgent for deterministic validation
        
        # Step 4: Format response
        LlmAgent(
            name="response_formatter",
            instruction="""Format the research results into a clear response.
            Results: {search_results}
            Sources: {sources}
            User Context: {user_context}
            """,
            output_key=STATE_KEYS["draft_response"]
        )
    ]
)
```

#### 3.2 Architecture Specialist Pipeline
```python
architecture_pipeline = SequentialAgent(
    name="architecture_pipeline",
    sub_agents=[
        # Load architectural patterns from VANA knowledge base
        pattern_loader,
        
        # Analyze requirements
        requirements_analyzer,
        
        # Design system architecture
        architecture_designer,
        
        # Validate against best practices
        architecture_validator,
        
        # Generate implementation guide
        implementation_guide_generator
    ]
)
```

### Phase 4: Advanced Callback Patterns

#### 4.1 Data Collection Callbacks
```python
def research_collection_callback(callback_context: CallbackContext) -> None:
    """Collects research data and structures it for downstream agents."""
    # Extract search results
    raw_results = callback_context.output
    
    # Structure results
    structured_results = {
        "primary_sources": extract_primary_sources(raw_results),
        "supporting_info": extract_supporting_info(raw_results),
        "citations": format_citations(raw_results)
    }
    
    # Store in state
    callback_context.state[STATE_KEYS["search_results"]] = structured_results
    callback_context.state[STATE_KEYS["sources"]] = structured_results["citations"]
```

#### 4.2 Flow Control Callbacks
```python
def conditional_routing_callback(callback_context: CallbackContext) -> Optional[Content]:
    """Routes execution based on conditions."""
    complexity = callback_context.state.get(STATE_KEYS["request_complexity"])
    
    if complexity == "low":
        # Skip detailed analysis for simple requests
        simple_response = generate_simple_response(callback_context)
        return Content(parts=[Part(text=simple_response)])
    
    # Continue with full pipeline for complex requests
    return None
```

### Phase 5: Memory and RAG Integration

#### 5.1 Memory-Aware Callbacks
```python
def memory_enrichment_callback(callback_context: CallbackContext) -> None:
    """Enriches agent context with memory before execution."""
    # Load user preferences
    user_prefs = load_user_preferences(callback_context.state)
    
    # Load domain knowledge
    domain_knowledge = query_vana_corpus(callback_context.state.get("user_intent"))
    
    # Inject into state
    callback_context.state["user_preferences"] = user_prefs
    callback_context.state["domain_knowledge"] = domain_knowledge
```

#### 5.2 RAG Strategy
```python
class VANAKnowledgeLoader(BaseAgent):
    """Loads VANA-specific knowledge from RAG corpus."""
    
    async def _run_async_impl(self, ctx: InvocationContext):
        query = ctx.session.state.get(STATE_KEYS["user_intent"])
        
        # Query VANA corpus for relevant knowledge
        knowledge = await self.rag_service.search(query)
        
        # Store in state for downstream agents
        ctx.session.state[STATE_KEYS["domain_context"]] = knowledge
        
        yield Event(
            author=self.name,
            content=Content(parts=[Part(text=f"Loaded {len(knowledge)} relevant documents")])
        )
```

## Migration Strategy

### Step 1: Create New Architecture (Side-by-Side)
1. Build new hierarchical structure in `/agents/vana/v2/`
2. Implement state management foundation
3. Create workflow agents for each specialist
4. Add comprehensive callbacks

### Step 2: Gradual Migration
1. Run both architectures in parallel
2. A/B test responses
3. Migrate traffic gradually
4. Monitor quality metrics

### Step 3: Deprecate Old Architecture
1. Remove flat orchestrator
2. Archive old specialist implementations
3. Update documentation
4. Clean up legacy code

## Key Benefits

1. **Reliability**: Deterministic workflow execution
2. **Debuggability**: Clear state flow between agents
3. **Extensibility**: Easy to add new specialists or modify pipelines
4. **Performance**: Parallel execution where appropriate
5. **Compliance**: 100% ADK-compliant patterns

## Success Metrics

1. **Response Quality**: Measured via quality_score in state
2. **Latency**: Track pipeline execution time
3. **Error Rate**: Monitor callback exceptions
4. **User Satisfaction**: Track via feedback collection
5. **ADK Compliance**: Automated pattern checking

## Next Steps

1. Review and approve this plan
2. Set up development environment for v2 architecture
3. Implement Phase 1 (State Management Foundation)
4. Create proof-of-concept for one specialist pipeline
5. Validate approach with ADK team if possible

---

This refactoring will transform VANA from a basic orchestrator pattern to a sophisticated, ADK-compliant multi-agent system that leverages the full power of Google's ADK framework.