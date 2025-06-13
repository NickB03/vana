#!/usr/bin/env python3
"""
Debug UI Selectors
Investigate actual UI structure to fix testing framework selectors
"""

from playwright.sync_api import sync_playwright
import time

def debug_ui_structure():
    """Debug the actual UI structure to find correct selectors"""
    print("🔍 Debugging VANA UI Structure")
    print("=" * 40)
    
    base_url = "https://vana-dev-960076421399.us-central1.run.app"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Visible for debugging
        page = browser.new_page()
        
        try:
            # Navigate to service
            print("📍 Navigating to VANA service...")
            page.goto(base_url, timeout=30000)
            page.wait_for_load_state("networkidle")
            
            # Get page HTML structure
            print("\n📋 Page HTML structure:")
            html = page.content()
            print(f"Page title: {page.title()}")
            
            # Check for agent selector
            print("\n🔍 Looking for agent selector...")
            try:
                page.wait_for_selector("mat-select", timeout=10000)
                print("✅ mat-select found")
                
                # Click to see agents
                page.click("mat-select")
                page.wait_for_selector("mat-option", timeout=5000)
                
                agents = page.locator("mat-option").all_text_contents()
                print(f"✅ Available agents: {agents}")
                
                # Select VANA
                page.click("mat-option:has-text('vana')")
                print("✅ VANA agent selected")
                
            except Exception as e:
                print(f"❌ Agent selector issue: {e}")
            
            # Check for textarea
            print("\n🔍 Looking for input area...")
            try:
                page.wait_for_selector("textarea", timeout=5000)
                print("✅ textarea found")
                
                # Send a test message
                test_message = "Hello, this is a test message"
                page.fill("textarea", test_message)
                print(f"✅ Message filled: {test_message}")
                
                # Submit message
                page.keyboard.press("Enter")
                print("✅ Message submitted")
                
                # Wait a moment for response to appear
                time.sleep(3)
                
            except Exception as e:
                print(f"❌ Input area issue: {e}")
            
            # Debug response area - try multiple selectors
            print("\n🔍 Looking for response area...")
            
            potential_selectors = [
                ".response",
                ".message", 
                ".output",
                ".chat-message",
                ".agent-response",
                "[data-testid='response']",
                ".mat-card",
                ".content",
                "div[role='log']",
                ".conversation",
                "pre",
                "p",
                "div"
            ]
            
            for selector in potential_selectors:
                try:
                    elements = page.locator(selector).all()
                    if elements:
                        print(f"✅ Found {len(elements)} elements with selector: {selector}")
                        for i, element in enumerate(elements[:3]):  # Show first 3
                            text = element.text_content()
                            if text and len(text.strip()) > 10:
                                print(f"   Element {i}: {text[:100]}...")
                except Exception as e:
                    continue
            
            # Get all text content to see what's actually on the page
            print("\n📄 All visible text on page:")
            all_text = page.text_content("body")
            if all_text:
                lines = [line.strip() for line in all_text.split('\n') if line.strip()]
                for line in lines[-10:]:  # Show last 10 lines
                    print(f"   {line}")
            
            # Take a screenshot for manual inspection
            page.screenshot(path="debug_ui_screenshot.png")
            print("\n📸 Screenshot saved as debug_ui_screenshot.png")
            
            # Keep browser open for manual inspection
            print("\n⏸️ Browser kept open for manual inspection. Press Enter to close...")
            input()
            
        except Exception as e:
            print(f"❌ Debug failed: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    debug_ui_structure()
