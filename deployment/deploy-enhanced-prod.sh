#!/bin/bash

# VANA Enhanced Production Deployment Script
# Production deployment with enhanced reasoning capabilities and comprehensive validation

set -e

echo "🏭 Starting VANA Enhanced Production Deployment..."
echo "✨ Enhanced Reasoning Features for Production:"
echo "   • Mathematical problem solving"
echo "   • Logical reasoning analysis" 
echo "   • Enhanced echo with reasoning"
echo "   • Enhanced task analysis"
echo "   • Reasoning-based coordination"
echo "   • Production-grade security and monitoring"

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

# Get current git info and validate for production
COMMIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
COMMIT_SHORT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

# Production validation checks
echo "🔒 Running production validation checks..."

# Check if we're on main branch
if [ "$BRANCH_NAME" != "main" ]; then
    echo "❌ Error: Production deployments must be from main branch. Current: $BRANCH_NAME"
    exit 1
fi

# Check if working directory is clean
if ! git diff-index --quiet HEAD --; then
    echo "❌ Error: Working directory is not clean. Please commit all changes."
    exit 1
fi

# Check if we have the latest commits
git fetch origin main
LOCAL_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse origin/main)
if [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]; then
    echo "❌ Error: Local main branch is not up to date with origin/main"
    exit 1
fi

echo "✅ Production validation checks passed"

# Create production tag
PRODUCTION_TAG="prod-$(date +%Y%m%d)-$COMMIT_SHORT"

echo "📋 Production Deployment Details:"
echo "   Project: $PROJECT_ID"
echo "   Target: vana-enhanced-prod"
echo "   Resources: 2 vCPU, 4 GiB memory (1-20 instances)"
echo "   Commit: $COMMIT_SHORT ($BRANCH_NAME)"
echo "   Production Tag: $PRODUCTION_TAG"
echo "   Enhanced Features: ✅ Enabled"
echo "   Security: ✅ Hardened"

# Confirmation prompt
echo ""
read -p "🚨 This will deploy to PRODUCTION. Are you sure? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Production deployment cancelled"
    exit 1
fi

# Create Cloud Storage bucket for production artifacts if it doesn't exist
echo "📦 Preparing production artifacts storage..."
gsutil mb -p "$PROJECT_ID" "gs://$PROJECT_ID-vana-builds" 2>/dev/null || echo "Bucket already exists"

# Submit enhanced production build
echo "🔨 Building and deploying enhanced VANA to production..."
gcloud builds submit \
    --config=deployment/cloudbuild-enhanced-prod.yaml \
    .

# Get the service URL
SERVICE_URL=$(gcloud run services describe vana-enhanced-prod --region=us-central1 --format="value(status.url)" 2>/dev/null)

if [ -n "$SERVICE_URL" ]; then
    echo "✅ Enhanced production deployment complete!"
    echo "🌐 Production Service URL: $SERVICE_URL"
    echo "🔍 Health check: $SERVICE_URL/health"
    echo "📊 Version info: $SERVICE_URL/info"
    
    # Wait for production service to be fully ready
    echo "⏳ Waiting for production service to be fully ready..."
    sleep 30
    
    # Comprehensive production validation
    echo "🔍 Running comprehensive production validation..."
    
    # Test health endpoint
    echo "1. Testing health endpoint..."
    HEALTH_STATUS=$(curl -s -f "$SERVICE_URL/health" 2>/dev/null || echo "FAILED")
    if echo "$HEALTH_STATUS" | grep -q "healthy"; then
        echo "   ✅ Health check passed"
    else
        echo "   ❌ Health check failed: $HEALTH_STATUS"
        exit 1
    fi
    
    # Test enhanced features in production
    echo "2. Validating enhanced reasoning features..."
    INFO_RESPONSE=$(curl -s "$SERVICE_URL/info" 2>/dev/null || echo "{}")
    
    if echo "$INFO_RESPONSE" | grep -q "enhanced_features"; then
        echo "   ✅ Enhanced features detected in production"
        
        # Extract and validate enhanced features
        REASONING_TOOLS=$(echo "$INFO_RESPONSE" | jq -r '.enhanced_features.reasoning_tools // "unknown"' 2>/dev/null || echo "unknown")
        MATH_REASONING=$(echo "$INFO_RESPONSE" | jq -r '.enhanced_features.mathematical_reasoning // false' 2>/dev/null || echo "false")
        LOGIC_REASONING=$(echo "$INFO_RESPONSE" | jq -r '.enhanced_features.logical_reasoning // false' 2>/dev/null || echo "false")
        PRODUCTION_READY=$(echo "$INFO_RESPONSE" | jq -r '.enhanced_features.production_ready // false' 2>/dev/null || echo "false")
        
        echo "   • Reasoning tools: $REASONING_TOOLS"
        echo "   • Mathematical reasoning: $MATH_REASONING"
        echo "   • Logical reasoning: $LOGIC_REASONING"
        echo "   • Production ready: $PRODUCTION_READY"
        
        # Validate all features are active
        VALIDATION_ERRORS=0
        if [ "$REASONING_TOOLS" != "5" ]; then
            echo "   ❌ Expected 5 reasoning tools, found: $REASONING_TOOLS"
            VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
        fi
        
        if [ "$MATH_REASONING" != "true" ]; then
            echo "   ❌ Mathematical reasoning not enabled"
            VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
        fi
        
        if [ "$LOGIC_REASONING" != "true" ]; then
            echo "   ❌ Logical reasoning not enabled"
            VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
        fi
        
        if [ $VALIDATION_ERRORS -eq 0 ]; then
            echo "   🎉 All enhanced reasoning features validated!"
        else
            echo "   ❌ Found $VALIDATION_ERRORS validation errors"
            exit 1
        fi
    else
        echo "   ❌ Enhanced features not detected in production"
        exit 1
    fi
    
    # Test version tracking
    echo "3. Validating version tracking..."
    VERSION=$(echo "$INFO_RESPONSE" | jq -r '.version // "unknown"' 2>/dev/null || echo "unknown")
    COMMIT_IN_RESPONSE=$(echo "$INFO_RESPONSE" | jq -r '.version_details.commit_hash // "unknown"' 2>/dev/null || echo "unknown")
    
    if [ "$COMMIT_IN_RESPONSE" = "$COMMIT_SHORT" ]; then
        echo "   ✅ Correct version deployed: $VERSION"
    else
        echo "   ❌ Version mismatch. Expected: $COMMIT_SHORT, Found: $COMMIT_IN_RESPONSE"
        exit 1
    fi
    
    # Get production manifest
    echo "4. Retrieving production manifest..."
    MANIFEST_URL="gs://$PROJECT_ID-vana-builds/production/manifests/latest-manifest.json"
    if gsutil -q stat "$MANIFEST_URL"; then
        echo "   ✅ Production manifest available"
        gsutil cat "$MANIFEST_URL" | jq -r '.deployment.timestamp, .production_tag, .enhanced_features.integration_commit' | head -3
    else
        echo "   ⚠️  Production manifest not found"
    fi
    
    echo ""
    echo "🎉 VANA Enhanced Production deployment successful!"
    echo "🏭 Production URL: $SERVICE_URL"
    echo "🧠 Enhanced reasoning capabilities are live in production"
    echo "🏷️  Production Tag: $PRODUCTION_TAG"
    echo "📅 Deployed: $(date -u)"
    echo ""
    echo "📋 Production monitoring commands:"
    echo "   gcloud run services describe vana-enhanced-prod --region=us-central1"
    echo "   curl $SERVICE_URL/health"
    echo "   curl $SERVICE_URL/info | jq '.enhanced_features'"
    echo ""
    echo "🔄 To rollback if needed:"
    echo "   gcloud run services update-traffic vana-enhanced-prod --to-revisions=PREVIOUS_REVISION=100 --region=us-central1"
    
else
    echo "❌ Failed to get production service URL. Check deployment logs."
    exit 1
fi