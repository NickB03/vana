#!/bin/bash
# Test script for security and resilience components

echo "===== Testing Security and Resilience Components ====="

# Create logs directory if it doesn't exist
mkdir -p logs

# Run tests for credential manager
echo ""
echo "1. Testing Credential Manager..."
python3 -m unittest tests/test_credential_manager.py 2>&1 | tee logs/test_credential_manager.log

# Run tests for access control
echo ""
echo "2. Testing Access Control..."
python3 -m unittest tests/test_access_control.py 2>&1 | tee logs/test_access_control.log

# Run tests for audit logger
echo ""
echo "3. Testing Audit Logger..."
python3 -m unittest tests/test_audit_logger.py 2>&1 | tee logs/test_audit_logger.log

# Run tests for structured logger
echo ""
echo "4. Testing Structured Logger..."
python3 -m unittest tests/test_structured_logger.py 2>&1 | tee logs/test_structured_logger.log

# Run tests for health check
echo ""
echo "5. Testing Health Check..."
python3 -m unittest tests/test_health_check.py 2>&1 | tee logs/test_health_check.log

# Run tests for circuit breaker
echo ""
echo "6. Testing Circuit Breaker..."
python3 -m unittest tests/test_circuit_breaker.py 2>&1 | tee logs/test_circuit_breaker.log

# Check if all tests passed
if grep -q "FAILED" logs/test_credential_manager.log || \
   grep -q "FAILED" logs/test_access_control.log || \
   grep -q "FAILED" logs/test_audit_logger.log || \
   grep -q "FAILED" logs/test_structured_logger.log || \
   grep -q "FAILED" logs/test_health_check.log || \
   grep -q "FAILED" logs/test_circuit_breaker.log; then
    echo ""
    echo "❌ Some tests failed. Check the logs for details."
    exit 1
else
    echo ""
    echo "✅ All tests passed!"
    exit 0
fi
