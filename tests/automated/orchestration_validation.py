#!/usr/bin/env python3
"""
Multi-Agent Orchestration Validation Test Suite
Post-Merge Validation for Agent-as-Tool Patterns

Tests orchestration improvements from merge commit: 774345abf3e265d28ac1f817f9398bacd1488691
"""

import asyncio
import json
import os
import time
from datetime import datetime
from typing import Dict, List, Any
from playwright.async_api import async_playwright, Page
from lib.logging_config import get_logger
logger = get_logger("vana.orchestration_validation")


class OrchestrationValidator:
    def __init__(self):
        self.base_url = "https://vana-dev-960076421399.us-central1.run.app"
        self.results: List[Dict[str, Any]] = []
        self.start_time = datetime.now()
        
    async def setup_page(self, page: Page) -> bool:
        """Setup page for testing"""
        try:
            logger.debug("🔧 Setting up test page...")
            await page.goto(self.base_url, timeout=30000)
            await page.wait_for_load_state("networkidle", timeout=30000)
            
            # Check if VANA agent is available
            agent_selector = "select[name='agent']"
            if await page.locator(agent_selector).count() > 0:
                await page.select_option(agent_selector, "vana")
                logger.debug("✅ VANA agent selected")
                return True
            else:
                logger.debug("⚠️ Agent selector not found, trying alternative setup...")
                return True  # Continue anyway, might be different UI
                
        except Exception as e:
            logger.error(f"❌ Page setup failed: {e}")
            return False
            
    async def test_architecture_delegation(self, page: Page) -> Dict[str, Any]:
        """TC-ORG-001: Architecture Specialist Delegation"""
        logger.debug("🔍 Testing architecture specialist delegation...")
        
        try:
            # Clear any existing content
            textarea_selector = "textarea"
            if await page.locator(textarea_selector).count() > 0:
                await page.fill(textarea_selector, "")
            
            # Submit architecture query
            query = "Design a microservices architecture for an e-commerce platform"
            await page.fill(textarea_selector, query)
            
            # Record start time
            start_time = time.time()
            
            # Submit query (try Enter key first, then button if available)
            try:
                await page.keyboard.press("Enter")
            except:
                submit_button = "button[type='submit'], .submit-button, #submit"
                if await page.locator(submit_button).count() > 0:
                    await page.click(submit_button)
            
            # Wait for response
            response_selector = ".response, .message, .output, [data-testid='response']"
            await page.wait_for_selector(response_selector, timeout=30000)
            
            response_time = time.time() - start_time
            response_text = await page.text_content(response_selector)
            
            # Analyze response for agent-as-tool patterns
            has_architecture_tool = "architecture_tool" in response_text.lower()
            has_architecture_content = any(keyword in response_text.lower() for keyword in [
                "microservices", "architecture", "api gateway", "database", "service"
            ])
            no_transfer = "transfer_to_agent" not in response_text.lower()
            no_user_transfer = "transferring" not in response_text.lower()
            
            # Determine test status
            status = "PASS" if (
                (has_architecture_tool or has_architecture_content) and 
                no_transfer and 
                no_user_transfer and
                response_time < 10.0
            ) else "FAIL"
            
            result = {
                "test_id": "TC-ORG-001",
                "name": "Architecture Specialist Delegation",
                "status": status,
                "response_time": round(response_time, 3),
                "query": query,
                "response_length": len(response_text),
                "has_architecture_tool": has_architecture_tool,
                "has_architecture_content": has_architecture_content,
                "no_transfer": no_transfer,
                "no_user_transfer": no_user_transfer,
                "response_preview": response_text[:200] + "..." if len(response_text) > 200 else response_text,
                "timestamp": datetime.now().isoformat()
            }
            
            # Take screenshot for evidence
            screenshot_path = "tests/results/TC-ORG-001_screenshot.png"
            os.makedirs("tests/results", exist_ok=True)
            await page.screenshot(path=screenshot_path, full_page=True)
            result["screenshot"] = screenshot_path
            
            self.results.append(result)
            return result
            
        except Exception as e:
            result = {
                "test_id": "TC-ORG-001",
                "name": "Architecture Specialist Delegation",
                "status": "ERROR",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
            self.results.append(result)
            return result
            
    async def test_ui_delegation(self, page: Page) -> Dict[str, Any]:
        """TC-ORG-002: UI/UX Specialist Delegation"""
        logger.debug("🔍 Testing UI/UX specialist delegation...")
        
        try:
            # Clear previous input
            textarea_selector = "textarea"
            await page.fill(textarea_selector, "")
            
            # Submit UI query
            query = "Create a modern dashboard UI with dark mode support"
            await page.fill(textarea_selector, query)
            
            start_time = time.time()
            
            # Submit query
            try:
                await page.keyboard.press("Enter")
            except:
                submit_button = "button[type='submit'], .submit-button, #submit"
                if await page.locator(submit_button).count() > 0:
                    await page.click(submit_button)
            
            # Wait for response
            response_selector = ".response, .message, .output, [data-testid='response']"
            await page.wait_for_selector(response_selector, timeout=30000)
            
            response_time = time.time() - start_time
            response_text = await page.text_content(response_selector)
            
            # Analyze response for UI tool usage
            has_ui_tool = "ui_tool" in response_text.lower()
            has_ui_content = any(keyword in response_text.lower() for keyword in [
                "dashboard", "ui", "interface", "design", "component", "dark mode"
            ])
            no_transfer = "transfer_to_agent" not in response_text.lower()
            no_user_transfer = "transferring" not in response_text.lower()
            
            status = "PASS" if (
                (has_ui_tool or has_ui_content) and 
                no_transfer and 
                no_user_transfer and
                response_time < 10.0
            ) else "FAIL"
            
            result = {
                "test_id": "TC-ORG-002",
                "name": "UI/UX Specialist Delegation",
                "status": status,
                "response_time": round(response_time, 3),
                "query": query,
                "response_length": len(response_text),
                "has_ui_tool": has_ui_tool,
                "has_ui_content": has_ui_content,
                "no_transfer": no_transfer,
                "no_user_transfer": no_user_transfer,
                "response_preview": response_text[:200] + "..." if len(response_text) > 200 else response_text,
                "timestamp": datetime.now().isoformat()
            }
            
            # Take screenshot
            screenshot_path = "tests/results/TC-ORG-002_screenshot.png"
            await page.screenshot(path=screenshot_path, full_page=True)
            result["screenshot"] = screenshot_path
            
            self.results.append(result)
            return result
            
        except Exception as e:
            result = {
                "test_id": "TC-ORG-002",
                "name": "UI/UX Specialist Delegation",
                "status": "ERROR",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
            self.results.append(result)
            return result
            
    async def test_devops_delegation(self, page: Page) -> Dict[str, Any]:
        """TC-ORG-003: DevOps Specialist Delegation"""
        logger.debug("🔍 Testing DevOps specialist delegation...")
        
        try:
            # Clear and submit DevOps query
            textarea_selector = "textarea"
            await page.fill(textarea_selector, "")
            
            query = "Plan deployment strategy for a Node.js application"
            await page.fill(textarea_selector, query)
            
            start_time = time.time()
            
            try:
                await page.keyboard.press("Enter")
            except:
                submit_button = "button[type='submit'], .submit-button, #submit"
                if await page.locator(submit_button).count() > 0:
                    await page.click(submit_button)
            
            # Wait for response
            response_selector = ".response, .message, .output, [data-testid='response']"
            await page.wait_for_selector(response_selector, timeout=30000)
            
            response_time = time.time() - start_time
            response_text = await page.text_content(response_selector)
            
            # Analyze response
            has_devops_tool = "devops_tool" in response_text.lower()
            has_devops_content = any(keyword in response_text.lower() for keyword in [
                "deployment", "docker", "kubernetes", "ci/cd", "pipeline", "infrastructure"
            ])
            no_transfer = "transfer_to_agent" not in response_text.lower()
            
            status = "PASS" if (
                (has_devops_tool or has_devops_content) and 
                no_transfer and
                response_time < 10.0
            ) else "FAIL"
            
            result = {
                "test_id": "TC-ORG-003",
                "name": "DevOps Specialist Delegation",
                "status": status,
                "response_time": round(response_time, 3),
                "query": query,
                "has_devops_tool": has_devops_tool,
                "has_devops_content": has_devops_content,
                "no_transfer": no_transfer,
                "response_preview": response_text[:200] + "..." if len(response_text) > 200 else response_text,
                "timestamp": datetime.now().isoformat()
            }
            
            screenshot_path = "tests/results/TC-ORG-003_screenshot.png"
            await page.screenshot(path=screenshot_path, full_page=True)
            result["screenshot"] = screenshot_path
            
            self.results.append(result)
            return result
            
        except Exception as e:
            result = {
                "test_id": "TC-ORG-003",
                "name": "DevOps Specialist Delegation",
                "status": "ERROR",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
            self.results.append(result)
            return result
            
    async def test_tool_functionality(self, page: Page) -> Dict[str, Any]:
        """TC-ORG-004: Basic Tool Functionality"""
        logger.debug("🔍 Testing basic tool functionality...")
        
        try:
            # Test simple tool execution
            textarea_selector = "textarea"
            await page.fill(textarea_selector, "")
            
            query = "What's the current time?"
            await page.fill(textarea_selector, query)
            
            start_time = time.time()
            
            try:
                await page.keyboard.press("Enter")
            except:
                submit_button = "button[type='submit'], .submit-button, #submit"
                if await page.locator(submit_button).count() > 0:
                    await page.click(submit_button)
            
            # Wait for response
            response_selector = ".response, .message, .output, [data-testid='response']"
            await page.wait_for_selector(response_selector, timeout=30000)
            
            response_time = time.time() - start_time
            response_text = await page.text_content(response_selector)
            
            # Check for tool usage and time information
            has_time_tool = "get_current_time" in response_text.lower()
            has_time_info = any(keyword in response_text.lower() for keyword in [
                "time", "clock", "utc", "am", "pm", "2025"
            ])
            
            status = "PASS" if (
                (has_time_tool or has_time_info) and
                response_time < 5.0
            ) else "FAIL"
            
            result = {
                "test_id": "TC-ORG-004",
                "name": "Basic Tool Functionality",
                "status": status,
                "response_time": round(response_time, 3),
                "query": query,
                "has_time_tool": has_time_tool,
                "has_time_info": has_time_info,
                "response_preview": response_text[:200] + "..." if len(response_text) > 200 else response_text,
                "timestamp": datetime.now().isoformat()
            }
            
            self.results.append(result)
            return result
            
        except Exception as e:
            result = {
                "test_id": "TC-ORG-004",
                "name": "Basic Tool Functionality",
                "status": "ERROR",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
            self.results.append(result)
            return result
            
    async def run_all_tests(self) -> List[Dict[str, Any]]:
        """Execute all orchestration tests"""
        logger.info("🤖 Starting Multi-Agent Orchestration Tests...")
        logger.debug("%s", "=" * 50)
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            # Setup page
            if not await self.setup_page(page):
                logger.error("❌ Failed to setup test page")
                return self.results
            
            tests = [
                self.test_architecture_delegation,
                self.test_ui_delegation,
                self.test_devops_delegation,
                self.test_tool_functionality
            ]
            
            for test in tests:
                result = await test(page)
                status_emoji = "✅" if result["status"] == "PASS" else "❌" if result["status"] == "FAIL" else "⚠️"
                logger.info("%s", f"{status_emoji} {result['test_id']}: {result['name']} - {result['status']}")
                
                if result["status"] == "FAIL":
                    logger.error("%s", f"   └─ Failure details: {result.get('error', 'See result data')}")
                elif result["status"] == "ERROR":
                    logger.error("%s", f"   └─ Error: {result.get('error', 'Unknown error')}")
                    
                # Small delay between tests
                await asyncio.sleep(2)
                
            await browser.close()
            
        # Calculate summary
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r["status"] == "PASS")
        
        logger.debug("%s", "\n" + "=" * 50)
        logger.debug(f"📊 Orchestration Tests Summary:")
        logger.debug(f"   Total: {total_tests}")
        logger.debug(f"   Passed: {passed_tests}")
        logger.info(f"   Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        logger.debug("%s", "=" * 50)
        
        return self.results
        
    def save_results(self, filename: str = None) -> str:
        """Save test results to JSON file"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"orchestration_validation_{timestamp}.json"
            
        os.makedirs("tests/results", exist_ok=True)
        filepath = os.path.join("tests/results", filename)
        
        results_data = {
            "test_suite": "Multi-Agent Orchestration Validation",
            "merge_commit": "774345abf3e265d28ac1f817f9398bacd1488691",
            "execution_time": datetime.now().isoformat(),
            "base_url": self.base_url,
            "results": self.results
        }
        
        with open(filepath, "w") as f:
            json.dump(results_data, f, indent=2)
            
        logger.info(f"💾 Results saved to: {filepath}")
        return filepath

if __name__ == "__main__":
    validator = OrchestrationValidator()
    results = asyncio.run(validator.run_all_tests())
    validator.save_results()
