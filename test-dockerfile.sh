#!/bin/bash
# Test Dockerfile build locally

set -e

echo "🔍 Testing Dockerfile build..."

# Build just the Docker image without running
docker build -t vana-test-build:latest . --no-cache

if [ $? -eq 0 ]; then
    echo "✅ Docker build successful!"
    docker images | grep vana-test-build
else
    echo "❌ Docker build failed!"
    exit 1
fi