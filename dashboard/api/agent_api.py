"""
Agent API for VANA Dashboard

This module provides functions to retrieve agent status and performance data from the VANA system.
"""

import os
import sys
import logging
from datetime import datetime, timedelta
import random

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

logger = logging.getLogger(__name__)

def get_agent_status():
    """
    Returns actual agent status data or falls back to mock data.

    Returns:
        dict: Agent status data.
    """
    try:
        # Try to fetch from actual API endpoint
        # For now, return mock data as fallback
        return generate_mock_agent_status()
    except Exception as e:
        logging.error(f"Error fetching agent status: {e}")
        return generate_mock_agent_status()

def generate_mock_agent_status():
    """
    Generate realistic mock agent status data.

    Returns:
        dict: Mock agent status data.
    """
    # Define agents with their roles
    agents = [
        {
            "id": "vana",
            "name": "Vana",
            "role": "Lead Agent",
            "status": "active",
            "description": "Primary orchestration agent"
        },
        {
            "id": "rhea",
            "name": "Rhea",
            "role": "Research Specialist",
            "status": "active",
            "description": "Specialized in research and information retrieval"
        },
        {
            "id": "max",
            "name": "Max",
            "role": "Memory Specialist",
            "status": "active",
            "description": "Specialized in memory management and retrieval"
        },
        {
            "id": "sage",
            "name": "Sage",
            "role": "Knowledge Specialist",
            "status": "idle",
            "description": "Specialized in knowledge graph operations"
        },
        {
            "id": "kai",
            "name": "Kai",
            "role": "Task Specialist",
            "status": "active",
            "description": "Specialized in task planning and execution"
        },
        {
            "id": "juno",
            "name": "Juno",
            "role": "Testing Specialist",
            "status": "idle",
            "description": "Specialized in system testing and validation"
        }
    ]

    # Add some random metrics
    for agent in agents:
        agent["uptime"] = random.randint(1, 24)
        agent["tasks_completed"] = random.randint(10, 100)
        agent["success_rate"] = random.uniform(0.8, 1.0)
        agent["response_time"] = random.uniform(0.5, 2.0)
        agent["last_active"] = (datetime.now() - timedelta(minutes=random.randint(0, 60))).isoformat()

    return agents

def get_agent_performance(agent_id=None, time_range="day"):
    """
    Get performance metrics for the specified agent.

    Args:
        agent_id (str): ID of the agent to get metrics for. If None, get metrics for all agents.
        time_range (str): Time range for the data ("hour", "day", "week", "month").

    Returns:
        dict: Agent performance metrics.
    """
    try:
        # Try to fetch from actual API endpoint
        # For now, return mock data as fallback
        return generate_mock_agent_performance(agent_id, time_range)
    except Exception as e:
        logging.error(f"Error fetching agent performance: {e}")
        return generate_mock_agent_performance(agent_id, time_range)

def generate_mock_agent_performance(agent_id=None, time_range="day"):
    """
    Generate mock agent performance data.

    Args:
        agent_id (str): ID of the agent to get metrics for. If None, get metrics for all agents.
        time_range (str): Time range for the data ("hour", "day", "week", "month").

    Returns:
        dict: Mock agent performance data.
    """
    now = datetime.now()
    data_points = {
        "hour": 60,
        "day": 24,
        "week": 7,
        "month": 30
    }.get(time_range, 24)

    time_delta = {
        "hour": timedelta(minutes=1),
        "day": timedelta(hours=1),
        "week": timedelta(days=1),
        "month": timedelta(days=1)
    }.get(time_range, timedelta(hours=1))

    timestamps = [(now - time_delta * i).isoformat() for i in range(data_points)]
    timestamps.reverse()

    # Generate mock data with some randomness
    response_times = [random.uniform(0.5, 2.0) for _ in range(data_points)]
    success_rates = [random.uniform(0.8, 1.0) for _ in range(data_points)]
    task_counts = [random.randint(1, 10) for _ in range(data_points)]

    # If agent_id is specified, return data for that agent only
    if agent_id:
        return {
            "agent_id": agent_id,
            "timestamps": timestamps,
            "response_times": response_times,
            "success_rates": success_rates,
            "task_counts": task_counts
        }

    # Otherwise, return data for all agents
    agents = ["vana", "rhea", "max", "sage", "kai", "juno"]
    return {
        agent: {
            "timestamps": timestamps,
            "response_times": [random.uniform(0.5, 2.0) for _ in range(data_points)],
            "success_rates": [random.uniform(0.8, 1.0) for _ in range(data_points)],
            "task_counts": [random.randint(1, 10) for _ in range(data_points)]
        } for agent in agents
    }

def get_agent_activity(agent_id=None, time_range="day"):
    """
    Get activity timeline for the specified agent.

    Args:
        agent_id (str): ID of the agent to get activity for. If None, get activity for all agents.
        time_range (str): Time range for the data ("hour", "day", "week", "month").

    Returns:
        dict: Agent activity timeline.
    """
    try:
        # Try to fetch from actual API endpoint
        # For now, return mock data as fallback
        return generate_mock_agent_activity(agent_id, time_range)
    except Exception as e:
        logging.error(f"Error fetching agent activity: {e}")
        return generate_mock_agent_activity(agent_id, time_range)

def generate_mock_agent_activity(agent_id=None, time_range="day"):
    """
    Generate mock agent activity timeline.

    Args:
        agent_id (str): ID of the agent to get activity for. If None, get activity for all agents.
        time_range (str): Time range for the data ("hour", "day", "week", "month").

    Returns:
        list: Mock agent activity data.
    """
    now = datetime.now()

    # Define activity types
    activity_types = ["task_start", "task_complete", "message_sent", "message_received", "tool_called"]

    # Generate random activities
    activities = []
    for _ in range(random.randint(10, 30)):
        timestamp = now - timedelta(minutes=random.randint(0, 60 * 24))
        activity = {
            "timestamp": timestamp.isoformat(),
            "type": random.choice(activity_types),
            "agent_id": agent_id or random.choice(["vana", "rhea", "max", "sage", "kai", "juno"]),
            "details": f"Activity details {random.randint(1, 1000)}"
        }
        activities.append(activity)

    # Sort by timestamp
    activities.sort(key=lambda x: x["timestamp"])

    # If agent_id is specified, filter activities for that agent
    if agent_id:
        activities = [a for a in activities if a["agent_id"] == agent_id]

    return activities
