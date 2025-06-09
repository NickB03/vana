#!/bin/bash
# VANA Agent System - Cloud Run Deployment Script (Python 3.13 + Poetry)

set -e  # Exit on error

# Configuration
PROJECT_ID="analystai-454200"
PROJECT_NUMBER="960076421399"
REGION="us-central1"
SERVICE_NAME="${1:-vana}"  # Allow service name as first argument, default to "vana"

# Print banner
echo "🚀 VANA Agent System - Cloud Run Deployment (Python 3.13 + Poetry)"
echo "=================================================================="
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"
echo "Build Method: Google Cloud Build (Python 3.13 + Poetry)"
echo "=================================================================="

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
gcloud services enable artifactregistry.googleapis.com --quiet

# Build and deploy using Cloud Build (Python 3.13 + Poetry)
echo "🔨 Building and deploying with Google Cloud Build (Python 3.13 + Poetry)..."
echo "⚡ Using Poetry for dependency management and correct agent structure!"
if ! gcloud builds submit --config deployment/cloudbuild.yaml --region=${REGION}; then
    echo "❌ Cloud Build failed! Check logs at:"
    echo "   https://console.cloud.google.com/cloud-build/builds?project=${PROJECT_ID}"
    exit 1
fi

# Cloud Build handles both build and deployment automatically
echo "✅ Cloud Build process initiated!"
echo "📊 Build progress can be monitored at:"
echo "   https://console.cloud.google.com/cloud-build/builds?project=${PROJECT_ID}"
echo ""
echo "⏱️  Expected build time: < 3 minutes with Poetry dependency resolution"

# Wait for deployment to complete and get service URL
echo ""
echo "⏳ Waiting for deployment to complete..."
for i in {1..20}; do
    SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format="value(status.url)" 2>/dev/null || echo "")
    if [[ -n "$SERVICE_URL" && "$SERVICE_URL" != "Deployment in progress..." ]]; then
        break
    fi
    echo "⏳ Attempt $i/20: Still waiting for deployment..."
    sleep 15
done

echo "🔍 Final service URL check..."
if [[ -z "$SERVICE_URL" ]]; then
    SERVICE_URL="Deployment in progress..."
fi

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
    echo "🚀 VANA Agent System is now live in production!"
    echo "📈 16 tools ready for use with Google ADK"
else
    echo ""
    echo "⏳ Deployment is still in progress. Check the Cloud Build console for status:"
    echo "   https://console.cloud.google.com/cloud-build/builds?project=${PROJECT_ID}"
    echo ""
    echo "Once complete, your service will be available at:"
    echo "   https://${SERVICE_NAME}-[hash]-uc.a.run.app"
fi
