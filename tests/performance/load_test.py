#!/usr/bin/env python3
"""
Load Testing for VANA Production Deployment

This script performs load testing against the production VANA deployment
to validate performance and reliability under various load conditions.
"""

import asyncio
import json
import os
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List

import requests


class VanaLoadTester:
    """Load testing suite for VANA production deployment"""

    def __init__(self, base_url: str = None):
        self.base_url = base_url or os.getenv("VANA_PROD_URL", "https://vana-dev-qqugqgsbcq-uc.a.run.app")
        self.results = {"test_start": time.time(), "base_url": self.base_url, "tests": {}, "summary": {}}

    def run_load_test(self) -> Dict:
        """Run comprehensive load test suite"""
        print(f"🚀 Starting load test against: {self.base_url}")

        # Test 1: Health endpoint responsiveness
        self._test_health_endpoint()

        # Test 2: Info endpoint performance
        self._test_info_endpoint()

        # Test 3: Concurrent request handling
        self._test_concurrent_requests()

        # Test 4: Sustained load test
        self._test_sustained_load()

        # Generate summary
        self._generate_summary()

        return self.results

    def _test_health_endpoint(self):
        """Test health endpoint performance"""
        print("📊 Testing health endpoint...")

        test_results = []
        for i in range(10):
            start_time = time.time()
            try:
                response = requests.get(f"{self.base_url}/health", timeout=30)
                end_time = time.time()

                test_results.append(
                    {
                        "request_id": i,
                        "status_code": response.status_code,
                        "response_time": end_time - start_time,
                        "success": response.status_code == 200,
                    }
                )
            except Exception as e:
                test_results.append({"request_id": i, "error": str(e), "success": False})

        success_rate = sum(1 for r in test_results if r.get("success", False)) / len(test_results)
        avg_response_time = sum(r.get("response_time", 0) for r in test_results if r.get("success", False)) / max(
            1, sum(1 for r in test_results if r.get("success", False))
        )

        self.results["tests"]["health_endpoint"] = {
            "test_type": "Health Endpoint Performance",
            "requests": len(test_results),
            "success_rate": success_rate,
            "avg_response_time": avg_response_time,
            "details": test_results,
        }

        print(f"✅ Health endpoint: {success_rate:.1%} success rate, {avg_response_time:.3f}s avg response time")

    def _test_info_endpoint(self):
        """Test info endpoint performance"""
        print("📊 Testing info endpoint...")

        test_results = []
        for i in range(5):
            start_time = time.time()
            try:
                response = requests.get(f"{self.base_url}/info", timeout=30)
                end_time = time.time()

                test_results.append(
                    {
                        "request_id": i,
                        "status_code": response.status_code,
                        "response_time": end_time - start_time,
                        "success": response.status_code == 200,
                        "response_size": len(response.text),
                    }
                )
            except Exception as e:
                test_results.append({"request_id": i, "error": str(e), "success": False})

        success_rate = sum(1 for r in test_results if r.get("success", False)) / len(test_results)
        avg_response_time = sum(r.get("response_time", 0) for r in test_results if r.get("success", False)) / max(
            1, sum(1 for r in test_results if r.get("success", False))
        )

        self.results["tests"]["info_endpoint"] = {
            "test_type": "Info Endpoint Performance",
            "requests": len(test_results),
            "success_rate": success_rate,
            "avg_response_time": avg_response_time,
            "details": test_results,
        }

        print(f"✅ Info endpoint: {success_rate:.1%} success rate, {avg_response_time:.3f}s avg response time")

    def _test_concurrent_requests(self):
        """Test concurrent request handling"""
        print("📊 Testing concurrent request handling...")

        def make_request(request_id):
            start_time = time.time()
            try:
                response = requests.get(f"{self.base_url}/health", timeout=30)
                end_time = time.time()
                return {
                    "request_id": request_id,
                    "status_code": response.status_code,
                    "response_time": end_time - start_time,
                    "success": response.status_code == 200,
                }
            except Exception as e:
                return {"request_id": request_id, "error": str(e), "success": False}

        # Test with 5 concurrent requests
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request, i) for i in range(5)]
            test_results = [future.result() for future in futures]

        success_rate = sum(1 for r in test_results if r.get("success", False)) / len(test_results)
        avg_response_time = sum(r.get("response_time", 0) for r in test_results if r.get("success", False)) / max(
            1, sum(1 for r in test_results if r.get("success", False))
        )

        self.results["tests"]["concurrent_requests"] = {
            "test_type": "Concurrent Request Handling",
            "concurrent_requests": 5,
            "success_rate": success_rate,
            "avg_response_time": avg_response_time,
            "details": test_results,
        }

        print(f"✅ Concurrent requests: {success_rate:.1%} success rate, {avg_response_time:.3f}s avg response time")

    def _test_sustained_load(self):
        """Test sustained load over time"""
        print("📊 Testing sustained load...")

        test_results = []
        duration = 30  # 30 seconds
        start_time = time.time()

        while time.time() - start_time < duration:
            request_start = time.time()
            try:
                response = requests.get(f"{self.base_url}/health", timeout=10)
                request_end = time.time()

                test_results.append(
                    {
                        "timestamp": request_start,
                        "status_code": response.status_code,
                        "response_time": request_end - request_start,
                        "success": response.status_code == 200,
                    }
                )
            except Exception as e:
                test_results.append({"timestamp": request_start, "error": str(e), "success": False})

            # Small delay between requests
            time.sleep(0.5)

        success_rate = sum(1 for r in test_results if r.get("success", False)) / len(test_results)
        avg_response_time = sum(r.get("response_time", 0) for r in test_results if r.get("success", False)) / max(
            1, sum(1 for r in test_results if r.get("success", False))
        )

        self.results["tests"]["sustained_load"] = {
            "test_type": "Sustained Load Test",
            "duration_seconds": duration,
            "total_requests": len(test_results),
            "success_rate": success_rate,
            "avg_response_time": avg_response_time,
            "requests_per_second": len(test_results) / duration,
        }

        print(f"✅ Sustained load: {success_rate:.1%} success rate, {len(test_results)} requests in {duration}s")

    def _generate_summary(self):
        """Generate test summary"""
        total_requests = sum(
            test.get("requests", test.get("total_requests", 0)) for test in self.results["tests"].values()
        )
        overall_success_rate = sum(
            test.get("success_rate", 0) * test.get("requests", test.get("total_requests", 1))
            for test in self.results["tests"].values()
        ) / max(1, total_requests)
        avg_response_time = sum(test.get("avg_response_time", 0) for test in self.results["tests"].values()) / len(
            self.results["tests"]
        )

        self.results["summary"] = {
            "total_tests": len(self.results["tests"]),
            "total_requests": total_requests,
            "overall_success_rate": overall_success_rate,
            "avg_response_time": avg_response_time,
            "test_duration": time.time() - self.results["test_start"],
            "status": "PASS" if overall_success_rate > 0.95 else "FAIL",
        }

        print(f"\n📊 LOAD TEST SUMMARY:")
        print(f"   Total Requests: {total_requests}")
        print(f"   Success Rate: {overall_success_rate:.1%}")
        print(f"   Avg Response Time: {avg_response_time:.3f}s")
        print(f"   Status: {self.results['summary']['status']}")


def main():
    """Run load test and save results"""
    tester = VanaLoadTester()
    results = tester.run_load_test()

    # Save results
    os.makedirs("tests/results", exist_ok=True)

    timestamp = int(time.time())
    results_file = f"tests/results/load_test_results_{timestamp}.json"

    with open(results_file, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n💾 Results saved to: {results_file}")

    # Exit with error code if tests failed
    if results["summary"]["status"] == "FAIL":
        print("❌ Load tests FAILED")
        exit(1)
    else:
        print("✅ Load tests PASSED")
        exit(0)


if __name__ == "__main__":
    main()
