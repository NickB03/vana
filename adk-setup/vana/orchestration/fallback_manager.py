"""
Fallback Manager for VANA

This module provides fallback functionality for the VANA project,
including failure detection, retry logic, and alternative execution paths.
"""

import logging
import time
import random
from typing import Dict, Any, List, Optional, Callable, Tuple, Set

# Set up logging
logger = logging.getLogger(__name__)

class FallbackManager:
    """Manager for handling failures and providing fallback mechanisms."""
    
    def __init__(self, max_retries: int = 3, base_delay: float = 1.0):
        """
        Initialize a fallback manager.
        
        Args:
            max_retries: Maximum number of retry attempts (default: 3)
            base_delay: Base delay for exponential backoff in seconds (default: 1.0)
        """
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.retry_counts = {}  # Maps task IDs to retry counts
        self.fallback_specialists = {}  # Maps specialist IDs to fallback specialist IDs
        
    def handle_failure(self, result: Dict[str, Any], specialist_func: Callable,
                      retry: bool = True) -> Dict[str, Any]:
        """
        Handle a failed task execution.
        
        Args:
            result: Failed result dictionary
            specialist_func: Function that executed the task
            retry: Whether to retry the task (default: True)
            
        Returns:
            New result dictionary (either from retry or fallback)
        """
        task_id = result.get("task_id")
        
        if not task_id:
            logger.error("Cannot handle failure: missing task_id")
            return result
            
        # Check if we should retry
        if retry and self._should_retry(task_id):
            # Increment retry count
            self.retry_counts[task_id] = self.retry_counts.get(task_id, 0) + 1
            retry_count = self.retry_counts[task_id]
            
            # Calculate delay with exponential backoff and jitter
            delay = self.base_delay * (2 ** (retry_count - 1))
            jitter = random.uniform(0, 0.1 * delay)
            total_delay = delay + jitter
            
            logger.info(f"Retrying task {task_id} (attempt {retry_count}/{self.max_retries}) after {total_delay:.2f}s delay")
            
            # Wait before retrying
            time.sleep(total_delay)
            
            # Retry the task
            try:
                # Extract task description and context from the result
                task_description = result.get("task_description", "")
                context = result.get("context", {})
                
                # Retry with the same specialist
                retry_result = specialist_func(task_description, context=context)
                
                # Create result dictionary
                return {
                    "task_id": task_id,
                    "result": retry_result,
                    "success": True,
                    "retry_count": retry_count,
                    "original_error": result.get("error")
                }
            except Exception as e:
                logger.error(f"Error retrying task {task_id}: {e}")
                
                # Update error in result
                result["error"] = str(e)
                result["retry_count"] = retry_count
                
                # If we've reached max retries, try fallback
                if retry_count >= self.max_retries:
                    return self._apply_fallback(result)
                
                return result
        else:
            # No retry, apply fallback
            return self._apply_fallback(result)
    
    def handle_failures(self, results: Dict[str, Dict[str, Any]], specialist_map: Dict[str, Callable],
                       retry: bool = True) -> Dict[str, Dict[str, Any]]:
        """
        Handle multiple failed task executions.
        
        Args:
            results: Dictionary mapping task IDs to result dictionaries
            specialist_map: Dictionary mapping specialist IDs to execution functions
            retry: Whether to retry failed tasks (default: True)
            
        Returns:
            Updated results dictionary
        """
        # Find failed results
        failed_results = {
            task_id: result
            for task_id, result in results.items()
            if not result.get("success", True)
        }
        
        # Handle each failure
        updated_results = results.copy()
        
        for task_id, result in failed_results.items():
            # Get specialist ID
            specialist_id = result.get("specialist_id")
            
            if not specialist_id:
                logger.warning(f"Cannot handle failure for task {task_id}: missing specialist_id")
                continue
                
            # Get specialist function
            if specialist_id in specialist_map:
                specialist_func = specialist_map[specialist_id]
            else:
                logger.warning(f"Cannot handle failure for task {task_id}: unknown specialist {specialist_id}")
                continue
                
            # Handle failure
            updated_result = self.handle_failure(result, specialist_func, retry)
            updated_results[task_id] = updated_result
            
        return updated_results
    
    def create_fallback_plan(self, task: str, error: str) -> List[Dict[str, Any]]:
        """
        Create a fallback execution plan for a failed task.
        
        Args:
            task: Original task description
            error: Error message from the failed execution
            
        Returns:
            List of fallback subtasks
        """
        # Create a simplified fallback plan
        return [
            {
                "id": "fallback_analysis",
                "description": f"Analyze error and create fallback plan for: {task}\nError: {error}",
                "type": "analysis",
                "dependencies": [],
                "is_fallback": True
            },
            {
                "id": "fallback_execution",
                "description": f"Execute simplified version of: {task}",
                "type": "execution",
                "dependencies": ["fallback_analysis"],
                "is_fallback": True
            }
        ]
    
    def register_fallback_specialist(self, specialist_id: str, fallback_specialist_id: str):
        """
        Register a fallback specialist for a primary specialist.
        
        Args:
            specialist_id: ID of the primary specialist
            fallback_specialist_id: ID of the fallback specialist
        """
        self.fallback_specialists[specialist_id] = fallback_specialist_id
        logger.info(f"Registered fallback specialist {fallback_specialist_id} for {specialist_id}")
    
    def get_fallback_specialist(self, specialist_id: str) -> Optional[str]:
        """
        Get the fallback specialist for a primary specialist.
        
        Args:
            specialist_id: ID of the primary specialist
            
        Returns:
            ID of the fallback specialist, or None if not registered
        """
        return self.fallback_specialists.get(specialist_id)
    
    def reset_retry_count(self, task_id: str):
        """
        Reset the retry count for a task.
        
        Args:
            task_id: ID of the task
        """
        if task_id in self.retry_counts:
            del self.retry_counts[task_id]
    
    def _should_retry(self, task_id: str) -> bool:
        """
        Check if a task should be retried.
        
        Args:
            task_id: ID of the task
            
        Returns:
            True if the task should be retried, False otherwise
        """
        retry_count = self.retry_counts.get(task_id, 0)
        return retry_count < self.max_retries
    
    def _apply_fallback(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Apply fallback mechanisms to a failed result.
        
        Args:
            result: Failed result dictionary
            
        Returns:
            Updated result dictionary with fallback
        """
        task_id = result.get("task_id")
        specialist_id = result.get("specialist_id")
        
        # Create fallback result
        fallback_result = result.copy()
        fallback_result["fallback_applied"] = True
        
        # Check if we have a fallback specialist
        if specialist_id and specialist_id in self.fallback_specialists:
            fallback_specialist = self.fallback_specialists[specialist_id]
            fallback_result["fallback_specialist"] = fallback_specialist
            
        # Add fallback message
        error = result.get("error", "Unknown error")
        fallback_result["result"] = f"Fallback response for task {task_id}. Original error: {error}"
        
        return fallback_result
