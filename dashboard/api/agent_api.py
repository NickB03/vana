"""
Agent API for VANA Dashboard

This module provides functions to retrieve agent status and performance data from the VANA system.
"""

import os
import sys
import logging
import random
import datetime

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

logger = logging.getLogger(__name__)

def get_agent_statuses():
    """
    Retrieve status information for all agents in the system.
    Returns mock data for development purposes.
    """
    try:
        # In real implementation, this would call an actual API endpoint
        # For now, returning realistic mock data
        return generate_mock_agent_data()
    except Exception as e:
        logging.error(f"Error fetching agent status data: {e}")
        # Still return mock data as fallback to ensure UI works
        return generate_mock_agent_data()

def generate_mock_agent_data():
    """Generate realistic mock agent status data."""
    # List of agent names
    agent_names = ["Vana", "Rhea", "Max", "Sage", "Kai", "Juno"]

    # Status options
    status_options = ["Active", "Idle", "Busy", "Error", "Offline"]
    status_weights = [0.6, 0.2, 0.1, 0.05, 0.05]  # Probability weights

    # Generate realistic timestamp within the last hour
    current_time = datetime.datetime.now()

    # Generate data for each agent
    agents_data = []
    for agent in agent_names:
        # Generate a realistic last active time within the last hour
        minutes_ago = random.randint(0, 60)
        last_active = current_time - datetime.timedelta(minutes=minutes_ago)

        # Random status weighted towards "Active"
        status = random.choices(status_options, status_weights)[0]

        # Generate realistic metrics
        response_time_ms = round(random.uniform(50, 500), 1)
        requests_handled = random.randint(10, 1000)
        error_rate = round(random.uniform(0, 0.05), 3)

        # Standard capabilities for each agent based on their role
        capabilities = {
            "Vana": ["Task Delegation", "Context Management", "Memory Integration"],
            "Rhea": ["Architecture Planning", "System Design", "Component Integration"],
            "Max": ["User Interface", "Command Parsing", "Response Formatting"],
            "Sage": ["Platform Integration", "API Management", "Service Orchestration"],
            "Kai": ["Edge Case Handling", "Error Recovery", "Fallback Management"],
            "Juno": ["System Testing", "Quality Assurance", "Performance Monitoring"]
        }

        # Construct agent data object
        agent_data = {
            "name": agent,
            "status": status,
            "last_active": last_active.isoformat(),
            "response_time_ms": response_time_ms,
            "requests_handled": requests_handled,
            "error_rate": error_rate,
            "capabilities": capabilities.get(agent, []),
            "cpu_usage": round(random.uniform(5, 95), 1),
            "memory_usage_mb": random.randint(50, 500)
        }

        agents_data.append(agent_data)

    return agents_data

def get_agent_activity(agent_name, hours=24):
    """
    Get historical activity data for a specific agent.
    Returns mock data for development purposes.
    """
    try:
        # In real implementation, this would call an actual API endpoint
        return generate_mock_agent_activity(agent_name, hours)
    except Exception as e:
        logging.error(f"Error fetching agent activity data: {e}")
        return generate_mock_agent_activity(agent_name, hours)

def generate_mock_agent_activity(agent_name, hours=24):
    """Generate realistic mock historical data for an agent."""
    current_time = datetime.datetime.now()
    activity_data = []

    # Generate data points for each hour
    for hour in range(hours, 0, -1):
        timestamp = current_time - datetime.timedelta(hours=hour)

        # Generate realistic metrics with some random variation
        requests = random.randint(5, 100)
        response_time = round(random.uniform(50, 500), 1)
        error_rate = round(random.uniform(0, 0.1), 3)
        cpu_usage = round(random.uniform(5, 95), 1)
        memory_usage = random.randint(50, 500)

        # Add some realistic patterns - busier during work hours
        hour_of_day = timestamp.hour
        if 9 <= hour_of_day <= 17:  # 9 AM to 5 PM
            requests *= 1.5
            cpu_usage *= 1.2
            memory_usage *= 1.2

        data_point = {
            "timestamp": timestamp.isoformat(),
            "requests": int(requests),
            "response_time_ms": response_time,
            "error_rate": error_rate,
            "cpu_usage": cpu_usage,
            "memory_usage_mb": memory_usage
        }

        activity_data.append(data_point)

    return {
        "agent_name": agent_name,
        "activity": activity_data
    }


