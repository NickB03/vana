#!/usr/bin/env python3
"""
Fix Agent-Tool Integration
Diagnose and fix the agent-tool orchestration issue
"""

import asyncio
import json
import time

from playwright.async_api import async_playwright

from lib.logging_config import get_logger

logger = get_logger("vana.fix_agent_tool_integration")


class AgentToolIntegrationFixer:
    def __init__(self):
        self.base_url = "https://vana-dev-960076421399.us-central1.run.app"
        self.test_results = {}

    async def diagnose_tool_integration_issue(self):
        """Diagnose why agents aren't using tools"""
        logger.info("🔧 Diagnosing Agent-Tool Integration Issue")
        logger.info("%s", "=" * 50)

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            try:
                await page.goto(self.base_url, timeout=30000)
                await page.wait_for_load_state("networkidle")

                # Test specific tool-triggering queries
                tool_tests = [
                    ("echo test", "echo", "Should trigger echo tool"),
                    ("get health status", "get_health_status", "Should trigger health tool"),
                    ("search for VANA capabilities", "search_knowledge", "Should trigger knowledge search"),
                    ("read file README.md", "read_file", "Should trigger file read"),
                    ("what tools do you have", "get_agent_status", "Should list available tools"),
                ]

                # Select VANA agent
                await page.click("mat-select")
                await page.click("mat-option:has-text('vana')")
                await asyncio.sleep(1)

                for query, expected_tool, description in tool_tests:
                    logger.info(f"\n🧪 Testing: {description}")
                    logger.info(f"   Query: {query}")
                    logger.info(f"   Expected tool: {expected_tool}")

                    # Clear and send query
                    await page.fill("textarea", "")
                    await page.fill("textarea", query)

                    start_time = time.time()
                    await page.keyboard.press("Enter")

                    # Wait for response
                    await page.wait_for_selector("p", timeout=30000)
                    response_time = time.time() - start_time

                    # Get all p elements and find the response
                    response_elements = await page.locator("p").all()
                    response_text = ""
                    tool_usage_detected = False

                    for element in response_elements:
                        text = await element.text_content()
                        if text and len(text) > 20:
                            response_text = text
                            # Check for tool usage patterns
                            if "robot_2bolt" in text or expected_tool in text.lower():
                                tool_usage_detected = True
                            break

                    # Analyze response
                    self.test_results[query] = {
                        "expected_tool": expected_tool,
                        "response_time": response_time,
                        "response_text": response_text,
                        "tool_usage_detected": tool_usage_detected,
                        "response_length": len(response_text),
                    }

                    status = "✅" if tool_usage_detected else "❌"
                    logger.info(f"   {status} Tool usage: {tool_usage_detected}")
                    logger.info(f"   Response time: {response_time:.3f}s")
                    logger.info(f"   Response: {response_text[:100]}...")

                    await asyncio.sleep(2)  # Wait between tests

            except Exception as e:
                logger.error(f"❌ Diagnosis failed: {e}")
            finally:
                await browser.close()

    def analyze_results(self):
        """Analyze test results to identify the root cause"""
        logger.info("\n🔍 Analysis Results")
        logger.info("%s", "=" * 30)

        total_tests = len(self.test_results)
        tools_working = sum(1 for result in self.test_results.values() if result["tool_usage_detected"])

        logger.info(f"Total tests: {total_tests}")
        logger.info(f"Tools working: {tools_working}")
        logger.info(f"Success rate: {(tools_working/total_tests)*100:.1f}%")

        if tools_working == 0:
            logger.info("\n🚨 ROOT CAUSE IDENTIFIED: NO TOOLS ARE BEING USED")
            logger.info("Possible causes:")
            logger.info("1. Agent configuration issue - tools not properly registered")
            logger.info("2. ADK execution issue - tools not being called")
            logger.info("3. Tool naming mismatch - agent calling wrong tool names")
            logger.info("4. Tool execution failure - tools failing silently")

            # Check response patterns
            response_patterns = {}
            for query, result in self.test_results.items():
                response = result["response_text"]
                if "robot_2" in response:
                    response_patterns["robot_pattern"] = response_patterns.get("robot_pattern", 0) + 1
                elif len(response) == 0:
                    response_patterns["empty"] = response_patterns.get("empty", 0) + 1
                elif len(response) < 50:
                    response_patterns["short"] = response_patterns.get("short", 0) + 1
                else:
                    response_patterns["normal"] = response_patterns.get("normal", 0) + 1

            logger.info(f"\nResponse patterns: {response_patterns}")

            return self.suggest_fixes()
        else:
            logger.info(f"\n✅ Some tools are working ({tools_working}/{total_tests})")
            return self.suggest_improvements()

    def suggest_fixes(self):
        """Suggest specific fixes based on analysis"""
        logger.info("\n🔧 Suggested Fixes")
        logger.info("%s", "=" * 20)

        fixes = []

        # Check if responses are empty
        empty_responses = sum(1 for result in self.test_results.values() if len(result["response_text"]) == 0)
        if empty_responses > len(self.test_results) * 0.5:
            fixes.append(
                {
                    "issue": "Empty responses",
                    "fix": "Check agent instruction format and tool calling syntax",
                    "priority": "HIGH",
                }
            )

        # Check response times
        avg_response_time = sum(result["response_time"] for result in self.test_results.values()) / len(
            self.test_results
        )
        if avg_response_time < 0.1:
            fixes.append(
                {
                    "issue": "Extremely fast responses suggest no processing",
                    "fix": "Check if agent is actually executing or just returning cached/empty responses",
                    "priority": "HIGH",
                }
            )

        # Check for robot pattern
        robot_patterns = sum(1 for result in self.test_results.values() if "robot_2" in result["response_text"])
        if robot_patterns == 0:
            fixes.append(
                {
                    "issue": "No tool usage patterns detected",
                    "fix": "Verify tool names match between agent config and tool definitions",
                    "priority": "CRITICAL",
                }
            )

        for i, fix in enumerate(fixes, 1):
            logger.info("%s", f"{i}. {fix['priority']}: {fix['issue']}")
            logger.info("%s", f"   Fix: {fix['fix']}")

        return fixes

    def suggest_improvements(self):
        """Suggest improvements for partially working system"""
        logger.info("\n💡 Suggested Improvements")
        logger.info("%s", "=" * 25)

        working_tools = [query for query, result in self.test_results.items() if result["tool_usage_detected"]]
        broken_tools = [query for query, result in self.test_results.items() if not result["tool_usage_detected"]]

        logger.info(f"Working queries: {working_tools}")
        logger.info(f"Broken queries: {broken_tools}")

        return {"working": working_tools, "broken": broken_tools}


async def main():
    """Run the agent-tool integration fix"""
    fixer = AgentToolIntegrationFixer()

    # Diagnose the issue
    await fixer.diagnose_tool_integration_issue()

    # Analyze results and suggest fixes
    analysis = fixer.analyze_results()

    # Save detailed results
    with open("agent_tool_diagnosis.json", "w") as f:
        json.dump({"test_results": fixer.test_results, "analysis": analysis}, f, indent=2)

    logger.info(f"\n💾 Detailed diagnosis saved to: agent_tool_diagnosis.json")

    return analysis


if __name__ == "__main__":
    result = asyncio.run(main())
