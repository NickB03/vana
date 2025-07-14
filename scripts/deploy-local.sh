#!/bin/bash

# VANA Local Deployment Script
# This script builds and runs VANA in production mode locally

echo "🚀 VANA Local Deployment"
echo "========================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${RED}❌ Please edit .env file with your API keys before continuing${NC}"
    exit 1
fi

# Check if GOOGLE_API_KEY is set
if ! grep -q "GOOGLE_API_KEY=.*[^=]$" .env; then
    echo -e "${RED}❌ GOOGLE_API_KEY not set in .env file${NC}"
    exit 1
fi

# Build the production image
echo -e "\n📦 Building production image..."
docker build \
    --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
    --build-arg VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown") \
    -t vana-prod:latest \
    -f Dockerfile.prod .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"

# Stop any running containers
echo -e "\n🛑 Stopping existing containers..."
docker stop vana-prod 2>/dev/null || true
docker rm vana-prod 2>/dev/null || true

# Run the container
echo -e "\n🏃 Starting VANA..."
docker run -d \
    --name vana-prod \
    -p 8080:8080 \
    --env-file .env \
    -e VANA_ENV=production \
    -e PORT=8080 \
    --restart unless-stopped \
    vana-prod:latest

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start container${NC}"
    exit 1
fi

# Wait for health check
echo -e "\n⏳ Waiting for VANA to start..."
for i in {1..30}; do
    if curl -f http://localhost:8080/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ VANA is running!${NC}"
        echo -e "\n🌐 Access VANA at: http://localhost:8080"
        echo -e "📊 View logs: docker logs -f vana-prod"
        echo -e "🛑 Stop: docker stop vana-prod"
        exit 0
    fi
    echo -n "."
    sleep 2
done

echo -e "\n${RED}❌ VANA failed to start. Check logs: docker logs vana-prod${NC}"
exit 1