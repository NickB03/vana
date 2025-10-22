# Multi-Agent System Optimization Guide

## Overview

This guide provides comprehensive strategies for optimizing your Vana multi-agent system for performance, cost-efficiency, and scalability. The optimizations address the key bottlenecks identified in the current architecture.

## Table of Contents

1. [Performance Analysis](#performance-analysis)
2. [Optimization Modules](#optimization-modules)
3. [Integration Guide](#integration-guide)
4. [Best Practices](#best-practices)
5. [Monitoring & Metrics](#monitoring--metrics)

---

## Performance Analysis

### Current Architecture

```
dispatcher_agent (root)
├── generalist_agent (simple Q&A)
└── interactive_planner_agent (research coordinator)
    └── research_pipeline (sequential execution)
        ├── section_planner
        ├── section_researcher (with brave_search)
        ├── iterative_refinement_loop (max 5 iterations)
        │   ├── research_evaluator
        │   ├── escalation_checker
        │   └── enhanced_search_executor
        └── report_composer
```

### Identified Bottlenecks

1. **Sequential Execution** (app/agent.py:435-456)
   - Impact: Research time scales linearly with complexity
   - Solution: Parallel execution framework

2. **Context Window Waste** (app/agent.py:274, 406)
   - Impact: Token waste, slower processing
   - Solution: Intelligent context compression

3. **No Cost Tracking**
   - Impact: Unpredictable costs at scale
   - Solution: Comprehensive cost optimizer

4. **No Result Caching**
   - Impact: Redundant API calls
   - Solution: Context caching system

---

## Optimization Modules

### 1. Cost Optimizer (`app/monitoring/cost_optimizer.py`)

**Purpose**: Track token usage, manage budgets, and optimize model selection.

**Key Features**:
- Token usage tracking by agent and model
- Daily/monthly budget enforcement
- Adaptive model selection based on task complexity
- Cost forecasting and alerting

**Usage**:
```python
from app.monitoring import get_cost_optimizer

# Initialize
optimizer = get_cost_optimizer()

# Record usage
result = optimizer.record_usage(
    agent_name="section_researcher",
    model="gemini-2.0-flash-exp",
    input_tokens=1500,
    output_tokens=800,
    cached_tokens=200,
    session_id="session_123"
)

# Check budget
if not result["within_budget"]:
    print(f"Budget alert: {result['budget_message']}")

# Get analytics
analytics = optimizer.get_agent_analytics("section_researcher")
print(f"Total cost: ${analytics['total_cost']:.4f}")
print(f"Cache hit rate: {analytics['cache_hit_rate']:.1%}")
```

**Configuration**:
```python
optimizer = CostOptimizer(
    daily_budget=10.0,     # $10/day limit
    monthly_budget=300.0,  # $300/month limit
    enable_adaptive_selection=True  # Auto-select cheaper models when approaching limit
)
```

### 2. Parallel Executor (`app/optimization/parallel_executor.py`)

**Purpose**: Execute independent agent operations concurrently.

**Key Features**:
- Concurrent tool execution (e.g., multiple search queries)
- Thread-safe parallel task management
- Automatic timeout handling
- Performance metrics and speedup tracking

**Usage**:
```python
from app.optimization import get_search_parallelizer

# Parallelize search queries
parallelizer = get_search_parallelizer()

search_queries = [
    "quantum computing applications 2025",
    "quantum error correction techniques",
    "quantum computing industry leaders",
    "quantum vs classical computing",
]

# Execute all searches in parallel
results = parallelizer.execute_searches(
    search_queries=search_queries,
    search_function=brave_search,  # Your search function
)

# Process results
for query, result, error in results:
    if error:
        print(f"Search failed for '{query}': {error}")
    else:
        print(f"Search succeeded for '{query}': {len(result)} results")

# Check metrics
metrics = parallelizer.get_metrics()
print(f"Speedup: {metrics['speedup_factor']:.2f}x")
```

**For General Tasks**:
```python
from app.optimization import get_parallel_executor

executor = get_parallel_executor()

# Define tasks
def task1():
    return process_section_1()

def task2():
    return process_section_2()

def task3():
    return process_section_3()

# Execute in parallel
results = executor.execute_parallel(
    tasks=[task1, task2, task3],
    task_ids=["section_1", "section_2", "section_3"],
    timeout=30.0
)

# Check results
for result in results:
    if result.success:
        print(f"{result.task_id} completed in {result.duration_ms:.0f}ms")
    else:
        print(f"{result.task_id} failed: {result.error}")
```

### 3. Context Optimizer (`app/optimization/context_optimizer.py`)

**Purpose**: Manage context windows intelligently to reduce token usage.

**Key Features**:
- Semantic context compression
- Importance-based chunk retention
- Context caching and reuse
- Dynamic truncation with start/end preservation

**Usage**:
```python
from app.optimization import get_context_optimizer

optimizer = get_context_optimizer()

# Optimize agent context
optimized_context, metrics = optimizer.optimize_agent_context(
    agent_name="section_researcher",
    instruction=agent_instruction,
    session_state=session.state,
    events=session.events,
    max_tokens=8000  # Target 8K tokens instead of full 32K
)

print(f"Compressed from {metrics['original_tokens']} to {metrics['compressed_tokens']} tokens")
print(f"Compression ratio: {metrics['compression_ratio']:.1%}")

# Semantic truncation for long text
truncated_text, metrics = optimizer.semantic_truncate(
    text=long_research_report,
    max_tokens=4000,
    preserve_start=500,  # Keep first 500 tokens
    preserve_end=500     # Keep last 500 tokens
)
```

---

## Integration Guide

### Integrating Cost Tracking into Callbacks

**Before** (`app/enhanced_callbacks.py`):
```python
def after_agent_callback(callback_context: CallbackContext) -> None:
    # ... existing code ...
    execution_time = time.time() - start_time
    # No cost tracking
```

**After** (recommended integration):
```python
from app.monitoring import get_cost_optimizer

def after_agent_callback(callback_context: CallbackContext) -> None:
    # ... existing code ...

    # Track cost
    optimizer = get_cost_optimizer()

    # Extract token usage from last event
    last_event = invocation_ctx.session.events[-1] if invocation_ctx.session.events else None
    if last_event and hasattr(last_event, 'usage_metadata') and last_event.usage_metadata:
        usage = last_event.usage_metadata

        cost_result = optimizer.record_usage(
            agent_name=agent_name,
            model=invocation_ctx.agent.model if hasattr(invocation_ctx.agent, 'model') else "unknown",
            input_tokens=getattr(usage, 'prompt_token_count', 0),
            output_tokens=getattr(usage, 'candidates_token_count', 0),
            cached_tokens=getattr(usage, 'cached_content_token_count', 0),
            session_id=getattr(invocation_ctx.session, 'id', None)
        )

        # Log cost alerts
        if not cost_result["within_budget"]:
            logger.warning(f"Cost alert for {agent_name}: {cost_result['budget_message']}")

        # Add to metrics
        network_event["data"]["cost"] = cost_result["cost"]
        network_event["data"]["cumulative_cost"] = cost_result["cumulative_cost"]
```

### Parallelizing Search Queries in section_researcher

**Before** (`app/agent.py:301-350`):
```python
section_researcher = LlmAgent(
    # ... config ...
    instruction="""
    Execute EVERY query listed in 'follow_up_queries' using the 'brave_search' tool.
    """
    # Sequential execution (slow)
)
```

**After** (recommended pattern):

Create a custom tool that uses the parallelizer:

```python
from app.optimization import get_search_parallelizer

def parallel_brave_search(queries: list[str]) -> list[dict]:
    """Execute multiple search queries in parallel."""
    parallelizer = get_search_parallelizer()

    results = parallelizer.execute_searches(
        search_queries=queries,
        search_function=lambda q: brave_search(q)
    )

    # Format results
    formatted_results = []
    for query, result, error in results:
        if error:
            formatted_results.append({
                "query": query,
                "error": str(error),
                "results": []
            })
        else:
            formatted_results.append({
                "query": query,
                "results": result
            })

    return formatted_results

# Update agent to use parallel search
# Note: This requires ADK to support custom tool wrappers
# Alternative: Modify agent instruction to call parallel_brave_search
```

### Using Context Optimization for Large Agents

**For report_composer** (which processes lots of context):

```python
from app.optimization import get_context_optimizer

# Before agent invocation
context_optimizer = get_context_optimizer()

# Compress research findings before passing to report_composer
research_findings = session.state.get("section_research_findings", "")
if len(research_findings) > 10000:  # If research is large
    compressed, metrics = context_optimizer.semantic_truncate(
        text=research_findings,
        max_tokens=8000,
        preserve_start=1000,
        preserve_end=1000
    )
    session.state["section_research_findings"] = compressed
    logger.info(f"Compressed research findings: {metrics['compression_ratio']:.1%} retained")
```

---

## Best Practices

### 1. Context Management

✅ **DO**:
- Use `include_contents="none"` for agents that don't need conversation history (plan_generator, report_composer)
- Compress large state values before storing in session
- Cache frequently accessed context

❌ **DON'T**:
- Include full conversation history for every agent
- Store raw HTML or large API responses in session state
- Ignore context size warnings

### 2. Cost Optimization

✅ **DO**:
- Set realistic budgets based on expected usage
- Use cheaper models (gemini-1.5-flash) for simple tasks
- Enable adaptive model selection
- Monitor daily/monthly spending

❌ **DON'T**:
- Use premium models (gemini-1.5-pro) for all tasks
- Ignore budget warnings
- Skip cost tracking in development

### 3. Parallel Execution

✅ **DO**:
- Parallelize independent operations (multiple searches, API calls)
- Use appropriate timeout values
- Handle errors gracefully
- Monitor speedup metrics

❌ **DON'T**:
- Parallelize dependent operations
- Use parallel execution for single tasks
- Ignore timeout errors
- Create too many concurrent workers (default: 5 is optimal)

### 4. Caching Strategy

✅ **DO**:
- Cache expensive computations
- Use semantic hashing for cache keys
- Set appropriate TTL values
- Monitor cache hit rates

❌ **DON'T**:
- Cache user-specific sensitive data
- Use indefinite cache TTL
- Cache highly dynamic content

---

## Monitoring & Metrics

### Cost Dashboard

```python
from app.monitoring import get_cost_optimizer

optimizer = get_cost_optimizer()
summary = optimizer.get_cost_summary()

print("=== Cost Summary ===")
print(f"Daily: ${summary['budget']['daily_spent']:.2f} / ${summary['budget']['daily_limit']:.2f}")
print(f"Monthly: ${summary['budget']['monthly_spent']:.2f} / ${summary['budget']['monthly_limit']:.2f}")
print(f"\nTop Cost Agents:")
for agent, cost in summary['top_cost_agents']:
    print(f"  {agent}: ${cost:.4f}")
```

### Performance Metrics

```python
from app.optimization import get_parallel_executor

executor = get_parallel_executor()
metrics = executor.get_metrics()

print("=== Performance Metrics ===")
print(f"Total tasks: {metrics['total_tasks']}")
print(f"Success rate: {metrics['success_rate']:.1%}")
print(f"Average duration: {metrics['average_duration_ms']:.0f}ms")
print(f"Speedup factor: {metrics['speedup_factor']:.2f}x")
```

### Context Optimization Stats

```python
from app.optimization import get_context_optimizer

optimizer = get_context_optimizer()
stats = optimizer.get_stats()

print("=== Context Stats ===")
print(f"Cache size: {stats['cache_size']} / {stats['cache_max_size']}")
print(f"Max context: {stats['max_context_tokens']} tokens")
```

---

## Quick Wins (Immediate Impact)

### 1. Enable Context Caching (5 min)

Add to `app/enhanced_callbacks.py`:

```python
from app.optimization import get_context_optimizer

# In before_agent_callback
context_optimizer = get_context_optimizer()

# Cache agent instruction if not already cached
instruction = invocation_ctx.agent.instruction if invocation_ctx.agent else ""
cache_key = f"instruction_{agent_name}"
if not context_optimizer.get_cached_context(cache_key):
    context_optimizer.cache_context(instruction, cache_key)
```

**Expected Impact**: 20-30% reduction in token usage for repeated agent invocations

### 2. Add Cost Tracking (10 min)

Follow integration guide above to add cost tracking to `after_agent_callback`.

**Expected Impact**: Full visibility into costs, automatic budget alerts

### 3. Parallelize Search Queries (30 min)

Modify `section_researcher` to execute search queries in parallel.

**Expected Impact**: 3-5x speedup for research-heavy queries

---

## Advanced Optimizations

### 1. Dynamic Agent Selection

Instead of always using the full research pipeline, use lightweight agents for simple queries:

```python
def select_research_agent(query_complexity: str):
    if query_complexity == "simple":
        return generalist_agent  # Cheaper, faster
    elif query_complexity == "moderate":
        return section_researcher  # Skip full pipeline
    else:
        return research_pipeline  # Full pipeline for complex queries
```

### 2. Incremental Context Building

Build context incrementally instead of including everything:

```python
def build_incremental_context(agent_name: str, session):
    # Only include relevant state keys for this agent
    relevant_keys = get_relevant_state_keys(agent_name)
    context = {k: session.state[k] for k in relevant_keys if k in session.state}
    return context
```

### 3. Predictive Caching

Pre-warm cache for common queries:

```python
async def prewarm_cache():
    """Pre-warm cache with common operations."""
    common_queries = ["latest AI trends", "quantum computing", ...]

    parallelizer = get_search_parallelizer()
    parallelizer.execute_searches(
        search_queries=common_queries,
        search_function=brave_search
    )
```

---

## Metrics to Track

### Key Performance Indicators (KPIs)

1. **Cost Efficiency**
   - Cost per research query
   - Cost per agent invocation
   - Daily/monthly burn rate

2. **Performance**
   - Average research completion time
   - Agent execution times
   - Parallel speedup factor

3. **Quality**
   - Context compression ratio
   - Cache hit rate
   - Error rate

4. **Resource Utilization**
   - Token usage per agent
   - Concurrent task count
   - Cache size

---

## Troubleshooting

### High Costs

**Symptom**: Budget alerts, rapid cost accumulation

**Solutions**:
1. Enable adaptive model selection
2. Review agent instructions for unnecessary verbosity
3. Implement context compression
4. Check for retry loops or infinite iterations

### Slow Performance

**Symptom**: Long research times, timeouts

**Solutions**:
1. Enable parallel search execution
2. Reduce max_search_iterations (currently 5)
3. Optimize context size
4. Check for network latency issues

### Context Overflow

**Symptom**: Token limit errors, truncated responses

**Solutions**:
1. Enable context optimization
2. Use `include_contents="none"` for more agents
3. Compress large state values
4. Implement rolling window for events

---

## Next Steps

1. **Immediate**: Implement quick wins (cost tracking, context caching)
2. **Short-term**: Add parallel search execution
3. **Medium-term**: Implement adaptive agent selection
4. **Long-term**: Build predictive caching and auto-optimization

For questions or issues, see:
- Cost tracking: `app/monitoring/cost_optimizer.py`
- Parallel execution: `app/optimization/parallel_executor.py`
- Context optimization: `app/optimization/context_optimizer.py`
