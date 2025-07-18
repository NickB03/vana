#!/bin/bash
# Advanced Knowledge Base Expansion Script for VANA

# Create logs directory if it doesn't exist
mkdir -p logs

# Set timestamp for output files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Set output file paths
STATS_FILE="logs/kb_expansion_stats_${TIMESTAMP}.json"

echo "===== Running Advanced Knowledge Base Expansion ====="
echo "Timestamp: ${TIMESTAMP}"
echo "Statistics will be saved to: ${STATS_FILE}"

# Check if directory argument is provided
if [ -z "$1" ]; then
  echo "Error: No directory specified."
  echo "Usage: $0 <directory> [--recursive] [--no-vector-search] [--no-knowledge-graph]"
  exit 1
fi

DIRECTORY="$1"
shift

# Check if directory exists
if [ ! -d "$DIRECTORY" ]; then
  echo "Error: Directory '$DIRECTORY' not found."
  exit 1
fi

# Process additional arguments
RECURSIVE=""
NO_VECTOR_SEARCH=""
NO_KNOWLEDGE_GRAPH=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --recursive)
      RECURSIVE="--recursive"
      ;;
    --no-vector-search)
      NO_VECTOR_SEARCH="--no-vector-search"
      ;;
    --no-knowledge-graph)
      NO_KNOWLEDGE_GRAPH="--no-knowledge-graph"
      ;;
    *)
      echo "Warning: Unknown argument '$1'"
      ;;
  esac
  shift
done

echo "Processing directory: $DIRECTORY"
echo "Options: Recursive: ${RECURSIVE:-No}, Skip Vector Search: ${NO_VECTOR_SEARCH:-No}, Skip Knowledge Graph: ${NO_KNOWLEDGE_GRAPH:-No}"

# Run knowledge base expansion
python scripts/expand_knowledge_base_advanced.py \
  --directory "$DIRECTORY" \
  --file-types txt md pdf \
  $RECURSIVE \
  $NO_VECTOR_SEARCH \
  $NO_KNOWLEDGE_GRAPH \
  --output "${STATS_FILE}"

# Check if expansion was successful
if [ $? -eq 0 ]; then
  echo "✅ Knowledge base expansion completed successfully!"
  echo "Statistics saved to: ${STATS_FILE}"

  # Display summary statistics
  echo ""
  echo "===== Expansion Summary ====="
  python -c "import json; stats = json.load(open('${STATS_FILE}')); print(f'Documents Processed: {stats.get(\"documents_processed\", 0)}'); print(f'Chunks Created: {stats.get(\"chunks_created\", 0)}'); print(f'Entities Stored: {stats.get(\"entities_stored\", 0)}'); print(f'Relationships Stored: {stats.get(\"relationships_stored\", 0)}')"

  # Run evaluation to measure improvement
  echo ""
  echo "===== Running Evaluation to Measure Improvement ====="
  EVAL_REPORT="logs/post_expansion_evaluation_${TIMESTAMP}.md"

  python scripts/enhanced_evaluation.py \
    --queries tests/test_data/comprehensive_test_queries.json \
    --output "${EVAL_REPORT}" \
    --vector-search \
    --enhanced-hybrid-search

  if [ $? -eq 0 ]; then
    echo "✅ Post-expansion evaluation completed successfully!"
    echo "Evaluation report saved to: ${EVAL_REPORT}"
  else
    echo "❌ Post-expansion evaluation failed."
  fi
else
  echo "❌ Knowledge base expansion failed."
  exit 1
fi

echo ""
echo "Next steps:"
echo "1. Review the expansion statistics"
echo "2. Review the post-expansion evaluation report"
echo "3. Identify additional content to add to the knowledge base"
echo "4. Continue iterating to improve knowledge base quality"

exit 0
