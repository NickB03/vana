#!/bin/bash
# CodeRabbit CLI Helper Script for Claude Code Integration
# Usage: ./scripts/coderabbit-helper.sh [mode]

set -e

# Define available modes using case statements for compatibility
get_task_name() {
    case "$1" in
        "interactive") echo "CodeRabbit: Interactive Review" ;;
        "plain") echo "CodeRabbit: Plain Text Review" ;;
        "prompt") echo "CodeRabbit: Prompt Only" ;;
        "uncommitted") echo "CodeRabbit: Uncommitted Changes" ;;
        "committed") echo "CodeRabbit: Committed Changes" ;;
        "config") echo "CodeRabbit: Custom Config" ;;
        *) echo "" ;;
    esac
}

# Function to show available modes
show_help() {
    echo "CodeRabbit CLI Helper - Available modes:"
    echo ""
    echo "  interactive - CodeRabbit: Interactive Review"
    echo "  plain - CodeRabbit: Plain Text Review"
    echo "  prompt - CodeRabbit: Prompt Only"
    echo "  uncommitted - CodeRabbit: Uncommitted Changes"
    echo "  committed - CodeRabbit: Committed Changes"
    echo "  config - CodeRabbit: Custom Config"
    echo ""
    echo "Usage: $0 [mode]"
    echo "Example: $0 plain"
}

# Get the mode from command line argument
MODE=${1:-"plain"}

# Handle help request
if [ "$MODE" = "--help" ] || [ "$MODE" = "-h" ]; then
    show_help
    exit 0
fi

# Get the task name
TASK_NAME=$(get_task_name "$MODE")

# Check if mode exists
if [ -z "$TASK_NAME" ]; then
    echo "Error: Unknown mode '$MODE'"
    echo ""
    show_help
    exit 1
fi

echo "🐰 Launching CodeRabbit: $TASK_NAME"
echo "📂 Working directory: $(pwd)"
echo ""

# Try different methods to run the VS Code task
if command -v code >/dev/null 2>&1; then
    # Method 1: Use VS Code CLI to run task
    echo "Running via VS Code CLI..."
    code --command workbench.action.tasks.runTask "$TASK_NAME"
else
    # Method 2: Fallback to direct terminal execution
    echo "VS Code CLI not available, running directly in terminal..."
    case $MODE in
        "interactive")
            coderabbit
            ;;
        "plain")
            coderabbit --plain
            ;;
        "prompt")
            coderabbit --prompt-only
            ;;
        "uncommitted")
            coderabbit --plain --type uncommitted
            ;;
        "committed")
            coderabbit --plain --type committed
            ;;
        "config")
            coderabbit --plain --config CLAUDE.md
            ;;
    esac
fi

echo ""
echo "✅ CodeRabbit analysis complete!"