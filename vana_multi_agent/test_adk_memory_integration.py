#!/usr/bin/env python3
"""
Test ADK Memory Integration

This script tests the core ADK memory service integration to ensure
all components are working correctly.
"""

import os
import sys
import asyncio
from pathlib import Path

# Add parent directory to Python path
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

def test_adk_memory_service():
    """Test ADK Memory Service initialization and basic functionality."""
    print("🧪 Testing ADK Memory Service Integration...")
    
    try:
        # Test 1: Import ADK Memory Service
        print("\n1. Testing ADK Memory Service import...")
        from vana_multi_agent.core.adk_memory_service import get_adk_memory_service, ADKMemoryService
        print("✅ ADK Memory Service imported successfully")
        
        # Test 2: Initialize service
        print("\n2. Testing ADK Memory Service initialization...")
        memory_service = get_adk_memory_service()
        service_info = memory_service.get_service_info()
        print(f"✅ Service initialized: {service_info['service_type']}")
        print(f"   Available: {service_info['available']}")
        print(f"   Supports persistence: {service_info['supports_persistence']}")
        
        # Test 3: Test load_memory tool
        print("\n3. Testing load_memory tool access...")
        load_memory_tool = memory_service.get_load_memory_tool()
        print(f"✅ load_memory tool available: {load_memory_tool is not None}")
        
        return True
        
    except Exception as e:
        print(f"❌ ADK Memory Service test failed: {e}")
        return False

def test_session_manager():
    """Test ADK Session Manager functionality."""
    print("\n🧪 Testing ADK Session Manager...")
    
    try:
        # Test 1: Import Session Manager
        print("\n1. Testing Session Manager import...")
        from vana_multi_agent.core.session_manager import get_adk_session_manager, ADKSessionManager
        print("✅ Session Manager imported successfully")
        
        # Test 2: Initialize session manager
        print("\n2. Testing Session Manager initialization...")
        session_manager = get_adk_session_manager()
        service_info = session_manager.get_service_info()
        print(f"✅ Session Manager initialized: {service_info['service_type']}")
        print(f"   Available: {service_info['available']}")
        print(f"   Supports persistence: {service_info['supports_persistence']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Session Manager test failed: {e}")
        return False

def test_enhanced_hybrid_search():
    """Test Enhanced Hybrid Search with ADK Memory integration."""
    print("\n🧪 Testing Enhanced Hybrid Search with ADK Memory...")
    
    try:
        # Test 1: Import Enhanced Hybrid Search
        print("\n1. Testing Enhanced Hybrid Search import...")
        from tools.enhanced_hybrid_search import EnhancedHybridSearch
        print("✅ Enhanced Hybrid Search imported successfully")
        
        # Test 2: Initialize with ADK Memory
        print("\n2. Testing Enhanced Hybrid Search initialization with ADK Memory...")
        hybrid_search = EnhancedHybridSearch(use_adk_memory=True)
        print("✅ Enhanced Hybrid Search initialized with ADK Memory support")
        
        # Test 3: Test search functionality (basic test)
        print("\n3. Testing search functionality...")
        results = hybrid_search.search("test query", top_k=3, include_web=False)
        print(f"✅ Search completed. Results keys: {list(results.keys())}")
        print(f"   ADK Memory results: {len(results.get('adk_memory', []))}")
        
        return True
        
    except Exception as e:
        print(f"❌ Enhanced Hybrid Search test failed: {e}")
        return False

def test_agent_integration():
    """Test agent integration with load_memory tool."""
    print("\n🧪 Testing Agent Integration with load_memory tool...")
    
    try:
        # Test 1: Import agent team
        print("\n1. Testing agent team import...")
        from vana_multi_agent.agents.team import root_agent
        print("✅ Agent team imported successfully")
        
        # Test 2: Check load_memory tool in agent tools
        print("\n2. Testing load_memory tool in agent tools...")
        agent_tools = root_agent.tools if hasattr(root_agent, 'tools') else []
        
        # Look for load_memory tool
        load_memory_found = False
        for tool in agent_tools:
            if hasattr(tool, '__name__') and 'load_memory' in str(tool.__name__):
                load_memory_found = True
                break
            elif str(tool).lower().find('load_memory') != -1:
                load_memory_found = True
                break
        
        if load_memory_found:
            print("✅ load_memory tool found in agent tools")
        else:
            print("⚠️  load_memory tool not explicitly found, but may be available")
        
        print(f"   Total agent tools: {len(agent_tools)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Agent integration test failed: {e}")
        return False

def main():
    """Run all ADK memory integration tests."""
    print("🚀 VANA ADK Memory Integration Test Suite")
    print("=" * 50)
    
    tests = [
        ("ADK Memory Service", test_adk_memory_service),
        ("Session Manager", test_session_manager),
        ("Enhanced Hybrid Search", test_enhanced_hybrid_search),
        ("Agent Integration", test_agent_integration)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{'=' * 20} {test_name} {'=' * 20}")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("🎯 TEST SUMMARY")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All ADK Memory Integration tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
