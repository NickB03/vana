#!/bin/bash
# Deploy fix script - ensures Dockerfile is used, not buildpacks

echo "🔧 Fixing Cloud Build deployment issue..."
echo "📍 Current directory: $(pwd)"

# 1. Verify we're in the correct directory
if [ ! -f "Dockerfile" ]; then
    echo "❌ ERROR: Dockerfile not found in current directory!"
    echo "Please run from /Users/nick/Development/vana"
    exit 1
fi

# 2. Force Cloud Build to use Dockerfile (not buildpacks)
echo "🚀 Deploying with explicit Dockerfile usage..."
gcloud run deploy vana-staging \
  --source . \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_API_KEY=${GOOGLE_API_KEY},USE_OFFICIAL_AGENT_TOOL=true,USE_ADK_COORDINATION=true,USE_ADK_EVENTS=true" \
  --port=8081 \
  --memory=2Gi \
  --cpu=2 \
  --timeout=900 \
  --max-instances=10 \
  --min-instances=1 \
  --no-use-http2 \
  --project=analystai-454200 \
  --quiet

echo "✅ Deployment initiated with Dockerfile (not buildpacks)"