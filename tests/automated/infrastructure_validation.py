#!/usr/bin/env python3
"""
Infrastructure Validation Test Suite
Post-Merge Validation for Project ID Audit & Deployment Fixes

Tests infrastructure improvements from merge commit: 774345abf3e265d28ac1f817f9398bacd1488691
"""

import requests
import json
import time
import os
from datetime import datetime
from typing import Dict, List, Any
from lib.logging_config import get_logger
logger = get_logger("vana.infrastructure_validation")


class InfrastructureValidator:
    def __init__(self):
        self.base_url = "https://vana-dev-960076421399.us-central1.run.app"
        self.results: List[Dict[str, Any]] = []
        self.start_time = datetime.now()
        
    def test_service_health(self) -> Dict[str, Any]:
        """TC-INF-001: Service Health Check"""
        logger.debug("🔍 Testing service health endpoint...")
        
        try:
            start_time = time.time()
            response = requests.get(f"{self.base_url}/health", timeout=10)
            response_time = time.time() - start_time
            
            expected = {"status": "healthy", "agent": "vana", "mcp_enabled": True}
            actual = response.json() if response.status_code == 200 else {}
            
            # Validate response structure and content
            status = "PASS" if (
                response.status_code == 200 and
                actual.get("status") == "healthy" and
                actual.get("agent") == "vana" and
                actual.get("mcp_enabled") is True
            ) else "FAIL"
            
            result = {
                "test_id": "TC-INF-001",
                "name": "Service Health Check",
                "status": status,
                "response_time": round(response_time, 3),
                "status_code": response.status_code,
                "expected": expected,
                "actual": actual,
                "timestamp": datetime.now().isoformat(),
                "details": {
                    "url": f"{self.base_url}/health",
                    "method": "GET",
                    "timeout": 10
                }
            }
            
            self.results.append(result)
            return result
            
        except requests.exceptions.Timeout:
            result = {
                "test_id": "TC-INF-001",
                "name": "Service Health Check",
                "status": "ERROR",
                "error": "Request timeout (10s)",
                "timestamp": datetime.now().isoformat()
            }
            self.results.append(result)
            return result
            
        except Exception as e:
            result = {
                "test_id": "TC-INF-001",
                "name": "Service Health Check",
                "status": "ERROR",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
            self.results.append(result)
            return result
            
    def test_service_info(self) -> Dict[str, Any]:
        """TC-INF-002: Service Info Endpoint"""
        logger.debug("🔍 Testing service info endpoint...")
        
        try:
            start_time = time.time()
            response = requests.get(f"{self.base_url}/info", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                info_data = response.json()
                
                # Check for correct project references
                info_str = json.dumps(info_data)
                has_correct_project = "960076421399" in info_str
                has_old_project = "960076421399" in info_str
                
                status = "PASS" if has_correct_project and not has_old_project else "FAIL"
                
                result = {
                    "test_id": "TC-INF-002",
                    "name": "Service Info Endpoint",
                    "status": status,
                    "response_time": round(response_time, 3),
                    "status_code": response.status_code,
                    "has_correct_project": has_correct_project,
                    "has_old_project": has_old_project,
                    "response_size": len(info_str),
                    "timestamp": datetime.now().isoformat()
                }
            else:
                result = {
                    "test_id": "TC-INF-002",
                    "name": "Service Info Endpoint",
                    "status": "FAIL",
                    "response_time": round(response_time, 3),
                    "status_code": response.status_code,
                    "error": f"HTTP {response.status_code}: {response.text[:200]}",
                    "timestamp": datetime.now().isoformat()
                }
                
            self.results.append(result)
            return result
            
        except Exception as e:
            result = {
                "test_id": "TC-INF-002",
                "name": "Service Info Endpoint",
                "status": "ERROR",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
            self.results.append(result)
            return result
            
    def test_agent_availability(self) -> Dict[str, Any]:
        """TC-INF-003: Agent Selection Endpoint"""
        logger.debug("🔍 Testing agent availability...")
        
        try:
            start_time = time.time()
            response = requests.get(f"{self.base_url}/agents", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                agents_data = response.json()
                agent_count = len(agents_data) if isinstance(agents_data, list) else 0
                
                # Expect 24 agents based on memory bank documentation
                expected_count = 24
                status = "PASS" if agent_count >= expected_count else "FAIL"
                
                result = {
                    "test_id": "TC-INF-003",
                    "name": "Agent Selection Endpoint",
                    "status": status,
                    "response_time": round(response_time, 3),
                    "status_code": response.status_code,
                    "agent_count": agent_count,
                    "expected_count": expected_count,
                    "timestamp": datetime.now().isoformat()
                }
            else:
                result = {
                    "test_id": "TC-INF-003",
                    "name": "Agent Selection Endpoint",
                    "status": "FAIL",
                    "response_time": round(response_time, 3),
                    "status_code": response.status_code,
                    "error": f"HTTP {response.status_code}",
                    "timestamp": datetime.now().isoformat()
                }
                
            self.results.append(result)
            return result
            
        except Exception as e:
            result = {
                "test_id": "TC-INF-003",
                "name": "Agent Selection Endpoint",
                "status": "ERROR",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
            self.results.append(result)
            return result
            
    def test_response_time_performance(self) -> Dict[str, Any]:
        """TC-INF-004: Response Time Performance"""
        logger.debug("🔍 Testing response time performance...")
        
        try:
            # Test multiple endpoints for performance
            endpoints = ["/health", "/info"]
            response_times = []
            
            for endpoint in endpoints:
                start_time = time.time()
                response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                response_time = time.time() - start_time
                response_times.append(response_time)
                
            avg_response_time = sum(response_times) / len(response_times)
            max_response_time = max(response_times)
            
            # Performance target: under 3 seconds average
            status = "PASS" if avg_response_time < 3.0 and max_response_time < 5.0 else "FAIL"
            
            result = {
                "test_id": "TC-INF-004",
                "name": "Response Time Performance",
                "status": status,
                "avg_response_time": round(avg_response_time, 3),
                "max_response_time": round(max_response_time, 3),
                "individual_times": [round(t, 3) for t in response_times],
                "performance_target": "< 3s average, < 5s max",
                "timestamp": datetime.now().isoformat()
            }
            
            self.results.append(result)
            return result
            
        except Exception as e:
            result = {
                "test_id": "TC-INF-004",
                "name": "Response Time Performance",
                "status": "ERROR",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
            self.results.append(result)
            return result
            
    def run_all_tests(self) -> List[Dict[str, Any]]:
        """Execute all infrastructure tests"""
        logger.info("🏗️ Starting Infrastructure Validation Tests...")
        logger.debug("%s", "=" * 50)
        
        tests = [
            self.test_service_health,
            self.test_service_info,
            self.test_agent_availability,
            self.test_response_time_performance
        ]
        
        for test in tests:
            result = test()
            status_emoji = "✅" if result["status"] == "PASS" else "❌" if result["status"] == "FAIL" else "⚠️"
            logger.info("%s", f"{status_emoji} {result['test_id']}: {result['name']} - {result['status']}")
            
            if result["status"] == "FAIL":
                logger.error("%s", f"   └─ Failure details: {result.get('error', 'See result data')}")
            elif result["status"] == "ERROR":
                logger.error("%s", f"   └─ Error: {result.get('error', 'Unknown error')}")
                
        # Calculate summary
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r["status"] == "PASS")
        
        logger.debug("%s", "\n" + "=" * 50)
        logger.debug(f"📊 Infrastructure Tests Summary:")
        logger.debug(f"   Total: {total_tests}")
        logger.debug(f"   Passed: {passed_tests}")
        logger.info(f"   Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        logger.debug("%s", "=" * 50)
        
        return self.results
        
    def save_results(self, filename: str = None) -> str:
        """Save test results to JSON file"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"infrastructure_validation_{timestamp}.json"
            
        # Ensure results directory exists
        os.makedirs("tests/results", exist_ok=True)
        filepath = os.path.join("tests/results", filename)
        
        # Add metadata
        results_data = {
            "test_suite": "Infrastructure Validation",
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
    validator = InfrastructureValidator()
    results = validator.run_all_tests()
    validator.save_results()
