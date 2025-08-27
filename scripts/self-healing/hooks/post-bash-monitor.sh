
#!/bin/bash
EXIT_CODE=$?
COMMAND="$1"
EXECUTION_TIME="$2"

# Store execution metrics
npx claude-flow@alpha hooks memory-store --key "swarm/hooks/performance/$(date +%s)" --value "{\"command\": \"$COMMAND\", \"exitCode\": $EXIT_CODE, \"executionTime\": \"$EXECUTION_TIME\"}"

# Handle non-zero exit codes
if [ $EXIT_CODE -ne 0 ]; then
  echo "🚨 Command failed with exit code $EXIT_CODE: $COMMAND"
  npx claude-flow@alpha hooks notify --level "error" --message "Command failed: $COMMAND (exit code: $EXIT_CODE)"
  
  # Trigger error recovery
  npx claude-flow@alpha hooks trigger --event "command_error" --context "{\"command\": \"$COMMAND\", \"exitCode\": $EXIT_CODE}"
fi

# Check for high execution time
if [ "${EXECUTION_TIME%%.*}" -gt 30 ]; then
  npx claude-flow@alpha hooks notify --level "warning" --message "Long execution time detected: $EXECUTION_TIME seconds for $COMMAND"
fi
