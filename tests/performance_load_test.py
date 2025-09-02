#!/usr/bin/env python3
"""
Performance and Load Testing
Tests backend performance under various load conditions
"""

import asyncio
import aiohttp
import time
import statistics
from concurrent.futures import ThreadPoolExecutor
import json
import sys
from typing import List, Dict, Any

class PerformanceLoadTester:
    """Performance and load testing for backend services"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results = []
    
    async def single_request(self, session: aiohttp.ClientSession, endpoint: str) -> Dict[str, Any]:
        """Make a single HTTP request and measure performance"""
        start_time = time.time()
        try:
            async with session.get(f"{self.base_url}{endpoint}") as response:
                await response.text()  # Read response body
                end_time = time.time()
                return {
                    "endpoint": endpoint,
                    "status": response.status,
                    "duration": end_time - start_time,
                    "success": 200 <= response.status < 400
                }
        except Exception as e:
            end_time = time.time()
            return {
                "endpoint": endpoint,
                "status": 0,
                "duration": end_time - start_time,
                "success": False,
                "error": str(e)
            }
    
    async def concurrent_load_test(self, endpoint: str, concurrent_requests: int = 10) -> Dict[str, Any]:
        """Test endpoint with concurrent requests"""
        print(f"🔥 Load testing {endpoint} with {concurrent_requests} concurrent requests...")
        
        connector = aiohttp.TCPConnector(limit=100)
        timeout = aiohttp.ClientTimeout(total=30)
        
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            tasks = []
            start_time = time.time()
            
            for _ in range(concurrent_requests):
                task = self.single_request(session, endpoint)
                tasks.append(task)
            
            results = await asyncio.gather(*tasks)
            total_time = time.time() - start_time
            
            # Analyze results
            successful = [r for r in results if r["success"]]
            failed = [r for r in results if not r["success"]]
            
            durations = [r["duration"] for r in successful]
            
            if durations:
                avg_duration = statistics.mean(durations)
                median_duration = statistics.median(durations)
                min_duration = min(durations)
                max_duration = max(durations)
                requests_per_second = len(successful) / total_time
            else:
                avg_duration = median_duration = min_duration = max_duration = 0
                requests_per_second = 0
            
            return {
                "endpoint": endpoint,
                "concurrent_requests": concurrent_requests,
                "total_time": total_time,
                "successful_requests": len(successful),
                "failed_requests": len(failed),
                "success_rate": len(successful) / concurrent_requests * 100,
                "avg_response_time": avg_duration,
                "median_response_time": median_duration,
                "min_response_time": min_duration,
                "max_response_time": max_duration,
                "requests_per_second": requests_per_second,
                "errors": [r.get("error") for r in failed if "error" in r]
            }
    
    async def stress_test(self, endpoint: str, duration_seconds: int = 30) -> Dict[str, Any]:
        """Run stress test for specified duration"""
        print(f"💪 Stress testing {endpoint} for {duration_seconds} seconds...")
        
        start_time = time.time()
        end_time = start_time + duration_seconds
        results = []
        
        connector = aiohttp.TCPConnector(limit=50)
        timeout = aiohttp.ClientTimeout(total=10)
        
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            while time.time() < end_time:
                batch_size = 5  # Send requests in small batches
                tasks = []
                
                for _ in range(batch_size):
                    if time.time() >= end_time:
                        break
                    task = self.single_request(session, endpoint)
                    tasks.append(task)
                
                if tasks:
                    batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                    results.extend([r for r in batch_results if isinstance(r, dict)])
                
                # Small delay to prevent overwhelming the server
                await asyncio.sleep(0.1)
        
        actual_duration = time.time() - start_time
        successful = [r for r in results if r.get("success", False)]
        failed = [r for r in results if not r.get("success", False)]
        
        if successful:
            durations = [r["duration"] for r in successful]
            avg_duration = statistics.mean(durations)
            requests_per_second = len(successful) / actual_duration
        else:
            avg_duration = 0
            requests_per_second = 0
        
        return {
            "endpoint": endpoint,
            "test_duration": actual_duration,
            "total_requests": len(results),
            "successful_requests": len(successful),
            "failed_requests": len(failed),
            "success_rate": len(successful) / len(results) * 100 if results else 0,
            "avg_response_time": avg_duration,
            "requests_per_second": requests_per_second,
            "errors": list(set([r.get("error") for r in failed if "error" in r]))
        }
    
    def run_sequential_performance_test(self, endpoints: List[str], iterations: int = 100) -> Dict[str, Any]:
        """Run sequential performance test"""
        print(f"⏱️  Sequential performance test - {iterations} requests per endpoint...")
        
        results = {}
        
        for endpoint in endpoints:
            print(f"   Testing {endpoint}...")
            durations = []
            successes = 0
            
            import requests
            session = requests.Session()
            session.timeout = 10
            
            for _ in range(iterations):
                start_time = time.time()
                try:
                    response = session.get(f"{self.base_url}{endpoint}")
                    duration = time.time() - start_time
                    durations.append(duration)
                    if 200 <= response.status_code < 400:
                        successes += 1
                except:
                    duration = time.time() - start_time
                    durations.append(duration)
            
            if durations:
                results[endpoint] = {
                    "iterations": iterations,
                    "successful_requests": successes,
                    "success_rate": successes / iterations * 100,
                    "avg_response_time": statistics.mean(durations),
                    "median_response_time": statistics.median(durations),
                    "min_response_time": min(durations),
                    "max_response_time": max(durations),
                    "std_dev": statistics.stdev(durations) if len(durations) > 1 else 0
                }
        
        return results
    
    async def run_all_performance_tests(self):
        """Run comprehensive performance testing"""
        print("🚀 Starting Comprehensive Performance Testing")
        print("=" * 60)
        
        # Key endpoints to test
        endpoints = ["/", "/health", "/list-apps", "/docs"]
        
        all_results = {
            "test_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "base_url": self.base_url
        }
        
        # 1. Sequential Performance Test
        print("\n1️⃣  Sequential Performance Test")
        sequential_results = self.run_sequential_performance_test(endpoints, 50)
        all_results["sequential"] = sequential_results
        
        # 2. Concurrent Load Tests
        print("\n2️⃣  Concurrent Load Tests")
        concurrent_results = {}
        for endpoint in endpoints[:2]:  # Test main endpoints
            for concurrency in [5, 10]:
                test_key = f"{endpoint}_concurrent_{concurrency}"
                result = await self.concurrent_load_test(endpoint, concurrency)
                concurrent_results[test_key] = result
        
        all_results["concurrent"] = concurrent_results
        
        # 3. Stress Test (shorter duration for demo)
        print("\n3️⃣  Stress Test")
        stress_result = await self.stress_test("/health", duration_seconds=15)
        all_results["stress"] = stress_result
        
        # 4. Generate Performance Report
        self.generate_performance_report(all_results)
        
        return all_results
    
    def generate_performance_report(self, results: Dict[str, Any]):
        """Generate comprehensive performance report"""
        print("\n" + "=" * 60)
        print("📊 PERFORMANCE TEST REPORT")
        print("=" * 60)
        
        # Sequential Performance Summary
        if "sequential" in results:
            print("\n🔄 Sequential Performance:")
            seq_results = results["sequential"]
            for endpoint, data in seq_results.items():
                print(f"   {endpoint}:")
                print(f"      - Avg Response: {data['avg_response_time']*1000:.1f}ms")
                print(f"      - Success Rate: {data['success_rate']:.1f}%")
                print(f"      - Min/Max: {data['min_response_time']*1000:.1f}ms / {data['max_response_time']*1000:.1f}ms")
        
        # Concurrent Load Summary
        if "concurrent" in results:
            print("\n🔥 Concurrent Load Performance:")
            conc_results = results["concurrent"]
            for test_name, data in conc_results.items():
                print(f"   {test_name}:")
                print(f"      - Success Rate: {data['success_rate']:.1f}%")
                print(f"      - Requests/Second: {data['requests_per_second']:.1f}")
                print(f"      - Avg Response: {data['avg_response_time']*1000:.1f}ms")
        
        # Stress Test Summary
        if "stress" in results:
            print("\n💪 Stress Test Results:")
            stress_data = results["stress"]
            print(f"   - Duration: {stress_data['test_duration']:.1f}s")
            print(f"   - Total Requests: {stress_data['total_requests']}")
            print(f"   - Success Rate: {stress_data['success_rate']:.1f}%")
            print(f"   - Requests/Second: {stress_data['requests_per_second']:.1f}")
            print(f"   - Avg Response: {stress_data['avg_response_time']*1000:.1f}ms")
        
        # Performance Assessment
        print("\n🎯 Performance Assessment:")
        
        # Check if performance is acceptable
        health_sequential = results.get("sequential", {}).get("/health", {})
        avg_response = health_sequential.get("avg_response_time", 0)
        
        if avg_response < 0.05:  # Less than 50ms
            print("   ✅ EXCELLENT - Response times are very fast")
        elif avg_response < 0.1:  # Less than 100ms
            print("   ✅ GOOD - Response times are acceptable")
        elif avg_response < 0.5:  # Less than 500ms
            print("   ⚠️  MODERATE - Response times could be improved")
        else:
            print("   ❌ SLOW - Response times need optimization")
        
        # Check concurrent performance
        concurrent_success_rates = [
            data.get("success_rate", 0) 
            for data in results.get("concurrent", {}).values()
        ]
        avg_success_rate = statistics.mean(concurrent_success_rates) if concurrent_success_rates else 0
        
        if avg_success_rate > 95:
            print("   ✅ HIGH RELIABILITY - Handles concurrent load well")
        elif avg_success_rate > 85:
            print("   ⚠️  MODERATE RELIABILITY - Some failures under load")
        else:
            print("   ❌ LOW RELIABILITY - High failure rate under load")
        
        print("\n💡 Recommendations:")
        if avg_response > 0.1:
            print("   - Consider optimizing database queries")
            print("   - Review application startup and initialization")
        if avg_success_rate < 90:
            print("   - Implement connection pooling")
            print("   - Add rate limiting and circuit breakers")
        
        print("   - Monitor resource usage during peak loads")
        print("   - Consider implementing caching for frequently accessed data")


async def main():
    """Main performance testing execution"""
    tester = PerformanceLoadTester()
    results = await tester.run_all_performance_tests()
    
    # Save results
    results_file = "/Users/nick/Development/vana/tests/performance_results.json"
    with open(results_file, "w") as f:
        # Clean results for JSON serialization
        clean_results = {}
        for k, v in results.items():
            if isinstance(v, dict):
                clean_v = {}
                for k2, v2 in v.items():
                    try:
                        json.dumps(v2)
                        clean_v[k2] = v2
                    except:
                        clean_v[k2] = str(v2)
                clean_results[k] = clean_v
            else:
                try:
                    json.dumps(v)
                    clean_results[k] = v
                except:
                    clean_results[k] = str(v)
        
        json.dump(clean_results, f, indent=2)
    
    print(f"\n📄 Performance results saved to: {results_file}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))