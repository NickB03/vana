"""
Resource Monitor for VANA Sandbox Environment

Monitors and enforces resource usage limits during code execution.
Tracks CPU, memory, disk, and network usage to prevent resource abuse.
"""

import logging
import threading
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional

import psutil

logger = logging.getLogger(__name__)


@dataclass
class ResourceUsage:
    """Resource usage statistics."""

    cpu_percent: float
    memory_mb: float
    memory_percent: float
    execution_time: float
    disk_read_mb: float
    disk_write_mb: float
    network_sent_mb: float
    network_recv_mb: float
    processes_count: int
    open_files_count: int


class ResourceLimitExceededError(Exception):
    """Raised when resource limits are exceeded."""


class ResourceMonitor:
    """Monitors and enforces resource usage limits."""

    def __init__(self, limits: Optional[Dict[str, Any]] = None):
        """
        Initialize resource monitor with limits.

        Args:
            limits: Resource limits configuration
        """
        self.limits = limits or self._get_default_limits()
        self.monitoring = False
        self.start_time = None
        self.initial_stats = None
        self._monitor_thread = None
        self._stop_event = threading.Event()

    def _get_default_limits(self) -> Dict[str, Any]:
        """Get default resource limits."""
        return {
            "max_execution_time": 30,
            "max_memory_mb": 512,
            "max_cpu_percent": 80,
            "max_disk_read_mb": 100,
            "max_disk_write_mb": 50,
            "max_network_sent_mb": 0,  # Network disabled
            "max_network_recv_mb": 0,  # Network disabled
            "max_processes": 10,
            "max_open_files": 100,
        }

    def start_monitoring(self, process_id: Optional[int] = None) -> None:
        """
        Start resource monitoring.

        Args:
            process_id: Process ID to monitor (None for current process)
        """
        if self.monitoring:
            logger.warning("Resource monitoring already started")
            return

        self.monitoring = True
        self.start_time = time.time()
        self.process_id = process_id or psutil.Process().pid

        try:
            process = psutil.Process(self.process_id)
            self.initial_stats = self._get_process_stats(process)
        except psutil.NoSuchProcess:
            logger.error(f"Process {self.process_id} not found")
            self.monitoring = False
            return

        # Start monitoring thread
        self._stop_event.clear()
        self._monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._monitor_thread.start()

        logger.info(f"Started resource monitoring for process {self.process_id}")

    def stop_monitoring(self) -> ResourceUsage:
        """
        Stop resource monitoring and return usage statistics.

        Returns:
            Resource usage statistics
        """
        if not self.monitoring:
            logger.warning("Resource monitoring not started")
            return ResourceUsage(0, 0, 0, 0, 0, 0, 0, 0, 0, 0)

        self.monitoring = False
        self._stop_event.set()

        if self._monitor_thread and self._monitor_thread.is_alive():
            self._monitor_thread.join(timeout=1.0)

        # Calculate final usage
        execution_time = time.time() - self.start_time if self.start_time else 0

        try:
            process = psutil.Process(self.process_id)
            current_stats = self._get_process_stats(process)
            usage = self._calculate_usage(current_stats, execution_time)
        except psutil.NoSuchProcess:
            logger.warning(f"Process {self.process_id} no longer exists")
            usage = ResourceUsage(0, 0, 0, execution_time, 0, 0, 0, 0, 0, 0)

        logger.info(f"Stopped resource monitoring. Execution time: {execution_time:.2f}s")
        return usage

    def _monitor_loop(self) -> None:
        """Main monitoring loop that runs in a separate thread."""
        while not self._stop_event.is_set():
            try:
                self._check_limits()
                time.sleep(0.1)  # Check every 100ms
            except ResourceLimitExceededError as e:
                logger.error(f"Resource limit exceeded: {e}")
                # In a real implementation, this would terminate the process
                break
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                break

    def _check_limits(self) -> None:
        """Check if any resource limits are exceeded."""
        if not self.monitoring or not self.start_time:
            return

        execution_time = time.time() - self.start_time

        # Check execution time limit
        if execution_time > self.limits["max_execution_time"]:
            raise ResourceLimitExceededError(
                f"Execution time limit exceeded: {execution_time:.2f}s > {self.limits['max_execution_time']}s"
            )

        try:
            process = psutil.Process(self.process_id)

            # Check memory limit
            memory_info = process.memory_info()
            memory_mb = memory_info.rss / 1024 / 1024
            if memory_mb > self.limits["max_memory_mb"]:
                raise ResourceLimitExceededError(
                    f"Memory limit exceeded: {memory_mb:.2f}MB > {self.limits['max_memory_mb']}MB"
                )

            # Check CPU limit (average over last second)
            cpu_percent = process.cpu_percent()
            if cpu_percent > self.limits["max_cpu_percent"]:
                raise ResourceLimitExceededError(
                    f"CPU limit exceeded: {cpu_percent:.2f}% > {self.limits['max_cpu_percent']}%"
                )

            # Check process count limit
            children = process.children(recursive=True)
            process_count = len(children) + 1  # Include parent process
            if process_count > self.limits["max_processes"]:
                raise ResourceLimitExceededError(
                    f"Process count limit exceeded: {process_count} > {self.limits['max_processes']}"
                )

            # Check open files limit
            try:
                open_files = len(process.open_files())
                if open_files > self.limits["max_open_files"]:
                    raise ResourceLimitExceededError(
                        f"Open files limit exceeded: {open_files} > {self.limits['max_open_files']}"
                    )
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                # Can't access open files info, skip this check
                pass

        except psutil.NoSuchProcess:
            # Process no longer exists, stop monitoring
            self.monitoring = False

    def _get_process_stats(self, process: psutil.Process) -> Dict[str, Any]:
        """Get current process statistics."""
        try:
            memory_info = process.memory_info()
            io_counters = process.io_counters() if hasattr(process, "io_counters") else None

            stats = {
                "memory_rss": memory_info.rss,
                "memory_vms": memory_info.vms,
                "cpu_times": process.cpu_times(),
                "create_time": process.create_time(),
                "num_threads": process.num_threads(),
            }

            if io_counters:
                stats.update(
                    {
                        "read_bytes": io_counters.read_bytes,
                        "write_bytes": io_counters.write_bytes,
                    }
                )

            # Get network stats if available
            try:
                connections = process.connections()
                stats["network_connections"] = len(connections)
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                stats["network_connections"] = 0

            # Get open files count
            try:
                stats["open_files"] = len(process.open_files())
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                stats["open_files"] = 0

            return stats

        except psutil.NoSuchProcess:
            return {}

    def _calculate_usage(self, current_stats: Dict[str, Any], execution_time: float) -> ResourceUsage:
        """Calculate resource usage from current and initial statistics."""
        if not self.initial_stats or not current_stats:
            return ResourceUsage(0, 0, 0, execution_time, 0, 0, 0, 0, 0, 0)

        # Memory usage
        memory_mb = current_stats.get("memory_rss", 0) / 1024 / 1024
        memory_percent = (memory_mb / self.limits["max_memory_mb"]) * 100 if self.limits["max_memory_mb"] > 0 else 0

        # Disk I/O
        disk_read_mb = (current_stats.get("read_bytes", 0) - self.initial_stats.get("read_bytes", 0)) / 1024 / 1024
        disk_write_mb = (current_stats.get("write_bytes", 0) - self.initial_stats.get("write_bytes", 0)) / 1024 / 1024

        # CPU usage (approximate)
        cpu_percent = 0
        if execution_time > 0:
            current_cpu = current_stats.get("cpu_times")
            initial_cpu = self.initial_stats.get("cpu_times")
            if current_cpu and initial_cpu:
                cpu_time_used = (current_cpu.user + current_cpu.system) - (initial_cpu.user + initial_cpu.system)
                cpu_percent = (cpu_time_used / execution_time) * 100

        return ResourceUsage(
            cpu_percent=cpu_percent,
            memory_mb=memory_mb,
            memory_percent=memory_percent,
            execution_time=execution_time,
            disk_read_mb=disk_read_mb,
            disk_write_mb=disk_write_mb,
            network_sent_mb=0,  # Network disabled in sandbox
            network_recv_mb=0,  # Network disabled in sandbox
            processes_count=current_stats.get("num_threads", 1),
            open_files_count=current_stats.get("open_files", 0),
        )

    def get_current_usage(self) -> Optional[ResourceUsage]:
        """Get current resource usage without stopping monitoring."""
        if not self.monitoring or not self.start_time:
            return None

        execution_time = time.time() - self.start_time

        try:
            process = psutil.Process(self.process_id)
            current_stats = self._get_process_stats(process)
            return self._calculate_usage(current_stats, execution_time)
        except psutil.NoSuchProcess:
            return None
