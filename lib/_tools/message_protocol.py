"""
JSON-RPC 2.0 Message Protocol for Agent Communication

This module defines the message formats, validation, and error codes for
agent-to-agent communication using JSON-RPC 2.0 protocol.
"""

import json
import logging
import uuid
from dataclasses import asdict, dataclass
from enum import Enum
from typing import Any, Dict, Optional, Union

logger = logging.getLogger(__name__)


class JsonRpcErrorCode(Enum):
    """Standard JSON-RPC 2.0 error codes plus custom agent-specific codes."""

    # Standard JSON-RPC 2.0 error codes
    PARSE_ERROR = -32700
    INVALID_REQUEST = -32600
    METHOD_NOT_FOUND = -32601
    INVALID_PARAMS = -32602
    INTERNAL_ERROR = -32603

    # Custom agent communication error codes
    AGENT_NOT_FOUND = -32001
    AGENT_UNAVAILABLE = -32002
    AGENT_TIMEOUT = -32003
    AGENT_OVERLOADED = -32004
    COMMUNICATION_ERROR = -32005
    AUTHENTICATION_ERROR = -32006
    AUTHORIZATION_ERROR = -32007


@dataclass
class JsonRpcError:
    """JSON-RPC 2.0 error object."""

    code: int
    message: str
    data: Optional[Any] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = {"code": self.code, "message": self.message}
        if self.data is not None:
            result["data"] = self.data
        return result


@dataclass
class JsonRpcRequest:
    """JSON-RPC 2.0 request message."""

    jsonrpc: str = "2.0"
    method: str = ""
    params: Optional[Dict[str, Any]] = None
    id: Optional[Union[str, int]] = None

    def __post_init__(self):
        """Generate ID if not provided."""
        if self.id is None:
            self.id = str(uuid.uuid4())

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = {"jsonrpc": self.jsonrpc, "method": self.method}
        if self.params is not None:
            result["params"] = self.params
        if self.id is not None:
            result["id"] = self.id
        return result

    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict())


@dataclass
class JsonRpcResponse:
    """JSON-RPC 2.0 response message."""

    jsonrpc: str = "2.0"
    result: Optional[Any] = None
    error: Optional[JsonRpcError] = None
    id: Optional[Union[str, int]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = {"jsonrpc": self.jsonrpc}
        if self.result is not None:
            result["result"] = self.result
        if self.error is not None:
            result["error"] = self.error.to_dict()
        if self.id is not None:
            result["id"] = self.id
        return result

    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict())


class MessageProtocol:
    """JSON-RPC 2.0 message protocol handler."""

    @staticmethod
    def create_request(
        method: str,
        params: Optional[Dict[str, Any]] = None,
        request_id: Optional[Union[str, int]] = None,
    ) -> JsonRpcRequest:
        """Create a JSON-RPC 2.0 request.

        Args:
            method: Method name to call
            params: Method parameters
            request_id: Request ID (auto-generated if not provided)

        Returns:
            JsonRpcRequest object
        """
        return JsonRpcRequest(method=method, params=params, id=request_id)

    @staticmethod
    def create_success_response(result: Any, request_id: Optional[Union[str, int]] = None) -> JsonRpcResponse:
        """Create a successful JSON-RPC 2.0 response.

        Args:
            result: Response result
            request_id: Original request ID

        Returns:
            JsonRpcResponse object
        """
        return JsonRpcResponse(result=result, id=request_id)

    @staticmethod
    def create_error_response(
        error_code: JsonRpcErrorCode,
        message: str,
        data: Optional[Any] = None,
        request_id: Optional[Union[str, int]] = None,
    ) -> JsonRpcResponse:
        """Create an error JSON-RPC 2.0 response.

        Args:
            error_code: Error code
            message: Error message
            data: Additional error data
            request_id: Original request ID

        Returns:
            JsonRpcResponse object
        """
        error = JsonRpcError(code=error_code.value, message=message, data=data)
        return JsonRpcResponse(error=error, id=request_id)

    @staticmethod
    def parse_request(json_data: str) -> JsonRpcRequest:
        """Parse JSON string into JsonRpcRequest.

        Args:
            json_data: JSON string

        Returns:
            JsonRpcRequest object

        Raises:
            ValueError: If JSON is invalid or doesn't match JSON-RPC 2.0 format
        """
        try:
            data = json.loads(json_data)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON: {e}")

        # Validate required fields
        if not isinstance(data, dict):
            raise ValueError("Request must be a JSON object")

        if data.get("jsonrpc") != "2.0":
            raise ValueError("Invalid or missing jsonrpc version")

        if "method" not in data:
            raise ValueError("Missing required 'method' field")

        return JsonRpcRequest(
            jsonrpc=data["jsonrpc"],
            method=data["method"],
            params=data.get("params"),
            id=data.get("id"),
        )

    @staticmethod
    def parse_response(json_data: str) -> JsonRpcResponse:
        """Parse JSON string into JsonRpcResponse.

        Args:
            json_data: JSON string

        Returns:
            JsonRpcResponse object

        Raises:
            ValueError: If JSON is invalid or doesn't match JSON-RPC 2.0 format
        """
        try:
            data = json.loads(json_data)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON: {e}")

        # Validate required fields
        if not isinstance(data, dict):
            raise ValueError("Response must be a JSON object")

        if data.get("jsonrpc") != "2.0":
            raise ValueError("Invalid or missing jsonrpc version")

        # Parse error if present
        error = None
        if "error" in data:
            error_data = data["error"]
            if not isinstance(error_data, dict):
                raise ValueError("Error must be an object")

            error = JsonRpcError(
                code=error_data.get("code"),
                message=error_data.get("message", ""),
                data=error_data.get("data"),
            )

        return JsonRpcResponse(
            jsonrpc=data["jsonrpc"],
            result=data.get("result"),
            error=error,
            id=data.get("id"),
        )

    @staticmethod
    def validate_request(request: JsonRpcRequest) -> Optional[JsonRpcError]:
        """Validate a JSON-RPC request.

        Args:
            request: Request to validate

        Returns:
            JsonRpcError if validation fails, None if valid
        """
        if request.jsonrpc != "2.0":
            return JsonRpcError(
                code=JsonRpcErrorCode.INVALID_REQUEST.value,
                message="Invalid jsonrpc version",
            )

        if not request.method:
            return JsonRpcError(
                code=JsonRpcErrorCode.INVALID_REQUEST.value,
                message="Missing or empty method",
            )

        if request.params is not None and not isinstance(request.params, dict):
            return JsonRpcError(
                code=JsonRpcErrorCode.INVALID_PARAMS.value,
                message="Params must be an object",
            )

        return None


# Agent-specific message formats
@dataclass
class AgentTaskRequest:
    """Standard format for agent task requests."""

    task: str
    context: Optional[str] = None
    agent_id: Optional[str] = None
    priority: str = "normal"
    timeout_seconds: int = 30

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class AgentTaskResponse:
    """Standard format for agent task responses."""

    status: str
    output: Optional[str] = None
    agent_id: Optional[str] = None
    execution_time_ms: Optional[float] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


# Standard agent methods
class AgentMethods:
    """Standard method names for agent communication."""

    EXECUTE_TASK = "agent.execute_task"
    GET_STATUS = "agent.get_status"
    GET_CAPABILITIES = "agent.get_capabilities"
    HEALTH_CHECK = "agent.health_check"
    SHUTDOWN = "agent.shutdown"
