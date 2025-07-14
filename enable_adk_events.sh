#!/bin/bash
# Enable ADK event streaming for VANA

echo "🚀 Enabling ADK Event Streaming..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    touch .env.local
fi

# Check if USE_ADK_EVENTS is already set
if grep -q "USE_ADK_EVENTS" .env.local; then
    # Update existing value
    sed -i '' 's/USE_ADK_EVENTS=.*/USE_ADK_EVENTS=true/' .env.local
    echo "✅ Updated USE_ADK_EVENTS=true in .env.local"
else
    # Add new value
    echo "USE_ADK_EVENTS=true" >> .env.local
    echo "✅ Added USE_ADK_EVENTS=true to .env.local"
fi

echo ""
echo "📋 Current ADK Configuration:"
grep "USE_ADK_EVENTS" .env.local || echo "USE_ADK_EVENTS not found"

echo ""
echo "🎯 To test ADK events:"
echo "  1. Start the backend: python main.py"
echo "  2. Look for: 'ADK Event Streaming: ENABLED'"
echo "  3. Test with queries mentioning security, data, or architecture"
echo ""
echo "🔄 To disable ADK events:"
echo "  Set USE_ADK_EVENTS=false in .env.local"