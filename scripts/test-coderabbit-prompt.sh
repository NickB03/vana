#!/bin/bash
# Test script to capture CodeRabbit prompt-only output
echo "Testing CodeRabbit --prompt-only mode..."
echo "Working directory: $(pwd)"
echo "================================"

# Check if coderabbit is available
if ! command -v coderabbit >/dev/null 2>&1; then
    echo "❌ CodeRabbit CLI not found in PATH"
    exit 1
fi

# Run CodeRabbit in prompt-only mode and capture output
echo "Running: coderabbit --prompt-only"
echo "================================"
coderabbit --prompt-only 2>&1
echo "================================"
echo "✅ Prompt-only test complete"