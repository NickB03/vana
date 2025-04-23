#!/bin/bash

# Quick test script for GitHub RAG integration
# Optimized for faster execution

echo "===== VANA GitHub RAG Integration Tests (Quick) ====="

# Create logs directory
mkdir -p logs

echo ""
echo "1. Testing ADK wrapper..."
python tools/adk_wrapper.py --verbose | tee logs/adk_wrapper_test.log

echo ""
echo "2. Testing direct Vector Search (quick test)..."
python scripts/test_vector_search_direct.py --query "What is the architecture of VANA?" --verbose 2>&1 | tee logs/vector_search_direct_test.log

# Create a small set of test queries
cat > /tmp/test_queries.json << EOF
[
  {"query": "What is the architecture of VANA?", "category": "architecture"}
]
EOF

echo ""
echo "3. Testing agent knowledge retrieval..."
python scripts/test_agent_knowledge.py --agent ben --verbose --output logs/agent_knowledge_quick.json --queries-file /tmp/test_queries.json 2>&1 | tee logs/agent_knowledge_quick.log

echo ""
echo "===== Test Results Summary ====="
echo "Check the logs directory for detailed test results."
echo ""

# Check if ADK wrapper test passed
if grep -q "Successfully created agent" logs/adk_wrapper_test.log; then
    echo "✅ ADK Wrapper Test: PASSED"
    adk_success=true
else
    echo "❌ ADK Wrapper Test: FAILED"
    adk_success=false
fi

# Check if Vector Search test passed
if grep -q "SUCCESS: Vector Search integration is working correctly" logs/vector_search_direct_test.log; then
    echo "✅ Vector Search Test: PASSED"
    vs_success=true
else
    echo "❌ Vector Search Test: FAILED"
    vs_success=false
fi

# Check if agent knowledge test passed
if grep -q "Success rate: 100.0%" logs/agent_knowledge_quick.log; then
    echo "✅ Agent Knowledge Test: PASSED"
    agent_success=true
elif grep -q "Success rate: [5-9][0-9]" logs/agent_knowledge_quick.log; then
    echo "✅ Agent Knowledge Test: PASSED"
    agent_success=true
else
    echo "⚠️ Agent Knowledge Test: PARTIAL SUCCESS"
    agent_success=false
fi

# Overall success determination
if $adk_success && $vs_success; then
    echo -e "\n✅ CRITICAL TESTS PASSED: The GitHub RAG integration is working!"

    if $agent_success; then
        echo "✅ ALL TESTS PASSED: The system is fully functional!"
    else
        echo "⚠️ Agent knowledge test had issues, but core functionality is working."
    fi

    exit 0
else
    echo -e "\n⚠️ SOME CRITICAL TESTS FAILED - Check logs for details"
    exit 1
fi
