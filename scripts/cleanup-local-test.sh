#!/bin/bash

# Cleanup script for local Docker testing

set -e

echo "🧹 Cleaning up local Docker test environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="vana-local-test"
CONTAINER_NAME="vana-test-container"

echo -e "${BLUE}🛑 Stopping container...${NC}"
docker stop $CONTAINER_NAME 2>/dev/null || echo "Container not running"

echo -e "${BLUE}🗑️  Removing container...${NC}"
docker rm $CONTAINER_NAME 2>/dev/null || echo "Container not found"

echo -e "${BLUE}🖼️  Removing image...${NC}"
docker rmi $IMAGE_NAME 2>/dev/null || echo "Image not found"

echo -e "${GREEN}✅ Cleanup complete!${NC}"
echo "Local test environment has been cleaned up."
