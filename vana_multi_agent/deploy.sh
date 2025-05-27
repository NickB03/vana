#!/bin/bash
# VANA Multi-Agent System - Cloud Run Deployment Script

set -e  # Exit on error

# Configuration
PROJECT_ID="analystai-454200"
REGION="us-central1"
SERVICE_NAME="vana-multi-agent"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Print banner
echo "🚀 VANA Multi-Agent System - Cloud Run Deployment"
echo "=================================================="
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"
echo "=================================================="

# Verify gcloud is authenticated
echo "🔑 Verifying Google Cloud authentication..."
PROJECT_CHECK=$(gcloud config get-value project)
if [ "$PROJECT_CHECK" != "$PROJECT_ID" ]; then
    echo "⚠️  Project mismatch. Setting project to ${PROJECT_ID}..."
    gcloud config set project ${PROJECT_ID}
fi

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -t ${IMAGE_NAME} .

# Push the image to Google Container Registry
echo "📤 Pushing image to Google Container Registry..."
docker push ${IMAGE_NAME}

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --memory 2Gi \
    --cpu 2 \
    --min-instances 0 \
    --max-instances 10 \
    --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GOOGLE_CLOUD_LOCATION=${REGION},GOOGLE_GENAI_USE_VERTEXAI=True,VANA_MODEL=gemini-2.0-flash"

# Get the service URL
echo "🔍 Getting service URL..."
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format="value(status.url)")

echo "✅ Deployment complete!"
echo "🌐 Service URL: ${SERVICE_URL}"
echo "📊 Dashboard URL: ${SERVICE_URL}/dashboard"
