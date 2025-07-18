"""
Execution Engine for VANA Sandbox Environment

Orchestrates secure code execution across multiple languages with comprehensive
monitoring, security validation, and resource management.
"""

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional

from .resource_monitor import ResourceLimitExceededError, ResourceMonitor, ResourceUsage
from .security_manager import SecurityManager, SecurityViolationError

logger = logging.getLogger(__name__)


class ExecutionStatus(Enum):
    """Execution status enumeration."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"
    SECURITY_VIOLATION = "security_violation"
    RESOURCE_LIMIT_EXCEEDED = "resource_limit_exceeded"


@dataclass
class ExecutionResult:
    """Result of code execution."""

    execution_id: str
    status: ExecutionStatus
    output: str
    error: Optional[str]
    execution_time: float
    resource_usage: Optional[ResourceUsage]
    language: str
    code_hash: str
    timestamp: float
    metadata: Dict[str, Any]


class UnsupportedLanguageError(Exception):
    """Raised when an unsupported language is requested."""


class ExecutionTimeoutError(Exception):
    """Raised when execution times out."""


class ExecutionEngine:
    """
    Main execution engine that orchestrates secure code execution.

    Manages security validation, resource monitoring, and execution across
    multiple language executors with comprehensive error handling.
    """

    def __init__(self, security_manager: Optional[SecurityManager] = None):
        """
        Initialize execution engine.

        Args:
            security_manager: Security manager instance (creates default if None)
        """
        self.security_manager = security_manager or SecurityManager()
        self.supported_languages = ["python", "javascript", "shell"]
        self.executors = {}
        self._execution_history: List[ExecutionResult] = []

        # Initialize executors lazily
        self._executors_initialized = False

    def _initialize_executors(self):
        """Initialize language-specific executors."""
        if self._executors_initialized:
            return

        try:
            from ..executors.javascript_executor import JavaScriptExecutor
            from ..executors.python_executor import PythonExecutor
            from ..executors.shell_executor import ShellExecutor

            self.executors = {
                "python": PythonExecutor(self.security_manager),
                "javascript": JavaScriptExecutor(self.security_manager),
                "shell": ShellExecutor(self.security_manager),
            }
            self._executors_initialized = True
            logger.info("Initialized all language executors with Docker support")

        except ImportError as e:
            logger.warning(f"Some executors not available: {e}")
            # Fallback to mock executors if Docker/dependencies not available
            self.executors = {
                "python": MockExecutor("python"),
                "javascript": MockExecutor("javascript"),
                "shell": MockExecutor("shell"),
            }
            self._executors_initialized = True
            logger.info("Initialized mock executors (Docker not available)")

    async def execute_code(
        self,
        language: str,
        code: str,
        timeout: Optional[int] = None,
        resource_limits: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ExecutionResult:
        """
        Execute code in specified language with security and resource monitoring.

        Args:
            language: Programming language (python, javascript, shell)
            code: Code to execute
            timeout: Execution timeout in seconds (uses default if None)
            resource_limits: Custom resource limits (uses default if None)
            metadata: Additional metadata to include in result

        Returns:
            ExecutionResult with output, errors, and resource usage
        """
        execution_id = str(uuid.uuid4())
        start_time = time.time()

        # Normalize language
        language = language.lower().strip()

        # Initialize executors if needed
        self._initialize_executors()

        # Validate language support
        if language not in self.supported_languages:
            return ExecutionResult(
                execution_id=execution_id,
                status=ExecutionStatus.FAILED,
                output="",
                error=f"Unsupported language: {language}",
                execution_time=0,
                resource_usage=None,
                language=language,
                code_hash=self._hash_code(code),
                timestamp=start_time,
                metadata=metadata or {},
            )

        # Validate code security
        try:
            self.security_manager.validate_code(code, language)
        except SecurityViolationError as e:
            return ExecutionResult(
                execution_id=execution_id,
                status=ExecutionStatus.SECURITY_VIOLATION,
                output="",
                error=f"Security violation: {str(e)}",
                execution_time=time.time() - start_time,
                resource_usage=None,
                language=language,
                code_hash=self._hash_code(code),
                timestamp=start_time,
                metadata=metadata or {},
            )

        # Set up resource monitoring
        limits = resource_limits or self.security_manager.get_resource_limits()
        resource_monitor = ResourceMonitor(limits)

        # Get executor
        executor = self.executors.get(language)
        if not executor:
            return ExecutionResult(
                execution_id=execution_id,
                status=ExecutionStatus.FAILED,
                output="",
                error=f"Executor not available for language: {language}",
                execution_time=time.time() - start_time,
                resource_usage=None,
                language=language,
                code_hash=self._hash_code(code),
                timestamp=start_time,
                metadata=metadata or {},
            )

        # Execute code with monitoring
        try:
            # Start resource monitoring
            resource_monitor.start_monitoring()

            # Set timeout
            execution_timeout = timeout or limits.get("max_execution_time", 30)

            # Execute code with timeout
            result = await asyncio.wait_for(
                executor.execute(code, execution_id=execution_id),
                timeout=execution_timeout,
            )

            # Stop monitoring and get resource usage
            resource_usage = resource_monitor.stop_monitoring()

            # Create successful result
            execution_result = ExecutionResult(
                execution_id=execution_id,
                status=ExecutionStatus.COMPLETED,
                output=result.get("output", ""),
                error=result.get("error"),
                execution_time=time.time() - start_time,
                resource_usage=resource_usage,
                language=language,
                code_hash=self._hash_code(code),
                timestamp=start_time,
                metadata=metadata or {},
            )

        except asyncio.TimeoutError:
            resource_usage = resource_monitor.stop_monitoring()
            execution_result = ExecutionResult(
                execution_id=execution_id,
                status=ExecutionStatus.TIMEOUT,
                output="",
                error=f"Execution timed out after {execution_timeout} seconds",
                execution_time=time.time() - start_time,
                resource_usage=resource_usage,
                language=language,
                code_hash=self._hash_code(code),
                timestamp=start_time,
                metadata=metadata or {},
            )

        except ResourceLimitExceededError as e:
            resource_usage = resource_monitor.stop_monitoring()
            execution_result = ExecutionResult(
                execution_id=execution_id,
                status=ExecutionStatus.RESOURCE_LIMIT_EXCEEDED,
                output="",
                error=f"Resource limit exceeded: {str(e)}",
                execution_time=time.time() - start_time,
                resource_usage=resource_usage,
                language=language,
                code_hash=self._hash_code(code),
                timestamp=start_time,
                metadata=metadata or {},
            )

        except Exception as e:
            resource_usage = resource_monitor.stop_monitoring()
            execution_result = ExecutionResult(
                execution_id=execution_id,
                status=ExecutionStatus.FAILED,
                output="",
                error=f"Execution failed: {str(e)}",
                execution_time=time.time() - start_time,
                resource_usage=resource_usage,
                language=language,
                code_hash=self._hash_code(code),
                timestamp=start_time,
                metadata=metadata or {},
            )

        # Store in execution history
        self._execution_history.append(execution_result)

        # Log execution result
        logger.info(
            f"Code execution completed: {execution_id} | "
            f"Language: {language} | Status: {execution_result.status.value} | "
            f"Time: {execution_result.execution_time:.3f}s"
        )

        return execution_result

    def _hash_code(self, code: str) -> str:
        """Generate hash for code content."""
        import hashlib

        return hashlib.sha256(code.encode()).hexdigest()[:16]

    def get_supported_languages(self) -> List[str]:
        """Get list of supported programming languages."""
        return self.supported_languages.copy()

    def get_execution_history(self, limit: Optional[int] = None) -> List[ExecutionResult]:
        """
        Get execution history.

        Args:
            limit: Maximum number of results to return

        Returns:
            List of execution results
        """
        history = self._execution_history.copy()
        if limit:
            history = history[-limit:]
        return history

    def clear_execution_history(self) -> None:
        """Clear execution history."""
        self._execution_history.clear()
        logger.info("Execution history cleared")


class MockExecutor:
    """Mock executor for testing when real executors are not available."""

    def __init__(self, language: str):
        self.language = language

    async def execute(self, code: str, execution_id: Optional[str] = None) -> Dict[str, Any]:
        """Mock execution that returns a placeholder result."""
        await asyncio.sleep(0.1)  # Simulate execution time

        return {
            "output": f"Mock execution result for {self.language} code:\n{code[:100]}...",
            "error": None,
            "exit_code": 0,
            "execution_time": 0.1,
        }
