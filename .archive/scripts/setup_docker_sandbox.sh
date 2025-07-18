#!/bin/bash
# VANA Docker Sandbox Setup Script
# Sets up Docker containers for secure code execution

set -e

echo "🐳 VANA Docker Sandbox Setup"
echo "============================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker daemon is not running${NC}"
    echo "Please start Docker Desktop and try again"
    exit 1
fi

echo -e "${GREEN}✅ Docker is installed and running${NC}"

# Navigate to sandbox containers directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CONTAINERS_DIR="$SCRIPT_DIR/../lib/sandbox/containers"

if [ ! -d "$CONTAINERS_DIR" ]; then
    echo -e "${RED}❌ Sandbox containers directory not found${NC}"
    exit 1
fi

cd "$CONTAINERS_DIR"

# Build Python sandbox container
echo -e "\n${YELLOW}Building Python sandbox container...${NC}"
docker build -t vana-python-sandbox -f Dockerfile.python .
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Python sandbox container built successfully${NC}"
else
    echo -e "${RED}❌ Failed to build Python sandbox container${NC}"
    exit 1
fi

# Build JavaScript sandbox container
echo -e "\n${YELLOW}Building JavaScript sandbox container...${NC}"
docker build -t vana-javascript-sandbox -f Dockerfile.javascript .
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ JavaScript sandbox container built successfully${NC}"
else
    echo -e "${RED}❌ Failed to build JavaScript sandbox container${NC}"
    exit 1
fi

# Build Shell sandbox container
echo -e "\n${YELLOW}Building Shell sandbox container...${NC}"
docker build -t vana-shell-sandbox -f Dockerfile.shell .
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Shell sandbox container built successfully${NC}"
else
    echo -e "${RED}❌ Failed to build Shell sandbox container${NC}"
    exit 1
fi

# List built images
echo -e "\n${YELLOW}Built Docker images:${NC}"
docker images | grep vana-.*-sandbox

# Test Python sandbox
echo -e "\n${YELLOW}Testing Python sandbox...${NC}"
TEST_OUTPUT=$(docker run --rm vana-python-sandbox python3 -c "print('Hello from Python sandbox!')" 2>&1)
if [[ "$TEST_OUTPUT" == *"Hello from Python sandbox!"* ]]; then
    echo -e "${GREEN}✅ Python sandbox test passed${NC}"
else
    echo -e "${RED}❌ Python sandbox test failed${NC}"
    echo "Output: $TEST_OUTPUT"
fi

# Test JavaScript sandbox
echo -e "\n${YELLOW}Testing JavaScript sandbox...${NC}"
TEST_OUTPUT=$(docker run --rm vana-javascript-sandbox node -e "console.log('Hello from JavaScript sandbox!')" 2>&1)
if [[ "$TEST_OUTPUT" == *"Hello from JavaScript sandbox!"* ]]; then
    echo -e "${GREEN}✅ JavaScript sandbox test passed${NC}"
else
    echo -e "${RED}❌ JavaScript sandbox test failed${NC}"
    echo "Output: $TEST_OUTPUT"
fi

# Test Shell sandbox
echo -e "\n${YELLOW}Testing Shell sandbox...${NC}"
TEST_OUTPUT=$(docker run --rm vana-shell-sandbox sh -c "echo 'Hello from Shell sandbox!'" 2>&1)
if [[ "$TEST_OUTPUT" == *"Hello from Shell sandbox!"* ]]; then
    echo -e "${GREEN}✅ Shell sandbox test passed${NC}"
else
    echo -e "${RED}❌ Shell sandbox test failed${NC}"
    echo "Output: $TEST_OUTPUT"
fi

echo -e "\n${GREEN}🎉 Docker sandbox setup complete!${NC}"
echo -e "The VANA system can now use Docker for secure code execution."
echo -e "\nTo verify in VANA, run: ${YELLOW}poetry run python -c \"from lib.sandbox.executors.python_executor import PythonExecutor; print('Docker available')\"${NC}"