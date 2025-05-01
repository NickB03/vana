"""
Task API for VANA Dashboard

This module provides functions to retrieve task execution data from the VANA system.
"""

import os
import sys
import logging
import json
from datetime import datetime, timedelta
import random

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Try to import VANA task modules
try:
    from adk-setup.vana.orchestration.task_planner import TaskPlanner
    from adk-setup.vana.orchestration.parallel_executor import ParallelExecutor
    VANA_MODULES_AVAILABLE = True
except ImportError:
    VANA_MODULES_AVAILABLE = False
    logging.warning("VANA task modules not available. Using mock data.")

logger = logging.getLogger(__name__)

class TaskAPI:
    """API for retrieving task execution data."""
    
    def __init__(self, use_mock=False):
        """
        Initialize the Task API.
        
        Args:
            use_mock (bool): Whether to use mock data instead of real data.
        """
        self.use_mock = use_mock or not VANA_MODULES_AVAILABLE
        
        if not self.use_mock:
            try:
                self.task_planner = TaskPlanner()
                self.parallel_executor = ParallelExecutor()
                logger.info("Successfully initialized task components")
            except Exception as e:
                logger.error(f"Failed to initialize task components: {e}")
                self.use_mock = True
    
    def get_task_summary(self, time_range="day"):
        """
        Get a summary of task execution for the specified time range.
        
        Args:
            time_range (str): Time range for the data ("hour", "day", "week", "month").
            
        Returns:
            dict: Task execution summary.
        """
        if self.use_mock:
            return self._get_mock_task_summary(time_range)
        
        try:
            # TODO: Implement real data retrieval from task components
            # For now, return mock data
            return self._get_mock_task_summary(time_range)
        except Exception as e:
            logger.error(f"Error retrieving task summary: {e}")
            return self._get_mock_task_summary(time_range)
    
    def get_task_details(self, task_id=None):
        """
        Get details for a specific task or all recent tasks.
        
        Args:
            task_id (str): ID of the task to get details for. If None, get details for all recent tasks.
            
        Returns:
            dict or list: Task details.
        """
        if self.use_mock:
            return self._get_mock_task_details(task_id)
        
        try:
            # TODO: Implement real data retrieval from task components
            # For now, return mock data
            return self._get_mock_task_details(task_id)
        except Exception as e:
            logger.error(f"Error retrieving task details: {e}")
            return self._get_mock_task_details(task_id)
    
    def get_task_timeline(self, time_range="day"):
        """
        Get a timeline of task execution for the specified time range.
        
        Args:
            time_range (str): Time range for the data ("hour", "day", "week", "month").
            
        Returns:
            list: Task execution timeline.
        """
        if self.use_mock:
            return self._get_mock_task_timeline(time_range)
        
        try:
            # TODO: Implement real data retrieval from task components
            # For now, return mock data
            return self._get_mock_task_timeline(time_range)
        except Exception as e:
            logger.error(f"Error retrieving task timeline: {e}")
            return self._get_mock_task_timeline(time_range)
    
    def _get_mock_task_summary(self, time_range="day"):
        """Generate mock task summary data."""
        return {
            "total_tasks": random.randint(50, 200),
            "completed_tasks": random.randint(40, 180),
            "failed_tasks": random.randint(0, 20),
            "pending_tasks": random.randint(0, 10),
            "average_duration": random.uniform(0.5, 5.0),
            "success_rate": random.uniform(0.8, 1.0),
            "time_range": time_range
        }
    
    def _get_mock_task_details(self, task_id=None):
        """Generate mock task details data."""
        # Define task types
        task_types = [
            "memory_retrieval", "memory_storage", "knowledge_graph_query", 
            "vector_search", "web_search", "task_planning", "agent_coordination"
        ]
        
        # Define task statuses
        task_statuses = ["completed", "failed", "pending", "in_progress"]
        
        # Define agents
        agents = ["vana", "rhea", "max", "sage", "kai", "juno"]
        
        # If task_id is specified, return details for that task only
        if task_id:
            return {
                "id": task_id,
                "type": random.choice(task_types),
                "status": random.choice(task_statuses),
                "created_at": (datetime.now() - timedelta(minutes=random.randint(0, 60))).isoformat(),
                "updated_at": datetime.now().isoformat(),
                "duration": random.uniform(0.1, 10.0),
                "agent": random.choice(agents),
                "details": {
                    "input": f"Task input for {task_id}",
                    "output": f"Task output for {task_id}",
                    "error": None if random.random() > 0.2 else f"Error in task {task_id}"
                }
            }
        
        # Otherwise, return details for multiple tasks
        tasks = []
        for i in range(random.randint(5, 20)):
            task_id = f"task-{random.randint(1000, 9999)}"
            task = {
                "id": task_id,
                "type": random.choice(task_types),
                "status": random.choice(task_statuses),
                "created_at": (datetime.now() - timedelta(minutes=random.randint(0, 60))).isoformat(),
                "updated_at": datetime.now().isoformat(),
                "duration": random.uniform(0.1, 10.0),
                "agent": random.choice(agents),
                "details": {
                    "input": f"Task input for {task_id}",
                    "output": f"Task output for {task_id}",
                    "error": None if random.random() > 0.2 else f"Error in task {task_id}"
                }
            }
            tasks.append(task)
        
        # Sort by created_at (newest first)
        tasks.sort(key=lambda x: x["created_at"], reverse=True)
        
        return tasks
    
    def _get_mock_task_timeline(self, time_range="day"):
        """Generate mock task timeline data."""
        now = datetime.now()
        
        # Define task types
        task_types = [
            "memory_retrieval", "memory_storage", "knowledge_graph_query", 
            "vector_search", "web_search", "task_planning", "agent_coordination"
        ]
        
        # Define task statuses
        task_statuses = ["completed", "failed"]
        
        # Define agents
        agents = ["vana", "rhea", "max", "sage", "kai", "juno"]
        
        # Generate random tasks
        tasks = []
        for _ in range(random.randint(20, 50)):
            start_time = now - timedelta(minutes=random.randint(0, 60 * 24))
            duration = random.uniform(0.1, 10.0)
            end_time = start_time + timedelta(seconds=duration)
            
            task = {
                "id": f"task-{random.randint(1000, 9999)}",
                "type": random.choice(task_types),
                "status": random.choice(task_statuses),
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration": duration,
                "agent": random.choice(agents)
            }
            tasks.append(task)
        
        # Sort by start_time
        tasks.sort(key=lambda x: x["start_time"])
        
        return tasks

# Create a singleton instance
task_api = TaskAPI()
