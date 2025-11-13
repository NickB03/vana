#!/bin/bash

# Populate Intent Examples Database
# This script invokes the intent-examples Edge Function to populate
# the database with 132 examples across 7 intent types

echo "🚀 Invoking intent-examples function..."
echo ""

RESPONSE=$(curl -s -X POST "https://vznhbocnuykdmjvujaka.supabase.co/functions/v1/intent-examples" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6bmhib2NudXlrZG1qdnVqYWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODU1MDYsImV4cCI6MjA3NzI2MTUwNn0._9_CDxdMFDQTqttY5AiW6z1leUPToCG9r8Ux_0cPJbk" \
  -H "Content-Type: application/json")

echo "$RESPONSE" | jq '.'

# Check if successful
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
TOTAL=$(echo "$RESPONSE" | jq -r '.stats.total')

if [ "$SUCCESS" = "true" ] && [ "$TOTAL" -gt 0 ]; then
  echo ""
  echo "✅ Successfully populated $TOTAL intent examples!"
  echo ""
  echo "📊 Breakdown:"
  echo "$RESPONSE" | jq -r '.stats.byIntent | to_entries[] | "   \(.key): \(.value)"'
else
  echo ""
  echo "❌ Failed to populate examples. Total inserted: $TOTAL"
  echo ""
  echo "💡 Make sure to clear the table first:"
  echo "   DELETE FROM intent_examples;"
fi

