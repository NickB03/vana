
#!/bin/bash
ACTION="$1"
SESSION_ID="$2"

case "$ACTION" in
  "start")
    echo "🎯 Starting session: $SESSION_ID"
    npx claude-flow@alpha hooks memory-store --key "swarm/hooks/sessions/$SESSION_ID/start" --value "{\"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\", \"status\": \"active\"}"
    ;;
  "end")
    echo "🏁 Ending session: $SESSION_ID"
    npx claude-flow@alpha hooks memory-store --key "swarm/hooks/sessions/$SESSION_ID/end" --value "{\"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\", \"status\": \"completed\"}"
    # Export metrics
    npx claude-flow@alpha hooks session-export --session-id "$SESSION_ID" --format "json" > "logs/session-$SESSION_ID.json" 2>/dev/null || true
    ;;
  "restore")
    echo "🔄 Restoring session: $SESSION_ID"
    npx claude-flow@alpha hooks session-restore --session-id "$SESSION_ID" || true
    ;;
esac
