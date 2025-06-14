#!/usr/bin/env python3
"""
MCP Tools Status Check
Quick validation of current MCP tools status after aws_lambda_mcp removal
"""

import asyncio
import json
import time
from typing import Any, Dict

import requests

from lib.logging_config import get_logger

logger = get_logger("vana.mcp_tools_status_check")


class MCPToolsStatusChecker:
    def __init__(self):
        self.service_url = "https://vana-prod-${PROJECT_NUMBER}.us-central1.run.app"
        self.session_id = None

    async def check_service_health(self) -> Dict[str, Any]:
        """Check if the VANA service is healthy"""
        try:
            response = requests.get(f"{self.service_url}/health", timeout=10)
            return {
                "status": "healthy" if response.status_code == 200 else "unhealthy",
                "response": response.json() if response.status_code == 200 else response.text,
                "status_code": response.status_code,
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def create_session(self) -> Dict[str, Any]:
        """Create a new session with the VANA service"""
        try:
            response = requests.post(f"{self.service_url}/sessions", json={"agent_name": "vana"}, timeout=15)

            if response.status_code == 200:
                data = response.json()
                self.session_id = data.get("session_id")
                return {"status": "success", "session_id": self.session_id, "response": data}
            else:
                return {"status": "failed", "status_code": response.status_code, "response": response.text}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def test_mcp_tool(self, tool_name: str, test_message: str) -> Dict[str, Any]:
        """Test a specific MCP tool using the /run endpoint"""
        try:
            start_time = time.time()

            response = requests.post(
                f"{self.service_url}/run", json={"message": f"Use the {tool_name} tool: {test_message}"}, timeout=30
            )

            response_time = time.time() - start_time

            if response.status_code == 200:
                data = response.json()
                response_text = data.get("response", "")

                # Check if the tool was actually used
                tool_used = tool_name in response_text or "tool" in response_text.lower()

                return {
                    "status": "success" if tool_used else "tool_not_used",
                    "tool_name": tool_name,
                    "response_time": round(response_time, 2),
                    "response": response_text,
                    "tool_detected": tool_used,
                    "full_response": data,
                }
            else:
                return {
                    "status": "failed",
                    "tool_name": tool_name,
                    "status_code": response.status_code,
                    "response": response.text,
                }
        except Exception as e:
            return {"status": "error", "tool_name": tool_name, "error": str(e)}

    async def run_comprehensive_check(self) -> Dict[str, Any]:
        """Run comprehensive MCP tools status check"""
        logger.info("🎯 MCP TOOLS STATUS CHECK STARTING")
        logger.debug("%s", "=" * 50)

        # 1. Check service health
        logger.debug("1. Checking service health...")
        health_result = await self.check_service_health()
        logger.info("%s", f"   Service Status: {health_result['status']}")

        if health_result["status"] != "healthy":
            return {"overall_status": "service_unhealthy", "health_check": health_result}

        # 2. Test Core MCP Tools (after aws_lambda_mcp removal)
        core_mcp_tools = [
            ("list_available_mcp_servers", "List all available MCP servers"),
            ("get_mcp_integration_status", "Get current MCP integration status"),
            ("context7_sequential_thinking", "Analyze the benefits of MCP tools"),
            ("brave_search_mcp", "Search for 'Model Context Protocol'"),
            ("github_mcp_operations", "Get GitHub user information"),
        ]

        logger.debug("\n2. Testing Core MCP Tools...")
        core_results = {}
        successful_core = 0

        for tool_name, test_message in core_mcp_tools:
            logger.debug(f"   Testing {tool_name}...")
            result = await self.test_mcp_tool(tool_name, test_message)
            core_results[tool_name] = result
            if result["status"] == "success":
                successful_core += 1
                logger.info("%s", f"   ✅ {tool_name} - SUCCESS ({result.get('response_time', 0)}s)")
            elif result["status"] == "tool_not_used":
                logger.info("%s", f"   ⚠️ {tool_name} - RESPONDED BUT TOOL NOT USED ({result.get('response_time', 0)}s)")
            else:
                logger.error(
                    "%s", f"   ❌ {tool_name} - FAILED ({result.get('error', result.get('status', 'unknown'))})"
                )

        # 3. Test Time MCP Tools (sample)
        time_tools = [("get_current_time", "Get the current time"), ("list_timezones", "List available timezones")]

        logger.debug("\n3. Testing Time MCP Tools...")
        time_results = {}
        successful_time = 0

        for tool_name, test_message in time_tools:
            logger.debug(f"   Testing {tool_name}...")
            result = await self.test_mcp_tool(tool_name, test_message)
            time_results[tool_name] = result
            if result["status"] == "success":
                successful_time += 1
                logger.info("%s", f"   ✅ {tool_name} - SUCCESS ({result.get('response_time', 0)}s)")
            elif result["status"] == "tool_not_used":
                logger.info("%s", f"   ⚠️ {tool_name} - RESPONDED BUT TOOL NOT USED ({result.get('response_time', 0)}s)")
            else:
                logger.error(
                    "%s", f"   ❌ {tool_name} - FAILED ({result.get('error', result.get('status', 'unknown'))})"
                )

        # 4. Test Filesystem MCP Tools (sample)
        filesystem_tools = [
            ("compress_files", "Compress test files"),
            ("get_file_metadata", "Get metadata for a test file"),
        ]

        logger.debug("\n4. Testing Filesystem MCP Tools...")
        filesystem_results = {}
        successful_filesystem = 0

        for tool_name, test_message in filesystem_tools:
            logger.debug(f"   Testing {tool_name}...")
            result = await self.test_mcp_tool(tool_name, test_message)
            filesystem_results[tool_name] = result
            if result["status"] == "success":
                successful_filesystem += 1
                logger.info("%s", f"   ✅ {tool_name} - SUCCESS ({result.get('response_time', 0)}s)")
            elif result["status"] == "tool_not_used":
                logger.info("%s", f"   ⚠️ {tool_name} - RESPONDED BUT TOOL NOT USED ({result.get('response_time', 0)}s)")
            else:
                logger.error(
                    "%s", f"   ❌ {tool_name} - FAILED ({result.get('error', result.get('status', 'unknown'))})"
                )

        # Calculate overall success rate
        total_tested = len(core_mcp_tools) + len(time_tools) + len(filesystem_tools)
        total_successful = successful_core + successful_time + successful_filesystem
        success_rate = (total_successful / total_tested * 100) if total_tested > 0 else 0

        logger.info("\n📊 RESULTS SUMMARY")
        logger.debug("%s", "=" * 50)
        logger.info(
            f"Core MCP Tools: {successful_core}/{len(core_mcp_tools)} ({successful_core/len(core_mcp_tools)*100:.1f}%)"
        )
        logger.info(f"Time Tools: {successful_time}/{len(time_tools)} ({successful_time/len(time_tools)*100:.1f}%)")
        logger.info(
            f"Filesystem Tools: {successful_filesystem}/{len(filesystem_tools)} ({successful_filesystem/len(filesystem_tools)*100:.1f}%)"
        )
        logger.info(f"OVERALL SUCCESS RATE: {success_rate:.1f}% ({total_successful}/{total_tested})")

        return {
            "overall_status": "completed",
            "success_rate": success_rate,
            "total_tested": total_tested,
            "total_successful": total_successful,
            "health_check": health_result,
            "core_mcp_results": core_results,
            "time_tools_results": time_results,
            "filesystem_tools_results": filesystem_results,
            "summary": {
                "core_mcp_success": f"{successful_core}/{len(core_mcp_tools)}",
                "time_tools_success": f"{successful_time}/{len(time_tools)}",
                "filesystem_tools_success": f"{successful_filesystem}/{len(filesystem_tools)}",
                "aws_lambda_mcp_removed": True,
                "recommendation": (
                    "✅ Ready for deployment"
                    if success_rate >= 90
                    else "⚠️ Needs optimization" if success_rate >= 75 else "🚨 Requires fixes"
                ),
            },
        }


async def main():
    """Main execution"""
    checker = MCPToolsStatusChecker()
    results = await checker.run_comprehensive_check()

    # Save results
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    filename = f"mcp_status_check_{timestamp}.json"
    with open(filename, "w") as f:
        json.dump(results, f, indent=2, default=str)

    logger.info(f"\n💾 Results saved to: {filename}")

    return results


if __name__ == "__main__":
    asyncio.run(main())
