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
echo "Running tests with pytest..."

# Execute the full test suite with pytest
poetry run pytest -vv | tee "$TEST_LOG"
EXIT_STATUS=${PIPESTATUS[0]}

# Check if tests were successful
if [ $EXIT_STATUS -eq 0 ]; then
    echo "All tests completed successfully."
else
    echo "Some tests failed. Check the log file for details."
fi

# Print summary
echo "==================================================="
echo "Test Summary"
echo "==================================================="
echo "All tests completed."
echo "Log file: $TEST_LOG"
echo "==================================================="

echo "Done."
exit $EXIT_STATUS
