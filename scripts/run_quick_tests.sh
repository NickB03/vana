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
python scripts/test_vector_search_direct.py --verbose | tee logs/vector_search_direct_test.log

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
if grep -q "SUCCESS" logs/vector_search_direct_test.log; then
    echo "✅ Vector Search Test: PASSED"
    vs_success=true
else
    echo "❌ Vector Search Test: FAILED"
    vs_success=false
fi

# Overall success determination
if $adk_success && $vs_success; then
    echo -e "\n✅ CRITICAL TESTS PASSED: The GitHub RAG integration is working!"
    exit 0
else
    echo -e "\n⚠️ SOME CRITICAL TESTS FAILED - Check logs for details"
    exit 1
fi
