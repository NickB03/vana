"""
JSON-RPC 2.0 Server for Agent Communication

This module provides a server for handling JSON-RPC requests from other agents
with method registration, request processing, and error handling.
"""

import asyncio
import logging
import time
import traceback
from typing import Any, Awaitable, Callable, Dict

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from .message_protocol import (
    AgentMethods,
    AgentTaskResponse,
    JsonRpcErrorCode,
    JsonRpcResponse,
    MessageProtocol,
)

logger = logging.getLogger(__name__)


class JsonRpcServer:
    """JSON-RPC 2.0 server for handling agent requests."""

    def __init__(self, agent_name: str):
        """Initialize the JSON-RPC server.

        Args:
            agent_name: Name of this agent
        """
        self.agent_name = agent_name
        self.methods: Dict[str, Callable] = {}
        self.request_count = 0
        self.error_count = 0

        # Register default methods
        self._register_default_methods()

    def register_method(self, method_name: str, handler: Callable) -> None:
        """Register a method handler.

        Args:
            method_name: Name of the method
            handler: Function to handle the method call
        """
        self.methods[method_name] = handler
        logger.info(f"📝 Registered method: {method_name}")

    def unregister_method(self, method_name: str) -> None:
        """Unregister a method handler.

        Args:
            method_name: Name of the method to unregister
        """
        if method_name in self.methods:
            del self.methods[method_name]
            logger.info(f"🗑️ Unregistered method: {method_name}")

    async def handle_request(self, request_data: str) -> str:
        """Handle a JSON-RPC request.

        Args:
            request_data: JSON-RPC request string

        Returns:
            JSON-RPC response string
        """
        start_time = time.time()
        self.request_count += 1

        try:
            # Parse the request
            try:
                request = MessageProtocol.parse_request(request_data)
            except ValueError as e:
                logger.warning(f"⚠️ Invalid request: {e}")
                self.error_count += 1
                error_response = MessageProtocol.create_error_response(
                    JsonRpcErrorCode.PARSE_ERROR, f"Parse error: {str(e)}"
                )
                return error_response.to_json()

            # Validate the request
            validation_error = MessageProtocol.validate_request(request)
            if validation_error:
                logger.warning(f"⚠️ Invalid request: {validation_error.message}")
                self.error_count += 1
                error_response = JsonRpcResponse(error=validation_error, id=request.id)
                return error_response.to_json()

            # Check if method exists
            if request.method not in self.methods:
                logger.warning(f"⚠️ Method not found: {request.method}")
                self.error_count += 1
                error_response = MessageProtocol.create_error_response(
                    JsonRpcErrorCode.METHOD_NOT_FOUND,
                    f"Method '{request.method}' not found",
                    {"available_methods": list(self.methods.keys())},
                    request.id,
                )
                return error_response.to_json()

            # Execute the method
            try:
                handler = self.methods[request.method]

                # Call handler with parameters
                if request.params:
                    if asyncio.iscoroutinefunction(handler):
                        result = await handler(**request.params)
                    else:
                        result = handler(**request.params)
                else:
                    if asyncio.iscoroutinefunction(handler):
                        result = await handler()
                    else:
                        result = handler()

                # Create success response
                execution_time = (time.time() - start_time) * 1000
                logger.info(f"✅ Method executed: {request.method} ({execution_time:.1f}ms)")

                success_response = MessageProtocol.create_success_response(result, request.id)
                return success_response.to_json()

            except TypeError as e:
                # Invalid parameters
                logger.warning(f"⚠️ Invalid parameters for {request.method}: {e}")
                self.error_count += 1
                error_response = MessageProtocol.create_error_response(
                    JsonRpcErrorCode.INVALID_PARAMS,
                    f"Invalid parameters: {str(e)}",
                    {"method": request.method, "params": request.params},
                    request.id,
                )
                return error_response.to_json()

            except Exception as e:
                # Internal error
                logger.error(f"❌ Internal error in {request.method}: {e}")
                logger.error(traceback.format_exc())
                self.error_count += 1
                error_response = MessageProtocol.create_error_response(
                    JsonRpcErrorCode.INTERNAL_ERROR,
                    f"Internal error: {str(e)}",
                    {"method": request.method, "error_type": type(e).__name__},
                    request.id,
                )
                return error_response.to_json()

        except Exception as e:
            # Unexpected error
            logger.error(f"❌ Unexpected error handling request: {e}")
            logger.error(traceback.format_exc())
            self.error_count += 1
            error_response = MessageProtocol.create_error_response(
                JsonRpcErrorCode.INTERNAL_ERROR, f"Unexpected error: {str(e)}"
            )
            return error_response.to_json()

    def _register_default_methods(self) -> None:
        """Register default agent methods."""

        async def get_status() -> Dict[str, Any]:
            """Get agent status."""
            return {
                "agent_name": self.agent_name,
                "status": "active",
                "request_count": self.request_count,
                "error_count": self.error_count,
                "error_rate": self.error_count / max(self.request_count, 1),
                "methods": list(self.methods.keys()),
            }

        async def get_capabilities() -> Dict[str, Any]:
            """Get agent capabilities."""
            return {
                "agent_name": self.agent_name,
                "methods": list(self.methods.keys()),
                "supports_async": True,
                "jsonrpc_version": "2.0",
            }

        async def health_check() -> Dict[str, Any]:
            """Perform health check."""
            return {"agent_name": self.agent_name, "status": "healthy", "timestamp": time.time()}

        # Register default methods
        self.register_method(AgentMethods.GET_STATUS, get_status)
        self.register_method(AgentMethods.GET_CAPABILITIES, get_capabilities)
        self.register_method(AgentMethods.HEALTH_CHECK, health_check)


def create_agent_rpc_endpoint(app: FastAPI, agent_name: str, server: JsonRpcServer) -> None:
    """Create RPC endpoint for an agent in FastAPI app.

    Args:
        app: FastAPI application
        agent_name: Name of the agent
        server: JsonRpcServer instance
    """

    @app.post(f"/agent/{agent_name}/rpc")
    async def agent_rpc_endpoint(request: Request):
        """Handle JSON-RPC requests for the agent."""
        try:
            # Get request body
            body = await request.body()
            request_data = body.decode("utf-8")

            # Handle the request
            response_data = await server.handle_request(request_data)

            # Return JSON response
            return JSONResponse(content=response_data, media_type="application/json")

        except Exception as e:
            logger.error(f"❌ Error in RPC endpoint for {agent_name}: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    logger.info(f"🌐 Created RPC endpoint: /agent/{agent_name}/rpc")


class AgentRpcHandler:
    """Helper class for creating agent RPC handlers."""

    def __init__(self, agent_name: str):
        """Initialize the RPC handler.

        Args:
            agent_name: Name of this agent
        """
        self.agent_name = agent_name
        self.server = JsonRpcServer(agent_name)

    def register_execute_task(self, handler: Callable[[str, str, str, str, int], Awaitable[AgentTaskResponse]]) -> None:
        """Register task execution handler.

        Args:
            handler: Async function that takes (task, context, agent_id, priority, timeout_seconds)
                    and returns AgentTaskResponse
        """

        async def execute_task_wrapper(
            task: str, context: str = "", agent_id: str = "", priority: str = "normal", timeout_seconds: int = 30
        ) -> Dict[str, Any]:
            """Wrapper for task execution."""
            try:
                response = await handler(task, context, agent_id, priority, timeout_seconds)
                return response.to_dict()
            except Exception as e:
                logger.error(f"❌ Task execution failed: {e}")
                error_response = AgentTaskResponse(status="error", agent_id=self.agent_name, error=str(e))
                return error_response.to_dict()

        self.server.register_method(AgentMethods.EXECUTE_TASK, execute_task_wrapper)

    def register_method(self, method_name: str, handler: Callable) -> None:
        """Register a custom method.

        Args:
            method_name: Name of the method
            handler: Method handler function
        """
        self.server.register_method(method_name, handler)

    def create_fastapi_endpoint(self, app: FastAPI) -> None:
        """Create FastAPI endpoint for this agent.

        Args:
            app: FastAPI application
        """
        create_agent_rpc_endpoint(app, self.agent_name, self.server)
