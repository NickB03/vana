"""
Test Environment Manager for AI Agent Testing

This module provides comprehensive test environment management including
agent simulation, environment isolation, and test state management.
"""

import asyncio
import logging
import os
import tempfile
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

import pytest


class EnvironmentType(Enum):
    """Test environment types"""

    UNIT = "unit"
    INTEGRATION = "integration"
    E2E = "e2e"
    PERFORMANCE = "performance"
    SECURITY = "security"


@dataclass
class EnvironmentConfig:
    """Configuration for test environment"""

    env_type: EnvironmentType
    base_url: str = "https://vana-dev-960076421399.us-central1.run.app"
    timeout: int = 30
    max_retries: int = 3
    enable_logging: bool = True
    log_level: str = "INFO"
    temp_dir: Optional[Path] = None
    cleanup_on_exit: bool = True
    mock_external_services: bool = False
    environment_variables: Dict[str, str] = field(default_factory=dict)


@dataclass
class AgentEnvironment:
    """Represents an isolated agent test environment"""

    agent_id: str
    base_url: str
    session_id: Optional[str] = None
    user_id: str = "test_user"
    app_id: str = "vana"
    context: Dict[str, Any] = field(default_factory=dict)
    active_tools: Set[str] = field(default_factory=set)
    performance_metrics: Dict[str, float] = field(default_factory=dict)


class TestEnvironment:
    """
    Comprehensive test environment manager for AI agent testing.

    Provides:
    - Agent simulation environments
    - Environment isolation and cleanup
    - Test state management
    - Performance monitoring
    - Mock service integration
    """

    def __init__(self, config: EnvironmentConfig):
        self.config = config
        self.logger = self._setup_logging()
        self.temp_dir = config.temp_dir or Path(tempfile.mkdtemp(prefix="vana_test_"))
        self.active_environments: Dict[str, AgentEnvironment] = {}
        self.cleanup_tasks: List[asyncio.Task] = []
        self._setup_environment_variables()

    def _setup_logging(self) -> logging.Logger:
        """Set up logging for test environment"""
        logger = logging.getLogger(f"test_env_{self.config.env_type.value}")

        if self.config.enable_logging:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
            logger.setLevel(getattr(logging, self.config.log_level))

        return logger

    def _setup_environment_variables(self):
        """Set up environment variables for testing"""
        # Set default test environment variables
        test_env_vars = {
            "VANA_TEST_MODE": "true",
            "VANA_BASE_URL": self.config.base_url,
            "VANA_TIMEOUT": str(self.config.timeout),
            "VANA_LOG_LEVEL": self.config.log_level,
            "VANA_TEMP_DIR": str(self.temp_dir),
        }

        # Add custom environment variables
        test_env_vars.update(self.config.environment_variables)

        # Set environment variables
        for key, value in test_env_vars.items():
            os.environ[key] = value
            self.logger.debug(f"Set environment variable: {key}={value}")

    async def create_agent_environment(
        self, agent_id: str, **kwargs
    ) -> AgentEnvironment:
        """Create an isolated agent test environment"""
        self.logger.info(f"Creating agent environment for: {agent_id}")

        # Create agent environment
        env = AgentEnvironment(
            agent_id=agent_id,
            base_url=self.config.base_url,
            user_id=kwargs.get("user_id", "test_user"),
            app_id=kwargs.get("app_id", "vana"),
            context=kwargs.get("context", {}),
        )

        # Store environment
        self.active_environments[agent_id] = env

        # Create agent-specific temp directory
        agent_temp_dir = self.temp_dir / f"agent_{agent_id}"
        agent_temp_dir.mkdir(exist_ok=True)
        env.context["temp_dir"] = str(agent_temp_dir)

        self.logger.info(f"Agent environment created: {agent_id}")
        return env

    async def get_agent_environment(self, agent_id: str) -> Optional[AgentEnvironment]:
        """Get existing agent environment"""
        return self.active_environments.get(agent_id)

    async def cleanup_agent_environment(self, agent_id: str):
        """Clean up specific agent environment"""
        if agent_id in self.active_environments:
            env = self.active_environments[agent_id]
            self.logger.info(f"Cleaning up agent environment: {agent_id}")

            # Clean up agent temp directory
            agent_temp_dir = Path(env.context.get("temp_dir", ""))
            if agent_temp_dir.exists():
                import shutil

                shutil.rmtree(agent_temp_dir, ignore_errors=True)

            # Remove from active environments
            del self.active_environments[agent_id]
            self.logger.info(f"Agent environment cleaned up: {agent_id}")

    @asynccontextmanager
    async def agent_context(self, agent_id: str, **kwargs):
        """Context manager for agent environment lifecycle"""
        env = await self.create_agent_environment(agent_id, **kwargs)
        try:
            yield env
        finally:
            await self.cleanup_agent_environment(agent_id)

    async def simulate_multi_agent_environment(
        self, agent_ids: List[str], **kwargs
    ) -> Dict[str, AgentEnvironment]:
        """Create multiple agent environments for coordination testing"""
        self.logger.info(f"Creating multi-agent environment: {agent_ids}")

        environments = {}
        for agent_id in agent_ids:
            env = await self.create_agent_environment(agent_id, **kwargs)
            environments[agent_id] = env

        # Set up inter-agent communication context
        for env in environments.values():
            env.context["peer_agents"] = [
                aid for aid in agent_ids if aid != env.agent_id
            ]
            env.context["multi_agent_session"] = True

        self.logger.info(
            f"Multi-agent environment created with {len(environments)} agents"
        )
        return environments

    async def reset_environment(self):
        """Reset the test environment to clean state"""
        self.logger.info("Resetting test environment")

        # Clean up all agent environments
        for agent_id in list(self.active_environments.keys()):
            await self.cleanup_agent_environment(agent_id)

        # Cancel cleanup tasks
        for task in self.cleanup_tasks:
            if not task.done():
                task.cancel()
        self.cleanup_tasks.clear()

        self.logger.info("Test environment reset complete")

    async def cleanup(self):
        """Clean up the entire test environment"""
        self.logger.info("Starting test environment cleanup")

        # Reset environment first
        await self.reset_environment()

        # Clean up temp directory if configured
        if self.config.cleanup_on_exit and self.temp_dir.exists():
            import shutil

            shutil.rmtree(self.temp_dir, ignore_errors=True)
            self.logger.info(f"Cleaned up temp directory: {self.temp_dir}")

        self.logger.info("Test environment cleanup complete")

    def get_environment_stats(self) -> Dict[str, Any]:
        """Get statistics about the test environment"""
        return {
            "environment_type": self.config.env_type.value,
            "active_agents": len(self.active_environments),
            "agent_ids": list(self.active_environments.keys()),
            "temp_dir": str(self.temp_dir),
            "base_url": self.config.base_url,
            "cleanup_tasks": len(self.cleanup_tasks),
        }


# Pytest fixtures for test environment
@pytest.fixture
async def test_environment():
    """Pytest fixture for test environment"""
    config = EnvironmentConfig(
        env_type=EnvironmentType.UNIT, enable_logging=True, log_level="DEBUG"
    )

    env = TestEnvironment(config)
    try:
        yield env
    finally:
        await env.cleanup()


@pytest.fixture
async def integration_environment():
    """Pytest fixture for integration test environment"""
    config = EnvironmentConfig(
        env_type=EnvironmentType.INTEGRATION,
        timeout=60,
        enable_logging=True,
        log_level="INFO",
    )

    env = TestEnvironment(config)
    try:
        yield env
    finally:
        await env.cleanup()


@pytest.fixture
async def performance_environment():
    """Pytest fixture for performance test environment"""
    config = EnvironmentConfig(
        env_type=EnvironmentType.PERFORMANCE,
        timeout=120,
        enable_logging=True,
        log_level="WARNING",
        mock_external_services=True,
    )

    env = TestEnvironment(config)
    try:
        yield env
    finally:
        await env.cleanup()
