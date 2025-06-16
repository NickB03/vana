"""
Base Executor for VANA Sandbox Environment

Provides common functionality for all language-specific executors including
Docker container management, security validation, and result handling.
"""

import logging
import os
import tempfile
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

# Conditional Docker import - Docker may not be available in all environments
try:
    import docker

    DOCKER_AVAILABLE = True
except ImportError:
    docker = None
    DOCKER_AVAILABLE = False

logger = logging.getLogger(__name__)


@dataclass
class ExecutorResult:
    """Result of code execution by an executor."""

    output: str
    error: Optional[str]
    exit_code: int
    execution_time: float
    container_id: Optional[str]
    metadata: Dict[str, Any]


class ExecutorError(Exception):
    """Base exception for executor errors."""


class ContainerError(ExecutorError):
    """Raised when container operations fail."""


class BaseExecutor:
    """
    Base class for all language-specific executors.

    Provides common functionality for Docker container management,
    file handling, and execution coordination.
    """

    def __init__(self, security_manager, language: str):
        """
        Initialize base executor.

        Args:
            security_manager: Security manager instance
            language: Programming language name
        """
        self.security_manager = security_manager
        self.language = language
        self.docker_client = None
        self.container_name_prefix = f"vana-{language}-sandbox"

        # Initialize Docker client
        self._init_docker_client()

    def _init_docker_client(self):
        """Initialize Docker client with error handling."""
        if not DOCKER_AVAILABLE:
            logger.warning(f"Docker not available for {self.language} executor - running in fallback mode")
            self.docker_client = None
            return

        try:
            self.docker_client = docker.from_env()
            # Test Docker connection
            self.docker_client.ping()
            logger.info(f"Docker client initialized for {self.language} executor")
        except Exception as e:
            logger.error(f"Failed to initialize Docker client: {e}")
            self.docker_client = None

    async def execute(self, code: str, execution_id: Optional[str] = None, **kwargs) -> ExecutorResult:
        """
        Execute code in a secure container environment.

        Args:
            code: Code to execute
            execution_id: Unique execution identifier
            **kwargs: Additional execution parameters

        Returns:
            ExecutorResult with output, errors, and metadata
        """
        execution_id = execution_id or str(uuid.uuid4())
        start_time = time.time()

        # Validate Docker availability
        if not self.docker_client:
            # Use fallback execution when Docker is not available
            logger.warning(f"Docker not available for {self.language} executor - using fallback execution")
            return await self._execute_fallback(code, execution_id, start_time)

        # Create temporary workspace
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace_path = Path(temp_dir)

            try:
                # Prepare execution environment
                await self._prepare_workspace(workspace_path, code, execution_id)

                # Create and run container
                container = await self._create_container(workspace_path, execution_id)
                result = await self._run_container(container, code, execution_id)

                # Cleanup container
                await self._cleanup_container(container)

                result.execution_time = time.time() - start_time
                return result

            except Exception as e:
                logger.error(f"Execution failed for {execution_id}: {e}")
                return ExecutorResult(
                    output="",
                    error=f"Execution failed: {str(e)}",
                    exit_code=1,
                    execution_time=time.time() - start_time,
                    container_id=None,
                    metadata={"error_type": "execution_error", "exception": str(e)},
                )

    async def _prepare_workspace(self, workspace_path: Path, code: str, execution_id: str):
        """
        Prepare workspace directory with code and necessary files.

        Args:
            workspace_path: Path to workspace directory
            code: Code to execute
            execution_id: Execution identifier
        """
        # Create code file
        code_file = workspace_path / self._get_code_filename()
        code_file.write_text(code, encoding="utf-8")

        # Set appropriate permissions
        os.chmod(code_file, 0o644)

        # Create additional files if needed by subclasses
        await self._prepare_additional_files(workspace_path, execution_id)

    async def _prepare_additional_files(self, workspace_path: Path, execution_id: str):
        """
        Prepare additional files needed by specific executors.
        Override in subclasses as needed.

        Args:
            workspace_path: Path to workspace directory
            execution_id: Execution identifier
        """

    async def _create_container(self, workspace_path: Path, execution_id: str):
        """
        Create Docker container for code execution.

        Args:
            workspace_path: Path to workspace directory
            execution_id: Execution identifier

        Returns:
            Docker container instance
        """
        container_name = f"{self.container_name_prefix}-{execution_id[:8]}"
        image_name = self._get_docker_image()

        # Get container configuration
        container_config = self._get_container_config(workspace_path, container_name)

        # Apply security restrictions
        container_config = self.security_manager.apply_restrictions(container_config)

        try:
            # Create container
            container = self.docker_client.containers.create(image=image_name, name=container_name, **container_config)

            logger.info(f"Created container {container_name} for execution {execution_id}")
            return container

        except Exception as e:
            # Check if it's an ImageNotFound error (only if docker is available)
            if DOCKER_AVAILABLE and docker and hasattr(docker, "errors") and isinstance(e, docker.errors.ImageNotFound):
                # Try to build image if not found
                await self._build_docker_image()
                container = self.docker_client.containers.create(
                    image=image_name, name=container_name, **container_config
                )
                return container
            else:
                raise ContainerError(f"Failed to create container: {e}")

    async def _run_container(self, container, code: str, execution_id: str) -> ExecutorResult:
        """
        Run container and capture output.

        Args:
            container: Docker container instance
            code: Code being executed
            execution_id: Execution identifier

        Returns:
            ExecutorResult with execution output and metadata
        """
        try:
            # Start container
            container.start()

            # Wait for container to complete with timeout
            timeout = self.security_manager.get_resource_limits().get("max_execution_time", 30)

            try:
                exit_code = container.wait(timeout=timeout)
                if isinstance(exit_code, dict):
                    exit_code = exit_code.get("StatusCode", 0)
            except Exception:
                # Container timed out or failed
                container.kill()
                exit_code = 124  # Timeout exit code

            # Get output and errors
            try:
                output = container.logs(stdout=True, stderr=False).decode("utf-8")
                error_output = container.logs(stdout=False, stderr=True).decode("utf-8")
            except Exception as e:
                output = ""
                error_output = f"Failed to retrieve container logs: {e}"

            return ExecutorResult(
                output=output,
                error=error_output if error_output else None,
                exit_code=exit_code,
                execution_time=0,  # Will be set by caller
                container_id=container.id,
                metadata={
                    "container_name": container.name,
                    "image": container.image.tags[0] if container.image.tags else "unknown",
                },
            )

        except Exception as e:
            raise ContainerError(f"Container execution failed: {e}")

    async def _cleanup_container(self, container):
        """
        Clean up container after execution.

        Args:
            container: Docker container instance
        """
        try:
            # Stop container if still running
            if container.status == "running":
                container.stop(timeout=5)

            # Remove container
            container.remove(force=True)

            logger.debug(f"Cleaned up container {container.name}")

        except Exception as e:
            logger.warning(f"Failed to cleanup container {container.name}: {e}")

    async def _build_docker_image(self):
        """
        Build Docker image for this executor.
        Override in subclasses to provide specific build logic.
        """
        if not DOCKER_AVAILABLE or not self.docker_client:
            raise ContainerError("Docker not available - cannot build image")

        dockerfile_path = self._get_dockerfile_path()
        image_name = self._get_docker_image()

        if not dockerfile_path.exists():
            raise ContainerError(f"Dockerfile not found: {dockerfile_path}")

        try:
            # Build image
            self.docker_client.images.build(
                path=str(dockerfile_path.parent), dockerfile=dockerfile_path.name, tag=image_name, rm=True, forcerm=True
            )

            logger.info(f"Built Docker image {image_name}")

        except Exception as e:
            raise ContainerError(f"Failed to build Docker image: {e}")

    def _get_docker_image(self) -> str:
        """Get Docker image name for this executor."""
        return f"vana-sandbox-{self.language}:latest"

    def _get_dockerfile_path(self) -> Path:
        """Get path to Dockerfile for this executor."""
        return Path(__file__).parent.parent / "containers" / f"Dockerfile.{self.language}"

    def _get_code_filename(self) -> str:
        """Get filename for code file. Override in subclasses."""
        return f"code.{self.language}"

    def _get_container_config(self, workspace_path: Path, container_name: str) -> Dict[str, Any]:
        """
        Get base container configuration.
        Override in subclasses to customize.

        Args:
            workspace_path: Path to workspace directory
            container_name: Container name

        Returns:
            Container configuration dictionary
        """
        return {
            "volumes": {str(workspace_path): {"bind": "/workspace", "mode": "rw"}},
            "working_dir": "/workspace",
            "detach": True,
            "auto_remove": False,  # We'll remove manually for better control
            "command": self._get_execution_command(),
            "environment": self._get_environment_variables(),
        }

    def _get_execution_command(self) -> List[str]:
        """Get command to execute code. Override in subclasses."""
        return ["echo", "Base executor - override _get_execution_command()"]

    def _get_environment_variables(self) -> Dict[str, str]:
        """Get environment variables for container."""
        return {"HOME": "/workspace", "USER": "sandbox", "SHELL": "/bin/bash"}

    async def _execute_fallback(self, code: str, execution_id: str, start_time: float) -> ExecutorResult:
        """
        Fallback execution method when Docker is not available.

        This provides basic code execution without containerization.
        Override in subclasses to provide language-specific fallback execution.

        Args:
            code: Code to execute
            execution_id: Execution identifier
            start_time: Execution start time

        Returns:
            ExecutorResult with fallback execution results
        """
        return ExecutorResult(
            output=f"Fallback execution for {self.language} not implemented",
            error=f"Docker not available and no fallback execution implemented for {self.language}",
            exit_code=1,
            execution_time=time.time() - start_time,
            container_id=None,
            metadata={"fallback_execution": True, "docker_available": False, "language": self.language},
        )
