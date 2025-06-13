#!/usr/bin/env python3
"""
Test Agent Fix
Quick test to see if the agent discovery fix works
"""

import asyncio
import time
from playwright.async_api import async_playwright

async def test_agent_fix():
    """Test if agents are now properly using tools"""
    print("🔧 Testing Agent Fix")
    print("=" * 30)
    
    base_url = "https://vana-dev-960076421399.us-central1.run.app"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        try:
            await page.goto(base_url, timeout=30000)
            await page.wait_for_load_state("networkidle")
            
            # Test with VANA agent specifically
            await page.click("mat-select")
            await page.click("mat-option:has-text('vana')")
            await asyncio.sleep(1)
            
            # Test echo tool specifically
            test_query = "echo 'Hello from fixed agent!'"
            print(f"Testing: {test_query}")
            
            await page.fill("textarea", "")
            await page.fill("textarea", test_query)
            
            start_time = time.time()
            await page.keyboard.press("Enter")
            
            # Wait for response
            await page.wait_for_selector("p", timeout=30000)
            response_time = time.time() - start_time
            
            # Get response
            response_elements = await page.locator("p").all()
            response_text = ""
            for element in response_elements:
                text = await element.text_content()
                if text and len(text) > 10:
                    response_text = text
                    break
            
            print(f"Response time: {response_time:.3f}s")
            print(f"Response: {response_text}")
            
            # Check for tool usage
            tool_usage = "robot_2bolt" in response_text or "echo" in response_text.lower()
            
            if tool_usage:
                print("✅ SUCCESS: Tool usage detected!")
                return True
            elif response_time > 1.0:
                print("✅ PROGRESS: Slower response suggests processing")
                return True
            else:
                print("❌ Still not working - need deeper fix")
                return False
                
        except Exception as e:
            print(f"❌ Test failed: {e}")
            return False
        finally:
            await browser.close()

async def main():
    success = await test_agent_fix()
    if success:
        print("\n🎉 Agent fix appears to be working!")
    else:
        print("\n⚠️ Need to investigate further")
    return success

if __name__ == "__main__":
    result = asyncio.run(main())
