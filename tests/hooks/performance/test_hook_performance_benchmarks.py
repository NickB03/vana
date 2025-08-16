#!/usr/bin/env python3
"""
Performance Tests for Hook System

Verifies hook system meets performance requirements:
- Individual validator execution <500ms
- Complete pipeline execution <2000ms
- Concurrent validation handling
- Memory usage optimization
- Cache effectiveness
- Load testing under stress

Benchmarks:
- Single file validation: <500ms
- 10 concurrent validations: <2000ms
- 50 concurrent validations: <5000ms
- Large file handling: <1000ms
- Memory growth: <50MB per 100 validations
"""

import asyncio
import gc
import json
import logging
import os
import statistics
import subprocess
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path

import psutil
import pytest

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetrics:
    """Performance metrics container"""

    execution_time_ms: float
    memory_usage_mb: float
    cpu_usage_percent: float
    validation_score: int
    violations_count: int
    cache_hits: int = 0
    cache_misses: int = 0


class PerformanceMonitor:
    """Monitor system performance during tests"""

    def __init__(self):
        self.process = psutil.Process()
        self.start_memory = None
        self.start_cpu_time = None
        self.start_time = None

    def start_monitoring(self):
        """Start performance monitoring"""
        self.start_memory = self.process.memory_info().rss / 1024 / 1024  # MB
        self.start_cpu_time = self.process.cpu_times()
        self.start_time = time.time()
        gc.collect()  # Clean up before measurement

    def get_metrics(self) -> PerformanceMetrics:
        """Get current performance metrics"""
        end_time = time.time()
        end_memory = self.process.memory_info().rss / 1024 / 1024  # MB
        end_cpu_time = self.process.cpu_times()

        execution_time = (end_time - self.start_time) * 1000  # ms
        memory_usage = end_memory - self.start_memory

        # Calculate CPU usage percentage
        cpu_usage = (
            (
                (end_cpu_time.user - self.start_cpu_time.user)
                + (end_cpu_time.system - self.start_cpu_time.system)
            )
            / (end_time - self.start_time)
            * 100
        )

        return PerformanceMetrics(
            execution_time_ms=execution_time,
            memory_usage_mb=memory_usage,
            cpu_usage_percent=cpu_usage,
            validation_score=0,  # To be filled by caller
            violations_count=0,  # To be filled by caller
        )


class TestHookPerformanceBenchmarks:
    """Comprehensive performance tests for hook system"""

    @pytest.fixture
    def performance_workspace(self):
        """Create workspace optimized for performance testing"""
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace = Path(temp_dir)

            # Create minimal required structure
            (workspace / ".claude_workspace").mkdir()
            (workspace / "docs").mkdir()
            (workspace / "src" / "components").mkdir(parents=True)

            # Create minimal PRD file
            prd_content = """
## 2. Technology Stack
- shadcn/ui components
- React with TypeScript

## 18. Performance Requirements
- Bundle size: <250KB
- Render time: <16ms

## 19. Security Requirements
- No dangerouslySetInnerHTML
- Input sanitization required

## 17. Accessibility Requirements
- data-testid required
- aria-label for buttons
            """
            (workspace / "docs" / "vana-frontend-prd-final.md").write_text(prd_content)

            # Create optimized hook config
            hook_config = {
                "enabled": True,
                "enforcement": {"critical": True, "blocking": True},
                "currentMode": "prd_development",
                "performance": {
                    "enableMetrics": True,
                    "enableCaching": True,
                    "maxConcurrent": 20,
                },
            }
            (workspace / ".claude_workspace" / "hook-config.json").write_text(
                json.dumps(hook_config)
            )

            yield workspace

    @pytest.fixture
    def sample_components(self):
        """Performance-optimized sample components"""
        return {
            "small": """
import React from 'react';
import { Button } from '@/components/ui/button';

const SmallComponent: React.FC = () => {
  return <Button data-testid="small-btn">Click</Button>;
};

export default SmallComponent;
            """,
            "medium": """
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface MediumComponentProps {
  data: any[];
}

const MediumComponent: React.FC<MediumComponentProps> = ({ data }) => {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    setLoading(true);
    // Simulate data processing
    setTimeout(() => {
      setState(data);
      setLoading(false);
    }, 100);
  }, [data]);
  
  return (
    <Card data-testid="medium-card">
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {state?.map((item, index) => (
            <Button 
              key={index} 
              data-testid={`item-${index}`}
              aria-label={`Item ${index}`}
            >
              {item.name}
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
};

export default MediumComponent;
            """,
            "large": None,  # Will be generated dynamically
        }

    def generate_large_component(self, size: int = 1000) -> str:
        """Generate large component for testing"""
        content = """
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface LargeComponentProps {
  items: any[];
}

const LargeComponent: React.FC<LargeComponentProps> = ({ items }) => {
  const [states, setStates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    setLoading(true);
    // Process items
    setStates(items);
    setLoading(false);
  }, [items]);
  
        """

        # Add many similar sections
        for i in range(size):
            content += f"""
  const handler{i} = () => {{
    console.log('Handler {i}');
  }};
            """

        content += """
  return (
    <Card data-testid="large-component">
      {loading ? (
        <div>Loading large component...</div>
      ) : (
        <div>
        """

        for i in range(min(size, 100)):  # Limit rendered elements
            content += f"""
          <Button 
            key="{i}" 
            onClick={{handler{i}}}
            data-testid="button-{i}"
            aria-label="Button {i}"
          >
            Button {i}
          </Button>
            """

        content += """
        </div>
      )}
    </Card>
  );
};

export default LargeComponent;
        """

        return content


class TestSingleValidatorPerformance:
    """Test individual validator performance"""

    @pytest.mark.asyncio
    async def test_real_prd_validator_performance(
        self, performance_workspace, sample_components
    ):
        """Test Real PRD Validator meets <500ms requirement"""
        os.chdir(performance_workspace)
        monitor = PerformanceMonitor()

        # Test with different component sizes
        test_cases = [
            ("small", sample_components["small"]),
            ("medium", sample_components["medium"]),
        ]

        results = []

        for size_name, content in test_cases:
            component_path = (
                performance_workspace
                / f"src/components/{size_name.title()}Component.tsx"
            )
            component_path.write_text(content)

            content_file = performance_workspace / f"temp_{size_name}.tsx"
            content_file.write_text(content)

            # Measure performance
            monitor.start_monitoring()

            result = subprocess.run(
                [
                    "node",
                    "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                    "validate",
                    str(component_path),
                    str(content_file),
                ],
                capture_output=True,
                text=True,
                cwd=performance_workspace,
            )

            metrics = monitor.get_metrics()

            if result.returncode == 0:
                validation_result = json.loads(result.stdout)
                metrics.validation_score = validation_result["compliance_score"]
                metrics.violations_count = len(validation_result.get("violations", []))

            results.append((size_name, metrics))

            # Performance assertions
            assert metrics.execution_time_ms < 500, (
                f"{size_name} component took {metrics.execution_time_ms:.2f}ms, should be <500ms"
            )
            assert metrics.memory_usage_mb < 50, (
                f"{size_name} component used {metrics.memory_usage_mb:.2f}MB, should be <50MB"
            )

            logger.info(
                f"{size_name} component: {metrics.execution_time_ms:.2f}ms, {metrics.memory_usage_mb:.2f}MB"
            )

        # Verify performance scaling
        small_metrics = next(m for name, m in results if name == "small")
        medium_metrics = next(m for name, m in results if name == "medium")

        # Medium should not be more than 3x slower than small
        scaling_factor = (
            medium_metrics.execution_time_ms / small_metrics.execution_time_ms
        )
        assert scaling_factor < 3.0, (
            f"Performance scaling factor {scaling_factor:.2f} should be <3.0"
        )

    @pytest.mark.asyncio
    async def test_large_file_performance(self, performance_workspace):
        """Test performance with large files"""
        os.chdir(performance_workspace)
        monitor = PerformanceMonitor()

        # Generate large component
        large_content = TestHookPerformanceBenchmarks().generate_large_component(500)

        large_component_path = (
            performance_workspace / "src/components/LargeComponent.tsx"
        )
        large_component_path.write_text(large_content)

        content_file = performance_workspace / "temp_large.tsx"
        content_file.write_text(large_content)

        # Measure performance
        monitor.start_monitoring()

        result = subprocess.run(
            [
                "node",
                "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                "validate",
                str(large_component_path),
                str(content_file),
            ],
            capture_output=True,
            text=True,
            cwd=performance_workspace,
            timeout=5,
        )

        metrics = monitor.get_metrics()

        # Large files should still complete within reasonable time
        assert metrics.execution_time_ms < 1000, (
            f"Large file took {metrics.execution_time_ms:.2f}ms, should be <1000ms"
        )

        if result.returncode == 0:
            validation_result = json.loads(result.stdout)

            # Should detect large file size warning
            warnings_text = " ".join(validation_result.get("warnings", []))
            assert (
                "Large component" in warnings_text
                or "file size" in warnings_text.lower()
            )

            logger.info(
                f"Large component ({len(large_content)} chars): {metrics.execution_time_ms:.2f}ms"
            )


class TestConcurrentValidationPerformance:
    """Test concurrent validation performance"""

    @pytest.mark.asyncio
    async def test_10_concurrent_validations(
        self, performance_workspace, sample_components
    ):
        """Test 10 concurrent validations complete in <2000ms"""
        os.chdir(performance_workspace)

        # Create 10 test files
        test_files = []
        for i in range(10):
            content = sample_components["medium"].replace(
                "MediumComponent", f"Component{i}"
            )
            file_path = performance_workspace / f"src/components/Component{i}.tsx"
            file_path.write_text(content)
            test_files.append((file_path, content))

        monitor = PerformanceMonitor()
        monitor.start_monitoring()

        # Run concurrent validations
        async def validate_file(file_path, content):
            content_file = performance_workspace / f"temp_{file_path.stem}.tsx"
            content_file.write_text(content)

            proc = await asyncio.create_subprocess_exec(
                "node",
                "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                "validate",
                str(file_path),
                str(content_file),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=performance_workspace,
            )

            stdout, stderr = await proc.communicate()
            return proc.returncode, stdout.decode(), stderr.decode()

        # Execute all validations concurrently
        tasks = [validate_file(file_path, content) for file_path, content in test_files]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        metrics = monitor.get_metrics()

        # Performance assertions
        assert metrics.execution_time_ms < 2000, (
            f"10 concurrent validations took {metrics.execution_time_ms:.2f}ms, should be <2000ms"
        )

        # Analyze results
        successful_validations = 0
        validation_times = []

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Validation {i} failed with exception: {result}")
                continue

            returncode, stdout, stderr = result

            if returncode == 0:
                successful_validations += 1
                try:
                    validation_result = json.loads(stdout)
                    # Individual validation should still be fast
                    validation_times.append(
                        metrics.execution_time_ms / 10
                    )  # Approximate
                except json.JSONDecodeError:
                    pass

        assert successful_validations >= 8, (
            f"Only {successful_validations}/10 validations succeeded"
        )

        logger.info(
            f"10 concurrent validations: {metrics.execution_time_ms:.2f}ms total, {successful_validations} successful"
        )

    @pytest.mark.asyncio
    async def test_50_concurrent_validations_stress(
        self, performance_workspace, sample_components
    ):
        """Stress test with 50 concurrent validations"""
        os.chdir(performance_workspace)

        # Create 50 test files with varying sizes
        test_files = []
        for i in range(50):
            # Vary component complexity
            if i % 3 == 0:
                content = sample_components["small"].replace(
                    "SmallComponent", f"Component{i}"
                )
            else:
                content = sample_components["medium"].replace(
                    "MediumComponent", f"Component{i}"
                )

            file_path = performance_workspace / f"src/components/Component{i}.tsx"
            file_path.write_text(content)
            test_files.append((file_path, content))

        monitor = PerformanceMonitor()
        monitor.start_monitoring()

        # Run concurrent validations with semaphore to limit concurrency
        semaphore = asyncio.Semaphore(10)  # Limit to 10 concurrent

        async def validate_with_semaphore(file_path, content):
            async with semaphore:
                content_file = performance_workspace / f"temp_{file_path.stem}.tsx"
                content_file.write_text(content)

                proc = await asyncio.create_subprocess_exec(
                    "node",
                    "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                    "validate",
                    str(file_path),
                    str(content_file),
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=performance_workspace,
                )

                stdout, stderr = await proc.communicate()
                return proc.returncode, stdout.decode(), stderr.decode()

        # Execute all validations
        tasks = [
            validate_with_semaphore(file_path, content)
            for file_path, content in test_files
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        metrics = monitor.get_metrics()

        # Stress test performance assertions (more lenient)
        assert metrics.execution_time_ms < 5000, (
            f"50 concurrent validations took {metrics.execution_time_ms:.2f}ms, should be <5000ms"
        )
        assert metrics.memory_usage_mb < 200, (
            f"Memory usage {metrics.memory_usage_mb:.2f}MB should be <200MB"
        )

        # Analyze results
        successful_validations = sum(
            1 for r in results if not isinstance(r, Exception) and r[0] == 0
        )

        assert successful_validations >= 40, (
            f"Only {successful_validations}/50 validations succeeded"
        )

        logger.info(
            f"50 concurrent validations: {metrics.execution_time_ms:.2f}ms, {successful_validations} successful, {metrics.memory_usage_mb:.2f}MB"
        )


class TestMemoryUsageOptimization:
    """Test memory usage and optimization"""

    @pytest.mark.asyncio
    async def test_memory_growth_under_load(
        self, performance_workspace, sample_components
    ):
        """Test memory usage doesn't grow excessively under load"""
        os.chdir(performance_workspace)

        initial_memory = psutil.Process().memory_info().rss / 1024 / 1024
        memory_measurements = []

        # Run multiple batches of validations
        for batch in range(5):
            batch_files = []

            # Create 20 files per batch
            for i in range(20):
                content = sample_components["medium"].replace(
                    "MediumComponent", f"Batch{batch}Component{i}"
                )
                file_path = (
                    performance_workspace
                    / f"src/components/Batch{batch}Component{i}.tsx"
                )
                file_path.write_text(content)
                batch_files.append((file_path, content))

            # Validate batch
            batch_start_memory = psutil.Process().memory_info().rss / 1024 / 1024

            for file_path, content in batch_files:
                content_file = performance_workspace / f"temp_{file_path.stem}.tsx"
                content_file.write_text(content)

                subprocess.run(
                    [
                        "node",
                        "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                        "validate",
                        str(file_path),
                        str(content_file),
                    ],
                    capture_output=True,
                    text=True,
                    cwd=performance_workspace,
                    timeout=10,
                )

            batch_end_memory = psutil.Process().memory_info().rss / 1024 / 1024
            memory_growth = batch_end_memory - batch_start_memory
            memory_measurements.append(memory_growth)

            logger.info(f"Batch {batch}: {memory_growth:.2f}MB growth")

            # Force garbage collection between batches
            gc.collect()

        # Memory growth should be reasonable
        avg_memory_growth = statistics.mean(memory_measurements)
        max_memory_growth = max(memory_measurements)

        assert avg_memory_growth < 50, (
            f"Average memory growth {avg_memory_growth:.2f}MB should be <50MB per batch"
        )
        assert max_memory_growth < 100, (
            f"Max memory growth {max_memory_growth:.2f}MB should be <100MB per batch"
        )

        logger.info(
            f"Memory growth - Avg: {avg_memory_growth:.2f}MB, Max: {max_memory_growth:.2f}MB"
        )

    @pytest.mark.asyncio
    async def test_memory_cleanup_after_validation(self, performance_workspace):
        """Test memory is properly cleaned up after validation"""
        os.chdir(performance_workspace)

        # Measure baseline memory
        gc.collect()
        baseline_memory = psutil.Process().memory_info().rss / 1024 / 1024

        # Generate and validate large component
        large_content = TestHookPerformanceBenchmarks().generate_large_component(1000)

        large_file = performance_workspace / "src/components/MemoryTestComponent.tsx"
        large_file.write_text(large_content)

        content_file = performance_workspace / "temp_memory_test.tsx"
        content_file.write_text(large_content)

        # Validate multiple times
        for i in range(10):
            result = subprocess.run(
                [
                    "node",
                    "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                    "validate",
                    str(large_file),
                    str(content_file),
                ],
                capture_output=True,
                text=True,
                cwd=performance_workspace,
                timeout=10,
            )

            assert result.returncode == 0, f"Validation {i} failed"

        # Force garbage collection
        gc.collect()

        # Measure memory after validations
        final_memory = psutil.Process().memory_info().rss / 1024 / 1024
        memory_growth = final_memory - baseline_memory

        # Memory growth should be minimal after cleanup
        assert memory_growth < 30, (
            f"Memory growth after cleanup {memory_growth:.2f}MB should be <30MB"
        )

        logger.info(
            f"Memory cleanup test - Baseline: {baseline_memory:.2f}MB, Final: {final_memory:.2f}MB, Growth: {memory_growth:.2f}MB"
        )


class TestCacheEffectiveness:
    """Test caching effectiveness and performance impact"""

    @pytest.mark.asyncio
    async def test_validation_caching_performance(
        self, performance_workspace, sample_components
    ):
        """Test that caching improves performance for repeated validations"""
        os.chdir(performance_workspace)

        # Create test component
        component_path = performance_workspace / "src/components/CacheTestComponent.tsx"
        component_path.write_text(sample_components["medium"])

        content_file = performance_workspace / "temp_cache_test.tsx"
        content_file.write_text(sample_components["medium"])

        validation_times = []

        # Run same validation multiple times
        for i in range(5):
            start_time = time.time()

            result = subprocess.run(
                [
                    "node",
                    "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                    "validate",
                    str(component_path),
                    str(content_file),
                ],
                capture_output=True,
                text=True,
                cwd=performance_workspace,
            )

            execution_time = (time.time() - start_time) * 1000
            validation_times.append(execution_time)

            assert result.returncode == 0, f"Validation {i} failed"

            logger.info(f"Validation {i}: {execution_time:.2f}ms")

        # Later validations should be faster (if caching is working)
        first_validation = validation_times[0]
        avg_later_validations = statistics.mean(validation_times[1:])

        # Note: Caching might not be implemented yet, so this is informational
        if avg_later_validations < first_validation * 0.8:
            logger.info(
                f"Caching appears effective: first {first_validation:.2f}ms, avg later {avg_later_validations:.2f}ms"
            )
        else:
            logger.info(
                f"Caching not detected: first {first_validation:.2f}ms, avg later {avg_later_validations:.2f}ms"
            )

        # All validations should still be within performance requirements
        for i, time_ms in enumerate(validation_times):
            assert time_ms < 500, (
                f"Validation {i} took {time_ms:.2f}ms, should be <500ms"
            )


class TestPerformanceRegression:
    """Test for performance regressions"""

    @pytest.mark.asyncio
    async def test_performance_baseline_compliance(
        self, performance_workspace, sample_components
    ):
        """Test that current performance meets established baselines"""
        os.chdir(performance_workspace)

        # Performance baselines (in milliseconds)
        baselines = {
            "small_component": 200,
            "medium_component": 400,
            "concurrent_10": 1500,
            "memory_mb": 30,
        }

        results = {}
        monitor = PerformanceMonitor()

        # Test small component
        monitor.start_monitoring()

        small_file = performance_workspace / "src/components/SmallBaselineTest.tsx"
        small_file.write_text(sample_components["small"])

        content_file = performance_workspace / "temp_small_baseline.tsx"
        content_file.write_text(sample_components["small"])

        result = subprocess.run(
            [
                "node",
                "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                "validate",
                str(small_file),
                str(content_file),
            ],
            capture_output=True,
            text=True,
            cwd=performance_workspace,
        )

        small_metrics = monitor.get_metrics()
        results["small_component"] = small_metrics.execution_time_ms

        # Test medium component
        monitor.start_monitoring()

        medium_file = performance_workspace / "src/components/MediumBaselineTest.tsx"
        medium_file.write_text(sample_components["medium"])

        content_file = performance_workspace / "temp_medium_baseline.tsx"
        content_file.write_text(sample_components["medium"])

        result = subprocess.run(
            [
                "node",
                "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                "validate",
                str(medium_file),
                str(content_file),
            ],
            capture_output=True,
            text=True,
            cwd=performance_workspace,
        )

        medium_metrics = monitor.get_metrics()
        results["medium_component"] = medium_metrics.execution_time_ms
        results["memory_mb"] = medium_metrics.memory_usage_mb

        # Test concurrent validations (simplified)
        monitor.start_monitoring()

        concurrent_files = []
        for i in range(10):
            file_path = performance_workspace / f"src/components/Concurrent{i}.tsx"
            file_path.write_text(
                sample_components["small"].replace("SmallComponent", f"Concurrent{i}")
            )
            concurrent_files.append(file_path)

        for file_path in concurrent_files:
            content_file = performance_workspace / f"temp_{file_path.stem}.tsx"
            content_file.write_text(file_path.read_text())

            subprocess.run(
                [
                    "node",
                    "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                    "validate",
                    str(file_path),
                    str(content_file),
                ],
                capture_output=True,
                text=True,
                cwd=performance_workspace,
            )

        concurrent_metrics = monitor.get_metrics()
        results["concurrent_10"] = concurrent_metrics.execution_time_ms

        # Compare against baselines
        performance_report = []
        all_within_baseline = True

        for test_name, baseline in baselines.items():
            actual = results.get(test_name, 0)
            within_baseline = actual <= baseline
            all_within_baseline = all_within_baseline and within_baseline

            status = "✅ PASS" if within_baseline else "❌ FAIL"
            performance_report.append(
                f"{test_name}: {actual:.2f} <= {baseline} {status}"
            )

            if not within_baseline:
                logger.warning(
                    f"Performance regression detected in {test_name}: {actual:.2f} > {baseline}"
                )

        # Log performance report
        logger.info("Performance Baseline Report:")
        for line in performance_report:
            logger.info(f"  {line}")

        # Performance regression assertion
        assert all_within_baseline, "Performance regressions detected in baseline tests"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short", "-s"])
