#!/usr/bin/env python3
"""
Test script for ThinkingPanel integration
Tests the streaming endpoint with thinking events
"""

import asyncio
import json
import sys
from typing import AsyncGenerator

# Test queries that trigger different specialists
TEST_QUERIES = [
    ("What are the security best practices for API authentication?", "security_specialist"),
    ("Analyze the performance data from the last deployment", "data_science_specialist"),
    ("Review the architecture of a microservices system", "architecture_specialist"),
    ("How do I set up CI/CD pipeline with GitHub Actions?", "devops_specialist"),
    ("Create test cases for a login feature", "qa_specialist"),
    ("Design a responsive navigation component", "ui_specialist"),
]


async def test_streaming_endpoint(query: str, expected_specialist: str):
    """Test a single query through the streaming endpoint"""
    print(f"\n🧪 Testing: {query[:50]}...")
    print(f"   Expected specialist: {expected_specialist}")
    
    try:
        # Import here to avoid issues if run standalone
        from main import stream_agent_response
        
        thinking_events = []
        content_chunks = []
        
        async for chunk in stream_agent_response(query):
            if chunk.startswith('data: '):
                try:
                    data = json.loads(chunk[6:])
                    
                    if data.get('type') == 'thinking':
                        thinking_events.append(data)
                        print(f"   🤔 {data.get('content', 'Thinking...')}")
                        if data.get('agent'):
                            print(f"      Agent: {data['agent']}")
                    
                    elif data.get('type') == 'content':
                        content_chunks.append(data.get('content', ''))
                    
                    elif data.get('type') == 'done':
                        print("   ✅ Complete")
                        
                except json.JSONDecodeError:
                    pass
        
        # Verify results
        if thinking_events:
            print(f"   📊 Thinking events: {len(thinking_events)}")
            
            # Check if expected specialist was activated
            specialists_activated = [e.get('agent') for e in thinking_events if e.get('agent')]
            if expected_specialist in specialists_activated:
                print(f"   ✅ Correct specialist activated: {expected_specialist}")
            else:
                print(f"   ⚠️  Expected {expected_specialist}, got: {specialists_activated}")
        else:
            print("   ❌ No thinking events received")
        
        if content_chunks:
            full_response = ''.join(content_chunks)
            print(f"   📝 Response length: {len(full_response)} chars")
        else:
            print("   ❌ No content received")
            
        return len(thinking_events) > 0 and len(content_chunks) > 0
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


async def run_all_tests():
    """Run all test queries"""
    print("=" * 60)
    print("🚀 VANA ThinkingPanel Integration Test")
    print("=" * 60)
    
    # Check if we can import the main module
    try:
        import main
        print("✅ Main module imported successfully")
    except ImportError as e:
        print(f"❌ Cannot import main module: {e}")
        print("   Make sure to run from the project root directory")
        return
    
    # Run tests
    results = []
    for query, specialist in TEST_QUERIES:
        success = await test_streaming_endpoint(query, specialist)
        results.append((query[:30], success))
        await asyncio.sleep(1)  # Brief pause between tests
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for query, success in results:
        status = "✅" if success else "❌"
        print(f"{status} {query}...")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! ThinkingPanel integration is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the implementation.")


if __name__ == "__main__":
    # Run from project root
    import os
    if not os.path.exists("main.py"):
        print("❌ Error: Run this script from the VANA project root directory")
        print("   Usage: python test_thinking_panel.py")
        sys.exit(1)
    
    # Add project root to path
    sys.path.insert(0, os.getcwd())
    
    # Run tests
    asyncio.run(run_all_tests())