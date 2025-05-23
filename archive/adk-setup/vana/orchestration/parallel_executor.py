"""
Parallel Executor for VANA

This module provides parallel execution functionality for the VANA project,
including thread management, resource allocation, and result collection.
"""

import logging
import threading
import time
import queue
from typing import Dict, Any, List, Optional, Callable, Tuple, Set
from concurrent.futures import ThreadPoolExecutor, as_completed, Future

# Set up logging
logger = logging.getLogger(__name__)

class ParallelExecutor:
    """Executor for running tasks in parallel."""
    
    def __init__(self, max_workers: int = 5, timeout: int = 60):
        """
        Initialize a parallel executor.
        
        Args:
            max_workers: Maximum number of worker threads (default: 5)
            timeout: Default timeout in seconds (default: 60)
        """
        self.max_workers = max_workers
        self.default_timeout = timeout
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.running_tasks = {}  # Maps task IDs to futures
        self.results = {}  # Maps task IDs to results
        self.errors = {}  # Maps task IDs to errors
        
    def execute_task(self, task: Dict[str, Any], specialist_func: Callable, 
                    timeout: Optional[int] = None) -> Dict[str, Any]:
        """
        Execute a single task.
        
        Args:
            task: Task dictionary
            specialist_func: Function to execute the task
            timeout: Timeout in seconds (optional, defaults to self.default_timeout)
            
        Returns:
            Result dictionary
        """
        if timeout is None:
            timeout = self.default_timeout
            
        task_id = task["id"]
        
        try:
            # Execute the task with timeout
            start_time = time.time()
            result = specialist_func(task["description"], context=task.get("context", {}))
            end_time = time.time()
            
            # Create result dictionary
            return {
                "task_id": task_id,
                "result": result,
                "success": True,
                "execution_time": end_time - start_time
            }
        except Exception as e:
            logger.error(f"Error executing task {task_id}: {e}")
            
            # Create error dictionary
            return {
                "task_id": task_id,
                "error": str(e),
                "success": False,
                "execution_time": time.time() - start_time
            }
    
    def execute_tasks(self, tasks: List[Dict[str, Any]], specialist_func: Callable,
                     timeout: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Execute multiple tasks in parallel.
        
        Args:
            tasks: List of task dictionaries
            specialist_func: Function to execute the tasks
            timeout: Timeout in seconds (optional, defaults to self.default_timeout)
            
        Returns:
            List of result dictionaries
        """
        if timeout is None:
            timeout = self.default_timeout
            
        # Clear previous results
        self.results = {}
        self.errors = {}
        
        # Submit tasks to the executor
        futures = {}
        for task in tasks:
            task_id = task["id"]
            future = self.executor.submit(self.execute_task, task, specialist_func, timeout)
            futures[future] = task_id
            self.running_tasks[task_id] = future
            
        # Collect results as they complete
        results = []
        for future in as_completed(futures.keys(), timeout=timeout):
            task_id = futures[future]
            
            try:
                result = future.result()
                self.results[task_id] = result
                results.append(result)
            except Exception as e:
                logger.error(f"Error collecting result for task {task_id}: {e}")
                error_result = {
                    "task_id": task_id,
                    "error": str(e),
                    "success": False,
                    "execution_time": timeout
                }
                self.errors[task_id] = error_result
                results.append(error_result)
                
            # Remove from running tasks
            if task_id in self.running_tasks:
                del self.running_tasks[task_id]
                
        return results
    
    def execute_plan(self, execution_plan: List[Dict[str, Any]], specialist_map: Dict[str, Callable],
                    parallel: bool = True, timeout: Optional[int] = None) -> Dict[str, Any]:
        """
        Execute a plan with dependencies.
        
        Args:
            execution_plan: Ordered list of tasks to execute
            specialist_map: Dictionary mapping specialist IDs to execution functions
            parallel: Whether to execute independent tasks in parallel (default: True)
            timeout: Timeout in seconds (optional, defaults to self.default_timeout)
            
        Returns:
            Dictionary with results and metadata
        """
        if timeout is None:
            timeout = self.default_timeout
            
        # Clear previous results
        self.results = {}
        self.errors = {}
        
        # Track completed tasks and their dependencies
        completed_tasks = set()
        task_results = {}
        
        # Group tasks by their dependencies
        dependency_groups = {}
        for task in execution_plan:
            task_id = task["id"]
            dependencies = set(task.get("dependencies", []))
            
            # Create a key based on dependencies
            dep_key = tuple(sorted(dependencies))
            
            if dep_key not in dependency_groups:
                dependency_groups[dep_key] = []
                
            dependency_groups[dep_key].append(task)
            
        # Execute tasks in dependency order
        start_time = time.time()
        
        for dep_key, tasks in dependency_groups.items():
            # Check if all dependencies are completed
            if not all(dep in completed_tasks for dep in dep_key):
                logger.error(f"Dependencies not met for tasks: {[task['id'] for task in tasks]}")
                continue
                
            # Get specialist functions for these tasks
            task_specialist_map = {}
            for task in tasks:
                task_type = task.get("type", "general")
                
                # Determine specialist based on task type
                if task_type == "design" or task_type == "architecture":
                    specialist_id = "rhea"
                elif task_type == "documentation":
                    specialist_id = "juno"
                elif task_type == "testing":
                    specialist_id = "kai"
                elif task_type == "execution" or task_type == "deployment":
                    specialist_id = "sage"
                elif task_type == "interface" or task_type == "ui":
                    specialist_id = "max"
                else:
                    specialist_id = "vana"
                    
                # Get specialist function
                if specialist_id in specialist_map:
                    task_specialist_map[task["id"]] = specialist_map[specialist_id]
                else:
                    logger.warning(f"No specialist function for {specialist_id}, using default")
                    # Use first available specialist as default
                    task_specialist_map[task["id"]] = next(iter(specialist_map.values()))
            
            # Execute tasks in this dependency group
            if parallel and len(tasks) > 1:
                # Group tasks by specialist for efficient execution
                specialist_tasks = {}
                for task in tasks:
                    specialist_func = task_specialist_map[task["id"]]
                    if specialist_func not in specialist_tasks:
                        specialist_tasks[specialist_func] = []
                    specialist_tasks[specialist_func].append(task)
                
                # Execute each specialist's tasks in parallel
                group_results = []
                futures = {}
                
                for specialist_func, spec_tasks in specialist_tasks.items():
                    future = self.executor.submit(
                        self.execute_tasks, spec_tasks, specialist_func, timeout
                    )
                    futures[future] = spec_tasks
                
                # Collect results
                for future in as_completed(futures.keys(), timeout=timeout):
                    try:
                        results = future.result()
                        group_results.extend(results)
                    except Exception as e:
                        logger.error(f"Error executing task group: {e}")
                        # Create error results for all tasks in this group
                        for task in futures[future]:
                            error_result = {
                                "task_id": task["id"],
                                "error": str(e),
                                "success": False,
                                "execution_time": timeout
                            }
                            group_results.append(error_result)
            else:
                # Execute tasks sequentially
                group_results = []
                for task in tasks:
                    specialist_func = task_specialist_map[task["id"]]
                    result = self.execute_task(task, specialist_func, timeout)
                    group_results.append(result)
            
            # Process results
            for result in group_results:
                task_id = result["task_id"]
                task_results[task_id] = result
                
                if result["success"]:
                    completed_tasks.add(task_id)
                    self.results[task_id] = result
                else:
                    self.errors[task_id] = result
        
        # Calculate execution time
        execution_time = time.time() - start_time
        
        # Create final result
        return {
            "results": task_results,
            "success_count": len(self.results),
            "error_count": len(self.errors),
            "execution_time": execution_time,
            "completed": len(completed_tasks) == len(execution_plan)
        }
    
    def execute_assignments(self, assignments: Dict[str, List[Dict[str, Any]]], 
                           specialist_map: Dict[str, Callable],
                           timeout: Optional[int] = None) -> Dict[str, Any]:
        """
        Execute assignments for multiple specialists.
        
        Args:
            assignments: Dictionary mapping specialist IDs to lists of assigned tasks
            specialist_map: Dictionary mapping specialist IDs to execution functions
            timeout: Timeout in seconds (optional, defaults to self.default_timeout)
            
        Returns:
            Dictionary with results and metadata
        """
        if timeout is None:
            timeout = self.default_timeout
            
        # Clear previous results
        self.results = {}
        self.errors = {}
        
        # Track results
        all_results = {}
        
        # Execute assignments for each specialist
        start_time = time.time()
        futures = {}
        
        for specialist_id, tasks in assignments.items():
            # Get specialist function
            if specialist_id in specialist_map:
                specialist_func = specialist_map[specialist_id]
            else:
                logger.warning(f"No specialist function for {specialist_id}, skipping")
                continue
                
            # Submit tasks to the executor
            future = self.executor.submit(
                self.execute_tasks, tasks, specialist_func, timeout
            )
            futures[future] = specialist_id
        
        # Collect results
        for future in as_completed(futures.keys(), timeout=timeout):
            specialist_id = futures[future]
            
            try:
                results = future.result()
                all_results[specialist_id] = results
                
                # Update results and errors
                for result in results:
                    task_id = result["task_id"]
                    
                    if result["success"]:
                        self.results[task_id] = result
                    else:
                        self.errors[task_id] = result
            except Exception as e:
                logger.error(f"Error executing assignments for {specialist_id}: {e}")
                all_results[specialist_id] = [{
                    "error": str(e),
                    "success": False,
                    "execution_time": timeout
                }]
        
        # Calculate execution time
        execution_time = time.time() - start_time
        
        # Create final result
        return {
            "specialist_results": all_results,
            "success_count": len(self.results),
            "error_count": len(self.errors),
            "execution_time": execution_time
        }
    
    def cancel_task(self, task_id: str) -> bool:
        """
        Cancel a running task.
        
        Args:
            task_id: ID of the task to cancel
            
        Returns:
            True if the task was cancelled, False otherwise
        """
        if task_id in self.running_tasks:
            future = self.running_tasks[task_id]
            cancelled = future.cancel()
            
            if cancelled:
                del self.running_tasks[task_id]
                
            return cancelled
        
        return False
    
    def cancel_all_tasks(self) -> int:
        """
        Cancel all running tasks.
        
        Returns:
            Number of tasks cancelled
        """
        cancelled_count = 0
        
        for task_id, future in list(self.running_tasks.items()):
            if future.cancel():
                cancelled_count += 1
                del self.running_tasks[task_id]
                
        return cancelled_count
    
    def shutdown(self, wait: bool = True):
        """
        Shut down the executor.
        
        Args:
            wait: Whether to wait for running tasks to complete (default: True)
        """
        self.executor.shutdown(wait=wait)
