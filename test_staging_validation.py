#!/usr/bin/env python3
"""
Quick Staging Validation Script
Tests core VANA functionality with ADK events enabled
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime

class StagingValidator:
    def __init__(self, base_url="http://localhost:8081"):
        self.base_url = base_url
        self.session = None
        self.test_results = []
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def test_health_check(self):
        """Test 1: Health Check"""
        print("🏥 Testing health check...")
        start_time = time.time()
        
        try:
            async with self.session.get(f"{self.base_url}/health") as response:
                if response.status == 200:
                    data = await response.json()
                    elapsed = time.time() - start_time
                    print(f"✅ Health check passed ({elapsed:.2f}s)")
                    print(f"   Status: {data.get('status', 'unknown')}")
                    print(f"   ADK Events: {data.get('adk_events_enabled', 'unknown')}")
                    return True
                else:
                    print(f"❌ Health check failed: {response.status}")
                    return False
        except Exception as e:
            print(f"❌ Health check error: {e}")
            return False
    
    async def test_silent_handoff(self, query, expected_specialist):
        """Test silent agent handoff functionality"""
        print(f"🤫 Testing silent handoff: {query[:50]}...")
        start_time = time.time()
        
        payload = {
            "message": query,
            "session_id": f"test_session_{int(time.time())}"
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/process_agent_request",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    response_text = data.get("response", "")
                    elapsed = time.time() - start_time
                    
                    # Check for transfer messages (should be absent)
                    transfer_indicators = [
                        "transferring", "routing", "handing off",
                        "transfer_conversation", "TRANSFER_CONTROL"
                    ]
                    
                    has_transfer_message = any(
                        indicator.lower() in response_text.lower() 
                        for indicator in transfer_indicators
                    )
                    
                    if has_transfer_message:
                        print(f"❌ Transfer message detected in response")
                        print(f"   Response snippet: {response_text[:100]}...")
                        return False
                    else:
                        print(f"✅ Silent handoff successful ({elapsed:.2f}s)")
                        print(f"   Response length: {len(response_text)} chars")
                        return True
                else:
                    print(f"❌ Request failed: {response.status}")
                    return False
                    
        except Exception as e:
            print(f"❌ Request error: {e}")
            return False
    
    async def test_event_streaming(self, query):
        """Test ADK event streaming functionality"""
        print(f"📡 Testing event streaming: {query[:50]}...")
        start_time = time.time()
        
        payload = {
            "message": query,
            "session_id": f"stream_test_{int(time.time())}"
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/stream_agent_response",
                json=payload,
                headers={"Accept": "text/event-stream"}
            ) as response:
                
                if response.status == 200:
                    events_received = 0
                    final_response = ""
                    
                    async for line in response.content:
                        line_text = line.decode('utf-8').strip()
                        if line_text.startswith('data: '):
                            events_received += 1
                            try:
                                event_data = json.loads(line_text[6:])
                                if event_data.get('type') == 'final_response':
                                    final_response = event_data.get('content', '')
                                    break
                            except json.JSONDecodeError:
                                pass
                    
                    elapsed = time.time() - start_time
                    
                    if events_received > 0:
                        print(f"✅ Event streaming successful ({elapsed:.2f}s)")
                        print(f"   Events received: {events_received}")
                        print(f"   Final response: {len(final_response)} chars")
                        return True
                    else:
                        print(f"❌ No events received")
                        return False
                else:
                    print(f"❌ Streaming failed: {response.status}")
                    return False
                    
        except Exception as e:
            print(f"❌ Streaming error: {e}")
            return False
    
    async def run_validation_suite(self):
        """Run complete validation suite"""
        print("🚀 VANA Staging Validation Suite")
        print("================================")
        print(f"Target: {self.base_url}")
        print(f"Time: {datetime.now().isoformat()}")
        print()
        
        # Test scenarios
        test_scenarios = [
            {
                "name": "Health Check",
                "test": self.test_health_check,
                "args": []
            },
            {
                "name": "Silent Security Handoff",
                "test": self.test_silent_handoff,
                "args": ["What security vulnerabilities should I check for?", "security"]
            },
            {
                "name": "Silent Data Science Handoff", 
                "test": self.test_silent_handoff,
                "args": ["Analyze user engagement trends", "data_science"]
            },
            {
                "name": "Silent Architecture Handoff",
                "test": self.test_silent_handoff, 
                "args": ["Review my React component structure", "architecture"]
            },
            {
                "name": "Event Streaming",
                "test": self.test_event_streaming,
                "args": ["Generate a comprehensive security audit report"]
            }
        ]
        
        # Execute tests
        passed = 0
        total = len(test_scenarios)
        
        for scenario in test_scenarios:
            print(f"\n📋 {scenario['name']}")
            print("-" * 40)
            
            try:
                if scenario["args"]:
                    result = await scenario["test"](*scenario["args"])
                else:
                    result = await scenario["test"]()
                
                if result:
                    passed += 1
                    
            except Exception as e:
                print(f"❌ Test failed with exception: {e}")
        
        # Summary
        print("\n" + "="*50)
        print("🎯 VALIDATION SUMMARY")
        print("="*50)
        print(f"Tests Passed: {passed}/{total}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if passed == total:
            print("✅ All tests passed - Staging ready for production!")
        elif passed >= total * 0.8:
            print("⚠️  Most tests passed - Minor issues to address")
        else:
            print("❌ Multiple test failures - Requires investigation")
        
        return passed == total

async def main():
    """Main validation runner"""
    async with StagingValidator() as validator:
        success = await validator.run_validation_suite()
        return 0 if success else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)