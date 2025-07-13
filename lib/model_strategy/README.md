# 🎯 VANA Dynamic Model Strategy

## Overview

The Model Strategy system implements cost-conscious, dynamic model selection for VANA agents. It ensures we use the most cost-effective model (free tier when possible) while maintaining quality for critical tasks.

## 🏗️ Architecture

```
lib/model_strategy/
├── model_selector.py       # Request-based model selection
├── agent_model_config.py   # Agent-specific model profiles
└── README.md              # This file
```

## 💰 Model Tiers & Costs

| Model | Tier | Cost | Use Case |
|-------|------|------|----------|
| **gemini-2.5-flash** | Flash (Free) | $0 | 90% of requests |
| **gemini-2.5-pro** | Reasoning | ~$0.00125/1K chars | Complex reasoning |
| **gemini-2.0-flash** | Legacy | $0 | Backward compatibility |

## 🤖 Agent Model Assignments

### Default Configuration

```python
# Flash Model (Free Tier) - Most agents
- enhanced_orchestrator     # Can upgrade for complex tasks
- architecture_specialist   # Can upgrade for deep analysis
- data_science_specialist  # Can upgrade for ML tasks
- qa_specialist           # Always flash
- ui_specialist          # Always flash
- devops_specialist      # Can upgrade for production
- workflow_managers      # Always flash

# Reasoning Model (Paid) - Critical agents only
- security_specialist    # Always uses reasoning model
```

## 🚀 Usage Examples

### 1. Basic Agent Creation with Dynamic Model

```python
from google.adk.agents import LlmAgent
from lib.model_strategy import get_model_for_agent

# Create agent with dynamic model selection
agent = LlmAgent(
    name="architecture_specialist",
    model=get_model_for_agent("architecture_specialist"),
    description="Architecture analysis specialist",
    # ... other config
)
```

### 2. Context-Aware Model Selection

```python
from lib.model_strategy import get_model_for_agent

# Simple request - uses flash model
context = {"request_complexity": "simple"}
model = get_model_for_agent("architecture_specialist", context)
# Returns: "gemini-2.5-flash"

# Complex request - may upgrade to reasoning model
context = {
    "request_complexity": "complex",
    "priority": "high",
    "requires_reasoning": True
}
model = get_model_for_agent("architecture_specialist", context)
# Returns: "gemini-2.5-pro" (if budget allows)
```

### 3. Request-Based Model Selection

```python
from lib.model_strategy import select_model_for_request
from lib.context.specialist_context import SpecialistContext

# Analyze request and select appropriate model
request = "Analyze the security vulnerabilities in this authentication system"
context = SpecialistContext(request)

model = select_model_for_request(request, context.to_session_data())
# Returns: "gemini-2.5-flash" (security keywords but can still use flash)
```

### 4. Integration with Enhanced Orchestrator

```python
# In enhanced_orchestrator.py
from lib.model_strategy import get_model_for_agent, select_model_for_request

def create_orchestrator():
    # Get model based on agent profile
    model = get_model_for_agent("enhanced_orchestrator")
    
    return LlmAgent(
        name="enhanced_orchestrator",
        model=model,  # Dynamically selected
        # ... rest of config
    )

def route_to_specialist(request, specialist_name, context):
    # Specialist uses its own model profile
    specialist_model = get_model_for_agent(specialist_name, {
        "request": request,
        "context": context,
        "request_complexity": analyze_complexity(request)
    })
    
    # Create or update specialist with appropriate model
    # ...
```

## ⚙️ Configuration

### Environment Variables

```bash
# Enable/disable dynamic model selection
VANA_DYNAMIC_MODEL_SELECTION=true  # Default: true

# Cost optimization level
VANA_COST_OPTIMIZATION=balanced     # Options: aggressive, balanced, performance

# Default model override
VANA_DEFAULT_MODEL=gemini-2.5-flash

# Pro model usage threshold (% of monthly budget)
VANA_PRO_MODEL_THRESHOLD=0.8        # Use 80% of budget before restricting
```

### Cost Monitoring

```python
from lib.model_strategy import get_model_selector

# Get cost report
selector = get_model_selector()
report = selector.get_cost_report()

print(f"Monthly budget: ${report['monthly_budget_usd']}")
print(f"Current cost: ${report['current_month_cost_usd']}")
print(f"Usage by model: {report['usage_by_model']}")
```

## 📊 Decision Logic

### When Flash Model is Used (90% of cases)
- Simple queries and routing decisions
- Basic code analysis
- Standard specialist tasks
- All workflow management
- When budget is constrained

### When Reasoning Model is Used (10% of cases)
- Security analysis (always for security specialist)
- Production deployment decisions
- Complex multi-step reasoning
- When user explicitly requests thorough analysis
- High-priority critical tasks

### Automatic Downgrade Conditions
- Monthly budget exceeded
- Aggressive cost optimization mode
- Simple requests to typically complex agents

## 🔒 Security Considerations

The security specialist is configured to always use the reasoning model by default due to the critical nature of security analysis. However, it can downgrade to flash model in emergency situations (e.g., budget exceeded).

## 📈 Cost Optimization Strategies

1. **Aggressive Mode**: Always use flash model unless absolutely critical
2. **Balanced Mode**: Use agent profiles with smart upgrades (default)
3. **Performance Mode**: Prefer better models for quality

## 🧪 Testing Without Costs

For testing, all agents are configured to use `gemini-2.5-flash` by default, which has a free tier. No actual API costs are incurred during development and testing.

## 🔄 Migration Path

1. **Phase 1**: All agents use flash model (current state)
2. **Phase 2**: Implement dynamic selection based on request
3. **Phase 3**: Add context-aware upgrades
4. **Phase 4**: Full budget management and optimization

## 📝 Future Enhancements

- [ ] Load agent profiles from YAML/JSON configuration
- [ ] Real-time cost tracking and alerts
- [ ] Model performance benchmarking
- [ ] Automatic model selection learning
- [ ] Support for additional model tiers
- [ ] Per-user budget tracking
```