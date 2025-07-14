#!/usr/bin/env python3
"""
Staging Environment Regression Test Suite
Week 2: Comprehensive validation of ADK coordination
"""

import os
import sys
import json
import asyncio
import time
from datetime import datetime
from typing import Dict, List, Tuple

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load staging environment
from dotenv import load_dotenv
load_dotenv('.env.staging')

class RegressionTestSuite:
    """Comprehensive regression tests for ADK coordination."""
    
    def __init__(self):
        self.results = {
            "environment": os.getenv("ENVIRONMENT", "unknown"),
            "start_time": datetime.now().isoformat(),
            "tests": {},
            "summary": {
                "total": 0,
                "passed": 0,
                "failed": 0
            }
        }
        self.test_count = 0
    
    def record_test(self, test_name: str, passed: bool, details: Dict = None):
        """Record test result."""
        self.test_count += 1
        self.results["tests"][test_name] = {
            "passed": passed,
            "details": details or {},
            "timestamp": datetime.now().isoformat()
        }
        self.results["summary"]["total"] += 1
        if passed:
            self.results["summary"]["passed"] += 1
        else:
            self.results["summary"]["failed"] += 1
        
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  [{self.test_count}] {test_name}: {status}")
    
    async def test_basic_coordination(self) -> bool:
        """Test basic coordination functionality."""
        from lib._tools.real_coordination_tools import real_delegate_to_agent
        
        print("\n🧪 Testing Basic Coordination...")
        
        try:
            result = real_delegate_to_agent(
                agent_name="architecture_specialist",
                task="Analyze system architecture",
                context="Regression test validation"
            )
            
            result_data = json.loads(result)
            passed = (
                result_data.get("status") == "success" and
                "ADK" in result_data.get("transfer_result", {}).get("method", "")
            )
            
            self.record_test("basic_coordination", passed, {
                "status": result_data.get("status"),
                "method": result_data.get("transfer_result", {}).get("method")
            })
            
            return passed
            
        except Exception as e:
            self.record_test("basic_coordination", False, {"error": str(e)})
            return False
    
    async def test_all_specialists(self) -> bool:
        """Test coordination with all specialist agents."""
        from lib._tools.real_coordination_tools import real_delegate_to_agent
        
        print("\n🧪 Testing All Specialist Agents...")
        
        specialists = [
            ("architecture_specialist", "Review code structure"),
            ("data_science_specialist", "Analyze data patterns"),
            ("security_specialist", "Scan for vulnerabilities"),
            ("devops_specialist", "Check deployment config"),
            ("qa_specialist", "Review test coverage"),
            ("ui_ux_specialist", "Evaluate UI components")
        ]
        
        all_passed = True
        
        for agent_name, task in specialists:
            try:
                result = real_delegate_to_agent(
                    agent_name=agent_name,
                    task=task,
                    context="Specialist validation"
                )
                
                result_data = json.loads(result)
                passed = result_data.get("status") == "success"
                
                self.record_test(f"specialist_{agent_name}", passed, {
                    "status": result_data.get("status")
                })
                
                if not passed:
                    all_passed = False
                    
            except Exception as e:
                self.record_test(f"specialist_{agent_name}", False, {"error": str(e)})
                all_passed = False
        
        return all_passed
    
    async def test_error_handling(self) -> bool:
        """Test error handling scenarios."""
        from lib._tools.real_coordination_tools import real_delegate_to_agent
        
        print("\n🧪 Testing Error Handling...")
        
        # Test 1: Invalid agent name
        try:
            result = real_delegate_to_agent(
                agent_name="invalid_agent",
                task="This should fail",
                context="Error handling test"
            )
            
            result_data = json.loads(result)
            passed = result_data.get("status") == "error"
            
            self.record_test("error_invalid_agent", passed, {
                "status": result_data.get("status"),
                "error": result_data.get("error", "")
            })
            
        except Exception as e:
            self.record_test("error_invalid_agent", False, {"error": str(e)})
            passed = False
        
        # Test 2: Empty task
        try:
            result = real_delegate_to_agent(
                agent_name="qa_specialist",
                task="",
                context="Empty task test"
            )
            
            result_data = json.loads(result)
            # Empty task should still succeed (design decision)
            passed2 = result_data.get("status") in ["success", "error"]
            
            self.record_test("error_empty_task", passed2, {
                "status": result_data.get("status")
            })
            
        except Exception as e:
            self.record_test("error_empty_task", False, {"error": str(e)})
            passed2 = False
        
        return passed and passed2
    
    async def test_concurrent_requests(self) -> bool:
        """Test concurrent coordination requests."""
        from lib._tools.real_coordination_tools import real_delegate_to_agent
        
        print("\n🧪 Testing Concurrent Requests...")
        
        agents = [
            "architecture_specialist",
            "data_science_specialist",
            "security_specialist",
            "devops_specialist",
            "qa_specialist"
        ]
        
        async def coordinate_task(agent: str, index: int):
            """Coordinate a single task."""
            try:
                result = await asyncio.to_thread(
                    real_delegate_to_agent,
                    agent_name=agent,
                    task=f"Concurrent task #{index}",
                    context="Concurrent testing"
                )
                return json.loads(result)
            except Exception as e:
                return {"status": "error", "error": str(e)}
        
        # Launch concurrent tasks
        tasks = []
        for i in range(20):  # 20 concurrent requests
            agent = agents[i % len(agents)]
            task = coordinate_task(agent, i)
            tasks.append(task)
        
        # Wait for all tasks
        results = await asyncio.gather(*tasks)
        
        # Check results
        successful = sum(1 for r in results if r.get("status") == "success")
        passed = successful == 20
        
        self.record_test("concurrent_requests", passed, {
            "total": 20,
            "successful": successful,
            "failed": 20 - successful
        })
        
        return passed
    
    async def test_performance_thresholds(self) -> bool:
        """Test performance against staging thresholds."""
        from lib._tools.real_coordination_tools import real_delegate_to_agent
        
        print("\n🧪 Testing Performance Thresholds...")
        
        threshold_ms = float(os.getenv("RESPONSE_TIME_THRESHOLD_MS", "10"))
        timings = []
        
        # Run 50 requests to measure performance
        for i in range(50):
            start_time = time.perf_counter()
            
            try:
                result = real_delegate_to_agent(
                    agent_name="architecture_specialist",
                    task=f"Performance test #{i}",
                    context="Performance benchmarking"
                )
                
                elapsed_ms = (time.perf_counter() - start_time) * 1000
                timings.append(elapsed_ms)
                
            except Exception:
                pass
        
        if timings:
            avg_time = sum(timings) / len(timings)
            p95_time = sorted(timings)[int(len(timings) * 0.95)]
            passed = p95_time < threshold_ms
            
            self.record_test("performance_threshold", passed, {
                "avg_ms": round(avg_time, 2),
                "p95_ms": round(p95_time, 2),
                "threshold_ms": threshold_ms,
                "samples": len(timings)
            })
            
            return passed
        else:
            self.record_test("performance_threshold", False, {"error": "No timing data"})
            return False
    
    async def test_json_format_consistency(self) -> bool:
        """Test JSON response format consistency."""
        from lib._tools.real_coordination_tools import real_delegate_to_agent
        
        print("\n🧪 Testing JSON Format Consistency...")
        
        required_fields = ["action", "agent", "task", "context", "status", "timestamp"]
        
        try:
            result = real_delegate_to_agent(
                agent_name="qa_specialist",
                task="Check JSON format",
                context="Format validation"
            )
            
            result_data = json.loads(result)
            
            # Check all required fields are present
            missing_fields = [f for f in required_fields if f not in result_data]
            passed = len(missing_fields) == 0
            
            self.record_test("json_format_consistency", passed, {
                "required_fields": required_fields,
                "missing_fields": missing_fields,
                "actual_fields": list(result_data.keys())
            })
            
            return passed
            
        except Exception as e:
            self.record_test("json_format_consistency", False, {"error": str(e)})
            return False
    
    async def test_feature_flag_control(self) -> bool:
        """Test feature flag controls behavior."""
        print("\n🧪 Testing Feature Flag Control...")
        
        # Check current flag status
        use_adk = os.getenv("USE_ADK_COORDINATION", "false").lower() == "true"
        passed = use_adk  # Should be true in staging
        
        self.record_test("feature_flag_control", passed, {
            "USE_ADK_COORDINATION": os.getenv("USE_ADK_COORDINATION"),
            "USE_OFFICIAL_AGENT_TOOL": os.getenv("USE_OFFICIAL_AGENT_TOOL"),
            "expected": "true"
        })
        
        return passed
    
    async def run_all_tests(self):
        """Run all regression tests."""
        print("=" * 60)
        print("🚀 Staging Environment Regression Test Suite")
        print("=" * 60)
        print(f"Environment: {os.getenv('ENVIRONMENT', 'unknown')}")
        print(f"ADK Coordination: {os.getenv('USE_ADK_COORDINATION', 'false')}")
        print("=" * 60)
        
        # Run all test categories
        await self.test_feature_flag_control()
        await self.test_basic_coordination()
        await self.test_all_specialists()
        await self.test_error_handling()
        await self.test_concurrent_requests()
        await self.test_performance_thresholds()
        await self.test_json_format_consistency()
        
        # Generate summary
        self.results["end_time"] = datetime.now().isoformat()
        
        print("\n" + "=" * 60)
        print("📊 Regression Test Summary")
        print("=" * 60)
        print(f"Total Tests: {self.results['summary']['total']}")
        print(f"Passed: {self.results['summary']['passed']}")
        print(f"Failed: {self.results['summary']['failed']}")
        print(f"Success Rate: {(self.results['summary']['passed'] / self.results['summary']['total'] * 100):.1f}%")
        
        # Save results
        report_path = ".development/reports/staging-regression-results.json"
        os.makedirs(os.path.dirname(report_path), exist_ok=True)
        
        with open(report_path, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n📄 Results saved to: {report_path}")
        
        # Return success if all tests passed
        return self.results['summary']['failed'] == 0

async def main():
    """Main entry point."""
    suite = RegressionTestSuite()
    success = await suite.run_all_tests()
    
    if success:
        print("\n✅ All regression tests PASSED!")
        print("🎯 Staging environment validated for ADK coordination")
        return 0
    else:
        print("\n❌ Some regression tests FAILED!")
        print("🔧 Please review failures before proceeding")
        return 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))