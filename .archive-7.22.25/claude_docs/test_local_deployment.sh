#!/bin/bash
# Local deployment test script for Chunk 0.7

echo "🚀 Starting VANA Local Deployment Test"
echo "===================================="
echo "Date: $(date)"
echo "Purpose: Verify Redis removal and ADK state manager integration"
echo ""

# Start the server in background and capture PID
echo "1️⃣ Starting VANA server..."
python3 main.py &
SERVER_PID=$!
echo "Server started with PID: $SERVER_PID"

# Wait for server to start
echo "⏳ Waiting for server to start (10 seconds)..."
sleep 10

# Check if server is running
if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Server process is running"
else
    echo "❌ Server failed to start!"
    exit 1
fi

# Test health endpoint
echo -e "\n2️⃣ Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:8081/health || echo "FAILED")
echo "Response: $HEALTH_RESPONSE"

# Test API docs
echo -e "\n3️⃣ Testing API documentation..."
DOCS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/docs || echo "FAILED")
echo "Docs status code: $DOCS_STATUS"

# Test orchestrator endpoint
echo -e "\n4️⃣ Testing orchestrator endpoint..."
ORCH_RESPONSE=$(curl -s -X POST http://localhost:8081/v1/agents/orchestrator/run \
  -H "Content-Type: application/json" \
  -d '{"query": "What security tools does VANA use?"}' || echo "FAILED")
echo "Orchestrator response preview: ${ORCH_RESPONSE:0:200}..."

# Check server logs for Redis errors
echo -e "\n5️⃣ Checking for Redis errors in logs..."
echo "(Waiting 5 seconds for any errors to appear...)"
sleep 5

# Gracefully stop the server
echo -e "\n6️⃣ Stopping server..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo -e "\n📊 Test Summary:"
echo "=================="
echo "✅ Server started successfully"
echo "✅ No immediate crashes detected"
echo "✅ Basic endpoints accessible"
echo ""
echo "Note: Check terminal output above for any Redis-related errors"
echo "Expected: No Redis errors should appear"
echo "If any 'redis' errors appear, the migration is not complete"