"""
JSON-RPC 2.0 Client for Agent Communication

This module provides a client for sending JSON-RPC requests to agents
with error handling, retry logic, and timeout management.
"""

import asyncio
import logging
import time
from typing import Any, Dict, Optional, Union

import aiohttp

from .message_protocol import (
    AgentMethods,
    AgentTaskRequest,
    JsonRpcErrorCode,
    JsonRpcResponse,
    MessageProtocol,
)

logger = logging.getLogger(__name__)


class JsonRpcClient:
    """JSON-RPC 2.0 client for agent communication."""

    def __init__(self, base_url: str = "http://localhost:8000", timeout: float = 30.0, max_retries: int = 3):
        """Initialize the JSON-RPC client.

        Args:
            base_url: Base URL for agent endpoints
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
        """
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        """Async context manager entry."""
        self.session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.timeout))
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.session:
            await self.session.close()

    async def call_agent(
        self,
        agent_name: str,
        method: str,
        params: Optional[Dict[str, Any]] = None,
        request_id: Optional[Union[str, int]] = None,
    ) -> JsonRpcResponse:
        """Call a method on a specific agent.

        Args:
            agent_name: Name of the target agent
            method: Method to call
            params: Method parameters
            request_id: Request ID (auto-generated if not provided)

        Returns:
            JsonRpcResponse object

        Raises:
            aiohttp.ClientError: If HTTP request fails
            ValueError: If response is invalid
        """
        # Create JSON-RPC request
        request = MessageProtocol.create_request(method, params, request_id)

        # Build agent endpoint URL
        endpoint_url = f"{self.base_url}/agent/{agent_name}/rpc"

        logger.info(f"🔄 Calling {agent_name}.{method} at {endpoint_url}")

        # Send request with retry logic
        for attempt in range(self.max_retries + 1):
            try:
                start_time = time.time()

                if not self.session:
                    raise RuntimeError("Client session not initialized. Use async context manager.")

                async with self.session.post(
                    endpoint_url, json=request.to_dict(), headers={"Content-Type": "application/json"}
                ) as response:
                    response_time = (time.time() - start_time) * 1000

                    if response.status == 200:
                        response_text = await response.text()
                        json_response = MessageProtocol.parse_response(response_text)

                        logger.info(f"✅ Agent call successful: {agent_name}.{method} ({response_time:.1f}ms)")
                        return json_response

                    elif response.status == 404:
                        # Agent not found
                        error_response = MessageProtocol.create_error_response(
                            JsonRpcErrorCode.AGENT_NOT_FOUND,
                            f"Agent '{agent_name}' not found",
                            {"agent_name": agent_name, "endpoint": endpoint_url},
                            request.id,
                        )
                        logger.warning(f"⚠️ Agent not found: {agent_name}")
                        return error_response

                    elif response.status == 503:
                        # Agent unavailable
                        error_response = MessageProtocol.create_error_response(
                            JsonRpcErrorCode.AGENT_UNAVAILABLE,
                            f"Agent '{agent_name}' is unavailable",
                            {"agent_name": agent_name, "status_code": response.status},
                            request.id,
                        )
                        logger.warning(f"⚠️ Agent unavailable: {agent_name}")
                        return error_response

                    else:
                        # Other HTTP errors
                        error_text = await response.text()
                        logger.warning(f"⚠️ HTTP error {response.status} for {agent_name}: {error_text}")

                        if attempt < self.max_retries:
                            await self._wait_for_retry(attempt)
                            continue

                        error_response = MessageProtocol.create_error_response(
                            JsonRpcErrorCode.COMMUNICATION_ERROR,
                            f"HTTP {response.status}: {error_text}",
                            {"status_code": response.status, "response": error_text},
                            request.id,
                        )
                        return error_response

            except asyncio.TimeoutError:
                logger.warning(f"⚠️ Timeout calling {agent_name}.{method} (attempt {attempt + 1})")

                if attempt < self.max_retries:
                    await self._wait_for_retry(attempt)
                    continue

                return MessageProtocol.create_error_response(
                    JsonRpcErrorCode.AGENT_TIMEOUT,
                    f"Timeout calling {agent_name}.{method}",
                    {"timeout_seconds": self.timeout},
                    request.id,
                )

            except Exception as e:
                logger.error(f"❌ Error calling {agent_name}.{method}: {e}")

                if attempt < self.max_retries:
                    await self._wait_for_retry(attempt)
                    continue

                return MessageProtocol.create_error_response(
                    JsonRpcErrorCode.COMMUNICATION_ERROR,
                    f"Communication error: {str(e)}",
                    {"error_type": type(e).__name__, "error_details": str(e)},
                    request.id,
                )

        # Should not reach here, but just in case
        return MessageProtocol.create_error_response(
            JsonRpcErrorCode.INTERNAL_ERROR, "Unexpected error in client", request_id=request.id
        )

    async def execute_task(
        self, agent_name: str, task: str, context: str = "", priority: str = "normal", timeout_seconds: int = 30
    ) -> JsonRpcResponse:
        """Execute a task on a specific agent.

        Args:
            agent_name: Name of the target agent
            task: Task description
            context: Additional context
            priority: Task priority
            timeout_seconds: Task timeout

        Returns:
            JsonRpcResponse with AgentTaskResponse result
        """
        task_request = AgentTaskRequest(
            task=task, context=context, agent_id=agent_name, priority=priority, timeout_seconds=timeout_seconds
        )

        return await self.call_agent(agent_name, AgentMethods.EXECUTE_TASK, task_request.to_dict())

    async def get_agent_status(self, agent_name: str) -> JsonRpcResponse:
        """Get status of a specific agent.

        Args:
            agent_name: Name of the target agent

        Returns:
            JsonRpcResponse with agent status
        """
        return await self.call_agent(agent_name, AgentMethods.GET_STATUS)

    async def get_agent_capabilities(self, agent_name: str) -> JsonRpcResponse:
        """Get capabilities of a specific agent.

        Args:
            agent_name: Name of the target agent

        Returns:
            JsonRpcResponse with agent capabilities
        """
        return await self.call_agent(agent_name, AgentMethods.GET_CAPABILITIES)

    async def health_check(self, agent_name: str) -> JsonRpcResponse:
        """Perform health check on a specific agent.

        Args:
            agent_name: Name of the target agent

        Returns:
            JsonRpcResponse with health status
        """
        return await self.call_agent(agent_name, AgentMethods.HEALTH_CHECK)

    async def _wait_for_retry(self, attempt: int) -> None:
        """Wait before retry with exponential backoff.

        Args:
            attempt: Current attempt number (0-based)
        """
        # Exponential backoff: 1s, 2s, 4s, 8s, ...
        wait_time = min(2**attempt, 10)  # Cap at 10 seconds
        logger.info(f"⏳ Waiting {wait_time}s before retry...")
        await asyncio.sleep(wait_time)


# Convenience function for one-off calls
async def call_agent_method(
    agent_name: str,
    method: str,
    params: Optional[Dict[str, Any]] = None,
    base_url: str = "http://localhost:8000",
    timeout: float = 30.0,
) -> JsonRpcResponse:
    """Convenience function for making a single agent call.

    Args:
        agent_name: Name of the target agent
        method: Method to call
        params: Method parameters
        base_url: Base URL for agent endpoints
        timeout: Request timeout

    Returns:
        JsonRpcResponse object
    """
    async with JsonRpcClient(base_url=base_url, timeout=timeout) as client:
        return await client.call_agent(agent_name, method, params)
