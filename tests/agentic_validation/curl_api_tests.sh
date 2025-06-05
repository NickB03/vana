#!/bin/bash
# COMPREHENSIVE AGENTIC API TESTING WITH cURL
# Tests the VANA service directly via HTTP API
# Based on UiPath Agentic Testing Best Practices

set -e

SERVICE_URL="https://vana-qqugqgsbcq-uc.a.run.app"
TEST_RESULTS_FILE="curl_test_results.json"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "🔬 COMPREHENSIVE AGENTIC API TESTING"
echo "===================================="
echo "Service: $SERVICE_URL"
echo "Timestamp: $TIMESTAMP"
echo ""

# Initialize results
echo '{"timestamp":"'$TIMESTAMP'","tests":[],"summary":{"total":0,"passed":0,"failed":0}}' > $TEST_RESULTS_FILE

# Test counter
TEST_COUNT=0
PASSED_COUNT=0
FAILED_COUNT=0

# Function to run a test
run_test() {
    local test_name="$1"
    local query="$2"
    local expected_pattern="$3"
    local forbidden_pattern="$4"
    
    echo "🧪 Testing: $test_name"
    echo "Query: $query"
    
    TEST_COUNT=$((TEST_COUNT + 1))
    
    # Make API request (adjust endpoint as needed)
    response=$(curl -s -X POST "$SERVICE_URL/api/chat" \
        -H "Content-Type: application/json" \
        -d "{\"message\":\"$query\"}" \
        --max-time 30 || echo "ERROR: Request failed")
    
    # Check if request succeeded
    if [[ "$response" == "ERROR:"* ]]; then
        echo "❌ FAILED: $test_name - Request failed"
        FAILED_COUNT=$((FAILED_COUNT + 1))
        return 1
    fi
    
    # Check for forbidden patterns (task ID exposure)
    if [[ -n "$forbidden_pattern" ]] && echo "$response" | grep -qi "$forbidden_pattern"; then
        echo "❌ FAILED: $test_name - Found forbidden pattern: $forbidden_pattern"
        echo "Response excerpt: ${response:0:200}..."
        FAILED_COUNT=$((FAILED_COUNT + 1))
        return 1
    fi
    
    # Check for expected patterns
    if [[ -n "$expected_pattern" ]] && ! echo "$response" | grep -qi "$expected_pattern"; then
        echo "❌ FAILED: $test_name - Missing expected pattern: $expected_pattern"
        echo "Response excerpt: ${response:0:200}..."
        FAILED_COUNT=$((FAILED_COUNT + 1))
        return 1
    fi
    
    echo "✅ PASSED: $test_name"
    PASSED_COUNT=$((PASSED_COUNT + 1))
    return 0
}

# Test 1: Model Configuration Validation
echo ""
echo "🔬 TEST 1: MODEL CONFIGURATION"
echo "==============================="
run_test "model_config" \
    "What model are you using?" \
    "deepseek\|reasoning\|step-by-step" \
    ""

# Test 2: Task ID Invisibility - Critical Test
echo ""
echo "🔬 TEST 2: TASK ID INVISIBILITY (CRITICAL)"
echo "=========================================="
run_test "task_id_invisibility_travel" \
    "Plan a trip to Paris from July 12th to July 16th" \
    "" \
    "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\|check_task_status\|Task ID\|monitor progress"

run_test "task_id_invisibility_hotels" \
    "Search for hotels in New York" \
    "" \
    "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\|check_task_status\|Task ID\|monitor progress"

run_test "task_id_invisibility_flights" \
    "Find flights from London to Tokyo" \
    "" \
    "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\|check_task_status\|Task ID\|monitor progress"

# Test 3: Orchestrator Ownership - Critical Test
echo ""
echo "🔬 TEST 3: ORCHESTRATOR OWNERSHIP (CRITICAL)"
echo "============================================"
run_test "ownership_weather" \
    "What's the weather in San Francisco?" \
    "I found\|I can tell you\|I checked\|the weather is\|it's\|currently" \
    "weather agent said\|the weather agent reports\|according to the weather agent"

run_test "ownership_travel" \
    "Plan a trip to Tokyo" \
    "I'll\|I will\|I can\|I've\|I have\|plan\|suggest\|recommend" \
    "travel agent said\|the travel agent suggests\|according to the travel agent"

run_test "ownership_hotels" \
    "Search for hotels in Miami" \
    "I found\|I searched\|I can show you\|hotels\|accommodations" \
    "hotel agent\|hotel specialist said\|the hotel search agent"

# Test 4: Agent-as-Tools Pattern
echo ""
echo "🔬 TEST 4: AGENT-AS-TOOLS PATTERN"
echo "================================="
run_test "no_transfers" \
    "Plan a complete trip to Japan including flights and hotels" \
    "I'll\|I can\|I will" \
    "transferring.*to.*agent\|handing.*over.*to\|let me.*transfer.*you\|connecting.*you.*with"

# Test 5: Response Quality and Functionality
echo ""
echo "🔬 TEST 5: RESPONSE QUALITY"
echo "==========================="
run_test "response_quality" \
    "Help me plan a weekend trip" \
    "plan\|trip\|weekend\|help\|suggest" \
    "error\|failed\|unable\|sorry"

# Generate final report
echo ""
echo "🔬 FINAL TEST RESULTS"
echo "===================="
echo "Total Tests: $TEST_COUNT"
echo "Passed: $PASSED_COUNT"
echo "Failed: $FAILED_COUNT"

if [ $FAILED_COUNT -eq 0 ]; then
    echo "✅ ALL TESTS PASSED!"
    SUCCESS_RATE="100.0"
else
    SUCCESS_RATE=$(echo "scale=1; $PASSED_COUNT * 100 / $TEST_COUNT" | bc)
    echo "❌ $FAILED_COUNT TESTS FAILED"
fi

echo "Success Rate: $SUCCESS_RATE%"

# Update results file
jq --arg total "$TEST_COUNT" \
   --arg passed "$PASSED_COUNT" \
   --arg failed "$FAILED_COUNT" \
   --arg rate "$SUCCESS_RATE" \
   '.summary.total = ($total | tonumber) | 
    .summary.passed = ($passed | tonumber) | 
    .summary.failed = ($failed | tonumber) |
    .summary.success_rate = $rate' \
   $TEST_RESULTS_FILE > temp.json && mv temp.json $TEST_RESULTS_FILE

echo ""
echo "📊 Detailed results saved to: $TEST_RESULTS_FILE"

# Exit with appropriate code
if [ $FAILED_COUNT -eq 0 ]; then
    exit 0
else
    exit 1
fi
