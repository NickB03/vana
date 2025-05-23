"""
Task Planner for VANA

This module provides task planning functionality for the VANA project,
including task decomposition, dependency identification, and specialist assignment.
"""

import logging
import uuid
from typing import Dict, Any, List, Optional, Tuple, Set

# Set up logging
logger = logging.getLogger(__name__)

class TaskPlanner:
    """Planner for decomposing tasks and assigning them to specialists."""
    
    def __init__(self, task_router=None):
        """
        Initialize a task planner.
        
        Args:
            task_router: Task router for specialist assignment (optional)
        """
        self.task_router = task_router
        
    def decompose_task(self, task: str, context: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Decompose a complex task into subtasks.
        
        Args:
            task: Task description
            context: Context object (optional)
            
        Returns:
            List of subtask dictionaries
        """
        if context is None:
            context = {}
            
        # For simple tasks, return as a single subtask
        if self._is_simple_task(task):
            return [{
                "id": str(uuid.uuid4()),
                "description": task,
                "type": "simple",
                "dependencies": [],
                "context": context
            }]
            
        # For complex tasks, decompose into subtasks
        # This is a simplified implementation - in a real system, this would use
        # an LLM or rule-based system to decompose tasks
        
        # Example decomposition for a system design task
        if "design" in task.lower() and "system" in task.lower():
            return [
                {
                    "id": "requirements",
                    "description": f"Analyze requirements for: {task}",
                    "type": "analysis",
                    "dependencies": [],
                    "context": context
                },
                {
                    "id": "architecture",
                    "description": f"Design architecture for: {task}",
                    "type": "design",
                    "dependencies": ["requirements"],
                    "context": context
                },
                {
                    "id": "components",
                    "description": f"Define components for: {task}",
                    "type": "design",
                    "dependencies": ["architecture"],
                    "context": context
                },
                {
                    "id": "interfaces",
                    "description": f"Design interfaces for: {task}",
                    "type": "design",
                    "dependencies": ["components"],
                    "context": context
                }
            ]
            
        # Example decomposition for a documentation task
        elif "document" in task.lower() or "documentation" in task.lower():
            return [
                {
                    "id": "outline",
                    "description": f"Create outline for: {task}",
                    "type": "documentation",
                    "dependencies": [],
                    "context": context
                },
                {
                    "id": "content",
                    "description": f"Write content for: {task}",
                    "type": "documentation",
                    "dependencies": ["outline"],
                    "context": context
                },
                {
                    "id": "review",
                    "description": f"Review and edit: {task}",
                    "type": "documentation",
                    "dependencies": ["content"],
                    "context": context
                }
            ]
            
        # Example decomposition for a testing task
        elif "test" in task.lower() or "testing" in task.lower():
            return [
                {
                    "id": "test_plan",
                    "description": f"Create test plan for: {task}",
                    "type": "testing",
                    "dependencies": [],
                    "context": context
                },
                {
                    "id": "test_cases",
                    "description": f"Write test cases for: {task}",
                    "type": "testing",
                    "dependencies": ["test_plan"],
                    "context": context
                },
                {
                    "id": "test_execution",
                    "description": f"Execute tests for: {task}",
                    "type": "testing",
                    "dependencies": ["test_cases"],
                    "context": context
                },
                {
                    "id": "test_report",
                    "description": f"Generate test report for: {task}",
                    "type": "testing",
                    "dependencies": ["test_execution"],
                    "context": context
                }
            ]
            
        # Default decomposition for other tasks
        else:
            return [
                {
                    "id": "analysis",
                    "description": f"Analyze: {task}",
                    "type": "analysis",
                    "dependencies": [],
                    "context": context
                },
                {
                    "id": "execution",
                    "description": f"Execute: {task}",
                    "type": "execution",
                    "dependencies": ["analysis"],
                    "context": context
                },
                {
                    "id": "verification",
                    "description": f"Verify: {task}",
                    "type": "verification",
                    "dependencies": ["execution"],
                    "context": context
                }
            ]
    
    def identify_dependencies(self, subtasks: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        """
        Identify dependencies between subtasks.
        
        Args:
            subtasks: List of subtask dictionaries
            
        Returns:
            Dictionary mapping subtask IDs to lists of dependency IDs
        """
        dependencies = {}
        
        for subtask in subtasks:
            subtask_id = subtask["id"]
            subtask_deps = subtask.get("dependencies", [])
            dependencies[subtask_id] = subtask_deps
            
        return dependencies
    
    def create_execution_plan(self, subtasks: List[Dict[str, Any]], 
                             dependencies: Optional[Dict[str, List[str]]] = None) -> List[Dict[str, Any]]:
        """
        Create an execution plan for subtasks based on dependencies.
        
        Args:
            subtasks: List of subtask dictionaries
            dependencies: Dictionary mapping subtask IDs to lists of dependency IDs (optional)
            
        Returns:
            Ordered list of subtasks for execution
        """
        if dependencies is None:
            dependencies = self.identify_dependencies(subtasks)
            
        # Create a mapping of subtask IDs to subtasks
        subtask_map = {subtask["id"]: subtask for subtask in subtasks}
        
        # Create a set of completed subtasks
        completed = set()
        
        # Create an execution plan
        execution_plan = []
        
        # Continue until all subtasks are in the execution plan
        while len(execution_plan) < len(subtasks):
            # Find subtasks that can be executed (all dependencies are completed)
            executable = []
            
            for subtask_id, subtask_deps in dependencies.items():
                if subtask_id not in completed and all(dep in completed for dep in subtask_deps):
                    executable.append(subtask_id)
            
            # If no subtasks can be executed, there's a circular dependency
            if not executable:
                logger.error("Circular dependency detected in subtasks")
                break
                
            # Add executable subtasks to the execution plan
            for subtask_id in executable:
                execution_plan.append(subtask_map[subtask_id])
                completed.add(subtask_id)
                
        return execution_plan
    
    def assign_subtasks(self, subtasks: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """
        Assign subtasks to specialists.
        
        Args:
            subtasks: List of subtask dictionaries
            
        Returns:
            Dictionary mapping specialist IDs to lists of assigned subtasks
        """
        assignments = {}
        
        for subtask in subtasks:
            # If task router is available, use it to assign the subtask
            if self.task_router:
                specialist_id, confidence = self.task_router.route_task(subtask["description"])
                
                # Add confidence to subtask
                subtask["confidence"] = confidence
            else:
                # Default assignment based on subtask type
                subtask_type = subtask.get("type", "general")
                
                if subtask_type == "design" or subtask_type == "architecture":
                    specialist_id = "rhea"
                elif subtask_type == "documentation":
                    specialist_id = "juno"
                elif subtask_type == "testing":
                    specialist_id = "kai"
                elif subtask_type == "execution" or subtask_type == "deployment":
                    specialist_id = "sage"
                elif subtask_type == "interface" or subtask_type == "ui":
                    specialist_id = "max"
                else:
                    specialist_id = "vana"
                    
                # Add default confidence
                subtask["confidence"] = 0.8
                
            # Add subtask to specialist's assignments
            if specialist_id not in assignments:
                assignments[specialist_id] = []
                
            assignments[specialist_id].append(subtask)
            
        return assignments
    
    def _is_simple_task(self, task: str) -> bool:
        """
        Check if a task is simple (doesn't need decomposition).
        
        Args:
            task: Task description
            
        Returns:
            True if the task is simple, False otherwise
        """
        # Simple heuristic - tasks with fewer than 10 words are considered simple
        return len(task.split()) < 10
