#!/bin/bash

# Local Docker Testing Script for VANA
# Tests the fix locally before deploying to Cloud Run

set -e

echo "🐳 Starting Local Docker Testing for VANA..."
echo "📋 This will test the aiohttp coordination fix locally"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="vana-local-test"
CONTAINER_NAME="vana-test-container"
LOCAL_PORT="8000"
TEST_TIMEOUT="30"

echo -e "${BLUE}🔨 Step 1: Building Docker image locally...${NC}"
docker build -f deployment/Dockerfile -t $IMAGE_NAME .

echo -e "${BLUE}🧹 Step 2: Cleaning up any existing containers...${NC}"
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

echo -e "${BLUE}🚀 Step 3: Starting container locally...${NC}"
docker run -d \
  --name $CONTAINER_NAME \
  -p $LOCAL_PORT:8000 \
  -e VANA_ENV=development \
  -e VANA_HOST=0.0.0.0 \
  -e VANA_PORT=8000 \
  -e GOOGLE_GENAI_USE_VERTEXAI=True \
  -e GOOGLE_CLOUD_PROJECT=analystai-454200 \
  -e GOOGLE_CLOUD_LOCATION=us-central1 \
  -e GOOGLE_CLOUD_REGION=us-central1 \
  -e RAG_CORPUS_RESOURCE_NAME=projects/analystai-454200/locations/us-central1/ragCorpora/2305843009213693952 \
  -e VANA_RAG_CORPUS_ID=projects/analystai-454200/locations/us-central1/ragCorpora/2305843009213693952 \
  -e VECTOR_SEARCH_ENDPOINT_ID=projects/analystai-454200/locations/us-central1/indexEndpoints/5085685481161621504 \
  -e VANA_MODEL=gemini-2.0-flash-exp \
  $IMAGE_NAME

echo -e "${YELLOW}⏳ Step 4: Waiting for container to start...${NC}"
sleep 5

# Check if container is running
if ! docker ps | grep -q $CONTAINER_NAME; then
    echo -e "${RED}❌ Container failed to start!${NC}"
    echo "Container logs:"
    docker logs $CONTAINER_NAME
    exit 1
fi

echo -e "${BLUE}🔍 Step 5: Testing health endpoint...${NC}"
for i in {1..10}; do
    if curl -s http://localhost:$LOCAL_PORT/health > /dev/null; then
        echo -e "${GREEN}✅ Health endpoint responding${NC}"
        break
    fi
    echo "Attempt $i/10 - waiting for health endpoint..."
    sleep 2
done

echo -e "${BLUE}🧪 Step 6: Testing agent discovery API...${NC}"
AGENTS_RESPONSE=$(curl -s http://localhost:$LOCAL_PORT/list-apps || echo "FAILED")
if [[ "$AGENTS_RESPONSE" == *"vana"* ]]; then
    echo -e "${GREEN}✅ Agent discovery working - found agents${NC}"
    echo "Agents: $AGENTS_RESPONSE"
else
    echo -e "${RED}❌ Agent discovery failed${NC}"
    echo "Response: $AGENTS_RESPONSE"
fi

echo -e "${BLUE}📊 Step 7: Showing container logs (last 20 lines)...${NC}"
docker logs --tail 20 $CONTAINER_NAME

echo -e "${BLUE}🔧 Step 8: Testing coordination tools...${NC}"
echo "You can now test the coordination tools manually:"
echo "1. Open browser to: http://localhost:$LOCAL_PORT"
echo "2. Select VANA agent"
echo "3. Test: 'What agents are available? Use get_agent_status to check.'"
echo "4. Look for real agent data (not fallback message)"
echo ""

echo -e "${YELLOW}📝 Manual Testing Instructions:${NC}"
echo "- Browser URL: http://localhost:$LOCAL_PORT"
echo "- Test coordination: 'What agents are available? Use get_agent_status to check.'"
echo "- Expected: Real agent list (memory, vana, data_science, etc.)"
echo "- NOT Expected: 'Real agent discovery not available, using fallback'"
echo ""

echo -e "${BLUE}🛠️  Container Management:${NC}"
echo "- View logs: docker logs $CONTAINER_NAME"
echo "- Stop container: docker stop $CONTAINER_NAME"
echo "- Remove container: docker rm $CONTAINER_NAME"
echo "- Remove image: docker rmi $IMAGE_NAME"
echo ""

echo -e "${GREEN}🎉 Local Docker test setup complete!${NC}"
echo -e "${YELLOW}👉 Test the coordination tools manually, then run 'scripts/cleanup-local-test.sh' when done${NC}"
