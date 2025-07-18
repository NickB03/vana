# Docker Sandbox Setup Guide

This guide explains how to set up Docker containers for secure code execution in VANA.

## Overview

VANA uses Docker containers to provide secure, isolated environments for executing code in Python, JavaScript, and Shell. This sandbox system prevents malicious code from affecting your system while still allowing legitimate code execution.

## Prerequisites

### 1. Install Docker Desktop

- **macOS/Windows**: Download from [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Linux**: Follow the [Docker Engine installation guide](https://docs.docker.com/engine/install/)

### 2. Start Docker

Ensure Docker Desktop is running:
- **macOS**: Look for the Docker whale icon in the menu bar
- **Windows**: Check the system tray for the Docker icon
- **Linux**: Run `sudo systemctl start docker`

### 3. Verify Installation

```bash
docker --version
docker ps
```

## Quick Setup

Run the automated setup script:

```bash
cd /path/to/vana
./scripts/setup_docker_sandbox.sh
```

This script will:
1. Verify Docker is installed and running
2. Build all three sandbox containers (Python, JavaScript, Shell)
3. Test each container to ensure they work correctly

## Manual Setup

If you prefer to set up containers manually:

### Build Python Sandbox

```bash
cd lib/sandbox/containers
docker build -t vana-python-sandbox -f Dockerfile.python .
```

### Build JavaScript Sandbox

```bash
docker build -t vana-javascript-sandbox -f Dockerfile.javascript .
```

### Build Shell Sandbox

```bash
docker build -t vana-shell-sandbox -f Dockerfile.shell .
```

### Verify Containers

```bash
# List built images
docker images | grep vana-.*-sandbox

# Test Python container
docker run --rm vana-python-sandbox python3 -c "print('Hello from Python!')"

# Test JavaScript container
docker run --rm vana-javascript-sandbox node -e "console.log('Hello from JavaScript!')"

# Test Shell container
docker run --rm vana-shell-sandbox sh -c "echo 'Hello from Shell!'"
```

## Container Details

### Python Sandbox (vana-python-sandbox)
- **Base Image**: python:3.13-slim
- **Packages**: NumPy, Pandas, Matplotlib, Scikit-learn, and more
- **Security**: Runs as non-root user 'sandbox'
- **Working Directory**: /workspace

### JavaScript Sandbox (vana-javascript-sandbox)
- **Base Image**: node:20-alpine
- **Packages**: Core Node.js modules
- **Security**: Runs as non-root user 'sandbox'
- **Working Directory**: /workspace

### Shell Sandbox (vana-shell-sandbox)
- **Base Image**: alpine:latest
- **Tools**: Basic shell utilities (limited for security)
- **Security**: Runs as non-root user 'sandbox'
- **Working Directory**: /workspace

## Security Features

1. **Non-root Execution**: All code runs as the 'sandbox' user
2. **Resource Limits**: Containers have CPU and memory limits
3. **Network Isolation**: Limited network access by default
4. **Filesystem Isolation**: Code cannot access host filesystem
5. **Temporary Containers**: Each execution uses a fresh container

## Troubleshooting

### Docker Not Found

```bash
# Install Docker Desktop from https://www.docker.com/products/docker-desktop/
```

### Docker Daemon Not Running

```bash
# macOS/Windows: Start Docker Desktop application
# Linux: sudo systemctl start docker
```

### Permission Denied

```bash
# Linux: Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in for changes to take effect
```

### Build Failures

```bash
# Clean up Docker system
docker system prune -a
# Retry the build
```

### Container Tests Fail

```bash
# Check Docker logs
docker logs <container_id>
# Verify resource availability
docker system df
```

## Integration with VANA

Once containers are built, VANA will automatically detect and use them. The system will:

1. Check for Docker availability on startup
2. Use Docker containers when available
3. Fall back to local execution if Docker is unavailable

To verify Docker integration in VANA:

```python
from lib.sandbox.executors.python_executor import PythonExecutor
from lib.sandbox.core.security_manager import SecurityManager

security_manager = SecurityManager()
executor = PythonExecutor(security_manager)

# Check if Docker is available
if executor.docker_client:
    print("✅ Docker is available for secure code execution")
else:
    print("⚠️ Docker not available, using fallback mode")
```

## Best Practices

1. **Keep Docker Running**: Ensure Docker Desktop is running when using VANA
2. **Regular Updates**: Update Docker and rebuild containers periodically
3. **Monitor Resources**: Check Docker resource usage with `docker stats`
4. **Clean Up**: Remove old containers with `docker system prune`

## Next Steps

- Test code execution with the Code Execution Specialist agent
- Configure resource limits in Docker settings if needed
- Review security policies in `lib/sandbox/config/security_policies.yaml`