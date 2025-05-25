#!/bin/bash

# Run Vana Tests
# This script runs automated tests on the Vana agent using Juno as the tester

# Set up environment
cd "$(dirname "$0")/.."
source .venv/bin/activate

# Check if the ADK server is running
if ! curl -s http://localhost:8000 > /dev/null; then
    echo "ADK server is not running. Starting it now..."
    cd adk-setup
    nohup adk web > ../adk_server.log 2>&1 &
    cd ..
    echo "Waiting for ADK server to start..."
    sleep 10
fi

# Parse command line arguments
INTERACTIVE=false
AUTONOMOUS=false
SINGLE_TEST=""
TEST_CASES="scripts/vana_test_cases.json"
OUTPUT_FILE="test_results/$(date +%Y%m%d_%H%M%S)_vana_test_report.json"
OUTPUT_DIR="test_results"
PREVIOUS_RESULTS_DIR="test_results"
IGNORE_PREVIOUS=false
MAX_TESTS=10

# Create output directory if it doesn't exist
mkdir -p test_results

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -i|--interactive)
            INTERACTIVE=true
            shift
            ;;
        -a|--autonomous)
            AUTONOMOUS=true
            shift
            ;;
        -s|--single-test)
            SINGLE_TEST="$2"
            shift
            shift
            ;;
        -t|--test-cases)
            TEST_CASES="$2"
            shift
            shift
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift
            shift
            ;;
        -m|--max-tests)
            MAX_TESTS="$2"
            shift
            shift
            ;;
        -p|--previous-results)
            PREVIOUS_RESULTS_DIR="$2"
            shift
            shift
            ;;
        -d|--output-dir)
            OUTPUT_DIR="$2"
            shift
            shift
            ;;
        -i|--ignore-previous)
            IGNORE_PREVIOUS=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run the tests
if [ "$INTERACTIVE" = true ]; then
    echo "Running in interactive mode..."
    python scripts/test_vana_agent.py --interactive
elif [ "$AUTONOMOUS" = true ]; then
    echo "Running in autonomous mode with Juno as the tester..."

    # Build the command with appropriate options
    COMMAND="python scripts/juno_autonomous_tester.py --max-tests $MAX_TESTS --output $OUTPUT_DIR"

    if [ "$IGNORE_PREVIOUS" = true ]; then
        COMMAND="$COMMAND --ignore-previous"
    else
        COMMAND="$COMMAND --previous-results $PREVIOUS_RESULTS_DIR"
    fi

    echo "Executing: $COMMAND"
    eval $COMMAND
elif [ -n "$SINGLE_TEST" ]; then
    echo "Running single test: $SINGLE_TEST..."
    python scripts/juno_test_agent.py --test-cases "$TEST_CASES" --output "$OUTPUT_FILE" --single-test "$SINGLE_TEST"
else
    echo "Running all tests from test cases file..."
    python scripts/juno_test_agent.py --test-cases "$TEST_CASES" --output "$OUTPUT_FILE"
fi

# Make the script executable
chmod +x scripts/run_vana_tests.sh
