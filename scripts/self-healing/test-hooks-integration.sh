#!/bin/bash

# Test Claude Flow Hook Integration
# Validates that hooks are properly integrated with official Claude Flow API

echo "🧪 Testing Claude Flow Hook Integration..."
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -e "\n📋 Test $TESTS_RUN: $test_name"
    echo "  Command: $test_command"
    
    # Run the test
    result=$(eval "$test_command" 2>&1)
    
    # Check result
    if [[ "$result" == *"$expected_result"* ]]; then
        echo -e "  ${GREEN}✅ PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "  ${RED}❌ FAILED${NC}"
        echo "  Expected: $expected_result"
        echo "  Got: $result"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Test 1: Check Claude Flow is available
run_test "Claude Flow Availability" \
    "npx claude-flow@alpha --version" \
    "2.0.0"

# Test 2: Test notification hook
run_test "Notification Hook" \
    "npx claude-flow@alpha hooks notify --message 'Test notification'" \
    "NOTIFICATION"

# Test 3: Test pre-task hook
run_test "Pre-Task Hook" \
    "npx claude-flow@alpha hooks pre-task --description 'Test task'" \
    "Pre-task hook"

# Test 4: Test post-task hook
run_test "Post-Task Hook" \
    "npx claude-flow@alpha hooks post-task --task-id 'test-123'" \
    "Post-task hook"

# Test 5: Test session restore
run_test "Session Restore" \
    "npx claude-flow@alpha hooks session-restore --session-id 'test-session'" \
    "session"

# Test 6: Test common functions library
run_test "Common Functions Library" \
    "test -f scripts/self-healing/hooks/common-functions.sh && echo 'exists'" \
    "exists"

# Test 7: Test memory store function from common library
run_test "Memory Store Function" \
    "source scripts/self-healing/hooks/common-functions.sh && memory_store 'test/key' '{\"test\":\"value\"}' && echo 'stored'" \
    "stored"

# Test 8: Test memory retrieve function
run_test "Memory Retrieve Function" \
    "source scripts/self-healing/hooks/common-functions.sh && memory_store 'test/retrieve' '{\"data\":\"test\"}' && memory_retrieve 'test/retrieve' | grep -q 'data' && echo 'retrieved'" \
    "retrieved"

# Test 9: Test hook script execution
run_test "Hook Script Execution" \
    "bash scripts/self-healing/hooks/pre-task-prepare.sh 'Test task' 2>&1 | grep -q 'Preparing' && echo 'executed'" \
    "executed"

# Test 10: Test fallback directory
run_test "Fallback Memory Directory" \
    "test -d .claude/memory && echo 'exists' || (mkdir -p .claude/memory && echo 'created')" \
    "exists"

# Summary
echo ""
echo "========================================="
echo "📊 Test Summary:"
echo "  Total Tests: $TESTS_RUN"
echo -e "  ${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "  ${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✨ All tests passed! Hooks are properly integrated.${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️ Some tests failed. Review and fix the integration.${NC}"
    exit 1
fi