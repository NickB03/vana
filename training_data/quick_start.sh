#!/bin/bash
# Quick start script for neural training Claude Code on Google ADK

set -e  # Exit on error

echo "🧠 Claude-Flow Neural Training: Google ADK Expertise"
echo "======================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if claude-flow is available
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx not found. Please install Node.js${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Generate Training Datasets${NC}"
echo "Extracting ADK patterns from Vana codebase..."
python3 training_data/generate_adk_datasets.py

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Training datasets generated successfully${NC}"
else
    echo -e "${RED}❌ Failed to generate datasets${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Initialize Neural Training System${NC}"

# Check neural status
echo "Checking neural status..."
npx claude-flow@alpha mcp neural_status || echo "Neural system initializing..."

# Create memory namespaces
echo "Creating memory namespaces for ADK knowledge..."
npx claude-flow@alpha mcp memory_namespace \
  --namespace "adk/patterns" \
  --action "create" || true

npx claude-flow@alpha mcp memory_namespace \
  --namespace "adk/antipatterns" \
  --action "create" || true

npx claude-flow@alpha mcp memory_namespace \
  --namespace "adk/orchestration" \
  --action "create" || true

npx claude-flow@alpha mcp memory_namespace \
  --namespace "adk/critical" \
  --action "create" || true

echo -e "${GREEN}✅ Memory namespaces created${NC}"

# Backup initial state
echo "Creating baseline backup..."
BACKUP_FILE="neural_training_backups/baseline_$(date +%Y%m%d_%H%M%S).json"
npx claude-flow@alpha mcp memory_backup --path "$BACKUP_FILE" || true
echo -e "${GREEN}✅ Baseline backup created: $BACKUP_FILE${NC}"

echo ""
echo -e "${YELLOW}Step 3: Load Critical ADK Knowledge${NC}"

# Store critical event extraction rule
echo "Storing critical ADK event extraction pattern..."
npx claude-flow@alpha mcp memory_usage \
  --action store \
  --namespace "adk/critical" \
  --key "event_extraction_rule" \
  --value "{\"rule\":\"ALWAYS extract from BOTH text AND functionResponse parts\",\"reason\":\"AgentTool outputs come via functionResponse\",\"reference\":\"docs/adk/ADK-Event-Extraction-Guide.md\",\"severity\":\"CRITICAL\"}"

echo -e "${GREEN}✅ Critical knowledge stored in persistent memory${NC}"

# Store agent patterns
echo "Loading agent patterns into memory..."
if [ -f "training_data/adk_agent_patterns.json" ]; then
    PATTERNS=$(cat training_data/adk_agent_patterns.json | jq -c '.')
    npx claude-flow@alpha mcp memory_usage \
      --action store \
      --namespace "adk/patterns" \
      --key "agent_definitions" \
      --value "$PATTERNS"
    echo -e "${GREEN}✅ Agent patterns loaded${NC}"
fi

# Store anti-patterns
echo "Loading anti-patterns into memory..."
if [ -f "training_data/adk_antipatterns.json" ]; then
    ANTIPATTERNS=$(cat training_data/adk_antipatterns.json | jq -c '.')
    npx claude-flow@alpha mcp memory_usage \
      --action store \
      --namespace "adk/antipatterns" \
      --key "known_bugs" \
      --value "$ANTIPATTERNS"
    echo -e "${GREEN}✅ Anti-patterns loaded${NC}"
fi

echo ""
echo -e "${YELLOW}Step 4: Neural Training - Phase 1 (Foundation)${NC}"
echo "Training on basic ADK patterns (50 epochs)..."

# Read training data
PATTERN_DATA=$(cat training_data/adk_agent_patterns.json | jq -c '.patterns')

# Train neural network
npx claude-flow@alpha mcp neural_train \
  --pattern_type "coordination" \
  --training_data "$PATTERN_DATA" \
  --epochs 50

echo -e "${GREEN}✅ Phase 1 training completed${NC}"

echo ""
echo -e "${YELLOW}Step 5: Neural Training - Phase 2 (Anti-Pattern Recognition)${NC}"
echo "Training on anti-patterns and bugs (75 epochs)..."

ANTIPATTERN_DATA=$(cat training_data/adk_antipatterns.json | jq -c '.antipatterns')

npx claude-flow@alpha mcp neural_train \
  --pattern_type "prediction" \
  --training_data "$ANTIPATTERN_DATA" \
  --epochs 75

echo -e "${GREEN}✅ Phase 2 training completed${NC}"

echo ""
echo -e "${YELLOW}Step 6: Neural Training - Phase 3 (Orchestration)${NC}"
echo "Training on orchestration patterns (60 epochs)..."

ORCHESTRATION_DATA=$(cat training_data/adk_orchestration.json | jq -c '.orchestration_patterns')

npx claude-flow@alpha mcp neural_train \
  --pattern_type "optimization" \
  --training_data "$ORCHESTRATION_DATA" \
  --epochs 60

echo -e "${GREEN}✅ Phase 3 training completed${NC}"

echo ""
echo -e "${YELLOW}Step 7: Create Persistent Session${NC}"
SESSION_ID="adk_expertise_$(date +%Y%m%d)"
echo "Creating cross-session persistence: $SESSION_ID"

npx claude-flow@alpha mcp memory_persist --sessionId "$SESSION_ID"

echo -e "${GREEN}✅ Session persistence enabled${NC}"

echo ""
echo -e "${YELLOW}Step 8: Backup Trained Models${NC}"
MODEL_BACKUP="neural_models/adk_expert_$(date +%Y%m%d_%H%M%S).model"
echo "Backing up trained model: $MODEL_BACKUP"

npx claude-flow@alpha mcp model_save \
  --modelId "adk_expert_model" \
  --path "$MODEL_BACKUP" || echo "Model save not supported yet"

echo ""
echo "======================================================"
echo -e "${GREEN}✅ Neural Training Complete!${NC}"
echo "======================================================"
echo ""
echo "Next Steps:"
echo "  1. Test ADK knowledge: Ask Claude Code about ADK patterns"
echo "  2. Validate expertise: See validation tests in docs/claude-flow-neural-training-strategy.md"
echo "  3. Monitor performance: npx claude-flow@alpha mcp performance_report"
echo "  4. Continue learning: Capture successful ADK development sessions"
echo ""
echo "Documentation: docs/claude-flow-neural-training-strategy.md"
echo "Training Data: training_data/"
echo "Backups: neural_training_backups/"
echo ""
