
#!/bin/bash
LEVEL="$1"
MESSAGE="$2"
CONTEXT="$3"

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)
LOG_ENTRY="{\"level\": \"$LEVEL\", \"message\": \"$MESSAGE\", \"context\": \"$CONTEXT\", \"timestamp\": \"$TIMESTAMP\"}"

# Log to file
echo "$LOG_ENTRY" >> "logs/notifications.log"

# Store in memory
npx claude-flow@alpha hooks memory-store --key "swarm/hooks/recovery/notifications/$(date +%s)" --value "$LOG_ENTRY"

# Console output with color
case "$LEVEL" in
  "error")   echo -e "\033[31m❌ ERROR: $MESSAGE\033[0m" ;;
  "warning") echo -e "\033[33m⚠️ WARNING: $MESSAGE\033[0m" ;;
  "info")    echo -e "\033[36mℹ️ INFO: $MESSAGE\033[0m" ;;
  "success") echo -e "\033[32m✅ SUCCESS: $MESSAGE\033[0m" ;;
  *)         echo "📢 $MESSAGE" ;;
esac

# Recovery-specific notifications
if [[ "$CONTEXT" == *"recovery"* ]]; then
  echo "🔧 Recovery notification: $MESSAGE"
  # Could trigger additional recovery actions here
fi
