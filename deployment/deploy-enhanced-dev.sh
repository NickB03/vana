#!/bin/bash

# VANA Enhanced Development Deployment Script
# Deploys enhanced VANA with reasoning capabilities to development environment

set -e

echo "🧠 Starting VANA Enhanced Development Deployment..."
echo "✨ Enhanced Reasoning Features Included:"
echo "   • Mathematical problem solving"
echo "   • Logical reasoning analysis" 
echo "   • Enhanced echo with reasoning"
echo "   • Enhanced task analysis"
echo "   • Reasoning-based coordination"

# Check if we're in the right directory
if [ ! -f "pyproject.toml" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Check if enhanced reasoning tools exist
if [ ! -f "lib/_tools/enhanced_reasoning_tools.py" ]; then
    echo "❌ Error: Enhanced reasoning tools not found. Please ensure they are committed."
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

# Get current git info for version tracking
COMMIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
COMMIT_SHORT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

echo "📋 Deployment Details:"
echo "   Project: $PROJECT_ID"
echo "   Target: vana-enhanced-dev"
echo "   Resources: 2 vCPU, 4 GiB memory"
echo "   Commit: $COMMIT_SHORT ($BRANCH_NAME)"
echo "   Enhanced Features: ✅ Enabled"

# Create Cloud Storage bucket for build artifacts if it doesn't exist
echo "📦 Preparing build artifacts storage..."
gsutil mb -p "$PROJECT_ID" "gs://$PROJECT_ID-vana-builds" 2>/dev/null || echo "Bucket already exists"

# Submit enhanced build
echo "🔨 Building and deploying enhanced VANA..."
gcloud builds submit \
    --config=deployment/cloudbuild-enhanced.yaml \
    .

# Get the service URL
SERVICE_URL=$(gcloud run services describe vana-enhanced-dev --region=us-central1 --format="value(status.url)" 2>/dev/null)

if [ -n "$SERVICE_URL" ]; then
    echo "✅ Enhanced development deployment complete!"
    echo "🌐 Service URL: $SERVICE_URL"
    echo "🔍 Health check: $SERVICE_URL/health"
    echo "📊 Version info: $SERVICE_URL/info"
    
    # Test health endpoint
    echo "🏥 Testing health endpoint..."
    if curl -s -f "$SERVICE_URL/health" > /dev/null; then
        echo "✅ Health check passed"
    else
        echo "⚠️  Health check failed - please verify manually"
    fi
    
    # Test enhanced features
    echo "🧠 Testing enhanced reasoning features..."
    INFO_RESPONSE=$(curl -s "$SERVICE_URL/info" 2>/dev/null || echo "{}")
    
    if echo "$INFO_RESPONSE" | grep -q "enhanced_features"; then
        echo "✅ Enhanced features detected"
        
        # Extract and display enhanced features
        REASONING_TOOLS=$(echo "$INFO_RESPONSE" | jq -r '.enhanced_features.reasoning_tools // "unknown"' 2>/dev/null || echo "unknown")
        MATH_REASONING=$(echo "$INFO_RESPONSE" | jq -r '.enhanced_features.mathematical_reasoning // false' 2>/dev/null || echo "false")
        LOGIC_REASONING=$(echo "$INFO_RESPONSE" | jq -r '.enhanced_features.logical_reasoning // false' 2>/dev/null || echo "false")
        
        echo "   • Reasoning tools: $REASONING_TOOLS"
        echo "   • Mathematical reasoning: $MATH_REASONING"
        echo "   • Logical reasoning: $LOGIC_REASONING"
        
        if [ "$REASONING_TOOLS" = "5" ] && [ "$MATH_REASONING" = "true" ] && [ "$LOGIC_REASONING" = "true" ]; then
            echo "🎉 All enhanced reasoning features confirmed!"
        else
            echo "⚠️  Some enhanced features may not be fully active"
        fi
    else
        echo "⚠️  Enhanced features not detected in response"
    fi
    
    echo ""
    echo "🎉 VANA Enhanced Development deployment successful!"
    echo "🧠 Enhanced reasoning capabilities are now available"
    echo ""
    echo "📋 Quick test commands:"
    echo "   curl $SERVICE_URL/health"
    echo "   curl $SERVICE_URL/info | jq '.enhanced_features'"
    
else
    echo "❌ Failed to get service URL. Check deployment logs."
    exit 1
fi