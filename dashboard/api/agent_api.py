"""
Agent API for VANA Dashboard

This module provides functions to retrieve agent status and performance data from the VANA system.
"""

import os
import sys
import logging
import json
from datetime import datetime, timedelta
import random

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Try to import VANA agent modules
try:
    from adk-setup.vana.orchestration.task_planner import TaskPlanner
    from adk-setup.vana.orchestration.parallel_executor import ParallelExecutor
    VANA_MODULES_AVAILABLE = True
except ImportError:
    VANA_MODULES_AVAILABLE = False
    logging.warning("VANA agent modules not available. Using mock data.")

logger = logging.getLogger(__name__)

class AgentAPI:
    """API for retrieving agent status and performance data."""
    
    def __init__(self, use_mock=False):
        """
        Initialize the Agent API.
        
        Args:
            use_mock (bool): Whether to use mock data instead of real data.
        """
        self.use_mock = use_mock or not VANA_MODULES_AVAILABLE
        
        if not self.use_mock:
            try:
                self.task_planner = TaskPlanner()
                self.parallel_executor = ParallelExecutor()
                logger.info("Successfully initialized agent components")
            except Exception as e:
                logger.error(f"Failed to initialize agent components: {e}")
                self.use_mock = True
    
    def get_agent_status(self):
        """
        Get the current status of all agents in the system.
        
        Returns:
            list: List of agent status dictionaries.
        """
        if self.use_mock:
            return self._get_mock_agent_status()
        
        try:
            # TODO: Implement real data retrieval from agent components
            # For now, return mock data
            return self._get_mock_agent_status()
        except Exception as e:
            logger.error(f"Error retrieving agent status: {e}")
            return self._get_mock_agent_status()
    
    def get_agent_performance(self, agent_id=None, time_range="day"):
        """
        Get performance metrics for the specified agent.
        
        Args:
            agent_id (str): ID of the agent to get metrics for. If None, get metrics for all agents.
            time_range (str): Time range for the data ("hour", "day", "week", "month").
            
        Returns:
            dict: Agent performance metrics.
        """
        if self.use_mock:
            return self._get_mock_agent_performance(agent_id, time_range)
        
        try:
            # TODO: Implement real data retrieval from agent components
            # For now, return mock data
            return self._get_mock_agent_performance(agent_id, time_range)
        except Exception as e:
            logger.error(f"Error retrieving agent performance: {e}")
            return self._get_mock_agent_performance(agent_id, time_range)
    
    def get_agent_activity(self, agent_id=None, time_range="day"):
        """
        Get activity timeline for the specified agent.
        
        Args:
            agent_id (str): ID of the agent to get activity for. If None, get activity for all agents.
            time_range (str): Time range for the data ("hour", "day", "week", "month").
            
        Returns:
            dict: Agent activity timeline.
        """
        if self.use_mock:
            return self._get_mock_agent_activity(agent_id, time_range)
        
        try:
            # TODO: Implement real data retrieval from agent components
            # For now, return mock data
            return self._get_mock_agent_activity(agent_id, time_range)
        except Exception as e:
            logger.error(f"Error retrieving agent activity: {e}")
            return self._get_mock_agent_activity(agent_id, time_range)
    
    def _get_mock_agent_status(self):
        """Generate mock agent status data."""
        agents = [
            {"id": "vana", "name": "Vana", "type": "primary", "status": "active"},
            {"id": "rhea", "name": "Rhea", "type": "specialist", "status": "active"},
            {"id": "max", "name": "Max", "type": "specialist", "status": "active"},
            {"id": "sage", "name": "Sage", "type": "specialist", "status": "inactive"},
            {"id": "kai", "name": "Kai", "type": "specialist", "status": "active"},
            {"id": "juno", "name": "Juno", "type": "specialist", "status": "active"}
        ]
        
        # Add some random metrics
        for agent in agents:
            agent["uptime"] = random.randint(1, 24)
            agent["tasks_completed"] = random.randint(10, 100)
            agent["success_rate"] = random.uniform(0.8, 1.0)
            agent["response_time"] = random.uniform(0.5, 2.0)
            agent["last_active"] = (datetime.now() - timedelta(minutes=random.randint(0, 60))).isoformat()
        
        return agents
    
    def _get_mock_agent_performance(self, agent_id=None, time_range="day"):
        """Generate mock agent performance data."""
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
    
    def _get_mock_agent_activity(self, agent_id=None, time_range="day"):
        """Generate mock agent activity timeline."""
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

# Create a singleton instance
agent_api = AgentAPI()
