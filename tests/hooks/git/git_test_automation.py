"""
Git Test Automation Framework
=============================

Automated testing orchestration system for Git hook integration. This framework provides
comprehensive test automation capabilities including:

- Continuous Integration test execution
- Automated test discovery and scheduling
- Test environment provisioning and cleanup
- Parallel test execution with resource management
- Test result aggregation and reporting
- Failure analysis and debugging assistance
- Test data management and seeding
- Configuration-driven test execution
- Integration with external CI/CD systems

Author: Test Automation Team
Version: 2.0.0
Dependencies: pytest, asyncio, pydantic, click
"""

import asyncio
import json
import logging
import os
import shutil
import subprocess
import sys
import tempfile
import time
import traceback
from collections import defaultdict
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple, Union

import click
import git
import pytest
from git import Repo

# Pydantic for configuration validation
try:
    from pydantic import BaseModel, Field, validator
    HAS_PYDANTIC = True
except ImportError:
    HAS_PYDANTIC = False


class TestType(Enum):
    """Types of tests in the automation framework"""
    UNIT = "unit"
    INTEGRATION = "integration"
    PERFORMANCE = "performance"
    E2E = "e2e"
    SMOKE = "smoke"
    REGRESSION = "regression"
    STRESS = "stress"


class TestStatus(Enum):
    """Test execution status"""
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    ERROR = "error"
    TIMEOUT = "timeout"


class Priority(Enum):
    """Test execution priority"""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class TestConfiguration:
    """Test configuration and metadata"""
    test_id: str
    name: str
    description: str
    test_type: TestType
    priority: Priority
    module_path: str
    test_function: str
    timeout_seconds: int = 300
    retry_count: int = 1
    dependencies: list[str] = None
    environment_variables: dict[str, str] = None
    required_resources: dict[str, Any] = None
    cleanup_after: bool = True
    parallel_safe: bool = True

    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = []
        if self.environment_variables is None:
            self.environment_variables = {}
        if self.required_resources is None:
            self.required_resources = {}


@dataclass
class TestResult:
    """Comprehensive test execution result"""
    test_id: str
    status: TestStatus
    start_time: datetime
    end_time: datetime | None = None
    execution_time_seconds: float = 0.0
    exit_code: int = 0
    stdout: str = ""
    stderr: str = ""
    exception_info: str | None = None
    artifacts: list[str] = None
    metrics: dict[str, Any] = None
    resource_usage: dict[str, float] = None

    def __post_init__(self):
        if self.artifacts is None:
            self.artifacts = []
        if self.metrics is None:
            self.metrics = {}
        if self.resource_usage is None:
            self.resource_usage = {}


@dataclass
class TestSuite:
    """Test suite configuration"""
    suite_id: str
    name: str
    description: str
    tests: list[TestConfiguration]
    execution_order: str = "priority"  # priority, dependency, parallel
    max_parallel_tests: int = 4
    suite_timeout_minutes: int = 60
    continue_on_failure: bool = True
    cleanup_on_completion: bool = True


class TestEnvironmentManager:
    """Manages test environments and resources"""

    def __init__(self, workspace: Path):
        self.workspace = workspace
        self.active_environments = {}
        self.resource_locks = set()
        self.logger = logging.getLogger(__name__)

    async def create_environment(self, env_id: str, config: dict[str, Any]) -> dict[str, Any]:
        """Create isolated test environment"""
        env_path = self.workspace / "environments" / env_id
        env_path.mkdir(parents=True, exist_ok=True)

        environment = {
            "id": env_id,
            "path": str(env_path),
            "config": config,
            "created_at": datetime.now(),
            "repositories": {},
            "processes": [],
            "temp_files": [],
        }

        # Setup Git repositories if specified
        if "repositories" in config:
            for repo_config in config["repositories"]:
                repo = await self._create_test_repository(env_path, repo_config)
                environment["repositories"][repo_config["name"]] = repo

        # Setup environment variables
        if "environment_variables" in config:
            environment["env_vars"] = config["environment_variables"]

        # Setup resource allocations
        if "resources" in config:
            await self._allocate_resources(env_id, config["resources"])

        self.active_environments[env_id] = environment
        self.logger.info(f"Created test environment: {env_id}")

        return environment

    async def _create_test_repository(self, env_path: Path, repo_config: dict[str, Any]) -> Repo:
        """Create test repository in environment"""
        repo_path = env_path / "repos" / repo_config["name"]
        repo_path.mkdir(parents=True, exist_ok=True)

        # Initialize repository
        repo = Repo.init(repo_path)

        # Configure repository
        with repo.config_writer() as config:
            config.set_value("user", "name", "Test Automation")
            config.set_value("user", "email", "automation@test.local")

        # Create initial content based on template
        template = repo_config.get("template", "minimal")
        await self._apply_repository_template(repo, repo_path, template)

        # Install hooks if specified
        if repo_config.get("install_hooks", False):
            await self._install_test_hooks(repo_path)

        # Make initial commit
        repo.index.add_items(["."])
        repo.index.commit("Initial test repository setup")

        return repo

    async def _apply_repository_template(self, repo: Repo, repo_path: Path, template: str):
        """Apply repository template"""
        if template == "minimal":
            (repo_path / "README.md").write_text("# Test Repository")
            (repo_path / ".gitignore").write_text("*.log\n.DS_Store")

        elif template == "frontend":
            # Create frontend structure
            dirs = ["src/components", "src/hooks", "__tests__", "public"]
            for dir_name in dirs:
                (repo_path / dir_name).mkdir(parents=True, exist_ok=True)

            # Package.json
            package_json = {
                "name": "test-frontend",
                "version": "1.0.0",
                "scripts": {
                    "dev": "next dev",
                    "build": "next build",
                    "test": "jest"
                },
                "dependencies": {
                    "react": "^18.3.1",
                    "next": "^15.4.6"
                }
            }
            (repo_path / "package.json").write_text(json.dumps(package_json, indent=2))

            # Sample component
            component = '''import React from 'react'
import { Button } from '@/components/ui/button'

export const TestComponent = () => {
  return <Button data-testid="test-button">Test</Button>
}
'''
            (repo_path / "src/components/TestComponent.tsx").write_text(component)

        elif template == "backend":
            # Create backend structure
            dirs = ["app/api", "app/models", "tests"]
            for dir_name in dirs:
                (repo_path / dir_name).mkdir(parents=True, exist_ok=True)

            # FastAPI app
            server_code = '''from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
async def health():
    return {"status": "healthy"}
'''
            (repo_path / "app/server.py").write_text(server_code)

            # Requirements
            (repo_path / "requirements.txt").write_text("fastapi\nuvicorn\npytest")

    async def _install_test_hooks(self, repo_path: Path):
        """Install Git hooks for testing"""
        hooks_dir = repo_path / ".git" / "hooks"

        # Test pre-commit hook
        pre_commit = '''#!/bin/bash
echo "Test pre-commit hook executing"
exit 0
'''
        (hooks_dir / "pre-commit").write_text(pre_commit)
        (hooks_dir / "pre-commit").chmod(0o755)

        # Test post-commit hook
        post_commit = '''#!/bin/bash
echo "Test post-commit hook executing"
exit 0
'''
        (hooks_dir / "post-commit").write_text(post_commit)
        (hooks_dir / "post-commit").chmod(0o755)

    async def _allocate_resources(self, env_id: str, resources: dict[str, Any]):
        """Allocate resources for environment"""
        for resource_type, config in resources.items():
            if resource_type == "memory":
                # Memory allocation tracking
                pass
            elif resource_type == "cpu":
                # CPU allocation tracking
                pass
            elif resource_type == "network":
                # Network resource allocation
                pass

    async def cleanup_environment(self, env_id: str):
        """Cleanup test environment"""
        if env_id not in self.active_environments:
            return

        environment = self.active_environments[env_id]

        # Stop any running processes
        for process in environment.get("processes", []):
            if process.poll() is None:
                process.terminate()
                await asyncio.sleep(1)
                if process.poll() is None:
                    process.kill()

        # Close repositories
        for repo in environment.get("repositories", {}).values():
            if hasattr(repo, 'close'):
                repo.close()

        # Cleanup temporary files
        for temp_file in environment.get("temp_files", []):
            try:
                Path(temp_file).unlink(missing_ok=True)
            except Exception:
                pass

        # Remove environment directory
        env_path = Path(environment["path"])
        if env_path.exists():
            shutil.rmtree(env_path, ignore_errors=True)

        # Release resources
        await self._release_resources(env_id)

        del self.active_environments[env_id]
        self.logger.info(f"Cleaned up test environment: {env_id}")

    async def _release_resources(self, env_id: str):
        """Release allocated resources"""
        # Remove any resource locks for this environment
        self.resource_locks.discard(env_id)


class TestOrchestrator:
    """Orchestrates test execution with automation features"""

    def __init__(self, workspace: Path, max_workers: int = 4):
        self.workspace = workspace
        self.max_workers = max_workers
        self.environment_manager = TestEnvironmentManager(workspace)
        self.test_registry = {}
        self.execution_history = []
        self.logger = logging.getLogger(__name__)

        # Test discovery patterns
        self.test_patterns = {
            TestType.UNIT: ["test_*_unit.py", "*_unit_test.py"],
            TestType.INTEGRATION: ["test_*_integration.py", "*_integration_test.py"],
            TestType.PERFORMANCE: ["test_*_performance.py", "*_performance_test.py"],
            TestType.E2E: ["test_*_e2e.py", "*_e2e_test.py"],
        }

    async def initialize(self):
        """Initialize test orchestrator"""
        self.workspace.mkdir(parents=True, exist_ok=True)

        # Create workspace structure
        for subdir in ["environments", "results", "reports", "artifacts", "config"]:
            (self.workspace / subdir).mkdir(exist_ok=True)

        self.logger.info("Test orchestrator initialized")

    async def discover_tests(self, test_directory: Path, test_types: list[TestType] = None) -> list[TestConfiguration]:
        """Automatically discover tests based on patterns"""
        if test_types is None:
            test_types = list(TestType)

        discovered_tests = []

        for test_type in test_types:
            patterns = self.test_patterns.get(test_type, ["test_*.py"])

            for pattern in patterns:
                for test_file in test_directory.rglob(pattern):
                    if test_file.is_file():
                        tests = await self._extract_tests_from_file(test_file, test_type)
                        discovered_tests.extend(tests)

        self.logger.info(f"Discovered {len(discovered_tests)} tests")
        return discovered_tests

    async def _extract_tests_from_file(self, test_file: Path, test_type: TestType) -> list[TestConfiguration]:
        """Extract test functions from file"""
        tests = []

        try:
            # Simple test function discovery using AST or regex
            content = test_file.read_text()

            # Find test functions (simplified approach)
            import re
            test_functions = re.findall(r'def (test_\w+)', content)

            for func_name in test_functions:
                test_id = f"{test_file.stem}::{func_name}"

                # Determine priority based on function name
                priority = Priority.MEDIUM
                if "critical" in func_name.lower():
                    priority = Priority.CRITICAL
                elif "high" in func_name.lower():
                    priority = Priority.HIGH
                elif "low" in func_name.lower():
                    priority = Priority.LOW

                # Determine timeout based on test type
                timeout_map = {
                    TestType.UNIT: 30,
                    TestType.INTEGRATION: 120,
                    TestType.PERFORMANCE: 300,
                    TestType.E2E: 600,
                    TestType.SMOKE: 60,
                }

                test_config = TestConfiguration(
                    test_id=test_id,
                    name=func_name.replace("_", " ").title(),
                    description=f"{test_type.value} test: {func_name}",
                    test_type=test_type,
                    priority=priority,
                    module_path=str(test_file),
                    test_function=func_name,
                    timeout_seconds=timeout_map.get(test_type, 60),
                    parallel_safe=test_type in [TestType.UNIT, TestType.PERFORMANCE]
                )

                tests.append(test_config)

        except Exception as e:
            self.logger.error(f"Error extracting tests from {test_file}: {e}")

        return tests

    async def register_test_suite(self, suite: TestSuite):
        """Register test suite for execution"""
        self.test_registry[suite.suite_id] = suite
        self.logger.info(f"Registered test suite: {suite.name}")

    async def execute_test_suite(self, suite_id: str, environment_config: dict[str, Any] = None) -> dict[str, TestResult]:
        """Execute test suite with full automation"""
        if suite_id not in self.test_registry:
            raise ValueError(f"Test suite not found: {suite_id}")

        suite = self.test_registry[suite_id]
        self.logger.info(f"Executing test suite: {suite.name}")

        start_time = datetime.now()
        results = {}

        try:
            # Create test environment
            env_config = environment_config or {"type": "default"}
            environment = await self.environment_manager.create_environment(
                f"suite_{suite_id}_{int(time.time())}", env_config
            )

            # Plan test execution
            execution_plan = await self._create_execution_plan(suite)

            # Execute tests according to plan
            if suite.execution_order == "parallel":
                results = await self._execute_tests_parallel(execution_plan, environment)
            elif suite.execution_order == "dependency":
                results = await self._execute_tests_by_dependency(execution_plan, environment)
            else:  # priority
                results = await self._execute_tests_by_priority(execution_plan, environment)

            # Generate execution summary
            await self._generate_execution_summary(suite, results, start_time)

        except Exception as e:
            self.logger.error(f"Test suite execution failed: {e}")

        finally:
            # Cleanup environment if requested
            if suite.cleanup_on_completion:
                await self.environment_manager.cleanup_environment(environment["id"])

        return results

    async def _create_execution_plan(self, suite: TestSuite) -> list[list[TestConfiguration]]:
        """Create execution plan based on suite configuration"""
        if suite.execution_order == "priority":
            # Group by priority
            priority_groups = defaultdict(list)
            for test in suite.tests:
                priority_groups[test.priority.value].append(test)

            # Create execution batches (highest priority first)
            plan = []
            for priority in sorted(priority_groups.keys(), reverse=True):
                plan.append(priority_groups[priority])

            return plan

        elif suite.execution_order == "dependency":
            # Topological sort based on dependencies
            return await self._topological_sort_tests(suite.tests)

        else:  # parallel
            # Single batch with all tests
            return [suite.tests]

    async def _topological_sort_tests(self, tests: list[TestConfiguration]) -> list[list[TestConfiguration]]:
        """Sort tests based on dependencies using topological sort"""
        # Build dependency graph
        test_map = {test.test_id: test for test in tests}
        in_degree = {test.test_id: 0 for test in tests}
        graph = defaultdict(list)

        for test in tests:
            for dep in test.dependencies:
                if dep in test_map:
                    graph[dep].append(test.test_id)
                    in_degree[test.test_id] += 1

        # Topological sort
        queue = [test_id for test_id, degree in in_degree.items() if degree == 0]
        sorted_batches = []

        while queue:
            # Current batch (tests with no dependencies)
            current_batch = [test_map[test_id] for test_id in queue]
            sorted_batches.append(current_batch)

            # Process next level
            next_queue = []
            for test_id in queue:
                for neighbor in graph[test_id]:
                    in_degree[neighbor] -= 1
                    if in_degree[neighbor] == 0:
                        next_queue.append(neighbor)

            queue = next_queue

        return sorted_batches

    async def _execute_tests_parallel(self, execution_plan: list[list[TestConfiguration]], environment: dict[str, Any]) -> dict[str, TestResult]:
        """Execute tests in parallel batches"""
        results = {}

        for batch in execution_plan:
            batch_results = await self._execute_batch_parallel(batch, environment)
            results.update(batch_results)

        return results

    async def _execute_tests_by_priority(self, execution_plan: list[list[TestConfiguration]], environment: dict[str, Any]) -> dict[str, TestResult]:
        """Execute tests by priority (highest first)"""
        results = {}

        for priority_batch in execution_plan:
            # Execute high-priority tests sequentially, others in parallel
            if priority_batch and priority_batch[0].priority in [Priority.CRITICAL, Priority.HIGH]:
                for test in priority_batch:
                    test_result = await self._execute_single_test(test, environment)
                    results[test.test_id] = test_result
            else:
                batch_results = await self._execute_batch_parallel(priority_batch, environment)
                results.update(batch_results)

        return results

    async def _execute_tests_by_dependency(self, execution_plan: list[list[TestConfiguration]], environment: dict[str, Any]) -> dict[str, TestResult]:
        """Execute tests respecting dependencies"""
        results = {}

        for batch in execution_plan:
            # Execute each dependency level
            if len(batch) == 1:
                # Single test, execute directly
                test_result = await self._execute_single_test(batch[0], environment)
                results[batch[0].test_id] = test_result
            else:
                # Multiple tests without dependencies, execute in parallel
                batch_results = await self._execute_batch_parallel(batch, environment)
                results.update(batch_results)

        return results

    async def _execute_batch_parallel(self, batch: list[TestConfiguration], environment: dict[str, Any]) -> dict[str, TestResult]:
        """Execute a batch of tests in parallel"""
        if not batch:
            return {}

        # Limit parallel execution
        semaphore = asyncio.Semaphore(min(self.max_workers, len(batch)))

        async def execute_with_semaphore(test: TestConfiguration):
            async with semaphore:
                return await self._execute_single_test(test, environment)

        # Execute tests
        tasks = [execute_with_semaphore(test) for test in batch]
        results_list = await asyncio.gather(*tasks, return_exceptions=True)

        # Collect results
        results = {}
        for i, result in enumerate(results_list):
            test = batch[i]
            if isinstance(result, Exception):
                # Create error result
                results[test.test_id] = TestResult(
                    test_id=test.test_id,
                    status=TestStatus.ERROR,
                    start_time=datetime.now(),
                    exception_info=str(result)
                )
            else:
                results[test.test_id] = result

        return results

    async def _execute_single_test(self, test: TestConfiguration, environment: dict[str, Any]) -> TestResult:
        """Execute a single test with full monitoring"""
        self.logger.info(f"Executing test: {test.test_id}")

        start_time = datetime.now()
        result = TestResult(
            test_id=test.test_id,
            status=TestStatus.RUNNING,
            start_time=start_time
        )

        try:
            # Setup test environment variables
            test_env = os.environ.copy()
            test_env.update(environment.get("env_vars", {}))
            test_env.update(test.environment_variables)

            # Change to test directory
            test_path = Path(test.module_path)
            working_dir = test_path.parent

            # Execute test using pytest
            cmd = [
                sys.executable, "-m", "pytest",
                test.module_path + "::" + test.test_function,
                "-v", "--tb=short", "--no-header"
            ]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=working_dir,
                env=test_env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            # Wait for completion with timeout
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=test.timeout_seconds
                )

                result.exit_code = process.returncode
                result.stdout = stdout.decode('utf-8', errors='ignore')
                result.stderr = stderr.decode('utf-8', errors='ignore')

                # Determine status from exit code
                if result.exit_code == 0:
                    result.status = TestStatus.PASSED
                else:
                    result.status = TestStatus.FAILED

            except asyncio.TimeoutError:
                process.kill()
                result.status = TestStatus.TIMEOUT
                result.stderr = f"Test timed out after {test.timeout_seconds} seconds"

        except Exception as e:
            result.status = TestStatus.ERROR
            result.exception_info = traceback.format_exc()
            result.stderr = str(e)

        finally:
            result.end_time = datetime.now()
            result.execution_time_seconds = (result.end_time - start_time).total_seconds()

        self.logger.info(f"Test completed: {test.test_id} - {result.status.value}")
        return result

    async def _generate_execution_summary(self, suite: TestSuite, results: dict[str, TestResult], start_time: datetime):
        """Generate execution summary and save to file"""
        end_time = datetime.now()
        total_duration = (end_time - start_time).total_seconds()

        # Calculate statistics
        status_counts = defaultdict(int)
        for result in results.values():
            status_counts[result.status.value] += 1

        summary = {
            "suite_id": suite.suite_id,
            "suite_name": suite.name,
            "execution_time": {
                "start": start_time.isoformat(),
                "end": end_time.isoformat(),
                "duration_seconds": total_duration
            },
            "statistics": {
                "total_tests": len(results),
                "passed": status_counts[TestStatus.PASSED.value],
                "failed": status_counts[TestStatus.FAILED.value],
                "error": status_counts[TestStatus.ERROR.value],
                "timeout": status_counts[TestStatus.TIMEOUT.value],
                "skipped": status_counts[TestStatus.SKIPPED.value],
                "success_rate": status_counts[TestStatus.PASSED.value] / len(results) if results else 0
            },
            "results": [asdict(result) for result in results.values()]
        }

        # Save summary
        summary_file = self.workspace / "results" / f"execution_summary_{suite.suite_id}_{int(time.time())}.json"
        with open(summary_file, 'w') as f:
            json.dump(summary, f, indent=2, default=str)

        self.execution_history.append(summary)

        # Log summary
        self.logger.info("Test suite execution completed:")
        self.logger.info(f"  Total: {len(results)} tests")
        self.logger.info(f"  Passed: {status_counts[TestStatus.PASSED.value]}")
        self.logger.info(f"  Failed: {status_counts[TestStatus.FAILED.value]}")
        self.logger.info(f"  Duration: {total_duration:.2f} seconds")
        self.logger.info(f"  Success Rate: {summary['statistics']['success_rate']:.1%}")

    async def generate_test_report(self, output_format: str = "html") -> str:
        """Generate comprehensive test report"""
        if not self.execution_history:
            raise ValueError("No test execution history available")

        reports_dir = self.workspace / "reports"
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        if output_format.lower() == "html":
            return await self._generate_html_test_report(reports_dir, timestamp)
        elif output_format.lower() == "json":
            return await self._generate_json_test_report(reports_dir, timestamp)
        else:
            raise ValueError(f"Unsupported output format: {output_format}")

    async def _generate_html_test_report(self, reports_dir: Path, timestamp: str) -> str:
        """Generate HTML test report"""
        report_file = reports_dir / f"test_automation_report_{timestamp}.html"

        latest_execution = self.execution_history[-1]

        html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Automation Report</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }}
        .header {{ text-align: center; margin-bottom: 40px; }}
        .summary-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }}
        .summary-card {{ border: 1px solid #ddd; border-radius: 8px; padding: 20px; text-align: center; }}
        .passed {{ background-color: #d4edda; }}
        .failed {{ background-color: #f8d7da; }}
        .error {{ background-color: #f8d7da; }}
        .metric-value {{ font-size: 24px; font-weight: bold; }}
        .metric-label {{ font-size: 14px; color: #666; margin-top: 5px; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
        th {{ background-color: #f5f5f5; }}
        .status-passed {{ color: #28a745; }}
        .status-failed {{ color: #dc3545; }}
        .status-error {{ color: #dc3545; }}
        .status-timeout {{ color: #ffc107; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🔬 Test Automation Report</h1>
        <p>Generated on {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
        <h2>{latest_execution['suite_name']}</h2>
    </div>
    
    <div class="summary-grid">
        <div class="summary-card">
            <div class="metric-value">{latest_execution['statistics']['total_tests']}</div>
            <div class="metric-label">Total Tests</div>
        </div>
        <div class="summary-card passed">
            <div class="metric-value">{latest_execution['statistics']['passed']}</div>
            <div class="metric-label">Passed</div>
        </div>
        <div class="summary-card failed">
            <div class="metric-value">{latest_execution['statistics']['failed']}</div>
            <div class="metric-label">Failed</div>
        </div>
        <div class="summary-card error">
            <div class="metric-value">{latest_execution['statistics']['error']}</div>
            <div class="metric-label">Errors</div>
        </div>
        <div class="summary-card">
            <div class="metric-value">{latest_execution['statistics']['success_rate']:.1%}</div>
            <div class="metric-label">Success Rate</div>
        </div>
        <div class="summary-card">
            <div class="metric-value">{latest_execution['execution_time']['duration_seconds']:.1f}s</div>
            <div class="metric-label">Duration</div>
        </div>
    </div>
    
    <h3>📋 Test Results</h3>
    <table>
        <tr>
            <th>Test ID</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Details</th>
        </tr>'''

        for result in latest_execution['results']:
            status_class = f"status-{result['status']}"
            status_icon = {
                "passed": "✅",
                "failed": "❌",
                "error": "💥",
                "timeout": "⏰"
            }.get(result['status'], "❓")

            html_content += f'''
        <tr>
            <td>{result['test_id']}</td>
            <td class="{status_class}">{status_icon} {result['status'].upper()}</td>
            <td>{result['execution_time_seconds']:.2f}s</td>
            <td>'''

            if result['status'] in ['failed', 'error'] and result.get('stderr'):
                html_content += f"<details><summary>Error Details</summary><pre>{result['stderr'][:500]}...</pre></details>"
            else:
                html_content += "No issues"

            html_content += "</td></tr>"

        html_content += '''
    </table>
    
    <h3>📈 Execution History</h3>
    <table>
        <tr>
            <th>Execution Time</th>
            <th>Suite</th>
            <th>Tests</th>
            <th>Success Rate</th>
            <th>Duration</th>
        </tr>'''

        for execution in self.execution_history[-10:]:  # Last 10 executions
            html_content += f'''
        <tr>
            <td>{execution['execution_time']['start'][:19]}</td>
            <td>{execution['suite_name']}</td>
            <td>{execution['statistics']['total_tests']}</td>
            <td>{execution['statistics']['success_rate']:.1%}</td>
            <td>{execution['execution_time']['duration_seconds']:.1f}s</td>
        </tr>'''

        html_content += '''
    </table>
    
    <footer style="margin-top: 40px; text-align: center; color: #666;">
        <p>Generated by Git Hook Test Automation Framework v2.0.0</p>
    </footer>
</body>
</html>'''

        with open(report_file, 'w') as f:
            f.write(html_content)

        return str(report_file)

    async def _generate_json_test_report(self, reports_dir: Path, timestamp: str) -> str:
        """Generate JSON test report"""
        report_file = reports_dir / f"test_automation_report_{timestamp}.json"

        report_data = {
            "report_metadata": {
                "generated_at": datetime.now().isoformat(),
                "framework_version": "2.0.0",
                "total_executions": len(self.execution_history)
            },
            "latest_execution": self.execution_history[-1] if self.execution_history else None,
            "execution_history": self.execution_history,
            "registered_suites": [
                {
                    "suite_id": suite_id,
                    "name": suite.name,
                    "test_count": len(suite.tests)
                }
                for suite_id, suite in self.test_registry.items()
            ]
        }

        with open(report_file, 'w') as f:
            json.dump(report_data, f, indent=2, default=str)

        return str(report_file)

    async def cleanup(self):
        """Cleanup orchestrator resources"""
        # Cleanup all active environments
        for env_id in list(self.environment_manager.active_environments.keys()):
            await self.environment_manager.cleanup_environment(env_id)


# CLI Interface
@click.group()
def cli():
    """Git Hook Test Automation CLI"""
    pass


@cli.command()
@click.option('--workspace', '-w', type=click.Path(), default='./test_automation_workspace',
              help='Test automation workspace directory')
@click.option('--test-dir', '-t', type=click.Path(exists=True), required=True,
              help='Directory containing tests to discover')
@click.option('--test-types', '-T', multiple=True,
              type=click.Choice([t.value for t in TestType]),
              help='Types of tests to discover')
@click.option('--max-workers', '-j', type=int, default=4,
              help='Maximum number of parallel test workers')
async def discover(workspace, test_dir, test_types, max_workers):
    """Discover tests automatically"""
    workspace_path = Path(workspace)
    test_directory = Path(test_dir)

    # Convert test types
    types = [TestType(t) for t in test_types] if test_types else None

    orchestrator = TestOrchestrator(workspace_path, max_workers)
    await orchestrator.initialize()

    try:
        tests = await orchestrator.discover_tests(test_directory, types)

        click.echo(f"📋 Discovered {len(tests)} tests:")
        for test in tests:
            click.echo(f"  • {test.test_id} ({test.test_type.value}, {test.priority.name})")

        # Save discovered tests
        discovery_file = workspace_path / "config" / "discovered_tests.json"
        with open(discovery_file, 'w') as f:
            json.dump([asdict(test) for test in tests], f, indent=2, default=str)

        click.echo(f"✅ Test discovery saved to: {discovery_file}")

    finally:
        await orchestrator.cleanup()


@cli.command()
@click.option('--workspace', '-w', type=click.Path(), default='./test_automation_workspace',
              help='Test automation workspace directory')
@click.option('--suite-config', '-c', type=click.Path(exists=True), required=True,
              help='Test suite configuration file')
@click.option('--environment', '-e', type=click.Path(exists=True),
              help='Environment configuration file')
@click.option('--max-workers', '-j', type=int, default=4,
              help='Maximum number of parallel test workers')
async def execute(workspace, suite_config, environment, max_workers):
    """Execute test suite"""
    workspace_path = Path(workspace)

    orchestrator = TestOrchestrator(workspace_path, max_workers)
    await orchestrator.initialize()

    try:
        # Load suite configuration
        with open(suite_config) as f:
            suite_data = json.load(f)

        # Create test suite
        suite = TestSuite(**suite_data)
        await orchestrator.register_test_suite(suite)

        # Load environment configuration
        env_config = {}
        if environment:
            with open(environment) as f:
                env_config = json.load(f)

        # Execute suite
        click.echo(f"🚀 Executing test suite: {suite.name}")
        results = await orchestrator.execute_test_suite(suite.suite_id, env_config)

        # Generate report
        report_path = await orchestrator.generate_test_report("html")
        click.echo(f"📊 Test report generated: {report_path}")

        # Print summary
        passed = sum(1 for r in results.values() if r.status == TestStatus.PASSED)
        total = len(results)
        click.echo(f"✅ Test execution completed: {passed}/{total} tests passed")

    finally:
        await orchestrator.cleanup()


if __name__ == "__main__":
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Run CLI
    cli()
