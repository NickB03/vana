"""
Metrics Collector for VANA

This module provides metrics collection functionality for the VANA project,
including performance metrics, usage metrics, and system metrics.
"""

import os
import time
import logging
import datetime
import psutil
from typing import Dict, Any, List, Optional, Callable

# Set up logging
logger = logging.getLogger(__name__)

class MetricsCollector:
    """Collector for VANA metrics."""
    
    def __init__(self):
        """Initialize a metrics collector."""
        # Component metrics collectors
        self.component_collectors = {}
        
        # Metrics cache
        self.metrics_cache = {}
        self.last_collection_time = 0
        self.collection_interval = 60  # 1 minute
    
    def register_component(self, component_name: str, 
                          collect_function: Callable[[], Dict[str, Any]]) -> None:
        """
        Register a component metrics collector.
        
        Args:
            component_name: Name of the component
            collect_function: Function to collect component metrics
        """
        self.component_collectors[component_name] = collect_function
        logger.info(f"Registered metrics collector for component: {component_name}")
    
    def collect_metrics(self, force: bool = False) -> Dict[str, Dict[str, Any]]:
        """
        Collect metrics from all registered components.
        
        Args:
            force: Force metrics collection even if the interval hasn't passed
            
        Returns:
            Collected metrics
        """
        current_time = time.time()
        
        # Check if we need to collect metrics
        if not force and current_time - self.last_collection_time < self.collection_interval:
            return self.metrics_cache
        
        # Collect system metrics
        system_metrics = self._collect_system_metrics()
        
        # Collect component metrics
        component_metrics = {}
        
        for component_name, collect_function in self.component_collectors.items():
            try:
                metrics = collect_function()
                component_metrics[component_name] = metrics
            except Exception as e:
                logger.error(f"Error collecting metrics for component {component_name}: {str(e)}")
                component_metrics[component_name] = {
                    "error": str(e),
                    "timestamp": datetime.datetime.now().isoformat()
                }
        
        # Combine metrics
        all_metrics = {
            "system": system_metrics,
            **component_metrics
        }
        
        # Update cache
        self.metrics_cache = all_metrics
        self.last_collection_time = current_time
        
        return all_metrics
    
    def get_component_metrics(self, component_name: str) -> Dict[str, Any]:
        """
        Get metrics for a specific component.
        
        Args:
            component_name: Name of the component
            
        Returns:
            Component metrics
        """
        # Check if the component is registered
        if component_name not in self.component_collectors:
            return {
                "error": f"Component {component_name} not registered",
                "timestamp": datetime.datetime.now().isoformat()
            }
        
        # Collect metrics for the component
        try:
            collect_function = self.component_collectors[component_name]
            metrics = collect_function()
            return metrics
        except Exception as e:
            logger.error(f"Error collecting metrics for component {component_name}: {str(e)}")
            return {
                "error": str(e),
                "timestamp": datetime.datetime.now().isoformat()
            }
    
    def _collect_system_metrics(self) -> Dict[str, Any]:
        """
        Collect system metrics.
        
        Returns:
            System metrics
        """
        try:
            # Get CPU metrics
            cpu_percent = psutil.cpu_percent(interval=0.1)
            cpu_count = psutil.cpu_count()
            
            # Get memory metrics
            memory = psutil.virtual_memory()
            memory_total = memory.total / (1024 * 1024 * 1024)  # GB
            memory_used = memory.used / (1024 * 1024 * 1024)  # GB
            memory_percent = memory.percent
            
            # Get disk metrics
            disk = psutil.disk_usage("/")
            disk_total = disk.total / (1024 * 1024 * 1024)  # GB
            disk_used = disk.used / (1024 * 1024 * 1024)  # GB
            disk_percent = disk.percent
            
            # Get process metrics
            process = psutil.Process(os.getpid())
            process_cpu_percent = process.cpu_percent(interval=0.1)
            process_memory = process.memory_info().rss / (1024 * 1024)  # MB
            process_threads = process.num_threads()
            
            return {
                "timestamp": datetime.datetime.now().isoformat(),
                "cpu": {
                    "percent": cpu_percent,
                    "count": cpu_count
                },
                "memory": {
                    "total_gb": memory_total,
                    "used_gb": memory_used,
                    "percent": memory_percent
                },
                "disk": {
                    "total_gb": disk_total,
                    "used_gb": disk_used,
                    "percent": disk_percent
                },
                "process": {
                    "cpu_percent": process_cpu_percent,
                    "memory_mb": process_memory,
                    "threads": process_threads
                }
            }
        except Exception as e:
            logger.error(f"Error collecting system metrics: {str(e)}")
            return {
                "error": str(e),
                "timestamp": datetime.datetime.now().isoformat()
            }

def measure_performance(func):
    """
    Decorator to measure function performance.
    
    Args:
        func: Function to measure
        
    Returns:
        Decorated function
    """
    def wrapper(*args, **kwargs):
        # Get initial resource usage
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Measure time
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        
        # Get final resource usage
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Calculate metrics
        latency = (end_time - start_time) * 1000  # ms
        memory_delta = final_memory - initial_memory  # MB
        
        # Log metrics
        logger.debug(f"Performance metrics for {func.__name__}: latency={latency:.2f}ms, memory_delta={memory_delta:.2f}MB")
        
        return result
    
    return wrapper
