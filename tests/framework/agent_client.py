"""
Agent Test Client for AI Agent Testing Framework

Provides a standardized interface for testing AI agents with proper
integration to the VANA agent system and Google ADK patterns.
"""

import asyncio
import os
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import httpx


@dataclass
class AgentResponse:
    """Represents a response from an AI agent"""

    content: str
    status: str
    execution_time: float
    tools_used: List[str]
    delegations: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    error: Optional[str] = None


@dataclass
class AgentContext:
    """Represents context for agent interactions"""

    conversation_id: str
    previous_messages: List[Dict[str, str]]
    user_preferences: Dict[str, Any]
    session_data: Dict[str, Any]


class AgentTestClient:
    """Test client for interacting with VANA agents"""

    def __init__(
        self,
        agent_name: str = "vana",
        base_url: Optional[str] = None,
        timeout: int = 30,
    ):
        """Initialize agent test client"""
        self.agent_name = agent_name
        self.timeout = timeout

        # Use environment variable or default to dev environment
        if base_url is None:
            base_url = os.getenv(
                "VANA_TEST_URL", "https://vana-dev-960076421399.us-central1.run.app"
            )

        self.base_url = base_url.rstrip("/")
        self.session_id = None
        self.user_id = "test_user"

        # Track interactions for analysis
        self.interaction_history: List[Dict[str, Any]] = []
        self.tools_usage_log: List[Dict[str, Any]] = []
        self.delegation_history: List[Dict[str, Any]] = []

    async def _ensure_session(self) -> str:
        """Ensure a session exists and return the session ID"""
        if self.session_id is None:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/apps/{self.agent_name}/users/{self.user_id}/sessions",
                    json={},
                    headers={"Content-Type": "application/json"},
                )
                response.raise_for_status()
                session_data = response.json()
                self.session_id = session_data["id"]

        return self.session_id

    async def query(
        self,
        message: str,
        context: Optional[AgentContext] = None,
        expected_tools: Optional[List[str]] = None,
    ) -> AgentResponse:
        """Send a query to the agent and return the response"""
        start_time = time.time()

        try:
            # Ensure session exists
            session_id = await self._ensure_session()

            # Prepare request payload for Google ADK /run endpoint
            payload = {
                "appName": self.agent_name,
                "userId": self.user_id,
                "sessionId": session_id,
                "newMessage": {"parts": [{"text": message}], "role": "user"},
                "streaming": False,
            }

            if context:
                # Add context data to the payload if provided
                if context.previous_messages:
                    payload["context"] = {
                        "previous_messages": context.previous_messages,
                        "user_preferences": context.user_preferences,
                        "session_data": context.session_data,
                    }

            # Make HTTP request to agent using Google ADK /run endpoint
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/run",
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )

                response.raise_for_status()
                response_data = response.json()

            execution_time = time.time() - start_time

            # Extract response information from Google ADK response format
            # ADK returns an array of events, we need the final text response
            content = ""
            tools_used = []

            if isinstance(response_data, list):
                # Process events to extract final response and tools used
                for event in response_data:
                    if event.get("content") and event.get("content", {}).get("parts"):
                        parts = event["content"]["parts"]
                        for part in parts:
                            # Extract text content
                            if part.get("text"):
                                content = part["text"]
                            # Extract function calls (tools used)
                            elif part.get("functionCall"):
                                func_call = part["functionCall"]
                                if func_call.get("name"):
                                    tools_used.append(func_call["name"])

            status = "success" if response.status_code == 200 else "error"
            delegations = []  # Extract delegations from events if needed
            metadata = (
                {"events": response_data}
                if isinstance(response_data, list)
                else response_data.get("metadata", {})
            )

            # Create agent response
            agent_response = AgentResponse(
                content=content,
                status=status,
                execution_time=execution_time,
                tools_used=tools_used,
                delegations=delegations,
                metadata=metadata,
            )

            # Log interaction
            self._log_interaction(message, agent_response, expected_tools)

            return agent_response

        except httpx.TimeoutException:
            execution_time = time.time() - start_time
            error_response = AgentResponse(
                content="",
                status="timeout",
                execution_time=execution_time,
                tools_used=[],
                delegations=[],
                metadata={},
                error=f"Request timed out after {self.timeout} seconds",
            )
            self._log_interaction(message, error_response, expected_tools)
            return error_response

        except Exception as e:
            execution_time = time.time() - start_time
            error_response = AgentResponse(
                content="",
                status="error",
                execution_time=execution_time,
                tools_used=[],
                delegations=[],
                metadata={},
                error=str(e),
            )
            self._log_interaction(message, error_response, expected_tools)
            return error_response

    async def query_with_retry(
        self, message: str, max_retries: int = 3, context: Optional[AgentContext] = None
    ) -> AgentResponse:
        """Query with automatic retry on failure"""
        last_response = None

        for attempt in range(max_retries + 1):
            response = await self.query(message, context)

            if response.status == "success":
                return response

            last_response = response

            if attempt < max_retries:
                # Wait before retry (exponential backoff)
                await asyncio.sleep(2**attempt)

        return last_response

    def set_context(self, context: AgentContext) -> None:
        """Set context for subsequent interactions"""
        self.current_context = context

    def get_interaction_history(self) -> List[Dict[str, Any]]:
        """Get history of all interactions"""
        return self.interaction_history.copy()

    def get_tools_usage_log(self) -> List[Dict[str, Any]]:
        """Get log of all tool usage"""
        return self.tools_usage_log.copy()

    def get_delegation_history(self) -> List[Dict[str, Any]]:
        """Get history of agent delegations"""
        return self.delegation_history.copy()

    def clear_history(self) -> None:
        """Clear all interaction history"""
        self.interaction_history.clear()
        self.tools_usage_log.clear()
        self.delegation_history.clear()

    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics from interaction history"""
        if not self.interaction_history:
            return {}

        execution_times = [i["execution_time"] for i in self.interaction_history]
        successful_interactions = [
            i for i in self.interaction_history if i["status"] == "success"
        ]

        return {
            "total_interactions": len(self.interaction_history),
            "successful_interactions": len(successful_interactions),
            "success_rate": len(successful_interactions)
            / len(self.interaction_history),
            "avg_execution_time": sum(execution_times) / len(execution_times),
            "min_execution_time": min(execution_times),
            "max_execution_time": max(execution_times),
            "total_tools_used": len(self.tools_usage_log),
            "unique_tools_used": len(set(t["tool_name"] for t in self.tools_usage_log)),
            "total_delegations": len(self.delegation_history),
        }

    def _extract_tools_used(self, response_data: Dict[str, Any]) -> List[str]:
        """Extract tools used from response data"""
        tools = []

        # Look for tools in various response fields
        if "tools_used" in response_data:
            tools.extend(response_data["tools_used"])

        if "metadata" in response_data and "tools" in response_data["metadata"]:
            tools.extend(response_data["metadata"]["tools"])

        # Analyze response content for tool usage patterns
        content = response_data.get("response", "")
        if "web search" in content.lower() or "searching" in content.lower():
            tools.append("adk_web_search")

        if "delegat" in content.lower() or "transfer" in content.lower():
            tools.append("delegate_to_agent")

        return list(set(tools))  # Remove duplicates

    def _extract_delegations(
        self, response_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Extract delegation information from response data"""
        delegations = []

        if "delegations" in response_data:
            delegations.extend(response_data["delegations"])

        if "metadata" in response_data and "delegations" in response_data["metadata"]:
            delegations.extend(response_data["metadata"]["delegations"])

        return delegations

    def _log_interaction(
        self,
        message: str,
        response: AgentResponse,
        expected_tools: Optional[List[str]] = None,
    ) -> None:
        """Log interaction for analysis"""
        interaction = {
            "timestamp": time.time(),
            "message": message,
            "response_content": response.content,
            "status": response.status,
            "execution_time": response.execution_time,
            "tools_used": response.tools_used,
            "delegations": response.delegations,
            "expected_tools": expected_tools or [],
            "error": response.error,
        }

        self.interaction_history.append(interaction)

        # Log tool usage
        for tool in response.tools_used:
            self.tools_usage_log.append(
                {
                    "timestamp": time.time(),
                    "tool_name": tool,
                    "message": message,
                    "expected": tool in (expected_tools or []),
                }
            )

        # Log delegations
        for delegation in response.delegations:
            self.delegation_history.append(
                {"timestamp": time.time(), "delegation": delegation, "message": message}
            )


# Factory functions for creating test clients
async def create_test_agent_client(
    agent_name: str = "vana", base_url: Optional[str] = None
) -> AgentTestClient:
    """Factory function to create and initialize an agent test client"""
    client = AgentTestClient(agent_name=agent_name, base_url=base_url)
    return client


async def create_multi_agent_environment(
    agent_names: List[str], base_url: Optional[str] = None
) -> Dict[str, AgentTestClient]:
    """Create multiple agent clients for multi-agent testing"""
    clients = {}

    for agent_name in agent_names:
        clients[agent_name] = await create_test_agent_client(agent_name, base_url)

    return clients
