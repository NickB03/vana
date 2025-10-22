# Multi-Agent Optimization - Quick Reference

## 🚀 Quick Start (5 Minutes)

### 1. Enable Cost Tracking
```python
from app.monitoring import get_cost_optimizer

# In app/enhanced_callbacks.py::after_agent_callback
optimizer = get_cost_optimizer()

if last_event and hasattr(last_event, 'usage_metadata'):
    usage = last_event.usage_metadata
    cost_result = optimizer.record_usage(
        agent_name=agent_name,
        model=model_name,
        input_tokens=usage.prompt_token_count,
        output_tokens=usage.candidates_token_count,
        cached_tokens=usage.cached_content_token_count,
    )
```

### 2. View Cost Dashboard
```python
from app.monitoring import get_cost_optimizer

summary = get_cost_optimizer().get_cost_summary()
print(f"Daily: ${summary['budget']['daily_spent']:.2f}")
print(f"Monthly: ${summary['budget']['monthly_spent']:.2f}")
```

### 3. Enable Parallel Search
```python
from app.optimization import get_search_parallelizer

parallelizer = get_search_parallelizer()
results = parallelizer.execute_searches(
    search_queries=["query1", "query2", "query3"],
    search_function=brave_search
)
```

---

## 📊 Key Metrics to Monitor

| Metric | Target | Current | Tool |
|--------|--------|---------|------|
| Daily Cost | < $10 | Unknown | `get_cost_optimizer()` |
| Research Time | < 30s | ~60s (sequential) | `get_parallel_executor()` |
| Context Tokens | < 8K | ~15K (no compression) | `get_context_optimizer()` |
| Cache Hit Rate | > 30% | 0% (not enabled) | `get_context_optimizer()` |

---

## 🔧 Module Reference

### Cost Optimizer
```python
from app.monitoring import get_cost_optimizer

optimizer = get_cost_optimizer()

# Record usage
optimizer.record_usage(agent_name, model, input_tokens, output_tokens)

# Get analytics
analytics = optimizer.get_agent_analytics("section_researcher")

# Check budget
summary = optimizer.get_cost_summary()
```

**Key Files**:
- Implementation: `app/monitoring/cost_optimizer.py`
- Models & Pricing: Lines 33-50 (MODEL_COSTS dict)

### Parallel Executor
```python
from app.optimization import get_parallel_executor, get_search_parallelizer

# General tasks
executor = get_parallel_executor()
results = executor.execute_parallel(tasks, task_ids)

# Search queries
parallelizer = get_search_parallelizer()
results = parallelizer.execute_searches(queries, search_function)
```

**Key Files**:
- Implementation: `app/optimization/parallel_executor.py`
- Max workers: Default 5 (configurable)

### Context Optimizer
```python
from app.optimization import get_context_optimizer

optimizer = get_context_optimizer()

# Optimize agent context
context, metrics = optimizer.optimize_agent_context(
    agent_name, instruction, session_state, events, max_tokens
)

# Semantic truncation
text, metrics = optimizer.semantic_truncate(text, max_tokens)
```

**Key Files**:
- Implementation: `app/optimization/context_optimizer.py`
- Default max: 32K tokens (configurable)

---

## 🎯 Expected Improvements

| Optimization | Implementation Time | Expected Improvement |
|--------------|---------------------|---------------------|
| Cost Tracking | 10 min | Full visibility + alerts |
| Context Caching | 5 min | 20-30% token reduction |
| Parallel Search | 30 min | 3-5x speedup |
| Context Compression | 15 min | 40-60% token reduction |
| Adaptive Model Selection | 20 min | 30-50% cost reduction |

---

## 🔥 Common Patterns

### Pattern 1: Cost-Aware Agent Execution
```python
optimizer = get_cost_optimizer()

# Before expensive operation
within_budget, msg = optimizer.budget.check_budget()
if not within_budget:
    logger.error(f"Budget exceeded: {msg}")
    # Use cheaper model or skip
    return

# After operation
cost_result = optimizer.record_usage(...)
if not cost_result["within_budget"]:
    # Alert user
    send_alert(cost_result["budget_message"])
```

### Pattern 2: Parallel Tool Execution
```python
parallelizer = get_search_parallelizer()

# Generate queries
queries = [
    "topic overview 2025",
    "topic research papers",
    "topic industry applications",
    "topic future trends",
]

# Execute all in parallel (3-5x faster)
results = parallelizer.execute_searches(queries, brave_search)

# Process results
all_findings = []
for query, result, error in results:
    if not error:
        all_findings.extend(result)
```

### Pattern 3: Context Optimization
```python
context_optimizer = get_context_optimizer()

# Before agent with large context
large_research_data = session.state.get("research_findings", "")

if len(large_research_data) > 10000:
    compressed, metrics = context_optimizer.semantic_truncate(
        text=large_research_data,
        max_tokens=4000,
        preserve_start=500,
        preserve_end=500
    )
    session.state["research_findings"] = compressed
    logger.info(f"Compressed: {metrics['compression_ratio']:.1%}")
```

---

## 🚨 Troubleshooting

### Issue: Budget Exceeded
```python
# Solution 1: Use cheaper model
optimizer.select_optimal_model("simple", current_model)

# Solution 2: Increase budget
optimizer.budget.daily_limit = 20.0
optimizer.budget.monthly_limit = 600.0
```

### Issue: Slow Research
```python
# Solution: Enable parallel search
from app.optimization import get_search_parallelizer

parallelizer = get_search_parallelizer()
# Execute 4-5 queries in parallel instead of sequential
```

### Issue: Token Limit Exceeded
```python
# Solution: Compress context
from app.optimization import get_context_optimizer

optimizer = get_context_optimizer()
context, metrics = optimizer.optimize_agent_context(
    agent_name=agent_name,
    instruction=instruction,
    session_state=session.state,
    events=session.events[-10:],  # Only last 10 events
    max_tokens=8000  # Reduce from 32K
)
```

---

## 📈 Monitoring Commands

### View Real-Time Costs
```python
from app.monitoring import get_cost_optimizer

optimizer = get_cost_optimizer()
while True:
    summary = optimizer.get_cost_summary()
    print(f"\rDaily: ${summary['budget']['daily_spent']:.4f}", end="")
    time.sleep(1)
```

### Check Parallel Performance
```python
from app.optimization import get_parallel_executor

executor = get_parallel_executor()
metrics = executor.get_metrics()
print(f"Speedup: {metrics['speedup_factor']:.2f}x")
print(f"Success: {metrics['success_rate']:.1%}")
```

### Cache Statistics
```python
from app.optimization import get_context_optimizer

optimizer = get_context_optimizer()
stats = optimizer.get_stats()
print(f"Cache: {stats['cache_size']} / {stats['cache_max_size']}")
```

---

## 🎓 Learning Path

1. **Day 1**: Enable cost tracking, monitor for 24h
2. **Day 2**: Analyze cost data, identify expensive agents
3. **Day 3**: Implement parallel search execution
4. **Day 4**: Enable context compression
5. **Day 5**: Fine-tune based on metrics

---

## 📚 Additional Resources

- Full Guide: `docs/optimization/MULTI_AGENT_OPTIMIZATION_GUIDE.md`
- Cost Optimizer: `app/monitoring/cost_optimizer.py`
- Parallel Executor: `app/optimization/parallel_executor.py`
- Context Optimizer: `app/optimization/context_optimizer.py`
- Integration Examples: See Full Guide § Integration

---

## 🤖 Agent-Specific Optimizations

### dispatcher_agent
- ✅ Already optimized (lightweight routing)
- No changes needed

### interactive_planner_agent
- Add cost tracking
- Consider caching common research plans

### section_researcher
- **HIGH PRIORITY**: Parallelize search queries (3-5x speedup)
- Enable context caching
- Compress research findings before storing

### research_evaluator
- Add cost tracking
- Use cheaper model (gemini-1.5-flash vs gemini-1.5-pro)

### report_composer
- **HIGH PRIORITY**: Compress input context (40-60% reduction)
- Cache frequently used citation formats
- Use semantic truncation for long research data

---

## 💡 Pro Tips

1. **Start Small**: Enable cost tracking first, observe patterns
2. **Measure Everything**: Use metrics to validate optimizations
3. **Iterate**: Don't optimize everything at once
4. **Monitor**: Set up alerts for budget thresholds
5. **Cache Smart**: Cache expensive operations, not cheap ones
6. **Parallelize Wisely**: Only parallelize independent operations

---

## ⚡ Performance Cheat Sheet

| Agent | Optimization | Priority | Impact |
|-------|-------------|----------|--------|
| section_researcher | Parallel search | HIGH | 3-5x speedup |
| report_composer | Context compression | HIGH | 40-60% tokens saved |
| All agents | Cost tracking | HIGH | Full visibility |
| research_evaluator | Cheaper model | MEDIUM | 30-50% cost saved |
| section_planner | Context caching | MEDIUM | 20-30% tokens saved |

---

**Last Updated**: 2025-10-21
**Version**: 1.0.0
**Author**: Multi-Agent Optimization Toolkit
