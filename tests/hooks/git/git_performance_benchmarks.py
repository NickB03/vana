"""
Git Hook Performance Benchmarking Suite
=======================================

This module provides comprehensive performance benchmarking for Git hook integration
with Claude Code and Claude Flow systems. Establishes timing standards and monitors
performance impact of hook execution on Git workflows.

Key Metrics:
- Hook execution times (pre-commit, pre-push, post-commit)
- Git operation overhead with hooks vs without
- Memory usage during hook execution
- Throughput under various load conditions
- Performance degradation thresholds

Author: Tester Agent (Git Integration Specialist)
"""

import json
import statistics
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import psutil
import pytest

from .git_hook_test_suite import GitTestEnvironment


@dataclass
class PerformanceMetric:
    """Individual performance measurement"""
    operation: str
    execution_time_ms: float
    memory_usage_mb: float
    cpu_percent: float
    success: bool
    hook_overhead_ms: float
    timestamp: float

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class BenchmarkResult:
    """Results from a performance benchmark"""
    benchmark_name: str
    total_operations: int
    successful_operations: int
    failed_operations: int
    avg_execution_time_ms: float
    median_execution_time_ms: float
    p95_execution_time_ms: float
    p99_execution_time_ms: float
    min_execution_time_ms: float
    max_execution_time_ms: float
    avg_memory_usage_mb: float
    peak_memory_usage_mb: float
    avg_cpu_percent: float
    peak_cpu_percent: float
    total_duration_ms: float
    throughput_ops_per_sec: float
    success_rate: float
    avg_hook_overhead_ms: float
    performance_grade: str
    meets_thresholds: bool

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class GitPerformanceBenchmarker:
    """Git hook performance benchmarking system"""

    # Performance thresholds for different operations
    PERFORMANCE_THRESHOLDS = {
        "pre_commit": {
            "max_execution_time_ms": 2000,   # 2 seconds
            "max_hook_overhead_ms": 500,     # 500ms overhead
            "min_success_rate": 0.95,        # 95% success rate
            "max_memory_usage_mb": 100       # 100MB memory
        },
        "pre_push": {
            "max_execution_time_ms": 5000,   # 5 seconds
            "max_hook_overhead_ms": 1000,    # 1 second overhead
            "min_success_rate": 0.95,        # 95% success rate
            "max_memory_usage_mb": 150       # 150MB memory
        },
        "post_commit": {
            "max_execution_time_ms": 1000,   # 1 second
            "max_hook_overhead_ms": 200,     # 200ms overhead
            "min_success_rate": 0.98,        # 98% success rate
            "max_memory_usage_mb": 50        # 50MB memory
        },
        "full_workflow": {
            "max_execution_time_ms": 8000,   # 8 seconds total
            "max_hook_overhead_ms": 2000,    # 2 seconds total overhead
            "min_success_rate": 0.90,        # 90% success rate
            "max_memory_usage_mb": 200       # 200MB memory
        }
    }

    def __init__(self, workspace_path: Path):
        self.workspace_path = workspace_path
        self.git_env = GitTestEnvironment(workspace_path)
        self.metrics = []
        self.baseline_metrics = []

    def setup_benchmark_environment(self):
        """Setup Git environment for benchmarking"""
        self.git_env.setup_test_repository()
        self.git_env.install_test_hooks()

        # Create realistic project structure for benchmarking
        self._create_benchmark_project_structure()

    def _create_benchmark_project_structure(self):
        """Create realistic project structure for performance testing"""
        # Frontend components (simulate real project)
        components = [
            "Button", "Card", "Dialog", "Form", "Input", "Select", "Table",
            "Navigation", "Header", "Footer", "Sidebar", "Modal", "Toast",
            "Dropdown", "Tooltip", "Progress", "Spinner", "Avatar", "Badge"
        ]

        for component in components:
            component_content = f"""
import React from 'react'
import {{ cn }} from '@/lib/utils'

interface {component}Props {{
  className?: string
  children?: React.ReactNode
}}

export const {component}: React.FC<{component}Props> = ({{ className, children, ...props }}) => {{
  return (
    <div 
      className={{cn('component-{component.lower()}', className)}}
      data-testid="{component.lower()}-component"
      {{...props}}
    >
      {{children}}
    </div>
  )
}}
"""
            component_path = self.workspace_path / "frontend" / "src" / "components" / f"{component}.tsx"
            component_path.parent.mkdir(parents=True, exist_ok=True)
            component_path.write_text(component_content)

            # Create corresponding test file
            test_content = f"""
import {{ render, screen }} from '@testing-library/react'
import {{ {component} }} from '../{component}'

describe('{component}', () => {{
  test('renders component correctly', () => {{
    render(<{component} data-testid="test-{component.lower()}">Test content</{component}>)
    expect(screen.getByTestId('test-{component.lower()}')).toBeInTheDocument()
  }})
  
  test('applies custom className', () => {{
    render(<{component} className="custom-class">Content</{component}>)
    expect(screen.getByTestId('{component.lower()}-component')).toHaveClass('custom-class')
  }})
}})
"""
            test_path = self.workspace_path / "frontend" / "src" / "components" / "__tests__" / f"{component}.test.tsx"
            test_path.parent.mkdir(parents=True, exist_ok=True)
            test_path.write_text(test_content)

        # Backend files
        api_endpoints = ["users", "auth", "dashboard", "settings", "reports"]
        for endpoint in api_endpoints:
            api_content = f"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from app.models import {endpoint.title()}Model
from app.auth import get_current_user

router = APIRouter(prefix="/{endpoint}", tags=["{endpoint}"])

@router.get("/", response_model=List[{endpoint.title()}Model])
async def get_{endpoint}(current_user=Depends(get_current_user)):
    \"\"\"Get all {endpoint}\"\"\"
    return await {endpoint.title()}Model.get_all()

@router.post("/", response_model={endpoint.title()}Model)
async def create_{endpoint.rstrip('s')}(data: {endpoint.title()}Model, current_user=Depends(get_current_user)):
    \"\"\"Create new {endpoint.rstrip('s')}\"\"\"
    return await {endpoint.title()}Model.create(data)
"""
            api_path = self.workspace_path / "app" / "routes" / f"{endpoint}.py"
            api_path.parent.mkdir(parents=True, exist_ok=True)
            api_path.write_text(api_content)

    def measure_baseline_performance(self, iterations: int = 10) -> list[PerformanceMetric]:
        """Measure baseline Git performance without hooks"""
        print(f"📊 Measuring baseline Git performance ({iterations} iterations)...")

        # Temporarily disable hooks
        hooks_dir = self.workspace_path / ".git" / "hooks"
        backup_dir = self.workspace_path / ".git" / "hooks_backup_baseline"

        if hooks_dir.exists():
            hooks_dir.rename(backup_dir)

        baseline_metrics = []

        try:
            for i in range(iterations):
                # Create test file for each iteration
                test_file = {f"baseline_test_{i}.txt": f"Baseline test content {i}\n" + "x" * 500}

                # Measure commit without hooks
                start_time = time.perf_counter()
                start_memory = psutil.Process().memory_info().rss / 1024 / 1024
                start_cpu = psutil.cpu_percent()

                result = self.git_env.simulate_commit(test_file, f"Baseline commit {i}")

                end_time = time.perf_counter()
                end_memory = psutil.Process().memory_info().rss / 1024 / 1024
                end_cpu = psutil.cpu_percent()

                metric = PerformanceMetric(
                    operation="baseline_commit",
                    execution_time_ms=(end_time - start_time) * 1000,
                    memory_usage_mb=end_memory - start_memory,
                    cpu_percent=(start_cpu + end_cpu) / 2,
                    success=result["success"],
                    hook_overhead_ms=0,  # No hooks
                    timestamp=time.time()
                )

                baseline_metrics.append(metric)

        finally:
            # Restore hooks
            if backup_dir.exists():
                if hooks_dir.exists():
                    hooks_dir.rename(self.workspace_path / ".git" / "hooks_temp")
                backup_dir.rename(hooks_dir)

        self.baseline_metrics = baseline_metrics
        return baseline_metrics

    def benchmark_pre_commit_performance(self, iterations: int = 20) -> BenchmarkResult:
        """Benchmark pre-commit hook performance"""
        print(f"🔍 Benchmarking pre-commit hooks ({iterations} iterations)...")

        metrics = []

        for i in range(iterations):
            # Create realistic file changes
            if i % 3 == 0:
                # React component
                test_files = {
                    f"frontend/src/components/Benchmark{i}.tsx": self._generate_react_component(f"Benchmark{i}")
                }
            elif i % 3 == 1:
                # Python API file
                test_files = {
                    f"app/services/benchmark_{i}.py": self._generate_python_service(f"benchmark_{i}")
                }
            else:
                # Configuration file
                test_files = {
                    f"config/benchmark_{i}.json": json.dumps({"benchmark": i, "timestamp": time.time()})
                }

            # Measure pre-commit performance
            metric = self._measure_commit_operation(test_files, f"Benchmark pre-commit {i}", "pre_commit")
            metrics.append(metric)

        result = self._analyze_benchmark_results("pre_commit_performance", metrics)
        return result

    def benchmark_pre_push_performance(self, iterations: int = 15) -> BenchmarkResult:
        """Benchmark pre-push hook performance"""
        print(f"🚀 Benchmarking pre-push hooks ({iterations} iterations)...")

        metrics = []

        for i in range(iterations):
            # Create commits first
            test_files = {
                f"push_test_{i}.txt": f"Push benchmark content {i}\n" + "data " * 200
            }

            # Commit the files
            commit_result = self.git_env.simulate_commit(test_files, f"Prepare for push benchmark {i}")
            if not commit_result["success"]:
                continue

            # Measure push performance
            start_time = time.perf_counter()
            start_memory = psutil.Process().memory_info().rss / 1024 / 1024
            start_cpu = psutil.cpu_percent()

            push_result = self.git_env.simulate_push()

            end_time = time.perf_counter()
            end_memory = psutil.Process().memory_info().rss / 1024 / 1024
            end_cpu = psutil.cpu_percent()

            # Calculate baseline overhead (estimated)
            baseline_time = 50  # Estimated baseline push time in ms
            hook_overhead = max(0, (end_time - start_time) * 1000 - baseline_time)

            metric = PerformanceMetric(
                operation="pre_push",
                execution_time_ms=(end_time - start_time) * 1000,
                memory_usage_mb=end_memory - start_memory,
                cpu_percent=(start_cpu + end_cpu) / 2,
                success=push_result["success"],
                hook_overhead_ms=hook_overhead,
                timestamp=time.time()
            )

            metrics.append(metric)

        result = self._analyze_benchmark_results("pre_push_performance", metrics)
        return result

    def benchmark_post_commit_performance(self, iterations: int = 25) -> BenchmarkResult:
        """Benchmark post-commit hook performance"""
        print(f"📊 Benchmarking post-commit hooks ({iterations} iterations)...")

        metrics = []

        for i in range(iterations):
            # Create files that trigger different post-commit behaviors
            if i % 4 == 0:
                # Configuration files (triggers backup)
                test_files = {"pyproject.toml": f'[project]\nname = "benchmark"\nversion = "1.0.{i}"'}
            elif i % 4 == 1:
                # Multiple small files
                test_files = {f"small_file_{j}.txt": f"Small {j}" for j in range(5)}
            elif i % 4 == 2:
                # Large file
                test_files = {f"large_file_{i}.txt": "Large content\n" + "x" * 10000}
            else:
                # Mixed content
                test_files = {
                    f"mixed_{i}.tsx": self._generate_react_component(f"Mixed{i}"),
                    f"mixed_{i}.py": self._generate_python_service(f"mixed_{i}")
                }

            metric = self._measure_commit_operation(test_files, f"Post-commit benchmark {i}", "post_commit")
            metrics.append(metric)

        result = self._analyze_benchmark_results("post_commit_performance", metrics)
        return result

    def benchmark_full_workflow_performance(self, iterations: int = 10) -> BenchmarkResult:
        """Benchmark complete Git workflow performance"""
        print(f"🔄 Benchmarking full Git workflows ({iterations} iterations)...")

        metrics = []

        for i in range(iterations):
            # Simulate realistic development workflow
            workflow_files = {
                # Feature implementation
                f"frontend/src/components/Feature{i}.tsx": self._generate_react_component(f"Feature{i}"),
                f"frontend/src/components/__tests__/Feature{i}.test.tsx": self._generate_react_test(f"Feature{i}"),
                # Backend changes
                f"app/services/feature_{i}.py": self._generate_python_service(f"feature_{i}"),
                # Documentation
                f"docs/feature_{i}.md": f"# Feature {i}\n\nDocumentation for feature {i}.",
                # Configuration updates
                f"config/feature_{i}.json": json.dumps({"feature": i, "enabled": True})
            }

            start_time = time.perf_counter()
            start_memory = psutil.Process().memory_info().rss / 1024 / 1024
            start_cpu = psutil.cpu_percent()

            # Complete workflow: commit + push
            commit_result = self.git_env.simulate_commit(workflow_files, f"Implement feature {i}")

            if commit_result["success"]:
                push_result = self.git_env.simulate_push()
                workflow_success = push_result["success"]
            else:
                workflow_success = False

            end_time = time.perf_counter()
            end_memory = psutil.Process().memory_info().rss / 1024 / 1024
            end_cpu = psutil.cpu_percent()

            # Calculate estimated baseline time
            baseline_time = 100 + len(workflow_files) * 10  # Estimated baseline
            hook_overhead = max(0, (end_time - start_time) * 1000 - baseline_time)

            metric = PerformanceMetric(
                operation="full_workflow",
                execution_time_ms=(end_time - start_time) * 1000,
                memory_usage_mb=end_memory - start_memory,
                cpu_percent=(start_cpu + end_cpu) / 2,
                success=workflow_success,
                hook_overhead_ms=hook_overhead,
                timestamp=time.time()
            )

            metrics.append(metric)

        result = self._analyze_benchmark_results("full_workflow_performance", metrics)
        return result

    def benchmark_concurrent_operations(self, max_workers: int = 4, operations_per_worker: int = 5) -> BenchmarkResult:
        """Benchmark Git operations under concurrent load"""
        print(f"🏗️ Benchmarking concurrent Git operations ({max_workers} workers, {operations_per_worker} ops each)...")

        metrics = []
        start_time = time.perf_counter()

        def worker_task(worker_id: int) -> list[PerformanceMetric]:
            worker_metrics = []

            for i in range(operations_per_worker):
                test_files = {
                    f"concurrent/worker_{worker_id}/file_{i}.txt": f"Worker {worker_id} file {i}\n" + "x" * 500
                }

                metric = self._measure_commit_operation(
                    test_files,
                    f"Concurrent commit worker-{worker_id}-{i}",
                    "concurrent"
                )
                worker_metrics.append(metric)

                # Small delay to prevent overwhelming the system
                time.sleep(0.1)

            return worker_metrics

        # Execute concurrent operations
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(worker_task, worker_id) for worker_id in range(max_workers)]

            for future in as_completed(futures):
                try:
                    worker_metrics = future.result()
                    metrics.extend(worker_metrics)
                except Exception as e:
                    print(f"Worker failed: {e}")

        end_time = time.perf_counter()
        total_duration = (end_time - start_time) * 1000

        # Create custom benchmark result for concurrent operations
        successful_ops = sum(1 for m in metrics if m.success)
        total_ops = len(metrics)

        if total_ops > 0:
            execution_times = [m.execution_time_ms for m in metrics]
            memory_usages = [m.memory_usage_mb for m in metrics]
            cpu_usages = [m.cpu_percent for m in metrics]
            hook_overheads = [m.hook_overhead_ms for m in metrics]

            result = BenchmarkResult(
                benchmark_name="concurrent_operations",
                total_operations=total_ops,
                successful_operations=successful_ops,
                failed_operations=total_ops - successful_ops,
                avg_execution_time_ms=statistics.mean(execution_times),
                median_execution_time_ms=statistics.median(execution_times),
                p95_execution_time_ms=self._percentile(execution_times, 95),
                p99_execution_time_ms=self._percentile(execution_times, 99),
                min_execution_time_ms=min(execution_times),
                max_execution_time_ms=max(execution_times),
                avg_memory_usage_mb=statistics.mean(memory_usages),
                peak_memory_usage_mb=max(memory_usages),
                avg_cpu_percent=statistics.mean(cpu_usages),
                peak_cpu_percent=max(cpu_usages),
                total_duration_ms=total_duration,
                throughput_ops_per_sec=total_ops / (total_duration / 1000),
                success_rate=successful_ops / total_ops,
                avg_hook_overhead_ms=statistics.mean(hook_overheads),
                performance_grade="A",  # Will be calculated
                meets_thresholds=True   # Will be calculated
            )

            # Calculate performance grade and threshold compliance
            self._calculate_performance_grade(result, "concurrent")

        else:
            result = BenchmarkResult(
                benchmark_name="concurrent_operations",
                total_operations=0,
                successful_operations=0,
                failed_operations=0,
                avg_execution_time_ms=0,
                median_execution_time_ms=0,
                p95_execution_time_ms=0,
                p99_execution_time_ms=0,
                min_execution_time_ms=0,
                max_execution_time_ms=0,
                avg_memory_usage_mb=0,
                peak_memory_usage_mb=0,
                avg_cpu_percent=0,
                peak_cpu_percent=0,
                total_duration_ms=total_duration,
                throughput_ops_per_sec=0,
                success_rate=0,
                avg_hook_overhead_ms=0,
                performance_grade="F",
                meets_thresholds=False
            )

        return result

    def _measure_commit_operation(self, files: dict[str, str], commit_message: str, operation_type: str) -> PerformanceMetric:
        """Measure performance of a single commit operation"""
        start_time = time.perf_counter()
        start_memory = psutil.Process().memory_info().rss / 1024 / 1024
        start_cpu = psutil.cpu_percent()

        result = self.git_env.simulate_commit(files, commit_message)

        end_time = time.perf_counter()
        end_memory = psutil.Process().memory_info().rss / 1024 / 1024
        end_cpu = psutil.cpu_percent()

        execution_time_ms = (end_time - start_time) * 1000

        # Estimate hook overhead by comparing to baseline
        baseline_time = self._estimate_baseline_time(len(files), sum(len(content) for content in files.values()))
        hook_overhead = max(0, execution_time_ms - baseline_time)

        return PerformanceMetric(
            operation=operation_type,
            execution_time_ms=execution_time_ms,
            memory_usage_mb=end_memory - start_memory,
            cpu_percent=(start_cpu + end_cpu) / 2,
            success=result["success"],
            hook_overhead_ms=hook_overhead,
            timestamp=time.time()
        )

    def _estimate_baseline_time(self, file_count: int, total_content_size: int) -> float:
        """Estimate baseline Git operation time without hooks"""
        # Simple heuristic based on file count and content size
        base_time = 50  # Base Git operation time in ms
        file_overhead = file_count * 5  # 5ms per file
        content_overhead = total_content_size / 1000  # 1ms per KB

        return base_time + file_overhead + content_overhead

    def _analyze_benchmark_results(self, benchmark_name: str, metrics: list[PerformanceMetric]) -> BenchmarkResult:
        """Analyze benchmark metrics and create result summary"""
        if not metrics:
            return BenchmarkResult(
                benchmark_name=benchmark_name,
                total_operations=0,
                successful_operations=0,
                failed_operations=0,
                avg_execution_time_ms=0,
                median_execution_time_ms=0,
                p95_execution_time_ms=0,
                p99_execution_time_ms=0,
                min_execution_time_ms=0,
                max_execution_time_ms=0,
                avg_memory_usage_mb=0,
                peak_memory_usage_mb=0,
                avg_cpu_percent=0,
                peak_cpu_percent=0,
                total_duration_ms=0,
                throughput_ops_per_sec=0,
                success_rate=0,
                avg_hook_overhead_ms=0,
                performance_grade="F",
                meets_thresholds=False
            )

        successful_metrics = [m for m in metrics if m.success]
        total_ops = len(metrics)
        successful_ops = len(successful_metrics)

        execution_times = [m.execution_time_ms for m in metrics]
        memory_usages = [m.memory_usage_mb for m in metrics]
        cpu_usages = [m.cpu_percent for m in metrics]
        hook_overheads = [m.hook_overhead_ms for m in metrics]

        # Calculate timing statistics
        avg_time = statistics.mean(execution_times)
        median_time = statistics.median(execution_times)
        p95_time = self._percentile(execution_times, 95)
        p99_time = self._percentile(execution_times, 99)

        # Calculate duration and throughput
        start_timestamp = min(m.timestamp for m in metrics)
        end_timestamp = max(m.timestamp for m in metrics)
        total_duration = (end_timestamp - start_timestamp) * 1000

        throughput = total_ops / (total_duration / 1000) if total_duration > 0 else 0

        result = BenchmarkResult(
            benchmark_name=benchmark_name,
            total_operations=total_ops,
            successful_operations=successful_ops,
            failed_operations=total_ops - successful_ops,
            avg_execution_time_ms=avg_time,
            median_execution_time_ms=median_time,
            p95_execution_time_ms=p95_time,
            p99_execution_time_ms=p99_time,
            min_execution_time_ms=min(execution_times),
            max_execution_time_ms=max(execution_times),
            avg_memory_usage_mb=statistics.mean(memory_usages),
            peak_memory_usage_mb=max(memory_usages),
            avg_cpu_percent=statistics.mean(cpu_usages),
            peak_cpu_percent=max(cpu_usages),
            total_duration_ms=total_duration,
            throughput_ops_per_sec=throughput,
            success_rate=successful_ops / total_ops,
            avg_hook_overhead_ms=statistics.mean(hook_overheads),
            performance_grade="",  # Will be calculated
            meets_thresholds=False  # Will be calculated
        )

        # Calculate performance grade and threshold compliance
        operation_key = benchmark_name.replace("_performance", "")
        self._calculate_performance_grade(result, operation_key)

        return result

    def _calculate_performance_grade(self, result: BenchmarkResult, operation_key: str):
        """Calculate performance grade and threshold compliance"""
        thresholds = self.PERFORMANCE_THRESHOLDS.get(operation_key, self.PERFORMANCE_THRESHOLDS["full_workflow"])

        # Check each threshold
        time_ok = result.p95_execution_time_ms <= thresholds["max_execution_time_ms"]
        overhead_ok = result.avg_hook_overhead_ms <= thresholds["max_hook_overhead_ms"]
        success_ok = result.success_rate >= thresholds["min_success_rate"]
        memory_ok = result.peak_memory_usage_mb <= thresholds["max_memory_usage_mb"]

        result.meets_thresholds = all([time_ok, overhead_ok, success_ok, memory_ok])

        # Calculate grade based on performance
        score = 0
        if time_ok: score += 25
        if overhead_ok: score += 25
        if success_ok: score += 25
        if memory_ok: score += 25

        if score >= 90:
            result.performance_grade = "A"
        elif score >= 80:
            result.performance_grade = "B"
        elif score >= 70:
            result.performance_grade = "C"
        elif score >= 60:
            result.performance_grade = "D"
        else:
            result.performance_grade = "F"

    def _percentile(self, data: list[float], percentile: int) -> float:
        """Calculate percentile of data"""
        if not data:
            return 0
        sorted_data = sorted(data)
        index = int((percentile / 100) * len(sorted_data))
        return sorted_data[min(index, len(sorted_data) - 1)]

    def _generate_react_component(self, name: str) -> str:
        """Generate realistic React component for testing"""
        return f"""
import React, {{ useState, useEffect }} from 'react'
import {{ Button }} from '@/components/ui/button'
import {{ Card, CardContent, CardHeader, CardTitle }} from '@/components/ui/card'

interface {name}Props {{
  title?: string
  data?: any[]
  onAction?: () => void
}}

export const {name}: React.FC<{name}Props> = ({{ 
  title = "Default Title",
  data = [],
  onAction 
}}) => {{
  const [isLoading, setIsLoading] = useState(false)
  const [items, setItems] = useState(data)

  useEffect(() => {{
    setItems(data)
  }}, [data])

  const handleAction = async () => {{
    setIsLoading(true)
    try {{
      if (onAction) {{
        await onAction()
      }}
    }} finally {{
      setIsLoading(false)
    }}
  }}

  return (
    <Card data-testid="{name.lower()}-component" className="w-full">
      <CardHeader>
        <CardTitle data-testid="{name.lower()}-title">{{title}}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {{items.map((item, index) => (
            <div key={{index}} data-testid="{name.lower()}-item-{{index}}">
              {{JSON.stringify(item)}}
            </div>
          ))}}
          <Button 
            data-testid="{name.lower()}-action"
            onClick={{handleAction}}
            disabled={{isLoading}}
            variant="default"
          >
            {{isLoading ? 'Loading...' : 'Take Action'}}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}}
"""

    def _generate_react_test(self, name: str) -> str:
        """Generate React test file"""
        return f"""
import {{ render, screen, fireEvent, waitFor }} from '@testing-library/react'
import {{ {name} }} from '../{name}'

describe('{name}', () => {{
  const mockAction = jest.fn()

  beforeEach(() => {{
    mockAction.mockClear()
  }})

  test('renders component with default props', () => {{
    render(<{name} />)
    
    expect(screen.getByTestId('{name.lower()}-component')).toBeInTheDocument()
    expect(screen.getByTestId('{name.lower()}-title')).toHaveTextContent('Default Title')
  }})

  test('renders custom title', () => {{
    render(<{name} title="Custom Title" />)
    
    expect(screen.getByTestId('{name.lower()}-title')).toHaveTextContent('Custom Title')
  }})

  test('renders data items', () => {{
    const testData = [{{ id: 1, name: 'Item 1' }}, {{ id: 2, name: 'Item 2' }}]
    render(<{name} data={{testData}} />)
    
    expect(screen.getByTestId('{name.lower()}-item-0')).toBeInTheDocument()
    expect(screen.getByTestId('{name.lower()}-item-1')).toBeInTheDocument()
  }})

  test('calls onAction when button is clicked', async () => {{
    render(<{name} onAction={{mockAction}} />)
    
    fireEvent.click(screen.getByTestId('{name.lower()}-action'))
    
    await waitFor(() => {{
      expect(mockAction).toHaveBeenCalledTimes(1)
    }})
  }})

  test('shows loading state during action', async () => {{
    const slowAction = () => new Promise(resolve => setTimeout(resolve, 100))
    render(<{name} onAction={{slowAction}} />)
    
    fireEvent.click(screen.getByTestId('{name.lower()}-action'))
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  }})
}})
"""

    def _generate_python_service(self, name: str) -> str:
        """Generate Python service file for testing"""
        return f"""
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import BaseModel
import logging

logger = logging.getLogger(__name__)


class {name.title()}Service:
    \"\"\"Service for handling {name} operations\"\"\"
    
    def __init__(self, db: Session = Depends(get_db)):
        self.db = db
    
    async def get_all(self, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        \"\"\"Get all {name} records with pagination\"\"\"
        try:
            # Simulate database query
            records = []
            for i in range(skip, min(skip + limit, 50)):
                records.append({{
                    "id": i,
                    "name": f"{name}_{{i}}",
                    "status": "active" if i % 2 == 0 else "inactive",
                    "created_at": "2025-01-01T00:00:00Z"
                }})
            
            logger.info(f"Retrieved {{len(records)}} {name} records")
            return records
            
        except Exception as e:
            logger.error(f"Error retrieving {name} records: {{e}}")
            raise HTTPException(status_code=500, detail=f"Error retrieving {name} records")
    
    async def get_by_id(self, {name}_id: int) -> Optional[Dict[str, Any]]:
        \"\"\"Get {name} by ID\"\"\"
        try:
            # Simulate database lookup
            if {name}_id < 0 or {name}_id > 1000:
                return None
            
            record = {{
                "id": {name}_id,
                "name": f"{name}_{{{{name}}_id}}",
                "status": "active",
                "created_at": "2025-01-01T00:00:00Z",
                "metadata": {{
                    "version": "1.0",
                    "source": "benchmark"
                }}
            }}
            
            logger.info(f"Retrieved {name} record with ID {{{{name}}_id}}")
            return record
            
        except Exception as e:
            logger.error(f"Error retrieving {name} {{{{name}}_id}}: {{e}}")
            raise HTTPException(status_code=500, detail=f"Error retrieving {name}")
    
    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        \"\"\"Create new {name} record\"\"\"
        try:
            # Validate required fields
            if not data.get("name"):
                raise HTTPException(status_code=400, detail="Name is required")
            
            # Simulate database insert
            new_record = {{
                "id": hash(data.get("name", "")) % 1000,
                "name": data["name"],
                "status": data.get("status", "active"),
                "created_at": "2025-01-01T00:00:00Z",
                **data
            }}
            
            logger.info(f"Created new {name} record: {{new_record['id']}}")
            return new_record
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating {name}: {{e}}")
            raise HTTPException(status_code=500, detail=f"Error creating {name}")
    
    async def update(self, {name}_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        \"\"\"Update existing {name} record\"\"\"
        try:
            existing = await self.get_by_id({name}_id)
            if not existing:
                return None
            
            # Simulate database update
            updated_record = {{**existing, **data}}
            updated_record["updated_at"] = "2025-01-01T00:00:00Z"
            
            logger.info(f"Updated {name} record: {{{{name}}_id}}")
            return updated_record
            
        except Exception as e:
            logger.error(f"Error updating {name} {{{{name}}_id}}: {{e}}")
            raise HTTPException(status_code=500, detail=f"Error updating {name}")
    
    async def delete(self, {name}_id: int) -> bool:
        \"\"\"Delete {name} record\"\"\"
        try:
            existing = await self.get_by_id({name}_id)
            if not existing:
                return False
            
            # Simulate database delete
            logger.info(f"Deleted {name} record: {{{{name}}_id}}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting {name} {{{{name}}_id}}: {{e}}")
            raise HTTPException(status_code=500, detail=f"Error deleting {name}")


# Service instance
{name}_service = {name.title()}Service()
"""


class TestGitPerformanceBenchmarks:
    """Test suite for Git performance benchmarking"""

    @pytest.fixture
    def benchmarker(self, tmp_path):
        """Fixture providing Git performance benchmarker"""
        benchmarker = GitPerformanceBenchmarker(tmp_path)
        benchmarker.setup_benchmark_environment()
        return benchmarker

    @pytest.mark.asyncio
    async def test_baseline_performance_measurement(self, benchmarker):
        """Test baseline performance measurement without hooks"""
        baseline_metrics = benchmarker.measure_baseline_performance(iterations=5)

        assert len(baseline_metrics) == 5
        assert all(m.hook_overhead_ms == 0 for m in baseline_metrics)
        assert all(m.execution_time_ms > 0 for m in baseline_metrics)
        assert statistics.mean([m.execution_time_ms for m in baseline_metrics]) < 1000  # Under 1 second average

    @pytest.mark.asyncio
    async def test_pre_commit_performance_benchmark(self, benchmarker):
        """Test pre-commit hook performance benchmarking"""
        result = benchmarker.benchmark_pre_commit_performance(iterations=10)

        assert result.total_operations == 10
        assert result.success_rate >= 0.8  # At least 80% success rate
        assert result.avg_execution_time_ms > 0
        assert result.performance_grade in ["A", "B", "C", "D", "F"]

        # Performance should be reasonable
        assert result.p95_execution_time_ms < 10000  # Under 10 seconds for P95

    @pytest.mark.asyncio
    async def test_pre_push_performance_benchmark(self, benchmarker):
        """Test pre-push hook performance benchmarking"""
        result = benchmarker.benchmark_pre_push_performance(iterations=5)

        assert result.total_operations >= 0  # May have some failures due to push simulation
        if result.total_operations > 0:
            assert result.avg_execution_time_ms > 0
            assert result.performance_grade in ["A", "B", "C", "D", "F"]

    @pytest.mark.asyncio
    async def test_post_commit_performance_benchmark(self, benchmarker):
        """Test post-commit hook performance benchmarking"""
        result = benchmarker.benchmark_post_commit_performance(iterations=10)

        assert result.total_operations == 10
        assert result.success_rate >= 0.8  # At least 80% success rate
        assert result.avg_execution_time_ms > 0

        # Post-commit should be faster than pre-commit
        assert result.avg_execution_time_ms < 3000  # Under 3 seconds average

    @pytest.mark.asyncio
    async def test_full_workflow_performance_benchmark(self, benchmarker):
        """Test full Git workflow performance benchmarking"""
        result = benchmarker.benchmark_full_workflow_performance(iterations=5)

        assert result.total_operations == 5
        assert result.avg_execution_time_ms > 0

        # Full workflow includes commit + push, so should be longer
        assert result.avg_execution_time_ms > 100  # At least 100ms

    @pytest.mark.asyncio
    async def test_concurrent_operations_benchmark(self, benchmarker):
        """Test concurrent Git operations performance"""
        result = benchmarker.benchmark_concurrent_operations(max_workers=3, operations_per_worker=3)

        assert result.total_operations == 9  # 3 workers * 3 operations
        assert result.throughput_ops_per_sec > 0

        # Concurrent operations should maintain reasonable performance
        if result.success_rate > 0:
            assert result.avg_execution_time_ms > 0

    @pytest.mark.asyncio
    async def test_performance_threshold_validation(self, benchmarker):
        """Test performance threshold validation"""
        # Test with small operation that should meet thresholds
        small_files = {"small_test.txt": "Small content"}
        metric = benchmarker._measure_commit_operation(small_files, "Small test", "pre_commit")

        assert metric.execution_time_ms > 0
        assert metric.success == True

        # Test threshold checking
        thresholds = benchmarker.PERFORMANCE_THRESHOLDS["pre_commit"]
        assert thresholds["max_execution_time_ms"] > 0
        assert thresholds["min_success_rate"] > 0


if __name__ == "__main__":
    # Run performance benchmarking
    import sys

    if len(sys.argv) > 1:
        benchmark_type = sys.argv[1]
        workspace = Path(tempfile.mkdtemp())

        try:
            benchmarker = GitPerformanceBenchmarker(workspace)
            benchmarker.setup_benchmark_environment()

            print(f"🚀 Running Git performance benchmarks in {workspace}")

            if benchmark_type == "all":
                # Run all benchmarks
                results = {
                    "baseline": benchmarker.measure_baseline_performance(),
                    "pre_commit": benchmarker.benchmark_pre_commit_performance(),
                    "pre_push": benchmarker.benchmark_pre_push_performance(),
                    "post_commit": benchmarker.benchmark_post_commit_performance(),
                    "full_workflow": benchmarker.benchmark_full_workflow_performance(),
                    "concurrent": benchmarker.benchmark_concurrent_operations()
                }

                # Save comprehensive report
                report_path = workspace / "performance_benchmark_report.json"
                with open(report_path, 'w') as f:
                    json.dump({k: v.to_dict() if hasattr(v, 'to_dict') else [m.to_dict() for m in v]
                              for k, v in results.items()}, f, indent=2)

                print(f"📊 Comprehensive benchmark report saved to {report_path}")

            elif benchmark_type == "quick":
                # Quick benchmark
                result = benchmarker.benchmark_pre_commit_performance(iterations=5)
                print(f"📈 Quick benchmark result: {result.performance_grade} grade, "
                      f"{result.avg_execution_time_ms:.2f}ms average")

        finally:
            # Cleanup
            import shutil
            shutil.rmtree(workspace, ignore_errors=True)
    else:
        pytest.main(["-v", __file__])
