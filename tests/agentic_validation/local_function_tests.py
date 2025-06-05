#!/usr/bin/env python3
"""
LOCAL FUNCTION TESTING FOR AGENTIC SYSTEMS
Tests the orchestrated tools directly without HTTP overhead

This approach tests the actual Python functions to validate:
1. Task ID invisibility in responses
2. Proper orchestration patterns
3. Response quality and content
4. Model configuration

Based on UiPath Agentic Testing Best Practices - tests actual functionality.
"""

import sys
import os
import re
import json
import time
from typing import Dict, List, Any

# Add project root to path
sys.path.insert(0, '/Users/nick/Development/vana')

def test_orchestrated_tools():
    """
    Test the new orchestrated tools directly
    This validates the core fixes without HTTP overhead
    """
    print("🔬 TESTING ORCHESTRATED TOOLS DIRECTLY")
    print("=" * 50)
    
    try:
        # Import the orchestrated tools
        from lib._tools.orchestrated_specialist_tools import (
            itinerary_planning_tool,
            hotel_search_tool,
            flight_search_tool,
            code_generation_tool,
            testing_tool,
            competitive_intelligence_tool
        )
        
        test_results = []
        
        # Test 1: Itinerary Planning Tool
        print("\n🧪 Testing Itinerary Planning Tool...")
        response = itinerary_planning_tool("Plan a trip to Paris from July 12th to July 16th")
        
        # Check for task ID exposure
        task_id_patterns = [
            r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}',
            r'check_task_status\(["\']([^"\']+)["\']\)',
            r'Task ID[:\s]+([a-f0-9-]+)',
            r'monitor progress.*([a-f0-9-]{20,})'
        ]
        
        task_ids_found = []
        for pattern in task_id_patterns:
            matches = re.findall(pattern, response, re.IGNORECASE)
            if matches:
                task_ids_found.extend(matches)
        
        if task_ids_found:
            print(f"❌ FAILED: Found task IDs in response: {task_ids_found}")
            test_results.append({"test": "itinerary_planning_task_ids", "status": "FAIL", "details": f"Task IDs found: {task_ids_found}"})
        else:
            print("✅ PASSED: No task IDs exposed")
            test_results.append({"test": "itinerary_planning_task_ids", "status": "PASS", "details": "No task IDs exposed"})
        
        # Check for ownership language
        ownership_patterns = [
            r"I've created",
            r"I found",
            r"I can provide",
            r"Your itinerary is ready"
        ]
        
        ownership_found = any(re.search(pattern, response, re.IGNORECASE) for pattern in ownership_patterns)
        
        if ownership_found:
            print("✅ PASSED: Proper ownership language found")
            test_results.append({"test": "itinerary_planning_ownership", "status": "PASS", "details": "Ownership language present"})
        else:
            print("❌ FAILED: No ownership language found")
            test_results.append({"test": "itinerary_planning_ownership", "status": "FAIL", "details": "No ownership language"})
        
        print(f"Response excerpt: {response[:200]}...")
        
        # Test 2: Hotel Search Tool
        print("\n🧪 Testing Hotel Search Tool...")
        response = hotel_search_tool("Search for hotels in New York")
        
        # Check for task ID exposure
        task_ids_found = []
        for pattern in task_id_patterns:
            matches = re.findall(pattern, response, re.IGNORECASE)
            if matches:
                task_ids_found.extend(matches)
        
        if task_ids_found:
            print(f"❌ FAILED: Found task IDs in response: {task_ids_found}")
            test_results.append({"test": "hotel_search_task_ids", "status": "FAIL", "details": f"Task IDs found: {task_ids_found}"})
        else:
            print("✅ PASSED: No task IDs exposed")
            test_results.append({"test": "hotel_search_task_ids", "status": "PASS", "details": "No task IDs exposed"})
        
        print(f"Response excerpt: {response[:200]}...")
        
        # Test 3: Flight Search Tool
        print("\n🧪 Testing Flight Search Tool...")
        response = flight_search_tool("Find flights from London to Tokyo")
        
        # Check for task ID exposure
        task_ids_found = []
        for pattern in task_id_patterns:
            matches = re.findall(pattern, response, re.IGNORECASE)
            if matches:
                task_ids_found.extend(matches)
        
        if task_ids_found:
            print(f"❌ FAILED: Found task IDs in response: {task_ids_found}")
            test_results.append({"test": "flight_search_task_ids", "status": "FAIL", "details": f"Task IDs found: {task_ids_found}"})
        else:
            print("✅ PASSED: No task IDs exposed")
            test_results.append({"test": "flight_search_task_ids", "status": "PASS", "details": "No task IDs exposed"})
        
        print(f"Response excerpt: {response[:200]}...")
        
        # Test 4: Code Generation Tool
        print("\n🧪 Testing Code Generation Tool...")
        response = code_generation_tool("Create a web application with user authentication")
        
        # Check for task ID exposure
        task_ids_found = []
        for pattern in task_id_patterns:
            matches = re.findall(pattern, response, re.IGNORECASE)
            if matches:
                task_ids_found.extend(matches)
        
        if task_ids_found:
            print(f"❌ FAILED: Found task IDs in response: {task_ids_found}")
            test_results.append({"test": "code_generation_task_ids", "status": "FAIL", "details": f"Task IDs found: {task_ids_found}"})
        else:
            print("✅ PASSED: No task IDs exposed")
            test_results.append({"test": "code_generation_task_ids", "status": "PASS", "details": "No task IDs exposed"})
        
        print(f"Response excerpt: {response[:200]}...")
        
        # Generate summary
        total_tests = len(test_results)
        passed_tests = len([r for r in test_results if r["status"] == "PASS"])
        failed_tests = len([r for r in test_results if r["status"] == "FAIL"])
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\n🔬 LOCAL FUNCTION TEST RESULTS")
        print("=" * 40)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if failed_tests == 0:
            print("✅ ALL LOCAL FUNCTION TESTS PASSED!")
        else:
            print(f"❌ {failed_tests} LOCAL FUNCTION TESTS FAILED")
        
        return test_results
        
    except ImportError as e:
        print(f"❌ IMPORT ERROR: {e}")
        print("Cannot import orchestrated tools - they may not be properly configured")
        return [{"test": "import_orchestrated_tools", "status": "FAIL", "details": str(e)}]
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {e}")
        return [{"test": "unexpected_error", "status": "FAIL", "details": str(e)}]

def test_model_configuration():
    """
    Test if the model configuration is properly set to DeepSeek
    """
    print("\n🔬 TESTING MODEL CONFIGURATION")
    print("=" * 40)
    
    try:
        # Check environment variables
        import os
        vana_model = os.getenv("VANA_MODEL")
        
        if vana_model == "deepseek/deepseek-r1-0528:free":
            print("✅ PASSED: VANA_MODEL environment variable correctly set")
            return [{"test": "model_env_var", "status": "PASS", "details": f"VANA_MODEL={vana_model}"}]
        else:
            print(f"❌ FAILED: VANA_MODEL is '{vana_model}', expected 'deepseek/deepseek-r1-0528:free'")
            return [{"test": "model_env_var", "status": "FAIL", "details": f"VANA_MODEL={vana_model}"}]
            
    except Exception as e:
        print(f"❌ ERROR testing model configuration: {e}")
        return [{"test": "model_config_error", "status": "FAIL", "details": str(e)}]

def test_old_vs_new_tools():
    """
    Compare old (task ID exposing) vs new (orchestrated) tools
    """
    print("\n🔬 COMPARING OLD VS NEW TOOLS")
    print("=" * 40)
    
    try:
        # Test old tool (should expose task IDs)
        from lib._tools.fixed_specialist_tools import itinerary_planning_tool as old_tool
        old_response = old_tool("Plan a trip to Paris")
        
        # Test new tool (should NOT expose task IDs)
        from lib._tools.orchestrated_specialist_tools import itinerary_planning_tool as new_tool
        new_response = new_tool("Plan a trip to Paris")
        
        # Check old tool for task ID exposure
        task_id_pattern = r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'
        old_has_task_ids = bool(re.search(task_id_pattern, old_response))
        new_has_task_ids = bool(re.search(task_id_pattern, new_response))
        
        print(f"Old tool exposes task IDs: {old_has_task_ids}")
        print(f"New tool exposes task IDs: {new_has_task_ids}")
        
        if old_has_task_ids and not new_has_task_ids:
            print("✅ PASSED: New tool successfully removes task ID exposure")
            return [{"test": "old_vs_new_comparison", "status": "PASS", "details": "Task ID exposure successfully removed"}]
        elif not old_has_task_ids and not new_has_task_ids:
            print("⚠️  WARNING: Neither tool exposes task IDs (unexpected for old tool)")
            return [{"test": "old_vs_new_comparison", "status": "PARTIAL", "details": "Neither tool exposes task IDs"}]
        else:
            print("❌ FAILED: New tool still exposes task IDs")
            return [{"test": "old_vs_new_comparison", "status": "FAIL", "details": "New tool still exposes task IDs"}]
            
    except Exception as e:
        print(f"❌ ERROR comparing tools: {e}")
        return [{"test": "tool_comparison_error", "status": "FAIL", "details": str(e)}]

def main():
    """
    Run comprehensive local function testing
    """
    print("🔬 COMPREHENSIVE LOCAL FUNCTION TESTING")
    print("=" * 60)
    print(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("")
    
    all_results = []
    
    # Run all tests
    all_results.extend(test_model_configuration())
    all_results.extend(test_orchestrated_tools())
    all_results.extend(test_old_vs_new_tools())
    
    # Generate final report
    total_tests = len(all_results)
    passed_tests = len([r for r in all_results if r["status"] == "PASS"])
    failed_tests = len([r for r in all_results if r["status"] == "FAIL"])
    partial_tests = len([r for r in all_results if r["status"] == "PARTIAL"])
    
    success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
    
    print(f"\n🔬 COMPREHENSIVE TEST RESULTS")
    print("=" * 50)
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {failed_tests}")
    print(f"Partial: {partial_tests}")
    print(f"Success Rate: {success_rate:.1f}%")
    
    # Save results
    report = {
        "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
        "summary": {
            "total": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "partial": partial_tests,
            "success_rate": f"{success_rate:.1f}%"
        },
        "test_results": all_results
    }
    
    with open("local_function_test_results.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📊 Detailed results saved to: local_function_test_results.json")
    
    if failed_tests == 0:
        print("✅ ALL LOCAL FUNCTION TESTS PASSED!")
        return 0
    else:
        print(f"❌ {failed_tests} LOCAL FUNCTION TESTS FAILED")
        return 1

if __name__ == "__main__":
    exit(main())
