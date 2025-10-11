# Neural Training for Google ADK Expertise

This directory contains everything needed to train Claude Code to become an expert in Google Agent Development Kit (ADK) using claude-flow's neural training capabilities.

## Quick Start

### Recommended: Comprehensive Training (Vana + Official Google ADK)

```bash
# ONE COMMAND - Complete training with both sources
./training_data/comprehensive_training.sh

# This will:
# 1. Extract patterns from Vana codebase
# 2. Clone and analyze official Google ADK repositories
# 3. Train on 245 total epochs with combined knowledge
# 4. Create persistent cross-session memory
```

### Alternative: Vana-Only Training

```bash
# 1. Generate training datasets from Vana codebase only
python3 training_data/generate_adk_datasets.py

# 2. Run Vana-focused neural training
./training_data/quick_start.sh
```

### Validation

After training, test Claude Code's ADK expertise:
```bash
# Ask Claude Code:
# "Create a SequentialAgent for a research workflow"
# "What's the critical bug in ADK event extraction?"
# "Build a multi-agent system with ReAct pattern"
```

## Directory Structure

```
training_data/
├── README.md                         # This file
├── generate_adk_datasets.py          # Extract patterns from Vana codebase
├── fetch_official_adk_samples.py     # ⭐ NEW: Fetch official Google ADK samples
├── quick_start.sh                    # Vana-only training workflow
├── comprehensive_training.sh         # ⭐ RECOMMENDED: Vana + Official training
├── adk_agent_patterns.json           # Generated: Vana agent patterns
├── adk_antipatterns.json             # Generated: Known bugs and fixes
├── adk_orchestration.json            # Generated: Multi-agent patterns
├── adk_integration.json              # Generated: FastAPI+ADK+SSE patterns
├── official_adk_patterns.json        # ⭐ Generated: Official Google patterns
└── official_adk_analysis.json        # ⭐ Generated: Detailed official analysis

neural_models/
└── adk_expert_*.model             # Trained neural models

neural_training_backups/
└── *.json                         # Memory backups

reports/
└── *.md                           # Performance reports
```

## Training Datasets

### 1. Agent Patterns (`adk_agent_patterns.json`)

Extracted from `agents/vana/agent.py` and `app/agent.py`:

- **basic_llm_agent**: Standard LLM agent definition
- **agent_tool_wrapper**: AgentTool for sub-agents
- **event_extraction_critical**: Extract from text AND functionResponse
- **sequential_agent_pipeline**: SequentialAgent orchestration
- **loop_agent_with_escalation**: LoopAgent with exit control
- **custom_base_agent**: BaseAgent implementations
- **structured_output_schema**: Pydantic models
- **callback_pattern**: State management callbacks
- **tool_integration**: External tool usage
- **state_management_pattern**: Cross-agent state sharing

### 2. Anti-Patterns (`adk_antipatterns.json`)

Common bugs and mistakes from Vana development:

- **missing_functionresponse_extraction** (CRITICAL): Only extracting text, missing functionResponse
- **nested_agent_tool_calls** (HIGH): AgentTool with nested tools causes Gemini API errors
- **missing_defensive_gets** (MEDIUM): KeyError from assuming structure exists
- **broadcasting_inside_loop** (LOW): Performance issue from excessive SSE events
- **missing_max_iterations** (MEDIUM): LoopAgent without iteration limits
- **unclear_escalation_logic** (LOW): Complex escalation buried in agents
- **missing_output_key** (MEDIUM): State not accessible to downstream agents
- **include_contents_pollution** (MEDIUM): Context pollution in sub-agents

### 3. Orchestration Patterns (`adk_orchestration.json`)

Multi-agent coordination from Vana multi-agent AI platform:

- **sequential_pipeline**: Linear workflow with dependencies
- **iterative_refinement_loop**: Loop with quality evaluation
- **hierarchical_delegation**: Parent-child agent relationships
- **multi_agent_research_workflow**: Complete multi-agent system architecture

### 4. Integration Patterns (`adk_integration.json`)

FastAPI + ADK + SSE integration:

- **fastapi_adk_proxy**: Backend proxy to ADK agents
- **sse_event_streaming**: Real-time event streaming patterns

## Neural Training Workflow

### Phase 1: Foundation (50 epochs)
```bash
npx claude-flow@alpha mcp neural_train \
  --pattern_type "coordination" \
  --training_data "$(cat adk_agent_patterns.json)" \
  --epochs 50
```

Builds fundamental ADK knowledge through pattern recognition.

### Phase 2: Anti-Pattern Recognition (75 epochs)
```bash
npx claude-flow@alpha mcp neural_train \
  --pattern_type "prediction" \
  --training_data "$(cat adk_antipatterns.json)" \
  --epochs 75
```

Learns to identify common bugs and anti-patterns.

### Phase 3: Orchestration (60 epochs)
```bash
npx claude-flow@alpha mcp neural_train \
  --pattern_type "optimization" \
  --training_data "$(cat adk_orchestration.json)" \
  --epochs 60
```

Masters complex multi-agent coordination.

## Memory Namespaces

Training data is stored in persistent memory:

- `adk/patterns` - Agent definition patterns
- `adk/antipatterns` - Known bugs and fixes
- `adk/orchestration` - Multi-agent workflows
- `adk/critical` - Critical rules (event extraction)

## Validation Tests

After training, test Claude Code's ADK expertise:

### Test 1: Basic Agent Creation
**Prompt**: "Create an LlmAgent that answers questions about quantum computing"

**Expected**: Includes `LlmAgent`, `model=`, `instruction=`, `name=`

### Test 2: Event Extraction
**Prompt**: "Write code to extract content from ADK events"

**Expected**:
- Checks both `part.get('text')` AND `part.get('functionResponse')`
- Defensive `.get()` calls
- Extracts from `response.get('result')`

### Test 3: Multi-Agent Pipeline
**Prompt**: "Create a SequentialAgent with 3 sub-agents for a research workflow"

**Expected**:
- `SequentialAgent` with `sub_agents=[]`
- Each agent has `output_key`
- State flow between agents

### Test 4: Loop with Escalation
**Prompt**: "Build a LoopAgent that improves output until quality threshold is met"

**Expected**:
- `LoopAgent` with `max_iterations`
- Custom `EscalationChecker` agent
- Clear escalation logic

## Continuous Learning

### Capture Successful Sessions

```bash
# After successful ADK development
npx claude-flow@alpha mcp memory_usage \
  --action store \
  --namespace "adk/solutions" \
  --key "solution_$(date +%Y%m%d_%H%M%S)" \
  --value "{\"task\":\"...\",\"solution\":\"...\",\"patterns\":[]}"
```

### Weekly Refresh

```bash
# Extract patterns from recent commits
git log --since="1 week ago" --name-only | \
  grep -E "\.py$" | \
  xargs python3 training_data/extract_patterns.py > \
  training_data/weekly_patterns_$(date +%Y_W%U).json

# Incremental training
npx claude-flow@alpha mcp neural_train \
  --pattern_type "coordination" \
  --training_data "$(cat weekly_patterns.json)" \
  --epochs 10
```

## Performance Monitoring

```bash
# Check neural status
npx claude-flow@alpha mcp neural_status

# Get performance report
npx claude-flow@alpha mcp performance_report \
  --format "detailed" \
  --timeframe "7d"

# Analyze trends
npx claude-flow@alpha mcp trend_analysis \
  --metric "adk_expertise_score" \
  --period "30d"

# Quality assessment
npx claude-flow@alpha mcp quality_assess \
  --target "adk_expertise" \
  --criteria '["pattern_recognition", "code_quality"]'
```

## Backups

### Create Backup
```bash
npx claude-flow@alpha mcp memory_backup \
  --path "neural_training_backups/backup_$(date +%Y%m%d).json"
```

### Restore Backup
```bash
npx claude-flow@alpha mcp memory_restore \
  --backupPath "neural_training_backups/backup_20251010.json"
```

## Troubleshooting

### Issue: Training data not loading
**Solution**: Ensure JSON is valid with `cat file.json | jq .`

### Issue: Memory namespace errors
**Solution**: Create namespaces first with `memory_namespace --action create`

### Issue: Neural training fails
**Solution**: Check neural status with `neural_status` and verify WASM support

## References

- **Strategy Document**: `docs/claude-flow-neural-training-strategy.md`
- **ADK Event Guide**: `docs/adk/ADK-Event-Extraction-Guide.md`
- **Claude-Flow Repo**: https://github.com/ruvnet/claude-flow
- **Google ADK Docs**: https://googlecloudplatform.github.io/agent-starter-pack/

## Success Metrics

After training, Claude Code should:

- ✅ Correctly identify 10 ADK agent patterns
- ✅ Detect 8 common anti-patterns
- ✅ Explain 4 orchestration strategies
- ✅ Generate valid ADK code that passes validation
- ✅ Proactively warn about critical bugs (functionResponse extraction)
- ✅ Suggest appropriate patterns based on use case

---

**Last Updated**: 2025-10-10
**Status**: Ready for Training
