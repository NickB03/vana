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
from agent.memory.short_term import ShortTermMemory
from agent.memory.memory_bank import MemoryBankManager
from config.environment import get_env_variable, load_environment_variables

# Import all tools
from agent.tools import echo
from agent.tools import read_file
from agent.tools import write_file
from agent.tools import list_directory
from agent.tools import file_exists
from agent.tools import vector_search
from agent.tools import search_knowledge
from agent.tools import get_health_status
from agent.tools import web_search
from agent.tools import kg_query
from agent.tools import kg_store
from agent.tools import kg_relationship
from agent.tools import kg_extract_entities


# Import ADK components if needed for interaction details - to be determined
# from adk.event_system import EventHistory # Example if ADK provides such a class

logger = logging.getLogger(__name__)
load_environment_variables() # Load from .env or system environment

_agent_instance: Optional[VanaAgent] = None

# In-memory store for interaction logs (replace with persistent store for production)
# Structure: { "session_id_1": [event1, event2, ...], "session_id_2": [...] }
_session_interaction_logs: Dict[str, List[Dict]] = {}


# Recommendation: Refactor tool registration from VanaCLI into a shared utility.
# For now, direct registration will be used as per the task prompt for this step.
# def _register_standard_tools(agent: VanaAgent):
#     """Helper function to register all standard tools for an agent."""
#     agent.register_tool("echo", echo.echo)
#     agent.register_tool("read_file", read_file.read_file)
#     agent.register_tool("write_file", write_file.write_file)
#     agent.register_tool("list_directory", list_directory.list_directory)
#     agent.register_tool("file_exists", file_exists.file_exists)
#     # Vector search tools
#     agent.register_tool("vector_search", vector_search.vector_search)
#     agent.register_tool("search_knowledge", search_knowledge.search_knowledge) # Meta tool
#     # Health status
#     agent.register_tool("get_health_status", get_health_status.get_health_status)
#     # Web Search
#     agent.register_tool("web_search", web_search.web_search)
#     # Knowledge Graph tools
#     agent.register_tool("kg_query", kg_query.kg_query)
#     agent.register_tool("kg_store", kg_store.kg_store)
#     agent.register_tool("kg_relationship", kg_relationship.kg_relationship)
#     agent.register_tool("kg_extract_entities", kg_extract_entities.kg_extract_entities)
#     logger.info("All standard tools registered for agent.")


def get_vana_agent() -> VanaAgent:
    """
    Initializes and returns a singleton VanaAgent instance.
    Configuration and tool registration mirror VanaCLI.
    """
    global _agent_instance
    if _agent_instance is None:
        try:
            logger.info("Initializing VanaAgent for the web UI...")
            
            # Agent Configuration
            agent_model = get_env_variable("AGENT_MODEL", "gemini-1.5-pro")
            agent_name_web_ui = get_env_variable("AGENT_NAME_WEB_UI", "vana_web_ui")
            # Add other necessary agent config parameters here if needed
            # e.g., temperature = float(get_env_variable("AGENT_TEMPERATURE", "0.7"))

            _agent_instance = VanaAgent(name=agent_name_web_ui, model=agent_model)
            logger.info(f"VanaAgent '{_agent_instance.name}' instantiated with model '{_agent_instance.model}'.")

            # Tool Registration (Directly in get_vana_agent as per task, though refactoring is preferred)
            logger.info("Registering tools for VanaAgent...")
            _agent_instance.register_tool("echo", echo.echo)
            _agent_instance.register_tool("read_file", read_file.read_file)
            _agent_instance.register_tool("write_file", write_file.write_file)
            _agent_instance.register_tool("list_directory", list_directory.list_directory)
            _agent_instance.register_tool("file_exists", file_exists.file_exists)
            _agent_instance.register_tool("vector_search", vector_search.vector_search)
            _agent_instance.register_tool("search_knowledge", search_knowledge.search_knowledge) # Meta tool
            _agent_instance.register_tool("get_health_status", get_health_status.get_health_status)
            _agent_instance.register_tool("web_search", web_search.web_search)
            _agent_instance.register_tool("kg_query", kg_query.kg_query)
            _agent_instance.register_tool("kg_store", kg_store.kg_store)
            _agent_instance.register_tool("kg_relationship", kg_relationship.kg_relationship)
            _agent_instance.register_tool("kg_extract_entities", kg_extract_entities.kg_extract_entities)
            logger.info("All standard tools registered for VanaAgent.")
            
            # Memory Component Initialization
            logger.info("Initializing memory components for VanaAgent...")
            _agent_instance.short_term_memory = ShortTermMemory()
            # Assuming default MemoryBankManager constructor is sufficient.
            # If MemoryBankManager requires configuration (e.g., path from env vars), load it here.
            # Example: memory_bank_path = get_env_variable("MEMORY_BANK_PATH", "memory_bank_data")
            # _agent_instance.memory_bank = MemoryBankManager(config={"path": memory_bank_path})
            _agent_instance.memory_bank = MemoryBankManager() 
            logger.info("Memory components initialized for VanaAgent.")

            logger.info(f"VanaAgent '{_agent_instance.name}' successfully initialized with model '{agent_model}'.")

        except Exception as e:
            logger.exception("Failed to initialize VanaAgent.")
            # Depending on desired behavior, could raise the error or return None/handle gracefully
            # Re-raising the exception makes it clear to the caller that initialization failed
            # and prevents the API from starting with a non-functional agent.
            raise
            
    return _agent_instance

def process_chat_message(user_id: str, message: str, session_id: Optional[str] = None) -> Dict[str, str]:
    """
    Processes a chat message using the VanaAgent.
    Creates a new session if session_id is not provided.
    """
    agent = get_vana_agent()

    # Ensure agent is available (get_vana_agent should raise if it fails, but as a safeguard)
    if not agent: 
        logger.error("VanaAgent instance is not available. Cannot process chat message.")
        # Return current session_id if available, or None if it was also None.
        return {"error": "Agent not available", "session_id": session_id}

    try:
        active_session_id = session_id

        # Session Management
        if not active_session_id:
            logger.info(f"No session_id provided for user_id '{user_id}'. Creating new session.")
            # Assuming user_id is a valid identifier for the user making the request
            # and agent.create_session(user_id=...) returns a new session_id string.
            new_session_id = agent.create_session(user_id=user_id) 
            if not new_session_id:
                logger.error(f"Agent failed to create a new session for user_id '{user_id}'.")
                return {"error": "Failed to create agent session", "session_id": None}
            active_session_id = new_session_id
            logger.info(f"New session '{active_session_id}' created for user_id '{user_id}'.")
        else:
            logger.info(f"Using existing session '{active_session_id}' for user_id '{user_id}'.")
            # Optional: Add validation here if agent.is_session_valid(active_session_id) exists
            # For now, assuming process_message will handle invalid/expired sessions.

        # Process the message with the agent
        # Assuming agent.process_message signature is:
        # process_message(self, message_text: str, session_id: str) -> Tuple[str, List[Dict]]
        agent_response_text, interaction_events = agent.process_message(
            message_text=message, 
            session_id=active_session_id
        )

        # Store Interaction Events
        if active_session_id not in _session_interaction_logs:
            _session_interaction_logs[active_session_id] = []
        _session_interaction_logs[active_session_id].extend(interaction_events)
        logger.debug(f"Stored {len(interaction_events)} interaction events for session '{active_session_id}'.")

        return {"response": agent_response_text, "session_id": active_session_id}

    except Exception as e:
        logger.exception(f"Error processing chat message for session_id '{session_id}' and user_id '{user_id}': {e}")
        # Return the original or newly created session_id even in case of error,
        # so client can choose to retry with the same session or start a new one.
        # If session_id was None and creation failed, active_session_id might still be None here.
        current_sid_for_error = session_id if session_id else None # Fallback for very early errors
        if 'active_session_id' in locals() and locals()['active_session_id']:
             current_sid_for_error = locals()['active_session_id']
        
        return {"error": f"An error occurred: {str(e)}", "session_id": current_sid_for_error}


def get_interaction_details(session_id: str, message_id: Optional[str] = None) -> List[Dict]:
    """
    Retrieves the history of tool calls, parameters, and outputs for a given session/message.
    """
    # Ensure agent is initialized if needed for any session validation, though not directly used here yet
    # get_vana_agent() 

    if not session_id:
        logger.warning("No session_id provided to get_interaction_details.")
        return []

    # For now, message_id is ignored, and all logs for the session are returned.
    # Future enhancement: Filter by message_id if events are tagged with it.
    if message_id:
        logger.info(f"Note: message_id parameter '{message_id}' is not yet used in get_interaction_details.")

    session_logs = _session_interaction_logs.get(session_id, [])
    logger.info(f"Retrieved {len(session_logs)} interaction events for session '{session_id}'.")
    return session_logs


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


