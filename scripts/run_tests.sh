#!/bin/bash
# Run all tests for VANA
# This script runs all the tests for VANA components

# Create logs directory
mkdir -p logs

# Set variables
LOGS_DIR="logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEST_LOG="$LOGS_DIR/tests_$TIMESTAMP.log"

# Print header
echo "==================================================="
echo "VANA Test Suite"
echo "==================================================="
echo "Timestamp: $TIMESTAMP"
echo "Log file: $TEST_LOG"
echo "==================================================="

# Run tests
echo "Running tests..."

# Run basic tests
echo "Running basic tests..."
python tests/test_web_search_mock.py
python tests/test_enhanced_hybrid_search.py
python tests/test_feedback_manager.py

# Run comprehensive tests
echo "Running comprehensive tests..."
python tests/test_suite.py
python tests/test_enhanced_hybrid_search_comprehensive.py
python tests/test_knowledge_base_comprehensive.py

# Check if tests were successful
if [ $? -eq 0 ]; then
    echo "All tests completed successfully."
else
    echo "Some tests failed. Check the log file for details."
    exit 1
fi

# Print summary
echo "==================================================="
echo "Test Summary"
echo "==================================================="
echo "All tests completed."
echo "Log file: $TEST_LOG"
echo "==================================================="

echo "Done."
