# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Parallel execution optimization for multi-agent systems.

This module provides tools for parallelizing independent agent operations:
- Concurrent tool execution (e.g., multiple search queries)
- Parallel agent invocation for independent sub-tasks
- Workload distribution and resource pooling
- Deadlock prevention and timeout management
"""

import asyncio
import logging
import time
from collections.abc import Awaitable, Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Generic, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


class ExecutionStrategy(Enum):
    """Execution strategy for parallel operations."""

    PARALLEL = "parallel"  # Execute all tasks in parallel
    SEQUENTIAL = "sequential"  # Execute tasks one by one
    ADAPTIVE = "adaptive"  # Dynamically choose based on load


@dataclass
class ExecutionResult(Generic[T]):
    """Result of a parallel execution task."""

    task_id: str
    result: T | None = None
    error: Exception | None = None
    start_time: datetime = field(default_factory=datetime.now)
    end_time: datetime | None = None
    duration_ms: float = 0.0
    success: bool = False

    def mark_complete(self, result: T | None = None, error: Exception | None = None) -> None:
        """Mark task as complete and calculate duration.

        Args:
            result: Task result if successful
            error: Exception if task failed
        """
        self.end_time = datetime.now()
        self.duration_ms = (
            self.end_time - self.start_time
        ).total_seconds() * 1000
        self.result = result
        self.error = error
        self.success = error is None


@dataclass
class ParallelExecutionMetrics:
    """Metrics for parallel execution performance."""

    total_tasks: int = 0
    successful_tasks: int = 0
    failed_tasks: int = 0
    total_duration_ms: float = 0.0
    average_duration_ms: float = 0.0
    speedup_factor: float = 1.0  # Parallel time / Sequential time
    max_concurrent: int = 0


class ParallelExecutor:
    """Manages parallel execution of independent tasks."""

    def __init__(
        self,
        max_workers: int = 5,
        default_timeout: float = 30.0,
        strategy: ExecutionStrategy = ExecutionStrategy.ADAPTIVE,
    ):
        """Initialize parallel executor.

        Args:
            max_workers: Maximum number of concurrent workers
            default_timeout: Default timeout in seconds for tasks
            strategy: Execution strategy
        """
        self.max_workers = max_workers
        self.default_timeout = default_timeout
        self.strategy = strategy
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.metrics = ParallelExecutionMetrics()

        logger.info(
            f"ParallelExecutor initialized: max_workers={max_workers}, timeout={default_timeout}s, strategy={strategy.value}"
        )

    def execute_parallel(
        self,
        tasks: list[Callable[[], T]],
        task_ids: list[str] | None = None,
        timeout: float | None = None,
    ) -> list[ExecutionResult[T]]:
        """Execute multiple tasks in parallel.

        Args:
            tasks: List of callable tasks to execute
            task_ids: Optional task identifiers
            timeout: Timeout in seconds (uses default if None)

        Returns:
            List of ExecutionResult objects
        """
        if not tasks:
            return []

        timeout = timeout or self.default_timeout
        task_ids = task_ids or [f"task_{i}" for i in range(len(tasks))]

        start_time = time.time()
        results: list[ExecutionResult[T]] = []

        # Submit all tasks
        future_to_task = {}
        for task_id, task in zip(task_ids, tasks):
            exec_result = ExecutionResult[T](task_id=task_id)
            results.append(exec_result)
            future = self.executor.submit(task)
            future_to_task[future] = exec_result

        # Collect results as they complete
        for future in as_completed(future_to_task.keys(), timeout=timeout):
            exec_result = future_to_task[future]
            try:
                result = future.result(timeout=timeout)
                exec_result.mark_complete(result=result)
                self.metrics.successful_tasks += 1
            except Exception as e:
                exec_result.mark_complete(error=e)
                self.metrics.failed_tasks += 1
                logger.error(f"Task {exec_result.task_id} failed: {e}")

        # Update metrics
        total_duration = (time.time() - start_time) * 1000
        self.metrics.total_tasks += len(tasks)
        self.metrics.total_duration_ms += total_duration
        self.metrics.average_duration_ms = (
            self.metrics.total_duration_ms / self.metrics.total_tasks
        )
        self.metrics.max_concurrent = max(
            self.metrics.max_concurrent, len(tasks)
        )

        # Calculate speedup (theoretical max if all tasks were sequential)
        sequential_time = sum(r.duration_ms for r in results)
        if total_duration > 0:
            self.metrics.speedup_factor = sequential_time / total_duration

        logger.info(
            f"Parallel execution completed: {len(tasks)} tasks in {total_duration:.0f}ms "
            f"(speedup: {self.metrics.speedup_factor:.2f}x)"
        )

        return results

    async def execute_parallel_async(
        self,
        tasks: list[Callable[[], Awaitable[T]]],
        task_ids: list[str] | None = None,
        timeout: float | None = None,
    ) -> list[ExecutionResult[T]]:
        """Execute multiple async tasks in parallel.

        Args:
            tasks: List of async callable tasks
            task_ids: Optional task identifiers
            timeout: Timeout in seconds

        Returns:
            List of ExecutionResult objects
        """
        if not tasks:
            return []

        timeout = timeout or self.default_timeout
        task_ids = task_ids or [f"task_{i}" for i in range(len(tasks))]

        start_time = time.time()
        results: list[ExecutionResult[T]] = [
            ExecutionResult[T](task_id=task_id) for task_id in task_ids
        ]

        # Create async tasks with timeout
        async def execute_with_result(
            task: Callable[[], Awaitable[T]], exec_result: ExecutionResult[T]
        ) -> None:
            try:
                result = await asyncio.wait_for(task(), timeout=timeout)
                exec_result.mark_complete(result=result)
                self.metrics.successful_tasks += 1
            except Exception as e:
                exec_result.mark_complete(error=e)
                self.metrics.failed_tasks += 1
                logger.error(f"Async task {exec_result.task_id} failed: {e}")

        # Execute all tasks concurrently
        await asyncio.gather(
            *[
                execute_with_result(task, result)
                for task, result in zip(tasks, results)
            ],
            return_exceptions=True,
        )

        # Update metrics
        total_duration = (time.time() - start_time) * 1000
        self.metrics.total_tasks += len(tasks)
        self.metrics.total_duration_ms += total_duration
        self.metrics.average_duration_ms = (
            self.metrics.total_duration_ms / self.metrics.total_tasks
        )
        self.metrics.max_concurrent = max(
            self.metrics.max_concurrent, len(tasks)
        )

        sequential_time = sum(r.duration_ms for r in results)
        if total_duration > 0:
            self.metrics.speedup_factor = sequential_time / total_duration

        logger.info(
            f"Async parallel execution completed: {len(tasks)} tasks in {total_duration:.0f}ms "
            f"(speedup: {self.metrics.speedup_factor:.2f}x)"
        )

        return results

    def get_metrics(self) -> dict[str, Any]:
        """Get execution metrics.

        Returns:
            Dictionary of performance metrics
        """
        return {
            "total_tasks": self.metrics.total_tasks,
            "successful_tasks": self.metrics.successful_tasks,
            "failed_tasks": self.metrics.failed_tasks,
            "success_rate": self.metrics.successful_tasks / self.metrics.total_tasks
            if self.metrics.total_tasks > 0
            else 0,
            "average_duration_ms": self.metrics.average_duration_ms,
            "speedup_factor": self.metrics.speedup_factor,
            "max_concurrent_tasks": self.metrics.max_concurrent,
        }

    def shutdown(self) -> None:
        """Shutdown the executor and cleanup resources."""
        self.executor.shutdown(wait=True)
        logger.info("ParallelExecutor shutdown complete")


class SearchQueryParallelizer:
    """Specialized parallelizer for search queries in research agents."""

    def __init__(
        self, max_parallel_searches: int = 5, search_timeout: float = 10.0
    ):
        """Initialize search query parallelizer.

        Args:
            max_parallel_searches: Maximum number of parallel searches
            search_timeout: Timeout for each search in seconds
        """
        self.executor = ParallelExecutor(
            max_workers=max_parallel_searches,
            default_timeout=search_timeout,
        )
        logger.info(
            f"SearchQueryParallelizer initialized: max_parallel={max_parallel_searches}"
        )

    def execute_searches(
        self,
        search_queries: list[str],
        search_function: Callable[[str], Any],
    ) -> list[tuple[str, Any, Exception | None]]:
        """Execute multiple search queries in parallel.

        Args:
            search_queries: List of search query strings
            search_function: Function that executes a search (takes query string)

        Returns:
            List of tuples: (query, result, error)
        """
        if not search_queries:
            return []

        # Create tasks
        tasks = [lambda q=query: search_function(q) for query in search_queries]

        # Execute in parallel
        results = self.executor.execute_parallel(
            tasks=tasks,
            task_ids=search_queries,
        )

        # Format results
        return [
            (r.task_id, r.result, r.error) for r in results
        ]

    def get_metrics(self) -> dict[str, Any]:
        """Get search parallelization metrics."""
        return self.executor.get_metrics()


# Global instances
_parallel_executor: ParallelExecutor | None = None
_search_parallelizer: SearchQueryParallelizer | None = None


def get_parallel_executor() -> ParallelExecutor:
    """Get or create global parallel executor.

    Returns:
        Global ParallelExecutor instance
    """
    global _parallel_executor
    if _parallel_executor is None:
        _parallel_executor = ParallelExecutor()
    return _parallel_executor


def get_search_parallelizer() -> SearchQueryParallelizer:
    """Get or create global search query parallelizer.

    Returns:
        Global SearchQueryParallelizer instance
    """
    global _search_parallelizer
    if _search_parallelizer is None:
        _search_parallelizer = SearchQueryParallelizer()
    return _search_parallelizer


def reset_executors() -> None:
    """Reset global executors (for testing)."""
    global _parallel_executor, _search_parallelizer
    if _parallel_executor:
        _parallel_executor.shutdown()
    _parallel_executor = None
    _search_parallelizer = None
