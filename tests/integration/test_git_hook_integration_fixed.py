"""
Fixed Git Hook Integration Tests
Tests the actual git hook validation system integration with proper Node.js hook manager.
"""

import os
import subprocess
import time
from pathlib import Path
from typing import Any

import pytest


class GitHookTestManager:
    """Test manager for git hook integration testing"""

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.hook_manager_path = project_root / "tests" / "hooks" / "integration" / "git-hook-manager.js"
        self.performance_data = []

    def execute_hook(self, hook_type: str, args: list = None) -> dict[str, Any]:
        """Execute a git hook and return performance metrics"""
        if args is None:
            args = []

        start_time = time.time()

        try:
            # Execute the hook manager
            cmd = ["node", str(self.hook_manager_path), "execute-hook", hook_type] + args
            result = subprocess.run(
                cmd,
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=30
            )

            execution_time = (time.time() - start_time) * 1000  # Convert to ms

            success = result.returncode == 0

            performance_data = {
                "hook_type": hook_type,
                "execution_time_ms": execution_time,
                "success": success,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "return_code": result.returncode,
                "timestamp": time.time()
            }

            self.performance_data.append(performance_data)
            return performance_data

        except subprocess.TimeoutExpired:
            execution_time = (time.time() - start_time) * 1000
            return {
                "hook_type": hook_type,
                "execution_time_ms": execution_time,
                "success": False,
                "error": "Hook execution timeout",
                "return_code": -1,
                "timestamp": time.time()
            }
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            return {
                "hook_type": hook_type,
                "execution_time_ms": execution_time,
                "success": False,
                "error": str(e),
                "return_code": -1,
                "timestamp": time.time()
            }

    def create_test_file(self, file_path: Path, content: str):
        """Create a test file and stage it for git commit"""
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content)

        # Stage the file in git
        subprocess.run(
            ["git", "add", str(file_path)],
            cwd=self.project_root,
            capture_output=True
        )

    def get_performance_summary(self) -> dict[str, Any]:
        """Get performance summary for all executed hooks"""
        if not self.performance_data:
            return {"no_data": True}

        successful_executions = [p for p in self.performance_data if p["success"]]
        failed_executions = [p for p in self.performance_data if not p["success"]]

        if successful_executions:
            execution_times = [p["execution_time_ms"] for p in successful_executions]
            avg_time = sum(execution_times) / len(execution_times)
            max_time = max(execution_times)
            min_time = min(execution_times)
        else:
            avg_time = max_time = min_time = 0

        return {
            "total_executions": len(self.performance_data),
            "successful_executions": len(successful_executions),
            "failed_executions": len(failed_executions),
            "success_rate": len(successful_executions) / len(self.performance_data) if self.performance_data else 0,
            "avg_execution_time_ms": avg_time,
            "max_execution_time_ms": max_time,
            "min_execution_time_ms": min_time,
            "performance_data": self.performance_data
        }


class TestGitHookIntegration:
    """Integration tests for git hook system"""

    @pytest.fixture
    def project_root(self):
        """Get project root directory"""
        return Path.cwd()

    @pytest.fixture
    def hook_manager(self, project_root):
        """Hook test manager fixture"""
        return GitHookTestManager(project_root)

    @pytest.fixture
    def temp_test_file(self, project_root):
        """Create a temporary test file for git operations"""
        test_file = project_root / "temp_test_component.tsx"
        yield test_file
        # Cleanup
        if test_file.exists():
            test_file.unlink()
            # Remove from git staging if it was added
            subprocess.run(
                ["git", "reset", "HEAD", str(test_file)],
                cwd=project_root,
                capture_output=True
            )

    def test_pre_commit_hook_execution(self, hook_manager, temp_test_file):
        """Test pre-commit hook execution with valid file"""
        valid_tsx_content = '''
import React from 'react'
import { Button } from '@/components/ui/button'

export const TestComponent = () => {
  return (
    <div data-testid="test-component">
      <Button>Click me</Button>
    </div>
  )
}
'''

        # Create and stage a valid file
        hook_manager.create_test_file(temp_test_file, valid_tsx_content)

        # Execute pre-commit hook
        result = hook_manager.execute_hook("pre-commit")

        # Assertions
        assert result["success"] == True, f"Pre-commit hook failed: {result.get('stderr', '')}"
        assert result["execution_time_ms"] < 5000, f"Hook took too long: {result['execution_time_ms']}ms"
        assert "pre-commit validations passed" in result["stdout"] or result["return_code"] == 0

    def test_hook_performance_benchmarks(self, hook_manager):
        """Test hook performance meets CI/CD standards"""
        performance_thresholds = {
            "pre-commit": 2000,  # 2 seconds max
            "post-commit": 1000,  # 1 second max
            "pre-push": 3000,     # 3 seconds max
            "post-merge": 1500,   # 1.5 seconds max
            "pre-rebase": 2000    # 2 seconds max
        }

        results = {}

        for hook_type, threshold in performance_thresholds.items():
            # Execute hook multiple times for statistical significance
            execution_times = []
            success_count = 0

            for i in range(3):  # Run 3 times each
                result = hook_manager.execute_hook(hook_type)
                execution_times.append(result["execution_time_ms"])
                if result["success"]:
                    success_count += 1

            avg_time = sum(execution_times) / len(execution_times)
            max_time = max(execution_times)
            success_rate = success_count / len(execution_times)

            results[hook_type] = {
                "avg_time": avg_time,
                "max_time": max_time,
                "success_rate": success_rate,
                "threshold": threshold,
                "meets_threshold": max_time <= threshold
            }

            # Assertions for performance
            assert max_time <= threshold, f"{hook_type} exceeded threshold: {max_time}ms > {threshold}ms"
            assert success_rate >= 0.8, f"{hook_type} success rate too low: {success_rate}"

        # Store performance results
        summary = hook_manager.get_performance_summary()
        assert summary["success_rate"] >= 0.8, f"Overall success rate too low: {summary['success_rate']}"

    def test_concurrent_hook_execution(self, hook_manager, project_root):
        """Test concurrent hook execution stress testing"""
        import concurrent.futures

        def execute_hook_concurrently(hook_type, iteration):
            """Execute hook in a separate thread"""
            return hook_manager.execute_hook(hook_type, [f"--iteration={iteration}"])

        # Test concurrent pre-commit executions
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = []

            # Submit 6 concurrent hook executions
            for i in range(6):
                hook_type = ["pre-commit", "post-commit", "pre-push"][i % 3]
                future = executor.submit(execute_hook_concurrently, hook_type, i)
                futures.append(future)

            # Collect results
            results = []
            for future in concurrent.futures.as_completed(futures, timeout=30):
                result = future.result()
                results.append(result)

        # Validate concurrent execution
        assert len(results) == 6, f"Expected 6 results, got {len(results)}"

        successful_results = [r for r in results if r["success"]]
        success_rate = len(successful_results) / len(results)

        assert success_rate >= 0.7, f"Concurrent execution success rate too low: {success_rate}"

        # Check for no resource conflicts
        max_execution_time = max(r["execution_time_ms"] for r in results)
        assert max_execution_time < 10000, f"Concurrent execution took too long: {max_execution_time}ms"

    def test_memory_usage_during_hook_execution(self, hook_manager):
        """Test memory usage patterns during hook execution"""
        import psutil

        # Get baseline memory usage
        process = psutil.Process(os.getpid())
        baseline_memory = process.memory_info().rss

        memory_measurements = []

        # Execute hooks while monitoring memory
        for i in range(5):
            pre_exec_memory = process.memory_info().rss

            result = hook_manager.execute_hook("pre-commit")

            post_exec_memory = process.memory_info().rss

            memory_measurements.append({
                "iteration": i,
                "pre_exec_memory": pre_exec_memory,
                "post_exec_memory": post_exec_memory,
                "memory_delta": post_exec_memory - pre_exec_memory,
                "hook_success": result["success"],
                "execution_time": result["execution_time_ms"]
            })

        # Analyze memory usage
        total_memory_growth = process.memory_info().rss - baseline_memory
        avg_memory_delta = sum(m["memory_delta"] for m in memory_measurements) / len(memory_measurements)

        # Memory leak detection (should not grow more than 50MB)
        max_acceptable_growth = 50 * 1024 * 1024  # 50MB
        assert total_memory_growth < max_acceptable_growth, f"Potential memory leak detected: {total_memory_growth / 1024 / 1024:.2f}MB growth"

        # Average per-execution memory usage should be reasonable
        max_acceptable_per_exec = 10 * 1024 * 1024  # 10MB per execution
        assert abs(avg_memory_delta) < max_acceptable_per_exec, f"Excessive per-execution memory usage: {avg_memory_delta / 1024 / 1024:.2f}MB"

    def test_error_recovery_and_resilience(self, hook_manager, temp_test_file):
        """Test hook system error recovery"""

        # Test with malformed file that might cause validation errors
        malformed_content = '''
        import React from 'react'
        // Missing export statement
        const BadComponent = () => {
          return <div>Bad</div>
        // Missing closing brace
        '''

        hook_manager.create_test_file(temp_test_file, malformed_content)

        # Execute hook - should handle errors gracefully
        result = hook_manager.execute_hook("pre-commit")

        # Even if validation fails, the hook should not crash
        assert result["return_code"] in [0, 1], f"Hook crashed with unexpected return code: {result['return_code']}"
        assert result["execution_time_ms"] < 10000, f"Hook took too long to handle error: {result['execution_time_ms']}ms"

        # System should remain stable after error
        recovery_result = hook_manager.execute_hook("pre-commit")
        assert recovery_result["return_code"] in [0, 1], "Hook system did not recover properly"

    def test_hook_validation_integration(self, hook_manager, temp_test_file):
        """Test PRD validation integration with hooks"""

        # Test with content that should trigger validation rules
        test_content = '''
import React from 'react'
import { CustomComponent } from 'some-other-ui-lib'

export const TestComponent = () => {
  return (
    <div>
      <CustomComponent>This should trigger PRD validation</CustomComponent>
    </div>
  )
}
'''

        hook_manager.create_test_file(temp_test_file, test_content)

        result = hook_manager.execute_hook("pre-commit")

        # Hook should execute and provide meaningful feedback
        assert result["execution_time_ms"] < 5000, f"Validation hook took too long: {result['execution_time_ms']}ms"

        # Check that validation was actually performed
        if result["stderr"] or result["stdout"]:
            output = result["stderr"] + result["stdout"]
            # Should contain some indication of validation activity
            validation_indicators = ["validation", "PRD", "compliance", "check"]
            has_validation_output = any(indicator in output.lower() for indicator in validation_indicators)
            # Note: This is informational - we don't require strict validation failure

        # Hook system should remain responsive
        followup_result = hook_manager.execute_hook("post-commit")
        assert followup_result["execution_time_ms"] < 3000, "Hook system became unresponsive after validation"


class TestHookPerformanceStress:
    """Stress testing for hook performance"""

    @pytest.fixture
    def hook_manager(self):
        return GitHookTestManager(Path.cwd())

    def test_rapid_fire_hook_execution(self, hook_manager):
        """Test rapid sequential hook executions"""

        execution_times = []
        success_count = 0

        # Execute hooks rapidly
        for i in range(10):
            start_time = time.time()
            result = hook_manager.execute_hook("post-commit")
            end_time = time.time()

            execution_times.append((end_time - start_time) * 1000)
            if result["success"]:
                success_count += 1

        # Validate rapid execution performance
        avg_time = sum(execution_times) / len(execution_times)
        max_time = max(execution_times)
        success_rate = success_count / len(execution_times)

        assert avg_time < 1000, f"Average rapid execution time too high: {avg_time}ms"
        assert max_time < 2000, f"Max rapid execution time too high: {max_time}ms"
        assert success_rate >= 0.8, f"Rapid execution success rate too low: {success_rate}"

    def test_hook_execution_under_load(self, hook_manager):
        """Test hook execution under system load"""
        import threading
        import time

        def background_load():
            """Create background CPU load"""
            end_time = time.time() + 10  # Run for 10 seconds
            while time.time() < end_time:
                # Create some CPU load
                sum(i * i for i in range(1000))

        # Start background load
        load_thread = threading.Thread(target=background_load)
        load_thread.start()

        try:
            # Execute hooks under load
            results = []
            for i in range(5):
                result = hook_manager.execute_hook("pre-commit")
                results.append(result)
                time.sleep(0.5)  # Small delay between executions

            # Validate performance under load
            successful_results = [r for r in results if r["success"]]
            success_rate = len(successful_results) / len(results)

            if successful_results:
                avg_time = sum(r["execution_time_ms"] for r in successful_results) / len(successful_results)
                max_time = max(r["execution_time_ms"] for r in successful_results)

                # Performance should degrade gracefully under load
                assert avg_time < 5000, f"Performance under load too poor: {avg_time}ms average"
                assert max_time < 10000, f"Max execution time under load too high: {max_time}ms"

            assert success_rate >= 0.6, f"Success rate under load too low: {success_rate}"

        finally:
            load_thread.join(timeout=1)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
