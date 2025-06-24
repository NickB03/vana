"""
Test Infrastructure Setup and Validation

This module provides comprehensive setup and validation for the AI agent
testing infrastructure, ensuring all components are properly configured
and functional.
"""

import asyncio
import logging
import sys
from pathlib import Path
from typing import Dict, Optional

# Add project root to path for imports
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from tests.framework import (
    EnvironmentConfig,
    EnvironmentType,
    MockServiceManager,
    PerformanceMonitor,
    TestEnvironment,
    TestFixtureManager,
    create_mock_service_manager,
    create_test_agent_client,
)


class TestInfrastructureSetup:
    """
    Comprehensive test infrastructure setup and validation.

    Provides:
    - Infrastructure component initialization
    - Validation of all framework components
    - Integration testing of infrastructure
    - Health checks and diagnostics
    """

    def __init__(self):
        self.logger = logging.getLogger("test_infrastructure_setup")
        self.setup_logging()

        # Infrastructure components
        self.test_environment: Optional[TestEnvironment] = None
        self.mock_service_manager: Optional[MockServiceManager] = None
        self.fixture_manager: Optional[TestFixtureManager] = None
        self.performance_monitor: Optional[PerformanceMonitor] = None

        # Setup status
        self.setup_complete = False
        self.validation_results: Dict[str, bool] = {}

    def setup_logging(self):
        """Configure logging for infrastructure setup"""
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            handlers=[
                logging.StreamHandler(sys.stdout),
                logging.FileHandler("test_infrastructure.log"),
            ],
        )

    async def initialize_infrastructure(self) -> bool:
        """Initialize all test infrastructure components"""
        self.logger.info("Starting test infrastructure initialization")

        try:
            # Initialize test environment
            await self._initialize_test_environment()

            # Initialize mock service manager
            await self._initialize_mock_services()

            # Initialize fixture manager
            await self._initialize_fixture_manager()

            # Initialize performance monitor
            await self._initialize_performance_monitor()

            self.setup_complete = True
            self.logger.info("Test infrastructure initialization complete")
            return True

        except Exception as e:
            self.logger.error(f"Failed to initialize test infrastructure: {e}")
            return False

    async def _initialize_test_environment(self):
        """Initialize test environment"""
        self.logger.info("Initializing test environment")

        config = EnvironmentConfig(
            env_type=EnvironmentType.INTEGRATION,
            base_url="https://vana-dev-960076421399.us-central1.run.app",
            timeout=30,
            enable_logging=True,
            log_level="INFO",
            cleanup_on_exit=True,
        )

        self.test_environment = TestEnvironment(config)
        self.logger.info("Test environment initialized")

    async def _initialize_mock_services(self):
        """Initialize mock service manager"""
        self.logger.info("Initializing mock service manager")

        self.mock_service_manager = create_mock_service_manager()
        self.logger.info("Mock service manager initialized")

    async def _initialize_fixture_manager(self):
        """Initialize test fixture manager"""
        self.logger.info("Initializing test fixture manager")

        self.fixture_manager = TestFixtureManager()
        self.logger.info("Test fixture manager initialized")

    async def _initialize_performance_monitor(self):
        """Initialize performance monitor"""
        self.logger.info("Initializing performance monitor")

        self.performance_monitor = PerformanceMonitor(buffer_size=1000)
        await self.performance_monitor.start_monitoring(interval=1.0)
        self.logger.info("Performance monitor initialized")

    async def validate_infrastructure(self) -> Dict[str, bool]:
        """Validate all infrastructure components"""
        self.logger.info("Starting infrastructure validation")

        validation_tasks = [
            ("test_environment", self._validate_test_environment()),
            ("mock_services", self._validate_mock_services()),
            ("fixture_manager", self._validate_fixture_manager()),
            ("performance_monitor", self._validate_performance_monitor()),
            ("agent_integration", self._validate_agent_integration()),
        ]

        results = {}
        for component_name, validation_task in validation_tasks:
            try:
                result = await validation_task
                results[component_name] = result
                status = "✅ PASS" if result else "❌ FAIL"
                self.logger.info(f"Validation {component_name}: {status}")
            except Exception as e:
                results[component_name] = False
                self.logger.error(f"Validation {component_name} failed: {e}")

        self.validation_results = results
        overall_success = all(results.values())

        if overall_success:
            self.logger.info("✅ All infrastructure validation tests passed")
        else:
            failed_components = [name for name, result in results.items() if not result]
            self.logger.error(
                f"❌ Infrastructure validation failed for: {failed_components}"
            )

        return results

    async def _validate_test_environment(self) -> bool:
        """Validate test environment functionality"""
        if not self.test_environment:
            return False

        try:
            # Test agent environment creation
            async with self.test_environment.agent_context("test_agent") as env:
                if not env or env.agent_id != "test_agent":
                    return False

            # Test multi-agent environment
            multi_env = await self.test_environment.simulate_multi_agent_environment(
                ["agent1", "agent2"]
            )
            if len(multi_env) != 2:
                return False

            # Cleanup
            await self.test_environment.reset_environment()
            return True

        except Exception as e:
            self.logger.error(f"Test environment validation failed: {e}")
            return False

    async def _validate_mock_services(self) -> bool:
        """Validate mock service functionality"""
        if not self.mock_service_manager:
            return False

        try:
            # Start all mock services
            await self.mock_service_manager.start_all_services()

            # Validate services are active
            stats = self.mock_service_manager.get_manager_stats()
            if stats["active_services"] == 0:
                return False

            # Stop all services
            await self.mock_service_manager.stop_all_services()
            return True

        except Exception as e:
            self.logger.error(f"Mock services validation failed: {e}")
            return False

    async def _validate_fixture_manager(self) -> bool:
        """Validate test fixture manager functionality"""
        if not self.fixture_manager:
            return False

        try:
            # Create test fixtures
            from tests.framework.test_data_manager import QueryType

            agent_fixture = self.fixture_manager.create_agent_test_fixture(
                "test_agent", QueryType.FACTUAL, 3
            )

            multi_agent_fixture = self.fixture_manager.create_multi_agent_test_fixture(
                "test_scenario", ["agent1", "agent2"], "coordination"
            )

            # Validate fixtures
            if not agent_fixture or not multi_agent_fixture:
                return False

            # Test fixture retrieval
            retrieved = self.fixture_manager.get_fixture(agent_fixture.name)
            if not retrieved or retrieved.name != agent_fixture.name:
                return False

            # Cleanup
            await self.fixture_manager.cleanup_all_fixtures()
            return True

        except Exception as e:
            self.logger.error(f"Fixture manager validation failed: {e}")
            return False

    async def _validate_performance_monitor(self) -> bool:
        """Validate performance monitor functionality"""
        if not self.performance_monitor:
            return False

        try:
            # Record test metrics
            from tests.framework.performance_monitor import MetricType

            self.performance_monitor.record_metric(MetricType.RESPONSE_TIME, 1.5)
            self.performance_monitor.record_metric(MetricType.MEMORY_USAGE, 100.0)

            # Test request tracking
            self.performance_monitor.start_request("test_request")
            await asyncio.sleep(0.1)
            self.performance_monitor.end_request("test_request", success=True)

            # Validate metrics collection
            summary = self.performance_monitor.get_metric_summary(
                MetricType.RESPONSE_TIME
            )
            if not summary or summary.get("count", 0) == 0:
                return False

            return True

        except Exception as e:
            self.logger.error(f"Performance monitor validation failed: {e}")
            return False

    async def _validate_agent_integration(self) -> bool:
        """Validate integration with actual VANA agents"""
        try:
            # Create test agent client
            agent_client = await create_test_agent_client("vana")

            # Test basic agent communication
            response = await agent_client.query("echo test message")
            if not response or not response.content:
                return False

            # Test tool detection
            if not response.tools_used or "echo" not in response.tools_used:
                return False

            return True

        except Exception as e:
            self.logger.error(f"Agent integration validation failed: {e}")
            return False

    async def run_infrastructure_health_check(self) -> Dict[str, any]:
        """Run comprehensive infrastructure health check"""
        self.logger.info("Running infrastructure health check")

        health_status = {
            "infrastructure_initialized": self.setup_complete,
            "validation_results": self.validation_results,
            "component_stats": {},
            "overall_health": "unknown",
        }

        if self.setup_complete:
            # Collect component statistics
            if self.test_environment:
                health_status["component_stats"]["test_environment"] = (
                    self.test_environment.get_environment_stats()
                )

            if self.mock_service_manager:
                health_status["component_stats"]["mock_services"] = (
                    self.mock_service_manager.get_manager_stats()
                )

            if self.fixture_manager:
                health_status["component_stats"]["fixture_manager"] = (
                    self.fixture_manager.get_manager_stats()
                )

            if self.performance_monitor:
                health_status["component_stats"]["performance_monitor"] = (
                    self.performance_monitor.get_monitor_stats()
                )

        # Determine overall health
        if self.setup_complete and all(self.validation_results.values()):
            health_status["overall_health"] = "healthy"
        elif self.setup_complete:
            health_status["overall_health"] = "degraded"
        else:
            health_status["overall_health"] = "unhealthy"

        self.logger.info(f"Infrastructure health: {health_status['overall_health']}")
        return health_status

    async def cleanup_infrastructure(self):
        """Clean up all infrastructure components"""
        self.logger.info("Starting infrastructure cleanup")

        cleanup_tasks = []

        if self.performance_monitor:
            cleanup_tasks.append(self.performance_monitor.stop_monitoring())

        if self.mock_service_manager:
            cleanup_tasks.append(self.mock_service_manager.stop_all_services())

        if self.fixture_manager:
            cleanup_tasks.append(self.fixture_manager.cleanup_all_fixtures())

        if self.test_environment:
            cleanup_tasks.append(self.test_environment.cleanup())

        # Execute all cleanup tasks
        if cleanup_tasks:
            await asyncio.gather(*cleanup_tasks, return_exceptions=True)

        self.logger.info("Infrastructure cleanup complete")


async def main():
    """Main function for infrastructure setup and validation"""
    setup = TestInfrastructureSetup()

    try:
        # Initialize infrastructure
        success = await setup.initialize_infrastructure()
        if not success:
            print("❌ Infrastructure initialization failed")
            return 1

        # Validate infrastructure
        validation_results = await setup.validate_infrastructure()

        # Run health check
        health_status = await setup.run_infrastructure_health_check()

        # Print results
        print("\n" + "=" * 60)
        print("TEST INFRASTRUCTURE SETUP RESULTS")
        print("=" * 60)

        for component, result in validation_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{component:25} {status}")

        print(f"\nOverall Health: {health_status['overall_health'].upper()}")

        if all(validation_results.values()):
            print("\n🎉 Test infrastructure is ready for comprehensive testing!")
            return 0
        else:
            print("\n⚠️  Some infrastructure components failed validation")
            return 1

    except Exception as e:
        print(f"❌ Infrastructure setup failed: {e}")
        return 1

    finally:
        await setup.cleanup_infrastructure()


if __name__ == "__main__":
    exit_code = asyncio.run(main())
