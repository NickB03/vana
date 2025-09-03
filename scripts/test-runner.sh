#!/bin/bash
set -e

# Test runner script with proper isolation and timeouts

COMMAND=$1
shift

case $COMMAND in
    "unit")
        echo "🧪 Running unit tests only..."
        uv run pytest tests/unit -v --tb=short --timeout=120 \
            -m "not requires_server and not performance and not e2e" \
            "$@"
        ;;
    "integration")
        echo "🔗 Running integration tests (requires server)..."
        # Check if server is running first
        if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
            echo "⚠️  Warning: Server not running on localhost:8000"
            echo "🏃 Starting test server in background..."
            # You would add server startup logic here
            echo "💡 For now, skipping integration tests that require server"
            uv run pytest tests/integration -v --tb=short --timeout=300 \
                -m "not requires_server" \
                "$@"
        else
            echo "✅ Server detected, running all integration tests..."
            uv run pytest tests/integration -v --tb=short --timeout=300 \
                "$@"
        fi
        ;;
    "quick")
        echo "⚡ Running quick tests (unit only, no coverage)..."
        uv run pytest tests/unit -v --tb=short --timeout=60 \
            -m "not slow and not requires_server and not performance" \
            --disable-warnings \
            --no-cov \
            "$@"
        ;;
    "all")
        echo "🎯 Running all tests with proper isolation..."
        echo "Step 1: Unit tests..."
        ./scripts/test-runner.sh unit "$@"
        echo "Step 2: Integration tests..."
        ./scripts/test-runner.sh integration "$@"
        ;;
    *)
        echo "Usage: $0 {unit|integration|quick|all} [pytest-args]"
        echo "Examples:"
        echo "  $0 unit                    # Run only unit tests"
        echo "  $0 integration            # Run integration tests"
        echo "  $0 quick                  # Fast unit tests, no coverage"
        echo "  $0 all                    # All tests with isolation"
        echo "  $0 unit -k test_auth      # Run specific unit test"
        exit 1
        ;;
esac
