#!/bin/bash
# Check deployment health after recursion fix

echo "🔍 Checking VANA deployment health..."
echo "=================================="

# Get service details
SERVICE_URL=$(gcloud run services describe vana-staging --region=us-central1 --format="value(status.url)" 2>/dev/null)
REVISION=$(gcloud run services describe vana-staging --region=us-central1 --format="value(status.latestReadyRevisionName)" 2>/dev/null)

echo "Service URL: $SERVICE_URL"
echo "Active Revision: $REVISION"
echo ""

# Check if service is ready
echo "1. Health Check:"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/health" 2>/dev/null)
if [ "$HEALTH_STATUS" = "200" ]; then
    echo "   ✅ Health endpoint responding (HTTP $HEALTH_STATUS)"
    HEALTH_JSON=$(curl -s "$SERVICE_URL/health")
    echo "   $HEALTH_JSON" | jq '.' 2>/dev/null || echo "   $HEALTH_JSON"
else
    echo "   ❌ Health check failed (HTTP $HEALTH_STATUS)"
fi

echo ""
echo "2. Checking for recursion errors in logs:"
RECURSION_ERRORS=$(gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=vana-staging AND textPayload:'RecursionError'" --limit=5 --format="value(timestamp)" --project=analystai-454200 2>/dev/null | wc -l)
if [ "$RECURSION_ERRORS" -eq "0" ]; then
    echo "   ✅ No recursion errors found"
else
    echo "   ⚠️  Found $RECURSION_ERRORS recursion error(s) in recent logs"
fi

echo ""
echo "3. Testing chat endpoint:"
CHAT_TEST=$(curl -s -X POST "$SERVICE_URL/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "stream": false}' 2>/dev/null)
  
if echo "$CHAT_TEST" | grep -q "content"; then
    echo "   ✅ Chat endpoint responding"
else
    echo "   ❌ Chat endpoint not working properly"
    echo "   Response: $CHAT_TEST"
fi

echo ""
echo "4. Environment variables check:"
ENV_VARS=$(gcloud run services describe vana-staging --region=us-central1 --format="value(spec.template.spec.containers[0].env[].name)" 2>/dev/null)
if echo "$ENV_VARS" | grep -q "PYTHON_RECURSION_LIMIT"; then
    echo "   ✅ PYTHON_RECURSION_LIMIT is set"
else
    echo "   ❌ PYTHON_RECURSION_LIMIT not found"
fi

echo ""
echo "=================================="
echo "📊 Logs: https://console.cloud.google.com/run/detail/us-central1/vana-staging/logs?project=analystai-454200"
echo "🔧 Build: https://console.cloud.google.com/cloud-build/builds;region=us-central1/060a3a49-9c42-4dbd-bca3-9e74254814a2?project=960076421399"