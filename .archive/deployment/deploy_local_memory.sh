#!/bin/bash
# VANA Local Memory System Deployment Script

echo "🚀 Deploying VANA Local Memory System"
echo "======================================"

# Check Python version
python_version=$(python3 --version 2>&1 | grep -oE '[0-9]+\.[0-9]+')
if [ "$(printf '%s\n' "3.8" "$python_version" | sort -V | head -n1)" = "3.8" ]; then
    echo "✅ Python $python_version detected"
else
    echo "❌ Python 3.8+ required, found $python_version"
    exit 1
fi

# Run setup script
echo "📦 Setting up dependencies and configuration..."
python3 scripts/setup_local_memory.py

if [ $? -ne 0 ]; then
    echo "❌ Setup failed"
    exit 1
fi

# Test the memory server
echo ""
echo "🧪 Testing memory server..."
timeout 10s python3 scripts/local_memory_server.py --index-existing &
server_pid=$!

sleep 3

if kill -0 $server_pid 2>/dev/null; then
    echo "✅ Memory server started successfully"
    kill $server_pid 2>/dev/null
else
    echo "❌ Memory server failed to start"
    exit 1
fi

echo ""
echo "✅ VANA Local Memory System deployed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Add the generated config to your Claude desktop settings:"
echo "   - Open Claude desktop application"
echo "   - Go to Settings → Model Context Protocol" 
echo "   - Add the configuration from claude_memory_config.json"
echo ""
echo "2. Test the memory system:"
echo "   - Ask Claude: 'Search my memory for VANA project information'"
echo "   - The system should return relevant context from your .claude/ files"
echo ""
echo "3. Monitor memory database:"
echo "   - Database location: .memory_db/"
echo "   - View stats: python3 scripts/local_memory_server.py --db-path .memory_db"
echo ""
echo "🎉 Your local memory system is ready to use!"