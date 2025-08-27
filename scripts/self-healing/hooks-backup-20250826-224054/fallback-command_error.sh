
#!/bin/bash
TRIGGER_TYPE="$trigger"
CONTEXT="$1"
RETRY_COUNT="$2"

echo "🔄 Fallback hook triggered: $TRIGGER_TYPE"

# Parse context
COMMAND=$(echo "$CONTEXT" | jq -r '.command // "unknown"' 2>/dev/null || echo "unknown")
ERROR_CODE=$(echo "$CONTEXT" | jq -r '.exitCode // "unknown"' 2>/dev/null || echo "unknown")

# Log the fallback attempt
npx claude-flow@alpha hooks memory-store --key "swarm/hooks/errors/$(date +%s)" --value "{\"trigger\": \"$TRIGGER_TYPE\", \"command\": \"$COMMAND\", \"errorCode\": \"$ERROR_CODE\", \"retryCount\": \"$RETRY_COUNT\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"}"

# Handle different trigger types
case "$TRIGGER_TYPE" in
  "command_error")
    echo "🚨 Command error detected, attempting recovery..."
    # Implement command-specific recovery logic
    if [[ "$COMMAND" == *"npm"* ]]; then
      echo "📦 Attempting npm cache clean and retry..."
      npm cache clean --force 2>/dev/null || true
    elif [[ "$COMMAND" == *"git"* ]]; then
      echo "🔧 Attempting git recovery..."
      git status 2>/dev/null || true
    fi
    ;;
  "file_not_found")
    echo "📁 File not found, attempting to create or recover..."
    # Could implement file recovery logic here
    ;;
  "permission_denied")
    echo "🔐 Permission denied, checking file permissions..."
    # Could implement permission fix logic here
    ;;
esac

# Notify about recovery attempt
npx claude-flow@alpha hooks notify --level "info" --message "Fallback recovery attempted for $TRIGGER_TYPE"

echo "✅ Fallback hook completed for $TRIGGER_TYPE"
