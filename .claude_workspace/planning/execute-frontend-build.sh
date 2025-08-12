#!/bin/bash
# Vana Frontend Build Execution Script
# Orchestrates the chunked implementation with strict validation

set -e  # Exit on error

echo "=================================================="
echo "🚀 VANA FRONTEND CHUNKED BUILD EXECUTION"
echo "=================================================="
echo ""
echo "This script will orchestrate the implementation of"
echo "the Vana frontend using 17 validated chunks with"
echo "multi-agent swarm coordination."
echo ""

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================

echo "🔍 Running pre-flight checks..."

# Check for UI Inspiration folder
if [ ! -d "docs/UI Inspiration" ]; then
    echo "⚠️  WARNING: UI Inspiration folder not found at docs/UI Inspiration"
    echo "   Agents will need to follow Google Gemini style from memory"
    echo "   Consider adding inspiration images for better results"
    read -p "   Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting. Please add UI inspiration images first."
        exit 1
    fi
else
    echo "✅ UI Inspiration folder found"
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required (found v$NODE_VERSION)"
    exit 1
fi
echo "✅ Node.js version OK"

# Check for Claude Flow
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js/npm"
    exit 1
fi
echo "✅ npx available"

# Create required directories
echo "📁 Creating workspace directories..."
mkdir -p .claude_workspace/reports
mkdir -p .claude_workspace/screenshots
mkdir -p .claude_workspace/planning/chunks
mkdir -p tests/chunks
mkdir -p tests/visual
mkdir -p tests/e2e

echo "✅ Pre-flight checks complete"
echo ""

# ============================================================================
# IMPLEMENTATION OPTIONS
# ============================================================================

echo "=================================================="
echo "📋 IMPLEMENTATION OPTIONS"
echo "=================================================="
echo ""
echo "1. Full Implementation (All 17 chunks)"
echo "2. Phase 1 Only (Foundation - Chunks 1-3)"
echo "3. Phase 1 & 2 (Foundation + Core - Chunks 1-6)"
echo "4. Custom Range (Specify chunks)"
echo "5. Resume from Checkpoint"
echo ""
read -p "Select option (1-5): " OPTION

case $OPTION in
    1)
        CHUNKS="1-17"
        echo "➡️  Running full implementation (Chunks 1-17)"
        ;;
    2)
        CHUNKS="1-3"
        echo "➡️  Running Phase 1 only (Chunks 1-3)"
        ;;
    3)
        CHUNKS="1-6"
        echo "➡️  Running Phase 1 & 2 (Chunks 1-6)"
        ;;
    4)
        read -p "Enter chunk range (e.g., 7-11): " CHUNKS
        echo "➡️  Running custom range: Chunks $CHUNKS"
        ;;
    5)
        # Check for existing checkpoint
        if [ -f ".claude_workspace/reports/checkpoint.json" ]; then
            LAST_CHUNK=$(jq -r '.lastCompletedChunk' .claude_workspace/reports/checkpoint.json)
            CHUNKS="$((LAST_CHUNK + 1))-17"
            echo "➡️  Resuming from Chunk $((LAST_CHUNK + 1))"
        else
            echo "❌ No checkpoint found. Starting from beginning."
            CHUNKS="1-17"
        fi
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

# ============================================================================
# VALIDATION STRICTNESS
# ============================================================================

echo ""
echo "=================================================="
echo "🔒 VALIDATION STRICTNESS"
echo "=================================================="
echo ""
echo "1. STRICT (Recommended) - All tests must pass 100%"
echo "2. MODERATE - 80% tests must pass"
echo "3. LENIENT - 60% tests must pass"
echo ""
read -p "Select validation level (1-3): " VALIDATION

case $VALIDATION in
    1)
        export VALIDATION_THRESHOLD=100
        echo "➡️  Using STRICT validation (100% required)"
        ;;
    2)
        export VALIDATION_THRESHOLD=80
        echo "➡️  Using MODERATE validation (80% required)"
        ;;
    3)
        export VALIDATION_THRESHOLD=60
        echo "➡️  Using LENIENT validation (60% required)"
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

# ============================================================================
# AGENT CONFIGURATION
# ============================================================================

echo ""
echo "=================================================="
echo "🤖 AGENT CONFIGURATION"
echo "=================================================="
echo ""
echo "Maximum concurrent agents: "
read -p "(recommended: 4-8, default: 6): " MAX_AGENTS
MAX_AGENTS=${MAX_AGENTS:-6}

echo "➡️  Using $MAX_AGENTS concurrent agents"

# ============================================================================
# FINAL CONFIRMATION
# ============================================================================

echo ""
echo "=================================================="
echo "📊 EXECUTION SUMMARY"
echo "=================================================="
echo ""
echo "Chunks to implement: $CHUNKS"
echo "Validation threshold: $VALIDATION_THRESHOLD%"
echo "Max concurrent agents: $MAX_AGENTS"
echo "Workspace: .claude_workspace/"
echo ""
echo "⚠️  IMPORTANT REMINDERS:"
echo "   • Each chunk must pass validation before proceeding"
echo "   • No workarounds - root causes must be fixed"
echo "   • After 5 failures, escalation to supervisor"
echo "   • Real browser testing will be performed"
echo "   • UI must match Google Gemini style"
echo ""
read -p "Ready to start? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled by user"
    exit 0
fi

# ============================================================================
# MAIN EXECUTION
# ============================================================================

echo ""
echo "=================================================="
echo "🚀 STARTING IMPLEMENTATION"
echo "=================================================="
echo ""

# Start timestamp
START_TIME=$(date +%s)

# Initialize swarm
echo "🔧 Initializing Claude Flow swarm..."
npx claude-flow@alpha swarm init \
    --topology hierarchical \
    --agents $MAX_AGENTS \
    --memory-persistence true \
    --validation-gates true

# Enable monitoring
echo "📊 Starting swarm monitoring..."
npx claude-flow@alpha swarm monitor --interval 5 &
MONITOR_PID=$!

# Execute TypeScript orchestrator
echo "🎯 Running orchestration..."
npx ts-node .claude_workspace/planning/swarm-orchestration.ts \
    --chunks "$CHUNKS" \
    --threshold $VALIDATION_THRESHOLD \
    --max-agents $MAX_AGENTS

# Capture exit code
EXIT_CODE=$?

# Stop monitoring
kill $MONITOR_PID 2>/dev/null || true

# ============================================================================
# POST-EXECUTION REPORT
# ============================================================================

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo ""
echo "=================================================="
echo "📈 EXECUTION COMPLETE"
echo "=================================================="
echo ""
echo "Duration: ${MINUTES}m ${SECONDS}s"
echo ""

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ BUILD SUCCESSFUL!"
    echo ""
    echo "Next steps:"
    echo "1. Review validation reports in .claude_workspace/reports/"
    echo "2. Check screenshots in .claude_workspace/screenshots/"
    echo "3. Run 'npm run dev' to test the application"
    echo "4. Run 'npm test' to verify all tests pass"
    
    # Run final validation
    echo ""
    echo "Running final validation..."
    npm test
    npm run lint
    npm run type-check
    
    # Start dev server for review
    echo ""
    echo "Starting development server for review..."
    echo "Visit http://localhost:3000 to test the application"
    npm run dev
    
else
    echo "⚠️  BUILD INCOMPLETE"
    echo ""
    echo "Some chunks failed validation or were blocked."
    echo ""
    echo "Review the following:"
    echo "1. Blocker reports in .claude_workspace/reports/blocker-*.json"
    echo "2. Validation reports in .claude_workspace/reports/validation-*.json"
    echo "3. Screenshots in .claude_workspace/screenshots/"
    echo ""
    echo "To resume from checkpoint, run this script again and select option 5"
    
    # Save checkpoint
    LAST_COMPLETED=$(ls .claude_workspace/reports/validation-chunk-*.json 2>/dev/null | \
                     grep -o 'chunk-[0-9]*' | \
                     grep -o '[0-9]*' | \
                     sort -n | \
                     tail -1)
    
    if [ ! -z "$LAST_COMPLETED" ]; then
        echo "{\"lastCompletedChunk\": $LAST_COMPLETED, \"timestamp\": \"$(date -Iseconds)\"}" \
            > .claude_workspace/reports/checkpoint.json
        echo ""
        echo "Checkpoint saved. Last completed chunk: $LAST_COMPLETED"
    fi
fi

echo ""
echo "=================================================="
echo "📄 REPORTS AVAILABLE"
echo "=================================================="
echo ""
echo "• Final report: .claude_workspace/reports/final-report.json"
echo "• Validation reports: .claude_workspace/reports/validation-*.json"
echo "• Blocker reports: .claude_workspace/reports/blocker-*.json"
echo "• Screenshots: .claude_workspace/screenshots/"
echo "• Lighthouse reports: .claude_workspace/reports/lighthouse-*.json"
echo ""

# Generate summary
if [ -f ".claude_workspace/reports/final-report.json" ]; then
    COMPLETED=$(jq -r '.completedChunks | length' .claude_workspace/reports/final-report.json)
    RATE=$(jq -r '.completionRate' .claude_workspace/reports/final-report.json)
    echo "Summary: $COMPLETED/17 chunks completed (${RATE}%)"
fi

echo ""
echo "Thank you for using the Vana Frontend Build System!"
echo "=================================================="