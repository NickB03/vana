#!/bin/bash
# Alternative deployment using explicit Docker build

PROJECT_ID="analystai-454200"
SERVICE_NAME="vana-staging"
REGION="us-central1"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🐳 Building Docker image locally..."
docker build -t ${IMAGE} .

echo "📤 Pushing to Google Container Registry..."
docker push ${IMAGE}

echo "🚀 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE} \
  --region=${REGION} \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_API_KEY=${GOOGLE_API_KEY},USE_OFFICIAL_AGENT_TOOL=true,USE_ADK_COORDINATION=true,USE_ADK_EVENTS=true" \
  --port=8081 \
  --memory=2Gi \
  --cpu=2 \
  --timeout=900 \
  --max-instances=10 \
  --min-instances=1 \
  --project=${PROJECT_ID}

echo "✅ Deployment complete using explicit Docker image"