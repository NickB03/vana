"""
Task API for VANA Dashboard

This module provides functions to retrieve task execution data from the VANA system.
"""

import logging
import os
import random
import sys
from datetime import datetime, timedelta

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

logger = logging.getLogger(__name__)


def get_task_summary(time_range="day"):
    """
    Get a summary of task execution for the specified time range.

    Args:
        time_range (str): Time range for the data ("hour", "day", "week", "month").

    Returns:
        dict: Task execution summary.
    """
    try:
        # Try to fetch from actual API endpoint
        # For now, return mock data as fallback
        return generate_mock_task_summary(time_range)
    except Exception as e:
        logging.error(f"Error fetching task summary: {e}")
        return generate_mock_task_summary(time_range)


def generate_mock_task_summary(time_range="day"):
    """
    Generate mock task summary data.

    Args:
        time_range (str): Time range for the data ("hour", "day", "week", "month").

    Returns:
        dict: Mock task summary data.
    """
    return {
        "total_tasks": random.randint(50, 200),
        "completed_tasks": random.randint(40, 180),
        "failed_tasks": random.randint(0, 20),
        "pending_tasks": random.randint(0, 10),
        "average_duration": random.uniform(0.5, 5.0),
        "success_rate": random.uniform(0.8, 1.0),
        "time_range": time_range,
    }


def get_task_details(task_id=None):
    """
    Get details for a specific task or all recent tasks.

    Args:
        task_id (str): ID of the task to get details for. If None, get details for all recent tasks.

    Returns:
        dict or list: Task details.
    """
    try:
        # Try to fetch from actual API endpoint
        # For now, return mock data as fallback
        return generate_mock_task_details(task_id)
    except Exception as e:
        logging.error(f"Error fetching task details: {e}")
        return generate_mock_task_details(task_id)


def generate_mock_task_details(task_id=None):
    """
    Generate mock task details data.

    Args:
        task_id (str): ID of the task to get details for. If None, get details for all recent tasks.

    Returns:
        dict or list: Mock task details data.
    """
    # Define task types
    task_types = [
        "memory_retrieval",
        "memory_storage",
        "knowledge_graph_query",
        "vector_search",
        "web_search",
        "task_planning",
        "agent_coordination",
    ]

    # Define task statuses
    task_statuses = ["completed", "failed", "pending", "in_progress"]

    # Define agents - Updated to functional naming
    agents = ["vana", "architecture_specialist", "ui_specialist", "devops_specialist", "qa_specialist"]

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
                "error": None if random.random() > 0.2 else f"Error in task {task_id}",
            },
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
                "error": None if random.random() > 0.2 else f"Error in task {task_id}",
            },
        }
        tasks.append(task)

    # Sort by created_at (newest first)
    tasks.sort(key=lambda x: x["created_at"], reverse=True)

    return tasks


def get_task_timeline(time_range="day"):
    """
    Get a timeline of task execution for the specified time range.

    Args:
        time_range (str): Time range for the data ("hour", "day", "week", "month").

    Returns:
        list: Task execution timeline.
    """
    try:
        # Try to fetch from actual API endpoint
        # For now, return mock data as fallback
        return generate_mock_task_timeline(time_range)
    except Exception as e:
        logging.error(f"Error fetching task timeline: {e}")
        return generate_mock_task_timeline(time_range)


def generate_mock_task_timeline(time_range="day"):
    """
    Generate mock task timeline data.

    Args:
        time_range (str): Time range for the data ("hour", "day", "week", "month").

    Returns:
        list: Mock task timeline data.
    """
    now = datetime.now()

    # Define task types
    task_types = [
        "memory_retrieval",
        "memory_storage",
        "knowledge_graph_query",
        "vector_search",
        "web_search",
        "task_planning",
        "agent_coordination",
    ]

    # Define task statuses
    task_statuses = ["completed", "failed"]

    # Define agents - Updated to functional naming
    agents = ["vana", "architecture_specialist", "ui_specialist", "devops_specialist", "qa_specialist"]

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
            "agent": random.choice(agents),
        }
        tasks.append(task)

    # Sort by start_time
    tasks.sort(key=lambda x: x["start_time"])

    return tasks


# Create a simple API object for compatibility
class TaskAPI:
    """Task API class for dashboard integration."""

    def get_summary(self, time_range="day"):
        return get_task_summary(time_range)

    def get_details(self, task_id=None):
        return get_task_details(task_id)

    def get_timeline(self, time_range="day"):
        return get_task_timeline(time_range)


# Create the API instance
task_api = TaskAPI()
