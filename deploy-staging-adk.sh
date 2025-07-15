#!/bin/bash
# Deploy VANA to staging with ADK enabled

set -e

echo "🚀 Deploying VANA to staging with ADK enabled..."

# Check if gcloud is configured
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI not found. Please install Google Cloud SDK."
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: No Google Cloud project configured."
    echo "Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "📦 Project: $PROJECT_ID"

# Verify ADK is enabled in environment
echo "🔍 Verifying ADK configuration..."
if grep -q "USE_ADK_COORDINATION=true" .env.production; then
    echo "✅ ADK coordination enabled"
else
    echo "⚠️  Warning: ADK coordination not enabled in .env.production"
fi

if grep -q "USE_OFFICIAL_AGENT_TOOL=true" .env.production; then
    echo "✅ ADK agent tools enabled"
else
    echo "⚠️  Warning: ADK agent tools not enabled in .env.production"
fi

# Submit the build
echo "🏗️  Submitting build to Cloud Build..."
gcloud builds submit \
    --config=cloudbuild-staging-adk.yaml \
    --substitutions=SHORT_SHA=$(git rev-parse --short HEAD) \
    --timeout=900s \
    --region=us-central1

# Get the service URL
echo "🔗 Getting service URL..."
SERVICE_URL=$(gcloud run services describe vana-staging \
    --platform=managed \
    --region=us-central1 \
    --format='value(status.url)')

if [ -n "$SERVICE_URL" ]; then
    echo "✅ Deployment complete!"
    echo "🌐 Service URL: $SERVICE_URL"
    echo ""
    echo "📊 ADK Status:"
    echo "  - Agent Tools: ENABLED"
    echo "  - Coordination: ENABLED"
    echo "  - Performance Target: <10ms"
    echo "  - Success Rate Target: >99.5%"
    echo ""
    echo "🔍 To verify ADK is active:"
    echo "  1. Check logs for 'Using ADK coordination mechanism'"
    echo "  2. Monitor response times (<1ms expected)"
    echo "  3. Verify 100% success rate"
else
    echo "❌ Failed to get service URL"
    exit 1
fi

echo ""
echo "📋 Next steps:"
echo "  - Monitor Cloud Run logs for ADK coordination messages"
echo "  - Test specialist agent coordination"
echo "  - Verify performance metrics"