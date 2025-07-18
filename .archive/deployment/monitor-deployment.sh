#!/bin/bash
# Monitor deployment progress

echo "🔍 Monitoring deployment progress..."

# Check build status
BUILD_ID="456c8f31-72f3-4918-87ed-81d0d874e855"
echo -n "Build status: "
gcloud builds describe $BUILD_ID --region=us-central1 --format="value(status)" 2>/dev/null || echo "Unknown"

# Check service status
echo -n "Service status: "
gcloud run services describe vana-staging --region=us-central1 --format="value(status.conditions[0].status)" 2>/dev/null || echo "Not deployed"

# Get service URL if ready
URL=$(gcloud run services describe vana-staging --region=us-central1 --format="value(status.url)" 2>/dev/null)
if [ ! -z "$URL" ]; then
    echo "Service URL: $URL"
    
    # Test health endpoint
    echo -n "Health check: "
    curl -s -o /dev/null -w "%{http_code}" "$URL/health" || echo "Failed"
fi

echo ""
echo "📊 Build logs: https://console.cloud.google.com/cloud-build/builds;region=us-central1/$BUILD_ID?project=960076421399"
echo "📋 Service logs: https://console.cloud.google.com/run/detail/us-central1/vana-staging/logs?project=analystai-454200"