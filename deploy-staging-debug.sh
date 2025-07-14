#!/bin/bash
# Debug deployment script - simplified version

set -e

PROJECT_ID="analystai-454200"
REGION="us-central1"
SERVICE_NAME="vana-staging"

echo "🚀 Debug deployment to CloudRun..."

# Try deployment with verbose output
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated \
  --verbosity=debug \
  2>&1 | tee deploy-debug.log

echo "✅ Check deploy-debug.log for details"