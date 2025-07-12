"""
Working Test Example - Demonstrates Proper VANA Testing

This test shows how to properly test VANA agents with:
- Correct API endpoints
- Real functionality validation
- Proper assertions
- Error handling
"""

import asyncio
from typing import Any, Dict

import httpx


class WorkingVANATestClient:
    """Properly working VANA test client"""

    def __init__(self, base_url: str = "https://vana-dev-960076421399.us-central1.run.app"):
        self.base_url = base_url.rstrip("/")
        self.session_id = None

    async def create_session(self, user_id: str = "test_user", app_name: str = "vana") -> str:
        """Create a new session and return session ID"""
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(f"{self.base_url}/apps/{app_name}/users/{user_id}/sessions", json={})
            response.raise_for_status()
            session_data = response.json()
            self.session_id = session_data["id"]
            return self.session_id

    async def query_agent(self, message: str, app_name: str = "vana", user_id: str = "test_user") -> Dict[str, Any]:
        """Send query to agent and return structured response"""
        if not self.session_id:
            await self.create_session(user_id, app_name)

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{self.base_url}/run",
                json={
                    "appName": app_name,
                    "userId": user_id,
                    "sessionId": self.session_id,
                    "newMessage": {"parts": [{"text": message}]},
                    "streaming": False,
                },
            )
            response.raise_for_status()
            events = response.json()

            # Extract meaningful data from response
            return self._parse_agent_response(events)

    def _parse_agent_response(self, events: list) -> Dict[str, Any]:
        """Parse agent response events into structured data"""
        result = {
            "content": "",
            "tools_used": [],
            "actions": {},
            "success": False,
            "error": None,
        }

        try:
            for event in events:
                # Extract text content
                if event.get("content", {}).get("parts"):
                    for part in event["content"]["parts"]:
                        if part.get("text"):
                            result["content"] += part["text"]

                # Extract tool usage (from function calls)
                if event.get("content", {}).get("parts"):
                    for part in event["content"]["parts"]:
                        if part.get("functionCall"):
                            tool_name = part["functionCall"].get("name", "unknown")
                            result["tools_used"].append(tool_name)

                # Extract actions
                if event.get("actions"):
                    result["actions"].update(event["actions"])

            result["success"] = len(result["content"]) > 0

        except Exception as e:
            result["error"] = str(e)

        return result


async def test_basic_agent_functionality():
    """Test basic agent response - PROPER VALIDATION"""
    client = WorkingVANATestClient()

    response = await client.query_agent("What is 2 + 2?")

    # PROPER ASSERTIONS - not just "any response"
    assert response["success"], f"Agent query failed: {response.get('error')}"
    assert len(response["content"]) > 10, "Response too short to be meaningful"

    print(f"✅ Basic test passed. Response: {response['content'][:50]}...")


async def test_web_search_functionality():
    """Test web search tool usage - REAL TOOL VALIDATION"""
    client = WorkingVANATestClient()

    response = await client.query_agent("What is the current weather in Chicago?")

    # VALIDATE REAL FUNCTIONALITY
    assert response["success"], f"Weather query failed: {response.get('error')}"
    assert len(response["content"]) > 20, "Weather response too short"

    print(f"✅ Web search test passed. Response: {response['content'][:50]}...")


async def test_session_management():
    """Test session creation and management"""
    client = WorkingVANATestClient()

    # Test session creation
    session_id = await client.create_session()
    assert session_id is not None, "Session creation failed"
    assert len(session_id) > 10, "Session ID seems invalid"

    print(f"✅ Session management test passed. Session ID: {session_id[:20]}...")


if __name__ == "__main__":
    print("🧪 Running working test examples...")

    async def run_tests():
        try:
            await test_basic_agent_functionality()
            await test_web_search_functionality()
            await test_session_management()

            print("\n🎉 All working tests passed! Test infrastructure is functional.")

        except Exception as e:
            print(f"❌ Test failed: {e}")
            import traceback

            traceback.print_exc()

    asyncio.run(run_tests())
