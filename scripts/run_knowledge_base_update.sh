#!/bin/bash
# Run Knowledge Base Update
# This script expands the knowledge base with new documents and evaluates the results.

# Create logs directory
mkdir -p logs

# Set variables
DOCS_DIR="knowledge_docs"
LOGS_DIR="logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
EXPANSION_LOG="$LOGS_DIR/expansion_$TIMESTAMP.json"
EVALUATION_LOG="$LOGS_DIR/evaluation_$TIMESTAMP.json"

# Print header
echo "==================================================="
echo "VANA Knowledge Base Update"
echo "==================================================="
echo "Timestamp: $TIMESTAMP"
echo "Documents directory: $DOCS_DIR"
echo "Logs directory: $LOGS_DIR"
echo "==================================================="

# Expand Knowledge Base
echo "Expanding Knowledge Base..."
python scripts/expand_knowledge_base.py "$DOCS_DIR" --recursive --output "$EXPANSION_LOG"

# Check if expansion was successful
if [ $? -eq 0 ]; then
    echo "Knowledge Base expansion completed successfully."
    echo "Expansion log saved to $EXPANSION_LOG"
else
    echo "Knowledge Base expansion failed."
    exit 1
fi

# Evaluate Knowledge Base
echo "Evaluating Knowledge Base..."
python scripts/evaluate_knowledge_base.py --output "$EVALUATION_LOG"

# Check if evaluation was successful
if [ $? -eq 0 ]; then
    echo "Knowledge Base evaluation completed successfully."
    echo "Evaluation log saved to $EVALUATION_LOG"
else
    echo "Knowledge Base evaluation failed."
    exit 1
fi

# Print summary
echo "==================================================="
echo "Knowledge Base Update Summary"
echo "==================================================="
echo "Expansion log: $EXPANSION_LOG"
echo "Evaluation log: $EVALUATION_LOG"
echo "==================================================="

# Make the script executable
chmod +x scripts/run_knowledge_base_update.sh

echo "Done."
