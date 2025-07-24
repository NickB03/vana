# ADK Agent Discovery - Solution Recommendations

**Date**: 2025-07-19  
**Priority**: 🔴 **CRITICAL** - Complete agent functionality failure

## Immediate Actions Required

### 1. **Fix ADK Directory Structure** 🎯 **TOP PRIORITY**

The deployment needs to follow ADK's expected structure exactly:

#### Current Problem
```bash
# Current deployment (WRONG for ADK)
/project-root/
├── agents/vana/          # ADK doesn't look here
│   ├── agent.py          # ✅ Correct content
│   └── __init__.py       # ✅ Correct content
├── pyproject.toml        # ❌ ADK expects requirements.txt
└── ...
```

#### Solution A: Deploy Agent Directory Only (Recommended)
```bash
# Create requirements.txt in agent directory
cd /Users/nick/Development/vana/agents/vana
poetry export -f requirements.txt --output requirements.txt --without-hashes

# Deploy only the agent directory
cd /Users/nick/Development/vana
gcloud run deploy vana-dev \
  --source agents/vana \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_API_KEY=$GOOGLE_API_KEY,ENVIRONMENT=development"
```

#### Solution B: Restructure for ADK Compliance
```bash
# Move agent files to root and deploy
cp agents/vana/agent.py ./
cp agents/vana/__init__.py ./
poetry export -f requirements.txt --output requirements.txt --without-hashes

# Deploy from root
gcloud run deploy vana-dev --source . --region=us-central1 ...
```

### 2. **Resolve Import Dependencies** ⚠️ **HIGH PRIORITY**

The agent imports complex VANA dependencies that won't be available in ADK-only deployment:

#### Current Issues
```python
# These imports will fail in agent-only deployment:
from lib._shared_libraries.orchestrator_metrics import MetricsTimer
from lib._tools import adk_analyze_task, adk_list_directory  
from agents.specialists.architecture_specialist import architecture_specialist
```

#### Solution Options

**Option A: Simplify Agent (Quick Fix)**
Create a minimal agent for ADK testing:

```python
# agents/vana/simple_agent.py
from google.adk.agents import LlmAgent

# Minimal agent without complex dependencies
simple_agent = LlmAgent(
    name="vana_simple",
    model="gemini-2.5-flash",
    description="Simplified VANA agent for ADK testing",
    instruction="You are a helpful AI assistant. Respond to user queries directly."
)

# In agents/vana/agent.py
from .simple_agent import simple_agent
root_agent = simple_agent
```

**Option B: Bundle Dependencies**
Copy required VANA modules into the agent directory:

```bash
# Copy essential dependencies to agent directory
cp -r lib agents/vana/
cp -r agents/specialists agents/vana/
```

### 3. **Fix Environment Configuration** 🔧 **MEDIUM PRIORITY**

#### Add API Key to Deployment
```bash
# Ensure GOOGLE_API_KEY is set in Cloud Run
gcloud run deploy vana-dev \
  --source agents/vana \
  --set-env-vars="GOOGLE_API_KEY=$GOOGLE_API_KEY,GOOGLE_GENAI_USE_VERTEXAI=False" \
  --region=us-central1
```

#### Verify Environment Variables
```bash
# Check current deployment environment
gcloud run services describe vana-dev --region=us-central1 --format="value(spec.template.spec.template.spec.containers[0].env[].name,spec.template.spec.template.spec.containers[0].env[].value)"
```

### 4. **Test Agent Discovery** 🧪 **VALIDATION**

After fixing structure, verify:

```bash
# Run the test script again
python3 .claude_workspace/test_adk_agents.py

# Manually check endpoints
curl https://vana-dev-qqugqgsbcq-uc.a.run.app/agents
curl -X POST https://vana-dev-qqugqgsbcq-uc.a.run.app/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "agent": "enhanced_orchestrator"}'
```

## Detailed Implementation Steps

### Step 1: Create ADK-Compatible Agent Structure

```bash
cd /Users/nick/Development/vana

# Create clean agent directory
mkdir -p agents/vana-adk
cp agents/vana/agent.py agents/vana-adk/
cp agents/vana/__init__.py agents/vana-adk/

# Generate requirements.txt
poetry export -f requirements.txt --output agents/vana-adk/requirements.txt --without-hashes

# Verify structure
ls -la agents/vana-adk/
# Should show: agent.py, __init__.py, requirements.txt
```

### Step 2: Simplify Dependencies (if needed)

```python
# agents/vana-adk/agent.py (simplified version)
import os
from google.adk.agents import LlmAgent

def get_model_with_api_key():
    """Get model with proper API key handling."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if api_key:
        return "gemini-2.5-flash"
    else:
        raise ValueError("GOOGLE_API_KEY not configured")

# Simple agent without complex dependencies
root_agent = LlmAgent(
    name="vana_orchestrator",
    model=get_model_with_api_key(),
    description="VANA AI Assistant - Intelligent task routing and specialist coordination",
    instruction="""You are VANA, an advanced AI assistant with specialist routing capabilities.

You can help with:
- Architecture and code analysis
- Data science and analytics  
- Security assessments
- DevOps and infrastructure
- Research and investigation

Provide helpful, accurate responses to user queries."""
)
```

### Step 3: Deploy ADK-Compatible Version

```bash
# Deploy the ADK-compatible agent
gcloud run deploy vana-dev \
  --source agents/vana-adk \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_API_KEY=$GOOGLE_API_KEY,ENVIRONMENT=development" \
  --port=8080 \
  --memory=2Gi \
  --cpu=2 \
  --timeout=900 \
  --max-instances=10
```

### Step 4: Validate and Test

```bash
# Wait for deployment
echo "Waiting for deployment to complete..."
sleep 30

# Test agent discovery
python3 .claude_workspace/test_adk_agents.py

# Check ADK Web UI
open https://vana-dev-qqugqgsbcq-uc.a.run.app
```

## Alternative Approaches

### Approach A: Hybrid Deployment
- Keep complex VANA functionality in separate service
- Deploy simple ADK agent that calls VANA API
- Gradual migration to full ADK compliance

### Approach B: ADK + FastAPI
- Deploy ADK agent alongside FastAPI endpoints
- Use FastAPI for complex functionality
- ADK for standard chat interface

### Approach C: Full ADK Migration
- Rewrite all VANA components using pure ADK patterns
- Eliminate custom dependencies
- Full ADK compliance but requires significant refactoring

## Risk Mitigation

### Testing Strategy
1. **Start Simple** - Deploy minimal agent first
2. **Incremental Complexity** - Add features gradually
3. **Parallel Testing** - Keep working VANA version available
4. **Rollback Plan** - Quick revert to previous deployment

### Monitoring
```bash
# Monitor deployment logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=vana-dev" --limit=50

# Check service health
curl https://vana-dev-qqugqgsbcq-uc.a.run.app/health
```

## Success Criteria

✅ **Phase 1: Agent Discovery**
- ADK Web UI shows agent in dropdown
- `/agents` endpoint returns agent list
- Agent details accessible via API

✅ **Phase 2: Basic Functionality**  
- Chat endpoints respond (not 404)
- Simple queries work end-to-end
- No critical errors in logs

✅ **Phase 3: Full Functionality**
- All specialist routing works
- Complex queries handled properly
- Performance meets requirements

## Implementation Timeline

- **Immediate (30 min)**: Fix directory structure, deploy simple agent
- **Short-term (2 hours)**: Validate functionality, add complexity gradually
- **Medium-term (1 day)**: Full specialist integration if possible
- **Long-term (1 week)**: Full ADK migration if required

## Critical Success Factors

1. **Follow ADK patterns exactly** - No deviations from documented structure
2. **Start simple** - Get basic agent working before adding complexity  
3. **Test incrementally** - Validate each change before proceeding
4. **Have rollback plan** - Keep working version available

---

**Next Step**: Execute Step 1 (Create ADK-Compatible Agent Structure) immediately.