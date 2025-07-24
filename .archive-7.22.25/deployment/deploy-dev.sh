#!/bin/bash

# VANA Development Deployment Script
# Deploys to vana-dev service for testing

set -e

echo "🚀 Starting VANA Development Deployment..."

# Check if we're in the right directory
if [ ! -f "pyproject.toml" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Error: Not authenticated with gcloud. Run 'gcloud auth login'"
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: No project set. Run 'gcloud config set project PROJECT_ID'"
    exit 1
fi

# Check if Google API Key secret exists
echo "🔐 Checking for Google API Key secret..."
if gcloud secrets describe gemini-api-key --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "✅ Google API Key secret exists"
else
    echo "❌ ERROR: Google API Key secret not found!"
    echo "   Please create it with:"
    echo "   echo -n 'YOUR_API_KEY' | gcloud secrets create gemini-api-key --data-file=- --project=$PROJECT_ID"
    exit 1
fi

echo "📋 Project: $PROJECT_ID"
echo "🎯 Target: vana-dev (Development)"
echo "💾 Resources: 1 vCPU, 1 GiB memory"

# Get git short SHA for tagging
SHORT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
echo "🏷️  Build tag: $SHORT_SHA"

# Submit build with substitutions
echo "🔨 Building and deploying..."
gcloud builds submit \
    --config=deployment/cloudbuild-dev.yaml \
    --substitutions="_SHORT_SHA=$SHORT_SHA" \
    --timeout=1200s \
    .

# Get the service URL
SERVICE_URL=$(gcloud run services describe vana-dev --region=us-central1 --format="value(status.url)")

echo "✅ Development deployment complete!"
echo "🌐 Service URL: $SERVICE_URL"
echo "🔍 Health check: $SERVICE_URL/health"

# Test health endpoint
echo "🏥 Testing health endpoint..."
if curl -s -f "$SERVICE_URL/health" > /dev/null 2>&1; then
    echo "✅ Health check passed"
else
    echo "⚠️  Health check failed - service may still be starting"
    echo "   Check logs: gcloud run logs read --service=vana-dev --region=us-central1 --limit=50"
fi

echo ""
echo "📊 View logs:"
echo "   gcloud run logs read --service=vana-dev --region=us-central1 --limit=50"
echo ""
echo "🎉 VANA Development deployment submitted!"