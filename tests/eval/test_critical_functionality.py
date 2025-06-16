#!/usr/bin/env python3
"""
ADK Evaluation Test for Critical VANA Functionality
Tests the core functionality issues identified in health audit using ADK evaluation patterns

Based on Google ADK evaluation framework:
https://google.github.io/adk-docs/evaluate/
https://github.com/google/adk-python/tree/main/tests
"""

import asyncio
import json
import os
import pytest
import httpx
import time
from pathlib import Path
from typing import Dict, Any, List
from dataclasses import dataclass

# Project imports
import sys
sys.path.append(str(Path(__file__).parent.parent.parent))
from lib.logging_config import get_logger

logger = get_logger("vana.eval.critical_functionality")

@dataclass
class CriticalTestResult:
    """Result of critical functionality test"""
    test_id: str
    test_name: str
    passed: bool
    response_time: float
    error_message: str = ""
    tool_used: str = ""
    response_quality: float = 0.0
    expected_behavior: str = ""
    actual_behavior: str = ""

class CriticalFunctionalityEvaluator:
    """ADK-compliant evaluator for critical VANA functionality"""
    
    def __init__(self, environment: str = "dev"):
        self.environment = environment
        self.base_url = self._get_base_url(environment)
        self.results: List[CriticalTestResult] = []
        
    def _get_base_url(self, environment: str) -> str:
        """Get base URL for environment"""
        if environment == "dev":
            return "https://vana-dev-960076421399.us-central1.run.app"
        elif environment == "prod":
            return "https://vana-prod-960076421399.us-central1.run.app"
        else:
            raise ValueError(f"Unknown environment: {environment}")
    
    async def evaluate_web_search_functionality(self) -> CriticalTestResult:
        """Test web search functionality - CRITICAL issue identified"""
        test_id = "critical_001"
        test_name = "Web Search Functionality"

        logger.info(f"🧪 Testing {test_name}")

        try:
            # Use direct HTTP request to ADK interface
            async with httpx.AsyncClient(timeout=30.0) as client:
                start_time = time.time()

                # Send request to ADK interface
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "agent": "vana",
                        "message": "Use web_search tool to search for 'Chicago weather June'"
                    }
                )

                end_time = time.time()
                response_time = end_time - start_time

                if response.status_code != 200:
                    raise Exception(f"HTTP {response.status_code}: {response.text}")

                # Analyze response
                response_data = response.json()
                response_text = response_data.get("response", "").lower()

                # Check for success indicators
                success_indicators = [
                    "weather" in response_text,
                    "chicago" in response_text,
                    "temperature" in response_text or "°f" in response_text or "°c" in response_text,
                    "brave api key not configured" not in response_text,
                    "error" not in response_text
                ]

                passed = sum(success_indicators) >= 3  # At least 3 success indicators

                # Calculate response quality
                response_quality = sum(success_indicators) / len(success_indicators)

                return CriticalTestResult(
                    test_id=test_id,
                    test_name=test_name,
                    passed=passed,
                    response_time=response_time,
                    tool_used="web_search",
                    response_quality=response_quality,
                    expected_behavior="Return current weather information for Chicago",
                    actual_behavior=response_text[:200] + "..." if len(response_text) > 200 else response_text,
                    error_message="" if passed else "Web search failed or returned error"
                )

        except Exception as e:
            logger.error(f"❌ {test_name} failed with exception: {e}")
            return CriticalTestResult(
                test_id=test_id,
                test_name=test_name,
                passed=False,
                response_time=0.0,
                error_message=str(e),
                expected_behavior="Return current weather information for Chicago",
                actual_behavior="Exception occurred"
            )
    
    async def evaluate_knowledge_search_functionality(self) -> CriticalTestResult:
        """Test knowledge search functionality - CRITICAL issue identified"""
        test_id = "critical_002"
        test_name = "Knowledge Search Functionality"
        
        logger.info(f"🧪 Testing {test_name}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                start_time = time.time()

                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "agent": "vana",
                        "message": "Use search_knowledge tool to search for 'VANA capabilities'"
                    }
                )

                end_time = time.time()
                response_time = end_time - start_time

                if response.status_code != 200:
                    raise Exception(f"HTTP {response.status_code}: {response.text}")

                response_data = response.json()
                response_text = response_data.get("response", "").lower()
            
            # Check for quality indicators (not fallback responses)
            quality_indicators = [
                "i don't have specific information" not in response_text,
                "fallback" not in response_text,
                "vana" in response_text,
                "agent" in response_text or "capabilities" in response_text,
                len(response_text) > 100  # Substantial response
            ]
            
            passed = sum(quality_indicators) >= 4  # High quality response
            response_quality = sum(quality_indicators) / len(quality_indicators)
            
            return CriticalTestResult(
                test_id=test_id,
                test_name=test_name,
                passed=passed,
                response_time=response_time,
                tool_used="search_knowledge",
                response_quality=response_quality,
                expected_behavior="Return detailed information about VANA capabilities",
                actual_behavior=response_text[:200] + "..." if len(response_text) > 200 else response_text,
                error_message="" if passed else "Knowledge search returned fallback or poor quality response"
            )
            
        except Exception as e:
            logger.error(f"❌ {test_name} failed with exception: {e}")
            return CriticalTestResult(
                test_id=test_id,
                test_name=test_name,
                passed=False,
                response_time=0.0,
                error_message=str(e),
                expected_behavior="Return detailed information about VANA capabilities",
                actual_behavior="Exception occurred"
            )
    
    async def evaluate_trip_planning_scenario(self) -> CriticalTestResult:
        """Test the original failing scenario - trip planning"""
        test_id = "critical_003"
        test_name = "Trip Planning Scenario (Original Failure)"
        
        logger.info(f"🧪 Testing {test_name}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                start_time = time.time()

                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "agent": "vana",
                        "message": "I'd like to plan a trip to Chicago in June"
                    }
                )

                end_time = time.time()
                response_time = end_time - start_time

                if response.status_code != 200:
                    raise Exception(f"HTTP {response.status_code}: {response.text}")

                response_data = response.json()
                response_text = response_data.get("response", "").lower()
            
            # Check for successful trip planning indicators
            success_indicators = [
                "chicago" in response_text,
                "june" in response_text,
                ("weather" in response_text or "temperature" in response_text),
                ("attractions" in response_text or "activities" in response_text or "places" in response_text),
                "i am having trouble" not in response_text,
                "i don't have specific information" not in response_text,
                "fallback" not in response_text,
                len(response_text) > 200  # Substantial helpful response
            ]
            
            passed = sum(success_indicators) >= 5  # Good trip planning response
            response_quality = sum(success_indicators) / len(success_indicators)
            
            return CriticalTestResult(
                test_id=test_id,
                test_name=test_name,
                passed=passed,
                response_time=response_time,
                tool_used="multiple (web_search, search_knowledge)",
                response_quality=response_quality,
                expected_behavior="Provide helpful trip planning information for Chicago in June",
                actual_behavior=response_text[:300] + "..." if len(response_text) > 300 else response_text,
                error_message="" if passed else "Trip planning failed to provide quality information"
            )
            
        except Exception as e:
            logger.error(f"❌ {test_name} failed with exception: {e}")
            return CriticalTestResult(
                test_id=test_id,
                test_name=test_name,
                passed=False,
                response_time=0.0,
                error_message=str(e),
                expected_behavior="Provide helpful trip planning information for Chicago in June",
                actual_behavior="Exception occurred"
            )
    
    async def evaluate_environment_configuration(self) -> CriticalTestResult:
        """Test environment configuration status"""
        test_id = "critical_004"
        test_name = "Environment Configuration Status"
        
        logger.info(f"🧪 Testing {test_name}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                start_time = time.time()

                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "agent": "vana",
                        "message": "Use get_health_status tool to check system configuration"
                    }
                )

                end_time = time.time()
                response_time = end_time - start_time

                if response.status_code != 200:
                    raise Exception(f"HTTP {response.status_code}: {response.text}")

                response_data = response.json()
                response_text = response_data.get("response", "").lower()
            
            # Check for proper configuration
            config_indicators = [
                "brave_api_key" not in response_text or "not configured" not in response_text,
                "region" not in response_text or "not set" not in response_text,
                "rag_corpus" not in response_text or "not set" not in response_text,
                "operational" in response_text or "healthy" in response_text,
                "error" not in response_text
            ]
            
            passed = sum(config_indicators) >= 4  # Good configuration
            response_quality = sum(config_indicators) / len(config_indicators)
            
            return CriticalTestResult(
                test_id=test_id,
                test_name=test_name,
                passed=passed,
                response_time=response_time,
                tool_used="get_health_status",
                response_quality=response_quality,
                expected_behavior="Show healthy system configuration with all required environment variables",
                actual_behavior=response_text[:200] + "..." if len(response_text) > 200 else response_text,
                error_message="" if passed else "Environment configuration issues detected"
            )
            
        except Exception as e:
            logger.error(f"❌ {test_name} failed with exception: {e}")
            return CriticalTestResult(
                test_id=test_id,
                test_name=test_name,
                passed=False,
                response_time=0.0,
                error_message=str(e),
                expected_behavior="Show healthy system configuration",
                actual_behavior="Exception occurred"
            )
    
    async def run_all_critical_tests(self) -> Dict[str, Any]:
        """Run all critical functionality tests"""
        logger.info("🚀 Starting Critical Functionality Evaluation")
        logger.info("=" * 60)
        
        # Run all tests
        tests = [
            self.evaluate_web_search_functionality(),
            self.evaluate_knowledge_search_functionality(),
            self.evaluate_trip_planning_scenario(),
            self.evaluate_environment_configuration()
        ]
        
        results = await asyncio.gather(*tests)
        self.results = results
        
        # Calculate overall metrics
        total_tests = len(results)
        passed_tests = sum(1 for r in results if r.passed)
        avg_response_time = sum(r.response_time for r in results) / total_tests
        avg_quality = sum(r.response_quality for r in results) / total_tests
        
        # Generate report
        report = {
            "evaluation_summary": {
                "total_tests": total_tests,
                "passed_tests": passed_tests,
                "failed_tests": total_tests - passed_tests,
                "success_rate": passed_tests / total_tests,
                "avg_response_time": avg_response_time,
                "avg_quality_score": avg_quality,
                "environment": self.environment,
                "timestamp": asyncio.get_event_loop().time()
            },
            "test_results": [
                {
                    "test_id": r.test_id,
                    "test_name": r.test_name,
                    "passed": r.passed,
                    "response_time": r.response_time,
                    "response_quality": r.response_quality,
                    "tool_used": r.tool_used,
                    "expected_behavior": r.expected_behavior,
                    "actual_behavior": r.actual_behavior,
                    "error_message": r.error_message
                }
                for r in results
            ]
        }
        
        # Log summary
        logger.info(f"✅ Evaluation Complete: {passed_tests}/{total_tests} tests passed")
        logger.info(f"📊 Success Rate: {passed_tests/total_tests:.1%}")
        logger.info(f"⏱️  Avg Response Time: {avg_response_time:.2f}s")
        logger.info(f"🎯 Avg Quality Score: {avg_quality:.1%}")
        
        return report

# Pytest integration
@pytest.mark.asyncio
@pytest.mark.integration
async def test_critical_web_search():
    """Test web search functionality"""
    evaluator = CriticalFunctionalityEvaluator()
    result = await evaluator.evaluate_web_search_functionality()
    assert result.passed, f"Web search test failed: {result.error_message}"

@pytest.mark.asyncio
@pytest.mark.integration
async def test_critical_knowledge_search():
    """Test knowledge search functionality"""
    evaluator = CriticalFunctionalityEvaluator()
    result = await evaluator.evaluate_knowledge_search_functionality()
    assert result.passed, f"Knowledge search test failed: {result.error_message}"

@pytest.mark.asyncio
@pytest.mark.integration
async def test_critical_trip_planning():
    """Test trip planning scenario"""
    evaluator = CriticalFunctionalityEvaluator()
    result = await evaluator.evaluate_trip_planning_scenario()
    assert result.passed, f"Trip planning test failed: {result.error_message}"

@pytest.mark.asyncio
@pytest.mark.integration
async def test_environment_configuration():
    """Test environment configuration"""
    evaluator = CriticalFunctionalityEvaluator()
    result = await evaluator.evaluate_environment_configuration()
    assert result.passed, f"Environment configuration test failed: {result.error_message}"

if __name__ == "__main__":
    async def main():
        evaluator = CriticalFunctionalityEvaluator()
        report = await evaluator.run_all_critical_tests()
        
        # Save report
        results_dir = Path("tests/results")
        results_dir.mkdir(exist_ok=True)
        
        with open(results_dir / "critical_functionality_report.json", "w") as f:
            json.dump(report, f, indent=2)
        
        print(json.dumps(report, indent=2))
    
    asyncio.run(main())
