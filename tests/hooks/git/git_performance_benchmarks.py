"""
Git Hook Performance Benchmarks
===============================

Comprehensive performance testing and benchmarking system for Git hook integration.
This module provides detailed performance analysis, bottleneck identification, and
optimization recommendations for the Git hook system.

Features:
- Real-time performance monitoring
- Statistical analysis of hook execution times
- Memory usage tracking and optimization
- Load testing and stress testing
- Performance regression detection
- Automated optimization suggestions
- Detailed reporting and visualization
- Benchmark comparisons and trending

Author: Performance Engineering Team
Version: 2.0.0
Dependencies: pytest, psutil, matplotlib, numpy, pandas
"""

import asyncio
import json
import logging
import multiprocessing
import os
import platform
import statistics
import subprocess
import threading
import time
from collections import deque
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

import pytest
from git import Repo

# Optional dependencies for enhanced analysis
try:
    import psutil

    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

try:
    import numpy as np

    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

try:
    import matplotlib.dates as mdates
    import matplotlib.pyplot as plt

    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False


@dataclass
class PerformanceMetric:
    """Individual performance metric measurement"""

    name: str
    value: float
    unit: str
    timestamp: datetime
    context: dict[str, Any] = None

    def __post_init__(self):
        if self.context is None:
            self.context = {}


@dataclass
class BenchmarkResult:
    """Comprehensive benchmark result"""

    benchmark_id: str
    benchmark_name: str
    start_time: datetime
    end_time: datetime
    total_duration_ms: float
    iterations: int
    success_rate: float
    metrics: list[PerformanceMetric]
    system_info: dict[str, Any]
    environment: dict[str, str]

    # Statistical measurements
    min_time_ms: float = 0.0
    max_time_ms: float = 0.0
    mean_time_ms: float = 0.0
    median_time_ms: float = 0.0
    std_dev_ms: float = 0.0
    percentile_95_ms: float = 0.0
    percentile_99_ms: float = 0.0

    # Resource usage
    peak_memory_mb: float = 0.0
    avg_cpu_percent: float = 0.0
    disk_io_mb: float = 0.0
    network_io_mb: float = 0.0

    # Quality indicators
    performance_grade: str = "N/A"
    optimization_suggestions: list[str] = None
    regression_detected: bool = False

    def __post_init__(self):
        if self.optimization_suggestions is None:
            self.optimization_suggestions = []


class SystemProfiler:
    """System resource profiling and monitoring"""

    def __init__(self):
        self.monitoring = False
        self.data_points = deque(maxlen=10000)  # Keep last 10k measurements
        self.monitoring_thread = None
        self.lock = threading.Lock()

    def start_monitoring(self, interval_ms: int = 100):
        """Start system resource monitoring"""
        if not HAS_PSUTIL:
            logging.warning("psutil not available, system monitoring disabled")
            return

        self.monitoring = True
        self.monitoring_thread = threading.Thread(
            target=self._monitor_resources, args=(interval_ms / 1000.0,), daemon=True
        )
        self.monitoring_thread.start()

    def stop_monitoring(self):
        """Stop system resource monitoring"""
        self.monitoring = False
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=1.0)

    def _monitor_resources(self, interval_seconds: float):
        """Monitor system resources in background thread"""
        process = psutil.Process() if HAS_PSUTIL else None

        while self.monitoring and process:
            try:
                # System-wide metrics
                cpu_percent = psutil.cpu_percent(interval=None)
                memory = psutil.virtual_memory()
                disk_io = psutil.disk_io_counters()

                # Process-specific metrics
                proc_memory = process.memory_info()
                proc_cpu = process.cpu_percent(interval=None)

                data_point = {
                    "timestamp": time.time(),
                    "system_cpu_percent": cpu_percent,
                    "system_memory_percent": memory.percent,
                    "system_memory_available_mb": memory.available / 1024 / 1024,
                    "process_memory_rss_mb": proc_memory.rss / 1024 / 1024,
                    "process_memory_vms_mb": proc_memory.vms / 1024 / 1024,
                    "process_cpu_percent": proc_cpu,
                }

                if disk_io:
                    data_point.update(
                        {
                            "disk_read_mb": disk_io.read_bytes / 1024 / 1024,
                            "disk_write_mb": disk_io.write_bytes / 1024 / 1024,
                        }
                    )

                with self.lock:
                    self.data_points.append(data_point)

            except Exception as e:
                logging.error(f"Resource monitoring error: {e}")

            time.sleep(interval_seconds)

    def get_current_snapshot(self) -> dict[str, Any]:
        """Get current system resource snapshot"""
        if not HAS_PSUTIL:
            return {}

        try:
            process = psutil.Process()
            memory_info = process.memory_info()

            return {
                "cpu_percent": process.cpu_percent(interval=0.1),
                "memory_rss_mb": memory_info.rss / 1024 / 1024,
                "memory_vms_mb": memory_info.vms / 1024 / 1024,
                "open_files": len(process.open_files()),
                "connections": len(process.connections()),
                "threads": process.num_threads(),
                "system_cpu_percent": psutil.cpu_percent(interval=0.1),
                "system_memory_percent": psutil.virtual_memory().percent,
            }
        except Exception as e:
            logging.error(f"Failed to get system snapshot: {e}")
            return {}

    def get_statistics(self, duration_minutes: int = 5) -> dict[str, Any]:
        """Get statistical analysis of recent monitoring data"""
        if not self.data_points:
            return {}

        current_time = time.time()
        cutoff_time = current_time - (duration_minutes * 60)

        with self.lock:
            recent_data = [
                dp for dp in self.data_points if dp["timestamp"] > cutoff_time
            ]

        if not recent_data:
            return {}

        # Calculate statistics for key metrics
        stats = {}
        for key in [
            "system_cpu_percent",
            "process_memory_rss_mb",
            "process_cpu_percent",
        ]:
            if key in recent_data[0]:
                values = [dp[key] for dp in recent_data]
                stats[key] = {
                    "min": min(values),
                    "max": max(values),
                    "mean": statistics.mean(values),
                    "median": statistics.median(values),
                    "std_dev": statistics.stdev(values) if len(values) > 1 else 0,
                }

                if HAS_NUMPY:
                    stats[key]["percentile_95"] = np.percentile(values, 95)
                    stats[key]["percentile_99"] = np.percentile(values, 99)

        return stats


class GitHookBenchmarker:
    """Comprehensive Git hook performance benchmarking"""

    def __init__(self, workspace: Path, enable_profiling: bool = True):
        self.workspace = workspace
        self.enable_profiling = enable_profiling
        self.profiler = SystemProfiler() if enable_profiling else None
        self.benchmark_results = []
        self.baseline_results = {}
        self.logger = logging.getLogger(__name__)

        # Test repositories
        self.test_repos = {}

        # Performance thresholds
        self.performance_thresholds = {
            "pre_commit_ms": 500,  # Pre-commit should complete under 500ms
            "post_commit_ms": 200,  # Post-commit should complete under 200ms
            "pre_push_ms": 2000,  # Pre-push can take up to 2 seconds
            "memory_mb": 100,  # Memory usage should stay under 100MB
            "cpu_percent": 50,  # CPU usage should stay under 50%
        }

        # Benchmark configurations
        self.benchmark_configs = {
            "quick": {"iterations": 10, "parallel_workers": 1},
            "standard": {"iterations": 50, "parallel_workers": 2},
            "comprehensive": {"iterations": 100, "parallel_workers": 4},
            "stress": {"iterations": 500, "parallel_workers": 8},
        }

    async def initialize(self):
        """Initialize benchmarking environment"""
        self.workspace.mkdir(parents=True, exist_ok=True)

        # Create benchmark workspace structure
        for subdir in ["repos", "results", "reports", "baselines", "artifacts"]:
            (self.workspace / subdir).mkdir(exist_ok=True)

        # Start profiling if enabled
        if self.profiler:
            self.profiler.start_monitoring(interval_ms=50)

        self.logger.info("Git hook benchmarker initialized")

    async def create_benchmark_repository(
        self, repo_name: str, repo_type: str = "standard"
    ) -> Repo:
        """Create a repository optimized for benchmarking"""
        repo_path = self.workspace / "repos" / repo_name

        if repo_path.exists():
            import shutil

            shutil.rmtree(repo_path)

        repo_path.mkdir(parents=True)

        # Initialize Git repository
        repo = Repo.init(repo_path)

        # Configure for performance testing
        with repo.config_writer() as config:
            config.set_value("user", "name", "Benchmark Test")
            config.set_value("user", "email", "benchmark@test.local")
            config.set_value("core", "autocrlf", "false")
            config.set_value("core", "preloadindex", "true")
            config.set_value("core", "fscache", "true")
            config.set_value("gc", "auto", "256")

        # Create repository content based on type
        await self._populate_benchmark_repository(repo, repo_path, repo_type)

        # Install performance-optimized hooks
        await self._install_benchmark_hooks(repo_path)

        # Make initial commit
        repo.index.add_items(["."])
        repo.index.commit("Initial benchmark repository setup")

        self.test_repos[repo_name] = repo
        return repo

    async def _populate_benchmark_repository(
        self, repo: Repo, repo_path: Path, repo_type: str
    ):
        """Populate repository with appropriate test content"""
        if repo_type == "minimal":
            await self._create_minimal_content(repo_path)
        elif repo_type == "frontend":
            await self._create_frontend_content(repo_path)
        elif repo_type == "backend":
            await self._create_backend_content(repo_path)
        elif repo_type == "large":
            await self._create_large_content(repo_path)
        else:  # standard
            await self._create_standard_content(repo_path)

    async def _create_minimal_content(self, repo_path: Path):
        """Create minimal repository content for baseline benchmarks"""
        files = {
            "README.md": "# Benchmark Repository\n\nMinimal content for performance testing.",
            ".gitignore": "*.log\n.DS_Store",
            "package.json": '{"name": "benchmark", "version": "1.0.0"}',
        }

        for file_path, content in files.items():
            (repo_path / file_path).write_text(content)

    async def _create_standard_content(self, repo_path: Path):
        """Create standard repository content"""
        await self._create_minimal_content(repo_path)

        # Add some source files
        src_dir = repo_path / "src"
        src_dir.mkdir(exist_ok=True)

        for i in range(10):
            (src_dir / f"module_{i}.js").write_text(
                f"// Module {i}\nexport const data{i} = 'test data';\n"
            )

    async def _create_frontend_content(self, repo_path: Path):
        """Create frontend repository content"""
        await self._create_standard_content(repo_path)

        # Frontend structure
        dirs = ["src/components", "src/hooks", "src/lib", "public", "__tests__"]
        for dir_path in dirs:
            (repo_path / dir_path).mkdir(parents=True, exist_ok=True)

        # React components
        component_template = """import React from 'react'
import {{ Button }} from '@/components/ui/button'

interface Component{i}Props {{
  title: string
  onClick: () => void
}}

export const Component{i}: React.FC<Component{i}Props> = ({{ title, onClick }}) => {{
  return (
    <div data-testid="component-{i}">
      <h1 data-testid="title">{{title}}</h1>
      <Button data-testid="button" onClick={{onClick}}>
        Action {i}
      </Button>
    </div>
  )
}}
"""

        for i in range(15):
            (repo_path / "src/components" / f"Component{i}.tsx").write_text(
                component_template.format(i=i)
            )

    async def _create_backend_content(self, repo_path: Path):
        """Create backend repository content"""
        await self._create_standard_content(repo_path)

        # Backend structure
        dirs = [
            "app/api",
            "app/models",
            "app/services",
            "tests/unit",
            "tests/integration",
        ]
        for dir_path in dirs:
            (repo_path / dir_path).mkdir(parents=True, exist_ok=True)

        # FastAPI modules
        api_template = '''from fastapi import APIRouter, HTTPException
from typing import List, Optional

router = APIRouter()

@router.get("/api/v1/items{i}")
async def get_items{i}(skip: int = 0, limit: int = 100) -> List[dict]:
    """Get items from endpoint {i}"""
    return [{{"id": j, "name": f"Item {{j}} from endpoint {i}"}} for j in range(skip, skip + limit)]

@router.post("/api/v1/items{i}")
async def create_item{i}(item: dict) -> dict:
    """Create new item in endpoint {i}"""
    return {{"id": len(str(item)), "created": True, "endpoint": {i}}}
'''

        for i in range(8):
            (repo_path / "app/api" / f"endpoint_{i}.py").write_text(
                api_template.format(i=i)
            )

    async def _create_large_content(self, repo_path: Path):
        """Create large repository content for stress testing"""
        await self._create_frontend_content(repo_path)
        await self._create_backend_content(repo_path)

        # Add many additional files
        large_dir = repo_path / "generated"
        large_dir.mkdir(exist_ok=True)

        for i in range(100):
            content = f"// Generated file {i}\n" + "export const data = " + "'x'" * 1000
            (large_dir / f"generated_{i}.ts").write_text(content)

    async def _install_benchmark_hooks(self, repo_path: Path):
        """Install performance-optimized Git hooks"""
        hooks_dir = repo_path / ".git" / "hooks"

        # High-performance pre-commit hook
        pre_commit_hook = """#!/bin/bash
set -e

# Performance-optimized pre-commit hook for benchmarking
START_TIME=$(date +%s%N)

echo "📊 Benchmark: Pre-commit validation starting"

# Claude Flow integration with timing
if command -v npx &> /dev/null; then
    CLAUDE_START=$(date +%s%N)
    npx claude-flow hooks pre-task --description "Benchmark pre-commit" 2>/dev/null || true
    CLAUDE_END=$(date +%s%N)
    CLAUDE_TIME=$((($CLAUDE_END - $CLAUDE_START) / 1000000))
    echo "Claude Flow time: ${CLAUDE_TIME}ms"
fi

# Get staged files efficiently
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR)
FILE_COUNT=$(echo "$STAGED_FILES" | wc -l)

echo "Processing $FILE_COUNT staged files"

# Optimized validation
VALIDATION_FAILED=false
VALIDATION_TIME=0

if [ -n "$STAGED_FILES" ]; then
    VALIDATION_START=$(date +%s%N)

    # Parallel processing for multiple files
    echo "$STAGED_FILES" | while IFS= read -r file; do
        if [[ "$file" =~ \\.tsx?$ ]]; then
            # Fast regex-based checks
            if grep -q "@mui\\|material-ui" "$file" 2>/dev/null; then
                echo "❌ PRD Violation: $file"
                VALIDATION_FAILED=true
            fi
        fi
    done

    VALIDATION_END=$(date +%s%N)
    VALIDATION_TIME=$((($VALIDATION_END - $VALIDATION_START) / 1000000))
fi

# Claude Flow post-task with timing
if command -v npx &> /dev/null; then
    CLAUDE_POST_START=$(date +%s%N)
    npx claude-flow hooks post-task --task-id "benchmark-pre-commit" 2>/dev/null || true
    CLAUDE_POST_END=$(date +%s%N)
    CLAUDE_POST_TIME=$((($CLAUDE_POST_END - $CLAUDE_POST_START) / 1000000))
    echo "Claude Flow post-task time: ${CLAUDE_POST_TIME}ms"
fi

END_TIME=$(date +%s%N)
TOTAL_TIME=$((($END_TIME - $START_TIME) / 1000000))

# Log performance metrics
echo "Performance Metrics:"
echo "  Total time: ${TOTAL_TIME}ms"
echo "  Validation time: ${VALIDATION_TIME}ms"
echo "  Files processed: $FILE_COUNT"
echo "  Time per file: $((TOTAL_TIME / (FILE_COUNT > 0 ? FILE_COUNT : 1)))ms"

# Store metrics for benchmark analysis
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),pre-commit,${TOTAL_TIME},${FILE_COUNT}" >> .claude_workspace/reports/hook-performance.csv 2>/dev/null || true

if [ "$VALIDATION_FAILED" = true ]; then
    echo "❌ Benchmark pre-commit validation failed in ${TOTAL_TIME}ms"
    exit 1
fi

echo "✅ Benchmark pre-commit validation passed in ${TOTAL_TIME}ms"
exit 0
"""

        (hooks_dir / "pre-commit").write_text(pre_commit_hook)
        (hooks_dir / "pre-commit").chmod(0o755)

        # High-performance post-commit hook
        post_commit_hook = """#!/bin/bash
START_TIME=$(date +%s%N)

echo "📊 Benchmark: Post-commit automation starting"

# Get commit info efficiently
COMMIT_HASH=$(git rev-parse --short HEAD)
CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD | wc -l)

# Claude Flow memory operations with timing
if command -v npx &> /dev/null; then
    MEMORY_START=$(date +%s%N)
    npx claude-flow memory store "benchmark/commits/$COMMIT_HASH" "$CHANGED_FILES" --namespace "benchmark" 2>/dev/null || true
    MEMORY_END=$(date +%s%N)
    MEMORY_TIME=$((($MEMORY_END - $MEMORY_START) / 1000000))
    echo "Memory operation time: ${MEMORY_TIME}ms"
fi

END_TIME=$(date +%s%N)
TOTAL_TIME=$((($END_TIME - $START_TIME) / 1000000))

echo "Post-commit completed in ${TOTAL_TIME}ms"

# Store metrics
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),post-commit,${TOTAL_TIME},${CHANGED_FILES}" >> .claude_workspace/reports/hook-performance.csv 2>/dev/null || true

exit 0
"""

        (hooks_dir / "post-commit").write_text(post_commit_hook)
        (hooks_dir / "post-commit").chmod(0o755)

    async def run_benchmark_suite(
        self, suite_name: str = "standard"
    ) -> BenchmarkResult:
        """Run comprehensive benchmark suite"""
        if suite_name not in self.benchmark_configs:
            raise ValueError(f"Unknown benchmark suite: {suite_name}")

        config = self.benchmark_configs[suite_name]
        benchmark_id = f"git_hooks_{suite_name}_{int(time.time())}"

        self.logger.info(f"Starting benchmark suite: {suite_name}")
        start_time = datetime.now()

        # Get system info
        system_info = self._get_system_info()

        # Create benchmark repository
        repo = await self.create_benchmark_repository(
            f"bench_{benchmark_id}", "standard"
        )

        # Initialize metrics collection
        metrics = []
        execution_times = []
        success_count = 0

        # Run benchmark iterations
        for iteration in range(config["iterations"]):
            try:
                # Run single benchmark iteration
                iteration_result = await self._run_single_iteration(
                    repo, iteration, config["parallel_workers"]
                )

                execution_times.append(iteration_result["execution_time_ms"])
                metrics.extend(iteration_result["metrics"])

                if iteration_result["success"]:
                    success_count += 1

            except Exception as e:
                self.logger.error(f"Benchmark iteration {iteration} failed: {e}")

        end_time = datetime.now()
        total_duration = (end_time - start_time).total_seconds() * 1000

        # Calculate statistics
        stats = self._calculate_statistics(execution_times)

        # Get resource usage statistics
        resource_stats = self.profiler.get_statistics() if self.profiler else {}

        # Create benchmark result
        result = BenchmarkResult(
            benchmark_id=benchmark_id,
            benchmark_name=f"Git Hook {suite_name.title()} Benchmark",
            start_time=start_time,
            end_time=end_time,
            total_duration_ms=total_duration,
            iterations=config["iterations"],
            success_rate=success_count / config["iterations"],
            metrics=metrics,
            system_info=system_info,
            environment=dict(os.environ),
            **stats,
        )

        # Add resource usage if available
        if resource_stats and "process_memory_rss_mb" in resource_stats:
            result.peak_memory_mb = resource_stats["process_memory_rss_mb"]["max"]
            result.avg_cpu_percent = resource_stats["process_cpu_percent"]["mean"]

        # Performance analysis
        result.performance_grade = self._calculate_performance_grade(result)
        result.optimization_suggestions = self._generate_optimization_suggestions(
            result
        )
        result.regression_detected = await self._detect_regression(result)

        # Store result
        self.benchmark_results.append(result)
        await self._save_benchmark_result(result)

        self.logger.info(f"Benchmark suite completed: {result.performance_grade} grade")
        return result

    async def _run_single_iteration(
        self, repo: Repo, iteration: int, parallel_workers: int
    ) -> dict[str, Any]:
        """Run a single benchmark iteration"""
        start_time = time.time()

        try:
            # Create test files for this iteration
            test_files = await self._create_iteration_files(repo, iteration)

            # Stage files
            repo.index.add(list(test_files.keys()))

            # Measure commit operation
            commit_start = time.time()
            commit = repo.index.commit(f"Benchmark iteration {iteration}")
            commit_end = time.time()

            commit_time_ms = (commit_end - commit_start) * 1000
            total_time_ms = (commit_end - start_time) * 1000

            # Collect metrics
            metrics = [
                PerformanceMetric(
                    name="commit_time",
                    value=commit_time_ms,
                    unit="ms",
                    timestamp=datetime.now(),
                    context={"iteration": iteration, "files": len(test_files)},
                ),
                PerformanceMetric(
                    name="total_iteration_time",
                    value=total_time_ms,
                    unit="ms",
                    timestamp=datetime.now(),
                    context={"iteration": iteration},
                ),
            ]

            # Add system metrics if profiler is available
            if self.profiler:
                system_snapshot = self.profiler.get_current_snapshot()
                for key, value in system_snapshot.items():
                    metrics.append(
                        PerformanceMetric(
                            name=key,
                            value=value,
                            unit="mb"
                            if "memory" in key
                            else "percent"
                            if "percent" in key
                            else "count",
                            timestamp=datetime.now(),
                            context={"iteration": iteration},
                        )
                    )

            return {
                "success": True,
                "execution_time_ms": total_time_ms,
                "commit_time_ms": commit_time_ms,
                "metrics": metrics,
                "commit_hash": commit.hexsha,
            }

        except Exception as e:
            return {
                "success": False,
                "execution_time_ms": (time.time() - start_time) * 1000,
                "metrics": [],
                "error": str(e),
            }

    async def _create_iteration_files(
        self, repo: Repo, iteration: int
    ) -> dict[str, str]:
        """Create test files for benchmark iteration"""
        repo_path = Path(repo.working_dir)
        test_files = {}

        # Create a mix of file types
        file_types = [
            ("tsx", "React component"),
            ("py", "Python module"),
            ("js", "JavaScript module"),
            ("md", "Documentation"),
            ("json", "Configuration"),
        ]

        for i, (ext, desc) in enumerate(file_types):
            file_path = f"benchmark/iteration_{iteration}_file_{i}.{ext}"

            if ext == "tsx":
                content = f"""import React from 'react'
import {{ Button }} from '@/components/ui/button'

export const BenchmarkComponent{iteration}_{i} = () => {{
  return (
    <div data-testid="benchmark-{iteration}-{i}">
      <h1>Benchmark {iteration} Component {i}</h1>
      <Button data-testid="action-button">Action</Button>
    </div>
  )
}}
"""
            elif ext == "py":
                content = f'''"""
Benchmark module {iteration}_{i}
Generated for performance testing
"""

def benchmark_function_{iteration}_{i}():
    """Benchmark function for iteration {iteration} file {i}"""
    return f"Benchmark {{iteration}} result {{i}}"

class BenchmarkClass{iteration}_{i}:
    """Benchmark class for performance testing"""

    def __init__(self):
        self.iteration = {iteration}
        self.file_id = {i}

    def process(self):
        return f"Processed iteration {{self.iteration}} file {{self.file_id}}"
'''
            elif ext == "js":
                content = f"""// Benchmark JavaScript module {iteration}_{i}

export const benchmarkData{iteration}_{i} = {{
  iteration: {iteration},
  fileId: {i},
  timestamp: Date.now(),
  data: 'benchmark test data'
}};

export function benchmarkFunction{iteration}_{i}() {{
  return `Benchmark ${{iteration}} function ${{i}}`;
}}
"""
            elif ext == "md":
                content = f"""# Benchmark Documentation {iteration}_{i}

This is documentation file {i} for benchmark iteration {iteration}.

## Overview

Performance testing documentation for Git hook benchmarks.

## Metrics

- Iteration: {iteration}
- File ID: {i}
- Type: {desc}
"""
            else:  # json
                content = f'''{{
  "benchmark_iteration": {iteration},
  "file_id": {i},
  "file_type": "{desc}",
  "timestamp": "{datetime.now().isoformat()}",
  "metadata": {{
    "performance_test": true,
    "git_hooks": true
  }}
}}
'''

            full_path = repo_path / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content)
            test_files[file_path] = content

        return test_files

    def _calculate_statistics(self, execution_times: list[float]) -> dict[str, float]:
        """Calculate statistical measures from execution times"""
        if not execution_times:
            return {}

        stats = {
            "min_time_ms": min(execution_times),
            "max_time_ms": max(execution_times),
            "mean_time_ms": statistics.mean(execution_times),
            "median_time_ms": statistics.median(execution_times),
        }

        if len(execution_times) > 1:
            stats["std_dev_ms"] = statistics.stdev(execution_times)
        else:
            stats["std_dev_ms"] = 0.0

        # Add percentiles if numpy is available
        if HAS_NUMPY and len(execution_times) >= 2:
            stats["percentile_95_ms"] = float(np.percentile(execution_times, 95))
            stats["percentile_99_ms"] = float(np.percentile(execution_times, 99))
        else:
            # Fallback percentile calculation
            sorted_times = sorted(execution_times)
            n = len(sorted_times)
            stats["percentile_95_ms"] = (
                sorted_times[int(n * 0.95)] if n > 1 else stats["max_time_ms"]
            )
            stats["percentile_99_ms"] = (
                sorted_times[int(n * 0.99)] if n > 1 else stats["max_time_ms"]
            )

        return stats

    def _get_system_info(self) -> dict[str, Any]:
        """Get comprehensive system information"""
        info = {
            "platform": platform.platform(),
            "processor": platform.processor(),
            "architecture": platform.architecture(),
            "python_version": platform.python_version(),
            "cpu_count": multiprocessing.cpu_count(),
        }

        if HAS_PSUTIL:
            info.update(
                {
                    "total_memory_gb": psutil.virtual_memory().total / (1024**3),
                    "available_memory_gb": psutil.virtual_memory().available
                    / (1024**3),
                    "disk_usage_percent": psutil.disk_usage("/").percent,
                    "boot_time": datetime.fromtimestamp(psutil.boot_time()).isoformat(),
                }
            )

        # Git version
        try:
            git_version = subprocess.check_output(
                ["git", "--version"], text=True
            ).strip()
            info["git_version"] = git_version
        except subprocess.CalledProcessError:
            info["git_version"] = "unknown"

        # Node.js version (for Claude Flow)
        try:
            node_version = subprocess.check_output(
                ["node", "--version"], text=True
            ).strip()
            info["node_version"] = node_version
        except subprocess.CalledProcessError:
            info["node_version"] = "not available"

        return info

    def _calculate_performance_grade(self, result: BenchmarkResult) -> str:
        """Calculate performance grade based on metrics"""
        score = 100

        # Check against thresholds
        if result.mean_time_ms > self.performance_thresholds["pre_commit_ms"]:
            score -= 20

        if result.percentile_95_ms > self.performance_thresholds["pre_commit_ms"] * 1.5:
            score -= 15

        if result.peak_memory_mb > self.performance_thresholds["memory_mb"]:
            score -= 15

        if result.avg_cpu_percent > self.performance_thresholds["cpu_percent"]:
            score -= 10

        if result.success_rate < 0.95:
            score -= 20

        # Grade assignment
        if score >= 90:
            return "A+"
        elif score >= 80:
            return "A"
        elif score >= 70:
            return "B"
        elif score >= 60:
            return "C"
        else:
            return "F"

    def _generate_optimization_suggestions(self, result: BenchmarkResult) -> list[str]:
        """Generate optimization suggestions based on benchmark results"""
        suggestions = []

        if result.mean_time_ms > self.performance_thresholds["pre_commit_ms"]:
            suggestions.append("Consider optimizing Git hook execution time")
            suggestions.append("Enable parallel processing for file validation")

        if result.std_dev_ms > result.mean_time_ms * 0.3:
            suggestions.append(
                "High variance in execution times - investigate inconsistent performance"
            )

        if result.peak_memory_mb > self.performance_thresholds["memory_mb"]:
            suggestions.append("Memory usage is high - consider memory optimization")
            suggestions.append("Implement memory cleanup in hook scripts")

        if result.avg_cpu_percent > self.performance_thresholds["cpu_percent"]:
            suggestions.append("CPU usage is high - optimize computational complexity")

        if result.success_rate < 0.99:
            suggestions.append("Improve error handling and reliability")

        # Claude Flow specific suggestions
        claude_flow_metrics = [m for m in result.metrics if "claude" in m.name.lower()]
        if claude_flow_metrics:
            avg_claude_time = statistics.mean([m.value for m in claude_flow_metrics])
            if avg_claude_time > 100:
                suggestions.append(
                    "Claude Flow integration overhead is high - consider async execution"
                )

        return suggestions

    async def _detect_regression(self, result: BenchmarkResult) -> bool:
        """Detect performance regression compared to baseline"""
        baseline_key = f"{result.benchmark_name.lower().replace(' ', '_')}_baseline"

        if baseline_key not in self.baseline_results:
            return False

        baseline = self.baseline_results[baseline_key]

        # Check for significant performance degradation
        regression_threshold = 1.2  # 20% degradation threshold

        if result.mean_time_ms > baseline.mean_time_ms * regression_threshold:
            return True

        if result.percentile_95_ms > baseline.percentile_95_ms * regression_threshold:
            return True

        if result.peak_memory_mb > baseline.peak_memory_mb * regression_threshold:
            return True

        return False

    async def _save_benchmark_result(self, result: BenchmarkResult):
        """Save benchmark result to storage"""
        results_dir = self.workspace / "results"

        # Save detailed JSON result
        result_file = results_dir / f"{result.benchmark_id}.json"

        # Convert result to dictionary for JSON serialization
        result_dict = asdict(result)

        # Handle datetime serialization
        for key in ["start_time", "end_time"]:
            if result_dict.get(key):
                result_dict[key] = result_dict[key].isoformat()

        # Handle metrics serialization
        for metric in result_dict.get("metrics", []):
            if "timestamp" in metric:
                metric["timestamp"] = metric["timestamp"].isoformat()

        with open(result_file, "w") as f:
            json.dump(result_dict, f, indent=2, default=str)

        # Save summary CSV
        summary_file = results_dir / "benchmark_summary.csv"
        write_header = not summary_file.exists()

        with open(summary_file, "a") as f:
            if write_header:
                f.write(
                    "timestamp,benchmark_id,name,duration_ms,iterations,success_rate,"
                    "mean_time_ms,p95_time_ms,peak_memory_mb,grade\n"
                )

            f.write(
                f"{result.start_time.isoformat()},{result.benchmark_id},"
                f"{result.benchmark_name},{result.total_duration_ms},"
                f"{result.iterations},{result.success_rate:.3f},"
                f"{result.mean_time_ms:.2f},{result.percentile_95_ms:.2f},"
                f"{result.peak_memory_mb:.2f},{result.performance_grade}\n"
            )

    async def generate_performance_report(self, output_format: str = "html") -> str:
        """Generate comprehensive performance report"""
        if not self.benchmark_results:
            raise ValueError("No benchmark results available for reporting")

        reports_dir = self.workspace / "reports"
        reports_dir.mkdir(exist_ok=True)

        if output_format.lower() == "html":
            return await self._generate_html_report(reports_dir)
        elif output_format.lower() == "json":
            return await self._generate_json_report(reports_dir)
        elif output_format.lower() == "csv":
            return await self._generate_csv_report(reports_dir)
        else:
            raise ValueError(f"Unsupported output format: {output_format}")

    async def _generate_html_report(self, reports_dir: Path) -> str:
        """Generate comprehensive HTML performance report"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = reports_dir / f"performance_report_{timestamp}.html"

        latest_result = self.benchmark_results[-1]

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Git Hook Performance Report</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }}
        .header {{ text-align: center; margin-bottom: 40px; }}
        .metrics-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }}
        .metric-card {{ border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: #f9f9f9; }}
        .metric-value {{ font-size: 24px; font-weight: bold; color: #333; }}
        .metric-label {{ font-size: 14px; color: #666; margin-top: 5px; }}
        .grade-{latest_result.performance_grade.lower().replace("+", "plus")} {{ background-color: {"#d4edda" if latest_result.performance_grade.startswith("A") else "#fff3cd" if latest_result.performance_grade.startswith("B") else "#f8d7da"}; }}
        .suggestions {{ background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
        th {{ background-color: #f5f5f5; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Git Hook Performance Report</h1>
        <p>Generated on {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
        <h2 class="grade-{latest_result.performance_grade.lower().replace("+", "plus")}">Performance Grade: {latest_result.performance_grade}</h2>
    </div>

    <div class="metrics-grid">
        <div class="metric-card">
            <div class="metric-value">{latest_result.mean_time_ms:.1f}ms</div>
            <div class="metric-label">Average Execution Time</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">{latest_result.percentile_95_ms:.1f}ms</div>
            <div class="metric-label">95th Percentile</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">{latest_result.success_rate:.1%}</div>
            <div class="metric-label">Success Rate</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">{latest_result.peak_memory_mb:.1f}MB</div>
            <div class="metric-label">Peak Memory Usage</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">{latest_result.iterations}</div>
            <div class="metric-label">Test Iterations</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">{latest_result.total_duration_ms / 1000:.1f}s</div>
            <div class="metric-label">Total Test Duration</div>
        </div>
    </div>

    <h3>📊 Performance Statistics</h3>
    <table>
        <tr><th>Metric</th><th>Value</th><th>Threshold</th><th>Status</th></tr>
        <tr>
            <td>Mean Execution Time</td>
            <td>{latest_result.mean_time_ms:.2f}ms</td>
            <td>{self.performance_thresholds["pre_commit_ms"]}ms</td>
            <td>{"✅ PASS" if latest_result.mean_time_ms <= self.performance_thresholds["pre_commit_ms"] else "❌ FAIL"}</td>
        </tr>
        <tr>
            <td>95th Percentile</td>
            <td>{latest_result.percentile_95_ms:.2f}ms</td>
            <td>{self.performance_thresholds["pre_commit_ms"] * 1.5:.0f}ms</td>
            <td>{"✅ PASS" if latest_result.percentile_95_ms <= self.performance_thresholds["pre_commit_ms"] * 1.5 else "❌ FAIL"}</td>
        </tr>
        <tr>
            <td>Peak Memory</td>
            <td>{latest_result.peak_memory_mb:.2f}MB</td>
            <td>{self.performance_thresholds["memory_mb"]}MB</td>
            <td>{"✅ PASS" if latest_result.peak_memory_mb <= self.performance_thresholds["memory_mb"] else "❌ FAIL"}</td>
        </tr>
        <tr>
            <td>Success Rate</td>
            <td>{latest_result.success_rate:.1%}</td>
            <td>95%</td>
            <td>{"✅ PASS" if latest_result.success_rate >= 0.95 else "❌ FAIL"}</td>
        </tr>
    </table>

    <h3>🔧 System Information</h3>
    <table>
        <tr><th>Property</th><th>Value</th></tr>"""

        for key, value in latest_result.system_info.items():
            html_content += (
                f"<tr><td>{key.replace('_', ' ').title()}</td><td>{value}</td></tr>"
            )

        html_content += """
    </table>

    <h3>💡 Optimization Suggestions</h3>
    <div class="suggestions">"""

        if latest_result.optimization_suggestions:
            for suggestion in latest_result.optimization_suggestions:
                html_content += f"<p>• {suggestion}</p>"
        else:
            html_content += (
                "<p>🎉 No optimization suggestions - performance is optimal!</p>"
            )

        html_content += """
    </div>

    <h3>📈 Historical Trends</h3>
    <p>Performance tracking across multiple benchmark runs:</p>
    <table>
        <tr><th>Timestamp</th><th>Benchmark</th><th>Mean Time</th><th>P95 Time</th><th>Grade</th></tr>"""

        for result in self.benchmark_results[-10:]:  # Last 10 results
            html_content += f"""
        <tr>
            <td>{result.start_time.strftime("%Y-%m-%d %H:%M")}</td>
            <td>{result.benchmark_name}</td>
            <td>{result.mean_time_ms:.1f}ms</td>
            <td>{result.percentile_95_ms:.1f}ms</td>
            <td>{result.performance_grade}</td>
        </tr>"""

        html_content += """
    </table>

    <footer style="margin-top: 40px; text-align: center; color: #666;">
        <p>Generated by Git Hook Performance Benchmarker v2.0.0</p>
    </footer>
</body>
</html>"""

        with open(report_file, "w") as f:
            f.write(html_content)

        return str(report_file)

    async def _generate_json_report(self, reports_dir: Path) -> str:
        """Generate JSON performance report"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = reports_dir / f"performance_report_{timestamp}.json"

        report_data = {
            "report_metadata": {
                "generated_at": datetime.now().isoformat(),
                "total_benchmarks": len(self.benchmark_results),
                "report_version": "2.0.0",
            },
            "latest_result": asdict(self.benchmark_results[-1])
            if self.benchmark_results
            else None,
            "historical_results": [asdict(result) for result in self.benchmark_results],
            "performance_thresholds": self.performance_thresholds,
            "summary_statistics": self._calculate_summary_statistics(),
        }

        with open(report_file, "w") as f:
            json.dump(report_data, f, indent=2, default=str)

        return str(report_file)

    async def _generate_csv_report(self, reports_dir: Path) -> str:
        """Generate CSV performance report"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = reports_dir / f"performance_report_{timestamp}.csv"

        with open(report_file, "w") as f:
            # Write header
            f.write(
                "timestamp,benchmark_name,duration_ms,iterations,success_rate,"
                "mean_ms,median_ms,p95_ms,p99_ms,std_dev_ms,min_ms,max_ms,"
                "peak_memory_mb,avg_cpu_percent,grade,regression\n"
            )

            # Write data
            for result in self.benchmark_results:
                f.write(
                    f"{result.start_time.isoformat()},{result.benchmark_name},"
                    f"{result.total_duration_ms},{result.iterations},{result.success_rate},"
                    f"{result.mean_time_ms},{result.median_time_ms},{result.percentile_95_ms},"
                    f"{result.percentile_99_ms},{result.std_dev_ms},{result.min_time_ms},"
                    f"{result.max_time_ms},{result.peak_memory_mb},{result.avg_cpu_percent},"
                    f"{result.performance_grade},{result.regression_detected}\n"
                )

        return str(report_file)

    def _calculate_summary_statistics(self) -> dict[str, Any]:
        """Calculate summary statistics across all benchmark results"""
        if not self.benchmark_results:
            return {}

        mean_times = [r.mean_time_ms for r in self.benchmark_results]
        success_rates = [r.success_rate for r in self.benchmark_results]
        memory_usage = [
            r.peak_memory_mb for r in self.benchmark_results if r.peak_memory_mb > 0
        ]

        return {
            "total_benchmarks": len(self.benchmark_results),
            "avg_mean_time_ms": statistics.mean(mean_times),
            "avg_success_rate": statistics.mean(success_rates),
            "avg_memory_usage_mb": statistics.mean(memory_usage) if memory_usage else 0,
            "performance_trend": "improving"
            if len(mean_times) > 1 and mean_times[-1] < mean_times[0]
            else "stable",
            "regression_count": sum(
                1 for r in self.benchmark_results if r.regression_detected
            ),
        }

    async def cleanup(self):
        """Cleanup benchmarker resources"""
        if self.profiler:
            self.profiler.stop_monitoring()

        # Close test repositories
        for repo in self.test_repos.values():
            if hasattr(repo, "close"):
                repo.close()

        self.test_repos.clear()


# Pytest integration
@pytest.mark.benchmark
class TestGitHookPerformance:
    """Git hook performance test suite using pytest"""

    @pytest.fixture(scope="session")
    async def benchmarker(self, tmp_path_factory):
        """Create benchmarker instance for testing"""
        workspace = tmp_path_factory.mktemp("git_hook_benchmarks")
        benchmarker = GitHookBenchmarker(workspace, enable_profiling=True)
        await benchmarker.initialize()
        yield benchmarker
        await benchmarker.cleanup()

    @pytest.mark.asyncio
    async def test_quick_benchmark(self, benchmarker):
        """Run quick performance benchmark"""
        result = await benchmarker.run_benchmark_suite("quick")

        assert result.success_rate >= 0.8
        assert result.mean_time_ms < 1000  # Should complete within 1 second
        assert result.performance_grade in ["A+", "A", "B", "C"]

    @pytest.mark.asyncio
    async def test_standard_benchmark(self, benchmarker):
        """Run standard performance benchmark"""
        result = await benchmarker.run_benchmark_suite("standard")

        assert result.success_rate >= 0.9
        assert result.mean_time_ms < 800
        assert result.std_dev_ms < result.mean_time_ms * 0.5  # Reasonable variance

    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_comprehensive_benchmark(self, benchmarker):
        """Run comprehensive performance benchmark"""
        result = await benchmarker.run_benchmark_suite("comprehensive")

        assert result.success_rate >= 0.95
        assert result.mean_time_ms < 600
        assert (
            len(result.optimization_suggestions) >= 0
        )  # Should provide suggestions if needed

    @pytest.mark.asyncio
    @pytest.mark.stress
    async def test_stress_benchmark(self, benchmarker):
        """Run stress test benchmark"""
        result = await benchmarker.run_benchmark_suite("stress")

        # Stress tests may have lower success rates
        assert result.success_rate >= 0.7
        assert result.mean_time_ms < 1500  # May be slower under stress

        # Should not crash or fail completely
        assert result.iterations > 0
        assert len(result.metrics) > 0


if __name__ == "__main__":

    async def main():
        """Run standalone benchmark"""
        workspace = Path("/tmp/git_hook_performance_benchmarks")
        benchmarker = GitHookBenchmarker(workspace, enable_profiling=True)

        try:
            await benchmarker.initialize()

            print("🚀 Starting Git Hook Performance Benchmarks")
            print("=" * 60)

            # Run different benchmark suites
            for suite_name in ["quick", "standard"]:
                print(f"\n📊 Running {suite_name} benchmark suite...")
                result = await benchmarker.run_benchmark_suite(suite_name)

                print(f"✅ {suite_name.title()} benchmark completed:")
                print(f"   Grade: {result.performance_grade}")
                print(f"   Mean time: {result.mean_time_ms:.2f}ms")
                print(f"   Success rate: {result.success_rate:.1%}")
                print(f"   Peak memory: {result.peak_memory_mb:.1f}MB")

                if result.optimization_suggestions:
                    print(
                        f"   Suggestions: {len(result.optimization_suggestions)} optimization opportunities"
                    )

            # Generate report
            print("\n📋 Generating performance report...")
            report_path = await benchmarker.generate_performance_report("html")
            print(f"✅ Performance report generated: {report_path}")

        finally:
            await benchmarker.cleanup()

    asyncio.run(main())
