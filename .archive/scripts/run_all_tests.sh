#!/bin/bash

# Comprehensive test script for GitHub RAG integration

echo "===== VANA GitHub RAG Integration Tests ====="

# Create logs directory
mkdir -p logs

echo ""
echo "1. Testing ADK wrapper..."
python tools/adk_wrapper.py --verbose | tee logs/adk_wrapper_test.log

echo ""
echo "2. Testing direct Vector Search..."
python scripts/test_vector_search_direct.py --verbose | tee logs/vector_search_direct_test.log

echo ""
echo "3. Testing agent knowledge retrieval..."
python scripts/test_agent_knowledge.py --verbose --output logs/agent_knowledge_test.json | tee logs/agent_knowledge_test.log

echo ""
echo "4. Testing agent delegation knowledge..."
python scripts/test_agent_delegation.py --verbose --output logs/agent_delegation_test.json | tee logs/agent_delegation_test.log

echo ""
echo "===== Test Results Summary ====="
echo "Check the logs directory for detailed test results."
echo ""
echo "Success rates:"
echo "- Vector Search: $(grep "Success rate" logs/vector_search_direct_test.log | tail -1 || echo "N/A")"
echo "- Agent Knowledge: $(grep "Success rate" logs/agent_knowledge_test.log | tail -1 || echo "N/A")"
echo "- Agent Delegation: $(grep "Success rate" logs/agent_delegation_test.log | tail -1 || echo "N/A")"
echo ""

# Check if all tests passed
if grep -q "SUCCESS" logs/vector_search_direct_test.log && \
   grep -q "Success rate: [7-9][0-9]" logs/agent_knowledge_test.log && \
   grep -q "Success rate: [7-9][0-9]" logs/agent_delegation_test.log; then
    echo "✅ ALL TESTS PASSED"
    exit 0
else
    echo "⚠️ SOME TESTS FAILED - Check logs for details"
    exit 1
fi
