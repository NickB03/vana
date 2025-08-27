
#!/bin/bash
FILE_PATH="$1"
MEMORY_KEY="$2"

echo "📝 Tracking changes for file: $FILE_PATH"

# Validate syntax if applicable
if [[ "$FILE_PATH" == *.js || "$FILE_PATH" == *.ts ]]; then
  echo "🔍 Validating JavaScript/TypeScript syntax..."
  if command -v node &> /dev/null; then
    node -c "$FILE_PATH" 2>/dev/null || {
      echo "⚠️ Syntax error detected in $FILE_PATH"
      npx claude-flow@alpha hooks notify --level "warning" --message "Syntax error in $FILE_PATH"
    }
  fi
fi

# Check for security patterns
if grep -q "password\|secret\|token" "$FILE_PATH" 2>/dev/null; then
  echo "🔒 Potential security issue detected in $FILE_PATH"
  npx claude-flow@alpha hooks notify --level "warning" --message "Potential security issue in $FILE_PATH"
fi

# Store file change metadata
FILE_SIZE=$(wc -c < "$FILE_PATH" 2>/dev/null || echo "0")
FILE_LINES=$(wc -l < "$FILE_PATH" 2>/dev/null || echo "0")

npx claude-flow@alpha hooks memory-store --key "$MEMORY_KEY" --value "{\"file\": \"$FILE_PATH\", \"size\": $FILE_SIZE, \"lines\": $FILE_LINES, \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"}"

echo "✅ File tracking completed for $FILE_PATH"
