#!/usr/bin/env python3
"""
Puppeteer Validation Script
Uses MCP Puppeteer tools to validate VANA system functionality.
"""

import sys
import time
import logging
import json
from typing import Dict, Any, List

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# VANA service URL
VANA_SERVICE_URL = "https://vana-qqugqgsbcq-uc.a.run.app"

def test_vana_service_availability():
    """Test that VANA service is available and responding."""
    logger.info("🧪 Testing VANA Service Availability")
    
    try:
        # Use MCP Puppeteer to navigate to VANA service
        from lib._tools.adk_mcp_tools import adk_puppeteer_navigate
        
        result = adk_puppeteer_navigate(VANA_SERVICE_URL)
        
        # Check if navigation was successful
        if "successfully navigated" in result.lower() or "navigation complete" in result.lower():
            logger.info("✅ VANA service is available and responding")
            return True
        else:
            logger.error(f"❌ VANA service navigation failed: {result}")
            return False
            
    except Exception as e:
        logger.error(f"❌ VANA service availability test failed: {e}")
        return False

def test_specialist_tool_functionality():
    """Test specialist tools through VANA web interface."""
    logger.info("🧪 Testing Specialist Tool Functionality")
    
    try:
        from lib._tools.adk_mcp_tools import (
            adk_puppeteer_navigate, adk_puppeteer_fill, 
            adk_puppeteer_evaluate, adk_puppeteer_screenshot
        )
        
        # Navigate to VANA service
        nav_result = adk_puppeteer_navigate(VANA_SERVICE_URL)
        if "error" in nav_result.lower():
            logger.error(f"❌ Navigation failed: {nav_result}")
            return False
        
        # Test competitive intelligence tool
        test_message = "Use the competitive_intelligence_tool to analyze market trends"
        
        # Fill the chat textarea
        fill_result = adk_puppeteer_fill("textarea", test_message)
        if "error" in fill_result.lower():
            logger.error(f"❌ Failed to fill textarea: {fill_result}")
            return False
        
        # Submit with Enter key
        submit_result = adk_puppeteer_evaluate("""
            const textarea = document.querySelector('textarea');
            if (textarea) {
                const event = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true
                });
                textarea.dispatchEvent(event);
                return 'Enter key sent';
            } else {
                return 'Textarea not found';
            }
        """)
        
        if "enter key sent" not in submit_result.lower():
            logger.error(f"❌ Failed to submit message: {submit_result}")
            return False
        
        # Wait for response
        time.sleep(5)
        
        # Take screenshot for documentation
        screenshot_result = adk_puppeteer_screenshot("specialist_tool_test")
        logger.info(f"Screenshot taken: {screenshot_result}")
        
        # Check for task ID in response
        response_check = adk_puppeteer_evaluate("""
            const messages = document.querySelectorAll('.message, .response, .chat-message');
            let foundTaskId = false;
            messages.forEach(msg => {
                if (msg.textContent.includes('Task ID')) {
                    foundTaskId = true;
                }
            });
            return foundTaskId ? 'Task ID found in response' : 'No Task ID found';
        """)
        
        if "task id found" in response_check.lower():
            logger.info("✅ Specialist tool creating task IDs correctly")
            return True
        else:
            logger.warning(f"⚠️ Task ID not found in response: {response_check}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Specialist tool functionality test failed: {e}")
        return False

def test_task_status_checking():
    """Test task status checking functionality."""
    logger.info("🧪 Testing Task Status Checking")
    
    try:
        from lib._tools.adk_mcp_tools import (
            adk_puppeteer_fill, adk_puppeteer_evaluate
        )
        
        # Test check_task_status with invalid ID
        test_message = 'Use check_task_status("invalid-task-id") to test error handling'
        
        # Fill and submit
        fill_result = adk_puppeteer_fill("textarea", test_message)
        submit_result = adk_puppeteer_evaluate("""
            const textarea = document.querySelector('textarea');
            if (textarea) {
                const event = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true
                });
                textarea.dispatchEvent(event);
                return 'Enter key sent';
            }
            return 'Failed to send';
        """)
        
        # Wait for response
        time.sleep(3)
        
        # Check for proper error handling
        error_check = adk_puppeteer_evaluate("""
            const messages = document.querySelectorAll('.message, .response, .chat-message');
            let foundError = false;
            messages.forEach(msg => {
                if (msg.textContent.includes('not found') || msg.textContent.includes('invalid')) {
                    foundError = true;
                }
            });
            return foundError ? 'Error handling working' : 'No error handling found';
        """)
        
        if "error handling working" in error_check.lower():
            logger.info("✅ Task status checking with proper error handling")
            return True
        else:
            logger.warning(f"⚠️ Error handling not working as expected: {error_check}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Task status checking test failed: {e}")
        return False

def test_tool_listing():
    """Test comprehensive tool listing functionality."""
    logger.info("🧪 Testing Tool Listing")
    
    try:
        from lib._tools.adk_mcp_tools import (
            adk_puppeteer_fill, adk_puppeteer_evaluate
        )
        
        # Test tool listing
        test_message = "List all available tools"
        
        # Fill and submit
        fill_result = adk_puppeteer_fill("textarea", test_message)
        submit_result = adk_puppeteer_evaluate("""
            const textarea = document.querySelector('textarea');
            if (textarea) {
                const event = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true
                });
                textarea.dispatchEvent(event);
                return 'Enter key sent';
            }
            return 'Failed to send';
        """)
        
        # Wait for response
        time.sleep(5)
        
        # Check for comprehensive tool listing
        listing_check = adk_puppeteer_evaluate("""
            const messages = document.querySelectorAll('.message, .response, .chat-message');
            let foundListing = false;
            messages.forEach(msg => {
                if (msg.textContent.includes('COMPREHENSIVE TOOL INVENTORY') || 
                    msg.textContent.includes('Total Tools Available')) {
                    foundListing = true;
                }
            });
            return foundListing ? 'Tool listing found' : 'No tool listing found';
        """)
        
        if "tool listing found" in listing_check.lower():
            logger.info("✅ Comprehensive tool listing working")
            return True
        else:
            logger.warning(f"⚠️ Tool listing not working as expected: {listing_check}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Tool listing test failed: {e}")
        return False

def run_puppeteer_validation():
    """Run all Puppeteer validation tests."""
    logger.info("🚀 Starting Puppeteer Validation")
    logger.info("="*60)
    
    tests = [
        ("VANA Service Availability", test_vana_service_availability),
        ("Specialist Tool Functionality", test_specialist_tool_functionality),
        ("Task Status Checking", test_task_status_checking),
        ("Tool Listing", test_tool_listing)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        logger.info(f"\n🧪 Running: {test_name}")
        try:
            results[test_name] = test_func()
            # Small delay between tests
            time.sleep(2)
        except Exception as e:
            logger.error(f"❌ {test_name} failed with exception: {e}")
            results[test_name] = False
    
    # Generate report
    logger.info("\n" + "="*60)
    logger.info("📊 PUPPETEER VALIDATION REPORT")
    logger.info("="*60)
    
    passed = 0
    total = len(tests)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        logger.info(f"{status} {test_name}")
        if result:
            passed += 1
    
    logger.info(f"\n📈 Results: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed >= total * 0.8:  # 80% pass rate
        logger.info("🎉 Puppeteer validation SUCCESSFUL - System functional")
        return True
    else:
        logger.error("🚨 Puppeteer validation FAILED - System issues detected")
        return False

if __name__ == "__main__":
    success = run_puppeteer_validation()
    sys.exit(0 if success else 1)
