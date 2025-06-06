#!/bin/bash

# VANA Production Deployment Script
# Deploys to vana-prod service with production optimizations

set -e

echo "🚀 Starting VANA Production Deployment..."

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

echo "📋 Project: $PROJECT_ID"
echo "🎯 Target: vana-prod (Production)"
echo "💾 Resources: 2 vCPU, 2 GiB memory"

# Confirm production deployment
read -p "⚠️  Deploy to PRODUCTION? This will affect live users. (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Submit build
echo "🔨 Building and deploying..."
gcloud builds submit --config=deployment/cloudbuild-prod.yaml .

# Get the service URL
SERVICE_URL=$(gcloud run services describe vana-prod --region=us-central1 --format="value(status.url)")

echo "✅ Production deployment complete!"
echo "🌐 Service URL: $SERVICE_URL"
echo "🔍 Health check: $SERVICE_URL/health"

# Test health endpoint
echo "🏥 Testing health endpoint..."
if curl -s -f "$SERVICE_URL/health" > /dev/null; then
    echo "✅ Health check passed"
else
    echo "⚠️  Health check failed - please verify manually"
fi

echo "🎉 VANA Production deployment successful!"
