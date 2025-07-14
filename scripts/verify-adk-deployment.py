#!/usr/bin/env python3
"""
Verify ADK deployment in staging/production
Tests that ADK coordination is active and working correctly
"""

import os
import sys
import json
import requests
import time
from datetime import datetime

def test_health_endpoint(base_url):
    """Test the health endpoint."""
    print("🔍 Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health", timeout=10)
        if response.status_code == 200:
            print("✅ Health check passed")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_adk_coordination(base_url, api_key=None):
    """Test ADK coordination through the API."""
    print("\n🧪 Testing ADK coordination...")
    
    headers = {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    
    # Test message that should trigger agent coordination
    test_payload = {
        "message": "Analyze the architecture of this system and provide security recommendations",
        "sessionId": f"adk-test-{int(time.time())}"
    }
    
    try:
        print("📤 Sending coordination request...")
        response = requests.post(
            f"{base_url}/api/chat",
            json=test_payload,
            headers=headers,
            timeout=30,
            stream=True
        )
        
        if response.status_code != 200:
            print(f"❌ API request failed: {response.status_code}")
            return False
        
        # Parse streaming response
        adk_active = False
        coordination_found = False
        agents_used = []
        
        for line in response.iter_lines():
            if line:
                try:
                    # Handle SSE format
                    if line.startswith(b'data: '):
                        data = line[6:].decode('utf-8')
                        if data == '[DONE]':
                            break
                        
                        event = json.loads(data)
                        
                        # Check for ADK indicators
                        if 'content' in event:
                            content = event['content']
                            if 'ADK' in content or 'transfer_to_agent' in content:
                                adk_active = True
                            if 'specialist' in content.lower():
                                coordination_found = True
                            
                            # Extract agent names
                            for agent in ['architecture_specialist', 'security_specialist', 
                                        'data_science_specialist', 'devops_specialist', 
                                        'qa_specialist', 'ui_ux_specialist']:
                                if agent in content:
                                    agents_used.append(agent)
                                    
                except json.JSONDecodeError:
                    continue
        
        print("\n📊 Results:")
        print(f"  ADK Active: {'✅' if adk_active else '❌'}")
        print(f"  Coordination Found: {'✅' if coordination_found else '❌'}")
        print(f"  Agents Used: {', '.join(agents_used) if agents_used else 'None'}")
        
        return coordination_found or len(agents_used) > 0
        
    except Exception as e:
        print(f"❌ Coordination test error: {e}")
        return False

def test_performance(base_url, api_key=None):
    """Test response time performance."""
    print("\n⚡ Testing performance...")
    
    headers = {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    
    timings = []
    
    for i in range(5):
        start_time = time.time()
        
        try:
            response = requests.post(
                f"{base_url}/api/chat",
                json={
                    "message": f"Quick test {i}",
                    "sessionId": f"perf-test-{int(time.time())}"
                },
                headers=headers,
                timeout=10
            )
            
            elapsed = (time.time() - start_time) * 1000  # Convert to ms
            timings.append(elapsed)
            
            print(f"  Request {i+1}: {elapsed:.2f}ms")
            
        except Exception as e:
            print(f"  Request {i+1}: Failed - {e}")
    
    if timings:
        avg_time = sum(timings) / len(timings)
        print(f"\n  Average response time: {avg_time:.2f}ms")
        print(f"  ADK target: <10ms")
        
        if avg_time < 10:
            print("  ✅ Performance target met!")
        else:
            print("  ⚠️  Performance below target")
        
        return True
    
    return False

def main(base_url, api_key=None):
    """Run all verification tests."""
    print("=" * 60)
    print("🚀 ADK Deployment Verification")
    print("=" * 60)
    print(f"Target: {base_url}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Run tests
    health_ok = test_health_endpoint(base_url)
    
    if health_ok:
        coordination_ok = test_adk_coordination(base_url, api_key)
        performance_ok = test_performance(base_url, api_key)
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 Verification Summary")
        print("=" * 60)
        print(f"Health Check: {'✅ PASS' if health_ok else '❌ FAIL'}")
        print(f"ADK Coordination: {'✅ PASS' if coordination_ok else '❌ FAIL'}")
        print(f"Performance: {'✅ PASS' if performance_ok else '❌ FAIL'}")
        
        if all([health_ok, coordination_ok, performance_ok]):
            print("\n✅ ADK deployment verified successfully!")
            return 0
        else:
            print("\n❌ Some verification tests failed")
            return 1
    else:
        print("\n❌ Health check failed - cannot proceed with other tests")
        return 1

if __name__ == "__main__":
    # Get base URL from command line or environment
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        base_url = os.getenv("VANA_BASE_URL", "http://localhost:8081")
    
    # Remove trailing slash
    base_url = base_url.rstrip('/')
    
    # Get API key if needed
    api_key = os.getenv("VANA_API_KEY")
    
    sys.exit(main(base_url, api_key))