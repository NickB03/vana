#!/usr/bin/env python3
"""
Phase 1 Validation Script
Tests critical fixes for import hanging and specialist tools.
"""

import sys
import time
import logging
from typing import Dict, Any

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_lazy_initialization():
    """Test lazy initialization manager."""
    logger.info("🧪 Testing Lazy Initialization Manager")
    
    try:
        from lib._shared_libraries.lazy_initialization import lazy_manager, get_lazy_service
        
        # Test service registration
        def mock_service():
            return "Mock Service Initialized"
        
        lazy_manager.register_service("test_service", mock_service)
        
        # Test lazy loading
        service = get_lazy_service("test_service")
        assert service == "Mock Service Initialized"
        
        logger.info("✅ Lazy initialization working correctly")
        return True
        
    except Exception as e:
        logger.error(f"❌ Lazy initialization failed: {e}")
        return False

def test_fixed_specialist_tools():
    """Test fixed specialist tools create proper task IDs."""
    logger.info("🧪 Testing Fixed Specialist Tools")
    
    try:
        from lib._tools.fixed_specialist_tools import (
            competitive_intelligence_tool, itinerary_planning_tool,
            hotel_search_tool, flight_search_tool
        )
        
        # Test competitive intelligence tool
        result = competitive_intelligence_tool("Test market analysis")
        assert "Task ID" in result
        assert "check_task_status" in result
        logger.info("✅ Competitive intelligence tool creates task ID")
        
        # Test itinerary planning tool
        result = itinerary_planning_tool("Test trip planning")
        assert "Task ID" in result
        assert "check_task_status" in result
        logger.info("✅ Itinerary planning tool creates task ID")
        
        # Test hotel search tool
        result = hotel_search_tool("Test hotel search")
        assert "Task ID" in result
        assert "check_task_status" in result
        logger.info("✅ Hotel search tool creates task ID")
        
        # Test flight search tool
        result = flight_search_tool("Test flight search")
        assert "Task ID" in result
        assert "check_task_status" in result
        logger.info("✅ Flight search tool creates task ID")
        
        logger.info("✅ All fixed specialist tools working correctly")
        return True
        
    except Exception as e:
        logger.error(f"❌ Fixed specialist tools failed: {e}")
        return False

def test_task_status_checking():
    """Test that task status checking works with new tools."""
    logger.info("🧪 Testing Task Status Checking")
    
    try:
        from lib._tools.fixed_specialist_tools import competitive_intelligence_tool
        from lib._tools.adk_long_running_tools import check_task_status
        
        # Create a task
        result = competitive_intelligence_tool("Test analysis")
        
        # Extract task ID from result
        import re
        task_id_match = re.search(r'\*\*Task ID\*\*: ([a-f0-9-]+)', result)
        if not task_id_match:
            raise ValueError("Could not extract task ID from result")
        
        task_id = task_id_match.group(1)
        logger.info(f"Extracted task ID: {task_id}")
        
        # Check task status
        status_result = check_task_status(task_id)
        assert "Task ID" in status_result
        assert task_id in status_result
        
        logger.info("✅ Task status checking working correctly")
        return True
        
    except Exception as e:
        logger.error(f"❌ Task status checking failed: {e}")
        return False

def test_import_speed():
    """Test that imports are now fast."""
    logger.info("🧪 Testing Import Speed")
    
    test_modules = [
        "lib._shared_libraries.lazy_initialization",
        "lib._tools.fixed_specialist_tools"
    ]
    
    all_fast = True
    
    for module in test_modules:
        start_time = time.time()
        try:
            __import__(module)
            elapsed = time.time() - start_time
            
            if elapsed > 5.0:
                logger.warning(f"⚠️ Slow import: {module} took {elapsed:.2f}s")
                all_fast = False
            else:
                logger.info(f"✅ Fast import: {module} took {elapsed:.2f}s")
                
        except Exception as e:
            logger.error(f"❌ Import failed: {module} - {e}")
            all_fast = False
    
    return all_fast

def run_phase1_validation():
    """Run all Phase 1 validation tests."""
    logger.info("🚀 Starting Phase 1 Validation")
    logger.info("="*60)
    
    tests = [
        ("Lazy Initialization", test_lazy_initialization),
        ("Fixed Specialist Tools", test_fixed_specialist_tools),
        ("Task Status Checking", test_task_status_checking),
        ("Import Speed", test_import_speed)
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
    logger.info("📊 PHASE 1 VALIDATION REPORT")
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
        logger.info("🎉 Phase 1 validation SUCCESSFUL - Ready for Phase 2")
        return True
    else:
        logger.error("🚨 Phase 1 validation FAILED - Fix issues before proceeding")
        return False

if __name__ == "__main__":
    success = run_phase1_validation()
    sys.exit(0 if success else 1)
