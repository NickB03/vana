#!/usr/bin/env python3
"""
Phase 2 Validation Script
Tests comprehensive tool fixes and improvements.
"""

import sys
import os
import tempfile
import logging
from typing import Dict, Any

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_comprehensive_tool_listing():
    """Test comprehensive tool listing functionality."""
    logger.info("🧪 Testing Comprehensive Tool Listing")
    
    try:
        from lib._tools.comprehensive_tool_listing import list_all_agent_tools, get_tool_status_summary
        
        # Test tool listing
        tool_list = list_all_agent_tools()
        assert "COMPREHENSIVE TOOL INVENTORY" in tool_list
        assert "Total Tools Available" in tool_list
        logger.info("✅ Tool listing working correctly")
        
        # Test status summary
        status_summary = get_tool_status_summary()
        assert "TOOL STATUS SUMMARY" in status_summary
        assert "Core Tool Health" in status_summary
        logger.info("✅ Status summary working correctly")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Comprehensive tool listing failed: {e}")
        return False

def test_improved_write_file():
    """Test improved write file error handling."""
    logger.info("🧪 Testing Improved Write File")
    
    try:
        from lib._tools.adk_tools import write_file
        
        # Test 1: Valid file write
        with tempfile.TemporaryDirectory() as temp_dir:
            test_file = os.path.join(temp_dir, "test.txt")
            result = write_file(test_file, "Test content")
            assert "✅ Successfully wrote" in result
            logger.info("✅ Valid file write working")
        
        # Test 2: Empty path validation
        result = write_file("", "content")
        assert "❌ Error: File path cannot be empty" in result
        logger.info("✅ Empty path validation working")
        
        # Test 3: Directory creation
        with tempfile.TemporaryDirectory() as temp_dir:
            nested_file = os.path.join(temp_dir, "subdir", "test.txt")
            result = write_file(nested_file, "Test content")
            assert "✅ Successfully wrote" in result
            logger.info("✅ Directory creation working")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Improved write file failed: {e}")
        return False

def test_all_specialist_tools():
    """Test all fixed specialist tools create task IDs."""
    logger.info("🧪 Testing All Fixed Specialist Tools")
    
    try:
        from lib._tools.fixed_specialist_tools import (
            competitive_intelligence_tool, web_research_tool, data_analysis_tool,
            itinerary_planning_tool, hotel_search_tool, flight_search_tool, payment_processing_tool
        )
        
        tools_to_test = [
            ("Competitive Intelligence", competitive_intelligence_tool),
            ("Web Research", web_research_tool),
            ("Data Analysis", data_analysis_tool),
            ("Itinerary Planning", itinerary_planning_tool),
            ("Hotel Search", hotel_search_tool),
            ("Flight Search", flight_search_tool),
            ("Payment Processing", payment_processing_tool)
        ]
        
        all_working = True
        
        for tool_name, tool_func in tools_to_test:
            try:
                result = tool_func(f"Test {tool_name.lower()}")
                if "Task ID" in result and "check_task_status" in result:
                    logger.info(f"✅ {tool_name} tool creates task ID")
                else:
                    logger.error(f"❌ {tool_name} tool not creating task ID")
                    all_working = False
            except Exception as e:
                logger.error(f"❌ {tool_name} tool failed: {e}")
                all_working = False
        
        return all_working
        
    except Exception as e:
        logger.error(f"❌ Specialist tools test failed: {e}")
        return False

def test_task_status_integration():
    """Test task status checking integration with new tools."""
    logger.info("🧪 Testing Task Status Integration")
    
    try:
        from lib._tools.fixed_specialist_tools import competitive_intelligence_tool
        from lib._tools.adk_long_running_tools import check_task_status
        import re
        
        # Create a task
        result = competitive_intelligence_tool("Integration test")
        
        # Extract task ID
        task_id_match = re.search(r'\*\*Task ID\*\*: ([a-f0-9-]+)', result)
        if not task_id_match:
            logger.error("❌ Could not extract task ID from result")
            return False
        
        task_id = task_id_match.group(1)
        logger.info(f"Extracted task ID: {task_id}")
        
        # Check task status
        status_result = check_task_status(task_id)
        if task_id in status_result and "Task ID" in status_result:
            logger.info("✅ Task status integration working")
            return True
        else:
            logger.error("❌ Task status integration failed")
            return False
        
    except Exception as e:
        logger.error(f"❌ Task status integration failed: {e}")
        return False

def test_tool_functionality_validation():
    """Test tool functionality validation system."""
    logger.info("🧪 Testing Tool Functionality Validation")
    
    try:
        from lib._tools.comprehensive_tool_listing import validate_tool_functionality
        
        validation_results = validate_tool_functionality()
        
        # Check validation results structure
        required_keys = ["tests_run", "tests_passed", "tests_failed", "success_rate", "details"]
        for key in required_keys:
            if key not in validation_results:
                logger.error(f"❌ Missing key in validation results: {key}")
                return False
        
        # Check that tests were run
        if validation_results["tests_run"] == 0:
            logger.error("❌ No validation tests were run")
            return False
        
        # Check success rate
        success_rate = float(validation_results["success_rate"].replace('%', ''))
        if success_rate >= 80:
            logger.info(f"✅ Tool validation successful: {validation_results['success_rate']}")
            return True
        else:
            logger.warning(f"⚠️ Tool validation below threshold: {validation_results['success_rate']}")
            return False
        
    except Exception as e:
        logger.error(f"❌ Tool functionality validation failed: {e}")
        return False

def run_phase2_validation():
    """Run all Phase 2 validation tests."""
    logger.info("🚀 Starting Phase 2 Validation")
    logger.info("="*60)
    
    tests = [
        ("Comprehensive Tool Listing", test_comprehensive_tool_listing),
        ("Improved Write File", test_improved_write_file),
        ("All Specialist Tools", test_all_specialist_tools),
        ("Task Status Integration", test_task_status_integration),
        ("Tool Functionality Validation", test_tool_functionality_validation)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        logger.info(f"\n🧪 Running: {test_name}")
        try:
            results[test_name] = test_func()
        except Exception as e:
            logger.error(f"❌ {test_name} failed with exception: {e}")
            results[test_name] = False
    
    # Generate report
    logger.info("\n" + "="*60)
    logger.info("📊 PHASE 2 VALIDATION REPORT")
    logger.info("="*60)
    
    passed = 0
    total = len(tests)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        logger.info(f"{status} {test_name}")
        if result:
            passed += 1
    
    logger.info(f"\n📈 Results: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        logger.info("🎉 Phase 2 validation SUCCESSFUL - Ready for Phase 3")
        return True
    else:
        logger.error("🚨 Phase 2 validation FAILED - Fix issues before proceeding")
        return False

if __name__ == "__main__":
    success = run_phase2_validation()
    sys.exit(0 if success else 1)
