#!/bin/bash
# Run Enhanced Evaluation Framework for VANA

# Create logs directory if it doesn't exist
mkdir -p logs

# Set timestamp for output files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Set output file paths
REPORT_FILE="logs/evaluation_report_${TIMESTAMP}.md"
STATS_FILE="logs/evaluation_stats_${TIMESTAMP}.json"

echo "===== Running Enhanced Evaluation Framework ====="
echo "Timestamp: ${TIMESTAMP}"
echo "Report will be saved to: ${REPORT_FILE}"

# Run evaluation with comprehensive test queries
python scripts/enhanced_evaluation.py \
  --queries tests/test_data/comprehensive_test_queries.json \
  --output "${REPORT_FILE}" \
  --top-k 10 \
  --vector-search \
  --enhanced-hybrid-search \
  --include-web

# Check if evaluation was successful
if [ $? -eq 0 ]; then
  echo "✅ Evaluation completed successfully!"
  echo "Report saved to: ${REPORT_FILE}"
else
  echo "❌ Evaluation failed."
  exit 1
fi

echo ""
echo "===== Evaluation Summary ====="
# Extract and display summary from the report
grep -A 5 "Average Metrics" "${REPORT_FILE}" | head -n 6

echo ""
echo "For detailed results, see the full report: ${REPORT_FILE}"
echo ""
echo "Next steps:"
echo "1. Review the evaluation report"
echo "2. Identify areas for improvement"
echo "3. Expand the knowledge base in weak areas"
echo "4. Re-run evaluation to measure improvement"

exit 0
