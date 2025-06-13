#!/usr/bin/env python3
"""
Simple VANA Environment Test
Quick validation of current system state before running comprehensive testing
"""

import requests
import time
from playwright.sync_api import sync_playwright
from lib.logging_config import get_logger
logger = get_logger("vana.simple_environment_test")


def test_service_health():
    """Test basic service health and connectivity"""
    logger.debug("🔍 Testing VANA Service Health")
    logger.debug("%s", "=" * 40)
    
    base_url = "https://vana-dev-960076421399.us-central1.run.app"
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/health", timeout=10)
        logger.debug(f"✅ Health endpoint: {response.status_code}")
        if response.status_code == 200:
            logger.debug(f"   Response: {response.json()}")
    except Exception as e:
        logger.error(f"❌ Health endpoint failed: {e}")
        return False
    
    # Test info endpoint
    try:
        response = requests.get(f"{base_url}/info", timeout=10)
        logger.debug(f"✅ Info endpoint: {response.status_code}")
        if response.status_code == 200:
            info = response.json()
            logger.debug("%s", f"   ADK Integrated: {info.get('adk_integrated', 'Unknown')}")
            logger.debug("%s", f"   Memory Service: {info.get('memory_service', {}).get('type', 'Unknown')}")
    except Exception as e:
        logger.error(f"❌ Info endpoint failed: {e}")
        return False
    
    return True

def test_basic_agent_interaction():
    """Test basic agent interaction through UI"""
    logger.debug("\n🤖 Testing Basic Agent Interaction")
    logger.debug("%s", "=" * 40)
    
    base_url = "https://vana-dev-960076421399.us-central1.run.app"
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            # Navigate to service
            logger.debug("📍 Navigating to VANA service...")
            page.goto(base_url, timeout=30000)
            page.wait_for_load_state("networkidle")
            
            # Check if agent selector is available
            try:
                page.wait_for_selector("mat-select", timeout=10000)
                logger.debug("✅ Agent selector found")
                
                # Click to see available agents
                page.click("mat-select")
                page.wait_for_selector("mat-option", timeout=5000)
                
                # Get available agents
                agent_options = page.locator("mat-option").all_text_contents()
                logger.debug(f"✅ Available agents: {agent_options}")
                
                # Select VANA agent if available
                if any("vana" in agent.lower() for agent in agent_options):
                    page.click("mat-option:has-text('vana')")
                    logger.debug("✅ VANA agent selected")
                    
                    # Test simple interaction
                    test_message = "Hello, can you help me test the system?"
                    page.fill("textarea", test_message)
                    
                    start_time = time.time()
                    page.keyboard.press("Enter")
                    
                    # Wait for response (updated selector)
                    page.wait_for_selector("p", timeout=30000)
                    response_time = time.time() - start_time

                    # Get response text from p elements
                    response_elements = page.locator("p").all()
                    response_text = ""
                    for element in response_elements:
                        text = element.text_content()
                        if text and "robot_2" in text:  # Look for tool usage pattern
                            response_text = text
                            break

                    if not response_text:
                        # Fallback to last p element
                        response_text = page.locator("p").last.text_content() or ""
                    logger.debug(f"✅ Response received ({response_time:.2f}s)")
                    logger.debug(f"   Response length: {len(response_text)} characters")
                    logger.debug(f"   Response content: {response_text[:100]}...")

                    # Check for basic functionality indicators
                    has_tool_usage = "robot_2" in response_text
                    has_meaningful_content = len(response_text) > 20

                    if has_tool_usage and has_meaningful_content:
                        logger.debug("✅ Meaningful response with tool usage detected")
                        return True
                    elif has_meaningful_content:
                        logger.debug("✅ Meaningful response received")
                        return True
                    else:
                        logger.debug("⚠️ Response seems insufficient")
                        logger.debug(f"   Tool usage detected: {has_tool_usage}")
                        logger.debug(f"   Meaningful content: {has_meaningful_content}")
                        return False
                        
                else:
                    logger.debug("❌ VANA agent not found in options")
                    return False
                    
            except Exception as e:
                logger.error(f"❌ Agent interaction failed: {e}")
                return False
            finally:
                browser.close()
                
    except Exception as e:
        logger.error(f"❌ Browser test failed: {e}")
        return False

def main():
    """Run simple environment validation"""
    logger.debug("🚀 VANA Environment Validation Test")
    logger.debug("%s", "=" * 50)
    
    # Test 1: Service Health
    health_ok = test_service_health()
    
    # Test 2: Basic Agent Interaction
    if health_ok:
        interaction_ok = test_basic_agent_interaction()
    else:
        logger.debug("⚠️ Skipping agent interaction test due to health check failure")
        interaction_ok = False
    
    # Summary
    logger.debug("\n📊 Test Summary")
    logger.debug("%s", "=" * 20)
    logger.debug("%s", f"Service Health: {'✅ PASS' if health_ok else '❌ FAIL'}")
    logger.debug("%s", f"Agent Interaction: {'✅ PASS' if interaction_ok else '❌ FAIL'}")
    
    if health_ok and interaction_ok:
        logger.debug("\n🎉 Environment validation PASSED - Ready for comprehensive testing!")
        return True
    else:
        logger.error("\n⚠️ Environment validation FAILED - Issues need to be resolved")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
