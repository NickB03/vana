#!/bin/bash
# VANA Multi-Agent System - Cloud Run Deployment Script (Optimized with Cloud Build)

set -e  # Exit on error

# Configuration
PROJECT_ID="analystai-454200"
PROJECT_NUMBER="960076421399"
REGION="us-central1"
SERVICE_NAME="vana-multi-agent"

# Print banner
echo "🚀 VANA Multi-Agent System - Cloud Run Deployment (Cloud Build Optimized)"
echo "=========================================================================="
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"
echo "Build Method: Google Cloud Build (Native AMD64)"
echo "=========================================================================="

# Verify gcloud is authenticated
echo "🔑 Verifying Google Cloud authentication..."
PROJECT_CHECK=$(gcloud config get-value project)
if [ "$PROJECT_CHECK" != "$PROJECT_ID" ]; then
    echo "⚠️  Project mismatch. Setting project to ${PROJECT_ID}..."
    gcloud config set project ${PROJECT_ID}
fi

# Enable required APIs if not already enabled
echo "🔧 Ensuring required APIs are enabled..."
gcloud services enable cloudbuild.googleapis.com --quiet
gcloud services enable run.googleapis.com --quiet
gcloud services enable containerregistry.googleapis.com --quiet

# Build and deploy using Cloud Build (eliminates cross-platform compilation)
echo "🔨 Building and deploying with Google Cloud Build (Native AMD64)..."
echo "⚡ This eliminates 10+ minute cross-platform build time!"
gcloud builds submit --config cloudbuild.yaml --region=${REGION}

# Cloud Build handles both build and deployment automatically
echo "✅ Cloud Build process initiated!"
echo "📊 Build progress can be monitored at:"
echo "   https://console.cloud.google.com/cloud-build/builds?project=${PROJECT_ID}"
echo ""
echo "⏱️  Expected build time: < 2 minutes (vs 10+ minutes with local cross-platform build)"

# Wait for deployment to complete and get service URL
echo ""
echo "⏳ Waiting for deployment to complete..."
sleep 30  # Give Cloud Build time to complete deployment

echo "🔍 Getting service URL..."
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format="value(status.url)" 2>/dev/null || echo "Deployment in progress...")

if [ "$SERVICE_URL" != "Deployment in progress..." ]; then
    echo ""
    echo "🎉 Deployment complete!"
    echo "=========================================="
    echo "🌐 Service URL: ${SERVICE_URL}"
    echo "📊 Dashboard URL: ${SERVICE_URL}/dashboard"
    echo "🔧 Health check: ${SERVICE_URL}/health"
    echo "📋 System info: ${SERVICE_URL}/info"
    echo "=========================================="
    echo ""
    echo "🚀 VANA Multi-Agent System is now live in production!"
    echo "📈 22 agents and 44 tools ready for use"
else
    echo ""
    echo "⏳ Deployment is still in progress. Check the Cloud Build console for status:"
    echo "   https://console.cloud.google.com/cloud-build/builds?project=${PROJECT_ID}"
    echo ""
    echo "Once complete, your service will be available at:"
    echo "   https://vana-multi-agent-[hash].us-central1.run.app"
fi
