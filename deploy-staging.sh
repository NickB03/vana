#!/bin/bash
# Deploy VANA Phase 4 to CloudRun Staging
# This deploys to vana-staging without affecting vana-dev

set -e  # Exit on error

# Configuration
PROJECT_ID="analystai-454200"
REGION="us-central1"
SERVICE_NAME="vana-staging"
SERVICE_ACCOUNT="vana-vector-search-sa@${PROJECT_ID}.iam.gserviceaccount.com"

echo "🚀 Deploying VANA to CloudRun Staging..."
echo "   Project: $PROJECT_ID"
echo "   Service: $SERVICE_NAME"
echo "   Region: $REGION"

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

# Frontend build is handled by Dockerfile during Cloud Build
echo "📦 Frontend will be built during Cloud Build..."

# Deploy to CloudRun using source deployment
echo "🏗️ Deploying to CloudRun..."
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --port 8081 \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 2 \
  --timeout 300 \
  --concurrency 40 \
  --max-instances 3 \
  --service-account "$SERVICE_ACCOUNT" \
  --set-env-vars "\
GOOGLE_GENAI_USE_VERTEXAI=true,\
GOOGLE_CLOUD_PROJECT=$PROJECT_ID,\
GOOGLE_CLOUD_REGION=$REGION,\
RAG_CORPUS_RESOURCE_NAME=projects/$PROJECT_ID/locations/$REGION/ragCorpora/2305843009213693952,\
ENVIRONMENT=staging,\
USE_ADK_EVENTS=true" \
  --set-secrets "GOOGLE_API_KEY=gemini-api-key:latest" \
  --no-traffic

# Get the staging URL
STAGING_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --format="value(status.url)")

echo ""
echo "✅ Deployment complete!"
echo "🌐 Staging URL: $STAGING_URL"
echo ""
echo "📋 Next steps:"
echo "1. Test the staging deployment:"
echo "   curl $STAGING_URL/health"
echo ""
echo "2. Test the chat endpoint:"
echo "   curl -X POST $STAGING_URL/chat \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"message\": \"Hello VANA!\"}'"
echo ""
echo "3. If everything works, route traffic:"
echo "   gcloud run services update-traffic $SERVICE_NAME \\"
echo "     --to-latest \\"
echo "     --project=$PROJECT_ID \\"
echo "     --region=$REGION"
echo ""
echo "4. To update vana-dev (when ready):"
echo "   ./deploy-production.sh"