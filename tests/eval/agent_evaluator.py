#!/usr/bin/env python3
"""
VANA System Agent Evaluator
ADK-compliant evaluation framework for comprehensive agent testing

Based on Google ADK evaluation standards with custom VANA validation
Implements systematic evaluation of agent performance, tool usage, and response quality
"""

import asyncio
import json
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path
from playwright.async_api import async_playwright

# Import configuration
from tests.eval.config import (
    get_base_url, get_performance_targets, get_ui_selectors,
    get_browser_config, get_paths, TOOL_PATTERNS
)

@dataclass
class EvaluationResult:
    """Data class for evaluation results"""
    eval_id: str
    agent_name: str
    test_case: str
    success: bool
    response_time: float
    tool_trajectory_score: float
    response_quality_score: float
    expected_tools: List[str]
    actual_tools: List[str]
    error_message: Optional[str] = None
    raw_response: Optional[str] = None

@dataclass
class AgentPerformanceMetrics:
    """Data class for agent performance metrics"""
    agent_name: str
    total_tests: int
    passed_tests: int
    failed_tests: int
    average_response_time: float
    tool_accuracy_score: float
    response_quality_score: float
    success_rate: float

class VANASystemEvaluator:
    """Comprehensive VANA system evaluator using ADK evaluation patterns"""

    def __init__(self, environment: str = "dev"):
        # Load configuration
        self.base_url = get_base_url(environment)
        paths = get_paths()
        self.evalsets_dir = Path(paths["evalsets_dir"])
        self.results_dir = Path(paths["results_dir"])
        self.results_dir.mkdir(exist_ok=True)

        # Load performance targets and UI selectors
        self.performance_targets = get_performance_targets()
        self.ui_selectors = get_ui_selectors()
        self.browser_config = get_browser_config()
        
    async def evaluate_all_agents(self) -> Dict[str, Any]:
        """Evaluate all agents using available evalsets"""
        print("🧪 Starting Comprehensive Agent Evaluation")
        print("=" * 60)
        
        evaluation_results = {
            "evaluation_timestamp": datetime.now().isoformat(),
            "evaluation_summary": {},
            "agent_results": {},
            "overall_metrics": {},
            "recommendations": []
        }
        
        # Discover available evalsets
        evalset_files = list(self.evalsets_dir.glob("*.json"))
        
        if not evalset_files:
            print("❌ No evalsets found in tests/eval/evalsets/")
            return evaluation_results
            
        print(f"📋 Found {len(evalset_files)} evalsets to evaluate")
        
        # Evaluate each evalset
        for evalset_file in evalset_files:
            agent_name = evalset_file.stem.replace("_evalset", "")
            print(f"\n🔍 Evaluating: {agent_name}")
            
            try:
                agent_results = await self.evaluate_agent_from_evalset(evalset_file)
                evaluation_results["agent_results"][agent_name] = agent_results
                
                # Calculate performance metrics
                metrics = self.calculate_performance_metrics(agent_name, agent_results)
                evaluation_results["evaluation_summary"][agent_name] = metrics
                
            except Exception as e:
                print(f"❌ Error evaluating {agent_name}: {e}")
                evaluation_results["agent_results"][agent_name] = {
                    "error": str(e),
                    "status": "failed"
                }
        
        # Calculate overall metrics
        evaluation_results["overall_metrics"] = self.calculate_overall_metrics(
            evaluation_results["evaluation_summary"]
        )
        
        # Generate recommendations
        evaluation_results["recommendations"] = self.generate_recommendations(
            evaluation_results["evaluation_summary"]
        )
        
        # Save results
        self.save_evaluation_results(evaluation_results)
        
        # Print summary
        self.print_evaluation_summary(evaluation_results)
        
        return evaluation_results
        
    async def evaluate_agent_from_evalset(self, evalset_file: Path) -> List[EvaluationResult]:
        """Evaluate an agent using its evalset"""
        with open(evalset_file, 'r') as f:
            evalset = json.load(f)
            
        agent_name = evalset_file.stem.replace("_evalset", "")
        eval_cases = evalset.get("eval_cases", [])
        
        results = []
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=self.browser_config["headless"])
            page = await browser.new_page()

            try:
                # Navigate to service
                await page.goto(self.base_url, timeout=self.browser_config["timeout"])
                await page.wait_for_load_state("networkidle")

                # Select VANA agent (main orchestrator for all tests)
                await page.click(self.ui_selectors["agent_select"])
                await page.click(self.ui_selectors["vana_option"])
                
                # Evaluate each test case
                for eval_case in eval_cases:
                    result = await self.evaluate_single_case(page, agent_name, eval_case)
                    results.append(result)
                    
                    # Wait between tests to avoid rate limiting
                    await asyncio.sleep(2)
                    
            except Exception as e:
                print(f"❌ Browser evaluation failed for {agent_name}: {e}")
                
            await browser.close()
            
        return results
        
    async def evaluate_single_case(self, page, agent_name: str, eval_case: Dict) -> EvaluationResult:
        """Evaluate a single test case"""
        eval_id = eval_case["eval_id"]
        conversation = eval_case["conversation"][0]  # First conversation turn
        user_input = conversation["user_content"]["parts"][0]["text"]
        expected_response = conversation["final_response"]["parts"][0]["text"]
        expected_tools = [tool["name"] for tool in conversation["intermediate_data"]["tool_uses"]]
        
        print(f"  🧪 Testing {eval_id}: {user_input[:50]}...")
        
        try:
            start_time = time.time()
            
            # Clear any existing content
            await page.fill(self.ui_selectors["textarea"], "")

            # Submit query
            await page.fill(self.ui_selectors["textarea"], user_input)
            await page.keyboard.press("Enter")

            # Wait for response with tool indicators
            await page.wait_for_selector(self.ui_selectors["response"], timeout=self.browser_config["timeout"])
            response_time = time.time() - start_time
            
            # Get response text
            response_text = await page.text_content(self.ui_selectors["response"])
            if not response_text:
                response_text = ""
            
            # Extract tool usage from response (look for tool indicators)
            actual_tools = self.extract_tools_from_response(response_text)
            
            # Evaluate tool trajectory
            tool_trajectory_score = self.evaluate_tool_trajectory(expected_tools, actual_tools)
            
            # Evaluate response quality
            response_quality_score = self.evaluate_response_quality(expected_response, response_text)
            
            # Determine success
            success = (
                response_time <= self.performance_targets["response_time"] and
                tool_trajectory_score >= self.performance_targets["tool_accuracy"] and
                response_quality_score >= self.performance_targets["response_quality"]
            )
            
            result = EvaluationResult(
                eval_id=eval_id,
                agent_name=agent_name,
                test_case=user_input,
                success=success,
                response_time=round(response_time, 3),
                tool_trajectory_score=tool_trajectory_score,
                response_quality_score=response_quality_score,
                expected_tools=expected_tools,
                actual_tools=actual_tools,
                raw_response=response_text[:500]  # Truncate for storage
            )
            
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"    {status} ({response_time:.2f}s, tools: {tool_trajectory_score:.2f}, quality: {response_quality_score:.2f})")
            
            return result
            
        except Exception as e:
            print(f"    ❌ ERROR: {str(e)}")
            return EvaluationResult(
                eval_id=eval_id,
                agent_name=agent_name,
                test_case=user_input,
                success=False,
                response_time=0.0,
                tool_trajectory_score=0.0,
                response_quality_score=0.0,
                expected_tools=expected_tools,
                actual_tools=[],
                error_message=str(e)
            )
            
    def extract_tools_from_response(self, response_text: str) -> List[str]:
        """Extract tool usage from response text"""
        if not response_text:
            return []

        tools = []
        response_lower = response_text.lower()

        # Use configured tool patterns
        for tool_name, patterns in TOOL_PATTERNS.items():
            for pattern in patterns:
                if pattern in response_lower:
                    if tool_name not in tools:
                        tools.append(tool_name)
                    break

        return tools
        
    def evaluate_tool_trajectory(self, expected_tools: List[str], actual_tools: List[str]) -> float:
        """Evaluate tool usage trajectory accuracy"""
        if not expected_tools:
            return 1.0 if not actual_tools else 0.8  # No tools expected
            
        if not actual_tools:
            return 0.0  # Tools expected but none used
            
        # Calculate overlap score
        expected_set = set(expected_tools)
        actual_set = set(actual_tools)
        
        intersection = expected_set.intersection(actual_set)
        union = expected_set.union(actual_set)
        
        if not union:
            return 1.0
            
        return len(intersection) / len(union)
        
    def evaluate_response_quality(self, expected_response: str, actual_response: str) -> float:
        """Evaluate response quality and completeness"""
        if not actual_response or len(actual_response) < 50:
            return 0.0
            
        # Check for error indicators
        error_indicators = ["error", "failed", "not found", "unavailable", "timeout"]
        if any(error in actual_response.lower() for error in error_indicators):
            return 0.3
            
        # Check for meaningful content
        if len(actual_response) > 200:
            return 0.9
        elif len(actual_response) > 100:
            return 0.7
        else:
            return 0.5
            
    def calculate_performance_metrics(self, agent_name: str, results: List[EvaluationResult]) -> AgentPerformanceMetrics:
        """Calculate performance metrics for an agent"""
        if not results:
            return AgentPerformanceMetrics(
                agent_name=agent_name,
                total_tests=0,
                passed_tests=0,
                failed_tests=0,
                average_response_time=0.0,
                tool_accuracy_score=0.0,
                response_quality_score=0.0,
                success_rate=0.0
            )
            
        total_tests = len(results)
        passed_tests = sum(1 for r in results if r.success)
        failed_tests = total_tests - passed_tests
        
        avg_response_time = sum(r.response_time for r in results) / total_tests
        avg_tool_accuracy = sum(r.tool_trajectory_score for r in results) / total_tests
        avg_response_quality = sum(r.response_quality_score for r in results) / total_tests
        success_rate = passed_tests / total_tests
        
        return AgentPerformanceMetrics(
            agent_name=agent_name,
            total_tests=total_tests,
            passed_tests=passed_tests,
            failed_tests=failed_tests,
            average_response_time=round(avg_response_time, 3),
            tool_accuracy_score=round(avg_tool_accuracy, 3),
            response_quality_score=round(avg_response_quality, 3),
            success_rate=round(success_rate, 3)
        )

    def calculate_overall_metrics(self, agent_summaries: Dict[str, AgentPerformanceMetrics]) -> Dict[str, Any]:
        """Calculate overall system metrics"""
        if not agent_summaries:
            return {}

        total_agents = len(agent_summaries)
        total_tests = sum(metrics.total_tests for metrics in agent_summaries.values())
        total_passed = sum(metrics.passed_tests for metrics in agent_summaries.values())

        avg_response_time = sum(metrics.average_response_time for metrics in agent_summaries.values()) / total_agents
        avg_tool_accuracy = sum(metrics.tool_accuracy_score for metrics in agent_summaries.values()) / total_agents
        avg_response_quality = sum(metrics.response_quality_score for metrics in agent_summaries.values()) / total_agents
        overall_success_rate = total_passed / total_tests if total_tests > 0 else 0.0

        return {
            "total_agents_tested": total_agents,
            "total_test_cases": total_tests,
            "total_passed": total_passed,
            "total_failed": total_tests - total_passed,
            "overall_success_rate": round(overall_success_rate, 3),
            "average_response_time": round(avg_response_time, 3),
            "average_tool_accuracy": round(avg_tool_accuracy, 3),
            "average_response_quality": round(avg_response_quality, 3),
            "performance_grade": self.calculate_performance_grade(overall_success_rate, avg_response_time, avg_tool_accuracy)
        }

    def calculate_performance_grade(self, success_rate: float, response_time: float, tool_accuracy: float) -> str:
        """Calculate overall performance grade"""
        if success_rate >= 0.95 and response_time <= 3.0 and tool_accuracy >= 0.9:
            return "A+ (Excellent)"
        elif success_rate >= 0.90 and response_time <= 4.0 and tool_accuracy >= 0.8:
            return "A (Very Good)"
        elif success_rate >= 0.80 and response_time <= 5.0 and tool_accuracy >= 0.7:
            return "B (Good)"
        elif success_rate >= 0.70 and response_time <= 7.0 and tool_accuracy >= 0.6:
            return "C (Acceptable)"
        else:
            return "D (Needs Improvement)"

    def generate_recommendations(self, agent_summaries: Dict[str, AgentPerformanceMetrics]) -> List[str]:
        """Generate improvement recommendations based on evaluation results"""
        recommendations = []

        for agent_name, metrics in agent_summaries.items():
            if metrics.success_rate < self.performance_targets["success_rate"]:
                recommendations.append(
                    f"🔧 {agent_name}: Success rate ({metrics.success_rate:.1%}) below target "
                    f"({self.performance_targets['success_rate']:.1%}) - Review test failures"
                )

            if metrics.average_response_time > self.performance_targets["response_time"]:
                recommendations.append(
                    f"⚡ {agent_name}: Response time ({metrics.average_response_time:.2f}s) exceeds target "
                    f"({self.performance_targets['response_time']:.1f}s) - Optimize performance"
                )

            if metrics.tool_accuracy_score < self.performance_targets["tool_accuracy"]:
                recommendations.append(
                    f"🛠️ {agent_name}: Tool accuracy ({metrics.tool_accuracy_score:.1%}) below target "
                    f"({self.performance_targets['tool_accuracy']:.1%}) - Review tool usage patterns"
                )

            if metrics.response_quality_score < self.performance_targets["response_quality"]:
                recommendations.append(
                    f"📝 {agent_name}: Response quality ({metrics.response_quality_score:.1%}) below target "
                    f"({self.performance_targets['response_quality']:.1%}) - Improve response content"
                )

        if not recommendations:
            recommendations.append("✅ All agents meeting performance targets - System performing excellently!")

        return recommendations

    def save_evaluation_results(self, results: Dict[str, Any]):
        """Save evaluation results to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"agent_evaluation_results_{timestamp}.json"
        filepath = self.results_dir / filename

        with open(filepath, 'w') as f:
            json.dump(results, f, indent=2, default=str)

        print(f"💾 Evaluation results saved: {filepath}")

    def print_evaluation_summary(self, results: Dict[str, Any]):
        """Print comprehensive evaluation summary"""
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE AGENT EVALUATION SUMMARY")
        print("=" * 80)

        overall_metrics = results.get("overall_metrics", {})
        agent_summaries = results.get("evaluation_summary", {})

        # Overall metrics
        print(f"\n🎯 OVERALL SYSTEM PERFORMANCE:")
        print(f"   Agents Tested: {overall_metrics.get('total_agents_tested', 0)}")
        print(f"   Test Cases: {overall_metrics.get('total_test_cases', 0)}")
        print(f"   Success Rate: {overall_metrics.get('overall_success_rate', 0):.1%}")
        print(f"   Average Response Time: {overall_metrics.get('average_response_time', 0):.2f}s")
        print(f"   Tool Accuracy: {overall_metrics.get('average_tool_accuracy', 0):.1%}")
        print(f"   Response Quality: {overall_metrics.get('average_response_quality', 0):.1%}")
        print(f"   Performance Grade: {overall_metrics.get('performance_grade', 'N/A')}")

        # Individual agent results
        print(f"\n📋 INDIVIDUAL AGENT PERFORMANCE:")
        for agent_name, metrics in agent_summaries.items():
            status = "✅ PASS" if metrics.success_rate >= 0.8 else "❌ FAIL"
            print(f"   {status} {agent_name}:")
            print(f"      Tests: {metrics.passed_tests}/{metrics.total_tests} ({metrics.success_rate:.1%})")
            print(f"      Response Time: {metrics.average_response_time:.2f}s")
            print(f"      Tool Accuracy: {metrics.tool_accuracy_score:.1%}")
            print(f"      Quality Score: {metrics.response_quality_score:.1%}")

        # Recommendations
        recommendations = results.get("recommendations", [])
        print(f"\n💡 RECOMMENDATIONS:")
        for rec in recommendations:
            print(f"   {rec}")

        print("=" * 80)

if __name__ == "__main__":
    async def main():
        evaluator = VANASystemEvaluator()
        results = await evaluator.evaluate_all_agents()

    asyncio.run(main())
