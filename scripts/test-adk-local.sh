#!/bin/bash
# Test ADK coordination locally before deployment

echo "🧪 Testing ADK Coordination Locally..."
echo "=================================="

# Check if ADK is enabled
echo "📋 Checking environment configuration..."
if grep -q "USE_ADK_COORDINATION=true" .env; then
    echo "✅ ADK coordination enabled in .env"
else
    echo "❌ ADK coordination NOT enabled in .env"
    echo "   Add: USE_ADK_COORDINATION=true"
    exit 1
fi

if grep -q "USE_OFFICIAL_AGENT_TOOL=true" .env; then
    echo "✅ ADK agent tools enabled in .env"
else
    echo "❌ ADK agent tools NOT enabled in .env"
    echo "   Add: USE_OFFICIAL_AGENT_TOOL=true"
    exit 1
fi

# Run Python verification
echo ""
echo "🐍 Running Python verification..."
python -c "
import os
os.environ['USE_ADK_COORDINATION'] = 'true'
os.environ['USE_OFFICIAL_AGENT_TOOL'] = 'true'

try:
    from lib._tools.real_coordination_tools import transfer_to_agent, real_delegate_to_agent
    from lib._tools.agent_tools import create_specialist_agent_tool
    print('✅ ADK imports successful')
    
    # Test coordination
    result = real_delegate_to_agent('architecture_specialist', 'Test ADK', 'Local test')
    import json
    result_data = json.loads(result)
    
    if 'transfer_result' in result_data and 'ADK' in result_data['transfer_result'].get('method', ''):
        print('✅ ADK coordination working correctly')
        print(f'   Method: {result_data[\"transfer_result\"][\"method\"]}')
    else:
        print('❌ ADK coordination not active')
        
except Exception as e:
    print(f'❌ Error: {e}')
"

echo ""
echo "🔍 Quick functionality tests..."

# Test 1: Verify feature flags
echo -n "  Feature flags: "
python scripts/verify-adk-coordination.py > /tmp/adk-test.log 2>&1
if grep -q "Overall Status: PASSED" /tmp/adk-test.log; then
    echo "✅ PASS"
else
    echo "❌ FAIL (check /tmp/adk-test.log)"
fi

# Test 2: Performance check
echo -n "  Performance: "
python -c "
import time
from lib._tools.real_coordination_tools import real_delegate_to_agent

times = []
for i in range(5):
    start = time.perf_counter()
    real_delegate_to_agent('qa_specialist', 'Perf test', 'Quick')
    elapsed = (time.perf_counter() - start) * 1000
    times.append(elapsed)

avg_time = sum(times) / len(times)
if avg_time < 10:
    print(f'✅ PASS ({avg_time:.2f}ms avg)')
else:
    print(f'❌ FAIL ({avg_time:.2f}ms avg)')
" 2>/dev/null

echo ""
echo "📊 ADK Local Test Summary"
echo "========================"
echo "If all tests passed, ADK is ready for deployment!"
echo ""
echo "Next steps:"
echo "1. Deploy to staging: ./deploy-staging-adk.sh"
echo "2. Verify deployment: python scripts/verify-adk-deployment.py https://your-staging-url"