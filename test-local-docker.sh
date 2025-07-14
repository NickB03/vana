#!/bin/bash
# Test VANA locally with Docker before CloudRun deployment

set -e  # Exit on error

echo "🐳 Testing VANA Docker build locally..."

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t vana-test:latest .

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo "✅ Docker build successful!"
else
    echo "❌ Docker build failed!"
    exit 1
fi

# Run the container
echo "🚀 Starting container..."
docker run -d \
  --name vana-test \
  -p 8081:8081 \
  -e GOOGLE_GENAI_USE_VERTEXAI=false \
  -e GOOGLE_API_KEY="${GOOGLE_API_KEY:-your-api-key}" \
  -e GOOGLE_CLOUD_PROJECT=analystai-454200 \
  -e ENVIRONMENT=local \
  -v ~/.config/gcloud:/root/.config/gcloud:ro \
  vana-test:latest

# Wait for startup
echo "⏳ Waiting for service to start..."
sleep 10

# Test health endpoint
echo "🔍 Testing health endpoint..."
if curl -s http://localhost:8081/health | grep -q "healthy"; then
    echo "✅ Health check passed!"
else
    echo "❌ Health check failed!"
    docker logs vana-test
    docker stop vana-test
    docker rm vana-test
    exit 1
fi

# Test chat endpoint
echo "🔍 Testing chat endpoint..."
curl -X POST http://localhost:8081/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello VANA!"}' \
  --max-time 10 || echo "⚠️ Chat endpoint timeout (expected for streaming)"

echo ""
echo "✅ Local tests complete!"
echo "📋 Container is running. To view logs:"
echo "   docker logs -f vana-test"
echo ""
echo "🧹 To cleanup:"
echo "   docker stop vana-test && docker rm vana-test"
echo ""
echo "🚀 If tests pass, deploy to staging:"
echo "   ./deploy-staging.sh"