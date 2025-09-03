#!/bin/bash

# Fix Docker Desktop and GitHub Runner Issues
echo "🔧 Fixing Docker Desktop and GitHub Runner Setup"

# Step 1: Reset Docker Desktop socket
echo "Step 1: Resetting Docker socket permissions..."
if [ -e "$HOME/.docker/run/docker.sock" ]; then
    sudo rm -f "$HOME/.docker/run/docker.sock"
fi

# Step 2: Restart Docker Desktop completely
echo "Step 2: Restarting Docker Desktop..."
osascript -e 'quit app "Docker Desktop"'
sleep 3
killall Docker 2>/dev/null || true
killall com.docker.backend 2>/dev/null || true
sleep 2

# Step 3: Start Docker Desktop fresh
echo "Step 3: Starting Docker Desktop..."
open -a "Docker Desktop"
echo "Waiting for Docker to initialize (30 seconds)..."
sleep 30

# Step 4: Test Docker connection
echo "Step 4: Testing Docker connection..."
for i in {1..10}; do
    if docker info >/dev/null 2>&1; then
        echo "✅ Docker is running!"
        docker version
        break
    else
        echo "Waiting for Docker... attempt $i/10"
        sleep 5
    fi
done

# Step 5: Setup GitHub Runner if not exists
RUNNER_DIR="$HOME/actions-runner"
if [ ! -f "$RUNNER_DIR/run.sh" ]; then
    echo "Step 5: Setting up GitHub Actions Runner..."
    echo "Please follow these manual steps:"
    echo ""
    echo "1. Go to: https://github.com/NickB03/vana/settings/actions/runners/new"
    echo "2. Download the runner for macOS ARM64"
    echo "3. Extract to: $RUNNER_DIR"
    echo "4. Configure with the token from GitHub"
    echo "5. Run: ./config.sh --url https://github.com/NickB03/vana --token YOUR_TOKEN"
    echo "6. Install as service: sudo ./svc.sh install"
    echo "7. Start service: sudo ./svc.sh start"
else
    echo "Step 5: Starting GitHub Runner..."
    cd "$RUNNER_DIR"
    if [ -f "./svc.sh" ]; then
        sudo ./svc.sh status || sudo ./svc.sh start
    else
        ./run.sh &
    fi
fi

echo ""
echo "📋 Summary:"
echo "- Docker Desktop has been restarted"
echo "- GitHub Runner status checked"
echo ""
echo "🔍 To verify:"
echo "1. Run: docker ps"
echo "2. Check runner at: https://github.com/NickB03/vana/settings/actions/runners"
echo "3. Re-run workflow at: https://github.com/NickB03/vana/actions"