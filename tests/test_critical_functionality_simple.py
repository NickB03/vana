#!/usr/bin/env python3
"""
Simple ADK Evaluation Test for Critical VANA Functionality
Tests the core functionality issues using direct HTTP requests to ADK endpoints

Based on Google ADK evaluation framework and pytest patterns
"""

import pytest
import httpx
import json
import time
from typing import Dict, Any

# Test configuration
BASE_URL = "https://vana-dev-960076421399.us-central1.run.app"
TIMEOUT = 30.0

class TestCriticalFunctionality:
    """Test critical VANA functionality using ADK endpoints"""

    def _extract_response_text(self, response_data: list) -> str:
        """Extract text response from ADK event list"""
        for event in response_data:
            if event.get("content") and event.get("content", {}).get("parts"):
                for part in event["content"]["parts"]:
                    if part.get("text"):
                        return part["text"]
        return ""

    async def _create_session(self, client: httpx.AsyncClient, session_id: str) -> None:
        """Create a session for testing"""
        response = await client.post(
            f"{BASE_URL}/apps/vana/users/test_user/sessions/{session_id}",
            json={}
        )
        if response.status_code not in [200, 201, 400]:  # 400 means session already exists
            raise Exception(f"Failed to create session: HTTP {response.status_code}: {response.text}")

    async def _send_message(self, client: httpx.AsyncClient, message: str, session_id: str) -> tuple[float, str]:
        """Send message to VANA and return response time and text"""
        # Create session first
        await self._create_session(client, session_id)

        start_time = time.time()

        response = await client.post(
            f"{BASE_URL}/run",
            json={
                "appName": "vana",
                "userId": "test_user",
                "sessionId": session_id,
                "newMessage": {
                    "parts": [{"text": message}],
                    "role": "user"
                }
            }
        )

        end_time = time.time()
        response_time = end_time - start_time

        if response.status_code != 200:
            raise Exception(f"HTTP {response.status_code}: {response.text}")

        response_data = response.json()
        assert isinstance(response_data, list), "ADK should return list of events"
        assert len(response_data) > 0, "No events returned"

        response_text = self._extract_response_text(response_data)
        assert response_text, "No text response found in events"

        return response_time, response_text
    
    @pytest.mark.asyncio
    async def test_agent_discovery(self):
        """Test that agents are discoverable"""
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(f"{BASE_URL}/list-apps")
            assert response.status_code == 200
            
            agents = response.json()
            assert isinstance(agents, list)
            assert len(agents) > 0
            assert "vana" in agents
            
            # Check for production agents (exclude test agents)
            production_agents = [a for a in agents if not a.startswith("test_")]
            assert len(production_agents) >= 7  # Should have 7 production agents
    
    @pytest.mark.asyncio
    async def test_web_search_functionality(self):
        """Test web search functionality - CRITICAL issue identified"""
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response_time, response_text = await self._send_message(
                client,
                "Use web_search tool to search for 'Chicago weather June'",
                "test_session_web_search"
            )

            response_text_lower = response_text.lower()

            # Check for success indicators
            success_indicators = [
                "weather" in response_text_lower,
                "chicago" in response_text_lower,
                "temperature" in response_text_lower or "°f" in response_text_lower or "°c" in response_text_lower,
                "brave api key not configured" not in response_text_lower,
                "error" not in response_text_lower
            ]

            # Should have at least 3 success indicators for web search to be working
            success_count = sum(success_indicators)
            assert success_count >= 3, f"Web search failed. Response: {response_text[:200]}..."

            # Response time should be reasonable
            assert response_time < 30.0, f"Response time too slow: {response_time}s"
    
    @pytest.mark.asyncio
    async def test_knowledge_search_functionality(self):
        """Test knowledge search functionality - CRITICAL issue identified"""
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response_time, response_text = await self._send_message(
                client,
                "Use search_knowledge tool to search for 'VANA capabilities'",
                "test_session_knowledge_search"
            )

            response_text_lower = response_text.lower()

            # Check for quality indicators (not fallback responses)
            quality_indicators = [
                "i don't have specific information" not in response_text_lower,
                "fallback" not in response_text_lower,
                "vana" in response_text_lower,
                "agent" in response_text_lower or "capabilities" in response_text_lower,
                len(response_text) > 100  # Substantial response
            ]

            # Should have high quality response
            quality_count = sum(quality_indicators)
            assert quality_count >= 4, f"Knowledge search returned poor quality response: {response_text[:200]}..."

            assert response_time < 30.0, f"Response time too slow: {response_time}s"
    
    @pytest.mark.asyncio
    async def test_trip_planning_scenario(self):
        """Test the original failing scenario - trip planning"""
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response_time, response_text = await self._send_message(
                client,
                "I'd like to plan a trip to Chicago in June",
                "test_session_trip_planning"
            )

            response_text_lower = response_text.lower()

            # Check for successful trip planning indicators
            success_indicators = [
                "chicago" in response_text_lower,
                "june" in response_text_lower,
                ("weather" in response_text_lower or "temperature" in response_text_lower),
                ("attractions" in response_text_lower or "activities" in response_text_lower or "places" in response_text_lower),
                "i am having trouble" not in response_text_lower,
                "i don't have specific information" not in response_text_lower,
                "fallback" not in response_text_lower,
                len(response_text) > 200  # Substantial helpful response
            ]

            # Should provide good trip planning response
            success_count = sum(success_indicators)
            assert success_count >= 5, f"Trip planning failed. Response: {response_text[:300]}..."

            assert response_time < 30.0, f"Response time too slow: {response_time}s"
    
    @pytest.mark.asyncio
    async def test_health_status_check(self):
        """Test system health status"""
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response_time, response_text = await self._send_message(
                client,
                "Use get_health_status tool to check system configuration",
                "test_session_health_check"
            )

            response_text_lower = response_text.lower()

            # Check for proper configuration
            config_indicators = [
                "brave_api_key" not in response_text_lower or "not configured" not in response_text_lower,
                "region" not in response_text_lower or "not set" not in response_text_lower,
                "rag_corpus" not in response_text_lower or "not set" not in response_text_lower,
                "operational" in response_text_lower or "healthy" in response_text_lower,
                "error" not in response_text_lower
            ]

            # Should show good configuration
            config_count = sum(config_indicators)
            assert config_count >= 4, f"Environment configuration issues detected: {response_text[:200]}..."

            assert response_time < 30.0, f"Response time too slow: {response_time}s"
    
    @pytest.mark.asyncio
    async def test_system_info_endpoint(self):
        """Test system info endpoint"""
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(f"{BASE_URL}/info")
            assert response.status_code == 200
            
            info = response.json()
            assert info["name"] == "VANA"
            assert info["adk_integrated"] is True
            assert info["memory_service"]["available"] is True

# Standalone test runner
if __name__ == "__main__":
    import asyncio
    
    async def run_tests():
        test_instance = TestCriticalFunctionality()
        
        tests = [
            ("Agent Discovery", test_instance.test_agent_discovery()),
            ("Web Search Functionality", test_instance.test_web_search_functionality()),
            ("Knowledge Search Functionality", test_instance.test_knowledge_search_functionality()),
            ("Trip Planning Scenario", test_instance.test_trip_planning_scenario()),
            ("Health Status Check", test_instance.test_health_status_check()),
            ("System Info Endpoint", test_instance.test_system_info_endpoint()),
        ]
        
        results = []
        for test_name, test_coro in tests:
            try:
                print(f"🧪 Running {test_name}...")
                start_time = time.time()
                await test_coro
                end_time = time.time()
                print(f"✅ {test_name} PASSED ({end_time - start_time:.2f}s)")
                results.append((test_name, True, None))
            except Exception as e:
                print(f"❌ {test_name} FAILED: {e}")
                results.append((test_name, False, str(e)))
        
        # Summary
        passed = sum(1 for _, success, _ in results if success)
        total = len(results)
        print(f"\n📊 Results: {passed}/{total} tests passed ({passed/total:.1%})")
        
        if passed < total:
            print("\n🚨 Critical functionality issues detected!")
            for test_name, success, error in results:
                if not success:
                    print(f"  ❌ {test_name}: {error}")
            return False
        else:
            print("\n✅ All critical functionality tests passed!")
            return True
    
    success = asyncio.run(run_tests())
    exit(0 if success else 1)
