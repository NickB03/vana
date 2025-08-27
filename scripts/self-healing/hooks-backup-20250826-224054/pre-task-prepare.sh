
#!/bin/bash
TASK_DESCRIPTION="$1"

echo "🚀 Preparing environment for task: $TASK_DESCRIPTION"

# Validate environment
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found"
  exit 1
fi

# Check dependencies
if [ -f "package.json" ]; then
  echo "📦 Checking npm dependencies..."
  npm outdated || true
fi

# Prepare workspace
mkdir -p logs tmp cache
chmod 755 logs tmp cache

# Restore context from memory
npx claude-flow@alpha hooks session-restore --session-id "swarm-$(date +%Y%m%d)" || true

# Store preparation metrics
npx claude-flow@alpha hooks memory-store --key "swarm/hooks/coordination/preparation/$(date +%s)" --value "{\"task\": \"$TASK_DESCRIPTION\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\", \"status\": \"prepared\"}"

echo "✅ Environment prepared successfully"
