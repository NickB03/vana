"""
Agent API for VANA Dashboard

This module provides functions to retrieve agent status and performance data from the VANA system.
"""

import os
import sys
import logging
import random
import datetime
from typing import Optional, List, Dict

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from agent.core import VanaAgent
# from agent.memory.short_term import ShortTermMemory # Assuming VanaAgent handles this internally or it's configured during init
# from agent.memory.memory_bank import MemoryBankManager # Assuming VanaAgent handles this internally or it's configured during init
# from agent.cli import VanaCLI # For reference, not direct use here

# Import ADK components if needed for interaction details - to be determined
# from adk.event_system import EventHistory # Example if ADK provides such a class

logger = logging.getLogger(__name__)

_agent_instance: Optional[VanaAgent] = None

def get_vana_agent() -> VanaAgent:
    """
    Initializes and returns a singleton VanaAgent instance.
    Configuration and tool registration should mirror VanaCLI.
    """
    global _agent_instance
    if _agent_instance is None:
        # TODO: Load model name and other configurations from a config file (e.g., config/environment.py)
        _agent_instance = VanaAgent(name="vana_web_ui", model="gemini-1.5-pro")
        
        # TODO: Tool Registration - This needs to be similar to VanaCLI._create_agent()
        # This might involve refactoring tool registration logic from VanaCLI to a shared utility.
        # Example:
        # from agent.tools import echo, read_file # Import necessary tools
        # tool_registry = ToolRegistry() # Assuming a ToolRegistry class
        # tool_registry.register_tool("echo", echo.echo)
        # tool_registry.register_tool("read_file", read_file.read_file)
        # ... add other tools
        # _agent_instance.set_tools(tool_registry.get_tools()) # Or similar method

        # TODO: Initialize memory components if not handled by VanaAgent constructor
        # _agent_instance.short_term_memory = ShortTermMemory()
        # _agent_instance.memory_bank = MemoryBankManager(config={"path": "memory_bank_data"}) # Example config

        logger.info("VanaAgent instance created for web UI.")
    return _agent_instance

def process_chat_message(user_id: str, message: str, session_id: Optional[str] = None) -> Dict[str, str]:
    """
    Processes a chat message using the VanaAgent.
    Creates a new session if session_id is not provided.
    """
    agent = get_vana_agent()
    
    if not session_id:
        # TODO: VanaAgent needs a method like `create_session` or session handling needs to be clarified.
        # Assuming agent.process_message can handle None session_id to create a new one,
        # or a session is implicitly managed per user_id.
        # For now, let's assume the agent's process_message can start a new session if session_id is missing,
        # and the session_id is part of its response or can be retrieved.
        # This part needs clarification based on VanaAgent's capabilities.
        # A placeholder for session creation:
        session_id = f"session_for_{user_id}_{random.randint(1000, 9999)}" # Placeholder
        logger.info(f"New session created for user {user_id}: {session_id}")

    # TODO: Confirm the exact method signature and return type of agent.process_message
    # Assuming it returns a string response. If it returns a more complex object, adjust accordingly.
    try:
        # This is a placeholder call. The actual VanaAgent might have a different method.
        # It's also assumed that `process_message` can take a `session_id`
        # and handles context for that session.
        agent_response_text = agent.process_message(message, session_id=session_id)
        
        return {
            "response": agent_response_text,
            "session_id": session_id # Return the session_id used (new or existing)
        }
    except Exception as e:
        logger.error(f"Error processing chat message for session {session_id}: {e}")
        # Fallback or error response
        return {
            "response": "Sorry, I encountered an error processing your message.",
            "session_id": session_id,
            "error": str(e)
        }

def get_interaction_details(session_id: str, message_id: Optional[str] = None) -> List[Dict]:
    """
    Retrieves the history of tool calls, parameters, and outputs for a given session/message.
    This is a placeholder and needs implementation based on how VanaAgent/ADK logs interactions.
    """
    agent = get_vana_agent()
    logger.info(f"Fetching interaction details for session_id: {session_id}, message_id: {message_id}")

    # TODO: This is the most complex part and depends heavily on VanaAgent's internals or ADK integration.
    # Option 1: If VanaAgent uses ADK and ADK events can be queried.
    # E.g., event_history = agent.get_session_events(session_id)
    # Then transform these events into the desired format.

    # Option 2: If VanaAgent has its own structured logging for interactions.
    # E.g., interactions = agent.get_interaction_log(session_id, message_id)

    # For now, returning mock data.
    mock_interaction_data = [
        {"type": "user_message", "text": "Can you read /tmp/test.txt for me?"},
        {"type": "agent_thought", "thought": "I should use the read_file tool."},
        {"type": "tool_call", "tool_name": "read_file", "parameters": {"path": "/tmp/test.txt"}, "output": "Content of /tmp/test.txt..."},
        {"type": "agent_response", "text": "I have read the file. It says: Content of /tmp/test.txt..."}
    ]
    if message_id: # If a specific message_id is provided, filter or fetch for that.
        return [mock_interaction_data[0]] # Just an example
    
    logger.warning(f"Returning MOCK interaction data for session {session_id}. Real implementation needed.")
    return mock_interaction_data


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


