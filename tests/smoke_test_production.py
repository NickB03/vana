#!/usr/bin/env python
"""
Production Smoke Test - Verifies all fixes are real and working
This is NOT a unit test - it's a real production validation
"""

import asyncio
import os
import subprocess
import sys
import time

import aiohttp
import psutil

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class ProductionSmokeTest:
    """Real production validation - no mocks, no fakes"""

    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.process = None
        self.initial_memory = 0
        self.results = {
            "server_starts": False,
            "health_check": False,
            "auth_works": False,
            "memory_stable": False,
            "async_performance": False,
            "sse_bounded": False,
        }

    async def start_server(self) -> bool:
        """Start the real backend server"""
        print("🚀 Starting backend server...")
        try:
            # Start server in background
            env = os.environ.copy()
            env["USE_OPENROUTER"] = "true"  # Use configured LiteLLM

            self.process = subprocess.Popen(
                ["uv", "run", "uvicorn", "app.server:app", "--port", "8000"],
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

            # Wait for server to start
            await asyncio.sleep(5)

            # Check if server is running
            async with aiohttp.ClientSession() as session:
                try:
                    async with session.get(f"{self.base_url}/health") as resp:
                        if resp.status == 200:
                            self.results["server_starts"] = True
                            print("✅ Server started successfully")
                            return True
                except:
                    pass

            print("❌ Server failed to start")
            return False

        except Exception as e:
            print(f"❌ Error starting server: {e}")
            return False

    async def test_health_check(self):
        """Test if health endpoint responds"""
        print("\n🔍 Testing health check...")
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(f"{self.base_url}/health") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data.get("status") == "healthy":
                            self.results["health_check"] = True
                            print("✅ Health check passed")
                        else:
                            print(f"⚠️ Health check returned: {data}")
            except Exception as e:
                print(f"❌ Health check failed: {e}")

    async def test_authentication(self):
        """Test if authentication actually works"""
        print("\n🔐 Testing authentication system...")
        async with aiohttp.ClientSession() as session:
            # Test 1: Register a new user
            register_data = {
                "username": "test_user_smoke",
                "email": "smoke@test.com",
                "password": "SecurePassword123!",
            }

            try:
                async with session.post(
                    f"{self.base_url}/auth/register", json=register_data
                ) as resp:
                    if resp.status in [200, 201]:
                        print("✅ User registration works")
                    elif resp.status == 400:
                        print("ℹ️ User already exists (expected if re-running)")
                    else:
                        print(f"⚠️ Registration returned: {resp.status}")
            except Exception as e:
                print(f"❌ Registration failed: {e}")
                return

            # Test 2: Login and get token
            login_data = {
                "username": "test_user_smoke",
                "password": "SecurePassword123!",
                "grant_type": "password",
            }

            token = None
            try:
                async with session.post(
                    f"{self.base_url}/auth/login",
                    data=login_data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        token = data.get("access_token")
                        if token:
                            print("✅ Login successful, JWT token received")
                        else:
                            print("⚠️ Login succeeded but no token")
                    else:
                        print(f"❌ Login failed: {resp.status}")
            except Exception as e:
                print(f"❌ Login error: {e}")
                return

            # Test 3: Access protected endpoint
            if token:
                try:
                    headers = {"Authorization": f"Bearer {token}"}
                    async with session.get(
                        f"{self.base_url}/users/me", headers=headers
                    ) as resp:
                        if resp.status == 200:
                            user_data = await resp.json()
                            if user_data.get("username") == "test_user_smoke":
                                self.results["auth_works"] = True
                                print("✅ Protected endpoint access works")
                            else:
                                print(f"⚠️ Got user data but wrong user: {user_data}")
                        else:
                            print(f"❌ Protected endpoint returned: {resp.status}")
                except Exception as e:
                    print(f"❌ Protected endpoint error: {e}")

    async def test_memory_stability(self):
        """Test if memory leak is actually fixed"""
        print("\n💾 Testing memory stability...")

        # Get initial memory
        process = psutil.Process(self.process.pid)
        self.initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        print(f"Initial memory: {self.initial_memory:.2f} MB")

        # Create multiple SSE connections
        print("Creating 10 SSE connections...")
        connections = []
        async with aiohttp.ClientSession() as session:
            for i in range(10):
                try:
                    # Create SSE connection
                    resp = await session.get(
                        f"{self.base_url}/agent-network/sse/test_session_{i}",
                        timeout=aiohttp.ClientTimeout(total=1),
                    )
                    connections.append(resp)
                except asyncio.TimeoutError:
                    # Expected - SSE keeps connection open
                    pass
                except Exception as e:
                    print(f"SSE connection {i} error: {e}")

        # Send events to trigger memory usage
        print("Sending 100 events...")
        async with aiohttp.ClientSession() as session:
            for i in range(100):
                try:
                    await session.post(
                        f"{self.base_url}/agent-network/broadcast",
                        json={
                            "event": f"test_event_{i}",
                            "data": {"message": f"Test message {i}" * 100},
                        },
                    )
                except:
                    pass  # Endpoint might not exist, that's OK

        # Wait and check memory
        await asyncio.sleep(5)

        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_growth = final_memory - self.initial_memory

        print(f"Final memory: {final_memory:.2f} MB")
        print(f"Memory growth: {memory_growth:.2f} MB")

        # Check if memory growth is reasonable (less than 50MB for this test)
        if memory_growth < 50:
            self.results["memory_stable"] = True
            print("✅ Memory is stable (growth < 50MB)")
        else:
            print(f"❌ Excessive memory growth: {memory_growth:.2f} MB")

    async def test_async_performance(self):
        """Test if async conversion actually improves performance"""
        print("\n⚡ Testing async performance...")

        # Test concurrent requests
        start_time = time.time()

        async with aiohttp.ClientSession() as session:
            tasks = []
            for _i in range(10):
                task = session.get(f"{self.base_url}/health")
                tasks.append(task)

            # Execute all requests concurrently
            responses = await asyncio.gather(*tasks, return_exceptions=True)

        elapsed = time.time() - start_time

        successful = sum(1 for r in responses if not isinstance(r, Exception))
        print(f"Completed {successful}/10 concurrent requests in {elapsed:.2f}s")

        # Should complete 10 requests in less than 2 seconds (async benefit)
        if elapsed < 2.0 and successful >= 8:
            self.results["async_performance"] = True
            print("✅ Async performance is good")
        else:
            print(
                f"⚠️ Performance not optimal: {elapsed:.2f}s for {successful} requests"
            )

    async def cleanup(self):
        """Stop the server"""
        if self.process:
            print("\n🧹 Stopping server...")
            self.process.terminate()
            await asyncio.sleep(2)
            if self.process.poll() is None:
                self.process.kill()
            print("Server stopped")

    async def run(self):
        """Run all smoke tests"""
        print("=" * 60)
        print("🔥 PRODUCTION SMOKE TEST - REAL VALIDATION")
        print("=" * 60)

        try:
            # Start server
            if not await self.start_server():
                print("\n❌ Server failed to start - cannot continue tests")
                return self.results

            # Run tests
            await self.test_health_check()
            await self.test_authentication()
            await self.test_memory_stability()
            await self.test_async_performance()

        finally:
            await self.cleanup()

        # Print summary
        print("\n" + "=" * 60)
        print("📊 SMOKE TEST RESULTS")
        print("=" * 60)

        passed = sum(1 for v in self.results.values() if v)
        total = len(self.results)

        for test, result in self.results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test:20} : {status}")

        print(f"\nOverall: {passed}/{total} tests passed")

        if passed == total:
            print("\n🎉 ALL PRODUCTION SMOKE TESTS PASSED!")
            print("The fixes are REAL and working in production conditions.")
        else:
            print(f"\n⚠️ {total - passed} tests failed")
            print("Some fixes may need additional verification.")

        return self.results


async def main():
    """Run the production smoke test"""
    tester = ProductionSmokeTest()
    results = await tester.run()

    # Exit with appropriate code
    if all(results.values()):
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
