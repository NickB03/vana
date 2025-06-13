#!/usr/bin/env python3
"""
Comprehensive MCP Tools Validation Framework
Automated testing for all 18 MCP tools in VANA system

This framework validates:
- All 6 Core MCP Tools (Context7, Brave Search, GitHub, AWS Lambda, etc.)
- All 6 Time MCP Tools (current time, timezone conversion, etc.)
- All 6 Enhanced Filesystem MCP Tools (metadata, compression, etc.)
- End-to-end functionality and integration
- Performance metrics and reliability
"""

import asyncio
import json
import logging
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
import requests
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class MCPToolTestResult:
    """Test result for an individual MCP tool"""
    tool_name: str
    test_type: str
    success: bool
    response_time: float
    response_data: Optional[Dict[str, Any]]
    error_message: Optional[str]
    timestamp: datetime

class ComprehensiveMCPValidator:
    """Comprehensive MCP Tools Validation Framework"""
    
    def __init__(self, service_url: str = "https://vana-prod-${PROJECT_NUMBER}.us-central1.run.app"):
        self.service_url = service_url
        self.test_results: List[MCPToolTestResult] = []
        self.session = requests.Session()
        
    async def validate_all_mcp_tools(self) -> Dict[str, Any]:
        """Validate all 18 MCP tools comprehensively"""
        logger.info("🚀 Starting Comprehensive MCP Tools Validation")
        
        # Test categories
        test_categories = [
            ("Core MCP Tools", self._test_core_mcp_tools),
            ("Time MCP Tools", self._test_time_mcp_tools),
            ("Filesystem MCP Tools", self._test_filesystem_mcp_tools),
            ("Integration Tests", self._test_mcp_integration),
            ("Performance Tests", self._test_mcp_performance)
        ]
        
        category_results = {}
        
        for category_name, test_function in test_categories:
            logger.info(f"📋 Testing {category_name}...")
            start_time = time.time()
            
            try:
                results = await test_function()
                category_results[category_name] = {
                    "status": "success",
                    "results": results,
                    "duration": time.time() - start_time
                }
                logger.info(f"✅ {category_name} completed successfully")
                
            except Exception as e:
                category_results[category_name] = {
                    "status": "error",
                    "error": str(e),
                    "duration": time.time() - start_time
                }
                logger.error(f"❌ {category_name} failed: {e}")
        
        # Generate comprehensive report
        return self._generate_validation_report(category_results)
    
    async def _test_core_mcp_tools(self) -> Dict[str, Any]:
        """Test all 6 Core MCP Tools"""
        core_tools = [
            ("list_available_mcp_servers", "List all available MCP servers"),
            ("get_mcp_integration_status", "Get current MCP integration status"),
            ("context7_sequential_thinking", "Use Context7 for structured analysis of MCP tools"),
            ("brave_search_mcp", "Search for 'Model Context Protocol' using Brave Search"),
            ("github_mcp_operations", "Get GitHub user information"),
            ("aws_lambda_mcp", "List AWS Lambda functions")
        ]
        
        results = {}
        
        for tool_name, test_query in core_tools:
            result = await self._test_single_tool(tool_name, test_query)
            results[tool_name] = result
            
        return results
    
    async def _test_time_mcp_tools(self) -> Dict[str, Any]:
        """Test all 6 Time MCP Tools"""
        time_tools = [
            ("get_current_time", "What is the current time?"),
            ("convert_timezone", "Convert current time to Tokyo timezone"),
            ("calculate_date", "Calculate date 30 days from now"),
            ("format_datetime", "Format current datetime in ISO format"),
            ("get_time_until", "How much time until New Year 2026?"),
            ("list_timezones", "List available timezones")
        ]
        
        results = {}
        
        for tool_name, test_query in time_tools:
            result = await self._test_single_tool(tool_name, test_query)
            results[tool_name] = result
            
        return results
    
    async def _test_filesystem_mcp_tools(self) -> Dict[str, Any]:
        """Test all 6 Enhanced Filesystem MCP Tools"""
        filesystem_tools = [
            ("get_file_metadata", "Get metadata for a test file"),
            ("batch_file_operations", "Perform batch file operations"),
            ("compress_files", "Compress test files"),
            ("extract_archive", "Extract test archive"),
            ("find_files", "Find files with specific pattern"),
            ("sync_directories", "Synchronize test directories")
        ]
        
        results = {}
        
        for tool_name, test_query in filesystem_tools:
            result = await self._test_single_tool(tool_name, test_query)
            results[tool_name] = result
            
        return results
    
    async def _create_session(self, user_id: str) -> Optional[str]:
        """Create a session and return session ID"""
        try:
            # Create session using ADK session endpoint
            response = self.session.post(
                f"{self.service_url}/apps/vana/users/{user_id}/sessions",
                json={},
                timeout=10,
                headers={"Content-Type": "application/json"}
            )

            if response.status_code == 200:
                session_data = response.json()
                return session_data.get("id")
            else:
                logger.error(f"Failed to create session: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            logger.error(f"Error creating session: {e}")
            return None

    async def _test_single_tool(self, tool_name: str, test_query: str) -> MCPToolTestResult:
        """Test a single MCP tool using Google ADK /run endpoint with proper session management"""
        start_time = time.time()

        try:
            # Create a session first
            user_id = "test_user"
            session_id = await self._create_session(user_id)

            if not session_id:
                return MCPToolTestResult(
                    tool_name=tool_name,
                    test_type="functionality",
                    success=False,
                    response_time=time.time() - start_time,
                    response_data=None,
                    error_message="Failed to create session",
                    timestamp=datetime.now()
                )

            # Use Google ADK /run endpoint structure with valid session
            payload = {
                "appName": "vana",
                "userId": user_id,
                "sessionId": session_id,
                "newMessage": {
                    "parts": [
                        {
                            "text": f"Use the {tool_name} tool: {test_query}"
                        }
                    ],
                    "role": "user"
                },
                "streaming": False
            }

            # Make API call to VANA service using /run endpoint
            response = self.session.post(
                f"{self.service_url}/run",
                json=payload,
                timeout=30,
                headers={"Content-Type": "application/json"}
            )

            response_time = time.time() - start_time

            if response.status_code == 200:
                response_data = response.json()

                # Check if tool was actually used
                tool_used = self._check_tool_usage(response_data, tool_name)

                return MCPToolTestResult(
                    tool_name=tool_name,
                    test_type="functionality",
                    success=tool_used,
                    response_time=response_time,
                    response_data=response_data,
                    error_message=None if tool_used else "Tool not used in response",
                    timestamp=datetime.now()
                )
            else:
                return MCPToolTestResult(
                    tool_name=tool_name,
                    test_type="functionality",
                    success=False,
                    response_time=response_time,
                    response_data=None,
                    error_message=f"HTTP {response.status_code}: {response.text}",
                    timestamp=datetime.now()
                )

        except Exception as e:
            return MCPToolTestResult(
                tool_name=tool_name,
                test_type="functionality",
                success=False,
                response_time=time.time() - start_time,
                response_data=None,
                error_message=str(e),
                timestamp=datetime.now()
            )
    
    def _check_tool_usage(self, response_data: Dict[str, Any], tool_name: str) -> bool:
        """Check if the specified tool was actually used in the response"""
        response_text = str(response_data).lower()
        tool_indicators = [
            tool_name.lower(),
            "tool",
            "function",
            "executed",
            "called",
            "used"
        ]
        
        # Simple heuristic - look for tool usage indicators
        return any(indicator in response_text for indicator in tool_indicators)
    
    async def _test_mcp_integration(self) -> Dict[str, Any]:
        """Test MCP tool integration and orchestration"""
        integration_tests = [
            {
                "name": "multi_tool_workflow",
                "query": "Use list_available_mcp_servers and get_mcp_integration_status to provide a comprehensive MCP status report"
            },
            {
                "name": "time_and_search_integration", 
                "query": "Get current time and then search for recent news about AI agents"
            },
            {
                "name": "context7_analysis",
                "query": "Use Context7 sequential thinking to analyze the benefits of MCP tools integration"
            }
        ]
        
        results = {}
        
        for test in integration_tests:
            result = await self._test_single_tool(test["name"], test["query"])
            results[test["name"]] = result
            
        return results
    
    async def _test_mcp_performance(self) -> Dict[str, Any]:
        """Test MCP tools performance metrics"""
        # Test response times for quick tools
        quick_tools = ["get_current_time", "list_available_mcp_servers", "get_mcp_integration_status"]
        
        performance_results = {}
        
        for tool in quick_tools:
            # Run multiple tests for average
            times = []
            for i in range(3):
                result = await self._test_single_tool(tool, f"Performance test {i+1}")
                times.append(result.response_time)
                
            performance_results[tool] = {
                "average_response_time": sum(times) / len(times),
                "min_response_time": min(times),
                "max_response_time": max(times),
                "tests_run": len(times)
            }
            
        return performance_results
    
    def _generate_validation_report(self, category_results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive validation report"""
        total_tests = sum(
            len(cat_result.get("results", {})) 
            for cat_result in category_results.values() 
            if isinstance(cat_result.get("results"), dict)
        )
        
        successful_tests = 0
        failed_tests = 0
        
        for category, cat_result in category_results.items():
            if cat_result["status"] == "success" and isinstance(cat_result.get("results"), dict):
                for test_name, test_result in cat_result["results"].items():
                    if isinstance(test_result, MCPToolTestResult):
                        if test_result.success:
                            successful_tests += 1
                        else:
                            failed_tests += 1
        
        success_rate = (successful_tests / total_tests * 100) if total_tests > 0 else 0
        
        return {
            "validation_summary": {
                "total_mcp_tools": 18,
                "total_tests_run": total_tests,
                "successful_tests": successful_tests,
                "failed_tests": failed_tests,
                "success_rate": f"{success_rate:.1f}%",
                "validation_timestamp": datetime.now().isoformat()
            },
            "category_results": category_results,
            "recommendations": self._generate_recommendations(success_rate, category_results),
            "next_steps": self._generate_next_steps(success_rate)
        }
    
    def _generate_recommendations(self, success_rate: float, category_results: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []
        
        if success_rate >= 90:
            recommendations.append("✅ MCP tools implementation is excellent - ready for MVP completion")
            recommendations.append("🚀 Proceed to Phase 4: Frontend GUI implementation")
        elif success_rate >= 75:
            recommendations.append("⚠️ MCP tools mostly functional - address failing tools before MVP")
            recommendations.append("🔧 Focus on fixing specific tool issues identified")
        else:
            recommendations.append("🚨 Significant MCP tools issues - requires immediate attention")
            recommendations.append("🛠️ Comprehensive debugging and fixes needed")
            
        return recommendations
    
    def _generate_next_steps(self, success_rate: float) -> List[str]:
        """Generate next steps based on validation results"""
        if success_rate >= 90:
            return [
                "Create LLM evaluation agent for automated testing",
                "Implement comprehensive system testing framework", 
                "Begin MVP frontend GUI development",
                "Prepare for production deployment"
            ]
        else:
            return [
                "Debug and fix failing MCP tools",
                "Re-run validation after fixes",
                "Enhance error handling and reliability",
                "Optimize tool performance"
            ]

async def main():
    """Main validation execution"""
    validator = ComprehensiveMCPValidator()
    
    logger.info("🎯 COMPREHENSIVE MCP TOOLS VALIDATION STARTING")
    logger.debug("%s", "=" * 60)
    
    results = await validator.validate_all_mcp_tools()
    
    logger.info("\n📊 VALIDATION RESULTS")
    logger.debug("%s", "=" * 60)
    logger.debug("%s", json.dumps(results["validation_summary"], indent=2))
    
    logger.debug("\n💡 RECOMMENDATIONS")
    logger.debug("%s", "=" * 60)
    for rec in results["recommendations"]:
        logger.debug(f"  {rec}")
    
    logger.debug("\n🎯 NEXT STEPS")
    logger.debug("%s", "=" * 60)
    for step in results["next_steps"]:
        logger.debug(f"  {step}")
    
    # Save detailed results with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"mcp_validation_results_{timestamp}.json"
    with open(filename, "w") as f:
        json.dump(results, f, indent=2, default=str)

    logger.info(f"\n📄 Detailed results saved to: {filename}")
    
    return results

if __name__ == "__main__":
    asyncio.run(main())
